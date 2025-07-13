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
  name: '{{i18n.email.templates.passwordReset.name}}',
  subject: '{{i18n.email.templates.passwordReset.subject}}',
  description: 'Sent when a user requests to reset their password',
  
  variables: [
    'recipientName',
    'resetLink',
    'passwordHint',
    'expiryHours'
  ],
  
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">{{i18n.email.templates.passwordReset.title}}</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 15px;">
          {{i18n.auth.login.greeting}}
        </p>
        
        <p style="font-size: 16px; margin-bottom: 15px;">
          {{i18n.email.templates.passwordReset.intro}} {{i18n.email.templates.passwordReset.clickButton}}
        </p>
        
        {{#if passwordHint}}
        <div style="background-color: #fff3cd; padding: 10px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0; color: #856404;"><strong>{{i18n.auth.register.passwordHint.label}}:</strong> {{passwordHint}}</p>
        </div>
        {{/if}}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resetLink}}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            {{i18n.email.templates.passwordReset.buttonText}}
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
          {{i18n.email.templates.passwordReset.notRequested}}
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          {{i18n.auth.forgotPassword.linkOrButton}}<br>
          <a href="{{resetLink}}">{{resetLink}}</a>
        </p>
      </div>
      
      <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
        <p>{{i18n.email.templates.passwordReset.linkExpiry}}</p>
      </div>
    </div>
  `,
  text: `
{{i18n.email.templates.passwordReset.title}}

{{i18n.auth.login.greeting}}

{{i18n.email.templates.passwordReset.intro}}

{{#if passwordHint}}{{i18n.auth.register.passwordHint.label}}: {{passwordHint}}{{/if}}

{{i18n.email.templates.passwordReset.clickButton}}
{{resetLink}}

{{i18n.email.templates.passwordReset.notRequested}}

{{i18n.email.templates.passwordReset.linkExpiry}}
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
  name: '{{i18n.email.templates.verificationCode.name}}',
  subject: '{{i18n.email.templates.verificationCode.subject}}',
  description: 'Sent to verify a user\'s email address during registration',
  
  variables: [
    'recipientName',
    'verificationCode',
    'expiryMinutes'
  ],
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">{{i18n.email.templates.verificationCode.title}}</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 15px;">
          {{i18n.auth.login.greeting}}
        </p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          {{i18n.email.templates.verificationCode.useCode}}
        </p>
        
        <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <p style="font-size: 32px; font-weight: bold; margin: 0; letter-spacing: 5px;">
            {{verificationCode}}
          </p>
        </div>
        
        <p style="font-size: 14px; color: #666; text-align: center;">
          {{i18n.email.templates.verificationCode.codeExpiry}}
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          {{i18n.email.templates.passwordReset.notRequested}}
        </p>
      </div>
      
      <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
        <p>{{i18n.common.welcomeMessage}}</p>
      </div>
    </div>
  `,
  text: `
{{i18n.email.templates.verificationCode.title}}

{{i18n.auth.login.greeting}}

{{i18n.email.templates.verificationCode.useCode}}

{{i18n.email.templates.verificationCode.yourCode}} {{verificationCode}}

{{i18n.email.templates.verificationCode.codeExpiry}}

{{i18n.email.templates.passwordReset.notRequested}}

{{i18n.common.welcomeMessage}}
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
  name: '{{i18n.email.templates.welcome.name}}',
  subject: '{{i18n.email.templates.welcome.subject}}',
  description: 'Sent after successful user registration',
  
  variables: [
    'recipientName',
    'loginLink',
    'appName'
  ],
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">{{i18n.email.templates.welcome.title}}</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 15px;">
          {{i18n.email.templates.welcome.greeting}}
        </p>
        
        <p style="font-size: 16px; margin-bottom: 15px;">
          {{i18n.email.templates.welcome.accountCreated}} {{i18n.email.templates.welcome.readyToExplore}}
        </p>
        
        <h3 style="color: #333; margin-top: 25px;">{{i18n.home.features.title}}</h3>
        <ul style="font-size: 16px; line-height: 1.8;">
          <li>{{i18n.home.features.createStories}}</li>
          <li>{{i18n.home.features.collaborateRoleplay}}</li>
          <li>{{i18n.home.features.analyzeCharacters}}</li>
          <li>{{i18n.home.features.voiceNarration}}</li>
          <li>{{i18n.home.features.recordVoices}}</li>
        </ul>
        
        {{#if loginLink}}
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{loginLink}}" 
             style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            {{i18n.email.templates.welcome.getStartedButton}}
          </a>
        </div>
        {{/if}}
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          {{i18n.common.supportContact}}
        </p>
      </div>
      
      <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
        <p>{{i18n.common.happyStorytelling}}</p>
      </div>
    </div>
  `,
  text: `
{{i18n.email.templates.welcome.title}}

{{i18n.email.templates.welcome.greeting}}

{{i18n.email.templates.welcome.accountCreated}} {{i18n.email.templates.welcome.readyToExplore}}

{{i18n.home.features.title}}
- {{i18n.home.features.createStories}}
- {{i18n.home.features.collaborateRoleplay}}
- {{i18n.home.features.analyzeCharacters}}
- {{i18n.home.features.voiceNarration}}
- {{i18n.home.features.recordVoices}}

{{#if loginLink}}{{i18n.email.templates.welcome.getStartedButton}}: {{loginLink}}{{/if}}

{{i18n.common.supportContact}}

{{i18n.common.happyStorytelling}}
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
  name: '{{i18n.email.templates.twoFactorCode.name}}',
  subject: '{{i18n.email.templates.twoFactorCode.subject}}',
  description: 'Sent when user has two-factor authentication enabled',
  
  variables: [
    'recipientName',
    'code',
    'expiryMinutes'
  ],
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">{{i18n.email.templates.twoFactorCode.title}}</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 15px;">
          {{i18n.auth.login.greeting}}
        </p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          {{i18n.email.templates.twoFactorCode.codeText}}
        </p>
        
        <div style="background-color: #ffc107; color: #333; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <p style="font-size: 32px; font-weight: bold; margin: 0; letter-spacing: 5px;">
            {{code}}
          </p>
        </div>
        
        <p style="font-size: 14px; color: #666; text-align: center;">
          {{i18n.email.templates.twoFactorCode.validFor}}
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          {{i18n.auth.twoFactor.notRequested}}
        </p>
      </div>
      
      <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
        <p>{{i18n.auth.twoFactor.securityReminder}}</p>
      </div>
    </div>
  `,
  text: `
{{i18n.email.templates.twoFactorCode.title}}

{{i18n.auth.login.greeting}}

{{i18n.email.templates.twoFactorCode.codeText}} {{code}}

{{i18n.email.templates.twoFactorCode.validFor}}

{{i18n.auth.twoFactor.notRequested}}

{{i18n.auth.twoFactor.securityReminder}}
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
  name: '{{i18n.email.templates.roleplayInvitation.name}}',
  subject: '{{i18n.email.templates.roleplayInvitation.subject}}',
  description: 'Sent when inviting someone to participate in a roleplay as a specific character',
  
  variables: [
    'recipientName',
    'senderName',
    'storyTitle',
    'roleplayTitle',
    'characterName',
    'invitationLink'
  ],
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">{{i18n.email.templates.roleplayInvitation.title}}</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 15px;">
          {{i18n.email.templates.roleplayInvitation.greeting}}
        </p>
        
        <p style="font-size: 16px; margin-bottom: 15px;">
          {{i18n.email.templates.roleplayInvitation.inviteText}}
        </p>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0;"><strong>{{i18n.story_library.labels.story}}:</strong> {{storyTitle}}</p>
          <p style="margin: 10px 0 0 0;"><strong>{{i18n.email.templates.roleplayInvitation.roleInfo}}</strong></p>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          {{i18n.collaboration.invitation.clickToJoin}}
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{invitationLink}}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            {{i18n.email.templates.roleplayInvitation.joinButton}}
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          {{i18n.auth.forgotPassword.linkOrButton}}<br>
          <a href="{{invitationLink}}">{{invitationLink}}</a>
        </p>
      </div>
      
      <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
        <p>{{i18n.email.templates.roleplayInvitation.linkExpiry}}</p>
      </div>
    </div>
  `,
  text: `
{{i18n.email.templates.roleplayInvitation.title}}

{{i18n.email.templates.roleplayInvitation.greeting}}

{{i18n.email.templates.roleplayInvitation.inviteText}}

{{i18n.story_library.labels.story}}: {{storyTitle}}
{{i18n.email.templates.roleplayInvitation.roleInfo}}

{{i18n.collaboration.invitation.clickToJoin}}
{{invitationLink}}

{{i18n.common.thankYou}}
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