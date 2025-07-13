/**
 * Twilio SMS Provider Implementation
 */

import twilio from 'twilio';
import { BaseSMSProvider } from './base-sms-provider';
import { SMSProviderCapabilities, SMSProviderConfig, SMSMessage, SMSSendResult, SMSProviderStatus } from './sms-provider-interface';

export class TwilioSMSProvider extends BaseSMSProvider {
  private client: twilio.Twilio | null = null;
  private fromNumber: string | null = null;

  constructor(config: SMSProviderConfig) {
    super('twilio', config);
  }

  get name(): string {
    return 'Twilio SMS';
  }

  get version(): string {
    return '1.0.0';
  }

  get capabilities(): SMSProviderCapabilities {
    return {
      maxMessageLength: 1600, // Twilio's SMS limit
      supportsMMS: true,
      supportsInternational: true,
      supportsBulkSending: true,
      supportsStatusCallbacks: true
    };
  }

  protected async performInitialization(): Promise<void> {
    const accountSid = this.config.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = this.config.authToken || process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = this.config.fromNumber || process.env.TWILIO_PHONE_NUMBER || null;

    if (!accountSid || !authToken || !this.fromNumber) {
      throw new Error('Twilio SMS provider requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER');
    }

    try {
      this.client = twilio(accountSid, authToken);
      // Test the connection by fetching account info
      await this.client.api.accounts(accountSid).fetch();
      this.log('info', 'Twilio SMS provider initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize Twilio client:', error);
      throw error;
    }
  }

  protected async performHealthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Try to fetch the phone number to verify it exists
      if (this.fromNumber) {
        const phoneNumbers = await this.client.incomingPhoneNumbers.list({ phoneNumber: this.fromNumber, limit: 1 });
        return phoneNumbers.length > 0;
      }
      return false;
    } catch (error) {
      this.log('error', 'Health check failed:', error);
      return false;
    }
  }

  protected async performSendSMS(message: SMSMessage): Promise<SMSSendResult> {
    if (!this.client || !this.fromNumber) {
      return {
        success: false,
        error: 'Twilio client not initialized'
      };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(message.to);
      
      const twilioMessage = await this.client.messages.create({
        body: message.message,
        from: this.fromNumber,
        to: formattedPhone,
        ...(message.mediaUrl && { mediaUrl: [message.mediaUrl] }),
        ...(message.callbackUrl && { statusCallback: message.callbackUrl })
      });

      this.log('info', `SMS sent to ${formattedPhone}. SID: ${twilioMessage.sid}`);
      
      return {
        success: true,
        messageId: twilioMessage.sid,
        status: twilioMessage.status,
        cost: twilioMessage.price ? parseFloat(twilioMessage.price) : undefined
      };
    } catch (error) {
      const err = error as any;
      this.log('error', 'SMS send error:', error);
      return {
        success: false,
        error: err.message || 'Unknown Twilio error'
      };
    }
  }

  async getStatus(): Promise<SMSProviderStatus> {
    const configured = !!(this.client && this.fromNumber);
    const healthy = configured ? await this.isHealthy() : false;

    return {
      configured,
      healthy,
      activeNumbers: this.fromNumber ? [this.fromNumber] : [],
      remainingCredits: undefined // Twilio doesn't provide credit info via API
    };
  }

  async getDeliveryStatus(messageId: string): Promise<SMSSendResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'Twilio client not initialized'
      };
    }

    try {
      const message = await this.client.messages(messageId).fetch();
      
      return {
        success: message.status === 'delivered',
        messageId: message.sid,
        status: message.status,
        error: message.errorMessage || undefined
      };
    } catch (error) {
      const err = error as any;
      return {
        success: false,
        error: err.message || 'Failed to fetch message status'
      };
    }
  }

  protected isRetryableError(error: Error): boolean {
    // Check for common retryable Twilio errors
    const message = error.message.toLowerCase();
    if (message.includes('network') || 
        message.includes('timeout') ||
        message.includes('temporarily unavailable')) {
      return true;
    }
    
    // Call parent implementation for common network errors
    return super.isRetryableError(error);
  }
}