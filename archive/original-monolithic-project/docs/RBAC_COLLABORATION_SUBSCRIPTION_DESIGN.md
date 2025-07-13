# RBAC, Collaboration & Subscription System Design

## Current System Analysis

### What We Have

#### 1. **Authentication & Users**
- ✅ OAuth providers (Google, Facebook, Microsoft)
- ✅ User profiles with basic fields (id, email, displayName, etc.)
- ✅ Session management
- ❌ **Missing**: Role field on users table
- ❌ **Missing**: Permissions system

#### 2. **Story Management**
- ✅ Stories table with author, content, analysis
- ✅ Story narration with ElevenLabs integration
- ✅ Story characters extraction
- ✅ Story emotions analysis
- ✅ Voice samples and recording
- ❌ **Missing**: Collaboration invitation system
- ❌ **Missing**: Invitee voice generation tracking

#### 3. **Collaboration (Partial)**
- ✅ storyCollaborations table (basic structure)
- ✅ storyGroups and storyGroupMembers tables
- ✅ characterVoiceAssignments table
- ❌ **Missing**: Invitation tokens/links
- ❌ **Missing**: Expiration handling (120 hours)
- ❌ **Missing**: SMS/Email invitation tracking
- ❌ **Missing**: Invitee limits per tier

#### 4. **Video Generation**
- ✅ Video generation providers (RunwayML, Pika, Luma)
- ✅ videoGenerations table
- ❌ **Missing**: Tier-based limits
- ❌ **Missing**: Monthly quota tracking

#### 5. **Communication**
- ✅ SendGrid package installed
- ❌ **Missing**: SMS integration (Twilio)
- ❌ **Missing**: Invitation templates
- ❌ **Missing**: Notification preferences

### Critical Gaps to Fill

## Database Schema Design

### 1. **User Roles & Permissions**

```sql
-- Add role to users table
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'member';
ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP;

-- Roles table for role definitions
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  resource VARCHAR(100) NOT NULL, -- 'story', 'user', 'cache', 'voice', etc.
  action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete', 'regenerate', etc.
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Role permissions mapping
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id),
  permission_id INTEGER REFERENCES permissions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);
```

### 2. **Subscription System**

```sql
-- Subscription tiers
CREATE TABLE subscription_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) UNIQUE NOT NULL, -- 'free', 'silver', 'gold', 'platinum'
  display_name VARCHAR(50) NOT NULL,
  price_monthly NUMERIC(10,2),
  features JSONB NOT NULL, -- {stories_per_month: 3, collaborations_per_month: 1, etc.}
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User subscription history
CREATE TABLE user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  tier_id INTEGER REFERENCES subscription_tiers(id),
  status VARCHAR(20) NOT NULL, -- 'active', 'cancelled', 'expired'
  started_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  payment_method VARCHAR(50),
  payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE user_usage_tracking (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  resource_type VARCHAR(50) NOT NULL, -- 'story', 'narration', 'video', 'collaboration'
  usage_count INTEGER DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, resource_type, period_start)
);
```

### 3. **Enhanced Collaboration System**

```sql
-- Story invitations
CREATE TABLE story_invitations (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES stories(id),
  inviter_user_id VARCHAR REFERENCES users(id),
  invitee_email VARCHAR(255),
  invitee_phone VARCHAR(20),
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  invitation_type VARCHAR(20) NOT NULL, -- 'email', 'sms'
  character_role_id INTEGER, -- specific character assignment
  permissions JSONB DEFAULT '{"can_record_voice": true, "can_regenerate": true}',
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  accepted_by_user_id VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invitee voice recordings
CREATE TABLE invitee_voice_recordings (
  id SERIAL PRIMARY KEY,
  invitation_id INTEGER REFERENCES story_invitations(id),
  user_id VARCHAR REFERENCES users(id), -- null for guest users
  guest_identifier VARCHAR(255), -- for non-registered users
  character_role_id INTEGER,
  emotion VARCHAR(50),
  audio_url TEXT,
  duration INTEGER,
  elevenlabs_voice_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Collaboration sessions
CREATE TABLE collaboration_sessions (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES stories(id),
  host_user_id VARCHAR REFERENCES users(id),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  max_participants INTEGER DEFAULT 5,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. **Credits & Points System (Future)**

```sql
-- Author credits for story remixes
CREATE TABLE author_credits (
  id SERIAL PRIMARY KEY,
  original_author_id VARCHAR REFERENCES users(id),
  story_id INTEGER REFERENCES stories(id),
  remixer_user_id VARCHAR REFERENCES users(id),
  credit_type VARCHAR(50), -- 'view', 'remix', 'share'
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## REST API Design

### 1. **RBAC Endpoints**

```typescript
// User role management
GET    /api/users/:userId/role
PUT    /api/users/:userId/role
GET    /api/users/:userId/permissions
GET    /api/roles
GET    /api/permissions

// Admin endpoints
GET    /api/admin/users?role=customer-support
PUT    /api/admin/users/:userId/status
GET    /api/admin/stories/all?userId=:userId
POST   /api/admin/cache/refresh
DELETE /api/admin/elevenlabs/voices/:voiceId
```

### 2. **Subscription Endpoints**

```typescript
// Subscription management
GET    /api/subscriptions/tiers
GET    /api/users/:userId/subscription
POST   /api/users/:userId/subscription/upgrade
POST   /api/users/:userId/subscription/cancel
GET    /api/users/:userId/usage
GET    /api/users/:userId/usage/remaining
```

### 3. **Collaboration Endpoints**

```typescript
// Story collaboration
POST   /api/stories/:storyId/invite
GET    /api/stories/:storyId/invitations
DELETE /api/invitations/:invitationId
GET    /api/invitations/validate/:token
POST   /api/invitations/accept/:token

// Voice recording for invitees
POST   /api/invitations/:token/voice/record
GET    /api/invitations/:token/voices
POST   /api/invitations/:token/regenerate

// Collaboration session
GET    /api/stories/:storyId/session
GET    /api/stories/:storyId/participants
```

## Implementation Roadmap

### Phase 1: RBAC Foundation (Week 1)
1. **Database Updates**
   - Add role column to users table
   - Create roles, permissions, role_permissions tables
   - Seed initial roles and permissions
   - Update storage.ts with new methods

2. **Middleware & Guards**
   - Create requireRole middleware
   - Create hasPermission helper
   - Update existing routes with permission checks

3. **Admin UI (Basic)**
   - User management page
   - Role assignment interface
   - Permission viewer

### Phase 2: Subscription System (Week 2)
1. **Database Setup**
   - Create subscription tables
   - Add tier limits to configuration
   - Create usage tracking system

2. **Usage Enforcement**
   - Create usage tracking middleware
   - Add tier limit checks to story creation
   - Add tier limit checks to collaboration
   - Add tier limit checks to video generation

3. **Subscription UI**
   - Pricing page
   - Upgrade/downgrade flow
   - Usage dashboard

### Phase 3: Enhanced Collaboration (Week 3-4)
1. **Invitation System**
   - Create invitation tables
   - Token generation system
   - Expiration handling (120 hours)
   - Email/SMS templates

2. **Guest User Support**
   - Guest voice recording interface
   - Temporary storage for guest recordings
   - Guest to user conversion flow

3. **Voice Regeneration**
   - Invitee voice collection UI
   - Story regeneration with invitee voices
   - Voice selection interface

4. **Notification System**
   - SendGrid email integration
   - Twilio SMS integration
   - Invitation tracking

### Phase 4: Roleplay Enhancement (Week 5)
1. **Character Assignment**
   - Character-specific invitations
   - Role assignment UI
   - Voice matching system

2. **Collaborative Playback**
   - Multi-voice story player
   - Voice switcher interface
   - Synchronized playback

### Phase 5: Credits & Gamification (Future)
1. **Points System**
   - Author credits tracking
   - Leaderboards
   - Achievement badges

2. **Public Story Library**
   - Story templates
   - Remix tracking
   - Trending stories

## Security Considerations

1. **Token Security**
   - Use cryptographically secure tokens
   - Implement rate limiting
   - Token rotation for expired invitations

2. **Permission Checks**
   - Middleware-based permission validation
   - Resource-level access control
   - Audit logging for sensitive operations

3. **Guest User Isolation**
   - Temporary storage with automatic cleanup
   - No access to other user data
   - Limited permissions

## Technical Decisions

1. **Why Database-First RBAC?**
   - Flexible permission system
   - Easy to modify without code changes
   - Audit trail capabilities

2. **Why Separate Invitation System?**
   - Support for non-registered users
   - Time-limited access control
   - Better tracking and analytics

3. **Why Usage Tracking Table?**
   - Accurate monthly limits
   - Historical usage data
   - Billing integration ready

## Next Steps

1. Review and approve this design
2. Start with Phase 1 (RBAC Foundation)
3. Create migration scripts
4. Update storage interface
5. Implement middleware
6. Test with existing features