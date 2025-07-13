/**
 * Base SMS Provider following the same pattern as BaseEmailProvider
 * All SMS providers should extend this class
 */

import { ISMSProvider, SMSProviderCapabilities, SMSProviderConfig, SMSMessage, SMSSendResult, SMSProviderStatus } from './sms-provider-interface';

export abstract class BaseSMSProvider implements ISMSProvider {
  protected config: SMSProviderConfig;
  protected providerName: string;
  protected initialized: boolean = false;
  protected lastHealthCheck: Date = new Date(0);
  protected healthCheckInterval: number = 5 * 60 * 1000; // 5 minutes
  
  // Default timeout values
  protected defaultTimeout = 30000; // 30 seconds
  protected defaultMaxRetries = 3;
  protected defaultRetryDelay = 1000; // 1 second

  constructor(name: string, config: SMSProviderConfig) {
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
  abstract get capabilities(): SMSProviderCapabilities;

  /**
   * Initialize the provider
   */
  async initialize(config: SMSProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.performInitialization();
    this.initialized = true;
    this.log('info', 'SMS provider initialized');
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
      this.log('error', 'Health check failed:', error);
      return false;
    }
  }

  /**
   * Provider-specific health check
   */
  protected abstract performHealthCheck(): Promise<boolean>;

  /**
   * Send SMS with retry logic for network failures
   */
  async sendSMS(message: SMSMessage): Promise<SMSSendResult> {
    if (!this.initialized) {
      throw new Error(`${this.providerName} provider not initialized`);
    }

    let lastError: Error | null = null;
    const maxRetries = this.config.retryCount || this.defaultMaxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Validate message
        const validationError = this.validateMessage(message);
        if (validationError) {
          return {
            success: false,
            error: validationError
          };
        }

        // Send SMS
        const result = await this.performSendSMS(message);
        
        if (result.success) {
          this.log('info', `SMS sent successfully to ${message.to}`, { messageId: result.messageId });
        }
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        this.log('warn', `SMS send attempt ${attempt + 1} failed:`, error);
        
        // Check if error is retryable
        if (!this.isRetryableError(error as Error) || attempt === maxRetries) {
          break;
        }
        
        // Wait before retry with exponential backoff
        const delay = this.defaultRetryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    return {
      success: false,
      error: lastError?.message || 'Unknown error occurred'
    };
  }

  /**
   * Validate SMS message
   */
  protected validateMessage(message: SMSMessage): string | null {
    if (!message.to || !message.message) {
      return 'Missing required fields: to and message';
    }

    if (message.message.length > this.capabilities.maxMessageLength) {
      return `Message exceeds maximum length of ${this.capabilities.maxMessageLength} characters`;
    }

    return null;
  }

  /**
   * Check if error is retryable
   */
  protected isRetryableError(error: Error): boolean {
    // Network errors are retryable
    if (error.message.includes('ECONNREFUSED') || 
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')) {
      return true;
    }
    
    // Provider-specific retry logic can be implemented in subclasses
    return false;
  }

  /**
   * Provider-specific SMS sending
   */
  protected abstract performSendSMS(message: SMSMessage): Promise<SMSSendResult>;

  /**
   * Get provider status
   */
  abstract getStatus(): Promise<SMSProviderStatus>;

  /**
   * Format phone number (can be overridden by providers)
   */
  protected formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Add country code if missing (default to US +1)
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // Return as-is if already formatted or international
    return phone.startsWith('+') ? phone : `+${digits}`;
  }
}