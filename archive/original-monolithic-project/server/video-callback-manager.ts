/**
 * Video Callback Manager - Handles callback-based video generation with 120s timeout
 * This replaces the inefficient polling system with webhook callbacks
 */

interface CallbackWaiter {
  taskId: string;
  resolve: (result: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
  createdAt: Date;
}

class VideoCallbackManager {
  private waitingCallbacks = new Map<string, CallbackWaiter>();

  /**
   * Wait for video completion via webhook callback
   * @param taskId The Kling task ID to wait for
   * @param timeoutMs Timeout in milliseconds (default 120 seconds)
   * @returns Promise that resolves when webhook received or rejects on timeout
   */
  async waitForCallback(taskId: string, timeoutMs: number = 120000): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(`🔔 Setting up callback waiter for task: ${taskId}, timeout: ${timeoutMs}ms`);
      
      // Set up timeout
      const timeout = setTimeout(() => {
        this.waitingCallbacks.delete(taskId);
        reject(new Error(
          `Video generation timed out after ${timeoutMs / 1000} seconds. ` +
          `This usually means the video is taking longer than expected to process. ` +
          `Please try again in a few minutes or contact support if this persists.`
        ));
      }, timeoutMs);
      
      // Store the waiter
      this.waitingCallbacks.set(taskId, {
        taskId,
        resolve,
        reject,
        timeout,
        createdAt: new Date()
      });
      
      console.log(`⏰ Callback waiter registered for ${taskId}. Will timeout in ${timeoutMs / 1000}s`);
    });
  }

  /**
   * Notify completion via webhook - called by webhook handler
   * @param taskId The task ID that completed
   * @param result The completion result from Kling
   */
  notifyCompletion(taskId: string, result: any): boolean {
    const waiter = this.waitingCallbacks.get(taskId);
    
    if (!waiter) {
      console.log(`⚠️ No waiter found for completed task: ${taskId}`);
      return false;
    }
    
    console.log(`✅ Notifying completion for task: ${taskId}`);
    
    // Clear timeout and remove from waiting list
    clearTimeout(waiter.timeout);
    this.waitingCallbacks.delete(taskId);
    
    // Resolve the promise
    waiter.resolve(result);
    return true;
  }

  /**
   * Notify failure via webhook - called by webhook handler
   * @param taskId The task ID that failed
   * @param error The error information from Kling
   */
  notifyFailure(taskId: string, error: any): boolean {
    const waiter = this.waitingCallbacks.get(taskId);
    
    if (!waiter) {
      console.log(`⚠️ No waiter found for failed task: ${taskId}`);
      return false;
    }
    
    console.log(`❌ Notifying failure for task: ${taskId}`);
    
    // Clear timeout and remove from waiting list
    clearTimeout(waiter.timeout);
    this.waitingCallbacks.delete(taskId);
    
    // Reject the promise
    waiter.reject(new Error(
      `Video generation failed: ${error?.message || 'Unknown error'}. ` +
      `Please try again or contact support if this persists.`
    ));
    return true;
  }

  /**
   * Get statistics about waiting callbacks
   */
  getStats(): { waiting: number; oldestWaitMinutes: number | null } {
    const now = new Date();
    let oldestWaitMinutes: number | null = null;
    
    if (this.waitingCallbacks.size > 0) {
      const oldestCreatedAt = Math.min(
        ...Array.from(this.waitingCallbacks.values()).map(w => w.createdAt.getTime())
      );
      oldestWaitMinutes = (now.getTime() - oldestCreatedAt) / (1000 * 60);
    }
    
    return {
      waiting: this.waitingCallbacks.size,
      oldestWaitMinutes
    };
  }

  /**
   * Clean up expired waiters (shouldn't happen if timeouts work correctly)
   */
  cleanup(): void {
    const now = new Date();
    const maxAge = 150000; // 2.5 minutes max age
    
    for (const [taskId, waiter] of this.waitingCallbacks.entries()) {
      const age = now.getTime() - waiter.createdAt.getTime();
      if (age > maxAge) {
        console.log(`🧹 Cleaning up expired waiter for task: ${taskId}`);
        clearTimeout(waiter.timeout);
        this.waitingCallbacks.delete(taskId);
      }
    }
  }
}

export const videoCallbackManager = new VideoCallbackManager();

// Cleanup expired waiters every 5 minutes
setInterval(() => {
  videoCallbackManager.cleanup();
}, 5 * 60 * 1000);