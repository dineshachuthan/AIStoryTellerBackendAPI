/**
 * Standard interface that all email providers must implement
 * This ensures plug-and-play compatibility following the same pattern as video/voice providers
 */

export interface EmailMessage {
  to: string | string[];
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
}

export interface EmailProviderCapabilities {
  maxRecipients: number;
  supportsAttachments: boolean;
  supportsBulkSending: boolean;
  supportsTemplates: boolean;
  supportsTracking: boolean;
  supportsSMS: boolean; // Some providers like SendGrid support both
  maxAttachmentSize: number; // in bytes
  rateLimit: number; // emails per second
}

export interface EmailProviderConfig {
  apiKey: string;
  secretKey?: string;
  baseUrl?: string;
  domain?: string; // For providers like Mailgun
  region?: string; // For providers with regional endpoints
  timeout?: number;
  retryCount?: number;
  fromEmail?: string; // Default from email
  fromName?: string; // Default from name
}

export interface EmailProviderInfo {
  enabled: boolean;
  config: EmailProviderConfig;
  priority: number; // Lower number = higher priority
}

export interface EmailProviderConfiguration {
  activeProvider: string;
  providers: Record<string, EmailProviderInfo>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  timestamp: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface EmailStatusResponse {
  messageId: string;
  status: 'sent' | 'delivered' | 'bounced' | 'failed' | 'pending';
  timestamp: Date;
  events?: EmailEvent[];
}

export interface EmailEvent {
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  timestamp: Date;
  details?: Record<string, any>;
}

export interface IEmailProvider {
  readonly name: string;
  readonly version: string;
  readonly capabilities: EmailProviderCapabilities;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: EmailProviderConfig): Promise<void>;

  /**
   * Check if provider is healthy and ready
   */
  isHealthy(): Promise<boolean>;

  /**
   * Send email message
   */
  sendEmail(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Send SMS message (if supported)
   */
  sendSMS?(phoneNumber: string, message: string): Promise<EmailSendResult>;

  /**
   * Check status of sent message
   */
  checkStatus?(messageId: string): Promise<EmailStatusResponse>;

  /**
   * Send bulk emails (if supported)
   */
  sendBulk?(messages: EmailMessage[]): Promise<EmailSendResult[]>;

  /**
   * Validate email address format
   */
  validateEmail?(email: string): Promise<boolean>;
}