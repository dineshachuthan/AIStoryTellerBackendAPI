/**
 * Notification Provider Tracking Schema
 * Tracks all notification transactions across multiple providers
 */

import { pgTable, serial, varchar, boolean, timestamp, integer, decimal, jsonb, uuid, text, date, index, unique } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Notification Providers table
export const notificationProviders = pgTable('notification_providers', {
  id: serial('id').primaryKey(),
  providerName: varchar('provider_name', { length: 50 }).notNull(),
  providerType: varchar('provider_type', { length: 20 }).notNull(),
  
  // Current state
  currentStatus: varchar('current_status', { length: 20 }).default('active'),
  priority: integer('priority').default(1),
  isHealthy: boolean('is_healthy').default(true),
  
  // Lifecycle tracking
  firstActivatedAt: timestamp('first_activated_at'),
  lastActivatedAt: timestamp('last_activated_at'),
  lastDeactivatedAt: timestamp('last_deactivated_at'),
  totalActiveDays: integer('total_active_days').default(0),
  activationCount: integer('activation_count').default(0),
  
  configuration: jsonb('configuration'),
  capabilities: jsonb('capabilities'),
  lastHealthCheck: timestamp('last_health_check'),
  healthCheckErrors: integer('health_check_errors').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  unique().on(table.providerName, table.providerType),
]);

// Notification Transactions table
export const notificationTransactions = pgTable('notification_transactions', {
  id: serial('id').primaryKey(),
  transactionId: uuid('transaction_id').defaultRandom().unique(),
  userId: varchar('user_id', { length: 255 }),
  notificationType: varchar('notification_type', { length: 50 }),
  channel: varchar('channel', { length: 20 }).notNull(),
  recipient: varchar('recipient', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }),
  messagePreview: text('message_preview'),
  
  // Provider tracking
  providerId: integer('provider_id').references(() => notificationProviders.id),
  providerName: varchar('provider_name', { length: 50 }).notNull(),
  providerMessageId: varchar('provider_message_id', { length: 255 }),
  
  // Status tracking
  status: varchar('status', { length: 20 }).notNull(),
  attemptCount: integer('attempt_count').default(1),
  
  // Cost tracking
  providerCost: decimal('provider_cost', { precision: 10, scale: 4 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  
  // Metadata
  requestPayload: jsonb('request_payload'),
  providerResponse: jsonb('provider_response'),
  errorDetails: jsonb('error_details'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  failedAt: timestamp('failed_at'),
}, (table) => [
  index('idx_nt_user_id').on(table.userId),
  index('idx_nt_status').on(table.status),
  index('idx_nt_provider_name').on(table.providerName),
  index('idx_nt_created_at').on(table.createdAt),
  index('idx_nt_recipient_channel').on(table.recipient, table.channel),
]);

// Notification Failovers table
export const notificationFailovers = pgTable('notification_failovers', {
  id: serial('id').primaryKey(),
  originalTransactionId: uuid('original_transaction_id').references(() => notificationTransactions.transactionId),
  fromProviderId: integer('from_provider_id').references(() => notificationProviders.id),
  toProviderId: integer('to_provider_id').references(() => notificationProviders.id),
  reason: varchar('reason', { length: 100 }),
  errorDetails: jsonb('error_details'),
  failoverTimestamp: timestamp('failover_timestamp').defaultNow(),
  success: boolean('success').default(false),
}, (table) => [
  index('idx_nf_original_transaction').on(table.originalTransactionId),
]);

// Provider Lifecycle Events table
export const providerLifecycleEvents = pgTable('provider_lifecycle_events', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => notificationProviders.id),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  previousStatus: varchar('previous_status', { length: 20 }),
  newStatus: varchar('new_status', { length: 20 }),
  
  // Context
  reason: text('reason').notNull(),
  triggeredBy: varchar('triggered_by', { length: 50 }),
  performedBy: varchar('performed_by', { length: 255 }),
  
  // Performance snapshot
  performanceSnapshot: jsonb('performance_snapshot'),
  
  // Duration tracking
  eventTimestamp: timestamp('event_timestamp').defaultNow(),
  effectiveUntil: timestamp('effective_until'),
  durationDays: integer('duration_days'),
  
  // Additional context
  notes: text('notes'),
  relatedIncidentId: varchar('related_incident_id', { length: 100 }),
}, (table) => [
  index('idx_ple_provider_timestamp').on(table.providerId, table.eventTimestamp),
  index('idx_ple_event_type').on(table.eventType),
]);

// Provider Performance Periods table
export const providerPerformancePeriods = pgTable('provider_performance_periods', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => notificationProviders.id),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end'),
  
  // Aggregated metrics
  totalMessagesSent: integer('total_messages_sent').default(0),
  totalMessagesDelivered: integer('total_messages_delivered').default(0),
  totalMessagesFailed: integer('total_messages_failed').default(0),
  overallSuccessRate: decimal('overall_success_rate', { precision: 5, scale: 2 }),
  averageLatencyMs: integer('average_latency_ms'),
  totalCost: decimal('total_cost', { precision: 10, scale: 4 }),
  
  // End reason
  endReason: varchar('end_reason', { length: 100 }),
}, (table) => [
  unique().on(table.providerId, table.periodStart),
]);

// Provider Suspensions table
export const providerSuspensions = pgTable('provider_suspensions', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => notificationProviders.id),
  lifecycleEventId: integer('lifecycle_event_id').references(() => providerLifecycleEvents.id),
  
  suspensionType: varchar('suspension_type', { length: 50 }),
  severity: varchar('severity', { length: 20 }),
  
  suspendedAt: timestamp('suspended_at').notNull(),
  plannedResumeDate: timestamp('planned_resume_date'),
  actualResumedAt: timestamp('actual_resumed_at'),
  
  // Impact assessment
  estimatedImpact: jsonb('estimated_impact'),
  actualImpact: jsonb('actual_impact'),
  
  // Resolution
  resolutionNotes: text('resolution_notes'),
  lessonsLearned: text('lessons_learned'),
}, (table) => [
  index('idx_ps_suspension_dates').on(table.suspendedAt, table.actualResumedAt),
]);

// Provider Health History table
export const providerHealthHistory = pgTable('provider_health_history', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => notificationProviders.id),
  checkTimestamp: timestamp('check_timestamp').defaultNow(),
  
  isHealthy: boolean('is_healthy').notNull(),
  responseTimeMs: integer('response_time_ms'),
  
  // Detailed metrics
  healthMetrics: jsonb('health_metrics'),
  errorDetails: jsonb('error_details'),
}, (table) => [
  index('idx_phh_provider_timestamp').on(table.providerId, table.checkTimestamp),
]);

// Provider Usage Stats table
export const providerUsageStats = pgTable('provider_usage_stats', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => notificationProviders.id),
  date: date('date').notNull(),
  
  // Volume metrics
  totalSent: integer('total_sent').default(0),
  totalDelivered: integer('total_delivered').default(0),
  totalFailed: integer('total_failed').default(0),
  totalBounced: integer('total_bounced').default(0),
  
  // Performance metrics
  avgDeliveryTimeSeconds: decimal('avg_delivery_time_seconds', { precision: 10, scale: 2 }),
  successRate: decimal('success_rate', { precision: 5, scale: 2 }),
  
  // Cost metrics
  totalCost: decimal('total_cost', { precision: 10, scale: 4 }),
  avgCostPerMessage: decimal('avg_cost_per_message', { precision: 10, scale: 6 }),
}, (table) => [
  unique().on(table.providerId, table.date),
  index('idx_pus_date').on(table.date),
]);

// Provider Configuration History table
export const providerConfigurationHistory = pgTable('provider_configuration_history', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => notificationProviders.id),
  changedBy: varchar('changed_by', { length: 255 }),
  changeType: varchar('change_type', { length: 50 }),
  previousConfig: jsonb('previous_config'),
  newConfig: jsonb('new_config'),
  reason: text('reason'),
  changedAt: timestamp('changed_at').defaultNow(),
}, (table) => [
  index('idx_pch_provider_id').on(table.providerId),
  index('idx_pch_changed_at').on(table.changedAt),
]);

// Subscription Transactions table
export const subscriptionTransactions = pgTable('subscription_transactions', {
  id: serial('id').primaryKey(),
  subscriptionId: varchar('subscription_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  transactionType: varchar('transaction_type', { length: 50 }),
  
  // Payment provider tracking
  paymentProvider: varchar('payment_provider', { length: 50 }),
  paymentProviderTransactionId: varchar('payment_provider_transaction_id', { length: 255 }),
  
  // Notification tracking
  notificationSent: boolean('notification_sent').default(false),
  notificationTransactionId: uuid('notification_transaction_id').references(() => notificationTransactions.transactionId),
  
  amount: decimal('amount', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }),
  status: varchar('status', { length: 20 }),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_st_subscription_id').on(table.subscriptionId),
  index('idx_st_user_id').on(table.userId),
]);

// Create insert schemas
export const insertNotificationProviderSchema = createInsertSchema(notificationProviders);
export const insertNotificationTransactionSchema = createInsertSchema(notificationTransactions);
export const insertNotificationFailoverSchema = createInsertSchema(notificationFailovers);
export const insertProviderLifecycleEventSchema = createInsertSchema(providerLifecycleEvents);
export const insertProviderPerformancePeriodSchema = createInsertSchema(providerPerformancePeriods);
export const insertProviderSuspensionSchema = createInsertSchema(providerSuspensions);
export const insertProviderHealthHistorySchema = createInsertSchema(providerHealthHistory);
export const insertProviderUsageStatsSchema = createInsertSchema(providerUsageStats);
export const insertProviderConfigurationHistorySchema = createInsertSchema(providerConfigurationHistory);
export const insertSubscriptionTransactionSchema = createInsertSchema(subscriptionTransactions);

// Type exports
export type NotificationProvider = typeof notificationProviders.$inferSelect;
export type InsertNotificationProvider = z.infer<typeof insertNotificationProviderSchema>;
export type NotificationTransaction = typeof notificationTransactions.$inferSelect;
export type InsertNotificationTransaction = z.infer<typeof insertNotificationTransactionSchema>;
export type NotificationFailover = typeof notificationFailovers.$inferSelect;
export type InsertNotificationFailover = z.infer<typeof insertNotificationFailoverSchema>;
export type ProviderLifecycleEvent = typeof providerLifecycleEvents.$inferSelect;
export type InsertProviderLifecycleEvent = z.infer<typeof insertProviderLifecycleEventSchema>;
export type ProviderPerformancePeriod = typeof providerPerformancePeriods.$inferSelect;
export type InsertProviderPerformancePeriod = z.infer<typeof insertProviderPerformancePeriodSchema>;
export type ProviderSuspension = typeof providerSuspensions.$inferSelect;
export type InsertProviderSuspension = z.infer<typeof insertProviderSuspensionSchema>;
export type ProviderHealthHistory = typeof providerHealthHistory.$inferSelect;
export type InsertProviderHealthHistory = z.infer<typeof insertProviderHealthHistorySchema>;
export type ProviderUsageStats = typeof providerUsageStats.$inferSelect;
export type InsertProviderUsageStats = z.infer<typeof insertProviderUsageStatsSchema>;
export type ProviderConfigurationHistory = typeof providerConfigurationHistory.$inferSelect;
export type InsertProviderConfigurationHistory = z.infer<typeof insertProviderConfigurationHistorySchema>;
export type SubscriptionTransaction = typeof subscriptionTransactions.$inferSelect;
export type InsertSubscriptionTransaction = z.infer<typeof insertSubscriptionTransactionSchema>;