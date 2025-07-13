# Notification Platform - Domain-Driven Design Schema

## Domain Context Integration

This notification platform is designed as a **Supporting Domain** within the existing microservices architecture, serving the **Collaboration Context** (Core Domain) and other bounded contexts.

### Domain Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT-DRIVEN ARCHITECTURE                     │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Core Domain    │ Supporting      │ Generic Subdomain           │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ • Storytelling  │ • Subscription  │ • Identity Management       │
│ • Collaboration │ • Analytics     │ • Notification ←━━━━━━━━━━━━┓ │
│ • Narration     │ • Video Gen     │ • Payment Processing        ┃ │
└─────────────────┴─────────────────┴─────────────────────────────┨ │
                                                                  ┃ │
┌─────────────────────────────────────────────────────────────────┛ │
│                    NOTIFICATION DOMAIN                            │
│                                                                   │
│  Aggregates:                                                      │
│  • NotificationCampaign (Root)                                    │
│  • NotificationTemplate (Root)                                    │
│  • NotificationDelivery (Root)                                    │
│  • NotificationPreference (Root)                                  │
│                                                                   │
│  Domain Events:                                                   │
│  • NotificationRequested                                          │
│  • NotificationSent                                               │
│  • NotificationDelivered                                          │
│  • NotificationFailed                                             │
│  • TemplateUpdated                                                │
│  • PreferenceChanged                                              │
└───────────────────────────────────────────────────────────────────┘
```

## Bounded Context: Notification Domain

### Domain Model Overview

The Notification Domain serves as a **Generic Subdomain** that provides notification capabilities to all other bounded contexts. It follows the **Publisher-Subscriber** pattern with the existing EventBus infrastructure.

### Core Aggregates

#### 1. **NotificationCampaign** (Aggregate Root)
**Domain Purpose**: Represents a notification campaign triggered by domain events from other contexts.

**Business Rules**:
- One campaign per domain event type per context
- Campaign must specify target audience criteria
- Campaign execution depends on user preferences
- Campaign tracks delivery success/failure rates

#### 2. **NotificationTemplate** (Aggregate Root)
**Domain Purpose**: Manages notification content templates with localization support.

**Business Rules**:
- Templates must support multiple storage backends (file, S3, CDN)
- Templates require localization for international users
- Templates must validate required variables
- Templates can have fallback chains for missing localizations

#### 3. **NotificationDelivery** (Aggregate Root)
**Domain Purpose**: Tracks individual notification delivery attempts and outcomes.

**Business Rules**:
- Each delivery attempt must be tracked for analytics
- Failed deliveries trigger retry logic based on provider rules
- Delivery preferences override campaign defaults
- Delivery tracking includes provider-specific metrics

#### 4. **NotificationPreference** (Aggregate Root)
**Domain Purpose**: Manages user notification preferences and delivery settings.

**Business Rules**:
- Users can opt-out of specific notification types
- Users can choose preferred delivery channels (email, SMS, push)
- Users can set delivery time preferences
- Preferences override campaign settings

### Domain Events Integration

The Notification Domain **subscribes to** events from other domains:

```typescript
// Events from Collaboration Context
- 'collaboration.invitation.sent'
- 'collaboration.invitation.accepted'
- 'collaboration.invitation.declined'
- 'collaboration.submission.completed'
- 'collaboration.roleplay.ready'

// Events from Story Context
- 'story.published'
- 'story.shared'
- 'story.collaboration.completed'

// Events from Narration Context
- 'narration.generation.completed'
- 'narration.ready'

// Events from Identity Context
- 'user.registered'
- 'user.preferences.updated'
```

The Notification Domain **publishes** events:

```typescript
// Domain Events Published
- 'notification.requested'
- 'notification.sent'
- 'notification.delivered'
- 'notification.failed'
- 'notification.template.updated'
- 'notification.preference.changed'
```

## Database Schema Design

### 1. **notification_campaigns** (Aggregate Root Table)
```sql
-- Notification Campaign Aggregate
CREATE TABLE IF NOT EXISTS notification_campaigns (
    id SERIAL PRIMARY KEY,
    
    -- Aggregate Identity
    campaign_id UUID DEFAULT gen_random_uuid() NOT NULL,
    
    -- Domain Event Integration
    source_domain VARCHAR(50) NOT NULL, -- 'collaboration', 'story', 'narration', 'identity'
    source_event_type VARCHAR(100) NOT NULL, -- 'collaboration.invitation.sent', etc.
    
    -- Campaign Configuration
    campaign_name VARCHAR(255) NOT NULL,
    campaign_description TEXT,
    delivery_channels JSONB DEFAULT '["email"]' NOT NULL, -- ['email', 'sms', 'push']
    
    -- Audience Targeting
    audience_criteria JSONB DEFAULT '{}' NOT NULL, -- Targeting rules
    locale_targeting JSONB DEFAULT '{}' NOT NULL, -- Locale-specific targeting
    
    -- Template Association
    template_key VARCHAR(100) NOT NULL, -- References notification_templates
    
    -- Campaign Status
    status VARCHAR(20) DEFAULT 'active' NOT NULL, -- 'active', 'paused', 'archived'
    priority INTEGER DEFAULT 100 NOT NULL, -- 1-1000, higher = more priority
    
    -- Delivery Rules
    delivery_rules JSONB DEFAULT '{}' NOT NULL, -- Retry, throttling, etc.
    rate_limit_per_hour INTEGER DEFAULT 1000 NOT NULL,
    
    -- Audit & Tracking
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by VARCHAR DEFAULT 'system' NOT NULL,
    updated_by VARCHAR DEFAULT 'system' NOT NULL,
    
    -- DDD Constraints
    CONSTRAINT chk_notification_campaigns_source_domain 
        CHECK (source_domain IN ('collaboration', 'story', 'narration', 'identity', 'subscription')),
    CONSTRAINT chk_notification_campaigns_status 
        CHECK (status IN ('active', 'paused', 'archived')),
    CONSTRAINT chk_notification_campaigns_priority 
        CHECK (priority >= 1 AND priority <= 1000),
    CONSTRAINT chk_notification_campaigns_rate_limit 
        CHECK (rate_limit_per_hour > 0 AND rate_limit_per_hour <= 10000),
    
    -- Unique campaign per domain event
    CONSTRAINT uq_notification_campaigns_domain_event 
        UNIQUE (source_domain, source_event_type)
);
```

### 2. **notification_templates** (Aggregate Root Table)
```sql
-- Notification Template Aggregate
CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    
    -- Aggregate Identity
    template_id UUID DEFAULT gen_random_uuid() NOT NULL,
    template_key VARCHAR(100) NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    
    -- Domain Context
    notification_type VARCHAR(50) NOT NULL, -- 'invitation', 'completion', 'reminder', 'alert'
    delivery_channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push'
    
    -- Localization Support
    language VARCHAR(10) DEFAULT 'en' NOT NULL,
    locale VARCHAR(10) DEFAULT 'US' NOT NULL,
    country_code VARCHAR(3) DEFAULT 'USA' NOT NULL,
    
    -- Storage-Agnostic Template References
    template_source VARCHAR(20) DEFAULT 'file' NOT NULL, -- 'file', 's3', 'database', 'cdn'
    template_file_id VARCHAR(100) NOT NULL,
    template_storage_path VARCHAR(500) NOT NULL,
    template_storage_config JSONB DEFAULT '{}' NOT NULL,
    
    -- Template Content (for database storage)
    subject_template TEXT,
    content_template TEXT,
    html_template TEXT,
    
    -- Template Metadata
    required_variables JSONB DEFAULT '[]' NOT NULL, -- Required template variables
    optional_variables JSONB DEFAULT '[]' NOT NULL, -- Optional template variables
    provider_specific_config JSONB DEFAULT '{}' NOT NULL,
    
    -- Fallback Chain
    fallback_template_id UUID, -- References another template
    
    -- Template Management
    version INTEGER DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    uses_external_storage BOOLEAN DEFAULT TRUE NOT NULL,
    cache_duration_hours INTEGER DEFAULT 24 NOT NULL,
    last_fetched_at TIMESTAMP,
    
    -- Translation Management
    translation_status VARCHAR(20) DEFAULT 'complete' NOT NULL,
    translation_quality_score DECIMAL(3,2), -- 0.00-1.00
    
    -- Audit & Tracking
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by VARCHAR DEFAULT 'system' NOT NULL,
    updated_by VARCHAR DEFAULT 'system' NOT NULL,
    
    -- DDD Constraints
    CONSTRAINT chk_notification_templates_notification_type 
        CHECK (notification_type IN ('invitation', 'completion', 'reminder', 'alert', 'welcome')),
    CONSTRAINT chk_notification_templates_delivery_channel 
        CHECK (delivery_channel IN ('email', 'sms', 'push')),
    CONSTRAINT chk_notification_templates_language 
        CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    CONSTRAINT chk_notification_templates_locale 
        CHECK (locale ~ '^[A-Z]{2}$'),
    CONSTRAINT chk_notification_templates_country_code 
        CHECK (country_code ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_notification_templates_template_source 
        CHECK (template_source IN ('file', 's3', 'database', 'cdn', 'github')),
    CONSTRAINT chk_notification_templates_version 
        CHECK (version > 0),
    CONSTRAINT chk_notification_templates_cache_duration 
        CHECK (cache_duration_hours > 0 AND cache_duration_hours <= 168),
    CONSTRAINT chk_notification_templates_translation_status 
        CHECK (translation_status IN ('complete', 'partial', 'auto', 'pending')),
    CONSTRAINT chk_notification_templates_quality_score 
        CHECK (translation_quality_score IS NULL OR (translation_quality_score >= 0.00 AND translation_quality_score <= 1.00)),
    
    -- Foreign key for fallback template
    CONSTRAINT fk_notification_templates_fallback 
        FOREIGN KEY (fallback_template_id) REFERENCES notification_templates(template_id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    
    -- Unique template per type, channel, and locale
    CONSTRAINT uq_notification_templates_unique 
        UNIQUE (template_key, delivery_channel, language, locale, version)
);
```

### 3. **notification_deliveries** (Aggregate Root Table)
```sql
-- Notification Delivery Aggregate
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id SERIAL PRIMARY KEY,
    
    -- Aggregate Identity
    delivery_id UUID DEFAULT gen_random_uuid() NOT NULL,
    
    -- Domain Event Context
    source_event_id UUID NOT NULL, -- Original domain event that triggered this
    source_domain VARCHAR(50) NOT NULL,
    source_event_type VARCHAR(100) NOT NULL,
    
    -- Campaign & Template Association
    campaign_id UUID NOT NULL,
    template_id UUID NOT NULL,
    
    -- Recipient Information
    recipient_user_id VARCHAR, -- Internal user ID if authenticated
    recipient_email VARCHAR,
    recipient_phone VARCHAR,
    recipient_push_token VARCHAR,
    
    -- Delivery Configuration
    delivery_channel VARCHAR(20) NOT NULL,
    delivery_priority INTEGER DEFAULT 100 NOT NULL,
    
    -- Delivery Status
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    delivery_attempts INTEGER DEFAULT 0 NOT NULL,
    last_attempt_at TIMESTAMP,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    -- Provider Information
    provider_name VARCHAR(50), -- 'mailgun', 'sendgrid', 'twilio', etc.
    provider_message_id VARCHAR(255), -- Provider's message ID
    provider_response JSONB DEFAULT '{}' NOT NULL,
    
    -- Delivery Tracking
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    bounced_at TIMESTAMP,
    complained_at TIMESTAMP,
    
    -- Error Handling
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    next_retry_at TIMESTAMP,
    
    -- Template Data
    template_variables JSONB DEFAULT '{}' NOT NULL,
    rendered_subject TEXT,
    rendered_content TEXT,
    
    -- Audit & Tracking
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- DDD Constraints
    CONSTRAINT chk_notification_deliveries_source_domain 
        CHECK (source_domain IN ('collaboration', 'story', 'narration', 'identity', 'subscription')),
    CONSTRAINT chk_notification_deliveries_delivery_channel 
        CHECK (delivery_channel IN ('email', 'sms', 'push')),
    CONSTRAINT chk_notification_deliveries_status 
        CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')),
    CONSTRAINT chk_notification_deliveries_priority 
        CHECK (delivery_priority >= 1 AND delivery_priority <= 1000),
    CONSTRAINT chk_notification_deliveries_attempts 
        CHECK (delivery_attempts >= 0 AND delivery_attempts <= 10),
    CONSTRAINT chk_notification_deliveries_retry_count 
        CHECK (retry_count >= 0 AND retry_count <= 10),
    
    -- Foreign key constraints
    CONSTRAINT fk_notification_deliveries_campaign 
        FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(campaign_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notification_deliveries_template 
        FOREIGN KEY (template_id) REFERENCES notification_templates(template_id) 
        ON DELETE CASCADE ON UPDATE CASCADE
);
```

### 4. **notification_preferences** (Aggregate Root Table)
```sql
-- Notification Preference Aggregate
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    
    -- Aggregate Identity
    preference_id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id VARCHAR NOT NULL,
    
    -- Preference Configuration
    notification_type VARCHAR(50) NOT NULL,
    delivery_channel VARCHAR(20) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Delivery Preferences
    preferred_time_start TIME DEFAULT '09:00:00' NOT NULL,
    preferred_time_end TIME DEFAULT '21:00:00' NOT NULL,
    preferred_timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
    
    -- Frequency Control
    max_daily_notifications INTEGER DEFAULT 10 NOT NULL,
    max_weekly_notifications INTEGER DEFAULT 50 NOT NULL,
    digest_frequency VARCHAR(20) DEFAULT 'immediate' NOT NULL, -- 'immediate', 'hourly', 'daily'
    
    -- Localization Preferences
    preferred_language VARCHAR(10) DEFAULT 'en' NOT NULL,
    preferred_locale VARCHAR(10) DEFAULT 'US' NOT NULL,
    
    -- Audit & Tracking
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- DDD Constraints
    CONSTRAINT chk_notification_preferences_notification_type 
        CHECK (notification_type IN ('invitation', 'completion', 'reminder', 'alert', 'welcome', 'all')),
    CONSTRAINT chk_notification_preferences_delivery_channel 
        CHECK (delivery_channel IN ('email', 'sms', 'push', 'all')),
    CONSTRAINT chk_notification_preferences_digest_frequency 
        CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
    CONSTRAINT chk_notification_preferences_language 
        CHECK (preferred_language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    CONSTRAINT chk_notification_preferences_locale 
        CHECK (preferred_locale ~ '^[A-Z]{2}$'),
    CONSTRAINT chk_notification_preferences_daily_limit 
        CHECK (max_daily_notifications >= 0 AND max_daily_notifications <= 100),
    CONSTRAINT chk_notification_preferences_weekly_limit 
        CHECK (max_weekly_notifications >= 0 AND max_weekly_notifications <= 500),
    
    -- Unique preference per user, type, and channel
    CONSTRAINT uq_notification_preferences_unique 
        UNIQUE (user_id, notification_type, delivery_channel)
);
```

## Event-Driven Integration Pattern

### Notification Service Adapter

```typescript
// Integration with existing microservices pattern
export class NotificationServiceAdapter extends BaseMicroserviceAdapter {
  constructor() {
    const ownedTables = [
      'notification_campaigns',
      'notification_templates', 
      'notification_deliveries',
      'notification_preferences'
    ];
    
    super({
      serviceName: 'notification',
      port: 5004,
      tables: ownedTables
    });
  }

  async initialize(): Promise<void> {
    this.setupEventHandlers();
    console.log('[NotificationAdapter] Initialized in monolith mode');
  }

  private setupEventHandlers(): void {
    // Subscribe to collaboration events
    this.subscribeToEvent('collaboration.invitation.sent', async (event) => {
      await this.handleInvitationSent(event);
    });

    this.subscribeToEvent('collaboration.submission.completed', async (event) => {
      await this.handleSubmissionCompleted(event);
    });

    // Subscribe to story events
    this.subscribeToEvent('story.published', async (event) => {
      await this.handleStoryPublished(event);
    });

    // Subscribe to narration events
    this.subscribeToEvent('narration.generation.completed', async (event) => {
      await this.handleNarrationReady(event);
    });
  }

  private async handleInvitationSent(event: any): Promise<void> {
    // Find active campaign for this event type
    const campaign = await this.findCampaignForEvent('collaboration', 'collaboration.invitation.sent');
    if (!campaign) return;

    // Get appropriate template
    const template = await this.getTemplateForCampaign(campaign, event.payload.recipientLanguage);
    if (!template) return;

    // Create delivery record
    await this.createDeliveryRecord({
      sourceEventId: event.id,
      sourceDomain: 'collaboration',
      sourceEventType: 'collaboration.invitation.sent',
      campaignId: campaign.campaign_id,
      templateId: template.template_id,
      recipientEmail: event.payload.recipientEmail,
      templateVariables: event.payload,
      deliveryChannel: 'email'
    });
  }
}
```

### Benefits of DDD Approach

1. **Domain Isolation**: Notification logic is cleanly separated from business domains
2. **Event-Driven**: Integrates seamlessly with existing EventBus infrastructure
3. **Microservice Ready**: Can be extracted as independent service with minimal changes
4. **Aggregate Consistency**: Each aggregate maintains its own consistency boundaries
5. **Provider Agnostic**: Template storage and delivery providers are abstracted
6. **Localization First**: Built-in support for multi-language, multi-locale scenarios
7. **Audit Trail**: Complete tracking of all notification activities
8. **User Preferences**: Respects user notification preferences and delivery rules

This schema aligns with your existing microservices architecture while providing a robust, scalable notification platform that can grow with your system.