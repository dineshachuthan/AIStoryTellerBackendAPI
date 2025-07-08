/**
 * Base Email Provider following the same pattern as BaseVoiceProvider
 * All email providers should extend this class
 */

import { IEmailProvider, EmailProviderCapabilities, EmailProviderConfig, EmailMessage, EmailSendResult, EmailStatusResponse } from './email-provider-interface';

export abstract class BaseEmailProvider implements IEmailProvider {
  protected config: EmailProviderConfig;
  protected providerName: string;
  protected initialized: boolean = false;
  protected lastHealthCheck: Date = new Date(0);
  protected healthCheckInterval: number = 5 * 60 * 1000; // 5 minutes
  
  // Default timeout values
  protected defaultTimeout = 30000; // 30 seconds
  protected defaultMaxRetries = 3;
  protected defaultRetryDelay = 1000; // 1 second

  constructor(name: string, config: EmailProviderConfig) {
    this.providerName = name;
    this.config = {
      ...config,
      timeout: config.timeout || this.defaultTimeout,
      retryCount: config.retryCount || this.defaultMaxRetries,
    };
  }

  /**
   * Log messages with provider context
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.providerName}]`;
    
    switch (level) {
      case 'info':
        console.log(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'error':
        console.error(prefix, message, data || '');
        break;
    }
  }

  abstract get name(): string;
  abstract get version(): string;
  abstract get capabilities(): EmailProviderCapabilities;

  /**
   * Initialize the provider
   */
  async initialize(config: EmailProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.performInitialization();
    this.initialized = true;
    console.log(`[${new Date().toISOString()}] ${this.providerName} email provider initialized`);
  }

  /**
   * Provider-specific initialization
   */
  protected abstract performInitialization(): Promise<void>;

  /**
   * Check if provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Check if we need to perform health check
      const now = new Date();
      if (now.getTime() - this.lastHealthCheck.getTime() < this.healthCheckInterval) {
        return true; // Assume healthy if recently checked
      }

      const result = await this.performHealthCheck();
      this.lastHealthCheck = now;
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ${this.providerName} health check failed:`, error);
      return false;
    }
  }

  /**
   * Provider-specific health check
   */
  protected abstract performHealthCheck(): Promise<boolean>;

  /**
   * Send email with retry logic for network failures
   */
  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.initialized) {
      throw new Error(`${this.providerName} provider not initialized`);
    }

    return this.executeWithRetry(
      () => this.performSendEmail(message),
      'sendEmail'
    );
  }

  /**
   * Provider-specific email sending
   */
  protected abstract performSendEmail(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Send SMS if supported
   */
  async sendSMS?(phoneNumber: string, message: string): Promise<EmailSendResult> {
    if (!this.capabilities.supportsSMS) {
      throw new Error(`${this.providerName} provider does not support SMS`);
    }

    return this.executeWithRetry(
      () => this.performSendSMS!(phoneNumber, message),
      'sendSMS'
    );
  }

  /**
   * Provider-specific SMS sending
   */
  protected performSendSMS?(phoneNumber: string, message: string): Promise<EmailSendResult>;

  /**
   * Check message status if supported
   */
  async checkStatus?(messageId: string): Promise<EmailStatusResponse> {
    if (!this.initialized) {
      throw new Error(`${this.providerName} provider not initialized`);
    }

    return this.executeWithRetry(
      () => this.performCheckStatus!(messageId),
      'checkStatus'
    );
  }

  /**
   * Provider-specific status checking
   */
  protected performCheckStatus?(messageId: string): Promise<EmailStatusResponse>;

  /**
   * Execute operation with retry logic for network failures
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retryCount!; attempt++) {
      try {
        // Execute with timeout
        return await this.executeWithTimeout(operation, operationName);
      } catch (error) {
        lastError = error as Error;
        
        // Only retry on network errors
        if (!this.isNetworkError(error)) {
          throw error;
        }

        console.log(
          `[${new Date().toISOString()}] ${this.providerName} ${operationName} attempt ${attempt} failed with network error:`,
          lastError.message
        );

        // Don't retry if this was the last attempt
        if (attempt === this.config.retryCount) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = this.defaultRetryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    throw new Error(
      `${this.providerName} ${operationName} failed after ${this.config.retryCount} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Execute operation with timeout
   */
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${this.providerName} ${operationName} timed out after ${this.config.timeout}ms`));
      }, this.config.timeout!);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  /**
   * Check if error is a network error that should be retried
   */
  protected isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';
    
    // Common network error patterns
    const networkErrors = [
      'econnrefused',
      'econnreset',
      'etimedout',
      'enotfound',
      'enetunreach',
      'econnaborted',
      'timeout',
      'network',
      'fetch failed',
      'socket hang up'
    ];
    
    return networkErrors.some(pattern => 
      errorMessage.includes(pattern) || errorCode.includes(pattern)
    );
  }

  /**
   * Sleep utility for retry delays
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate configuration
   */
  protected validateConfig(config: EmailProviderConfig): void {
    if (!config.apiKey) {
      throw new Error(`${this.providerName} provider requires apiKey`);
    }

    // Provider-specific validation can be added in subclasses
  }

  /**
   * Common error result
   */
  protected createErrorResult(error: string | Error): EmailSendResult {
    const errorMessage = error instanceof Error ? error.message : error;
    
    return {
      success: false,
      error: errorMessage,
      provider: this.providerName,
      timestamp: new Date(),
      metadata: {
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    };
  }

  /**
   * Common success result
   */
  protected createSuccessResult(messageId: string, metadata?: Record<string, any>): EmailSendResult {
    return {
      success: true,
      messageId,
      provider: this.providerName,
      timestamp: new Date(),
      metadata
    };
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<{
    provider: string;
    initialized: boolean;
    healthy: boolean;
    lastHealthCheck: Date;
    capabilities: EmailProviderCapabilities;
  }> {
    return {
      provider: this.providerName,
      initialized: this.initialized,
      healthy: await this.isHealthy(),
      lastHealthCheck: this.lastHealthCheck,
      capabilities: this.capabilities
    };
  }

  /**
   * Check if provider is available (has required configuration)
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Check for required configuration
      if (!this.config.apiKey || !this.config.fromEmail) {
        return false;
      }
      
      // Provider-specific availability checks can be added in subclasses
      return true;
    } catch (error) {
      return false;
    }
  }
}