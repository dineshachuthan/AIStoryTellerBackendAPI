# Domain-Driven Design Microservices Architecture

## Domain Model Overview

### Core Domains (Strategic Design)

```
┌─────────────────────────────────────────────────────────────────┐
│                        STORYTELLING PLATFORM                      │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Core Domain    │ Supporting      │ Generic Subdomain           │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ • Storytelling  │ • Subscription  │ • Identity Management       │
│ • Collaboration │ • Analytics     │ • Notification              │
│ • Narration     │ • Video Gen     │ • Payment Processing        │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## Bounded Contexts

### 1. **Identity & Access Context**
**Domain Focus**: User identity, authentication, and authorization

**Aggregates:**
- **User** (Aggregate Root)
  - UserId (Value Object)
  - Email (Value Object)
  - Profile (Entity)
  - OAuthProviders (Entity Collection)
  - Role (Value Object)

- **Permission** (Aggregate Root)
  - PermissionId (Value Object)
  - Resource (Value Object)
  - Action (Value Object)
  - RolePermissions (Entity Collection)

**Domain Events:**
- UserRegistered
- UserAuthenticated
- RoleAssigned
- PermissionGranted

### 2. **Subscription Context**
**Domain Focus**: Subscription management and usage tracking

**Aggregates:**
- **Subscription** (Aggregate Root)
  - SubscriptionId (Value Object)
  - UserId (Value Object)
  - Tier (Entity)
  - BillingCycle (Value Object)
  - UsageQuota (Entity)
  - PaymentMethod (Entity)

- **UsageTracking** (Aggregate Root)
  - TrackingId (Value Object)
  - ResourceType (Value Object)
  - Period (Value Object)
  - Consumption (Entity Collection)

**Domain Events:**
- SubscriptionCreated
- TierUpgraded
- QuotaExceeded
- PaymentProcessed

### 3. **Storytelling Context** (Core Domain)
**Domain Focus**: Story creation, analysis, and management

**Aggregates:**
- **Story** (Aggregate Root)
  - StoryId (Value Object)
  - Title (Value Object)
  - Content (Entity)
  - Author (Value Object)
  - Characters (Entity Collection)
  - Emotions (Entity Collection)
  - PublicationStatus (Value Object)

- **StoryAnalysis** (Aggregate Root)
  - AnalysisId (Value Object)
  - StoryId (Value Object)
  - ExtractedData (Entity)
  - AnalysisType (Value Object)

**Domain Events:**
- StoryCreated
- StoryAnalyzed
- CharactersExtracted
- StoryPublished

### 4. **Narration Context** (Core Domain)
**Domain Focus**: Voice generation and audio management

**Aggregates:**
- **NarratorVoice** (Aggregate Root)
  - VoiceId (Value Object)
  - UserId (Value Object)
  - VoiceSamples (Entity Collection)
  - VoiceProfile (Entity)
  - TrainingStatus (Value Object)

- **StoryNarration** (Aggregate Root)
  - NarrationId (Value Object)
  - StoryId (Value Object)
  - Segments (Entity Collection)
  - VoiceConfiguration (Entity)

**Domain Events:**
- VoiceSampleRecorded
- VoiceProfileTrained
- NarrationGenerated
- NarrationRegenerated

### 5. **Collaboration Context** (Core Domain)
**Domain Focus**: Multi-user story collaboration

**Aggregates:**
- **CollaborationSession** (Aggregate Root)
  - SessionId (Value Object)
  - StoryId (Value Object)
  - Host (Value Object)
  - Invitations (Entity Collection)
  - Participants (Entity Collection)
  - SessionSettings (Entity)

- **Invitation** (Aggregate Root)
  - InvitationId (Value Object)
  - Token (Value Object)
  - Recipient (Value Object)
  - ExpirationTime (Value Object)
  - Permissions (Entity)

**Domain Events:**
- CollaborationStarted
- InvitationSent
- ParticipantJoined
- VoiceContributed

### 6. **Video Generation Context**
**Domain Focus**: Video creation from stories

**Aggregates:**
- **VideoJob** (Aggregate Root)
  - JobId (Value Object)
  - StoryId (Value Object)
  - Provider (Value Object)
  - Configuration (Entity)
  - Status (Value Object)

**Domain Events:**
- VideoJobCreated
- VideoGenerated
- VideoFailed

## Kubernetes-Ready Architecture with Sidecar Pattern

### Container Structure
```
storytelling-platform/
├── services/
│   ├── identity-service/
│   │   ├── Dockerfile
│   │   ├── src/
│   │   └── k8s/
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       └── configmap.yaml
│   ├── subscription-service/
│   ├── story-service/
│   ├── narration-service/
│   ├── collaboration-service/
│   └── video-service/
├── sidecars/
│   ├── auth-proxy/           # JWT validation & authorization
│   ├── logging-agent/        # Structured logging collection
│   ├── metrics-exporter/     # Prometheus metrics
│   ├── circuit-breaker/      # Fault tolerance
│   ├── rate-limiter/         # API rate limiting
│   └── secret-manager/       # Secret rotation & injection
├── shared/
│   ├── domain-events/
│   ├── value-objects/
│   └── infrastructure/
├── k8s/
│   ├── namespace.yaml
│   ├── ingress.yaml
│   ├── service-mesh.yaml     # Istio/Linkerd configuration
│   └── secrets.yaml
└── docker-compose.yaml
```

### Cross-Cutting Concerns as Sidecars

#### 1. **Authentication & Authorization Sidecar**
```yaml
# Handles JWT validation, permission checks, and request enrichment
- name: auth-proxy
  image: storytelling/auth-proxy:latest
  ports:
  - containerPort: 8080
  env:
  - name: UPSTREAM_SERVICE
    value: "localhost:3000"
  - name: JWT_PUBLIC_KEY
    valueFrom:
      secretKeyRef:
        name: jwt-keys
        key: public
  volumeMounts:
  - name: auth-config
    mountPath: /etc/auth
```

#### 2. **Logging Sidecar**
```yaml
# Collects and forwards structured logs
- name: fluent-bit
  image: fluent/fluent-bit:latest
  volumeMounts:
  - name: app-logs
    mountPath: /var/log
  - name: fluent-bit-config
    mountPath: /fluent-bit/etc/
```

#### 3. **Metrics Sidecar**
```yaml
# Exports Prometheus metrics
- name: metrics-exporter
  image: prom/node-exporter:latest
  ports:
  - containerPort: 9100
  args:
  - '--path.rootfs=/host'
  - '--path.procfs=/host/proc'
  - '--path.sysfs=/host/sys'
```

#### 4. **Circuit Breaker Sidecar**
```yaml
# Provides fault tolerance and retry logic
- name: envoy-proxy
  image: envoyproxy/envoy:latest
  ports:
  - containerPort: 9901
  - containerPort: 10000
  volumeMounts:
  - name: envoy-config
    mountPath: /etc/envoy
```

### Service Dockerfile Template
```dockerfile
# Base image
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM base AS production
COPY --from=build /app/dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
```

### Kubernetes Deployment Template with Sidecars
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: identity-service
  namespace: storytelling
  annotations:
    sidecar.istio.io/inject: "true"  # Enable service mesh injection
spec:
  replicas: 3
  selector:
    matchLabels:
      app: identity-service
  template:
    metadata:
      labels:
        app: identity-service
        version: v1
    spec:
      containers:
      # Main application container
      - name: identity-service
        image: storytelling/identity-service:latest
        ports:
        - containerPort: 3000
          name: app
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: identity-db-secret
              key: url
        - name: EVENT_BUS_URL
          valueFrom:
            configMapKeyRef:
              name: infrastructure-config
              key: event-bus-url
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: app-logs
          mountPath: /var/log/app
        - name: app-config
          mountPath: /app/config

      # Authentication proxy sidecar
      - name: auth-proxy
        image: storytelling/auth-proxy:latest
        ports:
        - containerPort: 8080
          name: proxy
        env:
        - name: UPSTREAM_SERVICE
          value: "localhost:3000"
        - name: SERVICE_NAME
          value: "identity-service"
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        volumeMounts:
        - name: auth-config
          mountPath: /etc/auth
        - name: jwt-keys
          mountPath: /etc/jwt

      # Logging sidecar
      - name: fluent-bit
        image: fluent/fluent-bit:2.0
        resources:
          requests:
            memory: "32Mi"
            cpu: "25m"
          limits:
            memory: "64Mi"
            cpu: "50m"
        volumeMounts:
        - name: app-logs
          mountPath: /var/log/app
        - name: fluent-bit-config
          mountPath: /fluent-bit/etc

      # Metrics sidecar
      - name: prometheus-exporter
        image: prom/node-exporter:latest
        ports:
        - containerPort: 9100
          name: metrics
        resources:
          requests:
            memory: "32Mi"
            cpu: "25m"
          limits:
            memory: "64Mi"
            cpu: "50m"

      # Secret rotation sidecar
      - name: secret-manager
        image: storytelling/secret-rotator:latest
        env:
        - name: ROTATION_INTERVAL
          value: "86400"  # 24 hours
        resources:
          requests:
            memory: "32Mi"
            cpu: "25m"
          limits:
            memory: "64Mi"
            cpu: "50m"
        volumeMounts:
        - name: secrets
          mountPath: /etc/secrets

      volumes:
      - name: app-logs
        emptyDir: {}
      - name: app-config
        configMap:
          name: identity-service-config
      - name: auth-config
        configMap:
          name: auth-proxy-config
      - name: fluent-bit-config
        configMap:
          name: fluent-bit-config
      - name: jwt-keys
        secret:
          secretName: jwt-keys
      - name: secrets
        secret:
          secretName: identity-service-secrets
```

### Sidecar Service Definitions

#### 5. **Rate Limiter Sidecar**
```dockerfile
# sidecars/rate-limiter/Dockerfile
FROM envoyproxy/envoy:v1.25-latest
COPY envoy-ratelimit.yaml /etc/envoy/envoy.yaml
CMD ["/usr/local/bin/envoy", "-c", "/etc/envoy/envoy.yaml"]
```

```yaml
# Rate limiting configuration
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          http_filters:
          - name: envoy.filters.http.local_ratelimit
            typed_config:
              "@type": type.googleapis.com/udpa.type.v1.TypedStruct
              type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
              value:
                stat_prefix: http_local_rate_limiter
                token_bucket:
                  max_tokens: 100
                  tokens_per_fill: 100
                  fill_interval: 60s
```

#### 6. **Distributed Tracing Sidecar**
```yaml
# OpenTelemetry collector for distributed tracing
- name: otel-collector
  image: otel/opentelemetry-collector:latest
  ports:
  - containerPort: 4317  # OTLP gRPC
  - containerPort: 4318  # OTLP HTTP
  env:
  - name: JAEGER_ENDPOINT
    value: "http://jaeger-collector:14250"
  resources:
    requests:
      memory: "64Mi"
      cpu: "50m"
```

#### 7. **Cache Proxy Sidecar**
```yaml
# Redis cache proxy for performance
- name: redis-proxy
  image: haproxy:alpine
  ports:
  - containerPort: 6379
  volumeMounts:
  - name: haproxy-config
    mountPath: /usr/local/etc/haproxy
  resources:
    requests:
      memory: "32Mi"
      cpu: "25m"
```

### Service Mesh Configuration

#### Istio Service Mesh Integration
```yaml
# k8s/service-mesh.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: identity-service
  namespace: storytelling
spec:
  hosts:
  - identity-service
  http:
  - match:
    - headers:
        api-version:
          exact: v2
    route:
    - destination:
        host: identity-service
        subset: v2
  - route:
    - destination:
        host: identity-service
        subset: v1
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: identity-service
  namespace: storytelling
spec:
  host: identity-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    loadBalancer:
      consistentHash:
        httpCookie:
          name: "session"
          ttl: 3600s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

### Benefits of Sidecar Pattern

1. **Separation of Concerns**
   - Business logic isolated from infrastructure concerns
   - Microservices focus only on domain logic
   - Sidecars handle cross-cutting functionality

2. **Consistent Implementation**
   - Same sidecar image used across all services
   - Centralized configuration management
   - Uniform security and monitoring

3. **Independent Scaling**
   - Scale sidecars independently from main service
   - Resource allocation based on actual usage
   - Better resource utilization

4. **Easy Updates**
   - Update sidecars without touching application code
   - Rolling updates for infrastructure components
   - Zero downtime deployments

5. **Language Agnostic**
   - Sidecars work with any programming language
   - No need to implement cross-cutting concerns in each language
   - Polyglot microservices support

## Database Schemas per Bounded Context

### Identity & Access Context Database
```sql
-- Users Aggregate
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  display_name VARCHAR(100),
  profile_image_url VARCHAR(500),
  role VARCHAR(50) DEFAULT 'member',
  external_id VARCHAR(20) UNIQUE,
  language VARCHAR(10) DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Domain invariants
  CHECK (role IN ('member', 'admin', 'super-admin', 'customer-support', 'content-moderator'))
);

-- OAuth Providers
CREATE TABLE oauth_providers (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id),
  provider VARCHAR(50) NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  provider_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

-- Roles and Permissions
CREATE TABLE roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE permissions (
  id VARCHAR(50) PRIMARY KEY,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
  role_id VARCHAR(50) REFERENCES roles(id),
  permission_id VARCHAR(50) REFERENCES permissions(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(role_id, permission_id)
);

-- Domain Events
CREATE TABLE domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id VARCHAR(50) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  event_version INTEGER DEFAULT 1,
  occurred_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_aggregate (aggregate_id, aggregate_type),
  INDEX idx_event_type (event_type)
);
```

### Subscription Context Database
```sql
-- Subscription Tiers
CREATE TABLE subscription_tiers (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  price_monthly DECIMAL(10,2),
  features JSONB NOT NULL,
  limits JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) NOT NULL,
  tier_id VARCHAR(20) REFERENCES subscription_tiers(id),
  status VARCHAR(20) NOT NULL,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  payment_method_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (status IN ('active', 'cancelled', 'expired', 'suspended'))
);

-- Usage Tracking
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  resource_type VARCHAR(50) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  used_count INTEGER DEFAULT 0,
  limit_count INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subscription_id, resource_type, period_start)
);

-- Payment History
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  payment_provider_id VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Storytelling Context Database
```sql
-- Stories Aggregate
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  author_id VARCHAR(50) NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  status VARCHAR(50) DEFAULT 'draft',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (status IN ('draft', 'analyzing', 'analyzed', 'published', 'archived'))
);

-- Story Characters
CREATE TABLE story_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  personality TEXT,
  role VARCHAR(50),
  traits JSONB,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Story Emotions
CREATE TABLE story_emotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id),
  emotion VARCHAR(100) NOT NULL,
  intensity INTEGER CHECK (intensity BETWEEN 1 AND 10),
  context TEXT,
  quote TEXT,
  segment_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Story Analysis
CREATE TABLE story_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id),
  analysis_type VARCHAR(20) NOT NULL,
  analysis_data JSONB NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(story_id, analysis_type)
);
```

### Narration Context Database
```sql
-- Narrator Voices
CREATE TABLE narrator_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) NOT NULL,
  voice_name VARCHAR(200),
  provider VARCHAR(50) NOT NULL,
  provider_voice_id VARCHAR(255),
  training_status VARCHAR(50) DEFAULT 'pending',
  quality_score DECIMAL(3,2),
  voice_settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (training_status IN ('pending', 'collecting', 'training', 'ready', 'failed'))
);

-- Voice Samples
CREATE TABLE voice_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  narrator_voice_id UUID REFERENCES narrator_voices(id),
  emotion VARCHAR(100) NOT NULL,
  sample_text TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds DECIMAL(10,2),
  file_size_bytes INTEGER,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Story Narrations
CREATE TABLE story_narrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL,
  narrator_voice_id UUID REFERENCES narrator_voices(id),
  generation_status VARCHAR(50) DEFAULT 'pending',
  total_segments INTEGER,
  audio_format VARCHAR(20) DEFAULT 'mp3',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Narration Segments
CREATE TABLE narration_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  narration_id UUID REFERENCES story_narrations(id),
  segment_index INTEGER NOT NULL,
  text_content TEXT NOT NULL,
  emotion VARCHAR(100),
  audio_url TEXT,
  duration_seconds DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(narration_id, segment_index)
);
```

### Collaboration Context Database
```sql
-- Collaboration Sessions
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL,
  host_user_id VARCHAR(50) NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  max_participants INTEGER DEFAULT 5,
  status VARCHAR(50) DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (status IN ('active', 'completed', 'expired', 'cancelled'))
);

-- Invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES collaboration_sessions(id),
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  delivery_method VARCHAR(20) NOT NULL,
  character_assignment UUID,
  permissions JSONB DEFAULT '{"can_record": true, "can_regenerate": true}',
  sent_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  accepted_by_user_id VARCHAR(50),
  CHECK (delivery_method IN ('email', 'sms'))
);

-- Participants
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES collaboration_sessions(id),
  user_id VARCHAR(50),
  guest_identifier VARCHAR(255),
  display_name VARCHAR(200),
  assigned_character_id UUID,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW(),
  contributions JSONB DEFAULT '{}',
  UNIQUE(session_id, COALESCE(user_id, guest_identifier))
);

-- Voice Contributions
CREATE TABLE voice_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  emotion VARCHAR(100) NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds DECIMAL(10,2),
  quality_score DECIMAL(3,2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  CHECK (status IN ('pending', 'approved', 'rejected'))
);
```

### Video Generation Context Database
```sql
-- Video Jobs
CREATE TABLE video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  job_status VARCHAR(50) DEFAULT 'queued',
  configuration JSONB NOT NULL,
  provider_job_id VARCHAR(255),
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  CHECK (job_status IN ('queued', 'processing', 'completed', 'failed', 'cancelled'))
);

-- Generated Videos
CREATE TABLE generated_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES video_jobs(id),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds DECIMAL(10,2),
  resolution VARCHAR(20),
  file_size_bytes BIGINT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Event Store Schema (Shared)
```sql
CREATE TABLE event_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id VARCHAR(255) NOT NULL,
  stream_type VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  event_metadata JSONB,
  event_version INTEGER NOT NULL,
  occurred_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_stream (stream_id, stream_type),
  INDEX idx_event_type (event_type),
  UNIQUE(stream_id, event_version)
);
```

## Service Communication

### Anti-Corruption Layer
```typescript
// Example: Story Service consuming User events
export class UserEventAdapter {
  @EventHandler('Identity.UserRegistered')
  async handleUserRegistered(event: ExternalUserRegisteredEvent) {
    // Transform external event to internal domain event
    const internalEvent: AuthorCreated = {
      authorId: event.payload.userId,
      displayName: event.payload.displayName,
      email: event.payload.email
    };
    
    await this.domainEventBus.publish(internalEvent);
  }
}
```

### Saga Implementation
```typescript
export class StoryPublishingSaga {
  private readonly steps = [
    'validateStoryContent',
    'generateNarration',
    'createVideoJob',
    'notifyFollowers'
  ];
  
  async execute(command: PublishStoryCommand): Promise<void> {
    const sagaId = generateSagaId();
    
    try {
      // Step 1: Validate
      await this.storyService.validate(command.storyId);
      
      // Step 2: Generate narration
      const narrationId = await this.narrationService.generate(command.storyId);
      
      // Step 3: Create video
      const videoJobId = await this.videoService.createJob(command.storyId);
      
      // Step 4: Notify
      await this.notificationService.notifyFollowers(command.authorId);
      
    } catch (error) {
      await this.compensate(sagaId, error);
      throw error;
    }
  }
}
```

## Repository Pattern Implementation
```typescript
// Domain Repository Interface
export interface StoryRepository {
  findById(id: StoryId): Promise<Story | null>;
  save(story: Story): Promise<void>;
  findByAuthor(authorId: UserId): Promise<Story[]>;
}

// Infrastructure Implementation
export class PostgresStoryRepository implements StoryRepository {
  async save(story: Story): Promise<void> {
    const events = story.getUncommittedEvents();
    
    await this.db.transaction(async (trx) => {
      // Save aggregate state
      await trx.insert(stories).values(story.toSnapshot());
      
      // Save domain events
      for (const event of events) {
        await trx.insert(eventStore).values({
          streamId: story.id.value,
          streamType: 'Story',
          eventType: event.type,
          eventData: event.payload,
          eventVersion: event.version
        });
      }
    });
    
    // Publish events to event bus
    await this.eventBus.publishAll(events);
  }
}
```

## Value Objects
```typescript
// Shared Value Objects
export class UserId {
  constructor(readonly value: string) {
    if (!value || value.length < 10) {
      throw new Error('Invalid user ID');
    }
  }
  
  equals(other: UserId): boolean {
    return this.value === other.value;
  }
}

export class Email {
  constructor(readonly value: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error('Invalid email format');
    }
  }
}

export class StoryTitle {
  constructor(readonly value: string) {
    if (!value || value.length < 3 || value.length > 500) {
      throw new Error('Title must be between 3 and 500 characters');
    }
  }
}
```

## Domain Services
```typescript
export class StoryAnalysisService {
  constructor(
    private readonly aiProvider: AIProvider,
    private readonly repository: StoryRepository
  ) {}
  
  async analyzeStory(storyId: StoryId): Promise<StoryAnalysis> {
    const story = await this.repository.findById(storyId);
    if (!story) {
      throw new StoryNotFoundError(storyId);
    }
    
    // Complex business logic that doesn't belong in aggregate
    const analysis = await this.aiProvider.analyze(story.content);
    
    // Update story with analysis
    story.applyAnalysis(analysis);
    await this.repository.save(story);
    
    return analysis;
  }
}
```

## Next Steps

1. **Set up development environment**
   - Docker Compose for local development
   - Kubernetes manifests for deployment
   - CI/CD pipeline configuration

2. **Implement shared kernel**
   - Domain events library
   - Value objects library
   - Infrastructure components

3. **Start with Identity Context**
   - Most foundational service
   - Other services depend on it
   - Sets patterns for others