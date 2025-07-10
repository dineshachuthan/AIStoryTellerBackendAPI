/**
 * Roleplay Invitation Email Template
 * Used when inviting collaborators to play characters in roleplay stories
 */

import { EmailTemplate } from './types';

export const roleplayInvitationTemplate: EmailTemplate = {
  id: 'roleplay-invitation',
  name: 'Roleplay Invitation',
  subject: 'Roleplay Invitation: Play {{characterName}} in "{{storyTitle}}"',
  description: 'Sent when a user invites someone to participate in a roleplay as a specific character',
  
  // Variables required for this template
  variables: [
    'recipientName',
    'senderName', 
    'storyTitle',
    'characterName',
    'invitationLink'
  ],
  
  // HTML template with placeholders
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
  
  // Plain text version
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
  
  // Webhook placeholders for analytics
  webhooks: {
    opened: '{{webhookBaseUrl}}/email/opened/{{messageId}}',
    clicked: '{{webhookBaseUrl}}/email/clicked/{{messageId}}',
    unsubscribed: '{{webhookBaseUrl}}/email/unsubscribed/{{messageId}}'
  }
};