/**
 * Voice Cloning Timeout Service
 * Implements proper timeout and retry mechanisms for all voice cloning operations
 * NO INFINITE LOOPS - All operations have bounded execution time
 */

import { VOICE_CLONING_CONFIG } from '@shared/voice-config';

export interface VoiceCloningOperation {
  userId: string;
  category: 'emotions' | 'sounds' | 'modulations';
  startTime: Date;
  timeoutId: NodeJS.Timeout;
  retryCount: number;
  maxRetries: number;
  timeoutMinutes: number;
}

export class VoiceCloningTimeoutService {
  private static activeOperations = new Map<string, VoiceCloningOperation>();

  /**
   * Start a voice cloning operation with guaranteed timeout
   */
  static async startVoiceCloning(
    userId: string, 
    category: 'emotions' | 'sounds' | 'modulations'
  ): Promise<{ success: boolean; voiceId?: string; error?: string }> {
    
    const operationKey = `${userId}-${category}`;
    
    // Check if operation already running
    if (this.activeOperations.has(operationKey)) {
      return { success: false, error: 'Voice cloning already in progress for this category' };
    }

    const maxRetries = VOICE_CLONING_CONFIG.training.maxRetries;
    const timeoutMinutes = VOICE_CLONING_CONFIG.training.timeoutMinutes;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    console.log(`🎯 Starting voice cloning: ${userId} ${category} (timeout: ${timeoutMinutes}min, retries: ${maxRetries})`);

    return new Promise((resolve) => {
      // Create timeout that GUARANTEES operation completion
      const timeoutId = setTimeout(() => {
        console.log(`⏰ TIMEOUT: Voice cloning exceeded ${timeoutMinutes} minutes for ${userId} ${category}`);
        this.completeOperation(operationKey, false, 'Timeout exceeded');
        resolve({ success: false, error: `Voice cloning timeout after ${timeoutMinutes} minutes` });
      }, timeoutMs);

      // Store operation for tracking
      const operation: VoiceCloningOperation = {
        userId,
        category,
        startTime: new Date(),
        timeoutId,
        retryCount: 0,
        maxRetries,
        timeoutMinutes
      };

      this.activeOperations.set(operationKey, operation);

      // Start the actual voice cloning with retry logic
      this.executeWithRetries(operationKey, operation)
        .then((result) => {
          clearTimeout(timeoutId);
          this.completeOperation(operationKey, result.success, result.error);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          this.completeOperation(operationKey, false, error.message);
          resolve({ success: false, error: error.message });
        });
    });
  }

  /**
   * Execute voice cloning with exponential backoff retry
   * EXACTLY 3 retry attempts with configured timeouts and delays
   */
  private static async executeWithRetries(
    operationKey: string, 
    operation: VoiceCloningOperation
  ): Promise<{ success: boolean; voiceId?: string; error?: string }> {
    
    const { userId, category } = operation;
    const { timeouts } = VOICE_CLONING_CONFIG;

    // EXACTLY 3 retry attempts before throwing exception
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`🔄 Voice cloning attempt ${attempt + 1}/3 for ${userId} ${category}`);

        // Import voice training service dynamically
        const { voiceTrainingService } = await import('./voice-training-service');
        
        // Get user voice samples using current ESM data structure
        const { storage } = await import('./storage');
        const userVoiceSamples = await storage.getUserVoiceSamples(userId);
        
        // Filter samples based on category and convert to training format
        const relevantSamples = userVoiceSamples
          .filter(sample => {
            const label = sample.label.toLowerCase();
            if (category === 'emotions') return label.startsWith('emotions-');
            if (category === 'sounds') return label.startsWith('sounds-');
            if (category === 'modulations') return label.startsWith('modulations-');
            return false;
          })
          .map(sample => ({
            emotion: sample.label,
            audioUrl: sample.audioUrl,
            isLocked: false
          }));

        console.log(`🎯 Found ${relevantSamples.length} ${category} samples for user ${userId}`);

        if (relevantSamples.length === 0) {
          throw new Error(`No ${category} samples found for voice cloning`);
        }

        // Execute voice training with 60-second timeout per attempt using voice provider factory
        const { VoiceProviderFactory } = await import('./voice-providers/voice-provider-factory');
        const activeProvider = await VoiceProviderFactory.getActiveProvider();
        const provider = await VoiceProviderFactory.getModule(activeProvider);
        
        const trainingRequest = {
          userId,
          voiceProfileId: 1, // Use default voice profile
          samples: relevantSamples
        };

        const result = await this.executeWithTimeout(
          () => provider.trainVoice(trainingRequest),
          timeouts.mainThreadSeconds * 1000 // 60 seconds per attempt
        );

        if (result.success && result.voiceId) {
          console.log(`✅ Voice cloning SUCCESS on attempt ${attempt + 1} for ${userId} ${category}, voiceId: ${result.voiceId}`);
          return { success: true, voiceId: result.voiceId };
        } else if (result.success && !result.voiceId) {
          console.log(`⚠️ Voice cloning returned success but no voiceId on attempt ${attempt + 1} for ${userId} ${category}`);
          throw new Error('Voice training succeeded but no voiceId returned');
        } else {
          console.log(`❌ Voice cloning failed on attempt ${attempt + 1} for ${userId} ${category}: ${result.error}`);
          throw new Error(result.error || 'Voice training failed');
        }

      } catch (error) {
        console.log(`❌ Voice cloning attempt ${attempt + 1} failed for ${userId} ${category}:`, error);
        
        // If last attempt, return error
        if (attempt === 2) { // Last attempt (0, 1, 2)
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
        
        // Wait before retry if not last attempt
        if (attempt < 2) {
          const delayMs = timeouts.retryDelayMs[attempt];
          console.log(`⏳ Retrying in ${delayMs}ms after error for ${userId} ${category}`);
          await this.delay(delayMs);
        }
      }
    }

    return { success: false, error: 'Failed after exactly 3 attempts' };
  }

  /**
   * Execute function with timeout wrapper
   */
  private static async executeWithTimeout<T>(
    fn: () => Promise<T>, 
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Complete operation and clean up with proper state reset
   */
  private static async completeOperation(
    operationKey: string, 
    success: boolean, 
    error?: string
  ): Promise<void> {
    const operation = this.activeOperations.get(operationKey);
    
    if (operation) {
      const duration = Date.now() - operation.startTime.getTime();
      console.log(`🏁 Voice cloning completed: ${operation.userId} ${operation.category} ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);
      
      // CRITICAL: Reset database state on failure/timeout
      if (!success) {
        // Use centralized external integration state reset
        const { externalIntegrationStateReset } = await import('./external-integration-state-reset');
        await externalIntegrationStateReset.resetIntegrationState({
          userId: operation.userId,
          provider: 'elevenlabs',
          operationType: 'voice_training',
          error: error || 'Voice cloning operation failed',
          timeoutDuration: operation.timeoutMinutes * 60 * 1000
        });
      }
      
      // Clear timeout and remove from active operations
      clearTimeout(operation.timeoutId);
      this.activeOperations.delete(operationKey);

      // Notify session manager of completion
      this.notifyCompletion(operation.userId, operation.category, success);
    }
  }

  /**
   * Notify session manager of completion (async to avoid blocking)
   */
  private static notifyCompletion(
    userId: string, 
    category: 'emotions' | 'sounds' | 'modulations', 
    success: boolean
  ): void {
    setTimeout(async () => {
      try {
        const { VoiceCloningSessionManager } = await import('./voice-cloning-session-manager');
        VoiceCloningSessionManager.completeCategoryCloning(userId, category, success);
      } catch (error) {
        console.error('Error notifying session manager:', error);
      }
    }, 0);
  }



  /**
   * Utility delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if operation is currently running
   */
  static isOperationRunning(userId: string, category: 'emotions' | 'sounds' | 'modulations'): boolean {
    const operationKey = `${userId}-${category}`;
    return this.activeOperations.has(operationKey);
  }

  /**
   * Get active operations count (for monitoring)
   */
  static getActiveOperationsCount(): number {
    return this.activeOperations.size;
  }

  /**
   * Force stop operation (emergency)
   */
  static forceStopOperation(userId: string, category: 'emotions' | 'sounds' | 'modulations'): boolean {
    const operationKey = `${userId}-${category}`;
    const operation = this.activeOperations.get(operationKey);
    
    if (operation) {
      console.log(`🛑 FORCE STOP: Voice cloning operation ${operationKey}`);
      this.completeOperation(operationKey, false, 'Force stopped');
      return true;
    }
    
    return false;
  }

  /**
   * Clear all stuck operations for a user (emergency reset)
   */
  static forceStopAllUserOperations(userId: string): number {
    const categories: ('emotions' | 'sounds' | 'modulations')[] = ['emotions', 'sounds', 'modulations'];
    let stopped = 0;
    
    for (const category of categories) {
      if (this.forceStopOperation(userId, category)) {
        stopped++;
      }
    }
    
    if (stopped > 0) {
      console.log(`🧹 EMERGENCY RESET: Stopped ${stopped} stuck voice cloning operations for user ${userId}`);
    }
    
    return stopped;
  }
}