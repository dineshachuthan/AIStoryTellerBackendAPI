/**
 * Authentication Email Templates
 * All authentication-related email templates with placeholders for dynamic content
 */

import { EmailTemplate } from './types';

/**
 * Password Reset Email Template
 */
export const passwordResetTemplate: EmailTemplate = {
  id: 'password-reset',
  name: 'Password Reset',
  subject: 'Password Reset Request',
  description: 'Sent when a user requests to reset their password',
  
  variables: [
    'recipientName',
    'resetLink',
    'passwordHint',
    'expiryHours'
  ],
  
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 15px;">
          Hi {{recipientName}},
        </p>
        
        <p style="font-size: 16px; margin-bottom: 15px;">
          We received a request to reset your password. Click the button below to set a new password:
        </p>
        
        {{#if passwordHint}}
        <div style="background-color: #fff3cd; padding: 10px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; color: #856404;"><strong>Your password hint:</strong> {{passwordHint}}</p>
        </div>
        {{/if}}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resetLink}}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
          If you didn't request this password reset, please ignore this email.
          Your password won't be changed unless you click the button above.
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="{{resetLink}}">{{resetLink}}</a>
        </p>
      </div>
      
      <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
        <p>This link will expire in 24 hours for security reasons.</p>
      </div>
    </div>
  `,
  text: `
Password Reset Request

Hi {{recipientName}},

We received a request to reset your password.

{{#if passwordHint}}Your password hint: {{passwordHint}}{{/if}}

Click this link to reset your password:
{{resetLink}}

If you didn't request this password reset, please ignore this email.
Your password won't be changed unless you click the link above.

This link will expire in {{expiryHours}} hours for security reasons.
  `,
  
  webhooks: {
    opened: '{{webhookBaseUrl}}/email/opened/{{messageId}}',
    clicked: '{{webhookBaseUrl}}/email/clicked/{{messageId}}'
  }
};

/**
 * Email Verification Code Template
 */
export const verificationCodeTemplate: EmailTemplate = {
  id: 'email-verification',
  name: 'Email Verification',
  subject: 'Verify Your Email - Verification Code',
  description: 'Sent to verify a user\'s email address during registration',
  
  variables: [
    'recipientName',
    'verificationCode',
    'expiryMinutes'
  ],
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">Verify Your Email</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 15px;">
          Hi {{recipientName}},
        </p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Thank you for registering! Please use the verification code below to complete your registration:
        </p>
        
        <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <p style="font-size: 32px; font-weight: bold; margin: 0; letter-spacing: 5px;">
            {{verificationCode}}
          </p>
        </div>
        
        <p style="font-size: 14px; color: #666; text-align: center;">
          This code will expire in {{expiryMinutes}} minutes
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          If you didn't create an account, please ignore this email.
        </p>
      </div>
      
      <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
        <p>Thank you for joining our storytelling community!</p>
      </div>
    </div>
  `,
  text: `
Verify Your Email

Hi {{recipientName}},

Thank you for registering! Please use the verification code below to complete your registration:

Verification Code: {{verificationCode}}

This code will expire in {{expiryMinutes}} minutes.

If you didn't create an account, please ignore this email.

Thank you for joining our storytelling community!
  `,
  
  webhooks: {
    opened: '{{webhookBaseUrl}}/email/opened/{{messageId}}'
  }
};

/**
 * Welcome Email Template
 */
export const welcomeEmailTemplate: EmailTemplate = {
  id: 'welcome',
  name: 'Welcome Email',
  subject: 'Welcome to Our Storytelling Platform!',
  description: 'Sent after successful user registration',
  
  variables: [
    'recipientName',
    'loginLink'
  ],
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">Welcome to Our Storytelling Platform!</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 15px;">
          Hi {{recipientName}},
        </p>
        
        <p style="font-size: 16px; margin-bottom: 15px;">
          Welcome to our collaborative storytelling community! We're excited to have you here.
        </p>
        
        <h3 style="color: #333; margin-top: 25px;">What you can do:</h3>
        <ul style="font-size: 16px; line-height: 1.8;">
          <li>Create and share your own stories</li>
          <li>Collaborate with friends on roleplay adventures</li>
          <li>Use AI to analyze characters and emotions</li>
          <li>Generate voice narrations for your stories</li>
          <li>Record custom voices for unique characters</li>
        </ul>
        
        {{#if loginLink}}
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{loginLink}}" 
             style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Start Creating Stories
          </a>
        </div>
        {{/if}}
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          If you have any questions, feel free to reach out to our support team.
        </p>
      </div>
      
      <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
        <p>Happy storytelling!</p>
      </div>
    </div>
  `,
  text: `
Welcome to Our Storytelling Platform!

Hi {{recipientName}},

Welcome to our collaborative storytelling community! We're excited to have you here.

What you can do:
- Create and share your own stories
- Collaborate with friends on roleplay adventures
- Use AI to analyze characters and emotions
- Generate voice narrations for your stories
- Record custom voices for unique characters

{{#if loginLink}}Start creating stories: {{loginLink}}{{/if}}

If you have any questions, feel free to reach out to our support team.

Happy storytelling!
  `,
  
  webhooks: {
    opened: '{{webhookBaseUrl}}/email/opened/{{messageId}}'
  }
};

/**
 * Two-Factor Authentication Code Template
 */
export const twoFactorCodeTemplate: EmailTemplate = {
  id: 'two-factor',
  name: 'Two-Factor Authentication',
  subject: 'Your Two-Factor Authentication Code',
  description: 'Sent when user has two-factor authentication enabled',
  
  variables: [
    'recipientName',
    'code',
    'expiryMinutes'
  ],
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">Two-Factor Authentication</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 15px;">
          Hi {{recipientName}},
        </p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Your two-factor authentication code is:
        </p>
        
        <div style="background-color: #ffc107; color: #333; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <p style="font-size: 32px; font-weight: bold; margin: 0; letter-spacing: 5px;">
            {{code}}
          </p>
        </div>
        
        <p style="font-size: 14px; color: #666; text-align: center;">
          This code will expire in {{expiryMinutes}} minutes
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          If you didn't request this code, please secure your account immediately.
        </p>
      </div>
      
      <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
        <p>For security, never share this code with anyone.</p>
      </div>
    </div>
  `,
  text: `
Two-Factor Authentication

Hi {{recipientName}},

Your two-factor authentication code is: {{code}}

This code will expire in {{expiryMinutes}} minutes.

If you didn't request this code, please secure your account immediately.

For security, never share this code with anyone.
  `,
  
  webhooks: {
    opened: '{{webhookBaseUrl}}/email/opened/{{messageId}}'
  }
};

/**
 * Roleplay Invitation Email Template (existing template refactored)
 */
export const roleplayInvitationTemplate: EmailTemplate = {
  id: 'roleplay-invitation',
  name: 'Roleplay Invitation',
  subject: 'Roleplay Invitation: Play {{characterName}} in "{{storyTitle}}"',
  description: 'Sent when inviting someone to participate in a roleplay as a specific character',
  
  variables: [
    'recipientName',
    'senderName',
    'storyTitle',
    'characterName',
    'invitationLink'
  ],
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">You're Invited to a Roleplay!</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 15px;">
          Hi {{recipientName}}!
        </p>
        
        <p style="font-size: 16px; margin-bottom: 15px;">
          <strong>{{senderName}}</strong> has invited you to participate in a collaborative roleplay story!
        </p>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0;"><strong>Story:</strong> {{storyTitle}}</p>
          <p style="margin: 10px 0 0 0;"><strong>Your Character:</strong> {{characterName}}</p>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Click the button below to join the roleplay and record your character's voice for the story!
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{invitationLink}}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Join Roleplay as {{characterName}}
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="{{invitationLink}}">{{invitationLink}}</a>
        </p>
      </div>
      
      <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
        <p>This is an automated invitation from our storytelling platform.</p>
      </div>
    </div>
  `,
  text: `
You're Invited to a Roleplay!

Hi {{recipientName}}!

{{senderName}} has invited you to participate in a collaborative roleplay story!

Story: {{storyTitle}}
Your Character: {{characterName}}

Click this link to join the roleplay and record your character's voice:
{{invitationLink}}

Thank you for participating in our storytelling community!
  `,
  
  webhooks: {
    opened: '{{webhookBaseUrl}}/email/opened/{{messageId}}',
    clicked: '{{webhookBaseUrl}}/email/clicked/{{messageId}}'
  },
  
  providerConfig: {
    sendgrid: {
      categories: ['invitation', 'roleplay']
    },
    mailgun: {
      tags: ['invitation', 'roleplay'],
      tracking: true
    }
  }
};

/**
 * Get email template by type
 */
export function getEmailTemplate(templateType: 'passwordReset' | 'verificationCode' | 'welcome' | 'twoFactor' | 'roleplayInvitation'): EmailTemplate {
  const templates = {
    passwordReset: passwordResetTemplate,
    verificationCode: verificationCodeTemplate,
    welcome: welcomeEmailTemplate,
    twoFactor: twoFactorCodeTemplate,
    roleplayInvitation: roleplayInvitationTemplate
  };

  return templates[templateType];
}

/**
 * Simple template interpolation
 * Replaces {{variable}} with values and handles {{#if}} conditionals
 */
export function interpolateTemplate(template: string, data: Record<string, any>): string {
  // Handle conditional blocks
  let result = template.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, variable, content) => {
    return data[variable] ? content : '';
  });

  // Replace variables
  result = result.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    return data[variable] !== undefined ? String(data[variable]) : 'there';
  });

  return result;
}