import { pgTable, text, integer, timestamp, boolean, jsonb, serial, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  language: text("language").default("en"),
  locale: text("locale").default("en-US"),
  nativeLanguage: text("native_language"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Stories table
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: integer("author_id").references(() => users.id),
  status: text("status").default("draft"),
  processingStatus: text("processing_status").default("pending"),
  category: text("category"),
  genre: text("genre"),
  summary: text("summary"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// ESM reference data
export const esmRef = pgTable("esm_ref", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // "emotions", "sounds", "modulations"
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1),
  createdAt: timestamp("created_at").defaultNow()
});

// User ESM recordings
export const userEsmRecordings = pgTable("user_esm_recordings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  esmId: integer("esm_id").references(() => esmRef.id),
  voiceType: text("voice_type").default("narrator"),
  audioUrl: text("audio_url"),
  duration: decimal("duration", { precision: 10, scale: 2 }),
  status: text("status").default("active"),
  narratorVoiceId: text("narrator_voice_id"),
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Story narrations
export const storyNarrations = pgTable("story_narrations", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id),
  userId: integer("user_id").references(() => users.id),
  segments: jsonb("segments"),
  conversationStyle: text("conversation_style").default("neutral"),
  narratorProfile: text("narrator_profile").default("neutral"),
  totalDuration: decimal("total_duration", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Collaboration invitations
export const storyInvitations = pgTable("story_invitations", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id),
  inviterId: integer("inviter_id").references(() => users.id),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  status: text("status").default("pending"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Type exports
export type User = typeof users.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type ESMRef = typeof esmRef.$inferSelect;
export type UserEsmRecording = typeof userEsmRecordings.$inferSelect;
export type StoryNarration = typeof storyNarrations.$inferSelect;
export type StoryInvitation = typeof storyInvitations.$inferSelect;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStorySchema = createInsertSchema(stories).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEsmRefSchema = createInsertSchema(esmRef).omit({ id: true, createdAt: true });
export const insertUserEsmRecordingSchema = createInsertSchema(userEsmRecordings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStoryNarrationSchema = createInsertSchema(storyNarrations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStoryInvitationSchema = createInsertSchema(storyInvitations).omit({ id: true, createdAt: true, updatedAt: true });

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type InsertESMRef = z.infer<typeof insertEsmRefSchema>;
export type InsertUserEsmRecording = z.infer<typeof insertUserEsmRecordingSchema>;
export type InsertStoryNarration = z.infer<typeof insertStoryNarrationSchema>;
export type InsertStoryInvitation = z.infer<typeof insertStoryInvitationSchema>;