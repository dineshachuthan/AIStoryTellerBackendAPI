/**
 * MessageBird SMS Provider Implementation
 */

import messagebird from 'messagebird';
import { BaseSMSProvider } from './base-sms-provider';
import { 
  SMSMessage, 
  SMSSendResult, 
  SMSProviderCapabilities, 
  SMSProviderConfig,
  SMSProviderStatus 
} from './sms-provider-interface';

export class MessageBirdSMSProvider extends BaseSMSProvider {
  private client: messagebird.MessageBird | null = null;
  private fromNumber: string | null = null;
  private whatsappChannelId: string | null = null;
  
  constructor(config: SMSProviderConfig) {
    super('MessageBird', config);
  }
  
  get name(): string {
    return 'messagebird';
  }
  
  get version(): string {
    return '1.0.0';
  }
  
  get capabilities(): SMSProviderCapabilities {
    return {
      maxMessageLength: 1600,
      supportsMMS: false,
      supportsInternational: true,
      supportsBulkSending: true,
      supportsStatusCallbacks: true,
      supportsWhatsApp: true
    };
  }
  
  protected async performInitialization(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('MessageBird API key is required');
    }
    
    this.client = messagebird(this.config.apiKey);
    this.fromNumber = this.config.fromNumber || null;
    this.whatsappChannelId = this.config.whatsappChannelId || null;
    
    this.log('info', 'MessageBird provider initialized', {
      hasFromNumber: !!this.fromNumber,
      hasWhatsAppChannel: !!this.whatsappChannelId
    });
  }
  
  protected async performHealthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    
    try {
      // Check balance as health check
      await new Promise((resolve, reject) => {
        this.client!.balance.read((err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      
      return true;
    } catch (error) {
      this.log('error', 'Health check failed:', error);
      return false;
    }
  }
  
  protected async performSendSMS(message: SMSMessage): Promise<SMSSendResult> {
    if (!this.client) {
      throw new Error('MessageBird client not initialized');
    }
    
    const channel = (message as any).channel || 'sms';
    
    try {
      if (channel === 'whatsapp') {
        return await this.sendWhatsApp(message);
      } else {
        return await this.sendSMS(message);
      }
    } catch (error: any) {
      this.log('error', 'Failed to send message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message'
      };
    }
  }
  
  private async sendSMS(message: SMSMessage): Promise<SMSSendResult> {
    return new Promise((resolve) => {
      const params = {
        originator: this.fromNumber || 'MessageBird',
        recipients: [this.formatPhoneNumber(message.to)],
        body: message.message,
      };
      
      this.client!.messages.create(params, (err: any, response: any) => {
        if (err) {
          this.log('error', 'SMS send failed:', err);
          resolve({
            success: false,
            error: err.message || 'SMS send failed'
          });
        } else {
          this.log('info', 'SMS sent successfully', { id: response.id });
          resolve({
            success: true,
            messageId: response.id,
            status: response.recipients.totalDeliveryFailedCount > 0 ? 'failed' : 'sent'
          });
        }
      });
    });
  }
  
  private async sendWhatsApp(message: SMSMessage): Promise<SMSSendResult> {
    if (!this.whatsappChannelId) {
      return {
        success: false,
        error: 'WhatsApp channel ID not configured'
      };
    }
    
    return new Promise((resolve) => {
      const params = {
        to: this.formatPhoneNumber(message.to),
        from: this.whatsappChannelId!,
        type: 'text',
        content: {
          text: message.message
        }
      };
      
      // For WhatsApp, we need to use conversations API
      // Note: This requires WhatsApp sandbox setup or business account
      this.client!.conversations.send(params, (err: any, response: any) => {
        if (err) {
          this.log('error', 'WhatsApp send failed:', err);
          resolve({
            success: false,
            error: err.message || 'WhatsApp send failed'
          });
        } else {
          this.log('info', 'WhatsApp sent successfully', { id: response.id });
          resolve({
            success: true,
            messageId: response.id,
            status: 'sent'
          });
        }
      });
    });
  }
  
  async getStatus(): Promise<SMSProviderStatus> {
    const healthy = await this.isHealthy();
    
    return {
      configured: !!this.client,
      healthy,
      activeNumbers: this.fromNumber ? [this.fromNumber] : [],
      capabilities: {
        sms: !!this.fromNumber,
        whatsapp: !!this.whatsappChannelId
      }
    };
  }
  
  async getDeliveryStatus(messageId: string): Promise<SMSSendResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'MessageBird client not initialized'
      };
    }
    
    return new Promise((resolve) => {
      this.client!.messages.read(messageId, (err: any, response: any) => {
        if (err) {
          resolve({
            success: false,
            error: err.message || 'Failed to get message status'
          });
        } else {
          const success = response.recipients.totalDeliveryFailedCount === 0;
          resolve({
            success,
            messageId: response.id,
            status: response.status || 'unknown'
          });
        }
      });
    });
  }
}