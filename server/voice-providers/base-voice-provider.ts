/**
 * Abstract Base Voice Provider - Common Interface for All Voice Providers
 * Follows the same pattern as video providers for consistency
 */

import { VoiceProviderConfig, VoiceTrainingRequest, VoiceTrainingResult, VoiceModule } from './provider-manager';

export abstract class BaseVoiceProvider implements VoiceModule {
  protected config: VoiceProviderConfig;
  protected providerName: string;

  constructor(config: VoiceProviderConfig, providerName: string) {
    this.config = config;
    this.providerName = providerName;
    this.validateConfig(config);
  }

  /**
   * Validate provider configuration - must be implemented by each provider
   */
  protected abstract validateConfig(config: VoiceProviderConfig): void;

  /**
   * Train voice using provider-specific API - must be implemented by each provider
   */
  abstract trainVoice(request: VoiceTrainingRequest): Promise<VoiceTrainingResult>;

  /**
   * Generate speech using trained voice - must be implemented by each provider
   */
  abstract generateSpeech(text: string, voiceId: string, emotion?: string): Promise<ArrayBuffer>;

  /**
   * Check status of voice training/availability - must be implemented by each provider
   */
  abstract getVoiceStatus(voiceId: string): Promise<{ status: string; ready: boolean }>;

  /**
   * Common logging method with provider context
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logPrefix = `[${this.providerName}] ${timestamp}`;
    
    switch (level) {
      case 'info':
        console.log(`${logPrefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${logPrefix} WARNING: ${message}`, data || '');
        break;
      case 'error':
        console.error(`${logPrefix} ERROR: ${message}`, data || '');
        break;
    }
  }

  /**
   * Common timeout wrapper for provider operations
   */
  protected async withTimeout<T>(
    operation: Promise<T>, 
    timeoutMs: number = this.config.timeout,
    operationName: string = 'operation'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${this.providerName} ${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation, timeoutPromise]);
    } catch (error) {
      this.log('error', `${operationName} failed`, error);
      throw error;
    }
  }

  /**
   * Common retry logic for provider operations
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retryCount,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log('info', `${operationName} attempt ${attempt}/${maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.log('warn', `${operationName} attempt ${attempt} failed: ${lastError.message}`);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s delays
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          this.log('info', `Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    this.log('error', `${operationName} failed after ${maxRetries} attempts`);
    throw lastError!;
  }

  /**
   * Common audio file validation
   */
  protected validateAudioFile(audioBuffer: Buffer, fileName: string): void {
    if (audioBuffer.length === 0) {
      throw new Error(`Empty audio file: ${fileName}`);
    }
    
    if (audioBuffer.length < 1000) {
      this.log('warn', `Very small audio file detected: ${fileName} (${audioBuffer.length} bytes)`);
    }
    
    // Check duration limits if specified
    if (this.config.maxSampleDurationMs > 0) {
      // Note: Actual duration check would require audio analysis library
      // For now, we estimate based on file size (rough approximation)
      const estimatedDurationMs = (audioBuffer.length / 1000) * 10; // Very rough estimate
      if (estimatedDurationMs > this.config.maxSampleDurationMs) {
        throw new Error(`Audio file too long: ${fileName} (estimated ${estimatedDurationMs}ms, max ${this.config.maxSampleDurationMs}ms)`);
      }
    }
  }

  /**
   * Common voice training result validation
   */
  protected createSuccessResult(
    voiceId: string, 
    samplesProcessed: number, 
    metadata?: any
  ): VoiceTrainingResult {
    return {
      success: true,
      voiceId,
      samplesProcessed,
      metadata: {
        provider: this.providerName,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  /**
   * Common voice training error result
   */
  protected createErrorResult(
    error: string | Error, 
    samplesProcessed: number = 0
  ): VoiceTrainingResult {
    const errorMessage = error instanceof Error ? error.message : error;
    
    return {
      success: false,
      error: errorMessage,
      samplesProcessed,
      metadata: {
        provider: this.providerName,
        timestamp: new Date().toISOString(),
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    };
  }

  /**
   * Common configuration getter
   */
  public getConfig(): VoiceProviderConfig {
    return { ...this.config }; // Return copy to prevent modification
  }

  /**
   * Common provider name getter
   */
  public getProviderName(): string {
    return this.providerName;
  }

  /**
   * Health check for provider availability
   */
  public async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    try {
      // Basic configuration check
      this.validateConfig(this.config);
      
      // Provider-specific health check can be overridden
      await this.performHealthCheck();
      
      return {
        healthy: true,
        message: `${this.providerName} provider is healthy`
      };
    } catch (error) {
      return {
        healthy: false,
        message: `${this.providerName} provider health check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Provider-specific health check - can be overridden
   */
  protected async performHealthCheck(): Promise<void> {
    // Default implementation - providers can override for API-specific checks
    if (!this.config.apiKey) {
      throw new Error('API key not configured');
    }
  }
}