/**
 * External Integration State Reset Service
 * Handles state cleanup when external APIs (ElevenLabs, Kling, RunwayML) timeout or fail
 * CRITICAL RULE: NO STORAGE ON FAILURE - only reset state, never store completion records
 * Following timeout and retry specifications from voice-config.ts
 */

import { db } from './db';
import { userVoiceProfiles, userEmotionVoices } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface StateResetOptions {
  userId: string;
  provider: 'elevenlabs' | 'kling' | 'runwayml';
  operationType: 'voice_training' | 'video_generation' | 'audio_generation';
  operationId?: string | number;
  error: string;
  timeoutDuration?: number;
}

export class ExternalIntegrationStateReset {
  
  /**
   * CRITICAL RULE: NO STORAGE ON FAILURE
   * This method ONLY resets states - never stores completion records for failures
   */
  static async resetIntegrationState(options: StateResetOptions): Promise<void> {
    const { userId, provider, operationType, error } = options;
    
    console.log(`❌ FAILURE RESET: ${provider} ${operationType} for user ${userId}`);
    console.log(`   Error: ${error}`);
    console.log(`   NO DATA STORED ON FAILURE - only state reset`);
    
    try {
      switch (operationType) {
        case 'voice_training':
          await this.resetVoiceTrainingState(userId, provider, error);
          break;
        case 'video_generation':
          await this.resetVideoGenerationState(userId, provider, error);
          break;
        case 'audio_generation':
          await this.resetAudioGenerationState(userId, provider, error);
          break;
      }
      
      console.log(`✅ State reset completed for ${provider} ${operationType}`);
    } catch (resetError) {
      console.error(`❌ Failed to reset ${provider} state:`, resetError);
    }
  }

  /**
   * STANDARD PATTERN: Log failure without storing any completion records
   * This should be called by ALL external integration providers on failure
   */
  static logFailureWithoutStorage(
    provider: string, 
    operationType: string, 
    userId: string, 
    error: string
  ): void {
    console.log(`❌ ${provider.toUpperCase()} ${operationType.toUpperCase()} FAILED: ${userId}`);
    console.log(`   Error: ${error}`);
    console.log(`   NO STORAGE ON FAILURE - following standard pattern`);
  }

  /**
   * Reset ElevenLabs voice training state
   */
  private static async resetVoiceTrainingState(
    userId: string, 
    provider: string, 
    error: string
  ): Promise<void> {
    console.log(`🔄 Resetting voice training state for user ${userId}`);
    
    try {
      // Step 1: Reset voice profile status
      const voiceProfiles = await db.select().from(userVoiceProfiles)
        .where(eq(userVoiceProfiles.userId, userId));
      
      for (const profile of voiceProfiles) {
        if (profile.status === 'training') {
          await db.update(userVoiceProfiles)
            .set({
              status: 'failed',
              trainingCompletedAt: new Date(),
              lastTrainingError: `${provider.toUpperCase()} integration error: ${error}`,
              isReadyForNarration: false
            })
            .where(eq(userVoiceProfiles.id, profile.id));
          
          console.log(`   ✅ Reset voice profile ${profile.id} from 'training' to 'failed'`);
        }
      }
      
      // Step 2: Reset emotion voices
      const emotionVoices = await db.select().from(userEmotionVoices)
        .where(eq(userEmotionVoices.userVoiceProfileId, voiceProfiles[0]?.id || 0));
      
      for (const emotionVoice of emotionVoices) {
        if (emotionVoice.trainingStatus === 'training') {
          await db.update(userEmotionVoices)
            .set({
              trainingStatus: 'failed',
              updatedAt: new Date()
            })
            .where(eq(userEmotionVoices.id, emotionVoice.id));
          
          console.log(`   ✅ Reset emotion voice ${emotionVoice.emotion} from 'training' to 'failed'`);
        }
      }
      
      // Step 3: Reset session state if available
      try {
        const { VoiceCloningSessionManager } = await import('./voice-cloning-session-manager');
        // Reset all categories since we don't know which specific one failed
        VoiceCloningSessionManager.completeCategoryCloning(userId, 'emotions', false);
        VoiceCloningSessionManager.completeCategoryCloning(userId, 'sounds', false);
        VoiceCloningSessionManager.completeCategoryCloning(userId, 'modulations', false);
        console.log(`   ✅ Reset voice cloning session state for user ${userId}`);
      } catch (sessionError) {
        console.error(`   ⚠️ Could not reset session state:`, sessionError);
      }
      
      // Step 4: Unlock voice samples to allow re-training
      try {
        const { storage } = await import('./storage');
        const voiceSamples = await storage.getUserVoiceSamples(userId);
        
        for (const sample of voiceSamples) {
          if (sample.isLocked) {
            await storage.updateUserVoiceSample(sample.id, {
              isLocked: false,
              lockedAt: null
            });
          }
        }
        
        console.log(`   ✅ Unlocked ${voiceSamples.length} voice samples for re-training`);
      } catch (unlockError) {
        console.error(`   ⚠️ Could not unlock voice samples:`, unlockError);
      }
      
      console.log(`✅ Complete voice training state reset for user ${userId}`);
      
    } catch (dbError) {
      console.error(`❌ Database error during voice training reset:`, dbError);
      throw dbError;
    }
  }

  /**
   * Reset Kling/RunwayML video generation state
   */
  private static async resetVideoGenerationState(
    userId: string,
    provider: string,
    error: string
  ): Promise<void> {
    console.log(`🔄 Resetting video generation state for user ${userId}`);
    
    try {
      const { storage } = await import('./storage');
      
      // Reset any stuck video generations to failed status
      const stuckVideos = await storage.getStuckVideoGenerations(new Date(Date.now() - 300000)); // 5 min timeout
      
      for (const video of stuckVideos) {
        if (video.userId === userId) {
          await storage.updateVideo(video.id, {
            status: 'failed',
            error: `${provider.toUpperCase()} integration error: ${error}`,
            updatedAt: new Date()
          });
          
          console.log(`   ✅ Reset video generation ${video.id} to 'failed'`);
        }
      }
      
    } catch (dbError) {
      console.error(`❌ Database error during video generation reset:`, dbError);
    }
  }

  /**
   * Reset audio generation state (less critical, usually just cache)
   */
  private static async resetAudioGenerationState(
    userId: string,
    provider: string,
    error: string
  ): Promise<void> {
    console.log(`🔄 Clearing audio cache for user ${userId} due to ${provider} error`);
    
    try {
      const { audioCacheService } = await import('./audio-cache-service');
      await audioCacheService.clearCache();
      console.log(`   ✅ Audio cache cleared`);
    } catch (cacheError) {
      console.error(`   ⚠️ Could not clear audio cache:`, cacheError);
    }
  }

  /**
   * Direct method for resetting voice profile state (called by ElevenLabs module)
   */
  static async resetVoiceProfile(userId: string, reason: string): Promise<void> {
    await this.resetIntegrationState({
      userId,
      provider: 'elevenlabs',
      operationType: 'voice_training',
      error: reason
    });
  }

  /**
   * Alias for resetAllIntegrationsForUser (used in routes.ts)
   */
  static async resetAllStatesForUser(userId: string, reason: string): Promise<void> {
    await this.resetAllIntegrationsForUser(userId, reason);
  }

  /**
   * Reset state for all providers for a specific user (nuclear option)
   */
  static async resetAllIntegrationsForUser(userId: string, reason: string): Promise<void> {
    console.log(`🔥 Nuclear reset: Resetting ALL integration states for user ${userId}`);
    console.log(`   Reason: ${reason}`);
    
    try {
      // Reset voice training
      await this.resetIntegrationState({
        userId,
        provider: 'elevenlabs',
        operationType: 'voice_training',
        error: reason
      });
      
      // Reset video generation
      await this.resetIntegrationState({
        userId,
        provider: 'kling',
        operationType: 'video_generation',
        error: reason
      });
      
      // Reset audio generation
      await this.resetIntegrationState({
        userId,
        provider: 'elevenlabs',
        operationType: 'audio_generation',
        error: reason
      });
      
      // Clean up any story-related states
      try {
        const { storage } = await import('./storage');
        const userStories = await storage.getUserStories(userId);
        
        for (const story of userStories) {
          await this.resetIntegrationState({
            userId,
            provider: 'kling',
            operationType: 'video_generation',
            operationId: story.id,
            error: reason
          });
        }
      } catch (storiesError) {
        console.error(`   ⚠️ Could not reset story states:`, storiesError);
      }
      
      console.log(`✅ Complete nuclear reset for user ${userId}`);
    } catch (error) {
      console.error(`❌ Nuclear reset failed for user ${userId}:`, error);
    }
  }

  /**
   * Periodic cleanup of stuck states (should be called by a cron job)
   */
  static async cleanupStuckStates(): Promise<void> {
    console.log(`🧹 Cleaning up stuck external integration states`);
    
    try {
      const { storage } = await import('./storage');
      const timeouts = {
        voiceTrainingTimeout: 300000, // 5 minutes
        videoGenerationTimeout: 600000, // 10 minutes
      };
      
      const stuckTrainingThreshold = Date.now() - timeouts.voiceTrainingTimeout;
      
      // Clean up stuck video generations
      const stuckVideos = await storage.getStuckVideoGenerations(new Date(stuckTrainingThreshold));
      
      for (const video of stuckVideos) {
        await this.resetIntegrationState({
          userId: video.userId,
          provider: 'kling',
          operationType: 'video_generation',
          operationId: video.id,
          error: 'Cleanup: Operation exceeded timeout',
          timeoutDuration: timeouts.videoGenerationTimeout
        });
      }
      
      console.log(`✅ Cleanup completed: ${stuckVideos.length} stuck operations reset`);
    } catch (cleanupError) {
      console.error(`❌ Cleanup failed:`, cleanupError);
    }
  }
}

export const externalIntegrationStateReset = ExternalIntegrationStateReset;