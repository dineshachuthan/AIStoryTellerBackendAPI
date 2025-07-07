import { storage } from './storage';

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
  private readonly TRAINING_THRESHOLD = 5;

  private async getVoiceProviderFactory() {
    const { VoiceProviderFactory } = await import('./voice-providers/voice-provider-factory');
    return VoiceProviderFactory;
  }

  /**
   * Check if voice training should be triggered based on unlocked samples count
   */
  async shouldTriggerTraining(userId: string): Promise<boolean> {
    console.log(`[VoiceTrainingService] ================================ TRAINING TRIGGER ASSESSMENT INITIATED ================================`);
    console.log(`[VoiceTrainingService] Beginning comprehensive assessment to determine if voice training should be triggered for user: ${userId}`);
    console.log(`[VoiceTrainingService] Training threshold configuration: ${this.TRAINING_THRESHOLD} unlocked samples required before triggering ElevenLabs voice cloning`);
    console.log(`[VoiceTrainingService] Assessment purpose: Prevent premature voice training and ensure sufficient sample variety for high-quality voice synthesis`);
    console.log(`[VoiceTrainingService] Querying database for current unlocked sample count for user ${userId}...`);
    
    try {
      const unlockedCount = await storage.getUserUnlockedSamplesCount(userId);
      
      console.log(`[VoiceTrainingService] Database query completed successfully. Results: User ${userId} currently has ${unlockedCount} unlocked voice samples`);
      console.log(`[VoiceTrainingService] Threshold comparison: ${unlockedCount} current samples vs ${this.TRAINING_THRESHOLD} required samples = ${unlockedCount >= this.TRAINING_THRESHOLD ? 'TRIGGER TRAINING' : 'WAIT FOR MORE SAMPLES'}`);
      
      if (unlockedCount >= this.TRAINING_THRESHOLD) {
        console.log(`[VoiceTrainingService] ===== TRAINING TRIGGER CONDITION MET ===== User ${userId} has sufficient samples (${unlockedCount}) to proceed with ElevenLabs voice cloning`);
        console.log(`[VoiceTrainingService] Next operation: Voice training will be initiated to create personalized voice model using all available samples`);
      } else {
        console.log(`[VoiceTrainingService] ===== TRAINING TRIGGER CONDITION NOT MET ===== User ${userId} needs ${this.TRAINING_THRESHOLD - unlockedCount} more samples before voice training can begin`);
        console.log(`[VoiceTrainingService] User must continue recording voice samples to reach minimum threshold for quality voice synthesis`);
      }
      
      return unlockedCount >= this.TRAINING_THRESHOLD;
    } catch (error) {
      console.error(`[VoiceTrainingService] ========================== CRITICAL DATABASE ERROR ==========================`);
      console.error(`[VoiceTrainingService] Failed to retrieve unlocked sample count for user ${userId} from database`);
      console.error(`[VoiceTrainingService] Error details: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`[VoiceTrainingService] Error stack trace: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
      console.error(`[VoiceTrainingService] Database error prevents training trigger assessment. Defaulting to FALSE to prevent accidental voice training.`);
      console.error(`[VoiceTrainingService] Manual intervention required to resolve database connectivity or query execution issues.`);
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
   * MVP1 Hybrid Voice Cloning: Trigger training when 6 different emotions are recorded
   * Creates ONE voice clone and stores it as separate entities for each emotion
   */
  async triggerHybridEmotionCloning(userId: string): Promise<VoiceTrainingResult> {
    return new Promise(async (resolve) => {
      // Set 2-minute timeout for voice cloning
      const timeout = setTimeout(() => {
        console.error(`[HybridCloning] Voice cloning timed out after 2 minutes for user ${userId}`);
        resolve({
          success: false,
          error: 'Hybrid voice cloning timed out after 2 minutes',
          samplesProcessed: 0
        });
      }, 120000); // 2 minutes

      try {
        console.log(`[MVP1] ============================= STARTING MVP1 VOICE CLONING =============================`);
        console.log(`[MVP1] Beginning MVP1 voice cloning process for user ${userId} at ${new Date().toISOString()}`);
        console.log(`[MVP1] MVP1 approach: Send ALL ESM samples (emotions+sounds+modulations) → Create ONE narrator voice → Store in each ESM row`);
        
        // Get ALL ESM recordings for user (emotions, sounds, modulations)
        const { storage } = await import('./storage');
        const allEsmRecordings = await storage.getUserEsmRecordings(userId);
        
        console.log(`[MVP1] User has recorded ${allEsmRecordings.length} total ESM samples across all categories`);
        
        if (allEsmRecordings.length < this.TRAINING_THRESHOLD) {
          clearTimeout(timeout);
          console.log(`[MVP1] ❌ Insufficient ESM samples for voice cloning: ${allEsmRecordings.length}/${this.TRAINING_THRESHOLD} required`);
          return resolve({
            success: false,
            error: `Need ${this.TRAINING_THRESHOLD} ESM samples for voice cloning. Currently have: ${allEsmRecordings.length}`,
            samplesProcessed: 0
          });
        }

        // Generate signed URLs for external API access using audio storage provider
        const { audioStorageFactory } = await import('./audio-storage-providers');
        const audioStorageProvider = audioStorageFactory.getActiveProvider();
        
        console.log(`[MVP1] Using audio storage provider: ${audioStorageProvider.name}`);
        
        // Prepare all ESM samples with signed URLs for ElevenLabs
        const mvp1Samples = [];
        const samplesToUpdate = []; // Track ESM recordings to update with narrator voice ID
        
        for (const esmRecording of allEsmRecordings) {
          console.log(`[MVP1] Processing ESM recording:`, {
            name: esmRecording.name,
            audioUrl: esmRecording.audio_url, // Note: database field is audio_url (snake_case)
            category: esmRecording.category
          });
          
          // Check if audio_url exists (database field is snake_case)
          if (!esmRecording.audio_url) {
            console.log(`[MVP1] Skipping ${esmRecording.name} - no audio_url found`);
            continue;
          }
          
          // Generate signed URL for external API access (30 minutes duration)
          const signedUrl = await audioStorageProvider.generateSignedUrl(esmRecording.audio_url, {
            expiresIn: '30m',
            purpose: 'external_api_access',
            userId: userId
          });
          
          console.log(`[MVP1] Generated signed URL for ${esmRecording.name}: ${signedUrl}`);
          
          // Quick validation - test if the URL is accessible
          try {
            const testResponse = await fetch(signedUrl, { method: 'HEAD' });
            if (!testResponse.ok) {
              console.log(`[MVP1] Skipping ${esmRecording.name} - URL not accessible (${testResponse.status})`);
              continue;
            }
            console.log(`[MVP1] URL validation passed for ${esmRecording.name}`);
          } catch (error) {
            console.log(`[MVP1] Skipping ${esmRecording.name} - URL validation failed:`, error.message);
            continue;
          }
          
          mvp1Samples.push({
            emotion: esmRecording.name, // Use the ESM name (e.g. "frustration", "footsteps", "drama")
            audioUrl: signedUrl, // Use signed URL for external access
            isLocked: false
          });
          samplesToUpdate.push(esmRecording.id); // Track ESM recording ID for narrator voice storage
        }

        // OLD HYBRID CODE - Commented out for MVP1 implementation
        // console.log(`[HybridCloning] Collected ${hybridSamples.length} emotion samples for hybrid voice cloning`);
        // 
        // // Lock samples before training to prevent modification
        // console.log(`[HybridCloning] Locking ${samplesToLock.length} voice samples during training`);
        // for (const sampleId of samplesToLock) {
        //   try {
        //     await storage.updateUserVoiceSample(sampleId, {
        //       isLocked: true,
        //       lockedAt: new Date()
        //     });
        //   } catch (error) {
        //     console.error(`[HybridCloning] Error locking sample ${sampleId}:`, error);
        //   }
        // }

        console.log(`[MVP1] Collected ${mvp1Samples.length} ESM samples for MVP1 voice cloning`);
        
        // Use voice provider to create ONE narrator voice from ALL ESM samples
        const { VoiceProviderRegistry } = await import('./voice-providers/provider-manager');
        const voiceProvider = VoiceProviderRegistry.getModule();
        
        if (!voiceProvider) {
          clearTimeout(timeout);
          return resolve({
            success: false,
            error: 'No voice provider available for MVP1 cloning',
            samplesProcessed: 0
          });
        }

        // Create ONE narrator voice from ALL ESM samples (emotions + sounds + modulations)
        console.log(`[MVP1] Creating ONE narrator voice from ${mvp1Samples.length} ESM samples using ${voiceProvider.constructor.name}`);
        
        // Get or create user voice profile
        let userProfile = await storage.getUserVoiceProfile(userId);
        if (!userProfile) {
          userProfile = await storage.createUserVoiceProfile({
            userId: userId,
            profileName: `Narrator_${userId.substring(0, 8)}_${Date.now()}`,
            baseVoice: 'alloy', // Default OpenAI voice for base reference
            trainingStatus: 'training',
            trainingStartedAt: new Date()
          });
        }
        
        const voiceTrainingRequest = {
          userId: userId,
          voiceProfileId: userProfile.id,
          samples: mvp1Samples
        };
        
        const cloneResult = await voiceProvider.trainVoice(voiceTrainingRequest);
        
        if (!cloneResult.success || !cloneResult.voiceId) {
          clearTimeout(timeout);
          return resolve({
            success: false,
            error: cloneResult.error || 'Failed to create MVP1 narrator voice',
            samplesProcessed: mvp1Samples.length
          });
        }

        console.log(`[MVP1] ✅ SUCCESS: Created narrator voice ${cloneResult.voiceId} from ${mvp1Samples.length} ESM samples`);
        
        // Store the SAME narrator voice ID in ALL ESM recording rows
        await this.storeMVP1NarratorVoiceInAllEsmRecordings(userId, cloneResult.voiceId, samplesToUpdate);
        
        clearTimeout(timeout);
        console.log(`[MVP1] MVP1 voice cloning completed successfully for user ${userId}`);
        
        resolve({
          success: true,
          voiceId: cloneResult.voiceId,
          samplesProcessed: mvp1Samples.length
        });
        
      } catch (error) {
        clearTimeout(timeout);
        console.error(`[MVP1] Error in MVP1 voice cloning:`, error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown MVP1 cloning error',
          samplesProcessed: 0
        });
      }
    });
  }

  /**
   * MVP1: Store narrator voice ID in ALL ESM recording rows
   * @param userId - User ID for the voice recordings
   * @param narratorVoiceId - ElevenLabs voice ID to store in all ESM recordings
   * @param esmRecordingIds - Array of ESM recording IDs to update
   */
  private async storeMVP1NarratorVoiceInAllEsmRecordings(userId: string, narratorVoiceId: string, esmRecordingIds: number[]): Promise<void> {
    console.log(`[MVP1] Storing narrator voice ${narratorVoiceId} in ${esmRecordingIds.length} ESM recordings for user ${userId}`);
    
    for (const esmRecordingId of esmRecordingIds) {
      try {
        // Update ESM recording with narrator voice ID
        await storage.updateUserEsmRecording(esmRecordingId, {
          narrator_voice_id: narratorVoiceId,
          updated_date: new Date()
        });
        
        console.log(`[MVP1] ✅ Updated ESM recording ${esmRecordingId} with narrator voice ${narratorVoiceId}`);
      } catch (error) {
        console.error(`[MVP1] Error updating ESM recording ${esmRecordingId}:`, error);
      }
    }
    
    console.log(`[MVP1] Successfully stored narrator voice ID in all ${esmRecordingIds.length} ESM recordings`);
  }

  /**
   * OLD HYBRID: Store the same voice clone as separate entities for each emotion (MVP1 approach)
   * COMMENTED OUT - Using MVP1 approach instead
   */
  private async storeHybridVoiceCloneForAllEmotions(userId: string, voiceId: string, emotions: string[]): Promise<void> {
    console.log(`[HybridCloning] Storing voice clone ${voiceId} as separate entities for ${emotions.length} emotions`);
    
    for (const emotion of emotions) {
      try {
        // Create user_emotion_voices entry for this emotion using the SAME voice clone
        await storage.createUserEmotionVoice({
          userVoiceProfileId: await this.ensureUserVoiceProfile(userId),
          emotion: emotion,
          elevenLabsVoiceId: voiceId, // Same voice clone for all emotions
          trainingStatus: 'completed',
          sampleCount: 1, // Each emotion contributes 1 sample to the hybrid clone
          qualityScore: 0.8, // Default quality for hybrid clones
          voiceSettings: {
            hybrid: true,
            sourceEmotions: emotions
          },
          trainingMetadata: {
            approach: 'hybrid_mvp1',
            createdAt: new Date().toISOString(),
            sourceEmotions: emotions
          },
          trainingCost: 0, // Cost will be distributed across emotions
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log(`[HybridCloning] ✅ Stored voice clone ${voiceId} for emotion: ${emotion}`);
      } catch (error) {
        console.error(`[HybridCloning] Error storing voice clone for emotion ${emotion}:`, error);
      }
    }
    
    console.log(`[HybridCloning] Successfully stored hybrid voice clone for all ${emotions.length} emotions`);
  }

  /**
   * Get voice modulations for specific emotion - now uses ESM architecture
   */
  private async getUserVoiceModulationsForEmotion(userId: string, emotion: string): Promise<any[]> {
    // ESM architecture: Get user's ESM recordings for the specific emotion
    const { storage } = await import('./storage');
    const esmRecordings = await storage.getUserEsmRecordings(userId);
    
    // Filter for the specific emotion
    return esmRecordings.filter(recording => 
      recording.name.toLowerCase() === emotion.toLowerCase()
    );
  }

  /**
   * Ensure user has a voice profile
   */
  private async ensureUserVoiceProfile(userId: string): Promise<number> {
    let voiceProfile = await storage.getUserVoiceProfile(userId);
    
    if (!voiceProfile) {
      voiceProfile = await storage.createUserVoiceProfile({
        userId: userId,
        profileName: `${userId}_hybrid_voice`, // Use profileName instead of voiceName
        baseVoice: 'alloy', // Required field
        voiceSettings: { hybrid: true },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return voiceProfile.id;
  }

  /**
   * Original trigger method - kept for compatibility
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
          profileName: `Voice_Profile_${userId}`, // Required field
          baseVoice: 'alloy', // Required field  
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

      // Train voice with active provider (ElevenLabs or future providers like Kling)
      const { VoiceProviderFactory } = await import('./voice-providers/voice-provider-factory');
      const trainingResult = await VoiceProviderFactory.trainVoice({
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