/**
 * Ephemeral Voice Manager
 * Handles the lifecycle of temporary ElevenLabs voices during story narration
 * Creates voice → Generates narration → Deletes voice immediately
 */

import { db } from './db';
import { userEsmRecordings } from '@shared/schema';
import { eq, and, gte } from 'drizzle-orm';
import { ElevenLabsVoiceCloning } from './elevenlabs-voice-cloning';
import { VOICE_TYPES, MIN_SAMPLES_FOR_VOICE, VOICE_CLEANUP_CONFIG } from '@shared/ephemeral-voice-config';
import { voiceIdCleanup } from '@shared/schema';

interface VoiceCreationResult {
  voiceId: string | null;
  voiceType: string;
  error?: string;
}

interface EphemeralVoiceOptions {
  userId: string;
  voiceType: string;
  storyId?: number;
}

export class EphemeralVoiceManager {
  private elevenLabs: ElevenLabsVoiceCloning;

  constructor() {
    this.elevenLabs = new ElevenLabsVoiceCloning();
  }

  /**
   * Check if user has enough samples for a specific voice type
   */
  async hasEnoughSamples(userId: string, voiceType: string): Promise<boolean> {
    const recordings = await db
      .select()
      .from(userEsmRecordings)
      .where(
        and(
          eq(userEsmRecordings.userId, userId),
          eq(userEsmRecordings.voiceType, voiceType),
          eq(userEsmRecordings.isActive, true)
        )
      );

    return recordings.length >= MIN_SAMPLES_FOR_VOICE;
  }

  /**
   * Get available voice types for a user
   */
  async getAvailableVoiceTypes(userId: string): Promise<string[]> {
    const availableTypes: string[] = [];
    
    for (const voiceType of VOICE_TYPES) {
      if (await this.hasEnoughSamples(userId, voiceType.id)) {
        availableTypes.push(voiceType.id);
      }
    }
    
    return availableTypes;
  }

  /**
   * Create ephemeral voice for narration
   */
  async createEphemeralVoice(options: EphemeralVoiceOptions): Promise<VoiceCreationResult> {
    const { userId, voiceType } = options;
    
    try {
      // Get voice samples for the specific voice type
      const recordings = await db
        .select()
        .from(userEsmRecordings)
        .where(
          and(
            eq(userEsmRecordings.userId, userId),
            eq(userEsmRecordings.voiceType, voiceType),
            eq(userEsmRecordings.isActive, true)
          )
        )
        .limit(MIN_SAMPLES_FOR_VOICE);

      if (recordings.length < MIN_SAMPLES_FOR_VOICE) {
        return {
          voiceId: null,
          voiceType,
          error: `Not enough samples for ${voiceType} voice. Need ${MIN_SAMPLES_FOR_VOICE}, have ${recordings.length}`
        };
      }

      // Create the voice using ElevenLabs
      const voiceName = `${voiceType}_${userId}_${Date.now()}`;
      const result = await this.elevenLabs.createVoiceFromSamples(
        recordings,
        voiceName,
        `Ephemeral ${voiceType} voice`
      );

      if (!result.success || !result.voiceId) {
        return {
          voiceId: null,
          voiceType,
          error: result.error || 'Failed to create voice'
        };
      }

      // Log the creation for cleanup tracking
      await db.insert(voiceIdCleanup).values({
        voiceId: result.voiceId,
        providerId: 'elevenlabs',
        userId,
        voiceType,
        status: 'created',
        createdAt: new Date()
      });

      return {
        voiceId: result.voiceId,
        voiceType
      };
    } catch (error) {
      console.error('[EphemeralVoiceManager] Failed to create voice:', error);
      return {
        voiceId: null,
        voiceType,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete ephemeral voice after use
   */
  async deleteEphemeralVoice(voiceId: string): Promise<void> {
    let retries = 0;
    
    while (retries < VOICE_CLEANUP_CONFIG.maxRetries) {
      try {
        // Delete from ElevenLabs
        const result = await this.elevenLabs.deleteVoice(voiceId);
        
        if (result.success) {
          // Update cleanup log
          await db
            .update(voiceIdCleanup)
            .set({
              status: 'deleted',
              deletedAt: new Date()
            })
            .where(eq(voiceIdCleanup.voiceId, voiceId));
          
          console.log(`[EphemeralVoiceManager] Successfully deleted voice ${voiceId}`);
          return;
        }
        
        throw new Error(result.error || 'Failed to delete voice');
      } catch (error) {
        retries++;
        console.error(`[EphemeralVoiceManager] Delete attempt ${retries} failed:`, error);
        
        if (retries < VOICE_CLEANUP_CONFIG.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, VOICE_CLEANUP_CONFIG.retryDelay));
        }
      }
    }

    // Log failure after all retries
    if (VOICE_CLEANUP_CONFIG.logFailures) {
      await db
        .update(voiceIdCleanup)
        .set({
          status: 'failed',
          errorData: { 
            message: 'Failed to delete after retries',
            retries: VOICE_CLEANUP_CONFIG.maxRetries
          }
        })
        .where(eq(voiceIdCleanup.voiceId, voiceId));
    }
  }

  /**
   * Get voice progress for all voice types
   */
  async getVoiceProgress(userId: string): Promise<Array<{
    voiceType: string;
    recordedCount: number;
    requiredCount: number;
  }>> {
    const progress = [];
    
    for (const voiceType of VOICE_TYPES) {
      const recordings = await db
        .select()
        .from(userEsmRecordings)
        .where(
          and(
            eq(userEsmRecordings.userId, userId),
            eq(userEsmRecordings.voiceType, voiceType.id),
            eq(userEsmRecordings.isActive, true)
          )
        );
      
      progress.push({
        voiceType: voiceType.id,
        recordedCount: recordings.length,
        requiredCount: MIN_SAMPLES_FOR_VOICE
      });
    }
    
    return progress;
  }

  /**
   * Cleanup orphaned voices (admin function)
   */
  async cleanupOrphanedVoices(): Promise<number> {
    // Find voices created but not deleted after 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const orphanedVoices = await db
      .select()
      .from(voiceIdCleanup)
      .where(
        and(
          eq(voiceIdCleanup.status, 'created'),
          eq(voiceIdCleanup.providerId, 'elevenlabs')
        )
      );

    let cleanedCount = 0;
    
    for (const voice of orphanedVoices) {
      if (new Date(voice.createdAt) < oneHourAgo) {
        await this.deleteEphemeralVoice(voice.voiceId);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }
}

export const ephemeralVoiceManager = new EphemeralVoiceManager();