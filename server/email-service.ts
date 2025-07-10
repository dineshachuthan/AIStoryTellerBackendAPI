import { emailProviderRegistry } from './email-providers/email-provider-registry';
import { EmailMessage } from './email-providers/email-provider-interface';
import { 
  passwordResetTemplate, 
  verificationCodeTemplate, 
  welcomeEmailTemplate, 
  twoFactorCodeTemplate, 
  roleplayInvitationTemplate,
  interpolateTemplate 
} from './email-templates/auth-email-templates';
import { narrationInvitationTemplate } from './email-templates/narration-invitation.template';
import { EmailTemplate } from './email-templates/types';
import { getMessage, Language } from '../shared/i18n-hierarchical';

// Initialize email provider registry
const emailRegistry = emailProviderRegistry;

// Check if any email provider is configured
const emailProvider = emailRegistry.getActiveProvider();
if (!emailProvider) {
  console.warn("Email provider not configured - missing API key or from email");
  console.warn("Configure either MAILGUN_API_KEY + MAILGUN_DOMAIN or SENDGRID_API_KEY");
}

/**
 * Helper function to compile email template with data and i18n
 */
function compileEmailTemplate(template: EmailTemplate, data: Record<string, any>, language: Language = 'en') {
  // First, process i18n keys
  const processI18n = (text: string): string => {
    return text.replace(/\{\{i18n\.([^\}]+)\}\}/g, (match, keyPath) => {
      try {
        const message = getMessage(keyPath, {}, language);
        return message.message;
      } catch (error) {
        console.warn(`Failed to get i18n message for key: ${keyPath}`, error);
        return match; // Return original if i18n fails
      }
    });
  };
  
  // Process i18n in template parts
  const i18nSubject = processI18n(template.subject);
  const i18nHtml = processI18n(template.html);
  const i18nText = processI18n(template.text);
  
  // Then interpolate variables
  const compiledSubject = interpolateTemplate(i18nSubject, data);
  const compiledHtml = interpolateTemplate(i18nHtml, data);
  const compiledText = interpolateTemplate(i18nText, data);
  
  return {
    subject: compiledSubject,
    html: compiledHtml,
    text: compiledText
  };
}

export interface InvitationEmailData {
  recipientEmail: string;
  recipientName?: string;
  characterName: string;
  storyTitle: string;
  invitationLink: string;
  senderName: string;
  language?: Language;
}

export async function sendRoleplayInvitation(data: InvitationEmailData): Promise<boolean> {
  const emailProvider = emailRegistry.getActiveProvider();
  if (!emailProvider) {
    console.log(`Email invitation to ${data.recipientEmail} for character ${data.characterName} - No email provider configured`);
    return false;
  }
  
  try {
    const templateData = {
      recipientName: data.recipientName || 'there',
      senderName: data.senderName,
      storyTitle: data.storyTitle,
      characterName: data.characterName,
      invitationLink: data.invitationLink
    };
    
    const compiled = compileEmailTemplate(roleplayInvitationTemplate, templateData);

    const emailMessage: EmailMessage = {
      to: data.recipientEmail,
      from: emailProvider.config.fromEmail || 'noreply@example.com',
      subject: compiled.subject,
      text: compiled.text,
      html: compiled.html,
    };

    const result = await emailProvider.sendEmail(emailMessage);
    
    if (result.success) {
      console.log(`Roleplay invitation sent to ${data.recipientEmail} for character ${data.characterName}`);
      return true;
    } else {
      console.error('Email send error:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
}

export async function sendSMSInvitation(phoneNumber: string, data: Omit<InvitationEmailData, 'recipientEmail'>): Promise<boolean> {
  const smsProvider = emailRegistry.getSMSProvider();
  if (!smsProvider || !smsProvider.sendSMS) {
    console.log(`SMS invitation to ${phoneNumber} for character ${data.characterName} - SMS service not configured`);
    return false;
  }

  try {
    const message = `Hi! ${data.senderName} invited you to play ${data.characterName} in "${data.storyTitle}". Join the roleplay: ${data.invitationLink}`;
    
    const result = await smsProvider.sendSMS(phoneNumber, message);
    
    if (result.success) {
      console.log(`SMS invitation sent to ${phoneNumber} for character ${data.characterName}`);
      return true;
    } else {
      console.error('SMS send error:', result.error);
      return false;
    }
  } catch (error) {
    console.error('SMS service error:', error);
    return false;
  }
}

// Authentication Email Interfaces
export interface PasswordResetEmailData {
  recipientEmail: string;
  recipientName?: string;
  resetLink: string;
  passwordHint?: string;
}

export interface VerificationCodeEmailData {
  recipientEmail: string;
  recipientName?: string;
  verificationCode: string;
  expiryMinutes?: number;
}

export interface WelcomeEmailData {
  recipientEmail: string;
  recipientName?: string;
  loginLink?: string;
}

export interface TwoFactorEmailData {
  recipientEmail: string;
  recipientName?: string;
  code: string;
  expiryMinutes?: number;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
  const emailProvider = emailRegistry.getActiveProvider();
  if (!emailProvider) {
    console.log(`Password reset email to ${data.recipientEmail} - No email provider configured`);
    return false;
  }

  try {
    const templateData = {
      recipientName: data.recipientName || 'there',
      resetLink: data.resetLink,
      passwordHint: data.passwordHint || ''
    };
    
    const compiled = compileEmailTemplate(passwordResetTemplate, templateData);

    const emailMessage: EmailMessage = {
      to: data.recipientEmail,
      from: emailProvider.config.fromEmail || 'noreply@example.com',
      subject: compiled.subject,
      text: compiled.text,
      html: compiled.html,
    };

    const result = await emailProvider.sendEmail(emailMessage);
    
    if (result.success) {
      console.log(`Password reset email sent to ${data.recipientEmail}`);
      return true;
    } else {
      console.error('Password reset email error:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
}

/**
 * Send verification code email for account verification
 */
export async function sendVerificationCodeEmail(data: VerificationCodeEmailData): Promise<boolean> {
  const emailProvider = emailRegistry.getActiveProvider();
  if (!emailProvider) {
    console.log(`Verification email to ${data.recipientEmail} - No email provider configured`);
    return false;
  }

  try {
    const templateData = {
      recipientName: data.recipientName || 'there',
      verificationCode: data.verificationCode,
      expiryMinutes: data.expiryMinutes || 30
    };
    
    const compiled = compileEmailTemplate(verificationCodeTemplate, templateData);

    const emailMessage: EmailMessage = {
      to: data.recipientEmail,
      from: emailProvider.config.fromEmail || 'noreply@example.com',
      subject: compiled.subject,
      text: compiled.text,
      html: compiled.html,
    };

    const result = await emailProvider.sendEmail(emailMessage);
    
    if (result.success) {
      console.log(`Verification code email sent to ${data.recipientEmail}`);
      return true;
    } else {
      console.error('Verification email error:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
}

/**
 * Send welcome email after successful registration
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  const emailProvider = emailRegistry.getActiveProvider();
  if (!emailProvider) {
    console.log(`Welcome email to ${data.recipientEmail} - No email provider configured`);
    return false;
  }

  try {
    const templateData = {
      recipientName: data.recipientName || 'there',
      loginLink: data.loginLink || ''
    };
    
    const compiled = compileEmailTemplate(welcomeEmailTemplate, templateData);

    const emailMessage: EmailMessage = {
      to: data.recipientEmail,
      from: emailProvider.config.fromEmail || 'noreply@example.com',
      subject: compiled.subject,
      text: compiled.text,
      html: compiled.html,
    };

    const result = await emailProvider.sendEmail(emailMessage);
    
    if (result.success) {
      console.log(`Welcome email sent to ${data.recipientEmail}`);
      return true;
    } else {
      console.error('Welcome email error:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
}

/**
 * Send two-factor authentication code email
 */
export async function sendTwoFactorCodeEmail(data: TwoFactorEmailData): Promise<boolean> {
  const emailProvider = emailRegistry.getActiveProvider();
  if (!emailProvider) {
    console.log(`2FA email to ${data.recipientEmail} - No email provider configured`);
    return false;
  }

  try {
    const templateData = {
      recipientName: data.recipientName || 'there',
      code: data.code,
      expiryMinutes: data.expiryMinutes || 10
    };
    
    const compiled = compileEmailTemplate(twoFactorCodeTemplate, templateData);

    const emailMessage: EmailMessage = {
      to: data.recipientEmail,
      from: emailProvider.config.fromEmail || 'noreply@example.com',
      subject: compiled.subject,
      text: compiled.text,
      html: compiled.html,
    };

    const result = await emailProvider.sendEmail(emailMessage);
    
    if (result.success) {
      console.log(`2FA code email sent to ${data.recipientEmail}`);
      return true;
    } else {
      console.error('2FA email error:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
}