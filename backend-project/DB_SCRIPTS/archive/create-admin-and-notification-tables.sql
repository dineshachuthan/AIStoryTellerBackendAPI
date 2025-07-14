-- Admin & Notification Service Database Schema Migration
-- This migration creates all tables required for the admin dashboard and notification service

-- 1. Roles & Permissions
-- =====================

-- User roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Update users table to add role
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id),
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  scope VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Role-permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- 2. Audit & Activity Logging
-- ===========================

-- Admin action audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id SERIAL PRIMARY KEY,
  admin_user_id VARCHAR REFERENCES users(id) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin sessions for security tracking
CREATE TABLE IF NOT EXISTS admin_sessions (
  id SERIAL PRIMARY KEY,
  admin_user_id VARCHAR REFERENCES users(id) NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  two_factor_verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- 3. System Configuration
-- =======================

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id SERIAL PRIMARY KEY,
  flag_key VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  enabled_for_users TEXT[],
  enabled_percentage INTEGER DEFAULT 0,
  config JSONB,
  updated_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- System configuration
CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  config_type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  display_name VARCHAR(200),
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  validation_rules JSONB,
  updated_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

-- 4. Content Moderation
-- =====================

-- Content moderation queue
CREATE TABLE IF NOT EXISTS moderation_queue (
  id SERIAL PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL,
  content_id INTEGER NOT NULL,
  reported_by VARCHAR REFERENCES users(id),
  reason VARCHAR(100) NOT NULL,
  reason_details TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  assigned_to VARCHAR REFERENCES users(id),
  moderation_notes TEXT,
  action_taken VARCHAR(100),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Moderation rules
CREATE TABLE IF NOT EXISTS moderation_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  rule_config JSONB NOT NULL,
  action VARCHAR(50) NOT NULL,
  severity INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_content ON moderation_queue(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_assigned ON moderation_queue(assigned_to);

-- 5. Admin Notifications & Alerts
-- ===============================

-- Admin alerts
CREATE TABLE IF NOT EXISTS admin_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by VARCHAR REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Alert subscriptions
CREATE TABLE IF NOT EXISTS admin_alert_subscriptions (
  id SERIAL PRIMARY KEY,
  admin_user_id VARCHAR REFERENCES users(id) NOT NULL,
  alert_type VARCHAR(100) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(admin_user_id, alert_type, channel)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_alerts_type ON admin_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_resolved ON admin_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created ON admin_alerts(created_at);

-- 6. Analytics & Reporting
-- ========================

-- Admin dashboards
CREATE TABLE IF NOT EXISTS admin_dashboards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  layout JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Dashboard widgets
CREATE TABLE IF NOT EXISTS admin_dashboard_widgets (
  id SERIAL PRIMARY KEY,
  dashboard_id INTEGER REFERENCES admin_dashboards(id) ON DELETE CASCADE,
  widget_type VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  config JSONB NOT NULL,
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Saved reports
CREATE TABLE IF NOT EXISTS admin_reports (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL,
  query JSONB NOT NULL,
  schedule VARCHAR(50),
  recipients TEXT[],
  last_run_at TIMESTAMP,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard ON admin_dashboard_widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_admin_reports_type ON admin_reports(report_type);

-- 7. Cache Management
-- ===================

-- Cache invalidation log
CREATE TABLE IF NOT EXISTS cache_invalidation_log (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL,
  cache_type VARCHAR(50) NOT NULL,
  invalidated_by VARCHAR REFERENCES users(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_type ON cache_invalidation_log(cache_type);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_created ON cache_invalidation_log(created_at);

-- 8. Initial Data
-- ===============

-- Insert default roles
INSERT INTO roles (name, display_name, description) VALUES
  ('super-admin', 'Super Administrator', 'Full system access with all permissions'),
  ('admin', 'Administrator', 'General admin access'),
  ('customer-support', 'Customer Support', 'User assistance and basic moderation'),
  ('content-moderator', 'Content Moderator', 'Content review and moderation')
ON CONFLICT (name) DO NOTHING;

-- Insert core permissions
INSERT INTO permissions (resource, action, scope) VALUES
  -- User management
  ('users', 'read', 'all'),
  ('users', 'update', 'all'),
  ('users', 'delete', 'all'),
  ('users', 'suspend', 'all'),
  
  -- Content management
  ('stories', 'read', 'all'),
  ('stories', 'moderate', 'all'),
  ('stories', 'delete', 'all'),
  
  -- System management
  ('system', 'configure', 'all'),
  ('system', 'view_logs', 'all'),
  ('cache', 'invalidate', 'all'),
  
  -- Analytics
  ('analytics', 'view', 'all'),
  ('reports', 'create', 'all')
ON CONFLICT DO NOTHING;

-- Assign all permissions to super-admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'super-admin'),
  id
FROM permissions
ON CONFLICT DO NOTHING;

-- Add feature flags
INSERT INTO feature_flags (flag_key, display_name, description, is_enabled) VALUES
  ('enable_microservices', 'Enable Microservices', 'Activate microservices event publishing', false),
  ('enable_notification_service', 'Enable Notification Service', 'Use new notification service for emails', false),
  ('enable_admin_dashboard', 'Enable Admin Dashboard', 'Show admin dashboard to authorized users', true)
ON CONFLICT (flag_key) DO NOTHING;

-- 9. Notification Service Tables (DDD-Compliant Schema)
-- ======================================================

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
    
    -- Analytics
    total_sent INTEGER DEFAULT 0 NOT NULL,
    total_delivered INTEGER DEFAULT 0 NOT NULL,
    total_failed INTEGER DEFAULT 0 NOT NULL,
    
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

-- Notification Templates Aggregate (Storage-Agnostic)
CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    
    -- Aggregate Identity
    template_id UUID DEFAULT gen_random_uuid() NOT NULL,
    template_key VARCHAR(100) NOT NULL,
    
    -- Campaign Association
    campaign_id UUID NOT NULL,
    
    -- Channel & Localization
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'in_app'
    locale VARCHAR(10) DEFAULT 'en' NOT NULL, -- 'en', 'es', 'fr', etc.
    
    -- Template Content (Storage-Agnostic)
    storage_type VARCHAR(20) DEFAULT 'database' NOT NULL, -- 'database', 'file', 's3', 'cdn', 'github'
    storage_path TEXT, -- External storage location
    
    -- Template Content (For Database Storage)
    subject_template TEXT, -- Email/Push subject with {{variables}}
    body_template TEXT, -- Plain text template
    html_template TEXT, -- HTML template for email
    
    -- Template Variables
    required_variables JSONB DEFAULT '[]' NOT NULL, -- ['userName', 'storyTitle']
    optional_variables JSONB DEFAULT '[]' NOT NULL,
    default_values JSONB DEFAULT '{}' NOT NULL,
    
    -- Versioning
    version INTEGER DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    
    -- Provider-Specific Config
    provider_config JSONB DEFAULT '{}' NOT NULL, -- SMS char limit, push icons, etc.
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by VARCHAR DEFAULT 'system' NOT NULL,
    
    -- DDD Constraints
    CONSTRAINT chk_notification_templates_channel 
        CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
    CONSTRAINT chk_notification_templates_storage_type 
        CHECK (storage_type IN ('database', 'file', 's3', 'cdn', 'github')),
    CONSTRAINT chk_notification_templates_locale 
        CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    
    -- Unique template per campaign, channel, locale
    CONSTRAINT uq_notification_templates_key 
        UNIQUE (template_key, campaign_id, channel, locale)
);

-- Notification Deliveries Aggregate (Audit Trail)
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id SERIAL PRIMARY KEY,
    
    -- Aggregate Identity
    delivery_id UUID DEFAULT gen_random_uuid() NOT NULL,
    
    -- Campaign & Template References
    campaign_id UUID NOT NULL,
    template_id UUID NOT NULL,
    
    -- Recipient Information
    recipient_id VARCHAR REFERENCES users(id),
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    recipient_push_token TEXT,
    
    -- Delivery Channel & Provider
    channel VARCHAR(20) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'mailgun', 'sendgrid', 'twilio', etc.
    
    -- Delivery Status
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    
    -- Provider Integration
    provider_message_id VARCHAR(255),
    provider_response JSONB DEFAULT '{}' NOT NULL,
    
    -- Template Variables Used
    variables_used JSONB DEFAULT '{}' NOT NULL,
    
    -- Error Tracking
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Delivery Timestamps
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    complained_at TIMESTAMP,
    
    -- Analytics
    clicks_count INTEGER DEFAULT 0 NOT NULL,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- DDD Constraints
    CONSTRAINT chk_notification_deliveries_channel 
        CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
    CONSTRAINT chk_notification_deliveries_status 
        CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'complained')),
    CONSTRAINT chk_notification_deliveries_retry_count 
        CHECK (retry_count >= 0 AND retry_count <= 5)
);

-- Notification Preferences Aggregate
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    
    -- User Reference
    user_id VARCHAR REFERENCES users(id) NOT NULL,
    
    -- Preference Scope
    source_domain VARCHAR(50) NOT NULL,
    source_event_type VARCHAR(100),
    
    -- Channel Preferences
    email_enabled BOOLEAN DEFAULT true NOT NULL,
    sms_enabled BOOLEAN DEFAULT true NOT NULL,
    push_enabled BOOLEAN DEFAULT true NOT NULL,
    in_app_enabled BOOLEAN DEFAULT true NOT NULL,
    
    -- Delivery Preferences
    frequency VARCHAR(20) DEFAULT 'immediate' NOT NULL, -- 'immediate', 'daily_digest', 'weekly_digest'
    quiet_hours_enabled BOOLEAN DEFAULT false NOT NULL,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
    
    -- Language Preference
    preferred_locale VARCHAR(10) DEFAULT 'en' NOT NULL,
    
    -- Unsubscribe Token
    unsubscribe_token UUID DEFAULT gen_random_uuid() NOT NULL,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- DDD Constraints
    CONSTRAINT chk_notification_preferences_frequency 
        CHECK (frequency IN ('immediate', 'daily_digest', 'weekly_digest', 'never')),
    -- Timezone validation will be handled at application level
    
    -- Unique preference per user and scope
    CONSTRAINT uq_notification_preferences_user_scope 
        UNIQUE (user_id, source_domain, source_event_type)
);

-- Create indexes for notification tables
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_status ON notification_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_source ON notification_campaigns(source_domain, source_event_type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_campaign ON notification_templates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_key ON notification_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_campaign ON notification_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_recipient ON notification_deliveries(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_created ON notification_deliveries(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_provider ON notification_deliveries(provider, provider_message_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_unsubscribe ON notification_preferences(unsubscribe_token);

-- Initial notification campaigns
INSERT INTO notification_campaigns (
    source_domain, source_event_type, campaign_name, template_key,
    delivery_channels, priority
) VALUES
    ('identity', 'user.registered', 'Welcome Email', 'user_welcome', '["email"]', 1000),
    ('collaboration', 'collaboration.invitation.sent', 'Collaboration Invitation', 'collab_invite', '["email", "sms"]', 900),
    ('collaboration', 'collaboration.invitation.accepted', 'Invitation Accepted', 'collab_accepted', '["email", "in_app"]', 500),
    ('story', 'story.analysis.completed', 'Story Analysis Complete', 'story_analyzed', '["email", "in_app"]', 300),
    ('narration', 'narration.generation.completed', 'Narration Ready', 'narration_ready', '["email", "in_app", "push"]', 400)
ON CONFLICT (source_domain, source_event_type) DO NOTHING;