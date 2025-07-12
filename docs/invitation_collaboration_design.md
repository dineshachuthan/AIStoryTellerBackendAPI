# Invitation Collaboration Design Document

## Overview
This document outlines the design decisions for a comprehensive invitation and notification platform. Starting with story collaboration invitations, the system is designed to expand into a multi-purpose notification platform supporting news feeds, roleplay invitations, and other relationship-aware content delivery.

## Platform Vision

### Current Scope: Story Collaboration Invitations
- Users invite collaborators to experience stories with personalized narration
- Conversation style determines relationship-aware audio generation
- Recipients get immediate access to pre-generated narration content

### Future Expansion: Universal Notification Platform
- **News Feed Invitations**: Share summarized news articles with audio playback based on recipient's conversation style
- **Roleplay Invitations**: Invite users to participate in specific character roles within collaborative stories
- **Content Recommendations**: Personalized content delivery based on relationship context and conversation preferences
- **User Profile Integration**: Historical invitation tracking, preference management, and delivery analytics

## Current Architecture

### Database Tables
- **story_invitations**: Stores invitation metadata (email, phone, characterId, token)
- **story_narrations**: Stores narration cache metadata (storyId, userId, conversationStyle, narratorProfile, segments)

### Frontend Components
- **InviteCollaboratorsDialog**: UI for sending invitations with conversation style selection
- **8 Conversation Styles**: respectful, business, jovial, playful, close_friends, parent_to_child, child_to_parent, siblings

## Design Challenge
**Problem**: Conversation style needs to be available in two contexts:
1. When invitation is sent (inviter selects style for relationship)
2. When narration is generated (system needs style for cache key and ElevenLabs parameters)

**Current State**: 
- Frontend sends conversationStyle to apiClient.sendStoryInvitations()
- story_narrations table has conversation_style column
- story_invitations table may need conversation_style column

## Schema Design Options

### Option 1: Dual Storage
```sql
-- Store conversation style in both tables for different purposes:

story_invitations:
- conversation_style (what inviter selected for this relationship)
- Purpose: UI default when recipient lands on invitation page

story_narrations: 
- conversation_style (what was actually used for narration generation)
- Purpose: Cache key and narration metadata
```

### Option 2: Pre-create Narration Rows (RECOMMENDED)
```sql
-- When invitation is sent, create default story_narration row:
story_narrations:
- storyId, userId (invitation recipient), conversation_style
- segments: NULL (empty until generated)
- Purpose: Ready for immediate ElevenLabs generation when user lands
```

## Recommended Approach: Pre-creation Strategy

### Benefits
1. **Immediate Generation**: When user lands on invitation page, narration row already exists
2. **No Database Writes During Narration**: Just update existing row with segments
3. **Cache Key Ready**: Multi-dimensional cache key already established
4. **Conversation Style Locked**: Prevents confusion about which style to use

### User Flow
1. **Invitation Sent**: 
   - Process all invitations to identify unique conversation styles
   - Create one story_narration row per unique conversation style (segments = NULL)
   - Store invitation records with conversation_style reference
2. **Recipient Clicks Link**: 
   - Find existing narration row by storyId + conversation_style
   - Generate segments if not already cached → Update row
3. **Subsequent Visits**: Load existing narration from cache

### Key Design Insight: One-to-Many Relationship
**Critical Optimization**: 10 invitations may share only 1 narration row if they have the same conversation style.

**Example Scenario**:
- User invites 10 people: 5 with "respectful" style, 3 with "business" style, 2 with "jovial" style
- **Result**: Only 3 narration rows created (one per unique conversation style)
- **Benefit**: Efficient storage and narration generation

## Implementation Questions
- ✅ **DECIDED**: Create narration rows for ALL invitations sent (pre-creation strategy)
- ✅ **DECIDED**: One narration row per unique conversation style (not per invitation)
- ❌ How to handle conversation style changes after invitation is sent?
- ❌ Should invitation table also store conversation_style for reference?

## Current Implementation Status
- ✅ Frontend UI includes conversation style selection
- ✅ Frontend sends conversationStyle to API
- ❌ Backend endpoint needs to handle conversation style data
- ❌ Schema changes needed (either dual storage or pre-creation)

## Next Steps
1. Finalize schema approach (dual storage vs pre-creation)
2. Update database schema accordingly
3. Modify backend API endpoint to handle conversation style
4. Test invitation flow with conversation style integration

## Notification Delivery Flow Design

### Real-time vs Batch Processing Strategy
**Real-time Processing** (Recommended for MVP):
- ✅ Immediate user feedback (invitations sent instantly)
- ✅ Simple implementation and debugging
- ✅ Direct provider API integration
- ❌ Potential performance bottleneck with large batches

**Batch Processing** (Future Enhancement):
- ✅ Better performance for large invitation batches
- ✅ Improved error handling and retry logic
- ✅ Rate limiting compliance with provider APIs
- ❌ Delayed user feedback

### Provider-Agnostic Configuration Strategy

#### **Environment-Based Provider Selection**
```typescript
// Provider configuration via environment variables
EMAIL_PROVIDERS=mailgun:1,sendgrid:2,googleworkspace:3,amazonses:4
SMS_PROVIDERS=twilio:1,messagebird:2,amazonssns:3,plivo:4
PAYMENT_PROVIDERS=stripe:1,paypal:2,square:3,braintree:4

// Runtime provider initialization
const emailRegistry = new EmailProviderRegistry();
emailRegistry.registerProvider('mailgun', new MailgunProvider(), 1);
emailRegistry.registerProvider('sendgrid', new SendgridProvider(), 2);
emailRegistry.registerProvider('googleworkspace', new GoogleWorkspaceProvider(), 3);
```

#### **Universal Provider Interface**
```typescript
// Base interface for all notification providers
interface BaseNotificationProvider {
  name: string;
  priority: number;
  isHealthy(): Promise<boolean>;
  getRateLimits(): ProviderRateLimit;
  getCostPerMessage(): number;
  getGeographicCoverage(): string[];
}

// Specific provider interfaces
interface EmailProvider extends BaseNotificationProvider {
  sendEmail(data: EmailData): Promise<ProviderResponse>;
  validateEmailAddress(email: string): boolean;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
}

interface SMSProvider extends BaseNotificationProvider {
  sendSMS(data: SMSData): Promise<ProviderResponse>;
  validatePhoneNumber(phone: string): boolean;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
}

interface PaymentProvider extends BaseNotificationProvider {
  processPayment(data: PaymentData): Promise<PaymentResponse>;
  createSubscription(data: SubscriptionData): Promise<SubscriptionResponse>;
  handleWebhook(data: WebhookData): Promise<WebhookResponse>;
}
```

#### **Intelligent Provider Selection Logic**
```typescript
class ProviderSelectionEngine {
  selectOptimalProvider(criteria: SelectionCriteria): Promise<Provider> {
    // Factors considered:
    // 1. Provider health and availability
    // 2. Cost per message/transaction
    // 3. Geographic coverage for recipient
    // 4. Delivery success rate history
    // 5. Rate limit availability
    // 6. A/B testing requirements
  }
}
```

#### **Provider Health Monitoring**
```sql
-- Provider performance tracking
CREATE TABLE provider_health_metrics (
  id SERIAL PRIMARY KEY,
  provider_name VARCHAR(50) NOT NULL,
  provider_type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'payment'
  health_check_timestamp TIMESTAMP NOT NULL,
  is_healthy BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  error_message TEXT,
  success_rate_24h DECIMAL(5,2), -- Success rate over last 24 hours
  cost_per_message DECIMAL(10,6), -- Current cost per message
  rate_limit_remaining INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Provider cost optimization
CREATE TABLE provider_cost_analysis (
  id SERIAL PRIMARY KEY,
  provider_name VARCHAR(50) NOT NULL,
  provider_type VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  total_messages INTEGER,
  total_cost DECIMAL(10,2),
  average_cost_per_message DECIMAL(10,6),
  delivery_success_rate DECIMAL(5,2),
  cost_per_successful_delivery DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **Provider Failover Strategy**
```typescript
class ProviderFailoverManager {
  async executeWithFailover(operation: ProviderOperation): Promise<ProviderResponse> {
    const providers = await this.getHealthyProviders(operation.type);
    
    for (const provider of providers) {
      try {
        const response = await provider.execute(operation);
        await this.recordSuccess(provider, operation);
        return response;
      } catch (error) {
        await this.recordFailure(provider, operation, error);
        if (this.isPermanentFailure(error)) {
          throw error; // Don't retry permanent failures
        }
        // Continue to next provider
      }
    }
    
    throw new Error('All providers failed');
  }
}
```

### Error Handling & Recovery
```
Failure Scenarios:
1. Provider API down → Switch to backup provider
2. Invalid recipient → Mark as permanently failed
3. Rate limit exceeded → Queue for later retry
4. Temporary network error → Exponential backoff retry
5. Template rendering error → Log and alert admin

Recovery Mechanisms:
1. Automatic retry with backoff: 5min, 15min, 1hr
2. Dead letter queue for permanently failed notifications
3. Admin dashboard for manual retry and investigation
4. Webhook processing for delivery confirmations
```

## Decision Log
- **Date**: 2025-01-12
- **Decision**: Pre-creation strategy with one-to-many optimization + Comprehensive notification delivery system
- **Reasoning**: 
  - Enables immediate narration generation when recipient visits invitation page
  - Optimizes storage: 10 invitations may share 1 narration row if same conversation style
  - Reduces ElevenLabs API calls through intelligent caching
  - Provides enterprise-grade notification delivery with retry, failover, and status tracking
- **Status**: ✅ **FINALIZED**

### Schema Changes Summary
- **story_invitations**: Add `conversation_style` column
- **notification_deliveries**: NEW table for delivery tracking
- **notification_templates**: NEW table for email/SMS templates
- **notification_batch_jobs**: NEW table for batch processing
- **story_narrations**: Keep existing `conversation_style` column

## Future Platform Extensions

### Universal Invitation System Architecture

#### 1. **Enhanced Invitation Types**
```sql
-- Extend story_invitations to support multiple invitation types
ALTER TABLE story_invitations ADD COLUMN invitation_type VARCHAR(50) DEFAULT 'story_collaboration';
-- Values: 'story_collaboration', 'news_feed', 'roleplay_character', 'content_recommendation'

-- Add content reference for different invitation types
ALTER TABLE story_invitations ADD COLUMN content_type VARCHAR(50); -- 'story', 'news_article', 'roleplay_template'
ALTER TABLE story_invitations ADD COLUMN content_id INTEGER; -- Generic reference to content
ALTER TABLE story_invitations ADD COLUMN content_metadata JSONB; -- Type-specific data
```

#### 2. **User Profile Integration - Historical Invitations**
```sql
-- User invitation history and preferences
CREATE TABLE user_invitation_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  invitation_id INTEGER REFERENCES story_invitations(id),
  action VARCHAR(20) NOT NULL, -- 'sent', 'received', 'accepted', 'declined', 'viewed'
  action_timestamp TIMESTAMP NOT NULL,
  response_data JSONB, -- User's response or feedback
  created_at TIMESTAMP DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE user_notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  invitation_type VARCHAR(50) NOT NULL,
  delivery_method VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
  conversation_style VARCHAR(50), -- Default style for this invitation type
  is_enabled BOOLEAN DEFAULT TRUE,
  frequency_limit INTEGER, -- Max notifications per day/week
  quiet_hours_start TIME, -- No notifications during these hours
  quiet_hours_end TIME,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. **News Feed Integration Architecture**
```sql
-- News articles table for news feed invitations
CREATE TABLE news_articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  full_content TEXT,
  source_url TEXT,
  published_at TIMESTAMP,
  category VARCHAR(100), -- 'technology', 'politics', 'entertainment', etc.
  tags JSONB, -- Array of tags for content filtering
  language VARCHAR(10) DEFAULT 'en',
  reading_time_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- News narrations (similar to story_narrations but for news)
CREATE TABLE news_narrations (
  id SERIAL PRIMARY KEY,
  news_article_id INTEGER REFERENCES news_articles(id),
  user_id VARCHAR REFERENCES users(id),
  conversation_style VARCHAR(50),
  narrator_profile VARCHAR(50),
  segments JSONB, -- Narrated segments
  total_duration INTEGER,
  audio_file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. **Roleplay Character Invitations**
```sql
-- Roleplay templates for character-based invitations
CREATE TABLE roleplay_templates (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES stories(id),
  template_name VARCHAR(255) NOT NULL,
  description TEXT,
  total_characters INTEGER NOT NULL,
  estimated_duration_minutes INTEGER,
  difficulty_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
  is_public BOOLEAN DEFAULT FALSE,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Character roles within roleplay templates
CREATE TABLE roleplay_character_roles (
  id SERIAL PRIMARY KEY,
  roleplay_template_id INTEGER REFERENCES roleplay_templates(id),
  character_id INTEGER REFERENCES story_characters(id),
  role_name VARCHAR(100) NOT NULL,
  role_description TEXT,
  required_voice_emotions TEXT[], -- Array of required emotions for this role
  is_protagonist BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Character role assignments for invitations
ALTER TABLE story_invitations ADD COLUMN roleplay_character_role_id INTEGER REFERENCES roleplay_character_roles(id);
```

### User Profile Dashboard Features

#### 1. **Invitation History Dashboard**
```sql
-- Views for user dashboard
CREATE VIEW user_invitation_summary AS
SELECT 
  u.id as user_id,
  COUNT(CASE WHEN ih.action = 'sent' THEN 1 END) as invitations_sent,
  COUNT(CASE WHEN ih.action = 'received' THEN 1 END) as invitations_received,
  COUNT(CASE WHEN ih.action = 'accepted' THEN 1 END) as invitations_accepted,
  COUNT(CASE WHEN ih.action = 'declined' THEN 1 END) as invitations_declined,
  MAX(ih.action_timestamp) as last_activity
FROM users u
LEFT JOIN user_invitation_history ih ON u.id = ih.user_id
GROUP BY u.id;
```

#### 2. **Delivery Analytics**
```sql
-- Notification delivery success rates
CREATE VIEW user_notification_analytics AS
SELECT 
  si.inviter_id as user_id,
  nd.delivery_type,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END) as successful_deliveries,
  COUNT(CASE WHEN nd.status = 'failed' THEN 1 END) as failed_deliveries,
  ROUND(COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END)::decimal / COUNT(*) * 100, 2) as success_rate
FROM story_invitations si
JOIN notification_deliveries nd ON si.id = nd.invitation_id
GROUP BY si.inviter_id, nd.delivery_type;
```

### Platform Scalability Considerations

#### 1. **Content Type Polymorphism**
- Generic `content_type` and `content_id` fields allow same invitation system to handle stories, news articles, roleplay templates
- `content_metadata` JSONB field stores type-specific data without schema changes

#### 2. **Notification Preference Management**
- User-controlled notification preferences per invitation type
- Granular delivery method control (email, SMS, push, in-app)
- Conversation style preferences per invitation type

#### 3. **Analytics and Insights**
- Historical invitation tracking for user engagement analytics
- Delivery success rate monitoring for provider optimization
- Content performance metrics for recommendation algorithms

### Implementation Roadmap

#### Phase 1: Current Story Invitations (In Progress)
- ✅ Conversation style integration
- ✅ Pre-creation narration strategy
- ✅ Notification delivery system

#### Phase 2: User Profile Dashboard
- Historical invitation tracking
- Delivery analytics dashboard
- Notification preference management

#### Phase 3: News Feed Integration
- News article content management
- News narration system
- Personalized news delivery

#### Phase 4: Roleplay Character System
- Roleplay template creation
- Character role management
- Multi-user collaborative roleplay

### Technical Benefits
- **Unified Architecture**: Single notification system handles all content types
- **Relationship-Aware**: Conversation style applies to all content types
- **Scalable Design**: Easy to add new content types without schema changes
- **User-Centric**: Comprehensive preference management and analytics

## Implementation Algorithm

### Phase 1: Invitation Creation & Narration Pre-creation
```
When sending invitations:
1. Collect all invitation data with conversation styles
2. Group invitations by unique conversation style
3. For each unique conversation style:
   - Create story_narration row (storyId, userId=null, conversationStyle, segments=null)
4. Store each invitation record with conversation_style reference
5. Create notification_delivery records for each invitation
6. Process notifications (real-time or batch)
```

### Phase 2: Notification Delivery System
```
Real-time Processing:
1. For each invitation created:
   - Create notification_delivery record (status='pending')
   - Select appropriate provider (email: mailgun/sendgrid, SMS: twilio/messagebird)
   - Send notification via provider API
   - Update notification_delivery record with provider response
   - Handle failures with retry logic

Batch Processing:
1. Create notification_batch_job record
2. Queue all pending notifications
3. Process in batches of 50-100 notifications
4. Update batch job progress counters
5. Handle failed notifications with exponential backoff retry
```

### Phase 3: Recipient Experience
```
When recipient visits:
1. Extract conversation style from invitation record
2. Find existing story_narration row by storyId + conversationStyle
3. Generate segments if segments=null (immediate generation)
4. Update story_narration row with generated segments
5. Serve narration to user
6. Update invitation status to 'accepted'
```

### Phase 4: Delivery Status Tracking
```
Webhook Handling (for providers that support it):
1. Receive delivery confirmation from provider
2. Update notification_delivery record status
3. Log delivery timestamp and final status

Polling (for providers without webhooks):
1. Periodically check delivery status via provider API
2. Update notification_delivery records
3. Handle bounces, failures, and successful deliveries
```

## Database Schema Requirements

### Primary Tables (Current Structure)
```sql
-- story_invitations (EXISTING - needs conversation_style added)
- id, storyId, inviterId, inviteeEmail, inviteePhone, invitationToken
- status: 'pending', 'accepted', 'completed'
- message, characterId, createdAt, acceptedAt, completedAt, expiresAt
- [NEW] conversation_style: varchar(50) -- What inviter selected

-- story_narrations (EXISTING - already has conversation_style)
- id, storyId, userId, narratorVoice, narratorProfile, conversationStyle
- segments: jsonb, totalDuration, audioFileUrl, createdAt, updatedAt
- [PURPOSE] Cache key and narration metadata
```

### New Tables for Notification Delivery System

#### 1. **notification_deliveries** (NEW) - Provider-Agnostic Tracking
```sql
-- Tracks individual notification attempts across all providers
CREATE TABLE notification_deliveries (
  id SERIAL PRIMARY KEY,
  invitation_id INTEGER REFERENCES story_invitations(id),
  delivery_type VARCHAR(10) NOT NULL, -- 'email', 'sms', 'push', 'payment'
  provider_type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'payment'
  provider_name VARCHAR(50) NOT NULL, -- 'mailgun', 'sendgrid', 'twilio', 'stripe', etc.
  provider_priority INTEGER NOT NULL, -- Provider priority when selected
  recipient VARCHAR(255) NOT NULL, -- email address, phone number, or payment token
  status VARCHAR(20) NOT NULL, -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
  provider_message_id VARCHAR(255), -- External provider's message ID
  provider_response JSONB, -- Full provider response (provider-agnostic)
  error_message TEXT, -- Error details if failed
  cost_per_message DECIMAL(10,6), -- Cost charged by provider
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP, -- For batch processing
  sent_at TIMESTAMP, -- When actually sent
  delivered_at TIMESTAMP, -- When confirmed delivered
  failed_at TIMESTAMP, -- When permanently failed
  geographic_region VARCHAR(50), -- For regional optimization
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries and provider analytics
CREATE INDEX idx_notification_deliveries_invitation ON notification_deliveries(invitation_id);
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX idx_notification_deliveries_provider ON notification_deliveries(provider_name, provider_type);
CREATE INDEX idx_notification_deliveries_scheduled ON notification_deliveries(scheduled_at);
CREATE INDEX idx_notification_deliveries_cost_analysis ON notification_deliveries(provider_name, sent_at, cost_per_message);
```

#### 2. **notification_templates** (NEW)
```sql
-- Email/SMS templates for different invitation types
CREATE TABLE notification_templates (
  id SERIAL PRIMARY KEY,
  template_key VARCHAR(100) NOT NULL, -- 'story_invitation_email', 'story_invitation_sms'
  delivery_type VARCHAR(10) NOT NULL, -- 'email' or 'sms'
  language VARCHAR(10) DEFAULT 'en', -- 'en', 'es', 'fr', etc.
  subject TEXT, -- For email templates
  body_text TEXT NOT NULL, -- Plain text version
  body_html TEXT, -- HTML version for emails
  variables JSONB, -- Template variables schema
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Unique template per type, language combination
CREATE UNIQUE INDEX idx_notification_templates_key_lang ON notification_templates(template_key, language);
```

#### 3. **notification_batch_jobs** (NEW)
```sql
-- For batch processing of notifications
CREATE TABLE notification_batch_jobs (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL, -- 'invitation_batch', 'reminder_batch'
  story_id INTEGER REFERENCES stories(id),
  total_count INTEGER NOT NULL,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB, -- Job-specific data
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Schema Relationships
- **story_invitations**: Add `conversation_style` column
- **story_narrations**: Keep existing `conversation_style` column (cache key)
- **notification_deliveries**: Links to `story_invitations` for delivery tracking
- **notification_templates**: Provides email/SMS content templates
- **notification_batch_jobs**: Manages batch processing workflow

### Provider-Agnostic Architecture Strategy

#### **Multi-Provider Registry Pattern** (Following Existing Codebase Pattern)
The platform uses a provider registry system allowing seamless provider switching without code changes:

**Email Providers** (Priority-Based Selection):
- MailGun, SendGrid, Google Workspace, Amazon SES, Postmark, etc.
- Provider selection based on availability, health checks, and priority configuration

**SMS Providers** (Priority-Based Selection):
- Twilio, MessageBird, Amazon SNS, Plivo, Nexmo, etc.
- Automatic failover to backup providers on failure

**Payment Providers** (Future Extension):
- Stripe, PayPal, Square, Braintree, Adyen, etc.
- Same registry pattern for payment processing

#### **Provider Integration Benefits**
- **Zero Code Changes**: Add new providers via configuration only
- **Health Monitoring**: Automatic provider health checks and failover
- **Cost Optimization**: Route traffic to cheapest available provider
- **Geographic Optimization**: Use regional providers for better deliverability
- **A/B Testing**: Split traffic between providers for performance comparison

#### **Provider Registry Implementation**
```typescript
// Following existing pattern in codebase
interface NotificationProvider {
  name: string;
  priority: number;
  isHealthy(): Promise<boolean>;
  sendEmail(data: EmailData): Promise<ProviderResponse>;
  sendSMS(data: SMSData): Promise<ProviderResponse>;
}

// Registry manages provider selection and failover
class NotificationProviderRegistry {
  private providers: NotificationProvider[] = [];
  
  async selectProvider(type: 'email' | 'sms'): Promise<NotificationProvider> {
    // Select highest priority healthy provider
  }
  
  async sendWithFailover(data: NotificationData): Promise<ProviderResponse> {
    // Attempt providers in priority order with automatic failover
  }
}
```