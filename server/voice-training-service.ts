import { storage } from './storage';
import { ElevenLabsProvider } from './voice-providers/elevenlabs-provider';

export interface VoiceTrainingOptions {
  userId: string;
  voiceProfileId: number;
  samples: Array<{
    emotion: string;
    audioUrl: string;
    isLocked: boolean;
  }>;
}

export interface VoiceTrainingResult {
  success: boolean;
  voiceId?: string;
  error?: string;
  samplesProcessed: number;
}

export class VoiceTrainingService {
  private elevenLabsProvider: ElevenLabsProvider;
  private readonly TRAINING_THRESHOLD = 5;

  constructor() {
    this.elevenLabsProvider = new ElevenLabsProvider({
      apiConfig: {
        baseUrl: 'https://api.elevenlabs.io/v1',
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        model: 'eleven_monolingual_v1'
      }
    });
  }

  /**
   * Check if voice training should be triggered based on unlocked samples count
   */
  async shouldTriggerTraining(userId: string): Promise<boolean> {
    try {
      const unlockedCount = await storage.getUserUnlockedSamplesCount(userId);
      return unlockedCount >= this.TRAINING_THRESHOLD;
    } catch (error) {
      console.error('Error checking training trigger:', error);
      return false;
    }
  }

  /**
   * Get all samples for voice training (both locked and unlocked)
   */
  async getAllUserSamples(userId: string): Promise<Array<{
    emotion: string;
    audioUrl: string;
    isLocked: boolean;
  }>> {
    try {
      const samples = await storage.getAllUserVoiceSamples(userId);
      return samples.map(sample => ({
        emotion: sample.label, // Use label as emotion
        audioUrl: sample.audioUrl,
        isLocked: sample.isLocked || false // Handle null values
      }));
    } catch (error) {
      console.error('Error getting user samples:', error);
      return [];
    }
  }

  /**
   * Trigger voice training automatically when threshold is reached
   * Includes 2-minute timeout to prevent infinite processing
   */
  async triggerAutomaticTraining(userId: string): Promise<VoiceTrainingResult> {
    return new Promise(async (resolve) => {
      // Set 2-minute timeout
      const timeout = setTimeout(() => {
        console.error(`[VoiceTraining] Training timed out after 2 minutes for user ${userId}`);
        resolve({
          success: false,
          error: 'Voice training timed out after 2 minutes',
          samplesProcessed: 0
        });
      }, 120000); // 2 minutes

      try {
        console.log(`[VoiceTraining] Checking automatic training trigger for user ${userId}`);
        
        if (!(await this.shouldTriggerTraining(userId))) {
          clearTimeout(timeout);
          resolve({
            success: false,
            error: 'Training threshold not met',
            samplesProcessed: 0
          });
          return;
        }

      // Get or create voice profile
      let voiceProfile = await storage.getUserVoiceProfile(userId);
      if (!voiceProfile) {
        voiceProfile = await storage.createUserVoiceProfile({
          userId,
          voiceName: `User_${userId}_Voice`,
          status: 'training',
          elevenLabsVoiceId: null,
          totalSamples: 0,
          trainingStartedAt: new Date(),
          trainingCompletedAt: null,
          lastTrainingAt: new Date()
        });
      }

      // Update profile to training status
      await storage.updateUserVoiceProfile(voiceProfile.id, {
        status: 'training',
        trainingStartedAt: new Date(),
        lastTrainingAt: new Date()
      });

      // Get all samples for training
      const allSamples = await this.getAllUserSamples(userId);
      
      if (allSamples.length === 0) {
        return {
          success: false,
          error: 'No samples found for training',
          samplesProcessed: 0
        };
      }

      // Train voice with ElevenLabs
      const trainingResult = await this.elevenLabsProvider.trainVoice({
        userId,
        voiceProfileId: voiceProfile.id,
        samples: allSamples
      });

      if (!trainingResult.success) {
        // Update profile to failed status
        await storage.updateUserVoiceProfile(voiceProfile.id, {
          status: 'failed',
          trainingCompletedAt: new Date()
        });

        clearTimeout(timeout);
        resolve({
          success: false,
          error: trainingResult.error,
          samplesProcessed: allSamples.length
        });
        return;
      }

      // Update profile with successful training
      await storage.updateUserVoiceProfile(voiceProfile.id, {
        status: 'completed',
        elevenLabsVoiceId: trainingResult.voiceId,
        totalSamples: allSamples.length,
        trainingCompletedAt: new Date()
      });

      // Lock all samples used in training
      await this.lockAllSamples(userId);

        console.log(`[VoiceTraining] Successfully trained voice for user ${userId} with ${allSamples.length} samples`);

        clearTimeout(timeout);
        resolve({
          success: true,
          voiceId: trainingResult.voiceId,
          samplesProcessed: allSamples.length
        });

      } catch (error) {
        clearTimeout(timeout);
        console.error('[VoiceTraining] Error in automatic training:', error);
        console.error('[VoiceTraining] Full error details:', JSON.stringify(error, null, 2));
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          samplesProcessed: 0
        });
      }
    });
  }

  /**
   * Lock all user samples after successful training
   */
  private async lockAllSamples(userId: string): Promise<void> {
    try {
      const samples = await storage.getAllUserVoiceSamples(userId);
      
      for (const sample of samples) {
        if (!sample.isLocked) {
          await storage.updateUserVoiceSample(sample.id, {
            isLocked: true,
            lockedAt: new Date()
          });
        }
      }

      console.log(`[VoiceTraining] Locked ${samples.length} samples for user ${userId}`);
    } catch (error) {
      console.error('[VoiceTraining] Error locking samples:', error);
    }
  }

  /**
   * Get training status for user
   */
  async getTrainingStatus(userId: string): Promise<{
    status: 'none' | 'training' | 'completed' | 'failed';
    unlockedCount: number;
    totalCount: number;
    voiceId?: string;
    trainingProgress?: number;
  }> {
    try {
      const voiceProfile = await storage.getUserVoiceProfile(userId);
      const unlockedCount = await storage.getUserUnlockedSamplesCount(userId);
      const totalCount = await storage.getUserTotalSamplesCount(userId);

      if (!voiceProfile) {
        return {
          status: 'none',
          unlockedCount,
          totalCount
        };
      }

      // Calculate training progress for UI
      let trainingProgress = 0;
      if (voiceProfile.status === 'training') {
        trainingProgress = Math.min(90, (unlockedCount / this.TRAINING_THRESHOLD) * 100);
      } else if (voiceProfile.status === 'completed') {
        trainingProgress = 100;
      }

      return {
        status: voiceProfile.status as 'none' | 'training' | 'completed' | 'failed',
        unlockedCount,
        totalCount,
        voiceId: voiceProfile.elevenLabsVoiceId || undefined,
        trainingProgress
      };
    } catch (error) {
      console.error('[VoiceTraining] Error getting training status:', error);
      return {
        status: 'none',
        unlockedCount: 0,
        totalCount: 0
      };
    }
  }
}

export const voiceTrainingService = new VoiceTrainingService();