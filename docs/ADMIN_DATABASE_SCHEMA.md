# Admin Database Schema Design

## Overview

This document defines all database tables required for the comprehensive admin dashboard system. These tables support role-based access control, audit logging, system configuration, and operational management.

## Required Tables

### 1. **Roles & Permissions**

```sql
-- User roles table
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- 'super-admin', 'admin', 'customer-support', 'content-moderator'
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT true, -- System roles cannot be deleted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Update users table to add role
ALTER TABLE users 
  ADD COLUMN role_id INTEGER REFERENCES roles(id),
  ADD COLUMN is_super_admin BOOLEAN DEFAULT false;

-- Permissions table
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  resource VARCHAR(100) NOT NULL, -- 'users', 'stories', 'notifications', 'system', etc.
  action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete', 'moderate', etc.
  scope VARCHAR(50), -- 'own', 'all', 'assigned' (for granular control)
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Role-permission mapping
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Create indexes
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_users_role ON users(role_id);
```

### 2. **Audit & Activity Logging**

```sql
-- Admin action audit log
CREATE TABLE admin_audit_log (
  id SERIAL PRIMARY KEY,
  admin_user_id VARCHAR REFERENCES users(id) NOT NULL,
  action_type VARCHAR(100) NOT NULL, -- 'user.updated', 'story.moderated', 'config.changed'
  resource_type VARCHAR(50) NOT NULL, -- 'user', 'story', 'system'
  resource_id VARCHAR(255), -- ID of affected resource
  changes JSONB, -- Before/after values
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(50), -- For tracing
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin sessions for security tracking
CREATE TABLE admin_sessions (
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
CREATE INDEX idx_audit_log_admin ON admin_audit_log(admin_user_id);
CREATE INDEX idx_audit_log_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON admin_audit_log(created_at);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);
```

### 3. **System Configuration**

```sql
-- Feature flags
CREATE TABLE feature_flags (
  id SERIAL PRIMARY KEY,
  flag_key VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  enabled_for_users TEXT[], -- Specific user IDs for gradual rollout
  enabled_percentage INTEGER DEFAULT 0, -- Percentage rollout
  config JSONB, -- Additional configuration
  updated_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- System configuration
CREATE TABLE system_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  config_type VARCHAR(50) NOT NULL, -- 'string', 'number', 'boolean', 'json'
  category VARCHAR(50) NOT NULL, -- 'email', 'storage', 'ai', 'limits'
  display_name VARCHAR(200),
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false, -- Hide value in UI
  validation_rules JSONB, -- Min/max, regex, etc.
  updated_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX idx_system_config_category ON system_config(category);
```

### 4. **Content Moderation**

```sql
-- Content moderation queue
CREATE TABLE moderation_queue (
  id SERIAL PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL, -- 'story', 'voice_sample', 'image'
  content_id INTEGER NOT NULL,
  reported_by VARCHAR REFERENCES users(id),
  reason VARCHAR(100) NOT NULL, -- 'inappropriate', 'spam', 'copyright', 'other'
  reason_details TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewing', 'approved', 'rejected'
  priority INTEGER DEFAULT 5, -- 1-10, higher is more urgent
  assigned_to VARCHAR REFERENCES users(id),
  moderation_notes TEXT,
  action_taken VARCHAR(100), -- 'removed', 'warned', 'banned', 'approved'
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Moderation rules
CREATE TABLE moderation_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- 'keyword', 'pattern', 'ai_score'
  rule_config JSONB NOT NULL, -- Keywords, regex patterns, thresholds
  action VARCHAR(50) NOT NULL, -- 'flag', 'auto_remove', 'quarantine'
  severity INTEGER DEFAULT 5, -- 1-10
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX idx_moderation_queue_content ON moderation_queue(content_type, content_id);
CREATE INDEX idx_moderation_queue_assigned ON moderation_queue(assigned_to);
```

### 5. **Admin Notifications & Alerts**

```sql
-- Admin alerts
CREATE TABLE admin_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(100) NOT NULL, -- 'system.error', 'quota.exceeded', 'moderation.urgent'
  severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'critical'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB, -- Additional context
  is_resolved BOOLEAN DEFAULT false,
  resolved_by VARCHAR REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Alert subscriptions
CREATE TABLE admin_alert_subscriptions (
  id SERIAL PRIMARY KEY,
  admin_user_id VARCHAR REFERENCES users(id) NOT NULL,
  alert_type VARCHAR(100) NOT NULL,
  channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'webhook', 'in_app'
  is_active BOOLEAN DEFAULT true,
  config JSONB, -- Channel-specific config (webhook URL, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(admin_user_id, alert_type, channel)
);

-- Create indexes
CREATE INDEX idx_admin_alerts_type ON admin_alerts(alert_type);
CREATE INDEX idx_admin_alerts_resolved ON admin_alerts(is_resolved);
CREATE INDEX idx_admin_alerts_created ON admin_alerts(created_at);
```

### 6. **Analytics & Reporting**

```sql
-- Admin dashboards
CREATE TABLE admin_dashboards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  layout JSONB NOT NULL, -- Widget positions and sizes
  is_default BOOLEAN DEFAULT false,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Dashboard widgets
CREATE TABLE admin_dashboard_widgets (
  id SERIAL PRIMARY KEY,
  dashboard_id INTEGER REFERENCES admin_dashboards(id) ON DELETE CASCADE,
  widget_type VARCHAR(50) NOT NULL, -- 'metric', 'chart', 'table', 'alert'
  title VARCHAR(100) NOT NULL,
  config JSONB NOT NULL, -- Query, filters, display options
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Saved reports
CREATE TABLE admin_reports (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL, -- 'users', 'content', 'revenue', 'custom'
  query JSONB NOT NULL, -- Report configuration
  schedule VARCHAR(50), -- 'daily', 'weekly', 'monthly', null for on-demand
  recipients TEXT[], -- Email addresses
  last_run_at TIMESTAMP,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_dashboard_widgets_dashboard ON admin_dashboard_widgets(dashboard_id);
CREATE INDEX idx_admin_reports_type ON admin_reports(report_type);
```

### 7. **Cache Management**

```sql
-- Cache invalidation log
CREATE TABLE cache_invalidation_log (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL,
  cache_type VARCHAR(50) NOT NULL, -- 'story', 'user', 'audio', 'analysis'
  invalidated_by VARCHAR REFERENCES users(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_cache_invalidation_type ON cache_invalidation_log(cache_type);
CREATE INDEX idx_cache_invalidation_created ON cache_invalidation_log(created_at);
```

## Initial Data

```sql
-- Insert default roles
INSERT INTO roles (name, display_name, description) VALUES
  ('super-admin', 'Super Administrator', 'Full system access with all permissions'),
  ('admin', 'Administrator', 'General admin access'),
  ('customer-support', 'Customer Support', 'User assistance and basic moderation'),
  ('content-moderator', 'Content Moderator', 'Content review and moderation');

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
  ('reports', 'create', 'all');

-- Assign permissions to super-admin (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'super-admin'),
  id
FROM permissions;
```

## Migration Notes

1. **Existing isAdmin Field**: The current `users.isAdmin` field should be migrated to proper roles
2. **Session Security**: Admin sessions are separate from regular user sessions for enhanced security
3. **Audit Compliance**: All admin actions are logged for compliance and security
4. **Performance**: Proper indexes ensure admin queries don't impact main application
5. **Extensibility**: JSONB fields allow flexible configuration without schema changes