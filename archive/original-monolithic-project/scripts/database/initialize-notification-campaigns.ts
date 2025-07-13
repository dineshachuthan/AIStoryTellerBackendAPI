#!/usr/bin/env tsx
/**
 * Initialize notification campaigns and templates
 * This script sets up the initial notification infrastructure
 */

import { pool } from '../../server/db.js';
import { notificationAdapter } from '../../server/microservices/notification-service-adapter.js';

interface CampaignTemplate {
  campaign: {
    sourceDomain: string;
    sourceEventType: string;
    campaignName: string;
    templateKey: string;
    deliveryChannels: string[];
    priority?: number;
  };
  templates: {
    channel: string;
    locale: string;
    subjectTemplate?: string;
    bodyTemplate: string;
    htmlTemplate?: string;
    requiredVariables: string[];
  }[];
}

const campaigns: CampaignTemplate[] = [
  // Identity domain campaigns
  {
    campaign: {
      sourceDomain: 'identity',
      sourceEventType: 'identity.user.registered',
      campaignName: 'Welcome New Users',
      templateKey: 'welcome_email',
      deliveryChannels: ['email'],
      priority: 100
    },
    templates: [
      {
        channel: 'email',
        locale: 'en',
        subjectTemplate: 'Welcome to Our Storytelling Platform, {{userName}}!',
        bodyTemplate: 'Hi {{userName}},\n\nWelcome to our collaborative storytelling platform! We\'re excited to have you join our creative community.\n\nGet started by creating your first story or exploring stories shared by others.\n\nBest regards,\nThe Team',
        htmlTemplate: '<h2>Welcome {{userName}}!</h2><p>Welcome to our collaborative storytelling platform! We\'re excited to have you join our creative community.</p><p>Get started by creating your first story or exploring stories shared by others.</p><p>Best regards,<br>The Team</p>',
        requiredVariables: ['userName']
      }
    ]
  },
  {
    campaign: {
      sourceDomain: 'identity',
      sourceEventType: 'identity.password.reset',
      campaignName: 'Password Reset Request',
      templateKey: 'password_reset',
      deliveryChannels: ['email'],
      priority: 500
    },
    templates: [
      {
        channel: 'email',
        locale: 'en',
        subjectTemplate: 'Password Reset Request',
        bodyTemplate: 'Hi {{userName}},\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n{{resetLink}}\n\nThis link will expire in 1 hour.\n\nIf you didn\'t request this, please ignore this email.\n\nBest regards,\nThe Security Team',
        htmlTemplate: '<h2>Password Reset Request</h2><p>Hi {{userName}},</p><p>We received a request to reset your password. Click the link below to create a new password:</p><p><a href="{{resetLink}}">Reset Password</a></p><p>This link will expire in 1 hour.</p><p>If you didn\'t request this, please ignore this email.</p><p>Best regards,<br>The Security Team</p>',
        requiredVariables: ['userName', 'resetLink']
      }
    ]
  },

  // Collaboration domain campaigns
  {
    campaign: {
      sourceDomain: 'collaboration',
      sourceEventType: 'collaboration.invitation.sent',
      campaignName: 'Story Collaboration Invitation',
      templateKey: 'collaboration_invitation',
      deliveryChannels: ['email', 'sms'],
      priority: 200
    },
    templates: [
      {
        channel: 'email',
        locale: 'en',
        subjectTemplate: '{{inviterName}} invited you to collaborate on "{{storyTitle}}"',
        bodyTemplate: 'Hi there!\n\n{{inviterName}} has invited you to collaborate on their story "{{storyTitle}}".\n\nYour role: {{role}}\n\nClick here to accept the invitation: {{invitationUrl}}\n\nThis invitation expires in 5 days.\n\nHappy storytelling!',
        htmlTemplate: '<h2>You\'ve been invited to collaborate!</h2><p>{{inviterName}} has invited you to collaborate on their story "<strong>{{storyTitle}}</strong>".</p><p><strong>Your role:</strong> {{role}}</p><p><a href="{{invitationUrl}}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p><p>This invitation expires in 5 days.</p><p>Happy storytelling!</p>',
        requiredVariables: ['inviterName', 'storyTitle', 'role', 'invitationUrl']
      },
      {
        channel: 'sms',
        locale: 'en',
        bodyTemplate: '{{inviterName}} invited you to collaborate on "{{storyTitle}}". Accept here: {{invitationUrl}}',
        requiredVariables: ['inviterName', 'storyTitle', 'invitationUrl']
      }
    ]
  },

  // Story domain campaigns
  {
    campaign: {
      sourceDomain: 'story',
      sourceEventType: 'story.analysis.completed',
      campaignName: 'Story Analysis Complete',
      templateKey: 'story_analysis_complete',
      deliveryChannels: ['in_app'],
      priority: 50
    },
    templates: [
      {
        channel: 'in_app',
        locale: 'en',
        bodyTemplate: 'Your story "{{storyTitle}}" has been analyzed! We found {{characterCount}} characters and identified it as {{genre}}.',
        requiredVariables: ['storyTitle', 'characterCount', 'genre']
      }
    ]
  },
  {
    campaign: {
      sourceDomain: 'story',
      sourceEventType: 'story.published',
      campaignName: 'Story Published',
      templateKey: 'story_published',
      deliveryChannels: ['email', 'in_app'],
      priority: 100
    },
    templates: [
      {
        channel: 'email',
        locale: 'en',
        subjectTemplate: 'Your story "{{storyTitle}}" is now live!',
        bodyTemplate: 'Congratulations {{userName}}!\n\nYour story "{{storyTitle}}" has been published and is now available for others to enjoy.\n\nShare it with friends and start collecting feedback!\n\nBest regards,\nThe Team',
        htmlTemplate: '<h2>Your story is live!</h2><p>Congratulations {{userName}}!</p><p>Your story "<strong>{{storyTitle}}</strong>" has been published and is now available for others to enjoy.</p><p>Share it with friends and start collecting feedback!</p><p>Best regards,<br>The Team</p>',
        requiredVariables: ['userName', 'storyTitle']
      },
      {
        channel: 'in_app',
        locale: 'en',
        bodyTemplate: 'Your story "{{storyTitle}}" has been published successfully!',
        requiredVariables: ['storyTitle']
      }
    ]
  },

  // Narration domain campaigns
  {
    campaign: {
      sourceDomain: 'narration',
      sourceEventType: 'narration.generation.completed',
      campaignName: 'Narration Ready',
      templateKey: 'narration_ready',
      deliveryChannels: ['email', 'in_app'],
      priority: 100
    },
    templates: [
      {
        channel: 'email',
        locale: 'en',
        subjectTemplate: 'Your narration for "{{storyTitle}}" is ready!',
        bodyTemplate: 'Hi {{userName}},\n\nGreat news! The {{narratorProfile}} narration for your story "{{storyTitle}}" is complete.\n\nDuration: {{duration}} seconds\n\nListen to it now and share with others!\n\nBest regards,\nThe Team',
        htmlTemplate: '<h2>Your narration is ready!</h2><p>Hi {{userName}},</p><p>Great news! The <strong>{{narratorProfile}}</strong> narration for your story "<strong>{{storyTitle}}</strong>" is complete.</p><p><strong>Duration:</strong> {{duration}} seconds</p><p>Listen to it now and share with others!</p><p>Best regards,<br>The Team</p>',
        requiredVariables: ['userName', 'storyTitle', 'narratorProfile', 'duration']
      },
      {
        channel: 'in_app',
        locale: 'en',
        bodyTemplate: 'Your {{narratorProfile}} narration for "{{storyTitle}}" is ready! ({{duration}}s)',
        requiredVariables: ['narratorProfile', 'storyTitle', 'duration']
      }
    ]
  },

  // Subscription domain campaigns
  {
    campaign: {
      sourceDomain: 'subscription',
      sourceEventType: 'subscription.created',
      campaignName: 'Subscription Confirmation',
      templateKey: 'subscription_created',
      deliveryChannels: ['email'],
      priority: 300
    },
    templates: [
      {
        channel: 'email',
        locale: 'en',
        subjectTemplate: 'Welcome to {{planName}} Plan!',
        bodyTemplate: 'Hi {{userName}},\n\nThank you for subscribing to our {{planName}} plan!\n\nYour subscription includes:\n{{features}}\n\nMonthly price: ${{price}}\n\nWe\'re excited to support your creative journey!\n\nBest regards,\nThe Team',
        htmlTemplate: '<h2>Welcome to {{planName}}!</h2><p>Hi {{userName}},</p><p>Thank you for subscribing to our <strong>{{planName}}</strong> plan!</p><p><strong>Your subscription includes:</strong></p><p>{{features}}</p><p><strong>Monthly price:</strong> ${{price}}</p><p>We\'re excited to support your creative journey!</p><p>Best regards,<br>The Team</p>',
        requiredVariables: ['userName', 'planName', 'features', 'price']
      }
    ]
  },
  {
    campaign: {
      sourceDomain: 'subscription',
      sourceEventType: 'subscription.payment.failed',
      campaignName: 'Payment Failed',
      templateKey: 'payment_failed',
      deliveryChannels: ['email', 'sms'],
      priority: 1000
    },
    templates: [
      {
        channel: 'email',
        locale: 'en',
        subjectTemplate: 'Payment Failed - Action Required',
        bodyTemplate: 'Hi {{userName}},\n\nWe were unable to process your payment for the {{planName}} plan.\n\nPlease update your payment method to avoid service interruption.\n\nUpdate payment: {{paymentUrl}}\n\nBest regards,\nThe Billing Team',
        htmlTemplate: '<h2>Payment Failed</h2><p>Hi {{userName}},</p><p>We were unable to process your payment for the <strong>{{planName}}</strong> plan.</p><p>Please update your payment method to avoid service interruption.</p><p><a href="{{paymentUrl}}" style="background: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Update Payment Method</a></p><p>Best regards,<br>The Billing Team</p>',
        requiredVariables: ['userName', 'planName', 'paymentUrl']
      },
      {
        channel: 'sms',
        locale: 'en',
        bodyTemplate: 'Payment failed for {{planName}} plan. Update payment method: {{paymentUrl}}',
        requiredVariables: ['planName', 'paymentUrl']
      }
    ]
  }
];

async function initializeCampaigns() {
  console.log('🚀 Initializing notification campaigns and templates...\n');

  let campaignsCreated = 0;
  let templatesCreated = 0;

  for (const campaignData of campaigns) {
    try {
      // Check if campaign already exists
      const existingCampaign = await pool.query(
        'SELECT campaign_id FROM notification_campaigns WHERE source_domain = $1 AND source_event_type = $2',
        [campaignData.campaign.sourceDomain, campaignData.campaign.sourceEventType]
      );

      let campaignId: string;

      if (existingCampaign.rows.length > 0) {
        campaignId = existingCampaign.rows[0].campaign_id;
        console.log(`✓ Campaign already exists: ${campaignData.campaign.campaignName}`);
      } else {
        // Create campaign
        const campaign = await notificationAdapter.createCampaign(campaignData.campaign);
        campaignId = campaign.campaign_id;
        campaignsCreated++;
        console.log(`✅ Created campaign: ${campaignData.campaign.campaignName}`);
      }

      // Create templates for the campaign
      for (const template of campaignData.templates) {
        // Check if template already exists
        const existingTemplate = await pool.query(
          'SELECT template_id FROM notification_templates WHERE campaign_id = $1::uuid AND channel = $2 AND locale = $3',
          [campaignId, template.channel, template.locale]
        );

        if (existingTemplate.rows.length > 0) {
          console.log(`  ✓ Template already exists: ${template.channel}/${template.locale}`);
        } else {
          await notificationAdapter.createTemplate({
            campaignId,
            templateKey: campaignData.campaign.templateKey,
            ...template
          });
          templatesCreated++;
          console.log(`  ✅ Created template: ${template.channel}/${template.locale}`);
        }
      }

      console.log(''); // Add spacing between campaigns
    } catch (error) {
      console.error(`❌ Error creating campaign ${campaignData.campaign.campaignName}:`, error);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  - Campaigns created: ${campaignsCreated}`);
  console.log(`  - Templates created: ${templatesCreated}`);
  console.log(`  - Total campaigns: ${campaigns.length}`);
  console.log(`  - Total templates: ${campaigns.reduce((sum, c) => sum + c.templates.length, 0)}`);
}

// Run the initialization
initializeCampaigns()
  .then(() => {
    console.log('\n✨ Notification campaign initialization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to initialize campaigns:', error);
    process.exit(1);
  });