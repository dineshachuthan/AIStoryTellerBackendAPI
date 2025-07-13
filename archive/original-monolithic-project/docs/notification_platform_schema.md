# Notification Platform - Complete Schema Design

## Overview
Complete database schema for the provider-agnostic notification platform supporting story invitations, news feeds, roleplay invitations, and future content types.

## Core Schema Tables

### 1. **Enhanced story_invitations** (MODIFY EXISTING)
```sql
-- Add columns to existing table for universal invitation support
ALTER TABLE story_invitations ADD COLUMN conversation_style VARCHAR(50) DEFAULT 'neutral';
ALTER TABLE story_invitations ADD COLUMN invitation_type VARCHAR(50) DEFAULT 'story_collaboration';
ALTER TABLE story_invitations ADD COLUMN content_type VARCHAR(50) DEFAULT 'story';
ALTER TABLE story_invitations ADD COLUMN content_id INTEGER; -- Generic content reference
ALTER TABLE story_invitations ADD COLUMN content_metadata JSONB; -- Type-specific data
ALTER TABLE story_invitations ADD COLUMN roleplay_character_role_id INTEGER; -- For roleplay invitations
ALTER TABLE story_invitations ADD COLUMN delivery_preferences JSONB; -- User's delivery preferences
ALTER TABLE story_invitations ADD COLUMN geographic_region VARCHAR(50); -- For regional optimization

-- Add indexes for new columns
CREATE INDEX idx_story_invitations_conversation_style ON story_invitations(conversation_style);
CREATE INDEX idx_story_invitations_invitation_type ON story_invitations(invitation_type);
CREATE INDEX idx_story_invitations_content_type ON story_invitations(content_type);
CREATE INDEX idx_story_invitations_content_id ON story_invitations(content_id);
```

### 2. **notification_deliveries** (NEW)
```sql
-- Provider-agnostic delivery tracking
CREATE TABLE notification_deliveries (
  id SERIAL PRIMARY KEY,
  invitation_id INTEGER REFERENCES story_invitations(id),
  delivery_type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'webhook'
  provider_type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'payment', 'push'
  provider_name VARCHAR(50) NOT NULL, -- 'mailgun', 'sendgrid', 'twilio', 'stripe', etc.
  provider_priority INTEGER NOT NULL, -- Provider priority when selected
  recipient VARCHAR(255) NOT NULL, -- email/phone/token/webhook_url
  recipient_type VARCHAR(20) NOT NULL, -- 'email', 'phone', 'device_token', 'webhook'
  status VARCHAR(20) NOT NULL, -- 'pending', 'sent', 'delivered', 'failed', 'bounced', 'expired'
  provider_message_id VARCHAR(255), -- External provider's message ID
  provider_response JSONB, -- Full provider response (provider-agnostic)
  delivery_metadata JSONB, -- Additional delivery context
  error_message TEXT, -- Error details if failed
  error_code VARCHAR(50), -- Standardized error code
  cost_per_message DECIMAL(10,6), -- Cost charged by provider
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP, -- For batch processing
  sent_at TIMESTAMP, -- When actually sent
  delivered_at TIMESTAMP, -- When confirmed delivered
  failed_at TIMESTAMP, -- When permanently failed
  expires_at TIMESTAMP, -- When invitation expires
  geographic_region VARCHAR(50), -- For regional optimization
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comprehensive indexes for analytics and performance
CREATE INDEX idx_notification_deliveries_invitation ON notification_deliveries(invitation_id);
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX idx_notification_deliveries_provider ON notification_deliveries(provider_name, provider_type);
CREATE INDEX idx_notification_deliveries_scheduled ON notification_deliveries(scheduled_at);
CREATE INDEX idx_notification_deliveries_cost_analysis ON notification_deliveries(provider_name, sent_at, cost_per_message);
CREATE INDEX idx_notification_deliveries_recipient ON notification_deliveries(recipient, recipient_type);
CREATE INDEX idx_notification_deliveries_expires ON notification_deliveries(expires_at);
```

### 3. **notification_templates** (NEW)
```sql
-- Provider-agnostic notification templates
CREATE TABLE notification_templates (
  id SERIAL PRIMARY KEY,
  template_key VARCHAR(100) NOT NULL UNIQUE, -- 'story_invitation', 'news_feed', 'roleplay_invitation'
  template_name VARCHAR(255) NOT NULL,
  invitation_type VARCHAR(50) NOT NULL, -- Links to story_invitations.invitation_type
  delivery_type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push'
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  subject_template TEXT, -- For email/push notifications
  content_template TEXT NOT NULL, -- Template with {{variables}}
  html_template TEXT, -- For email HTML content
  template_variables JSONB, -- Expected variables with descriptions
  provider_specific_config JSONB, -- Provider-specific template settings
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for template lookup
CREATE INDEX idx_notification_templates_key ON notification_templates(template_key);
CREATE INDEX idx_notification_templates_type ON notification_templates(invitation_type, delivery_type);
CREATE INDEX idx_notification_templates_language ON notification_templates(language);
```

### 4. **notification_batch_jobs** (NEW)
```sql
-- Batch processing management
CREATE TABLE notification_batch_jobs (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(255) NOT NULL,
  job_type VARCHAR(50) NOT NULL, -- 'invitation_batch', 'reminder_batch', 'cleanup_batch'
  invitation_type VARCHAR(50), -- Filter by invitation type
  status VARCHAR(20) NOT NULL, -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  total_notifications INTEGER NOT NULL DEFAULT 0,
  processed_notifications INTEGER NOT NULL DEFAULT 0,
  successful_notifications INTEGER NOT NULL DEFAULT 0,
  failed_notifications INTEGER NOT NULL DEFAULT 0,
  job_config JSONB, -- Job-specific configuration
  error_summary TEXT, -- Summary of errors if any
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for job management
CREATE INDEX idx_notification_batch_jobs_status ON notification_batch_jobs(status);
CREATE INDEX idx_notification_batch_jobs_type ON notification_batch_jobs(job_type);
CREATE INDEX idx_notification_batch_jobs_started ON notification_batch_jobs(started_at);
```

### 5. **provider_registry** (NEW)
```sql
-- Provider registration and configuration
CREATE TABLE provider_registry (
  id SERIAL PRIMARY KEY,
  provider_name VARCHAR(50) NOT NULL UNIQUE,
  provider_type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'payment', 'push'
  provider_class VARCHAR(100) NOT NULL, -- Class name for instantiation
  priority INTEGER NOT NULL DEFAULT 100,
  is_enabled BOOLEAN DEFAULT TRUE,
  is_healthy BOOLEAN DEFAULT TRUE,
  health_check_url VARCHAR(255), -- For health monitoring
  rate_limit_per_minute INTEGER,
  rate_limit_per_hour INTEGER,
  rate_limit_per_day INTEGER,
  cost_per_message DECIMAL(10,6),
  geographic_coverage TEXT[], -- Array of supported regions
  supported_features JSONB, -- Features supported by provider
  configuration JSONB, -- Provider-specific config
  credentials_required TEXT[], -- Required credential keys
  webhook_config JSONB, -- Webhook configuration
  last_health_check TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for provider selection
CREATE INDEX idx_provider_registry_type ON provider_registry(provider_type);
CREATE INDEX idx_provider_registry_enabled ON provider_registry(is_enabled, is_healthy);
CREATE INDEX idx_provider_registry_priority ON provider_registry(provider_type, priority);
```

### 6. **provider_health_metrics** (NEW)
```sql
-- Provider performance tracking
CREATE TABLE provider_health_metrics (
  id SERIAL PRIMARY KEY,
  provider_name VARCHAR(50) NOT NULL,
  provider_type VARCHAR(20) NOT NULL,
  health_check_timestamp TIMESTAMP NOT NULL,
  is_healthy BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  error_message TEXT,
  error_code VARCHAR(50),
  success_rate_1h DECIMAL(5,2), -- Success rate over last hour
  success_rate_24h DECIMAL(5,2), -- Success rate over last 24 hours
  success_rate_7d DECIMAL(5,2), -- Success rate over last 7 days
  cost_per_message DECIMAL(10,6), -- Current cost per message
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMP,
  geographic_region VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for health monitoring
CREATE INDEX idx_provider_health_metrics_provider ON provider_health_metrics(provider_name, provider_type);
CREATE INDEX idx_provider_health_metrics_timestamp ON provider_health_metrics(health_check_timestamp);
CREATE INDEX idx_provider_health_metrics_healthy ON provider_health_metrics(is_healthy);
```

### 7. **user_notification_preferences** (NEW)
```sql
-- User notification preferences
CREATE TABLE user_notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  invitation_type VARCHAR(50) NOT NULL, -- 'story_collaboration', 'news_feed', 'roleplay_invitation'
  delivery_method VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
  conversation_style VARCHAR(50), -- Default conversation style for this type
  is_enabled BOOLEAN DEFAULT TRUE,
  frequency_limit INTEGER, -- Max notifications per day
  frequency_period VARCHAR(20) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
  quiet_hours_start TIME, -- No notifications during these hours
  quiet_hours_end TIME,
  timezone VARCHAR(50), -- User's timezone
  preferred_providers JSONB, -- Preferred providers by type
  blocked_providers JSONB, -- Blocked providers by type
  delivery_preferences JSONB, -- Additional delivery preferences
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for preference lookup
CREATE INDEX idx_user_notification_preferences_user ON user_notification_preferences(user_id);
CREATE INDEX idx_user_notification_preferences_type ON user_notification_preferences(user_id, invitation_type);
CREATE INDEX idx_user_notification_preferences_delivery ON user_notification_preferences(delivery_method);
```

### 8. **user_invitation_history** (NEW)
```sql
-- User invitation history and analytics
CREATE TABLE user_invitation_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  invitation_id INTEGER REFERENCES story_invitations(id),
  action VARCHAR(20) NOT NULL, -- 'sent', 'received', 'viewed', 'accepted', 'declined', 'expired'
  action_timestamp TIMESTAMP NOT NULL,
  response_data JSONB, -- User's response or feedback
  interaction_metadata JSONB, -- Additional interaction context
  user_agent TEXT, -- For web analytics
  ip_address INET, -- For geographic analytics
  referrer TEXT, -- How they accessed the invitation
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_user_invitation_history_user ON user_invitation_history(user_id);
CREATE INDEX idx_user_invitation_history_invitation ON user_invitation_history(invitation_id);
CREATE INDEX idx_user_invitation_history_action ON user_invitation_history(action, action_timestamp);
CREATE INDEX idx_user_invitation_history_timestamp ON user_invitation_history(action_timestamp);
```

## Future Content Type Support

### 9. **news_articles** (NEW)
```sql
-- News articles for news feed invitations
CREATE TABLE news_articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  full_content TEXT,
  source_url TEXT,
  author VARCHAR(255),
  published_at TIMESTAMP,
  category VARCHAR(100), -- 'technology', 'politics', 'entertainment', etc.
  tags JSONB, -- Array of tags for content filtering
  language VARCHAR(10) DEFAULT 'en',
  reading_time_minutes INTEGER,
  content_hash VARCHAR(64), -- For duplicate detection
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for content management
CREATE INDEX idx_news_articles_published ON news_articles(published_at);
CREATE INDEX idx_news_articles_category ON news_articles(category);
CREATE INDEX idx_news_articles_language ON news_articles(language);
CREATE INDEX idx_news_articles_hash ON news_articles(content_hash);
```

### 10. **news_narrations** (NEW)
```sql
-- News narrations for news feed invitations
CREATE TABLE news_narrations (
  id SERIAL PRIMARY KEY,
  news_article_id INTEGER REFERENCES news_articles(id),
  user_id VARCHAR REFERENCES users(id),
  conversation_style VARCHAR(50),
  narrator_profile VARCHAR(50),
  segments JSONB, -- Narrated segments
  total_duration INTEGER,
  audio_file_url TEXT,
  narration_metadata JSONB, -- Additional narration context
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for narration lookup
CREATE INDEX idx_news_narrations_article ON news_narrations(news_article_id);
CREATE INDEX idx_news_narrations_user ON news_narrations(user_id);
CREATE INDEX idx_news_narrations_style ON news_narrations(conversation_style);
```

### 11. **roleplay_templates** (NEW)
```sql
-- Roleplay templates for character invitations
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
  template_metadata JSONB, -- Additional template context
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for roleplay management
CREATE INDEX idx_roleplay_templates_story ON roleplay_templates(story_id);
CREATE INDEX idx_roleplay_templates_creator ON roleplay_templates(created_by);
CREATE INDEX idx_roleplay_templates_public ON roleplay_templates(is_public);
```

### 12. **roleplay_character_roles** (NEW)
```sql
-- Character roles within roleplay templates
CREATE TABLE roleplay_character_roles (
  id SERIAL PRIMARY KEY,
  roleplay_template_id INTEGER REFERENCES roleplay_templates(id),
  character_id INTEGER REFERENCES story_characters(id),
  role_name VARCHAR(100) NOT NULL,
  role_description TEXT,
  required_voice_emotions TEXT[], -- Array of required emotions
  is_protagonist BOOLEAN DEFAULT FALSE,
  role_metadata JSONB, -- Additional role context
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for role management
CREATE INDEX idx_roleplay_character_roles_template ON roleplay_character_roles(roleplay_template_id);
CREATE INDEX idx_roleplay_character_roles_character ON roleplay_character_roles(character_id);
```

## Analytics and Reporting Views

### 13. **user_invitation_summary** (VIEW)
```sql
-- User invitation analytics summary
CREATE VIEW user_invitation_summary AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(CASE WHEN ih.action = 'sent' THEN 1 END) as invitations_sent,
  COUNT(CASE WHEN ih.action = 'received' THEN 1 END) as invitations_received,
  COUNT(CASE WHEN ih.action = 'accepted' THEN 1 END) as invitations_accepted,
  COUNT(CASE WHEN ih.action = 'declined' THEN 1 END) as invitations_declined,
  COUNT(CASE WHEN ih.action = 'expired' THEN 1 END) as invitations_expired,
  ROUND(COUNT(CASE WHEN ih.action = 'accepted' THEN 1 END)::decimal / 
    NULLIF(COUNT(CASE WHEN ih.action = 'received' THEN 1 END), 0) * 100, 2) as acceptance_rate,
  MAX(ih.action_timestamp) as last_activity
FROM users u
LEFT JOIN user_invitation_history ih ON u.id = ih.user_id
GROUP BY u.id, u.email;
```

### 14. **provider_performance_summary** (VIEW)
```sql
-- Provider performance analytics
CREATE VIEW provider_performance_summary AS
SELECT 
  nd.provider_name,
  nd.provider_type,
  COUNT(*) as total_deliveries,
  COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END) as successful_deliveries,
  COUNT(CASE WHEN nd.status = 'failed' THEN 1 END) as failed_deliveries,
  ROUND(COUNT(CASE WHEN nd.status = 'delivered' THEN 1 END)::decimal / COUNT(*) * 100, 2) as success_rate,
  AVG(nd.cost_per_message) as avg_cost_per_message,
  SUM(nd.cost_per_message) as total_cost,
  MIN(nd.sent_at) as first_delivery,
  MAX(nd.sent_at) as last_delivery
FROM notification_deliveries nd
WHERE nd.sent_at IS NOT NULL
GROUP BY nd.provider_name, nd.provider_type;
```

### 15. **invitation_conversion_funnel** (VIEW)
```sql
-- Invitation conversion funnel analytics
CREATE VIEW invitation_conversion_funnel AS
SELECT 
  si.invitation_type,
  si.conversation_style,
  COUNT(*) as total_invitations,
  COUNT(CASE WHEN ih.action = 'sent' THEN 1 END) as invitations_sent,
  COUNT(CASE WHEN ih.action = 'viewed' THEN 1 END) as invitations_viewed,
  COUNT(CASE WHEN ih.action = 'accepted' THEN 1 END) as invitations_accepted,
  ROUND(COUNT(CASE WHEN ih.action = 'viewed' THEN 1 END)::decimal / 
    COUNT(CASE WHEN ih.action = 'sent' THEN 1 END) * 100, 2) as view_rate,
  ROUND(COUNT(CASE WHEN ih.action = 'accepted' THEN 1 END)::decimal / 
    COUNT(CASE WHEN ih.action = 'viewed' THEN 1 END) * 100, 2) as conversion_rate
FROM story_invitations si
LEFT JOIN user_invitation_history ih ON si.id = ih.invitation_id
GROUP BY si.invitation_type, si.conversation_style;
```

## Implementation Priority

### Phase 1: Core Notification System
1. **notification_deliveries** - Provider-agnostic delivery tracking
2. **notification_templates** - Template management
3. **provider_registry** - Provider registration
4. **user_notification_preferences** - User preferences

### Phase 2: Analytics and Monitoring
5. **provider_health_metrics** - Provider performance monitoring
6. **user_invitation_history** - User interaction tracking
7. **notification_batch_jobs** - Batch processing management

### Phase 3: Content Type Extensions
8. **news_articles** + **news_narrations** - News feed support
9. **roleplay_templates** + **roleplay_character_roles** - Roleplay invitations

### Phase 4: Advanced Analytics
10. Analytics views for reporting and optimization

## Benefits of This Schema Design

1. **Provider Agnostic**: Supports any email, SMS, push, or payment provider
2. **Extensible**: Easy to add new content types and invitation types
3. **Analytics Ready**: Comprehensive tracking for optimization
4. **Performance Optimized**: Proper indexing for all query patterns
5. **Future Proof**: JSONB fields for extensibility without schema changes
6. **Cost Aware**: Tracks provider costs for optimization
7. **Geographic Aware**: Supports regional provider selection
8. **User Centric**: Granular user preferences and history tracking