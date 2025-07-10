/**
 * SMS Provider Interface
 * Defines the contract for all SMS providers
 */

export interface SMSProviderCapabilities {
  maxMessageLength: number;
  supportsMMS: boolean;
  supportsInternational: boolean;
  supportsBulkSending: boolean;
  supportsStatusCallbacks: boolean;
}

export interface SMSProviderConfig {
  apiKey?: string;
  apiSecret?: string;
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  webhookUrl?: string;
  timeout?: number;
  retryCount?: number;
  priority?: number;
}

export interface SMSMessage {
  to: string;
  message: string;
  mediaUrl?: string; // For MMS
  callbackUrl?: string; // For status updates
}

export interface SMSSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
  cost?: number;
}

export interface SMSProviderStatus {
  configured: boolean;
  healthy: boolean;
  activeNumbers: string[];
  remainingCredits?: number;
}

export interface ISMSProvider {
  name: string;
  version: string;
  capabilities: SMSProviderCapabilities;
  
  initialize(config: SMSProviderConfig): Promise<void>;
  isHealthy(): Promise<boolean>;
  sendSMS(message: SMSMessage): Promise<SMSSendResult>;
  getStatus(): Promise<SMSProviderStatus>;
  getDeliveryStatus?(messageId: string): Promise<SMSSendResult>;
}