/**
 * Base Microservice Adapter
 * Extends existing storage patterns for gradual microservices migration
 * Uses existing database tables with logical partitioning
 */

import { storage } from "../storage-postgres";
import { db } from "../db";
import type { IStorage } from "../storage";
import { EventBus } from "./event-bus";

export interface MicroserviceConfig {
  serviceName: string;
  port: number;
  tables: string[]; // Tables this microservice owns
  readOnlyTables?: string[]; // Tables this microservice can read but not write
}

export abstract class BaseMicroserviceAdapter {
  protected config: MicroserviceConfig;
  protected eventBus: EventBus;
  protected storage: IStorage;
  protected db: typeof db;

  constructor(config: MicroserviceConfig) {
    this.config = config;
    this.storage = storage; // Use existing storage implementation
    this.db = db; // Use existing database connection
    this.eventBus = new EventBus(config.serviceName);
  }

  /**
   * Get service name
   */
  get serviceName(): string {
    return this.config.serviceName;
  }

  /**
   * Check if this service owns a table
   */
  protected ownsTable(tableName: string): boolean {
    return this.config.tables.includes(tableName);
  }

  /**
   * Check if this service can read from a table
   */
  protected canReadTable(tableName: string): boolean {
    return this.ownsTable(tableName) || 
           (this.config.readOnlyTables?.includes(tableName) ?? false);
  }

  /**
   * Validate write access to a table
   */
  protected validateWriteAccess(tableName: string): void {
    if (!this.ownsTable(tableName)) {
      throw new Error(
        `Service ${this.serviceName} does not have write access to table ${tableName}`
      );
    }
  }

  /**
   * Validate read access to a table
   */
  protected validateReadAccess(tableName: string): void {
    if (!this.canReadTable(tableName)) {
      throw new Error(
        `Service ${this.serviceName} does not have read access to table ${tableName}`
      );
    }
  }

  /**
   * Publish domain event
   */
  protected async publishEvent(eventType: string, payload: any): Promise<void> {
    await this.eventBus.publish({
      type: eventType,
      serviceName: this.serviceName,
      timestamp: new Date().toISOString(),
      payload
    });
  }

  /**
   * Subscribe to domain events
   */
  protected async subscribeToEvent(
    eventType: string, 
    handler: (event: any) => Promise<void>
  ): Promise<void> {
    await this.eventBus.subscribe(eventType, handler);
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{
    service: string;
    status: "healthy" | "unhealthy";
    timestamp: string;
    version: string;
  }> {
    try {
      // Test database connection
      await this.db.execute(sql`SELECT 1`);
      
      return {
        service: this.serviceName,
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: process.env.SERVICE_VERSION || "1.0.0"
      };
    } catch (error) {
      return {
        service: this.serviceName,
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        version: process.env.SERVICE_VERSION || "1.0.0"
      };
    }
  }

  /**
   * Initialize the microservice
   */
  abstract async initialize(): Promise<void>;

  /**
   * Start the microservice
   */
  abstract async start(): Promise<void>;

  /**
   * Stop the microservice
   */
  abstract async stop(): Promise<void>;
}

import { sql } from "drizzle-orm";