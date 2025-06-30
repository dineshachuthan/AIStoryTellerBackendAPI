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
  ): Promise<{ success: boolean; error?: string }> {
    
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
   */
  private static async executeWithRetries(
    operationKey: string, 
    operation: VoiceCloningOperation
  ): Promise<{ success: boolean; error?: string }> {
    
    const { userId, category, maxRetries } = operation;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Voice cloning attempt ${attempt + 1}/${maxRetries + 1} for ${userId} ${category}`);

        // Import voice training service dynamically
        const { voiceTrainingService } = await import('./voice-training-service');
        
        // Execute voice training with internal timeout
        const result = await this.executeWithTimeout(
          () => voiceTrainingService.triggerAutomaticTraining(userId),
          60000 // 1 minute per attempt
        );

        if (result.success) {
          console.log(`✅ Voice cloning SUCCESS on attempt ${attempt + 1} for ${userId} ${category}`);
          return { success: true };
        }

        // If not last attempt, wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
          console.log(`⏳ Retrying in ${delayMs}ms for ${userId} ${category}`);
          await this.delay(delayMs);
        }

      } catch (error) {
        console.log(`❌ Voice cloning attempt ${attempt + 1} failed for ${userId} ${category}:`, error);
        
        // If last attempt, return error
        if (attempt === maxRetries) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      }
    }

    return { success: false, error: `Failed after ${maxRetries + 1} attempts` };
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
   * Complete operation and clean up
   */
  private static completeOperation(
    operationKey: string, 
    success: boolean, 
    error?: string
  ): void {
    const operation = this.activeOperations.get(operationKey);
    
    if (operation) {
      const duration = Date.now() - operation.startTime.getTime();
      console.log(`🏁 Voice cloning completed: ${operation.userId} ${operation.category} ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);
      
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
}