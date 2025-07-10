/**
 * External Provider Tracking Schema
 * Unified tracking for all external service providers (notifications, payments, video, audio, etc.)
 */

import { pgTable, serial, varchar, boolean, timestamp, integer, decimal, jsonb, uuid, text, date, index, unique } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// External Providers table - unified for all provider types
export const externalProviders = pgTable('external_providers', {
  id: serial('id').primaryKey(),
  providerName: varchar('provider_name', { length: 50 }).notNull(), // 'mailgun', 'sendgrid', 'stripe', 'openai', 'elevenlabs', 'kling'
  providerType: varchar('provider_type', { length: 30 }).notNull(), // 'email', 'sms', 'payment', 'voice', 'video', 'ai', 'storage'
  providerSubtype: varchar('provider_subtype', { length: 30 }), // 'tts', 'voice-cloning', 'transcription', 'generation'
  
  // Current state
  currentStatus: varchar('current_status', { length: 20 }).default('active'), // 'active', 'inactive', 'suspended', 'deprecated'
  priority: integer('priority').default(1),
  isHealthy: boolean('is_healthy').default(true),
  
  // Lifecycle tracking
  firstActivatedAt: timestamp('first_activated_at'),
  lastActivatedAt: timestamp('last_activated_at'),
  lastDeactivatedAt: timestamp('last_deactivated_at'),
  totalActiveDays: integer('total_active_days').default(0),
  activationCount: integer('activation_count').default(0),
  
  // Provider configuration
  apiEndpoint: varchar('api_endpoint', { length: 255 }),
  apiVersion: varchar('api_version', { length: 20 }),
  configuration: jsonb('configuration'), // API keys, settings, etc (encrypted in production)
  capabilities: jsonb('capabilities'), // {supportsStreaming: true, maxConcurrent: 10, features: [...]}
  rateLimits: jsonb('rate_limits'), // {requests_per_minute: 100, requests_per_day: 10000}
  
  // Cost tracking
  pricingModel: varchar('pricing_model', { length: 50 }), // 'per_request', 'per_minute', 'per_gb', 'subscription'
  costConfiguration: jsonb('cost_configuration'), // {unit_cost: 0.001, currency: 'USD', tiers: [...]}
  monthlyBudgetCents: integer('monthly_budget_cents'),
  currentMonthSpendCents: integer('current_month_spend_cents').default(0),
  
  // Health monitoring
  lastHealthCheck: timestamp('last_health_check'),
  healthCheckErrors: integer('health_check_errors').default(0),
  avgResponseTimeMs: integer('avg_response_time_ms'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  unique().on(table.providerName, table.providerType),
  index('idx_provider_type_status').on(table.providerType, table.currentStatus),
]);

// Provider Transactions table - tracks all API calls to external providers
export const providerTransactions = pgTable('provider_transactions', {
  id: serial('id').primaryKey(),
  transactionId: uuid('transaction_id').defaultRandom().unique(),
  providerId: integer('provider_id').references(() => externalProviders.id),
  providerName: varchar('provider_name', { length: 50 }).notNull(),
  providerType: varchar('provider_type', { length: 30 }).notNull(),
  
  // Request details
  operationType: varchar('operation_type', { length: 50 }).notNull(), // 'send_email', 'generate_voice', 'create_video', 'process_payment'
  userId: varchar('user_id', { length: 255 }),
  entityId: varchar('entity_id', { length: 255 }), // storyId, subscriptionId, etc.
  entityType: varchar('entity_type', { length: 50 }), // 'story', 'subscription', 'user'
  
  // Provider-specific tracking
  providerRequestId: varchar('provider_request_id', { length: 255 }), // Provider's unique ID
  providerResponseId: varchar('provider_response_id', { length: 255 }), // TaskID, MessageID, etc.
  
  // Status and performance
  status: varchar('status', { length: 20 }).notNull(), // 'pending', 'processing', 'completed', 'failed'
  responseTimeMs: integer('response_time_ms'),
  attemptCount: integer('attempt_count').default(1),
  
  // Cost tracking
  costCents: integer('cost_cents'), // Cost in cents
  costUnits: decimal('cost_units', { precision: 10, scale: 4 }), // Units consumed (minutes, tokens, etc.)
  costUnitType: varchar('cost_unit_type', { length: 30 }), // 'minutes', 'tokens', 'requests', 'gb'
  currency: varchar('currency', { length: 3 }).default('USD'),
  
  // Request/Response data
  requestPayload: jsonb('request_payload'),
  responsePayload: jsonb('response_payload'),
  errorDetails: jsonb('error_details'),
  
  // Output tracking
  outputUrl: text('output_url'), // URL to generated content (video, audio, etc.)
  outputMetadata: jsonb('output_metadata'), // Duration, format, quality, etc.
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  failedAt: timestamp('failed_at'),
}, (table) => [
  index('idx_pt_user_id').on(table.userId),
  index('idx_pt_provider_type').on(table.providerType),
  index('idx_pt_status').on(table.status),
  index('idx_pt_created_at').on(table.createdAt),
  index('idx_pt_entity').on(table.entityType, table.entityId),
]);

// Provider Failovers - when switching between providers
export const providerFailovers = pgTable('provider_failovers', {
  id: serial('id').primaryKey(),
  originalTransactionId: uuid('original_transaction_id').references(() => providerTransactions.transactionId),
  fromProviderId: integer('from_provider_id').references(() => externalProviders.id),
  toProviderId: integer('to_provider_id').references(() => externalProviders.id),
  reason: varchar('reason', { length: 100 }), // 'provider_error', 'rate_limit', 'cost_limit', 'unhealthy'
  errorDetails: jsonb('error_details'),
  failoverTimestamp: timestamp('failover_timestamp').defaultNow(),
  success: boolean('success').default(false),
}, (table) => [
  index('idx_pf_original_transaction').on(table.originalTransactionId),
]);

// Provider Lifecycle Events
export const providerLifecycleEvents = pgTable('provider_lifecycle_events', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => externalProviders.id),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'activated', 'deactivated', 'suspended', 'resumed', 'config_changed'
  previousStatus: varchar('previous_status', { length: 20 }),
  newStatus: varchar('new_status', { length: 20 }),
  
  // Context
  reason: text('reason').notNull(),
  triggeredBy: varchar('triggered_by', { length: 50 }), // 'admin', 'system', 'health_check', 'cost_limit'
  performedBy: varchar('performed_by', { length: 255 }),
  
  // Performance snapshot at time of change
  performanceSnapshot: jsonb('performance_snapshot'), // {success_rate: 95.5, avg_latency: 250, last_7d_volume: 5000}
  
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

// Provider Performance Periods
export const providerPerformancePeriods = pgTable('provider_performance_periods', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => externalProviders.id),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end'),
  
  // Volume metrics
  totalRequests: integer('total_requests').default(0),
  successfulRequests: integer('successful_requests').default(0),
  failedRequests: integer('failed_requests').default(0),
  
  // Performance metrics
  overallSuccessRate: decimal('overall_success_rate', { precision: 5, scale: 2 }),
  averageResponseTimeMs: integer('average_response_time_ms'),
  p95ResponseTimeMs: integer('p95_response_time_ms'),
  p99ResponseTimeMs: integer('p99_response_time_ms'),
  
  // Cost metrics
  totalCostCents: integer('total_cost_cents').default(0),
  avgCostPerRequestCents: decimal('avg_cost_per_request_cents', { precision: 10, scale: 4 }),
  
  // Usage metrics (provider-specific)
  totalUnitsConsumed: decimal('total_units_consumed', { precision: 15, scale: 4 }),
  unitType: varchar('unit_type', { length: 30 }), // 'minutes', 'tokens', 'gb', 'requests'
  
  // End reason
  endReason: varchar('end_reason', { length: 100 }), // 'deactivated', 'suspended', 'replaced'
}, (table) => [
  unique().on(table.providerId, table.periodStart),
]);

// Provider Health History
export const providerHealthHistory = pgTable('provider_health_history', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => externalProviders.id),
  checkTimestamp: timestamp('check_timestamp').defaultNow(),
  
  // Basic health
  isHealthy: boolean('is_healthy').notNull(),
  responseTimeMs: integer('response_time_ms'),
  
  // Detailed health metrics
  healthMetrics: jsonb('health_metrics'), // {api_responsive: true, auth_valid: true, rate_limit_ok: true}
  performanceMetrics: jsonb('performance_metrics'), // {last_hour_success_rate: 99.5, queue_depth: 10}
  errorDetails: jsonb('error_details'),
  
  // Service-specific checks
  serviceChecks: jsonb('service_checks'), // {gpu_available: true, models_loaded: true}
}, (table) => [
  index('idx_phh_provider_timestamp').on(table.providerId, table.checkTimestamp),
]);

// Provider Usage Stats - daily aggregates
export const providerUsageStats = pgTable('provider_usage_stats', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => externalProviders.id),
  date: date('date').notNull(),
  
  // Volume metrics by operation type
  operationMetrics: jsonb('operation_metrics'), // {send_email: {count: 100, success: 95}, generate_voice: {...}}
  
  // Aggregate metrics
  totalRequests: integer('total_requests').default(0),
  successfulRequests: integer('successful_requests').default(0),
  failedRequests: integer('failed_requests').default(0),
  
  // Performance metrics
  avgResponseTimeMs: decimal('avg_response_time_ms', { precision: 10, scale: 2 }),
  successRate: decimal('success_rate', { precision: 5, scale: 2 }),
  
  // Cost metrics
  totalCostCents: integer('total_cost_cents').default(0),
  avgCostPerRequestCents: decimal('avg_cost_per_request_cents', { precision: 10, scale: 4 }),
  
  // Usage breakdown
  usageByUser: jsonb('usage_by_user'), // Top users and their usage
  usageByEntity: jsonb('usage_by_entity'), // Usage by entity type
  peakHour: integer('peak_hour'), // Hour with most requests (0-23)
  peakHourRequests: integer('peak_hour_requests'),
}, (table) => [
  unique().on(table.providerId, table.date),
  index('idx_pus_date').on(table.date),
]);

// Provider Cost Alerts
export const providerCostAlerts = pgTable('provider_cost_alerts', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => externalProviders.id),
  alertType: varchar('alert_type', { length: 50 }).notNull(), // 'daily_limit', 'monthly_limit', 'unusual_spike'
  thresholdCents: integer('threshold_cents').notNull(),
  actualCents: integer('actual_cents').notNull(),
  
  alertTriggeredAt: timestamp('alert_triggered_at').defaultNow(),
  alertResolvedAt: timestamp('alert_resolved_at'),
  
  // Actions taken
  actionsTaken: jsonb('actions_taken'), // ['notification_sent', 'provider_suspended']
  notifiedUsers: text('notified_users').array(),
  
  notes: text('notes'),
}, (table) => [
  index('idx_pca_provider_triggered').on(table.providerId, table.alertTriggeredAt),
]);

// API Key Rotation tracking
export const providerApiKeyRotation = pgTable('provider_api_key_rotation', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => externalProviders.id),
  keyIdentifier: varchar('key_identifier', { length: 50 }), // Last 4 characters or hash
  
  rotatedAt: timestamp('rotated_at').defaultNow(),
  rotatedBy: varchar('rotated_by', { length: 255 }).notNull(),
  rotationReason: varchar('rotation_reason', { length: 100 }).notNull(), // 'scheduled', 'compromised', 'expired'
  
  previousKeyIdentifier: varchar('previous_key_identifier', { length: 50 }),
  expiresAt: timestamp('expires_at'),
  
  // Validation
  isValidated: boolean('is_validated').default(false),
  validatedAt: timestamp('validated_at'),
  validationErrors: jsonb('validation_errors'),
}, (table) => [
  index('idx_pakr_provider_rotated').on(table.providerId, table.rotatedAt),
]);

// Create insert schemas
export const insertExternalProviderSchema = createInsertSchema(externalProviders);
export const insertProviderTransactionSchema = createInsertSchema(providerTransactions);
export const insertProviderFailoverSchema = createInsertSchema(providerFailovers);
export const insertProviderLifecycleEventSchema = createInsertSchema(providerLifecycleEvents);
export const insertProviderPerformancePeriodSchema = createInsertSchema(providerPerformancePeriods);
export const insertProviderHealthHistorySchema = createInsertSchema(providerHealthHistory);
export const insertProviderUsageStatsSchema = createInsertSchema(providerUsageStats);
export const insertProviderCostAlertSchema = createInsertSchema(providerCostAlerts);
export const insertProviderApiKeyRotationSchema = createInsertSchema(providerApiKeyRotation);

// Type exports
export type ExternalProvider = typeof externalProviders.$inferSelect;
export type InsertExternalProvider = z.infer<typeof insertExternalProviderSchema>;
export type ProviderTransaction = typeof providerTransactions.$inferSelect;
export type InsertProviderTransaction = z.infer<typeof insertProviderTransactionSchema>;
export type ProviderFailover = typeof providerFailovers.$inferSelect;
export type InsertProviderFailover = z.infer<typeof insertProviderFailoverSchema>;
export type ProviderLifecycleEvent = typeof providerLifecycleEvents.$inferSelect;
export type InsertProviderLifecycleEvent = z.infer<typeof insertProviderLifecycleEventSchema>;
export type ProviderPerformancePeriod = typeof providerPerformancePeriods.$inferSelect;
export type InsertProviderPerformancePeriod = z.infer<typeof insertProviderPerformancePeriodSchema>;
export type ProviderHealthHistory = typeof providerHealthHistory.$inferSelect;
export type InsertProviderHealthHistory = z.infer<typeof insertProviderHealthHistorySchema>;
export type ProviderUsageStats = typeof providerUsageStats.$inferSelect;
export type InsertProviderUsageStats = z.infer<typeof insertProviderUsageStatsSchema>;
export type ProviderCostAlert = typeof providerCostAlerts.$inferSelect;
export type InsertProviderCostAlert = z.infer<typeof insertProviderCostAlertSchema>;
export type ProviderApiKeyRotation = typeof providerApiKeyRotation.$inferSelect;
export type InsertProviderApiKeyRotation = z.infer<typeof insertProviderApiKeyRotationSchema>;