/**
 * Narration Invitation Email Template
 * Used when inviting users to create their own narration for a story
 */

import { EmailTemplate } from './types';

export const narrationInvitationTemplate: EmailTemplate = {
  id: 'narration-invitation',
  name: 'Narration Invitation',
  subject: 'Create Your Narration for "{{storyTitle}}"',
  description: 'Sent when a user invites someone to create their own narration version of a story',
  
  // Variables required for this template
  variables: [
    'recipientName',
    'senderName',
    'storyTitle',
    'conversationStyle',
    'invitationLink',
    'expiresIn'
  ],
  
  // HTML template with placeholders
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; text-align: center;">Create Your Own Narration!</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 15px;">
          Hi {{recipientName}}!
        </p>
        
        <p style="font-size: 16px; margin-bottom: 15px;">
          <strong>{{senderName}}</strong> has shared their story with you and wants to hear it in YOUR voice!
        </p>
        
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 0;"><strong>Story:</strong> {{storyTitle}}</p>
          <p style="margin: 10px 0 0 0;"><strong>Relationship Context:</strong> {{conversationStyle}}</p>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Experience how stories sound different based on relationships. Record your voice to create a personalized narration!
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{invitationLink}}" 
             style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
            Create Your Narration
          </a>
        </div>
        
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #2e7d32;">What happens next:</h4>
          <ol style="margin: 0; padding-left: 20px; color: #555;">
            <li>Listen to the story with {{senderName}}'s narration</li>
            <li>Record your voice samples (takes 2 minutes)</li>
            <li>Get your personalized narration instantly</li>
            <li>Share your version back with {{senderName}}!</li>
          </ol>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          This invitation expires in {{expiresIn}}. If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="{{invitationLink}}">{{invitationLink}}</a>
        </p>
      </div>
      
      <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
        <p>Discover how relationships change the way we tell stories.</p>
      </div>
    </div>
  `,
  
  // Plain text version
  text: `
Create Your Own Narration!

Hi {{recipientName}}!

{{senderName}} has shared their story with you and wants to hear it in YOUR voice!

Story: {{storyTitle}}
Relationship Context: {{conversationStyle}}

Experience how stories sound different based on relationships. Record your voice to create a personalized narration!

What happens next:
1. Listen to the story with {{senderName}}'s narration
2. Record your voice samples (takes 2 minutes)
3. Get your personalized narration instantly
4. Share your version back with {{senderName}}!

Click here to create your narration:
{{invitationLink}}

This invitation expires in {{expiresIn}}.

Discover how relationships change the way we tell stories.
  `,
  
  // Webhook placeholders for analytics
  webhooks: {
    opened: '{{webhookBaseUrl}}/email/opened/{{messageId}}',
    clicked: '{{webhookBaseUrl}}/email/clicked/{{messageId}}',
    unsubscribed: '{{webhookBaseUrl}}/email/unsubscribed/{{messageId}}'
  },
  
  // Provider-specific configurations
  providerConfig: {
    sendgrid: {
      categories: ['invitation', 'narration']
    },
    mailgun: {
      tags: ['invitation', 'narration'],
      tracking: true
    }
  }
};