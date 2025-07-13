import { BaseMicroserviceAdapter } from './base-microservice-adapter.js';
import { pool } from '../db.js';
import type { EventBus } from './event-bus.js';
import { emailProviderRegistry } from '../email-providers/email-provider-registry.js';
import { smsProviderRegistry } from '../sms-providers/sms-provider-registry.js';

interface NotificationCampaign {
  id: number;
  campaign_id: string;
  source_domain: string;
  source_event_type: string;
  campaign_name: string;
  delivery_channels: string[];
  audience_criteria: any;
  template_key: string;
  status: string;
  priority: number;
  rate_limit_per_hour: number;
}

interface NotificationTemplate {
  id: number;
  template_id: string;
  template_key: string;
  campaign_id: string;
  channel: string;
  locale: string;
  storage_type: string;
  subject_template?: string;
  body_template?: string;
  html_template?: string;
  required_variables: string[];
  is_active: boolean;
}

interface NotificationDelivery {
  id?: number;
  delivery_id: string;
  campaign_id: string;
  template_id: string;
  recipient_id?: string;
  recipient_email?: string;
  recipient_phone?: string;
  channel: string;
  provider: string;
  status: string;
  variables_used: any;
  error_message?: string;
}

interface NotificationPreference {
  user_id: string;
  source_domain: string;
  source_event_type?: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  frequency: string;
  preferred_locale: string;
}

export class NotificationServiceAdapter extends BaseMicroserviceAdapter {
  constructor(eventBus?: EventBus) {
    super({
      serviceName: 'notification-service',
      port: 3007,
      tables: [
        'notification_campaigns',
        'notification_templates',
        'notification_deliveries',
        'notification_preferences'
      ],
      readOnlyTables: [
        'users',
        'stories',
        'story_roleplay_templates',
        'story_invitations',
        'user_subscriptions'
      ]
    });
    if (eventBus) {
      this.eventBus = eventBus;
    }
    console.log('[NotificationAdapter] Initialized in monolith mode');
  }

  getTableOwnership(): string[] {
    return [
      'notification_campaigns',
      'notification_templates',
      'notification_deliveries',
      'notification_preferences'
    ];
  }

  async initialize(): Promise<void> {
    if (!this.eventBus) return;

    // Subscribe to all domain events that trigger notifications
    const domainEvents = [
      // Identity events
      'identity.user.registered',
      'identity.user.verified',
      'identity.password.reset',
      
      // Story events
      'story.published',
      'story.shared',
      'story.analysis.completed',
      
      // Collaboration events
      'collaboration.invitation.sent',
      'collaboration.invitation.accepted',
      'collaboration.invitation.declined',
      'collaboration.submission.completed',
      'collaboration.roleplay.ready',
      
      // Narration events
      'narration.generation.completed',
      'narration.ready',
      
      // Subscription events
      'subscription.created',
      'subscription.updated',
      'subscription.cancelled',
      'subscription.payment.failed'
    ];

    domainEvents.forEach(event => {
      this.eventBus!.subscribe(event, async (data: any) => {
        await this.handleDomainEvent(event, data);
      });
    });
  }

  /**
   * Handle domain events and trigger notifications
   */
  private async handleDomainEvent(eventType: string, data: any): Promise<void> {
    try {
      // Extract domain and event from eventType (e.g., 'collaboration.invitation.sent')
      const [domain, ...eventParts] = eventType.split('.');
      const event = eventParts.join('.');

      // Find active campaign for this event
      const campaign = await this.getCampaignForEvent(domain, eventType);
      if (!campaign || campaign.status !== 'active') {
        return; // No active campaign for this event
      }

      // Check if user has opted out
      const preferences = await this.getUserPreferences(data.userId);
      if (preferences && !this.shouldSendNotification(preferences, campaign)) {
        return;
      }

      // Get templates for all channels
      const templates = await this.getTemplatesForCampaign(campaign.campaign_id, preferences?.preferred_locale || 'en');

      // Send notifications through each channel
      for (const channel of campaign.delivery_channels) {
        const template = templates.find(t => t.channel === channel && t.is_active);
        if (!template) continue;

        await this.sendNotification({
          campaign,
          template,
          channel,
          recipient: data,
          variables: this.extractVariables(data, eventType)
        });
      }
    } catch (error) {
      console.error(`[NotificationAdapter] Error handling event ${eventType}:`, error);
    }
  }

  /**
   * Get campaign for a domain event
   */
  async getCampaignForEvent(domain: string, eventType: string): Promise<NotificationCampaign | null> {
    const result = await pool.query(
      `SELECT * FROM notification_campaigns 
       WHERE source_domain = $1 AND source_event_type = $2 AND status = 'active'
       LIMIT 1`,
      [domain, eventType]
    );
    return result.rows[0] || null;
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference | null> {
    if (!userId) return null;
    
    const result = await pool.query(
      `SELECT * FROM notification_preferences 
       WHERE user_id = $1 
       ORDER BY source_event_type NULLS LAST 
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private shouldSendNotification(preferences: NotificationPreference, campaign: NotificationCampaign): boolean {
    // Check if user has disabled notifications for this domain
    if (preferences.source_domain === campaign.source_domain && preferences.frequency === 'never') {
      return false;
    }

    // Check quiet hours if enabled
    if (preferences.quiet_hours_enabled) {
      const now = new Date();
      const currentHour = now.getHours();
      // TODO: Implement quiet hours check with timezone support
    }

    return true;
  }

  /**
   * Get templates for a campaign
   */
  async getTemplatesForCampaign(campaignId: string, locale: string): Promise<NotificationTemplate[]> {
    const result = await pool.query(
      `SELECT * FROM notification_templates 
       WHERE campaign_id = $1::uuid AND (locale = $2 OR locale = 'en')
       ORDER BY locale = $2 DESC`,
      [campaignId, locale]
    );
    return result.rows;
  }

  /**
   * Extract variables from event data
   */
  private extractVariables(data: any, eventType: string): Record<string, any> {
    const variables: Record<string, any> = {
      userName: data.userName || data.name || 'User',
      userEmail: data.email || data.userEmail,
      timestamp: new Date().toISOString(),
      eventType
    };

    // Add event-specific variables
    switch (eventType) {
      case 'collaboration.invitation.sent':
        variables.storyTitle = data.storyTitle;
        variables.inviterName = data.inviterName;
        variables.invitationUrl = data.invitationUrl;
        variables.role = data.role;
        break;
      
      case 'story.analysis.completed':
        variables.storyTitle = data.storyTitle;
        variables.characterCount = data.characterCount;
        variables.genre = data.genre;
        break;
      
      case 'narration.generation.completed':
        variables.storyTitle = data.storyTitle;
        variables.narratorProfile = data.narratorProfile;
        variables.duration = data.duration;
        break;
      
      case 'subscription.created':
        variables.planName = data.planName;
        variables.price = data.price;
        variables.features = data.features;
        break;
    }

    return variables;
  }

  /**
   * Send notification through appropriate channel
   */
  private async sendNotification(params: {
    campaign: NotificationCampaign;
    template: NotificationTemplate;
    channel: string;
    recipient: any;
    variables: Record<string, any>;
  }): Promise<void> {
    const { campaign, template, channel, recipient, variables } = params;

    // Create delivery record
    const delivery: NotificationDelivery = {
      delivery_id: crypto.randomUUID(),
      campaign_id: campaign.campaign_id,
      template_id: template.template_id,
      recipient_id: recipient.userId,
      recipient_email: recipient.email,
      recipient_phone: recipient.phone,
      channel,
      provider: '',
      status: 'pending',
      variables_used: variables
    };

    try {
      // Insert delivery record
      const deliveryResult = await pool.query(
        `INSERT INTO notification_deliveries 
         (delivery_id, campaign_id, template_id, recipient_id, recipient_email, 
          recipient_phone, channel, provider, status, variables_used)
         VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          delivery.delivery_id,
          delivery.campaign_id,
          delivery.template_id,
          delivery.recipient_id,
          delivery.recipient_email,
          delivery.recipient_phone,
          delivery.channel,
          delivery.provider,
          delivery.status,
          JSON.stringify(delivery.variables_used)
        ]
      );
      delivery.id = deliveryResult.rows[0].id;

      // Send through appropriate channel
      switch (channel) {
        case 'email':
          await this.sendEmailNotification(template, recipient, variables, delivery);
          break;
        case 'sms':
          await this.sendSmsNotification(template, recipient, variables, delivery);
          break;
        case 'push':
          await this.sendPushNotification(template, recipient, variables, delivery);
          break;
        case 'in_app':
          await this.sendInAppNotification(template, recipient, variables, delivery);
          break;
      }

      // Update campaign analytics
      await this.updateCampaignAnalytics(campaign.id, 'sent');

    } catch (error) {
      console.error(`[NotificationAdapter] Error sending ${channel} notification:`, error);
      
      // Update delivery status to failed
      if (delivery.id) {
        await pool.query(
          `UPDATE notification_deliveries 
           SET status = 'failed', error_message = $1, sent_at = NOW()
           WHERE id = $2`,
          [error instanceof Error ? error.message : 'Unknown error', delivery.id]
        );
      }
      
      await this.updateCampaignAnalytics(campaign.id, 'failed');
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    template: NotificationTemplate,
    recipient: any,
    variables: Record<string, any>,
    delivery: NotificationDelivery
  ): Promise<void> {
    const provider = emailProviderRegistry.getProvider();
    if (!provider) {
      throw new Error('No email provider available');
    }

    // Interpolate template
    const subject = this.interpolateTemplate(template.subject_template || '', variables);
    const text = this.interpolateTemplate(template.body_template || '', variables);
    const html = this.interpolateTemplate(template.html_template || '', variables);

    // Send email
    const result = await provider.send({
      to: recipient.email,
      from: process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com',
      subject,
      text,
      html
    });

    // Update delivery record
    await pool.query(
      `UPDATE notification_deliveries 
       SET status = 'sent', provider = $1, provider_message_id = $2, sent_at = NOW()
       WHERE id = $3`,
      [provider.name, result.messageId, delivery.id]
    );

    // Emit notification sent event
    this.publishEvent('notification.sent', {
      deliveryId: delivery.delivery_id,
      channel: 'email',
      recipient: recipient.email
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSmsNotification(
    template: NotificationTemplate,
    recipient: any,
    variables: Record<string, any>,
    delivery: NotificationDelivery
  ): Promise<void> {
    // Interpolate template
    const message = this.interpolateTemplate(template.body_template || '', variables);

    // Send SMS using SMS provider registry
    const result = await smsProviderRegistry.sendSMS({
      to: recipient.phone,
      message
    });

    // Update delivery record
    if (result.success) {
      await pool.query(
        `UPDATE notification_deliveries 
         SET status = 'sent', provider = $1, provider_message_id = $2, sent_at = NOW()
         WHERE id = $3`,
        ['sms', result.messageId || '', delivery.id]
      );
      
      // Emit notification sent event
      this.publishEvent('notification.sent', {
        deliveryId: delivery.delivery_id,
        channel: 'sms',
        recipient: recipient.phone
      });
    } else {
      await pool.query(
        `UPDATE notification_deliveries 
         SET status = 'failed', error_message = $1
         WHERE id = $2`,
        [result.error || 'SMS send failed', delivery.id]
      );
      throw new Error(result.error || 'SMS send failed');
    }
  }

  /**
   * Send push notification (placeholder)
   */
  private async sendPushNotification(
    template: NotificationTemplate,
    recipient: any,
    variables: Record<string, any>,
    delivery: NotificationDelivery
  ): Promise<void> {
    // TODO: Implement push notification when provider is available
    console.log('[NotificationAdapter] Push notifications not yet implemented');
    
    await pool.query(
      `UPDATE notification_deliveries 
       SET status = 'failed', error_message = 'Push notifications not implemented'
       WHERE id = $1`,
      [delivery.id]
    );
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(
    template: NotificationTemplate,
    recipient: any,
    variables: Record<string, any>,
    delivery: NotificationDelivery
  ): Promise<void> {
    // In-app notifications are stored in database for frontend to display
    const message = this.interpolateTemplate(template.body_template || '', variables);

    // Store in-app notification (would need a separate table in production)
    // For now, just update delivery status
    await pool.query(
      `UPDATE notification_deliveries 
       SET status = 'delivered', delivered_at = NOW()
       WHERE id = $1`,
      [delivery.id]
    );

    // Emit notification for real-time updates
    this.publishEvent('notification.in_app.created', {
      userId: recipient.userId,
      message,
      deliveryId: delivery.delivery_id
    });
  }

  /**
   * Simple template interpolation
   */
  private interpolateTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  /**
   * Update campaign analytics
   */
  private async updateCampaignAnalytics(campaignId: number, action: 'sent' | 'delivered' | 'failed'): Promise<void> {
    const column = action === 'sent' ? 'total_sent' : 
                   action === 'delivered' ? 'total_delivered' : 'total_failed';
    
    await pool.query(
      `UPDATE notification_campaigns 
       SET ${column} = ${column} + 1, updated_at = NOW()
       WHERE id = $1`,
      [campaignId]
    );
  }

  /**
   * Create notification campaign
   */
  async createCampaign(params: {
    sourceDomain: string;
    sourceEventType: string;
    campaignName: string;
    templateKey: string;
    deliveryChannels?: string[];
    priority?: number;
  }): Promise<NotificationCampaign> {
    const result = await pool.query(
      `INSERT INTO notification_campaigns 
       (campaign_id, source_domain, source_event_type, campaign_name, 
        template_key, delivery_channels, priority)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        params.sourceDomain,
        params.sourceEventType,
        params.campaignName,
        params.templateKey,
        JSON.stringify(params.deliveryChannels || ['email']),
        params.priority || 100
      ]
    );

    return result.rows[0];
  }

  /**
   * Create notification template
   */
  async createTemplate(params: {
    campaignId: string;
    templateKey: string;
    channel: string;
    locale?: string;
    subjectTemplate?: string;
    bodyTemplate: string;
    htmlTemplate?: string;
    requiredVariables?: string[];
  }): Promise<NotificationTemplate> {
    const result = await pool.query(
      `INSERT INTO notification_templates 
       (template_id, campaign_id, template_key, channel, locale,
        subject_template, body_template, html_template, required_variables)
       VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        params.campaignId,
        params.templateKey,
        params.channel,
        params.locale || 'en',
        params.subjectTemplate,
        params.bodyTemplate,
        params.htmlTemplate,
        JSON.stringify(params.requiredVariables || [])
      ]
    );

    return result.rows[0];
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreference>): Promise<void> {
    await pool.query(
      `INSERT INTO notification_preferences 
       (user_id, source_domain, email_enabled, sms_enabled, push_enabled, 
        in_app_enabled, frequency, preferred_locale)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, source_domain, source_event_type) 
       DO UPDATE SET
         email_enabled = $3,
         sms_enabled = $4,
         push_enabled = $5,
         in_app_enabled = $6,
         frequency = $7,
         preferred_locale = $8,
         updated_at = NOW()`,
      [
        userId,
        preferences.source_domain || 'global',
        preferences.email_enabled ?? true,
        preferences.sms_enabled ?? true,
        preferences.push_enabled ?? true,
        preferences.in_app_enabled ?? true,
        preferences.frequency || 'immediate',
        preferences.preferred_locale || 'en'
      ]
    );
  }
}

// Export singleton instance
export const notificationAdapter = new NotificationServiceAdapter();