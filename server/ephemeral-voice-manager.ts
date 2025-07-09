/**
 * Ephemeral Voice Session Manager
 * Handles temporary ElevenLabs voice lifecycle to bypass voice count limits
 */

import { storage } from './storage';
import { ElevenLabsVoiceCloning } from './elevenlabs-voice-cloning';
import { StoryNarrator } from './story-narrator';
import { EPHEMERAL_VOICE_CONFIG } from '@shared/ephemeral-voice-config';
import type { VoiceSession } from '@shared/voice-gamification-types';

export class EphemeralVoiceManager {
  private elevenLabs: ElevenLabsVoiceCloning;
  private storyNarrator: StoryNarrator;
  private activeSessions: Map<string, VoiceSession> = new Map();

  constructor() {
    this.elevenLabs = new ElevenLabsVoiceCloning();
    this.storyNarrator = new StoryNarrator();
  }

  /**
   * Create an ephemeral voice session for batch narration generation
   */
  async createVoiceSession(userId: string): Promise<VoiceSession> {
    console.log(`[EphemeralVoice] Creating voice session for user ${userId}`);
    
    // Check if user has enough voice samples
    const recordings = await storage.getUserEsmRecordingsByUser(userId);
    const validRecordings = recordings.filter(r => r.audioUrl && r.isActive);
    
    if (validRecordings.length < EPHEMERAL_VOICE_CONFIG.MIN_SAMPLES_FOR_VOICE) {
      throw new Error(`Need at least ${EPHEMERAL_VOICE_CONFIG.MIN_SAMPLES_FOR_VOICE} voice samples. You have ${validRecordings.length}.`);
    }

    // Create session
    const session: VoiceSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      startedAt: new Date(),
      emotionSamples: validRecordings.map(r => ({
        emotion: r.esmName,
        audioUrl: r.audioUrl!,
        duration: r.duration || 0,
        quality: r.qualityScore || 0.8
      })),
      generatedNarrations: [],
      status: 'collecting'
    };

    this.activeSessions.set(session.sessionId, session);
    return session;
  }

  /**
   * Generate all pending narrations in a single batch
   */
  async generateBatchNarrations(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Voice session not found');
    }

    try {
      session.status = 'generating';
      
      // Step 1: Create temporary ElevenLabs voice
      console.log(`[EphemeralVoice] Creating temporary voice with ${session.emotionSamples.length} samples`);
      const voiceId = await this.createTemporaryVoice(session);
      session.elevenLabsVoiceId = voiceId;

      // Step 2: Get all pending stories for narration
      const userStories = await storage.getStoriesByUser(session.userId);
      const pendingStories = userStories.filter(story => 
        !story.hasNarration && story.status === 'analyzed'
      );

      console.log(`[EphemeralVoice] Found ${pendingStories.length} stories pending narration`);

      // Step 3: Generate narrations in batches
      const batchSize = EPHEMERAL_VOICE_CONFIG.SESSION_SETTINGS.NARRATION_BATCH_SIZE;
      for (let i = 0; i < pendingStories.length; i += batchSize) {
        const batch = pendingStories.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (story) => {
          try {
            const narrationResult = await this.storyNarrator.generateStoryNarration(
              story.id,
              session.userId,
              voiceId // Use temporary voice
            );
            
            session.generatedNarrations.push({
              storyId: story.id,
              audioUrl: narrationResult.audioUrl,
              generatedAt: new Date()
            });
          } catch (error) {
            console.error(`[EphemeralVoice] Failed to generate narration for story ${story.id}:`, error);
          }
        }));
      }

      // Step 4: Delete the temporary voice
      await this.deleteTemporaryVoice(voiceId);
      session.elevenLabsVoiceId = undefined;
      
      session.status = 'completed';
      session.completedAt = new Date();
      
      console.log(`[EphemeralVoice] Session completed. Generated ${session.generatedNarrations.length} narrations`);
      
    } catch (error) {
      session.status = 'failed';
      // Clean up voice if it was created
      if (session.elevenLabsVoiceId) {
        await this.deleteTemporaryVoice(session.elevenLabsVoiceId).catch(console.error);
      }
      throw error;
    }
  }

  /**
   * Create a temporary voice in ElevenLabs
   */
  private async createTemporaryVoice(session: VoiceSession): Promise<string> {
    // Prepare voice samples
    const voiceSamples = session.emotionSamples.map(sample => ({
      emotion: sample.emotion,
      audioUrl: sample.audioUrl,
      recordingId: `temp_${sample.emotion}`
    }));

    // Create voice with ephemeral naming
    const result = await this.elevenLabs.createVoiceFromSamples(
      session.userId,
      voiceSamples,
      `Ephemeral_Voice_${session.sessionId}`
    );

    if (!result.success || !result.voiceId) {
      throw new Error('Failed to create temporary voice');
    }

    return result.voiceId;
  }

  /**
   * Delete a temporary voice from ElevenLabs
   */
  private async deleteTemporaryVoice(voiceId: string): Promise<void> {
    console.log(`[EphemeralVoice] Deleting temporary voice ${voiceId}`);
    
    try {
      await this.elevenLabs.deleteVoice(voiceId);
      console.log(`[EphemeralVoice] Successfully deleted voice ${voiceId}`);
    } catch (error) {
      console.error(`[EphemeralVoice] Failed to delete voice ${voiceId}:`, error);
      // Log for manual cleanup but don't fail the session
      await this.logVoiceForCleanup(voiceId);
    }
  }

  /**
   * Log voice ID for manual cleanup if automatic deletion fails
   */
  private async logVoiceForCleanup(voiceId: string): Promise<void> {
    // Store in voice_id_cleanup table for later manual cleanup
    await storage.logVoiceCleanup({
      voiceId,
      reason: 'ephemeral_deletion_failed',
      attemptedAt: new Date()
    });
  }

  /**
   * Get session status
   */
  getSession(sessionId: string): VoiceSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Clean up old sessions from memory
   */
  cleanupSessions(): void {
    const cutoffTime = Date.now() - EPHEMERAL_VOICE_CONFIG.SESSION_SETTINGS.VOICE_RETENTION_TIME;
    
    for (const [sessionId, session] of this.activeSessions) {
      if (session.startedAt.getTime() < cutoffTime) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

// Singleton instance
export const ephemeralVoiceManager = new EphemeralVoiceManager();