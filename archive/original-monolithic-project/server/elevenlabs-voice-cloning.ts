/**
 * MVP2 ElevenLabs Integration Service
 * Metadata-driven specialized voice generation with category-specific narrator voice creation
 * 
 * Follows existing BaseVoiceProvider patterns with timeout/retry logic and database-first operations
 */

import { storage } from './storage';
import { voiceCloningSegmentationService, type SegmentationMetadata } from './voice-cloning-segmentation-service';

export interface MVP2VoiceGenerationResult {
  success: boolean;
  voicesCreated: {
    type: 'individual' | 'category' | 'combined';
    voiceId: string;
    items: string[];
    metadata: any;
  }[];
  lockingApplied: boolean;
  segmentationUsed: string;
  error?: string;
}

export class ElevenLabsVoiceCloning {
  private readonly TIMEOUT_DURATION = 300000; // 5 minutes for MVP2 operations

  /**
   * Generate specialized narrator voices using MVP2 three-level analysis
   * @param userId - User identifier
   * @returns MVP2 voice generation result with specialized voices
   */
  async generateSpecializedNarratorVoices(userId: string): Promise<MVP2VoiceGenerationResult> {
    console.log(`[MVP2ElevenLabs] ================================ MVP2 VOICE GENERATION INITIATED ================================`);
    console.log(`[MVP2ElevenLabs] Starting specialized narrator voice generation for user: ${userId}`);
    console.log(`[MVP2ElevenLabs] MVP2 Architecture: Individual (6+ samples) → Category (3+ samples) → Combined fallback`);

    return new Promise(async (resolve) => {
      let timeout: NodeJS.Timeout;

      try {
        // Set timeout for entire MVP2 operation
        timeout = setTimeout(() => {
          console.error(`[MVP2ElevenLabs] ========================== TIMEOUT ERROR ==========================`);
          console.error(`[MVP2ElevenLabs] MVP2 voice generation timed out after ${this.TIMEOUT_DURATION / 1000} seconds`);
          resolve({
            success: false,
            voicesCreated: [],
            lockingApplied: false,
            segmentationUsed: 'none',
            error: 'MVP2 voice generation operation timed out'
          });
        }, this.TIMEOUT_DURATION);

        // Step 1: Determine ElevenLabs segmentation strategy
        console.log(`[MVP2ElevenLabs] Step 1: Determining segmentation strategy using smart three-level analysis`);
        const segmentationMetadata = await voiceCloningSegmentationService.determineElevenLabsSegmentation(userId);
        
        console.log(`[MVP2ElevenLabs] Segmentation strategy determined: ${segmentationMetadata.segmentationType}`);
        console.log(`[MVP2ElevenLabs] Target items: ${segmentationMetadata.targetItems.join(', ')}`);
        console.log(`[MVP2ElevenLabs] ElevenLabs API calls planned: ${segmentationMetadata.elevenLabsCalls.length}`);

        // Step 2: Execute ElevenLabs API calls based on segmentation
        console.log(`[MVP2ElevenLabs] Step 2: Executing ${segmentationMetadata.elevenLabsCalls.length} ElevenLabs API calls`);
        const voicesCreated = [];

        for (const apiCall of segmentationMetadata.elevenLabsCalls) {
          console.log(`[MVP2ElevenLabs] Processing ${apiCall.type} voice creation with ${apiCall.audioUrls.length} audio samples`);
          
          try {
            const voiceResult = await this.createSpecializedVoice(apiCall, userId);
            
            if (voiceResult.success) {
              voicesCreated.push({
                type: apiCall.type,
                voiceId: voiceResult.voiceId,
                items: apiCall.items,
                metadata: apiCall.metadata
              });
              
              // Store narrator voice ID in dual-table storage (MVP1/MVP2 compatibility)
              await this.storeMVP2NarratorVoiceInBothTables(
                userId, 
                voiceResult.voiceId, 
                apiCall.items,
                apiCall.type
              );
              
              console.log(`[MVP2ElevenLabs] Successfully created ${apiCall.type} voice: ${voiceResult.voiceId}`);
            } else {
              console.error(`[MVP2ElevenLabs] Failed to create ${apiCall.type} voice:`, voiceResult.error);
            }
          } catch (error) {
            console.error(`[MVP2ElevenLabs] Error during ${apiCall.type} voice creation:`, error);
          }
        }

        // Step 3: Apply ESM item-level locking
        console.log(`[MVP2ElevenLabs] Step 3: Applying ESM item-level locking for cost control`);
        let lockingApplied = false;
        
        if (voicesCreated.length > 0) {
          try {
            await voiceCloningSegmentationService.applyEsmItemLocking(userId, segmentationMetadata.lockingPlan);
            lockingApplied = true;
            console.log(`[MVP2ElevenLabs] ESM item-level locking applied successfully`);
          } catch (error) {
            console.error(`[MVP2ElevenLabs] Failed to apply ESM item-level locking:`, error);
          }
        }

        clearTimeout(timeout);

        const result: MVP2VoiceGenerationResult = {
          success: voicesCreated.length > 0,
          voicesCreated,
          lockingApplied,
          segmentationUsed: segmentationMetadata.segmentationType,
          error: voicesCreated.length === 0 ? 'No voices were successfully created' : undefined
        };

        console.log(`[MVP2ElevenLabs] ===== MVP2 VOICE GENERATION COMPLETE ===== Created ${voicesCreated.length} specialized voices`);
        resolve(result);

      } catch (error) {
        clearTimeout(timeout);
        console.error(`[MVP2ElevenLabs] ========================== CRITICAL MVP2 ERROR ==========================`);
        console.error(`[MVP2ElevenLabs] MVP2 voice generation failed for user ${userId}`);
        console.error(`[MVP2ElevenLabs] Error details: ${error instanceof Error ? error.message : String(error)}`);
        
        resolve({
          success: false,
          voicesCreated: [],
          lockingApplied: false,
          segmentationUsed: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  /**
   * Create specialized voice using ElevenLabs API with existing provider patterns
   */
  private async createSpecializedVoice(apiCall: any, userId: string): Promise<{ success: boolean; voiceId?: string; error?: string }> {
    try {
      // Use existing voice provider registry for consistency
      const { VoiceProviderRegistry } = await import('./voice-providers/provider-manager');
      const voiceProvider = VoiceProviderRegistry.getModule();
      
      if (!voiceProvider) {
        return {
          success: false,
          error: 'No voice provider available'
        };
      }

      // Convert API call to ElevenLabs format
      const voiceSamples = apiCall.audioUrls.map((url: string, index: number) => ({
        emotion: apiCall.items[index] || `${apiCall.type}_sample_${index}`,
        audioUrl: url,
        isLocked: false,
        recordingId: apiCall.recordingIds?.[index] // Include recordingId for cleanup on failure
      }));

      console.log(`[MVP2ElevenLabs] Creating ${apiCall.type} voice with ${voiceSamples.length} samples`);
      
      // Create proper VoiceTrainingRequest object
      const voiceTrainingRequest = {
        userId: userId,
        samples: voiceSamples,
        metadata: apiCall.metadata
      };
      
      // IMPORTANT: We always create new narrator voices without checking existing ones
      // This is intentional because:
      // 1. Database may have stale voice IDs that no longer exist in ElevenLabs
      // 2. User wants fresh voice generation every time to capture latest recordings
      // 3. Simplifies error handling - no need to handle missing voice scenarios
      // 4. User can manage voice cleanup manually in ElevenLabs dashboard
      console.log(`[MVP2ElevenLabs] Creating new narrator voice for ${apiCall.type}`);
      
      // Create new voice
      const result = await voiceProvider.trainVoice(voiceTrainingRequest);
      
      if (result.success) {
        return {
          success: true,
          voiceId: result.voiceId
        };
      } else {
        return {
          success: false,
          error: result.error || 'Voice creation failed'
        };
      }

    } catch (error) {
      console.error(`[MVP2ElevenLabs] Error in createSpecializedVoice:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get user's existing narrator voice ID if available
   */
  private async getUserExistingNarratorVoice(userId: string, voiceType: string): Promise<string | null> {
    try {
      // For MVP1/category voices, check if user already has a narrator voice
      const userEsmRecords = await storage.getUserEsmRecordings(userId);
      
      // Find any existing narrator voice ID
      const existingVoice = userEsmRecords.find(record => record.narrator_voice_id);
      
      if (existingVoice?.narrator_voice_id) {
        console.log(`[MVP2ElevenLabs] Found existing narrator voice for user: ${existingVoice.narrator_voice_id}`);
        return existingVoice.narrator_voice_id;
      }
      
      return null;
    } catch (error) {
      console.error(`[MVP2ElevenLabs] Error checking existing narrator voice:`, error);
      return null;
    }
  }

  /**
   * Store MVP2 narrator voice ID in both ESM tables for compatibility
   * Follows existing dual-table storage pattern
   */
  private async storeMVP2NarratorVoiceInBothTables(
    userId: string, 
    narratorVoiceId: string, 
    items: string[], 
    voiceType: string
  ): Promise<void> {
    console.log(`[MVP2ElevenLabs] Storing MVP2 narrator voice in dual-table storage`);
    console.log(`[MVP2ElevenLabs] Voice ID: ${narratorVoiceId}, Type: ${voiceType}, Items: ${items.join(', ')}`);

    try {
      // Get all ESM recordings for the user to identify which ones to update
      const esmRecordings = await storage.getUserEsmRecordings(userId);
      
      // Update user_esm table with narrator voice ID (for specific items)
      for (const item of items) {
        const matchingRecordings = esmRecordings.filter(recording => 
          recording.name === item || item.includes(recording.name)
        );
        
        for (const recording of matchingRecordings) {
          try {
            await storage.updateUserEsm(recording.user_esm_id, {
              narrator_voice_id: narratorVoiceId
            });
            
            console.log(`[MVP2ElevenLabs] Updated user_esm record ${recording.user_esm_id} with narrator voice ${narratorVoiceId}`);
          } catch (error) {
            console.error(`[MVP2ElevenLabs] Failed to update user_esm record ${recording.user_esm_id}:`, error);
          }
        }
      }

      // Update user_esm_recordings table with narrator voice ID
      for (const item of items) {
        const matchingRecordings = esmRecordings.filter(recording => 
          recording.name === item || item.includes(recording.name)
        );
        
        for (const recording of matchingRecordings) {
          try {
            await storage.updateUserEsmRecording(recording.id, {
              narrator_voice_id: narratorVoiceId
            });
            
            console.log(`[MVP2ElevenLabs] Updated user_esm_recordings record ${recording.id} with narrator voice ${narratorVoiceId}`);
          } catch (error) {
            console.error(`[MVP2ElevenLabs] Failed to update user_esm_recordings record ${recording.id}:`, error);
          }
        }
      }

      console.log(`[MVP2ElevenLabs] Dual-table storage completed for ${voiceType} voice`);
      
      // STRATEGIC UPDATE: Clear all narrations when new voice is generated
      try {
        console.log(`[MVP2ElevenLabs] Strategic cache clearing - removing all old narrations...`);
        
        // Delete all existing narrations from database
        const narrations = await storage.getUserNarrations(userId);
        for (const narration of narrations) {
          await storage.deleteNarration(narration.id);
        }
        console.log(`[MVP2ElevenLabs] Deleted ${narrations.length} narrations from database`);
        
        // Clear audio files since they use old voice
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const userAudioDir = path.join(process.cwd(), 'stories', 'audio', 'private', userId);
        await fs.rm(userAudioDir, { recursive: true, force: true });
        console.log(`[MVP2ElevenLabs] Cleared audio files - will regenerate with new voice`);
        
        console.log(`[MVP2ElevenLabs] Strategic update completed - ESM tables are single source of truth`);
      } catch (error) {
        console.error(`[MVP2ElevenLabs] Failed to clear narrations:`, error);
        // Don't throw - voice generation succeeded, clearing is secondary
      }
      
    } catch (error) {
      console.error(`[MVP2ElevenLabs] Failed to store MVP2 narrator voice in dual-table storage:`, error);
      throw error;
    }
  }

  /**
   * Clear all story narrations for a user when new voice is generated
   */
  private async clearUserStoryNarrations(userId: string): Promise<void> {
    try {
      // Delete all saved narrations from database - ESM is single source of truth
      await storage.deleteAllUserNarrations(userId);
      console.log(`[MVP2ElevenLabs] Deleted all narrations from database for user ${userId}`);
      
      // Also delete audio files to ensure complete cleanup
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const userAudioDir = path.join(process.cwd(), 'stories', 'audio', 'private', userId);
      try {
        await fs.rm(userAudioDir, { recursive: true, force: true });
        console.log(`[MVP2ElevenLabs] Deleted audio directory for user ${userId}`);
      } catch (error) {
        // Directory might not exist, that's fine
        console.log(`[MVP2ElevenLabs] Audio directory not found for user ${userId} - skipping`);
      }
      
    } catch (error) {
      console.error(`[MVP2ElevenLabs] Error clearing story narrations:`, error);
      throw error;
    }
  }

  /**
   * Check if user has sufficient samples for MVP2 voice generation
   */
  async shouldTriggerMVP2Training(userId: string): Promise<boolean> {
    try {
      const segmentationMetadata = await voiceCloningSegmentationService.determineElevenLabsSegmentation(userId);
      return segmentationMetadata.elevenLabsCalls.length > 0;
    } catch (error) {
      console.error(`[MVP2ElevenLabs] Error checking MVP2 training trigger:`, error);
      return false;
    }
  }
}

export const elevenLabsVoiceCloning = new ElevenLabsVoiceCloning();