/**
 * SendGrid Email Provider
 * Implements email and SMS sending through SendGrid API
 */

import { BaseEmailProvider } from './base-email-provider';
import { EmailProviderCapabilities, EmailMessage, EmailSendResult, EmailStatusResponse, EmailProviderConfig } from './email-provider-interface';
import sgMail from '@sendgrid/mail';

export class SendGridProvider extends BaseEmailProvider {
  private sgClient: typeof sgMail;

  constructor(config: EmailProviderConfig) {
    super('sendgrid', config);
    this.sgClient = sgMail;
  }

  get name(): string {
    return 'sendgrid';
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
      supportsSMS: true, // SendGrid supports SMS through Twilio
      maxAttachmentSize: 30 * 1024 * 1024, // 30MB
      rateLimit: 100, // 100 emails per second
    };
  }

  /**
   * Initialize SendGrid provider
   */
  protected async performInitialization(): Promise<void> {
    // Validate required configuration
    if (!this.config.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    // Set the API key
    this.sgClient.setApiKey(this.config.apiKey);

    this.log('info', 'SendGrid provider initialized');
  }

  /**
   * Perform health check
   */
  protected async performHealthCheck(): Promise<boolean> {
    try {
      // SendGrid doesn't have a specific health endpoint
      // We'll try to get account details to verify the API key is valid
      const request = {
        method: 'GET' as any,
        url: '/v3/user/account',
      };

      await this.sgClient.request(request);
      return true;
    } catch (error) {
      this.log('error', 'Health check failed', error);
      return false;
    }
  }

  /**
   * Send email through SendGrid
   */
  protected async performSendEmail(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const msg: any = {
        to: message.to,
        from: {
          email: message.from || this.config.fromEmail!,
          name: this.config.fromName
        },
        subject: message.subject,
      };

      // Add content
      if (message.text) {
        msg.text = message.text;
      }
      if (message.html) {
        msg.html = message.html;
      }

      // Add optional fields
      if (message.cc) {
        msg.cc = message.cc;
      }
      if (message.bcc) {
        msg.bcc = message.bcc;
      }
      if (message.replyTo) {
        msg.replyTo = message.replyTo;
      }

      // Add custom headers
      if (message.headers) {
        msg.headers = message.headers;
      }

      // Add attachments
      if (message.attachments && message.attachments.length > 0) {
        msg.attachments = message.attachments.map(attachment => ({
          content: typeof attachment.content === 'string' 
            ? attachment.content 
            : attachment.content.toString('base64'),
          filename: attachment.filename,
          type: attachment.contentType || 'application/octet-stream',
          disposition: 'attachment',
          encoding: attachment.encoding || 'base64'
        }));
      }

      // Send the email
      const [response] = await this.sgClient.send(msg);

      return this.createSuccessResult(response.headers['x-message-id'] as string || '', {
        statusCode: response.statusCode,
        body: response.body
      });
    } catch (error: any) {
      this.log('error', 'Failed to send email', error);
      
      // Extract error message from SendGrid error response
      let errorMessage = 'Unknown error';
      if (error.response && error.response.body && error.response.body.errors) {
        errorMessage = error.response.body.errors.map((e: any) => e.message).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }

      return this.createErrorResult(errorMessage);
    }
  }

  /**
   * Send SMS through SendGrid (using Twilio integration)
   */
  protected async performSendSMS(phoneNumber: string, message: string): Promise<EmailSendResult> {
    // Note: SendGrid SMS requires additional setup with Twilio
    // This is a placeholder implementation
    return this.createErrorResult('SMS sending through SendGrid requires Twilio integration setup');
  }

  /**
   * Check email status
   */
  protected async performCheckStatus(messageId: string): Promise<EmailStatusResponse> {
    try {
      // SendGrid Activity API requires additional permissions
      // This is a basic implementation
      const request = {
        method: 'GET' as any,
        url: `/v3/messages?msg_id=${messageId}`,
      };

      const [response] = await this.sgClient.request(request);
      const messages = response.body.messages || [];

      if (messages.length === 0) {
        return {
          messageId,
          status: 'pending',
          timestamp: new Date(),
          events: []
        };
      }

      const message = messages[0];
      const status = this.mapSendGridStatus(message.status);

      return {
        messageId,
        status,
        timestamp: new Date(message.last_event_time),
        events: message.events?.map((event: any) => ({
          type: this.mapSendGridEvent(event.event_name),
          timestamp: new Date(event.processed),
          details: event
        })) || []
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
    // SendGrid supports batch sending
    try {
      const personalizations = messages.map(message => ({
        to: Array.isArray(message.to) ? message.to.map(email => ({ email })) : [{ email: message.to }],
        subject: message.subject
      }));

      const msg = {
        personalizations,
        from: {
          email: this.config.fromEmail!,
          name: this.config.fromName
        },
        content: messages[0].html ? [{
          type: 'text/html',
          value: messages[0].html
        }] : [{
          type: 'text/plain',
          value: messages[0].text || ''
        }]
      };

      const [response] = await this.sgClient.send(msg as any);

      // Return success for all messages
      return messages.map(() => this.createSuccessResult(
        response.headers['x-message-id'] as string || '',
        { statusCode: response.statusCode }
      ));
    } catch (error) {
      this.log('error', 'Failed to send bulk emails', error);
      // Return error for all messages
      return messages.map(() => this.createErrorResult(error instanceof Error ? error : new Error('Unknown error')));
    }
  }

  /**
   * Validate email address
   */
  async validateEmail(email: string): Promise<boolean> {
    // SendGrid email validation is a separate paid service
    // For now, we'll do basic regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Map SendGrid status to standard status
   */
  private mapSendGridStatus(status: string): EmailStatusResponse['status'] {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'delivered';
      case 'bounce':
      case 'bounced':
        return 'bounced';
      case 'dropped':
      case 'failed':
        return 'failed';
      case 'processed':
      case 'deferred':
        return 'pending';
      default:
        return 'sent';
    }
  }

  /**
   * Map SendGrid event to standard event type
   */
  private mapSendGridEvent(event: string): EmailStatusResponse['events'][0]['type'] {
    switch (event.toLowerCase()) {
      case 'processed':
        return 'sent';
      case 'delivered':
        return 'delivered';
      case 'open':
        return 'opened';
      case 'click':
        return 'clicked';
      case 'bounce':
      case 'dropped':
      case 'spamreport':
        return 'bounced';
      case 'deferred':
      case 'failed':
        return 'failed';
      default:
        return 'sent';
    }
  }
}