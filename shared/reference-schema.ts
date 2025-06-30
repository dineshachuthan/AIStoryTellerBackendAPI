import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index, doublePrecision, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * CORRECTED DATABASE ARCHITECTURE
 * 
 * Reference Data (Shared):
 * - stories: Published story content becomes reference data
 * - story_analyses: AI analysis becomes reference data  
 * - voice_modulation_templates: Extracted emotions/sounds/modulations
 * 
 * User Instances (User-specific):
 * - user_story_narrations: User's personalized narration of reference stories
 * - user_voice_samples: User's recorded voice samples
 * - user_emotion_voices: User's trained voice clones
 */

// REFERENCE DATA TABLES (Shared across all users)

// Reference Stories - Published content becomes shared reference data
export const referenceStories = pgTable("reference_stories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  category: text("category").notNull(),
  genre: text("genre"),
  subGenre: text("sub_genre"),
  tags: text("tags").array().default([]),
  emotionalTags: text("emotional_tags").array().default([]),
  moodCategory: text("mood_category"),
  ageRating: text("age_rating").default("general"),
  readingTime: integer("reading_time"), // minutes
  extractedCharacters: jsonb("extracted_characters").default([]),
  extractedEmotions: jsonb("extracted_emotions").default([]),
  coverImageUrl: text("cover_image_url"),
  originalAuthorId: varchar("original_author_id").notNull(), // Who first created it
  visibility: text("visibility").default("draft"), // draft, public, archived
  uploadType: text("upload_type").notNull(), // text, voice, file
  originalAudioUrl: text("original_audio_url"),
  copyrightInfo: text("copyright_info"),
  licenseType: text("license_type").default("all_rights_reserved"),
  isAdultContent: boolean("is_adult_content").default(false),
  viewCount: integer("view_count").default(0),
  likes: integer("likes").default(0),
  language: varchar("language", { length: 10 }).default("en-US"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reference Story Analysis - AI analysis becomes shared reference data
export const referenceStoryAnalyses = pgTable("reference_story_analyses", {
  id: serial("id").primaryKey(),
  referenceStoryId: integer("reference_story_id").references(() => referenceStories.id).notNull(),
  analysisType: varchar("analysis_type").notNull(), // narrative, roleplay
  analysisData: jsonb("analysis_data").notNull(),
  generatedBy: varchar("generated_by").notNull(), // AI model version
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Voice Modulation Templates - Extracted from story analyses, becomes reference data
export const voiceModulationTemplates = pgTable("voice_modulation_templates", {
  id: serial("id").primaryKey(),
  modulationType: varchar("modulation_type").notNull(), // emotion, sound, modulation
  modulationKey: varchar("modulation_key").notNull(),
  displayName: varchar("display_name").notNull(),
  description: text("description").notNull(),
  sampleText: text("sample_text").notNull(),
  targetDuration: integer("target_duration").default(10),
  category: varchar("category").default('basic'),
  voiceSettings: jsonb("voice_settings"),
  sourceStoryId: integer("source_story_id").references(() => referenceStories.id), // Which story this came from
  extractedFromAnalysisId: integer("extracted_from_analysis_id").references(() => referenceStoryAnalyses.id),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// USER INSTANCE TABLES (User-specific)

// User Story Narrations - User's personalized narration of reference stories
export const userStoryNarrations = pgTable("user_story_narrations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  referenceStoryId: integer("reference_story_id").references(() => referenceStories.id).notNull(),
  narratorVoice: varchar("narrator_voice").notNull(), // User's chosen narrator
  narratorVoiceType: varchar("narrator_voice_type").notNull(), // ai, user
  segments: jsonb("segments").notNull(), // User's narration segments
  totalDuration: integer("total_duration").notNull(), // milliseconds
  audioFileUrl: text("audio_file_url"), // Final combined audio
  voiceModifications: jsonb("voice_modifications"), // User's voice customizations
  isPublic: boolean("is_public").default(false), // Can other users see this narration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Voice Samples - User's recorded voice samples for emotions
export const userVoiceSamples = pgTable("user_voice_samples", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  emotionTemplateId: integer("emotion_template_id").references(() => voiceModulationTemplates.id),
  audioUrl: text("audio_url").notNull(),
  fileName: varchar("file_name").notNull(),
  duration: integer("duration"), // milliseconds
  qualityScore: doublePrecision("quality_score"),
  isPreferred: boolean("is_preferred").default(false),
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  recordedAt: timestamp("recorded_at").defaultNow(),
  // Voice cloning integration
  userEmotionVoiceId: integer("user_emotion_voice_id"),
  isUsedForTraining: boolean("is_used_for_training").default(false),
  qualityRating: integer("quality_rating"), // 1-5
  trainingBatchId: varchar("training_batch_id"),
});

// User Emotion Voices - User's trained voice clones for specific emotions
export const userEmotionVoices = pgTable("user_emotion_voices", {
  id: serial("id").primaryKey(),
  userVoiceProfileId: integer("user_voice_profile_id").notNull(),
  emotionTemplateId: integer("emotion_template_id").references(() => voiceModulationTemplates.id).notNull(),
  elevenlabsVoiceId: text("elevenlabs_voice_id"),
  trainingStatus: varchar("training_status").notNull().default("pending"),
  sampleCount: integer("sample_count").default(0),
  qualityScore: doublePrecision("quality_score"),
  voiceSettings: jsonb("voice_settings"),
  trainingMetadata: jsonb("training_metadata"),
  trainingCost: numeric("training_cost"),
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").default(0),
  neverDelete: boolean("never_delete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// MIGRATION COMPATIBILITY

// Temporary: Keep existing stories table for migration period
export const legacyStories = pgTable("stories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull(),
  // ... keep all existing fields for backward compatibility
  // Will be migrated to referenceStories gradually
  status: text("status").default("draft"),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Export types
export type ReferenceStory = typeof referenceStories.$inferSelect;
export type InsertReferenceStory = typeof referenceStories.$inferInsert;
export type UserStoryNarration = typeof userStoryNarrations.$inferSelect;
export type InsertUserStoryNarration = typeof userStoryNarrations.$inferInsert;
export type VoiceModulationTemplate = typeof voiceModulationTemplates.$inferSelect;
export type InsertVoiceModulationTemplate = typeof voiceModulationTemplates.$inferInsert;

// Create validation schemas
export const insertReferenceStorySchema = createInsertSchema(referenceStories);
export const insertUserStoryNarrationSchema = createInsertSchema(userStoryNarrations);
export const insertVoiceModulationTemplateSchema = createInsertSchema(voiceModulationTemplates);