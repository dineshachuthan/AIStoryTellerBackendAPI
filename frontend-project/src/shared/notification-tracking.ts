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

// Note: Provider lifecycle, performance, health, and usage tracking tables 
// are now unified in external-provider-tracking.ts to avoid duplication

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
export const insertSubscriptionTransactionSchema = createInsertSchema(subscriptionTransactions);

// Type exports
export type NotificationProvider = typeof notificationProviders.$inferSelect;
export type InsertNotificationProvider = z.infer<typeof insertNotificationProviderSchema>;
export type NotificationTransaction = typeof notificationTransactions.$inferSelect;
export type InsertNotificationTransaction = z.infer<typeof insertNotificationTransactionSchema>;
export type NotificationFailover = typeof notificationFailovers.$inferSelect;
export type InsertNotificationFailover = z.infer<typeof insertNotificationFailoverSchema>;
export type SubscriptionTransaction = typeof subscriptionTransactions.$inferSelect;
export type InsertSubscriptionTransaction = z.infer<typeof insertSubscriptionTransactionSchema>;