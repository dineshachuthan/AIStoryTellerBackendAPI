import { MailService } from '@sendgrid/mail';
import twilio from 'twilio';

// Common interfaces
export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface InvitationData {
  recipientContact: string; // email or phone
  recipientName?: string;
  characterName: string;
  storyTitle: string;
  invitationLink: string;
  senderName: string;
}

export interface NotificationConfig {
  email?: {
    apiKey?: string;
    fromEmail?: string;
  };
  sms?: {
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
  };
}

// Base notification provider interface
export interface NotificationProvider {
  isConfigured(): boolean;
  getStatus(): { configured: boolean; details: Record<string, any> };
  sendInvitation(data: InvitationData): Promise<NotificationResult>;
  sendMessage(recipient: string, message: string): Promise<NotificationResult>;
}

// Email provider implementation
export class EmailProvider implements NotificationProvider {
  private mailService: MailService;
  private fromEmail: string | null = null;
  private configured: boolean = false;

  constructor(config?: NotificationConfig['email']) {
    this.mailService = new MailService();
    this.initialize(config);
  }

  private initialize(config?: NotificationConfig['email']): void {
    const apiKey = config?.apiKey || process.env.SENDGRID_API_KEY;
    this.fromEmail = config?.fromEmail || process.env.SENDGRID_FROM_EMAIL || null;

    if (apiKey && this.fromEmail) {
      try {
        this.mailService.setApiKey(apiKey);
        this.configured = true;
        console.log('Email provider initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize email provider:', error);
        this.configured = false;
      }
    } else {
      console.warn('Email provider not configured - missing API key or from email');
      this.configured = false;
    }
  }

  public isConfigured(): boolean {
    return this.configured;
  }

  public getStatus() {
    return {
      configured: this.configured,
      details: {
        hasApiKey: !!process.env.SENDGRID_API_KEY,
        hasFromEmail: !!this.fromEmail,
        fromEmail: this.fromEmail
      }
    };
  }

  private createInvitationHTML(data: InvitationData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">You're Invited to a Roleplay!</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 16px; margin-bottom: 15px;">
            Hi ${data.recipientName || 'there'}!
          </p>
          
          <p style="font-size: 16px; margin-bottom: 15px;">
            <strong>${data.senderName}</strong> has invited you to participate in a collaborative roleplay story!
          </p>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 0;"><strong>Story:</strong> ${data.storyTitle}</p>
            <p style="margin: 10px 0 0 0;"><strong>Your Character:</strong> ${data.characterName}</p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Click the button below to join the roleplay and record your character's voice for the story!
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.invitationLink}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
              Join Roleplay as ${data.characterName}
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${data.invitationLink}">${data.invitationLink}</a>
          </p>
        </div>
        
        <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
          <p>This is an automated invitation from our storytelling platform.</p>
        </div>
      </div>
    `;
  }

  private createInvitationText(data: InvitationData): string {
    return `
You're Invited to a Roleplay!

Hi ${data.recipientName || 'there'}!

${data.senderName} has invited you to participate in a collaborative roleplay story!

Story: ${data.storyTitle}
Your Character: ${data.characterName}

Click this link to join the roleplay and record your character's voice:
${data.invitationLink}

Thank you for participating in our storytelling community!
    `;
  }

  public async sendInvitation(data: InvitationData): Promise<NotificationResult> {
    if (!this.configured || !this.fromEmail) {
      return {
        success: false,
        error: 'Email provider not configured'
      };
    }

    try {
      const result = await this.mailService.send({
        to: data.recipientContact,
        from: this.fromEmail,
        subject: `Roleplay Invitation: Play ${data.characterName} in "${data.storyTitle}"`,
        text: this.createInvitationText(data),
        html: this.createInvitationHTML(data),
      });

      console.log(`Email invitation sent to ${data.recipientContact} for character ${data.characterName}`);
      return {
        success: true,
        messageId: Array.isArray(result) ? result[0]?.headers?.['x-message-id'] : undefined
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      };
    }
  }

  public async sendMessage(recipient: string, message: string): Promise<NotificationResult> {
    if (!this.configured || !this.fromEmail) {
      return {
        success: false,
        error: 'Email provider not configured'
      };
    }

    try {
      const result = await this.mailService.send({
        to: recipient,
        from: this.fromEmail,
        subject: 'Notification from Storytelling Platform',
        text: message,
        html: `<div style="font-family: Arial, sans-serif; padding: 20px;">${message.replace(/\n/g, '<br>')}</div>`
      });

      console.log(`Email sent to ${recipient}`);
      return {
        success: true,
        messageId: Array.isArray(result) ? result[0]?.headers?.['x-message-id'] : undefined
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      };
    }
  }
}

// SMS provider implementation
export class SMSProvider implements NotificationProvider {
  private client: twilio.Twilio | null = null;
  private fromNumber: string | null = null;
  private configured: boolean = false;

  constructor(config?: NotificationConfig['sms']) {
    this.initialize(config);
  }

  private initialize(config?: NotificationConfig['sms']): void {
    const accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = config?.phoneNumber || process.env.TWILIO_PHONE_NUMBER || null;

    if (accountSid && authToken && this.fromNumber) {
      try {
        this.client = twilio(accountSid, authToken);
        this.configured = true;
        console.log('SMS provider initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize SMS provider:', error);
        this.configured = false;
      }
    } else {
      console.warn('SMS provider not configured - missing credentials');
      this.configured = false;
    }
  }

  public isConfigured(): boolean {
    return this.configured;
  }

  public getStatus() {
    return {
      configured: this.configured,
      details: {
        hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasPhoneNumber: !!this.fromNumber,
        fromNumber: this.fromNumber
      }
    };
  }

  private formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    return phone.startsWith('+') ? phone : `+${digits}`;
  }

  private createInvitationMessage(data: InvitationData): string {
    return `🎭 Roleplay Invitation!

Hi ${data.recipientName || 'there'}! ${data.senderName} invited you to play ${data.characterName} in "${data.storyTitle}".

Join the roleplay and record your character's voice:
${data.invitationLink}

Tap the link to start participating!`;
  }

  public async sendInvitation(data: InvitationData): Promise<NotificationResult> {
    if (!this.configured || !this.client || !this.fromNumber) {
      return {
        success: false,
        error: 'SMS provider not configured'
      };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(data.recipientContact);
      const messageText = this.createInvitationMessage(data);

      const message = await this.client.messages.create({
        body: messageText,
        from: this.fromNumber,
        to: formattedPhone
      });

      console.log(`SMS invitation sent to ${formattedPhone} for character ${data.characterName}. SID: ${message.sid}`);
      
      return {
        success: true,
        messageId: message.sid
      };
    } catch (error) {
      console.error('SMS invitation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS error'
      };
    }
  }

  public async sendMessage(recipient: string, message: string): Promise<NotificationResult> {
    if (!this.configured || !this.client || !this.fromNumber) {
      return {
        success: false,
        error: 'SMS provider not configured'
      };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(recipient);
      
      const sms = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedPhone
      });

      console.log(`SMS sent to ${formattedPhone}. SID: ${sms.sid}`);
      
      return {
        success: true,
        messageId: sms.sid
      };
    } catch (error) {
      console.error('SMS send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS error'
      };
    }
  }
}

// Unified notification service
export class NotificationService {
  private emailProvider: EmailProvider;
  private smsProvider: SMSProvider;

  constructor(config?: NotificationConfig) {
    this.emailProvider = new EmailProvider(config?.email);
    this.smsProvider = new SMSProvider(config?.sms);
  }

  public getStatus() {
    return {
      email: this.emailProvider.getStatus(),
      sms: this.smsProvider.getStatus()
    };
  }

  public async sendInvitation(method: 'email' | 'sms', data: InvitationData): Promise<NotificationResult> {
    const provider = method === 'email' ? this.emailProvider : this.smsProvider;
    return provider.sendInvitation(data);
  }

  public async sendMessage(method: 'email' | 'sms', recipient: string, message: string): Promise<NotificationResult> {
    const provider = method === 'email' ? this.emailProvider : this.smsProvider;
    return provider.sendMessage(recipient, message);
  }

  // Convenience methods for common use cases
  public async sendRoleplayComplete(method: 'email' | 'sms', recipient: string, storyTitle: string, videoUrl?: string): Promise<NotificationResult> {
    const message = method === 'email' 
      ? `Your roleplay for "${storyTitle}" is complete! ${videoUrl ? `Watch it here: ${videoUrl}` : 'Check your email for the final video.'}`
      : `🎬 Your roleplay for "${storyTitle}" is complete! ${videoUrl ? `Watch it here: ${videoUrl}` : 'Check your email for the final video.'}`;
    
    return this.sendMessage(method, recipient, message);
  }

  public async sendRecordingReminder(method: 'email' | 'sms', recipient: string, characterName: string): Promise<NotificationResult> {
    const message = method === 'email'
      ? `Reminder: You haven't finished recording your lines for ${characterName} yet. Complete your roleplay recording when you have a moment!`
      : `🎤 Reminder: You haven't finished recording your lines for ${characterName} yet. Complete your roleplay recording when you have a moment!`;
    
    return this.sendMessage(method, recipient, message);
  }
}

// Default service instance
export const notificationService = new NotificationService();

// Legacy exports for backward compatibility
export const emailProvider = new EmailProvider();
export const smsProvider = new SMSProvider();

export async function sendRoleplayInvitation(data: InvitationData): Promise<boolean> {
  const result = await emailProvider.sendInvitation(data);
  return result.success;
}

export async function sendSMSInvitation(data: InvitationData): Promise<boolean> {
  const result = await smsProvider.sendInvitation(data);
  return result.success;
}