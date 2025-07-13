/**
 * Notification Tracking Storage
 * Handles all database operations for notification provider tracking
 */

import { db } from './db';
import { eq, and, desc, gte, lte, sql, isNull } from 'drizzle-orm';
import {
  notificationProviders,
  notificationTransactions,
  notificationFailovers,
  providerLifecycleEvents,
  providerPerformancePeriods,
  providerSuspensions,
  providerHealthHistory,
  providerUsageStats,
  providerConfigurationHistory,
  subscriptionTransactions,
  type NotificationProvider,
  type InsertNotificationProvider,
  type NotificationTransaction,
  type InsertNotificationTransaction,
  type NotificationFailover,
  type InsertNotificationFailover,
  type ProviderLifecycleEvent,
  type InsertProviderLifecycleEvent,
  type ProviderPerformancePeriod,
  type InsertProviderPerformancePeriod,
  type ProviderSuspension,
  type InsertProviderSuspension,
  type ProviderHealthHistory,
  type InsertProviderHealthHistory,
  type ProviderUsageStats,
  type InsertProviderUsageStats,
  type ProviderConfigurationHistory,
  type InsertProviderConfigurationHistory,
  type SubscriptionTransaction,
  type InsertSubscriptionTransaction,
} from '@shared/schema/notification-tracking';

export class NotificationTrackingStorage {
  // ==================== NOTIFICATION PROVIDERS ====================
  
  /** Get all notification providers */
  async getProviders(filters?: { providerType?: string; status?: string }): Promise<NotificationProvider[]> {
    let query = db.select().from(notificationProviders);
    
    if (filters?.providerType) {
      query = query.where(eq(notificationProviders.providerType, filters.providerType));
    }
    
    if (filters?.status) {
      query = query.where(eq(notificationProviders.currentStatus, filters.status));
    }
    
    return await query;
  }

  /** Get provider by ID */
  async getProvider(id: number): Promise<NotificationProvider | undefined> {
    const [provider] = await db.select()
      .from(notificationProviders)
      .where(eq(notificationProviders.id, id));
    return provider;
  }

  /** Create new provider */
  async createProvider(data: InsertNotificationProvider): Promise<NotificationProvider> {
    const [provider] = await db.insert(notificationProviders)
      .values(data)
      .returning();
    return provider;
  }

  /** Update provider */
  async updateProvider(id: number, data: Partial<InsertNotificationProvider>): Promise<NotificationProvider> {
    const [provider] = await db.update(notificationProviders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notificationProviders.id, id))
      .returning();
    return provider;
  }

  /** Activate provider with lifecycle tracking */
  async activateProvider(id: number, reason: string, performedBy: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [provider] = await tx.select()
        .from(notificationProviders)
        .where(eq(notificationProviders.id, id));
      
      if (!provider) throw new Error('Provider not found');
      
      // Update provider
      await tx.update(notificationProviders)
        .set({
          currentStatus: 'active',
          lastActivatedAt: new Date(),
          activationCount: provider.activationCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(notificationProviders.id, id));
      
      // Record lifecycle event
      await tx.insert(providerLifecycleEvents)
        .values({
          providerId: id,
          eventType: 'activated',
          previousStatus: provider.currentStatus,
          newStatus: 'active',
          reason,
          triggeredBy: 'admin',
          performedBy,
        });
      
      // Start new performance period
      await tx.insert(providerPerformancePeriods)
        .values({
          providerId: id,
          periodStart: new Date(),
        });
    });
  }

  /** Deactivate provider with lifecycle tracking */
  async deactivateProvider(id: number, reason: string, performedBy: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [provider] = await tx.select()
        .from(notificationProviders)
        .where(eq(notificationProviders.id, id));
      
      if (!provider) throw new Error('Provider not found');
      
      // Update provider
      await tx.update(notificationProviders)
        .set({
          currentStatus: 'inactive',
          lastDeactivatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(notificationProviders.id, id));
      
      // Record lifecycle event
      await tx.insert(providerLifecycleEvents)
        .values({
          providerId: id,
          eventType: 'deactivated',
          previousStatus: provider.currentStatus,
          newStatus: 'inactive',
          reason,
          triggeredBy: 'admin',
          performedBy,
        });
      
      // Close current performance period
      await tx.update(providerPerformancePeriods)
        .set({
          periodEnd: new Date(),
          endReason: 'deactivated',
        })
        .where(and(
          eq(providerPerformancePeriods.providerId, id),
          isNull(providerPerformancePeriods.periodEnd)
        ));
    });
  }

  // ==================== NOTIFICATION TRANSACTIONS ====================

  /** Create notification transaction */
  async createTransaction(data: InsertNotificationTransaction): Promise<NotificationTransaction> {
    const [transaction] = await db.insert(notificationTransactions)
      .values(data)
      .returning();
    return transaction;
  }

  /** Update transaction status */
  async updateTransactionStatus(transactionId: string, status: string, timestamps?: {
    sentAt?: Date;
    deliveredAt?: Date;
    failedAt?: Date;
  }): Promise<NotificationTransaction> {
    const [transaction] = await db.update(notificationTransactions)
      .set({
        status,
        ...timestamps,
      })
      .where(eq(notificationTransactions.transactionId, transactionId))
      .returning();
    return transaction;
  }

  /** Get transactions for user */
  async getUserTransactions(userId: string, limit = 100): Promise<NotificationTransaction[]> {
    return await db.select()
      .from(notificationTransactions)
      .where(eq(notificationTransactions.userId, userId))
      .orderBy(desc(notificationTransactions.createdAt))
      .limit(limit);
  }

  /** Get transaction by ID */
  async getTransaction(transactionId: string): Promise<NotificationTransaction | undefined> {
    const [transaction] = await db.select()
      .from(notificationTransactions)
      .where(eq(notificationTransactions.transactionId, transactionId));
    return transaction;
  }

  /** Search transactions */
  async searchTransactions(filters: {
    userId?: string;
    status?: string;
    channel?: string;
    providerName?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<NotificationTransaction[]> {
    let query = db.select().from(notificationTransactions);
    
    if (filters.userId) {
      query = query.where(eq(notificationTransactions.userId, filters.userId));
    }
    
    if (filters.status) {
      query = query.where(eq(notificationTransactions.status, filters.status));
    }
    
    if (filters.channel) {
      query = query.where(eq(notificationTransactions.channel, filters.channel));
    }
    
    if (filters.providerName) {
      query = query.where(eq(notificationTransactions.providerName, filters.providerName));
    }
    
    if (filters.startDate) {
      query = query.where(gte(notificationTransactions.createdAt, filters.startDate));
    }
    
    if (filters.endDate) {
      query = query.where(lte(notificationTransactions.createdAt, filters.endDate));
    }
    
    query = query.orderBy(desc(notificationTransactions.createdAt));
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  // ==================== FAILOVERS ====================

  /** Record failover attempt */
  async recordFailover(data: InsertNotificationFailover): Promise<NotificationFailover> {
    const [failover] = await db.insert(notificationFailovers)
      .values(data)
      .returning();
    return failover;
  }

  /** Get failovers for transaction */
  async getTransactionFailovers(transactionId: string): Promise<NotificationFailover[]> {
    return await db.select()
      .from(notificationFailovers)
      .where(eq(notificationFailovers.originalTransactionId, transactionId));
  }

  // ==================== LIFECYCLE EVENTS ====================

  /** Get provider lifecycle events */
  async getProviderLifecycleEvents(providerId: number, limit = 50): Promise<ProviderLifecycleEvent[]> {
    return await db.select()
      .from(providerLifecycleEvents)
      .where(eq(providerLifecycleEvents.providerId, providerId))
      .orderBy(desc(providerLifecycleEvents.eventTimestamp))
      .limit(limit);
  }

  /** Create lifecycle event */
  async createLifecycleEvent(data: InsertProviderLifecycleEvent): Promise<ProviderLifecycleEvent> {
    const [event] = await db.insert(providerLifecycleEvents)
      .values(data)
      .returning();
    return event;
  }

  // ==================== PERFORMANCE PERIODS ====================

  /** Get provider performance periods */
  async getProviderPerformancePeriods(providerId: number): Promise<ProviderPerformancePeriod[]> {
    return await db.select()
      .from(providerPerformancePeriods)
      .where(eq(providerPerformancePeriods.providerId, providerId))
      .orderBy(desc(providerPerformancePeriods.periodStart));
  }

  /** Get current performance period */
  async getCurrentPerformancePeriod(providerId: number): Promise<ProviderPerformancePeriod | undefined> {
    const [period] = await db.select()
      .from(providerPerformancePeriods)
      .where(and(
        eq(providerPerformancePeriods.providerId, providerId),
        isNull(providerPerformancePeriods.periodEnd)
      ));
    return period;
  }

  /** Update performance period stats */
  async updatePerformancePeriodStats(periodId: number, stats: Partial<ProviderPerformancePeriod>): Promise<void> {
    await db.update(providerPerformancePeriods)
      .set(stats)
      .where(eq(providerPerformancePeriods.id, periodId));
  }

  // ==================== SUSPENSIONS ====================

  /** Create provider suspension */
  async createSuspension(data: InsertProviderSuspension): Promise<ProviderSuspension> {
    const [suspension] = await db.insert(providerSuspensions)
      .values(data)
      .returning();
    return suspension;
  }

  /** Resume provider from suspension */
  async resumeFromSuspension(suspensionId: number, resolutionNotes: string): Promise<void> {
    await db.update(providerSuspensions)
      .set({
        actualResumedAt: new Date(),
        resolutionNotes,
      })
      .where(eq(providerSuspensions.id, suspensionId));
  }

  /** Get active suspensions */
  async getActiveSuspensions(): Promise<ProviderSuspension[]> {
    return await db.select()
      .from(providerSuspensions)
      .where(isNull(providerSuspensions.actualResumedAt));
  }

  // ==================== HEALTH HISTORY ====================

  /** Record health check */
  async recordHealthCheck(data: InsertProviderHealthHistory): Promise<void> {
    await db.insert(providerHealthHistory).values(data);
  }

  /** Get recent health history */
  async getRecentHealthHistory(providerId: number, hours = 24): Promise<ProviderHealthHistory[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);
    
    return await db.select()
      .from(providerHealthHistory)
      .where(and(
        eq(providerHealthHistory.providerId, providerId),
        gte(providerHealthHistory.checkTimestamp, since)
      ))
      .orderBy(desc(providerHealthHistory.checkTimestamp));
  }

  // ==================== USAGE STATS ====================

  /** Update daily usage stats */
  async updateUsageStats(providerId: number, date: Date, stats: Partial<InsertProviderUsageStats>): Promise<void> {
    await db.insert(providerUsageStats)
      .values({
        providerId,
        date: date.toISOString().split('T')[0],
        ...stats,
      })
      .onConflictDoUpdate({
        target: [providerUsageStats.providerId, providerUsageStats.date],
        set: stats,
      });
  }

  /** Get usage stats for date range */
  async getUsageStats(providerId: number, startDate: Date, endDate: Date): Promise<ProviderUsageStats[]> {
    return await db.select()
      .from(providerUsageStats)
      .where(and(
        eq(providerUsageStats.providerId, providerId),
        gte(providerUsageStats.date, startDate.toISOString().split('T')[0]),
        lte(providerUsageStats.date, endDate.toISOString().split('T')[0])
      ))
      .orderBy(desc(providerUsageStats.date));
  }

  // ==================== CONFIGURATION HISTORY ====================

  /** Record configuration change */
  async recordConfigurationChange(data: InsertProviderConfigurationHistory): Promise<void> {
    await db.insert(providerConfigurationHistory).values(data);
  }

  /** Get configuration history */
  async getConfigurationHistory(providerId: number, limit = 20): Promise<ProviderConfigurationHistory[]> {
    return await db.select()
      .from(providerConfigurationHistory)
      .where(eq(providerConfigurationHistory.providerId, providerId))
      .orderBy(desc(providerConfigurationHistory.changedAt))
      .limit(limit);
  }

  // ==================== SUBSCRIPTION TRANSACTIONS ====================

  /** Create subscription transaction */
  async createSubscriptionTransaction(data: InsertSubscriptionTransaction): Promise<SubscriptionTransaction> {
    const [transaction] = await db.insert(subscriptionTransactions)
      .values(data)
      .returning();
    return transaction;
  }

  /** Get subscription transactions */
  async getSubscriptionTransactions(subscriptionId: string): Promise<SubscriptionTransaction[]> {
    return await db.select()
      .from(subscriptionTransactions)
      .where(eq(subscriptionTransactions.subscriptionId, subscriptionId))
      .orderBy(desc(subscriptionTransactions.createdAt));
  }

  // ==================== ANALYTICS QUERIES ====================

  /** Get provider summary statistics */
  async getProviderSummary(providerId: number): Promise<{
    provider: NotificationProvider;
    currentPeriod?: ProviderPerformancePeriod;
    recentStats: ProviderUsageStats[];
    healthStatus: { healthy: number; unhealthy: number };
  }> {
    const provider = await this.getProvider(providerId);
    if (!provider) throw new Error('Provider not found');
    
    const currentPeriod = await this.getCurrentPerformancePeriod(providerId);
    
    // Get last 7 days of stats
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const recentStats = await this.getUsageStats(providerId, startDate, endDate);
    
    // Get health status for last 24 hours
    const healthHistory = await this.getRecentHealthHistory(providerId, 24);
    const healthStatus = healthHistory.reduce((acc, check) => {
      if (check.isHealthy) acc.healthy++;
      else acc.unhealthy++;
      return acc;
    }, { healthy: 0, unhealthy: 0 });
    
    return {
      provider,
      currentPeriod,
      recentStats,
      healthStatus,
    };
  }
}

export const notificationTrackingStorage = new NotificationTrackingStorage();