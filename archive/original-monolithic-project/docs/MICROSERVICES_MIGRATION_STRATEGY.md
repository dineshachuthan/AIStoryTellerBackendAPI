# Microservices Migration Strategy

## Overview

This document outlines the incremental migration strategy from the current monolithic architecture to the Domain-Driven Design microservices architecture. The approach follows the **Strangler Fig Pattern** to ensure zero downtime and gradual transition.

## Core Principles

### 1. **No Breaking Changes**
- Current application continues running throughout migration
- All existing APIs remain functional
- Database changes are backward compatible
- Features are migrated, not removed

### 2. **Living Documentation**
- Update docs with every migration step
- Document decisions and learnings
- Track API deprecations
- Maintain migration progress dashboard

### 3. **Incremental Migration**
- One bounded context at a time
- Feature flags for gradual rollout
- Parallel running of old and new code
- Careful data synchronization

## Migration Phases

### Phase 0: Foundation (Current State Analysis)
**Duration**: 1 week

1. **Document Current State**
   ```markdown
   - [ ] Map all existing APIs to new microservices
   - [ ] Identify shared database tables
   - [ ] Document integration points
   - [ ] List external dependencies
   ```

2. **Set Up Infrastructure**
   ```yaml
   # docker-compose.yml for local development
   version: '3.8'
   services:
     api-gateway:
       image: kong:latest
       ports:
         - "8000:8000"
     
     redis:
       image: redis:alpine
       ports:
         - "6379:6379"
     
     postgres-identity:
       image: postgres:15
       environment:
         POSTGRES_DB: identity_db
   ```

3. **Create Shared Libraries**
   ```typescript
   // shared/domain-events/base-event.ts
   export interface DomainEvent {
     eventId: string;
     aggregateId: string;
     eventType: string;
     eventData: any;
     occurredAt: Date;
     version: number;
   }
   ```

### Phase 1: Identity Service Extraction
**Duration**: 2 weeks

1. **Identify Boundaries**
   ```typescript
   // Current monolith code to migrate:
   - server/auth.ts
   - server/oauth-config.ts
   - Routes: /api/auth/*, /api/users/*
   - Tables: users, oauth_providers, sessions
   ```

2. **Create Service Adapter**
   ```typescript
   // server/adapters/identity-adapter.ts
   export class IdentityServiceAdapter {
     private useNewService = process.env.USE_IDENTITY_SERVICE === 'true';
     
     async authenticate(email: string, password: string) {
       if (this.useNewService) {
         return this.callIdentityService('/auth/login', { email, password });
       }
       return this.legacyAuth.authenticate(email, password);
     }
   }
   ```

3. **Gradual Migration Steps**
   - Week 1: Deploy Identity Service (dark launch)
   - Week 2: Route read operations to new service
   - Week 3: Route write operations
   - Week 4: Decommission old code

### Phase 2: Subscription Service Extraction
**Duration**: 2 weeks

1. **Data Synchronization Strategy**
   ```typescript
   // Event-based sync between databases
   export class SubscriptionSyncService {
     @EventHandler('User.SubscriptionUpdated')
     async syncToNewService(event: DomainEvent) {
       await this.subscriptionService.updateSubscription({
         userId: event.aggregateId,
         tier: event.eventData.tier
       });
     }
   }
   ```

2. **Feature Flags**
   ```typescript
   // Use feature flags for gradual rollout
   if (featureFlags.isEnabled('new-subscription-service', userId)) {
     return subscriptionServiceAdapter.checkUsage(userId);
   }
   return legacyStorage.checkUsage(userId);
   ```

### Phase 3: Story Service Extraction
**Duration**: 3 weeks

1. **Complex Migration: Shared Data**
   ```sql
   -- Stories table used by multiple contexts
   -- Solution: Event sourcing for synchronization
   
   -- Add event tracking
   ALTER TABLE stories ADD COLUMN last_event_id UUID;
   ALTER TABLE stories ADD COLUMN sync_version INTEGER DEFAULT 0;
   ```

2. **API Gateway Routing**
   ```nginx
   # Kong/Nginx routing configuration
   location /api/stories {
     if ($http_x_feature_flag = "new-story-service") {
       proxy_pass http://story-service:3003;
     }
     proxy_pass http://monolith:5000;
   }
   ```

### Phase 4: Collaboration Service
**Duration**: 2 weeks

- Extract invitation system
- Migrate SMS/Email integration
- Handle guest user sessions

### Phase 5: Narration & Video Services
**Duration**: 3 weeks

- Extract AI integrations
- Migrate file storage
- Handle long-running jobs

## Migration Patterns

### 1. **Database Migration Pattern**
```typescript
// Dual-write pattern for data consistency
export class DualWriteRepository {
  async save(entity: Story) {
    // Write to old database
    await this.legacyDb.save(entity);
    
    // Publish event for new service
    await this.eventBus.publish({
      type: 'Story.Created',
      data: entity
    });
  }
}
```

### 2. **API Versioning Strategy**
```typescript
// Support both old and new API formats
app.get('/api/stories/:id', async (req, res) => {
  const apiVersion = req.headers['api-version'] || 'v1';
  
  if (apiVersion === 'v2') {
    // New microservice response format
    return res.json(await storyService.getStoryV2(req.params.id));
  }
  
  // Legacy response format
  return res.json(await storage.getStory(req.params.id));
});
```

### 3. **Event Bus Integration**
```typescript
// Gradual event bus adoption
export class EventBusAdapter {
  private redis = new Redis();
  
  async publish(event: DomainEvent) {
    // Publish to Redis for new services
    await this.redis.xadd('events', '*', 
      'type', event.eventType,
      'data', JSON.stringify(event)
    );
    
    // Also handle in monolith for transition
    await this.legacyEventHandler.handle(event);
  }
}
```

## Monitoring & Rollback

### 1. **Health Checks**
```typescript
// Monitor both old and new services
export const healthCheck = async () => {
  const checks = {
    monolith: await checkMonolith(),
    identityService: await checkIdentityService(),
    subscriptionService: await checkSubscriptionService(),
    database: await checkDatabase(),
    eventBus: await checkEventBus()
  };
  
  return {
    status: Object.values(checks).every(c => c.healthy) ? 'healthy' : 'degraded',
    services: checks
  };
};
```

### 2. **Feature Kill Switches**
```typescript
// Emergency rollback capability
export class FeatureKillSwitch {
  async disableService(serviceName: string) {
    await this.redis.set(`kill-switch:${serviceName}`, 'true');
    await this.notifyOps(`Service ${serviceName} disabled`);
  }
}
```

## Documentation Updates

### 1. **Migration Tracking**
```markdown
# Migration Progress Dashboard

## Identity Service
- [x] Service created
- [x] Database schema
- [x] API implementation
- [ ] Adapter integration
- [ ] Dark launch
- [ ] Traffic migration (0%)
- [ ] Legacy cleanup

## Subscription Service
- [ ] Service created
- [ ] Database schema
...
```

### 2. **API Deprecation Timeline**
```yaml
# api-deprecation.yaml
deprecations:
  - endpoint: GET /api/user/profile
    deprecated: 2025-02-01
    sunset: 2025-05-01
    replacement: GET /identity/v1/users/me
    migration_guide: docs/migration/user-profile.md
```

### 3. **Decision Log**
```markdown
# Architectural Decision Records

## ADR-001: Use Strangler Fig Pattern
**Status**: Accepted
**Date**: 2025-01-16
**Context**: Need to migrate without downtime
**Decision**: Use Strangler Fig with feature flags
**Consequences**: Slower migration but safer

## ADR-002: Event Bus Technology
**Status**: Accepted
**Date**: 2025-01-16
**Context**: Need async communication
**Decision**: Redis Streams for dev, Kafka for prod
**Consequences**: Two implementations to maintain
```

## Testing Strategy

### 1. **Contract Testing**
```typescript
// Ensure old and new services return same data
describe('Story Service Contract', () => {
  it('should return same story format', async () => {
    const storyId = 'test-123';
    
    const legacyResponse = await legacyApi.getStory(storyId);
    const newResponse = await storyService.getStory(storyId);
    
    expect(newResponse).toMatchContract(legacyResponse);
  });
});
```

### 2. **Shadow Testing**
```typescript
// Run new service in shadow mode
export class ShadowTester {
  async compareResults(operation: string, params: any) {
    const [legacyResult, newResult] = await Promise.all([
      this.legacyService[operation](params),
      this.newService[operation](params)
    ]);
    
    if (!deepEqual(legacyResult, newResult)) {
      await this.logDiscrepancy(operation, params, legacyResult, newResult);
    }
    
    // Always return legacy result to user
    return legacyResult;
  }
}
```

## Rollout Schedule

### Month 1
- Week 1: Foundation setup
- Week 2-3: Identity Service
- Week 4: Subscription Service begins

### Month 2
- Week 1-2: Subscription Service
- Week 3-4: Story Service begins

### Month 3
- Week 1: Story Service completion
- Week 2-3: Collaboration Service
- Week 4: Narration Service begins

### Month 4
- Week 1-2: Narration Service
- Week 3-4: Video Service & cleanup

## Success Criteria

1. **Zero Downtime**: No service interruptions during migration
2. **Performance**: New services perform equal or better
3. **Data Integrity**: No data loss or corruption
4. **User Experience**: No visible changes to end users
5. **Developer Experience**: Clear documentation and debugging tools

## Risk Mitigation

### 1. **Data Consistency Risks**
- Solution: Event sourcing with dual writes
- Monitoring: Data comparison jobs
- Rollback: Revert to monolith reads

### 2. **Performance Risks**
- Solution: Gradual traffic migration
- Monitoring: Response time tracking
- Rollback: Feature flags for instant switch

### 3. **Integration Risks**
- Solution: Contract testing
- Monitoring: Error rate tracking
- Rollback: Circuit breakers

## Tools & Scripts

### 1. **Migration Scripts**
```bash
# scripts/migrate-service.sh
#!/bin/bash
SERVICE=$1
PERCENTAGE=$2

echo "Migrating $PERCENTAGE% traffic to $SERVICE"
kubectl set env deployment/api-gateway \
  ROUTE_${SERVICE}_PERCENTAGE=$PERCENTAGE
```

### 2. **Monitoring Dashboard**
```typescript
// tools/migration-dashboard.ts
export class MigrationDashboard {
  async getStatus() {
    return {
      services: await this.getServiceStatus(),
      traffic: await this.getTrafficDistribution(),
      errors: await this.getErrorRates(),
      performance: await this.getPerformanceMetrics()
    };
  }
}
```

## Next Steps

1. **Review and approve** migration strategy
2. **Set up local development** environment
3. **Create migration team** with clear responsibilities
4. **Begin Phase 0** preparation
5. **Schedule weekly migration reviews**