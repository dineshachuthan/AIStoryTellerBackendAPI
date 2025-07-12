# Event-Driven Microservices Architecture Design

## Architecture Overview

### Core Principles
- **Event-Driven Communication**: Services communicate through events, not direct calls
- **Service Autonomy**: Each service owns its data and business logic
- **Eventual Consistency**: Accept delayed consistency for scalability
- **CQRS Pattern**: Separate read and write models where beneficial
- **API Gateway**: Single entry point for all client requests
- **Shared Nothing**: Services share events, not databases

## Microservices Breakdown

### 1. **Identity Service** (AuthN/AuthZ)
**Responsibilities:**
- User registration and authentication
- OAuth provider integration
- JWT token generation and validation
- Session management

**Events Published:**
- `UserRegistered`
- `UserLoggedIn`
- `UserProfileUpdated`
- `UserRoleChanged`
- `UserDeleted`

**Database:**
- Users, OAuth providers, sessions

### 2. **Authorization Service** (RBAC)
**Responsibilities:**
- Role and permission management
- Permission evaluation
- Policy enforcement
- Audit logging

**Events Published:**
- `RoleCreated`
- `PermissionGranted`
- `PermissionRevoked`
- `RoleAssigned`

**Events Consumed:**
- `UserRegistered` → Create default permissions
- `SubscriptionChanged` → Update tier-based permissions

**Database:**
- Roles, permissions, role_permissions, user_roles, audit_logs

### 3. **Subscription Service**
**Responsibilities:**
- Subscription tier management
- Payment processing integration
- Usage tracking and limits
- Billing cycles

**Events Published:**
- `SubscriptionCreated`
- `SubscriptionUpgraded`
- `SubscriptionDowngraded`
- `SubscriptionExpired`
- `UsageLimitReached`
- `PaymentProcessed`

**Events Consumed:**
- `UserRegistered` → Create free tier subscription
- `StoryCreated` → Update usage count
- `CollaborationCreated` → Update collaboration count
- `VideoGenerated` → Update video usage

**Database:**
- subscription_tiers, user_subscriptions, usage_tracking, payment_history

### 4. **Story Service**
**Responsibilities:**
- Story CRUD operations
- Story analysis orchestration
- Character and emotion extraction
- Story state management

**Events Published:**
- `StoryCreated`
- `StoryUpdated`
- `StoryDeleted`
- `StoryAnalyzed`
- `StoryPublished`
- `CharactersExtracted`

**Events Consumed:**
- `UsageLimitReached` → Block story creation
- `NarrationGenerated` → Update story status
- `CollaborationCompleted` → Update story metadata

**Database:**
- stories, story_characters, story_emotions, story_analyses

### 5. **Narration Service**
**Responsibilities:**
- Audio generation with OpenAI/ElevenLabs
- Voice sample management
- Narration caching
- Voice profile management

**Events Published:**
- `NarrationGenerated`
- `VoiceSampleRecorded`
- `VoiceProfileCreated`
- `NarrationRegenerated`

**Events Consumed:**
- `StoryAnalyzed` → Generate narration
- `VoiceCloned` → Update voice profiles
- `CollaboratorVoiceReady` → Regenerate with new voice

**Database:**
- narrations, voice_samples, voice_profiles, audio_cache

### 6. **Collaboration Service**
**Responsibilities:**
- Invitation management
- Token generation and validation
- Participant tracking
- Permission management

**Events Published:**
- `CollaborationCreated`
- `InvitationSent`
- `InvitationAccepted`
- `InvitationExpired`
- `ParticipantJoined`
- `CollaborationCompleted`

**Events Consumed:**
- `SubscriptionChanged` → Update invitation limits
- `VoiceSampleRecorded` → Track participant progress
- `StoryDeleted` → Cancel active collaborations

**Database:**
- collaborations, invitations, participants, collaboration_permissions

### 7. **Notification Service** (Generic Subdomain - Updated January 12, 2025)
**Responsibilities:**
- Multi-channel notification delivery (Email, SMS, Push)
- Storage-agnostic template management (File, S3, CDN, GitHub)
- Industry-standard localization support
- Campaign management and targeting
- Delivery tracking and analytics
- User preference management

**Events Published:**
- `NotificationRequested`
- `NotificationSent`
- `NotificationDelivered`
- `NotificationFailed`
- `NotificationBounced`
- `NotificationOpened`
- `NotificationClicked`
- `TemplateUpdated`
- `PreferenceChanged`

**Events Consumed:**
- `collaboration.invitation.sent` → Send personalized invitation
- `collaboration.invitation.accepted` → Notify host
- `collaboration.submission.completed` → Alert participants
- `collaboration.completed` → Final notifications
- `story.published` → Notify followers
- `story.shared` → Share notifications
- `narration.generation.completed` → Ready notifications
- `user.registered` → Welcome email
- `subscription.created` → Confirmation email
- `subscription.expired` → Renewal reminder
- `subscription.usage.limit.reached` → Usage alerts

**Database:**
- notification_campaigns - Domain event to campaign mapping
- notification_templates - Storage-agnostic templates with localization
- notification_deliveries - Delivery tracking and analytics
- notification_preferences - User notification settings
- notification_template_localizations - Template translations
- supported_locales - Available languages and regions

### 8. **Video Service**
**Responsibilities:**
- Video generation orchestration
- Provider selection (RunwayML, Pika, Luma)
- Video caching
- Quality management

**Events Published:**
- `VideoGenerated`
- `VideoGenerationFailed`
- `VideoProcessing`

**Events Consumed:**
- `StoryAnalyzed` → Prepare for video generation
- `CollaborationCompleted` → Generate collaborative video
- `UsageLimitReached` → Block video generation

**Database:**
- video_jobs, video_cache, provider_status

### 9. **Analytics Service**
**Responsibilities:**
- Usage analytics
- Performance metrics
- User behavior tracking
- Business intelligence

**Events Consumed:**
- All events for analytics processing

**Database:**
- Read-optimized analytics database (possibly different tech like ClickHouse)

### 10. **API Gateway Service**
**Responsibilities:**
- Request routing
- Authentication/authorization
- Rate limiting
- Request/response transformation
- API versioning

## Event Bus Architecture

### Event Bus Technology Options
1. **Apache Kafka** - High throughput, durability
2. **RabbitMQ** - Flexible routing, easier setup
3. **AWS EventBridge** - Managed service, serverless
4. **Redis Streams** - Simple, fast, good for Replit

### Event Schema Registry
```typescript
interface BaseEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: string;
  version: string;
  metadata: {
    userId?: string;
    correlationId: string;
    causationId?: string;
  };
}

interface UserRegistered extends BaseEvent {
  eventType: 'UserRegistered';
  payload: {
    userId: string;
    email: string;
    role: string;
    registrationSource: string;
  };
}

interface StoryCreated extends BaseEvent {
  eventType: 'StoryCreated';
  payload: {
    storyId: string;
    authorId: string;
    title: string;
    contentHash: string;
  };
}

interface CollaborationInvited extends BaseEvent {
  eventType: 'CollaborationInvited';
  payload: {
    collaborationId: string;
    storyId: string;
    inviterId: string;
    inviteeEmail?: string;
    inviteePhone?: string;
    expiresAt: string;
  };
}
```

## Data Management Strategy

### Database per Service
Each service owns its database with no shared access:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Identity Service│     │ Story Service   │     │Collab Service   │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ PostgreSQL      │     │ PostgreSQL      │     │ PostgreSQL      │
│ - users         │     │ - stories       │     │ - invitations   │
│ - sessions      │     │ - characters    │     │ - participants  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Event Sourcing for Critical Data
Store events as source of truth for:
- User actions
- Subscription changes
- Collaboration activities

### CQRS Implementation
```typescript
// Command Model
interface CreateStoryCommand {
  userId: string;
  title: string;
  content: string;
}

// Query Model (Denormalized)
interface StoryListView {
  storyId: string;
  title: string;
  authorName: string;
  collaboratorCount: number;
  lastUpdated: string;
}
```

## Reusable UI Components Library

### Component Architecture
```
@storytelling/ui-components/
├── auth/
│   ├── LoginForm
│   ├── RegisterForm
│   └── OAuthButtons
├── stories/
│   ├── StoryCard
│   ├── StoryEditor
│   └── StoryPlayer
├── collaboration/
│   ├── InviteModal
│   ├── ParticipantList
│   └── VoiceRecorder
├── subscription/
│   ├── PricingCard
│   ├── UsageBar
│   └── UpgradePrompt
└── shared/
    ├── Button
    ├── Modal
    └── Toast
```

### Component Communication
```typescript
// Event-based component communication
interface ComponentEvent {
  type: string;
  payload: any;
}

// Example: Voice Recorder Component
const VoiceRecorder = ({ onRecordingComplete }) => {
  const eventBus = useEventBus();
  
  const handleRecording = (audioBlob) => {
    eventBus.emit('VOICE_RECORDED', {
      audioBlob,
      emotion: currentEmotion,
      duration: recordingDuration
    });
    
    onRecordingComplete?.(audioBlob);
  };
};
```

## Service Communication Patterns

### Synchronous Communication (Minimal)
- Only for real-time requirements
- Through API Gateway
- Circuit breaker pattern

### Asynchronous Communication (Preferred)
```typescript
// Event Handler Example
class StoryService {
  @EventHandler('UserSubscriptionUpgraded')
  async handleSubscriptionUpgrade(event: UserSubscriptionUpgraded) {
    await this.updateStoryLimits(event.userId, event.newTier);
  }
}
```

### Saga Pattern for Distributed Transactions
```typescript
class CollaborationSaga {
  steps = [
    { service: 'subscription', action: 'checkLimit' },
    { service: 'collaboration', action: 'createInvitation' },
    { service: 'notification', action: 'sendInvite' },
    { service: 'analytics', action: 'trackInvite' }
  ];
  
  compensations = [
    { service: 'collaboration', action: 'cancelInvitation' },
    { service: 'subscription', action: 'restoreQuota' }
  ];
}
```

## Deployment Architecture

### Container-Based Deployment
```yaml
# docker-compose.yml for local development
version: '3.8'
services:
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "3000:3000"
    
  identity-service:
    build: ./services/identity
    environment:
      - DB_URL=postgresql://identity_db:5432
      - EVENT_BUS_URL=redis://event-bus:6379
    
  story-service:
    build: ./services/story
    environment:
      - DB_URL=postgresql://story_db:5432
      - EVENT_BUS_URL=redis://event-bus:6379
    
  event-bus:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Service Discovery
- **Development**: Docker Compose networking
- **Production**: Kubernetes Services or Consul
- **Replit**: Environment-based service URLs

## Scalability Strategies

### Horizontal Scaling
- Stateless services
- Load balancing at API Gateway
- Database read replicas

### Caching Strategy
```
┌─────────┐     ┌─────────┐     ┌──────────┐
│ Client  │────▶│   CDN   │────▶│API Gateway│
└─────────┘     └─────────┘     └──────────┘
                                       │
                                 ┌─────▼─────┐
                                 │Redis Cache│
                                 └─────┬─────┘
                                       │
                                 ┌─────▼─────┐
                                 │  Services │
                                 └───────────┘
```

### Rate Limiting
```typescript
// Per-service rate limits
const rateLimits = {
  'story.create': { window: '1h', limit: 10 },
  'collaboration.invite': { window: '1d', limit: 50 },
  'video.generate': { window: '1d', limit: 5 }
};
```

## Migration Strategy from Monolith

### Phase 1: Strangler Fig Pattern
1. Deploy API Gateway in front of monolith
2. Route all traffic through gateway
3. Add authentication at gateway level

### Phase 2: Extract Authentication
1. Create Identity Service
2. Move user/session logic
3. Update monolith to validate JWT tokens

### Phase 3: Extract by Business Capability
Order of extraction:
1. Notification Service (least coupled)
2. Analytics Service (read-only)
3. Subscription Service
4. Collaboration Service
5. Story/Narration Services (most complex)

### Phase 4: Event Bus Integration
1. Add event publishing to monolith
2. New services consume events
3. Gradually remove direct DB access

## Development Workflow

### Local Development Setup
```bash
# Start all services
npm run dev:services

# Start specific service
npm run dev:service:story

# Run integration tests
npm run test:integration
```

### Service Template
```typescript
// services/template/src/index.ts
import { ServiceBase } from '@storytelling/service-framework';

export class MyService extends ServiceBase {
  name = 'my-service';
  
  async onStart() {
    await this.connectDatabase();
    await this.subscribeToEvents(['Event1', 'Event2']);
    await this.startHttpServer();
  }
  
  @EventHandler('Event1')
  async handleEvent1(event: Event1) {
    // Handle event
  }
}
```

## Monitoring and Observability

### Distributed Tracing
- Correlation IDs across services
- OpenTelemetry integration
- Trace visualization (Jaeger/Zipkin)

### Centralized Logging
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "service": "story-service",
  "level": "info",
  "correlationId": "abc-123",
  "userId": "user-456",
  "message": "Story created",
  "metadata": {
    "storyId": "story-789",
    "duration": 145
  }
}
```

### Health Checks
```typescript
// Standard health check endpoint
GET /health
{
  "status": "healthy",
  "version": "1.2.3",
  "dependencies": {
    "database": "healthy",
    "eventBus": "healthy",
    "cache": "degraded"
  }
}
```

## Security Considerations

### Service-to-Service Authentication
- mTLS for internal communication
- Service tokens with limited scope
- Network policies in Kubernetes

### API Gateway Security
- Rate limiting per user/IP
- DDoS protection
- Request validation
- API key management

### Data Encryption
- Encryption at rest (database)
- Encryption in transit (TLS)
- Event payload encryption for sensitive data

## Cost Optimization

### Service Right-Sizing
- CPU/Memory limits per service
- Auto-scaling policies
- Spot instances for non-critical services

### Event Retention
- 7 days for operational events
- 30 days for audit events
- Archive to cold storage

## Next Steps

1. **Choose Technology Stack**
   - Event bus: Redis Streams (simple) or Kafka (scale)
   - Service framework: Express + TypeScript
   - Deployment: Docker + Kubernetes

2. **Create Service Templates**
   - Base service class
   - Event handling framework
   - Database connection pooling

3. **Build Shared Libraries**
   - Event schemas
   - Authentication middleware
   - Logging/monitoring

4. **Start with First Service**
   - Identity Service (foundational)
   - Set patterns for others