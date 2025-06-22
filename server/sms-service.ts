import twilio from 'twilio';

// Types for different SMS use cases
export interface SMSInvitationData {
  recipientPhone: string;
  recipientName?: string;
  characterName: string;
  storyTitle: string;
  invitationLink: string;
  senderName: string;
}

export interface SMSConfig {
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// SMS Service Class for modular usage
export class SMSService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string | null = null;
  private isConfigured: boolean = false;

  constructor(config?: SMSConfig) {
    this.initialize(config);
  }

  private initialize(config?: SMSConfig): void {
    const accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = config?.phoneNumber || process.env.TWILIO_PHONE_NUMBER || null;

    if (accountSid && authToken && this.fromNumber) {
      try {
        this.client = twilio(accountSid, authToken);
        this.isConfigured = true;
        console.log('SMS service initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize SMS service:', error);
        this.isConfigured = false;
      }
    } else {
      console.warn('SMS service not configured - missing credentials');
      this.isConfigured = false;
    }
  }

  public getStatus(): { configured: boolean; hasPhoneNumber: boolean } {
    return {
      configured: this.isConfigured,
      hasPhoneNumber: !!this.fromNumber
    };
  }

  private formatPhoneNumber(phone: string): string {
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

  private createInvitationMessage(data: SMSInvitationData): string {
    return `🎭 Roleplay Invitation!

Hi ${data.recipientName || 'there'}! ${data.senderName} invited you to play ${data.characterName} in "${data.storyTitle}".

Join the roleplay and record your character's voice:
${data.invitationLink}

Tap the link to start participating!`;
  }

  public async sendInvitation(data: SMSInvitationData): Promise<SMSResult> {
    if (!this.isConfigured || !this.client || !this.fromNumber) {
      return {
        success: false,
        error: 'SMS service not configured'
      };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(data.recipientPhone);
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

  public async sendMessage(phoneNumber: string, message: string): Promise<SMSResult> {
    if (!this.isConfigured || !this.client || !this.fromNumber) {
      return {
        success: false,
        error: 'SMS service not configured'
      };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
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

  // Template methods for different notification types
  public async sendRoleplayComplete(phoneNumber: string, storyTitle: string, videoUrl?: string): Promise<SMSResult> {
    const message = `🎬 Your roleplay for "${storyTitle}" is complete! ${videoUrl ? `Watch it here: ${videoUrl}` : 'Check your email for the final video.'}`;
    return this.sendMessage(phoneNumber, message);
  }

  public async sendRecordingReminder(phoneNumber: string, characterName: string): Promise<SMSResult> {
    const message = `🎤 Reminder: You haven't finished recording your lines for ${characterName} yet. Complete your roleplay recording when you have a moment!`;
    return this.sendMessage(phoneNumber, message);
  }
}

// Default service instance
export const smsService = new SMSService();

// Legacy functions for backward compatibility
export async function sendSMSInvitation(data: SMSInvitationData): Promise<boolean> {
  const result = await smsService.sendInvitation(data);
  return result.success;
}