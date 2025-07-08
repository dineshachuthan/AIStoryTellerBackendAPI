/**
 * Event Bus Implementation
 * Uses in-memory pub/sub for Replit environment
 * Will use Redis when available in production
 * Extends existing patterns for event-driven architecture
 */

export interface DomainEvent {
  type: string;
  serviceName: string;
  timestamp: string;
  payload: any;
  correlationId?: string;
  userId?: string;
}

// In-memory event bus for development/Replit
class InMemoryEventBus {
  private handlers: Map<string, Array<(event: DomainEvent) => Promise<void>>>;
  private eventLog: DomainEvent[] = [];
  private maxEventLogSize = 1000; // Keep last 1000 events for debugging

  constructor() {
    this.handlers = new Map();
  }

  async publish(eventType: string, event: DomainEvent): Promise<void> {
    // Log event
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxEventLogSize) {
      this.eventLog.shift(); // Remove oldest event
    }

    // Get handlers for this event type
    const handlers = this.handlers.get(eventType) || [];
    const allHandlers = this.handlers.get('*') || []; // Wildcard handlers
    
    // Execute all handlers asynchronously
    const promises = [...handlers, ...allHandlers].map(handler =>
      handler(event).catch(error => 
        console.error(`Error handling event ${eventType}:`, error)
      )
    );
    
    await Promise.all(promises);
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  unsubscribe(eventType: string): void {
    this.handlers.delete(eventType);
  }

  getEventLog(): DomainEvent[] {
    return [...this.eventLog];
  }

  clear(): void {
    this.handlers.clear();
    this.eventLog = [];
  }
}

// Global in-memory event bus instance
const globalInMemoryBus = new InMemoryEventBus();

export class EventBus {
  private serviceName: string;
  private bus: InMemoryEventBus;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.bus = globalInMemoryBus; // Share same instance across services
  }

  /**
   * Initialize event bus connections
   */
  async initialize(): Promise<void> {
    // No-op for in-memory implementation
    console.log(`[EventBus] Initialized for service: ${this.serviceName}`);
  }

  /**
   * Publish domain event
   */
  async publish(event: DomainEvent): Promise<void> {
    const enrichedEvent = {
      ...event,
      serviceName: event.serviceName || this.serviceName,
      timestamp: event.timestamp || new Date().toISOString()
    };
    
    await this.bus.publish(event.type, enrichedEvent);
    
    // Also publish to wildcard channel for monitoring
    await this.bus.publish('*', enrichedEvent);
    
    console.log(`[EventBus] Published event: ${event.type} from ${this.serviceName}`);
  }

  /**
   * Subscribe to domain event type
   */
  async subscribe(
    eventType: string, 
    handler: (event: DomainEvent) => Promise<void>
  ): Promise<void> {
    this.bus.subscribe(eventType, handler);
    console.log(`[EventBus] ${this.serviceName} subscribed to: ${eventType}`);
  }

  /**
   * Unsubscribe from event type
   */
  async unsubscribe(eventType: string): Promise<void> {
    this.bus.unsubscribe(eventType);
  }

  /**
   * Get event log for debugging
   */
  getEventLog(): DomainEvent[] {
    return this.bus.getEventLog();
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    // No-op for in-memory implementation
  }
}

// Global event bus instance for the monolith
let globalEventBus: EventBus | null = null;

/**
 * Get or create global event bus instance
 */
export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus('monolith');
    globalEventBus.initialize();
  }
  return globalEventBus;
}