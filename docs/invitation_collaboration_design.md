# Invitation Collaboration Design Document

## Overview
This document outlines the design decisions for the invitation collaboration system, specifically focusing on conversation style handling and schema design for relationship-aware narration.

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

### Provider Failover Strategy
```
Email Delivery Priority:
1. MailGun (primary) - sandbox configured, production ready
2. SendGrid (fallback) - backup provider

SMS Delivery Priority:
1. Twilio (primary) - industry standard, reliable
2. MessageBird (fallback) - international SMS support

Failover Logic:
- If primary provider fails, automatically attempt secondary
- Log all attempts in notification_deliveries table
- Retry failed notifications with exponential backoff
- Maximum 3 retry attempts per notification
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

#### 1. **notification_deliveries** (NEW)
```sql
-- Tracks individual notification attempts (email/SMS)
CREATE TABLE notification_deliveries (
  id SERIAL PRIMARY KEY,
  invitation_id INTEGER REFERENCES story_invitations(id),
  delivery_type VARCHAR(10) NOT NULL, -- 'email' or 'sms'
  provider VARCHAR(50) NOT NULL, -- 'mailgun', 'sendgrid', 'twilio', 'messagebird'
  recipient VARCHAR(255) NOT NULL, -- email address or phone number
  status VARCHAR(20) NOT NULL, -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
  provider_message_id VARCHAR(255), -- External provider's message ID
  provider_response JSONB, -- Full provider response
  error_message TEXT, -- Error details if failed
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP, -- For batch processing
  sent_at TIMESTAMP, -- When actually sent
  delivered_at TIMESTAMP, -- When confirmed delivered
  failed_at TIMESTAMP, -- When permanently failed
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_notification_deliveries_invitation ON notification_deliveries(invitation_id);
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX idx_notification_deliveries_scheduled ON notification_deliveries(scheduled_at);
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

### Provider Integration Strategy
- **Email Providers**: MailGun (priority 1), SendGrid (priority 2)
- **SMS Providers**: Twilio (priority 1), MessageBird (priority 2)
- **Delivery Tracking**: Each provider response stored in `provider_response` JSONB
- **Retry Logic**: Exponential backoff with max 3 retries per notification