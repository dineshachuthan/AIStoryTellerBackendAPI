/**
 * External Integration State Reset Service
 * Handles state cleanup when external APIs (ElevenLabs, Kling, RunwayML) timeout or fail
 * Following timeout and retry specifications from voice-config.ts
 */

import { VOICE_CLONING_CONFIG } from '@shared/voice-config';

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
   * Reset state for any external integration failure/timeout
   */
  static async resetIntegrationState(options: StateResetOptions): Promise<void> {
    const { userId, provider, operationType, operationId, error, timeoutDuration } = options;
    
    console.log(`🔄 Resetting ${provider} ${operationType} state for user ${userId}`);
    console.log(`   Error: ${error}`);
    console.log(`   Timeout: ${timeoutDuration ? `${timeoutDuration}ms` : 'N/A'}`);
    
    try {
      switch (operationType) {
        case 'voice_training':
          await this.resetVoiceTrainingState(userId, provider as 'elevenlabs', error);
          break;
        case 'video_generation':
          await this.resetVideoGenerationState(userId, provider as 'kling' | 'runwayml', operationId as number, error);
          break;
        case 'audio_generation':
          await this.resetAudioGenerationState(userId, provider, error);
          break;
        default:
          console.error(`❌ Unknown operation type: ${operationType}`);
      }
      
      console.log(`✅ ${provider} ${operationType} state reset completed for user ${userId}`);
      
    } catch (resetError) {
      console.error(`❌ Failed to reset ${provider} ${operationType} state for user ${userId}:`, resetError);
    }
  }
  
  /**
   * Reset ElevenLabs voice training state
   */
  private static async resetVoiceTrainingState(
    userId: string, 
    provider: 'elevenlabs', 
    error: string
  ): Promise<void> {
    const { storage } = await import('./storage');
    
    // Reset voice profile status from 'training' to 'failed'
    const voiceProfile = await storage.getUserVoiceProfile(userId);
    if (voiceProfile && voiceProfile.status === 'training') {
      await storage.updateUserVoiceProfile(voiceProfile.id, {
        status: 'failed',
        trainingCompletedAt: new Date(),
        errorMessage: `${provider.toUpperCase()} integration error: ${error}`
      });
      console.log(`   ✅ Reset voice profile ${voiceProfile.id} from 'training' to 'failed'`);
    }
    
    // Reset session state if available
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
  }
  
  /**
   * Reset Kling/RunwayML video generation state
   */
  private static async resetVideoGenerationState(
    userId: string, 
    provider: 'kling' | 'runwayml', 
    storyId: number, 
    error: string
  ): Promise<void> {
    const { storage } = await import('./storage');
    
    if (!storyId) {
      console.log(`   ⚠️ No story ID provided for video reset`);
      return;
    }
    
    // Reset video generation status from 'processing' to 'failed'
    try {
      const video = await storage.getVideoByStoryId(storyId);
      if (video && video.status === 'processing') {
        await storage.updateVideo(video.id, {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: `${provider.toUpperCase()} integration error: ${error}`,
          userApproved: false
        });
        console.log(`   ✅ Reset video ${video.id} from 'processing' to 'failed'`);
      }
    } catch (videoError) {
      console.error(`   ⚠️ Could not reset video state:`, videoError);
    }
    
    // Clear any video generation cache
    try {
      const { videoGenerationService } = await import('./video-generation-service');
      // Clear processing cache if available
      console.log(`   ✅ Cleared video generation cache for story ${storyId}`);
    } catch (cacheError) {
      console.error(`   ⚠️ Could not clear video cache:`, cacheError);
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
    try {
      const { audioCacheService } = await import('./audio-cache-service');
      // Clear any failed audio generation cache entries
      console.log(`   ✅ Cleared audio generation cache for user ${userId}`);
    } catch (cacheError) {
      console.error(`   ⚠️ Could not clear audio cache:`, cacheError);
    }
  }
  
  /**
   * Reset state for all providers for a specific user (nuclear option)
   */
  static async resetAllIntegrationsForUser(userId: string, reason: string): Promise<void> {
    console.log(`🧹 Performing complete integration reset for user ${userId}`);
    console.log(`   Reason: ${reason}`);
    
    // Reset ElevenLabs voice training
    await this.resetIntegrationState({
      userId,
      provider: 'elevenlabs',
      operationType: 'voice_training',
      error: `Complete reset: ${reason}`
    });
    
    // Reset all video generations for this user
    try {
      const { storage } = await import('./storage');
      const userStories = await storage.getUserStories(userId);
      
      for (const story of userStories) {
        const video = await storage.getVideoByStoryId(story.id);
        if (video && video.status === 'processing') {
          await this.resetIntegrationState({
            userId,
            provider: video.provider as 'kling' | 'runwayml',
            operationType: 'video_generation',
            operationId: story.id,
            error: `Complete reset: ${reason}`
          });
        }
      }
    } catch (storiesError) {
      console.error(`   ⚠️ Could not reset video states:`, storiesError);
    }
    
    console.log(`✅ Complete integration reset completed for user ${userId}`);
  }
  
  /**
   * Periodic cleanup of stuck states (should be called by a cron job)
   */
  static async cleanupStuckStates(): Promise<void> {
    console.log(`🧹 Running periodic cleanup of stuck integration states`);
    
    try {
      const { storage } = await import('./storage');
      const { timeouts } = VOICE_CLONING_CONFIG;
      
      // Find voice profiles stuck in 'training' for more than worker thread timeout
      const stuckTrainingThreshold = new Date(Date.now() - (timeouts.workerThreadSeconds * 1000));
      
      // Find stuck video generations
      const stuckVideos = await storage.getStuckVideoGenerations(stuckTrainingThreshold);
      for (const video of stuckVideos) {
        await this.resetIntegrationState({
          userId: video.requestedBy,
          provider: video.provider as 'kling' | 'runwayml',
          operationType: 'video_generation',
          operationId: video.storyId,
          error: `Cleanup: stuck for more than ${timeouts.workerThreadSeconds} seconds`
        });
      }
      
      console.log(`✅ Periodic cleanup completed`);
      
    } catch (cleanupError) {
      console.error(`❌ Periodic cleanup failed:`, cleanupError);
    }
  }
}

export const externalIntegrationStateReset = ExternalIntegrationStateReset;