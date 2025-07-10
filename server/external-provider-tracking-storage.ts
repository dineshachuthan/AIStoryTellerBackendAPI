/**
 * External Provider Tracking Storage
 * Unified storage for all external service providers (notifications, payments, video, audio, etc.)
 */

import { db } from './db';
import { eq, and, desc, asc, sql, between, gte, lte, inArray } from 'drizzle-orm';
import {
  externalProviders,
  providerTransactions,
  providerFailovers,
  providerLifecycleEvents,
  providerPerformancePeriods,
  providerHealthHistory,
  providerUsageStats,
  providerCostAlerts,
  providerApiKeyRotation,
  type ExternalProvider,
  type InsertExternalProvider,
  type ProviderTransaction,
  type InsertProviderTransaction,
  type ProviderFailover,
  type InsertProviderFailover,
  type ProviderLifecycleEvent,
  type InsertProviderLifecycleEvent,
  type ProviderPerformancePeriod,
  type InsertProviderPerformancePeriod,
  type ProviderHealthHistory,
  type InsertProviderHealthHistory,
  type ProviderUsageStats,
  type InsertProviderUsageStats,
  type ProviderCostAlert,
  type InsertProviderCostAlert,
  type ProviderApiKeyRotation,
  type InsertProviderApiKeyRotation,
} from '@shared/schema';

export class ExternalProviderTrackingStorage {
  // Provider Management
  async createProvider(provider: InsertExternalProvider): Promise<ExternalProvider> {
    const [result] = await db.insert(externalProviders).values(provider).returning();
    return result;
  }

  async updateProvider(id: number, updates: Partial<InsertExternalProvider>): Promise<ExternalProvider | null> {
    const [result] = await db
      .update(externalProviders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(externalProviders.id, id))
      .returning();
    return result || null;
  }

  async getProvider(id: number): Promise<ExternalProvider | null> {
    const [result] = await db.select().from(externalProviders).where(eq(externalProviders.id, id));
    return result || null;
  }

  async getProviderByNameAndType(name: string, type: string): Promise<ExternalProvider | null> {
    const [result] = await db
      .select()
      .from(externalProviders)
      .where(
        and(
          eq(externalProviders.providerName, name),
          eq(externalProviders.providerType, type)
        )
      );
    return result || null;
  }

  async getActiveProvidersByType(type: string): Promise<ExternalProvider[]> {
    return await db
      .select()
      .from(externalProviders)
      .where(
        and(
          eq(externalProviders.providerType, type),
          eq(externalProviders.currentStatus, 'active'),
          eq(externalProviders.isHealthy, true)
        )
      )
      .orderBy(asc(externalProviders.priority));
  }

  async getAllProviders(type?: string): Promise<ExternalProvider[]> {
    const query = db.select().from(externalProviders);
    if (type) {
      return query.where(eq(externalProviders.providerType, type));
    }
    return query;
  }

  // Transaction Tracking
  async createTransaction(transaction: InsertProviderTransaction): Promise<ProviderTransaction> {
    const [result] = await db.insert(providerTransactions).values(transaction).returning();
    return result;
  }

  async updateTransaction(
    transactionId: string,
    updates: Partial<InsertProviderTransaction>
  ): Promise<ProviderTransaction | null> {
    const [result] = await db
      .update(providerTransactions)
      .set(updates)
      .where(eq(providerTransactions.transactionId, transactionId))
      .returning();
    return result || null;
  }

  async getTransaction(transactionId: string): Promise<ProviderTransaction | null> {
    const [result] = await db
      .select()
      .from(providerTransactions)
      .where(eq(providerTransactions.transactionId, transactionId));
    return result || null;
  }

  async getTransactionsByEntity(entityType: string, entityId: string): Promise<ProviderTransaction[]> {
    return await db
      .select()
      .from(providerTransactions)
      .where(
        and(
          eq(providerTransactions.entityType, entityType),
          eq(providerTransactions.entityId, entityId)
        )
      )
      .orderBy(desc(providerTransactions.createdAt));
  }

  async getTransactionsByUser(userId: string, limit = 100): Promise<ProviderTransaction[]> {
    return await db
      .select()
      .from(providerTransactions)
      .where(eq(providerTransactions.userId, userId))
      .orderBy(desc(providerTransactions.createdAt))
      .limit(limit);
  }

  // Failover Tracking
  async createFailover(failover: InsertProviderFailover): Promise<ProviderFailover> {
    const [result] = await db.insert(providerFailovers).values(failover).returning();
    return result;
  }

  async getFailoversByTransaction(transactionId: string): Promise<ProviderFailover[]> {
    return await db
      .select()
      .from(providerFailovers)
      .where(eq(providerFailovers.originalTransactionId, transactionId))
      .orderBy(asc(providerFailovers.failoverTimestamp));
  }

  // Lifecycle Event Management
  async createLifecycleEvent(event: InsertProviderLifecycleEvent): Promise<ProviderLifecycleEvent> {
    const [result] = await db.insert(providerLifecycleEvents).values(event).returning();
    return result;
  }

  async getLifecycleEvents(providerId: number, limit = 50): Promise<ProviderLifecycleEvent[]> {
    return await db
      .select()
      .from(providerLifecycleEvents)
      .where(eq(providerLifecycleEvents.providerId, providerId))
      .orderBy(desc(providerLifecycleEvents.eventTimestamp))
      .limit(limit);
  }

  async getActiveLifecycleEvents(): Promise<ProviderLifecycleEvent[]> {
    const now = new Date();
    return await db
      .select()
      .from(providerLifecycleEvents)
      .where(
        and(
          lte(providerLifecycleEvents.eventTimestamp, now),
          sql`(${providerLifecycleEvents.effectiveUntil} IS NULL OR ${providerLifecycleEvents.effectiveUntil} > ${now})`
        )
      );
  }

  // Performance Period Management
  async createPerformancePeriod(period: InsertProviderPerformancePeriod): Promise<ProviderPerformancePeriod> {
    const [result] = await db.insert(providerPerformancePeriods).values(period).returning();
    return result;
  }

  async endPerformancePeriod(
    providerId: number,
    endReason: string,
    stats: Partial<InsertProviderPerformancePeriod>
  ): Promise<ProviderPerformancePeriod | null> {
    const [currentPeriod] = await db
      .select()
      .from(providerPerformancePeriods)
      .where(
        and(
          eq(providerPerformancePeriods.providerId, providerId),
          sql`${providerPerformancePeriods.periodEnd} IS NULL`
        )
      );

    if (!currentPeriod) return null;

    const [result] = await db
      .update(providerPerformancePeriods)
      .set({
        periodEnd: new Date(),
        endReason,
        ...stats,
      })
      .where(eq(providerPerformancePeriods.id, currentPeriod.id))
      .returning();
    
    return result;
  }

  async getPerformancePeriods(providerId: number, limit = 10): Promise<ProviderPerformancePeriod[]> {
    return await db
      .select()
      .from(providerPerformancePeriods)
      .where(eq(providerPerformancePeriods.providerId, providerId))
      .orderBy(desc(providerPerformancePeriods.periodStart))
      .limit(limit);
  }

  // Health History
  async recordHealthCheck(healthRecord: InsertProviderHealthHistory): Promise<ProviderHealthHistory> {
    const [result] = await db.insert(providerHealthHistory).values(healthRecord).returning();

    // Update provider's current health status
    await db
      .update(externalProviders)
      .set({
        isHealthy: healthRecord.isHealthy,
        lastHealthCheck: new Date(),
        healthCheckErrors: healthRecord.isHealthy
          ? 0
          : sql`${externalProviders.healthCheckErrors} + 1`,
        avgResponseTimeMs: healthRecord.responseTimeMs,
      })
      .where(eq(externalProviders.id, healthRecord.providerId));

    return result;
  }

  async getHealthHistory(providerId: number, hours = 24): Promise<ProviderHealthHistory[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    return await db
      .select()
      .from(providerHealthHistory)
      .where(
        and(
          eq(providerHealthHistory.providerId, providerId),
          gte(providerHealthHistory.checkTimestamp, since)
        )
      )
      .orderBy(desc(providerHealthHistory.checkTimestamp));
  }

  // Usage Statistics
  async upsertUsageStats(stats: InsertProviderUsageStats): Promise<ProviderUsageStats> {
    const existing = await db
      .select()
      .from(providerUsageStats)
      .where(
        and(
          eq(providerUsageStats.providerId, stats.providerId),
          eq(providerUsageStats.date, stats.date)
        )
      );

    if (existing.length > 0) {
      const [result] = await db
        .update(providerUsageStats)
        .set(stats)
        .where(eq(providerUsageStats.id, existing[0].id))
        .returning();
      return result;
    } else {
      const [result] = await db.insert(providerUsageStats).values(stats).returning();
      return result;
    }
  }

  async getUsageStats(providerId: number, days = 30): Promise<ProviderUsageStats[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return await db
      .select()
      .from(providerUsageStats)
      .where(
        and(
          eq(providerUsageStats.providerId, providerId),
          gte(providerUsageStats.date, since.toISOString().split('T')[0])
        )
      )
      .orderBy(desc(providerUsageStats.date));
  }

  // Cost Alerts
  async createCostAlert(alert: InsertProviderCostAlert): Promise<ProviderCostAlert> {
    const [result] = await db.insert(providerCostAlerts).values(alert).returning();
    return result;
  }

  async resolveCostAlert(alertId: number, notes?: string): Promise<ProviderCostAlert | null> {
    const [result] = await db
      .update(providerCostAlerts)
      .set({
        alertResolvedAt: new Date(),
        notes,
      })
      .where(eq(providerCostAlerts.id, alertId))
      .returning();
    return result || null;
  }

  async getActiveCostAlerts(): Promise<ProviderCostAlert[]> {
    return await db
      .select()
      .from(providerCostAlerts)
      .where(sql`${providerCostAlerts.alertResolvedAt} IS NULL`)
      .orderBy(desc(providerCostAlerts.alertTriggeredAt));
  }

  // API Key Rotation
  async recordApiKeyRotation(rotation: InsertProviderApiKeyRotation): Promise<ProviderApiKeyRotation> {
    const [result] = await db.insert(providerApiKeyRotation).values(rotation).returning();
    return result;
  }

  async validateApiKey(rotationId: number, errors?: any): Promise<ProviderApiKeyRotation | null> {
    const [result] = await db
      .update(providerApiKeyRotation)
      .set({
        isValidated: true,
        validatedAt: new Date(),
        validationErrors: errors,
      })
      .where(eq(providerApiKeyRotation.id, rotationId))
      .returning();
    return result || null;
  }

  async getApiKeyRotations(providerId: number, limit = 10): Promise<ProviderApiKeyRotation[]> {
    return await db
      .select()
      .from(providerApiKeyRotation)
      .where(eq(providerApiKeyRotation.providerId, providerId))
      .orderBy(desc(providerApiKeyRotation.rotatedAt))
      .limit(limit);
  }

  // Analytics Methods
  async getProviderAnalytics(providerId: number, days = 30): Promise<{
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    totalCost: number;
    failoverCount: number;
    healthUptime: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get transaction metrics
    const transactionMetrics = await db
      .select({
        totalRequests: sql<number>`COUNT(*)`,
        successfulRequests: sql<number>`COUNT(*) FILTER (WHERE status = 'completed')`,
        avgResponseTime: sql<number>`AVG(response_time_ms)`,
        totalCostCents: sql<number>`COALESCE(SUM(cost_cents), 0)`,
      })
      .from(providerTransactions)
      .where(
        and(
          eq(providerTransactions.providerId, providerId),
          gte(providerTransactions.createdAt, since)
        )
      );

    // Get failover count
    const failoverCount = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(providerFailovers)
      .where(
        and(
          eq(providerFailovers.fromProviderId, providerId),
          gte(providerFailovers.failoverTimestamp, since)
        )
      );

    // Get health uptime
    const healthChecks = await db
      .select({
        totalChecks: sql<number>`COUNT(*)`,
        healthyChecks: sql<number>`COUNT(*) FILTER (WHERE is_healthy = true)`,
      })
      .from(providerHealthHistory)
      .where(
        and(
          eq(providerHealthHistory.providerId, providerId),
          gte(providerHealthHistory.checkTimestamp, since)
        )
      );

    const metrics = transactionMetrics[0];
    const healthMetrics = healthChecks[0];

    return {
      totalRequests: Number(metrics?.totalRequests) || 0,
      successRate: metrics?.totalRequests ? (Number(metrics.successfulRequests) / Number(metrics.totalRequests)) * 100 : 0,
      avgResponseTime: Number(metrics?.avgResponseTime) || 0,
      totalCost: (Number(metrics?.totalCostCents) || 0) / 100,
      failoverCount: Number(failoverCount[0]?.count) || 0,
      healthUptime: healthMetrics?.totalChecks ? (Number(healthMetrics.healthyChecks) / Number(healthMetrics.totalChecks)) * 100 : 0,
    };
  }

  async getProviderCostByMonth(providerId: number, months = 6): Promise<{ month: string; cost: number }[]> {
    const results = await db
      .select({
        month: sql<string>`TO_CHAR(created_at, 'YYYY-MM')`,
        totalCostCents: sql<number>`COALESCE(SUM(cost_cents), 0)`,
      })
      .from(providerTransactions)
      .where(
        and(
          eq(providerTransactions.providerId, providerId),
          gte(providerTransactions.createdAt, sql`NOW() - INTERVAL '${months} months'`)
        )
      )
      .groupBy(sql`TO_CHAR(created_at, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(created_at, 'YYYY-MM')`);

    return results.map((r) => ({
      month: r.month,
      cost: Number(r.totalCostCents) / 100,
    }));
  }
}

export const externalProviderTracking = new ExternalProviderTrackingStorage();