/**
 * Mailgun Email Provider
 * Implements email sending through Mailgun API
 */

import { BaseEmailProvider } from './base-email-provider';
import { EmailProviderCapabilities, EmailMessage, EmailSendResult, EmailStatusResponse, EmailProviderConfig } from './email-provider-interface';
import FormData from 'form-data';
import fetch from 'node-fetch';

export class MailgunProvider extends BaseEmailProvider {
  private baseUrl: string;
  private domain: string;

  constructor(config: EmailProviderConfig) {
    super('mailgun', config);
    this.baseUrl = config.baseUrl || 'https://api.mailgun.net/v3';
    this.domain = config.domain || '';
  }

  get name(): string {
    return 'mailgun';
  }

  get version(): string {
    return '1.0.0';
  }

  get capabilities(): EmailProviderCapabilities {
    return {
      maxRecipients: 1000,
      supportsAttachments: true,
      supportsBulkSending: true,
      supportsTemplates: true,
      supportsTracking: true,
      supportsSMS: false, // Mailgun has SMS but through different API
      maxAttachmentSize: 25 * 1024 * 1024, // 25MB
      rateLimit: 250, // 250 emails per second
    };
  }

  /**
   * Initialize Mailgun provider
   */
  protected async performInitialization(): Promise<void> {
    // Validate required configuration
    if (!this.config.apiKey) {
      throw new Error('Mailgun API key is required');
    }

    if (!this.domain) {
      throw new Error('Mailgun domain is required');
    }

    // Set region-specific base URL if needed
    if (this.config.region === 'eu') {
      this.baseUrl = 'https://api.eu.mailgun.net/v3';
    }

    this.log('info', 'Mailgun provider initialized', {
      domain: this.domain,
      region: this.config.region || 'us'
    });
  }

  /**
   * Perform health check
   */
  protected async performHealthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.domain}/stats/total`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`
        }
      });

      return response.ok;
    } catch (error) {
      this.log('error', 'Health check failed', error);
      return false;
    }
  }

  /**
   * Send email through Mailgun
   */
  protected async performSendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const form = new FormData();
      
      // Add required fields
      form.append('from', this.formatAddress(message.from));
      form.append('to', this.formatRecipients(message.to));
      form.append('subject', message.subject);
      
      // Add content
      if (message.text) {
        form.append('text', message.text);
      }
      if (message.html) {
        form.append('html', message.html);
      }
      
      // Add optional fields
      if (message.cc) {
        form.append('cc', this.formatRecipients(message.cc));
      }
      if (message.bcc) {
        form.append('bcc', this.formatRecipients(message.bcc));
      }
      if (message.replyTo) {
        form.append('h:Reply-To', message.replyTo);
      }
      
      // Add custom headers
      if (message.headers) {
        for (const [key, value] of Object.entries(message.headers)) {
          form.append(`h:${key}`, value);
        }
      }
      
      // Add attachments
      if (message.attachments) {
        for (const attachment of message.attachments) {
          const buffer = typeof attachment.content === 'string' 
            ? Buffer.from(attachment.content, attachment.encoding as BufferEncoding || 'utf8')
            : attachment.content;
            
          form.append('attachment', buffer, {
            filename: attachment.filename,
            contentType: attachment.contentType || 'application/octet-stream'
          });
        }
      }

      // Send the email
      const response = await fetch(`${this.baseUrl}/${this.domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`,
          ...form.getHeaders()
        },
        body: form
      });

      const responseData = await response.json() as any;

      if (!response.ok) {
        return this.createErrorResult(
          responseData.message || `Mailgun API error: ${response.status}`
        );
      }

      return this.createSuccessResult(responseData.id, {
        message: responseData.message
      });
    } catch (error) {
      this.log('error', 'Failed to send email', error);
      return this.createErrorResult(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Check email status
   */
  protected async performCheckStatus(messageId: string): Promise<EmailStatusResponse> {
    try {
      // Remove angle brackets from message ID if present
      const cleanId = messageId.replace(/[<>]/g, '');
      
      const response = await fetch(`${this.baseUrl}/${this.domain}/events?message-id=${cleanId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.status}`);
      }

      const data = await response.json() as any;
      const events = data.items || [];

      // Determine overall status from events
      let status: EmailStatusResponse['status'] = 'sent';
      const emailEvents: EmailStatusResponse['events'] = [];

      for (const event of events) {
        const eventType = this.mapMailgunEvent(event.event);
        emailEvents.push({
          type: eventType,
          timestamp: new Date(event.timestamp * 1000),
          details: {
            recipient: event.recipient,
            reason: event.reason,
            description: event.description
          }
        });

        // Update overall status based on events
        if (event.event === 'delivered') {
          status = 'delivered';
        } else if (event.event === 'failed' && status !== 'delivered') {
          status = 'failed';
        } else if (event.event === 'bounced' && status !== 'delivered') {
          status = 'bounced';
        }
      }

      return {
        messageId,
        status,
        timestamp: new Date(),
        events: emailEvents
      };
    } catch (error) {
      this.log('error', 'Failed to check email status', error);
      throw error;
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulk(messages: EmailMessage[]): Promise<EmailSendResult[]> {
    // Mailgun supports batch sending through recipient variables
    // For simplicity, we'll send individual emails in parallel
    const results = await Promise.allSettled(
      messages.map(message => this.sendEmail(message))
    );

    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : this.createErrorResult(result.reason)
    );
  }

  /**
   * Validate email address
   */
  async validateEmail(email: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/address/validate?address=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as any;
      return data.is_valid === true;
    } catch (error) {
      this.log('warn', 'Email validation failed', error);
      return false;
    }
  }

  /**
   * Format email address
   */
  private formatAddress(address: string): string {
    // Check if address already has name format
    if (address.includes('<') && address.includes('>')) {
      return address;
    }
    
    // Use default from name if available
    if (this.config.fromName && address === this.config.fromEmail) {
      return `${this.config.fromName} <${address}>`;
    }
    
    return address;
  }

  /**
   * Format recipients
   */
  private formatRecipients(recipients: string | string[]): string {
    const recipientArray = Array.isArray(recipients) ? recipients : [recipients];
    return recipientArray.join(', ');
  }

  /**
   * Map Mailgun event to standard event type
   */
  private mapMailgunEvent(event: string): EmailStatusResponse['events'][0]['type'] {
    switch (event) {
      case 'accepted':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'opened':
        return 'opened';
      case 'clicked':
        return 'clicked';
      case 'failed':
      case 'rejected':
        return 'failed';
      case 'bounced':
      case 'complained':
        return 'bounced';
      default:
        return 'sent';
    }
  }
}