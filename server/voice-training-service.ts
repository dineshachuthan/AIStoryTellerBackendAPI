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
    console.log(`[VoiceTrainingService] ================================ MVP2 TRAINING TRIGGER ASSESSMENT INITIATED ================================`);
    console.log(`[VoiceTrainingService] Beginning MVP2 assessment to determine if voice training should be triggered for user: ${userId}`);
    console.log(`[VoiceTrainingService] MVP2 Architecture: ESM-based three-level analysis (Individual → Category → Combined)`);
    console.log(`[VoiceTrainingService] No sample-level locking - continuous voice sample recording enabled`);
    
    try {
      // Use MVP2 ElevenLabs integration for trigger assessment
      const { mvp2ElevenLabsIntegration } = await import('./mvp2-elevenlabs-integration');
      const shouldTrigger = await mvp2ElevenLabsIntegration.shouldTriggerMVP2Training(userId);
      
      console.log(`[VoiceTrainingService] MVP2 trigger assessment completed: ${shouldTrigger ? 'TRIGGER TRAINING' : 'INSUFFICIENT SAMPLES'}`);
      
      if (shouldTrigger) {
        console.log(`[VoiceTrainingService] ===== MVP2 TRAINING TRIGGER CONDITION MET ===== User ${userId} has sufficient ESM samples for specialized voice generation`);
        console.log(`[VoiceTrainingService] Next operation: MVP2 voice training will create category-specific narrator voices using intelligent segmentation`);
      } else {
        console.log(`[VoiceTrainingService] ===== MVP2 TRAINING TRIGGER CONDITION NOT MET ===== User ${userId} needs more ESM samples for quality voice synthesis`);
        console.log(`[VoiceTrainingService] User must continue recording emotions/sounds/modulations to reach MVP2 thresholds`);
      }
      
      return shouldTrigger;
    } catch (error) {
      console.error(`[VoiceTrainingService] ========================== CRITICAL MVP2 ASSESSMENT ERROR ==========================`);
      console.error(`[VoiceTrainingService] Failed to assess MVP2 training trigger for user ${userId}`);
      console.error(`[VoiceTrainingService] Error details: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`[VoiceTrainingService] Error stack trace: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
      console.error(`[VoiceTrainingService] MVP2 assessment error prevents training trigger. Defaulting to FALSE to prevent accidental voice training.`);
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
        
        // SMART LOGIC: Separate locked and unlocked recordings to optimize ElevenLabs API calls
        const unlockedRecordings = allEsmRecordings.filter(r => !r.is_locked);
        const lockedRecordings = allEsmRecordings.filter(r => r.is_locked && r.narrator_voice_id);
        
        console.log(`[MVP1] 🎯 Smart selection: ${unlockedRecordings.length} unlocked, ${lockedRecordings.length} locked recordings`);
        
        // Determine which recordings to use based on smart logic
        let recordingsToProcess = [];
        
        if (unlockedRecordings.length >= this.TRAINING_THRESHOLD) {
          // We have enough unlocked recordings - no need to include locked ones
          recordingsToProcess = unlockedRecordings;
          console.log(`[MVP1] ✅ Using only ${unlockedRecordings.length} unlocked recordings (meets minimum threshold)`);
        } else {
          // Need to include some locked recordings to meet minimum threshold
          const lockedNeeded = Math.min(this.TRAINING_THRESHOLD - unlockedRecordings.length, lockedRecordings.length);
          recordingsToProcess = [...unlockedRecordings, ...lockedRecordings.slice(0, lockedNeeded)];
          console.log(`[MVP1] ⚠️ Including ${lockedNeeded} locked recordings to meet minimum threshold of ${this.TRAINING_THRESHOLD}`);
        }
        
        if (recordingsToProcess.length < this.TRAINING_THRESHOLD) {
          clearTimeout(timeout);
          console.log(`[MVP1] ❌ Insufficient ESM samples for voice cloning: ${recordingsToProcess.length}/${this.TRAINING_THRESHOLD} required`);
          return resolve({
            success: false,
            error: `Need ${this.TRAINING_THRESHOLD} ESM samples for voice cloning. Currently have: ${recordingsToProcess.length} usable`,
            samplesProcessed: 0
          });
        }

        // Generate signed URLs for external API access using audio storage provider
        const { audioStorageFactory } = await import('./audio-storage-providers');
        const audioStorageProvider = audioStorageFactory.getActiveProvider();
        
        console.log(`[MVP1] Using audio storage provider: ${audioStorageProvider.name}`);
        
        // Prepare only the selected ESM samples with signed URLs for ElevenLabs
        const mvp1Samples = [];
        const samplesToUpdate = []; // Track ESM recordings to update with narrator voice ID
        
        for (const esmRecording of recordingsToProcess) {
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
          
          // Comprehensive audio validation BEFORE sending to ElevenLabs
          try {
            // Step 1: Check URL accessibility
            const testResponse = await fetch(signedUrl, { method: 'HEAD' });
            if (!testResponse.ok) {
              console.log(`[MVP1] ❌ Skipping ${esmRecording.name} - URL not accessible (${testResponse.status})`);
              continue;
            }
            
            // Step 2: Download and validate audio content
            console.log(`[MVP1] 🔍 Validating audio content for ${esmRecording.name}...`);
            const audioResponse = await fetch(signedUrl);
            const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
            
            // Step 3: Detect audio format
            const { detectAudioFormat } = await import('./ai-analysis');
            const detectedFormat = detectAudioFormat(audioBuffer);
            console.log(`[MVP1] Detected format for ${esmRecording.name}: ${detectedFormat}`);
            
            // Step 4: Validate format is supported by ElevenLabs
            const supportedFormats = ['mp3', 'wav', 'webm', 'm4a'];
            if (!supportedFormats.includes(detectedFormat)) {
              console.log(`[MVP1] ❌ Skipping ${esmRecording.name} - Unsupported format: ${detectedFormat}`);
              continue;
            }
            
            // Step 5: Basic integrity check - minimum file size
            if (audioBuffer.length < 1000) { // Less than 1KB is likely corrupted
              console.log(`[MVP1] ❌ Skipping ${esmRecording.name} - File too small (${audioBuffer.length} bytes)`);
              continue;
            }
            
            // Step 6: Check duration from database
            if (!esmRecording.duration || parseFloat(esmRecording.duration) < 5.0) {
              console.log(`[MVP1] ❌ Skipping ${esmRecording.name} - Duration too short (${esmRecording.duration}s < 5s)`);
              continue;
            }
            
            console.log(`[MVP1] ✅ Audio validation passed for ${esmRecording.name} - ${detectedFormat} format, ${audioBuffer.length} bytes, ${esmRecording.duration}s`);
          } catch (error) {
            console.log(`[MVP1] ❌ Skipping ${esmRecording.name} - Validation failed:`, error.message);
            // Delete corrupted recording from database to allow re-recording
            try {
              await storage.deleteUserEsmRecording(esmRecording.id);
              console.log(`[MVP1] 🗑️ Deleted corrupted recording ${esmRecording.name} from database`);
            } catch (deleteError) {
              console.error(`[MVP1] Failed to delete corrupted recording:`, deleteError);
            }
            continue;
          }
          
          mvp1Samples.push({
            emotion: esmRecording.name, // Use the ESM name (e.g. "frustration", "footsteps", "drama")
            audioUrl: signedUrl, // Use signed URL for external access
            isLocked: false,
            recordingId: esmRecording.id // Include recording ID for fault-tolerant deletion
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
        
        // Store the SAME narrator voice ID in BOTH tables using dual-table write
        const userEsmIds = [...new Set(allEsmRecordings.map(r => r.user_esm_id))]; // Get unique user_esm IDs
        await this.storeMVP1NarratorVoiceInBothTables(userId, cloneResult.voiceId, samplesToUpdate, userEsmIds);
        
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
   * MVP1: Store narrator voice ID in BOTH user_esm and user_esm_recordings tables (DUAL-TABLE WRITE)
   * @param userId - User ID for the voice recordings
   * @param narratorVoiceId - ElevenLabs voice ID to store in both tables
   * @param esmRecordingIds - Array of ESM recording IDs to update
   * @param userEsmIds - Array of user ESM IDs to update
   */
  private async storeMVP1NarratorVoiceInBothTables(userId: string, narratorVoiceId: string, esmRecordingIds: number[], userEsmIds: number[]): Promise<void> {
    console.log(`[MVP1 DUAL-TABLE] Storing narrator voice ${narratorVoiceId} in BOTH tables for user ${userId}`);
    console.log(`[MVP1 DUAL-TABLE] Updating ${esmRecordingIds.length} ESM recordings and ${userEsmIds.length} user ESM records`);
    
    // TABLE 1: Update user_esm_recordings with narrator voice ID
    for (const esmRecordingId of esmRecordingIds) {
      try {
        await storage.updateUserEsmRecording(esmRecordingId, {
          narrator_voice_id: narratorVoiceId,
          updated_date: new Date()
        });
        console.log(`[MVP1 DUAL-TABLE] ✅ Updated user_esm_recordings ${esmRecordingId} with narrator voice ${narratorVoiceId}`);
      } catch (error) {
        console.error(`[MVP1 DUAL-TABLE] Error updating user_esm_recordings ${esmRecordingId}:`, error);
      }
    }
    
    // TABLE 2: Update user_esm with narrator voice ID
    for (const userEsmId of userEsmIds) {
      try {
        await storage.updateUserEsm(userEsmId, {
          narrator_voice_id: narratorVoiceId
        });
        console.log(`[MVP1 DUAL-TABLE] ✅ Updated user_esm ${userEsmId} with narrator voice ${narratorVoiceId}`);
      } catch (error) {
        console.error(`[MVP1 DUAL-TABLE] Error updating user_esm ${userEsmId}:`, error);
      }
    }
    
    console.log(`[MVP1 DUAL-TABLE] Successfully stored narrator voice ID ${narratorVoiceId} in BOTH tables as required by business logic`);
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
      // Set 5-minute timeout for MVP2 operations
      const timeout = setTimeout(() => {
        console.error(`[MVP2Training] Training timed out after 5 minutes for user ${userId}`);
        resolve({
          success: false,
          error: 'MVP2 voice training timed out after 5 minutes',
          samplesProcessed: 0
        });
      }, 300000); // 5 minutes for MVP2

      try {
        console.log(`[MVP2Training] Starting MVP2 automatic training for user ${userId}`);
        
        if (!(await this.shouldTriggerTraining(userId))) {
          clearTimeout(timeout);
          resolve({
            success: false,
            error: 'MVP2 training threshold not met',
            samplesProcessed: 0
          });
          return;
        }

        // Use MVP2 ElevenLabs integration for specialized voice generation
        const { mvp2ElevenLabsIntegration } = await import('./mvp2-elevenlabs-integration');
        const result = await mvp2ElevenLabsIntegration.generateSpecializedNarratorVoices(userId);
        
        clearTimeout(timeout);
        
        console.log(`[MVP2Training] Voice generation completed:`, {
          success: result.success,
          voicesCreated: result.voicesCreated.length,
          segmentationType: result.segmentationUsed,
          lockingApplied: result.lockingApplied
        });
        
        if (result.success) {
          console.log(`[MVP2Training] ===== MVP2 AUTOMATIC TRAINING SUCCESSFUL ===== Created ${result.voicesCreated.length} specialized voices`);
          resolve({
            success: true,
            voiceId: result.voicesCreated[0]?.voiceId,
            samplesProcessed: result.voicesCreated.reduce((sum, voice) => sum + voice.items.length, 0),
            mvp2Result: result
          });
        } else {
          console.error(`[MVP2Training] ===== MVP2 AUTOMATIC TRAINING FAILED =====`);
          console.error(`[MVP2Training] Error: ${result.error}`);
          resolve({
            success: false,
            error: result.error,
            samplesProcessed: 0
          });
        }

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