import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index, doublePrecision, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  displayName: varchar("display_name"),
  profileImageUrl: varchar("profile_image_url"),
  isEmailVerified: boolean("is_email_verified").default(false),
  isAdmin: boolean("is_admin").default(false),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social authentication providers table
export const userProviders = pgTable("user_providers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  provider: varchar("provider").notNull(), // 'google', 'microsoft', 'facebook', 'local'
  providerId: varchar("provider_id").notNull(),
  providerData: jsonb("provider_data"), // Store additional provider data
  createdAt: timestamp("created_at").defaultNow(),
});

// Local users table for email/password authentication
export const localUsers = pgTable("local_users", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User session metadata table for browser/device detection and configuration
export const userSessionMetadata = pgTable("user_session_metadata", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id").notNull(),
  deviceInfo: jsonb("device_info").notNull(), // DeviceInfo object
  browserInfo: jsonb("browser_info").notNull(), // BrowserInfo object
  networkInfo: jsonb("network_info").notNull(), // NetworkInfo object
  capabilities: jsonb("capabilities").notNull(), // Capabilities object
  preferences: jsonb("preferences").notNull(), // User preferences
  sessionConfig: jsonb("session_config"), // Generated configuration for this session
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User voice samples table for capturing emotional and sound expressions
export const userVoiceSamples = pgTable("user_voice_samples", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sampleType: text("sample_type").notNull(), // 'emotion', 'sound', 'description'
  label: text("label").notNull(), // 'happy', 'sad', 'angry', 'cat_sound', 'slow_description', etc.
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration"), // in milliseconds
  isCompleted: boolean("is_completed").default(false),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Story Narrations Table - Saved narrations for cost-effective playback
export const storyNarrations = pgTable("story_narrations", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  narratorVoice: varchar("narrator_voice", { length: 255 }).notNull(),
  narratorVoiceType: varchar("narrator_voice_type", { length: 20 }).notNull(), // 'ai' | 'user'
  segments: jsonb("segments").notNull(), // Array of narration segments with audioId references
  totalDuration: integer("total_duration").notNull(), // Total duration in milliseconds
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audio Files Table - Store audio binary data directly in database
export const audioFiles = pgTable("audio_files", {
  id: serial("id").primaryKey(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull().default("audio/mpeg"),
  audioData: text("audio_data").notNull(), // Base64 encoded audio data
  fileSize: integer("file_size").notNull(), // Size in bytes
  duration: integer("duration"), // Duration in milliseconds (optional)
  metadata: jsonb("metadata"), // Additional metadata (narrator voice, segment info, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

// Stories table for user-uploaded content
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  category: text("category").notNull(),
  genre: text("genre"), // Primary genre classification
  subGenre: text("sub_genre"), // Secondary genre classification
  tags: text("tags").array().default([]),
  emotionalTags: text("emotional_tags").array().default([]), // Emotional themes in the story
  moodCategory: text("mood_category"), // Overall mood/tone of the story
  ageRating: text("age_rating").default("general"), // general, teen, mature
  readingTime: integer("reading_time"), // Estimated reading time in minutes
  extractedCharacters: jsonb("extracted_characters").default([]), // AI-extracted character data
  extractedEmotions: jsonb("extracted_emotions").default([]), // AI-extracted emotion data
  voiceSampleUrl: text("voice_sample_url"), // Original voice upload if any
  coverImageUrl: text("cover_image_url"),
  authorId: varchar("author_id").references(() => users.id),
  uploadType: text("upload_type").notNull(), // 'text', 'voice', 'manual'
  originalAudioUrl: text("original_audio_url"), // For voice uploads
  processingStatus: text("processing_status").default("pending"), // 'pending', 'processing', 'completed', 'failed'
  status: text("status").default("draft"), // 'draft', 'ready', 'analyzed', 'published'
  copyrightInfo: text("copyright_info"),
  licenseType: text("license_type").default("all_rights_reserved"),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  isAdultContent: boolean("is_adult_content").default(false),
  viewCount: integer("view_count").default(0),
  likes: integer("likes").default(0),
  narratorVoice: text("narrator_voice"), // Stored narrator voice for story narration (AI voice name or user voice ID)
  narratorVoiceType: text("narrator_voice_type"), // 'ai' or 'user' to identify voice source
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Story characters table for extracted/assigned characters
export const storyCharacters = pgTable("story_characters", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id),
  name: text("name").notNull(),
  description: text("description"),
  personality: text("personality"),
  role: text("role"), // 'protagonist', 'antagonist', 'supporting', etc.
  imageUrl: text("image_url"), // Generated or user-assigned image
  isGenerated: boolean("is_generated").default(true), // Whether image was AI-generated
  assignedVoice: text("assigned_voice"), // OpenAI voice (alloy, echo, fable, nova, onyx, shimmer)
  voiceSampleId: integer("voice_sample_id"), // User voice sample ID if assigned
  createdAt: timestamp("created_at").defaultNow(),
});

// Emotion text prompts table for consistent voice recording
export const emotionTextPrompts = pgTable("emotion_text_prompts", {
  id: serial("id").primaryKey(),
  emotion: text("emotion").unique().notNull(), // 'happiness', 'sadness', 'anger', etc.
  promptText: text("prompt_text").notNull(), // Text for users to read aloud
  description: text("description"), // What emotion should be expressed
  category: text("category").default("primary"), // primary, secondary, advanced
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Generic emotions table for reusable emotion samples
export const emotions = pgTable("emotions", {
  id: serial("id").primaryKey(),
  emotion: text("emotion").notNull(), // 'happy', 'sad', 'angry', 'fear', etc.
  intensity: integer("intensity").notNull(), // 1-10 scale
  context: text("context").notNull(), // Context where this emotion appears
  quote: text("quote"), // Quote that represents this emotion
  audioUrl: text("audio_url"), // Generated audio sample URL
  voiceUsed: text("voice_used"), // Which voice was used (for consistency)
  createdAt: timestamp("created_at").defaultNow(),
});

// Story emotions association table
export const storyEmotions = pgTable("story_emotions", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id),
  emotion: text("emotion").notNull(), // Direct emotion storage instead of reference
  intensity: integer("intensity").notNull(),
  context: text("context").notNull(),
  voiceUrl: text("voice_url"), // User-recorded voice sample for this emotion (optional)
  createdAt: timestamp("created_at").defaultNow(),
});

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  personality: text("personality").notNull(),
  greeting: text("greeting").notNull(),
  category: text("category").notNull(),
  avatar: text("avatar"),
  background: text("background"),
  likes: integer("likes").default(0),
  chats: integer("chats").default(0),
  rating: integer("rating").default(50), // out of 50 (5.0 * 10)
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").references(() => characters.id),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  content: text("content").notNull(),
  isAi: boolean("is_ai").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Story collaboration tables
export const storyCollaborations = pgTable("story_collaborations", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  invitedUserId: varchar("invited_user_id").references(() => users.id).notNull(),
  invitedByUserId: varchar("invited_by_user_id").references(() => users.id).notNull(),
  assignedCharacterId: integer("assigned_character_id").references(() => storyCharacters.id),
  status: varchar("status").notNull().default("pending"), // pending, accepted, declined
  permissions: varchar("permissions").notNull().default("voice_only"), // voice_only, edit, view
  invitedAt: timestamp("invited_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const storyGroups = pgTable("story_groups", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  visibility: varchar("visibility").notNull().default("private"), // private, public, friends
  createdByUserId: varchar("created_by_user_id").references(() => users.id).notNull(),
  inviteCode: varchar("invite_code").unique(),
  maxMembers: integer("max_members").default(10),
  createdAt: timestamp("created_at").defaultNow(),
});

export const storyGroupMembers = pgTable("story_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => storyGroups.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  assignedCharacterId: integer("assigned_character_id").references(() => storyCharacters.id),
  role: varchar("role").notNull().default("member"), // admin, member, viewer
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const characterVoiceAssignments = pgTable("character_voice_assignments", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  characterId: integer("character_id").references(() => storyCharacters.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  voiceSampleUrl: text("voice_sample_url"),
  emotionMappings: jsonb("emotion_mappings"), // Maps emotions to specific voice recordings
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User voice emotion repository - persistent across all stories
export const userVoiceEmotions = pgTable("user_voice_emotions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  emotion: varchar("emotion").notNull(), // joy, grief, shock, anger, fear, love, etc.
  intensity: integer("intensity").notNull(), // 1-10 scale
  audioUrl: text("audio_url").notNull(),
  fileName: varchar("file_name").notNull(),
  duration: integer("duration"), // in milliseconds
  isBaseVoice: boolean("is_base_voice").default(false), // Primary voice for interpolation
  storyIdRecorded: integer("story_id_recorded").references(() => stories.id), // Story where it was first recorded
  usageCount: integer("usage_count").default(0), // How many times this voice has been used
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Voice cloning profiles - Links users to their cloned voices
export const userVoiceProfiles = pgTable("user_voice_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  provider: varchar("provider").notNull(), // elevenlabs, openai, etc.
  voiceId: varchar("voice_id").notNull(), // Provider-specific voice ID
  voiceName: varchar("voice_name").notNull(),
  status: varchar("status").notNull().default("training"), // training, completed, failed
  emotionCount: integer("emotion_count").default(0),
  emotionsCovered: jsonb("emotions_covered").$type<string[]>().default([]),
  metadata: jsonb("metadata"), // Provider-specific metadata
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



// Voice generation cache for performance optimization
export const voiceGenerationCache = pgTable("voice_generation_cache", {
  id: serial("id").primaryKey(),
  cacheKey: varchar("cache_key").notNull().unique(),
  userId: varchar("user_id").references(() => users.id),
  voiceId: varchar("voice_id"),
  emotion: varchar("emotion"),
  textHash: varchar("text_hash").notNull(),
  audioData: text("audio_data").notNull(), // Base64 encoded audio data
  audioUrl: varchar("audio_url"),
  provider: varchar("provider").notNull(),
  duration: real("duration"),
  format: varchar("format").notNull().default("mp3"),
  size: integer("size").notNull(),
  generationSettings: jsonb("generation_settings"),
  hitCount: integer("hit_count").default(1),
  lastAccessed: timestamp("last_accessed").defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User customizations for public stories - allows users to personalize without modifying original
export const storyCustomizations = pgTable("story_customizations", {
  id: serial("id").primaryKey(),
  originalStoryId: integer("original_story_id").references(() => stories.id).notNull(),
  customizedByUserId: varchar("customized_by_user_id").references(() => users.id).notNull(),
  customTitle: text("custom_title"), // Optional custom title for user's version
  customCharacterImages: jsonb("custom_character_images"), // User's character image overrides
  customVoiceAssignments: jsonb("custom_voice_assignments"), // User's voice sample assignments
  customEmotionMappings: jsonb("custom_emotion_mappings"), // User's emotion voice mappings
  isPrivate: boolean("is_private").default(true), // Whether this customization is private to the user
  playCount: integer("play_count").default(0),
  lastPlayedAt: timestamp("last_played_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storyPlaybacks = pgTable("story_playbacks", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  narrationData: jsonb("narration_data").notNull(), // Complete narration segments with voice assignments
  createdByUserId: varchar("created_by_user_id").references(() => users.id).notNull(),
  visibility: varchar("visibility").notNull().default("private"), // private, public, group
  playCount: integer("play_count").default(0),
  likeCount: integer("like_count").default(0),
  shareCount: integer("share_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User interaction confidence tracking per story
export const storyUserConfidence = pgTable("story_user_confidence", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Interaction metrics
  totalInteractions: integer("total_interactions").default(0),
  voiceRecordingsCompleted: integer("voice_recordings_completed").default(0),
  emotionsRecorded: integer("emotions_recorded").default(0),
  playbacksCompleted: integer("playbacks_completed").default(0),
  timeSpentSeconds: integer("time_spent_seconds").default(0),
  
  // Confidence scores (0-100)
  voiceConfidence: integer("voice_confidence").default(0), // How comfortable with voice recording
  storyEngagement: integer("story_engagement").default(0), // How engaged with story content
  overallConfidence: integer("overall_confidence").default(0), // Combined confidence score
  
  // Engagement tracking
  lastInteractionAt: timestamp("last_interaction_at").defaultNow(),
  firstInteractionAt: timestamp("first_interaction_at").defaultNow(),
  sessionCount: integer("session_count").default(1),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Global character archetypes for reusable voice assignments
export const characterArchetypes = pgTable("character_archetypes", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // e.g., "King", "Mother", "Wise Old Man"
  category: varchar("category").notNull(), // e.g., "authority", "family", "animal", "fantasy"
  gender: varchar("gender"), // "male", "female", "neutral", "unknown"
  ageGroup: varchar("age_group"), // "child", "young", "adult", "elderly"
  personality: varchar("personality"), // "authoritative", "gentle", "wise", "dramatic"
  recommendedVoice: varchar("recommended_voice").notNull(), // OpenAI voice name
  description: text("description"),
  keywords: text("keywords").array(), // Array of keywords for matching
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User-specific character voice preferences that override defaults
export const userCharacterPreferences = pgTable("user_character_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  archetypeId: integer("archetype_id").references(() => characterArchetypes.id),
  characterPattern: varchar("character_pattern").notNull(), // e.g., "king", "mother", "wise old man"
  preferredVoice: varchar("preferred_voice").notNull(),
  speedModifier: doublePrecision("speed_modifier").default(1.0), // 0.25 to 4.0
  reasonForPreference: text("reason_for_preference"),
  timesUsed: integer("times_used").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Global emotion-voice mappings for consistency
export const emotionVoiceProfiles = pgTable("emotion_voice_profiles", {
  id: serial("id").primaryKey(),
  emotion: varchar("emotion").notNull(), // "wisdom", "anger", "joy", etc.
  characterType: varchar("character_type"), // "mother", "king", "child", etc. (optional for specificity)
  baseVoice: varchar("base_voice").notNull(), // OpenAI voice name
  speedModifier: doublePrecision("speed_modifier").default(1.0),
  styleInstructions: text("style_instructions"), // Text-to-speech style hints
  usageCount: integer("usage_count").default(0),
  successRate: doublePrecision("success_rate").default(1.0), // User satisfaction rating
  createdAt: timestamp("created_at").defaultNow(),
});

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = insertUserSchema.extend({
  id: z.string(),
});

// Story schemas
export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  viewCount: true,
  likes: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoryCharacterSchema = createInsertSchema(storyCharacters).omit({
  id: true,
  createdAt: true,
});

export const insertEmotionSchema = createInsertSchema(emotions).omit({
  id: true,
  createdAt: true,
});

export const insertStoryEmotionSchema = createInsertSchema(storyEmotions).omit({
  id: true,
  createdAt: true,
});

export const insertUserVoiceSampleSchema = createInsertSchema(userVoiceSamples).omit({
  id: true,
  recordedAt: true,
});

// Character schemas
export const insertCharacterSchema = createInsertSchema(characters).omit({
  id: true,
  likes: true,
  chats: true,
  rating: true,
  createdById: true,
  createdAt: true,
});

// Conversation schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

// Message schemas
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;

export type StoryCharacter = typeof storyCharacters.$inferSelect;
export type InsertStoryCharacter = z.infer<typeof insertStoryCharacterSchema>;

export type StoryEmotion = typeof storyEmotions.$inferSelect;
export type InsertStoryEmotion = z.infer<typeof insertStoryEmotionSchema>;

export type UserVoiceSample = typeof userVoiceSamples.$inferSelect;
export type InsertUserVoiceSample = z.infer<typeof insertUserVoiceSampleSchema>;

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Collaboration schemas
export const insertStoryCollaborationSchema = createInsertSchema(storyCollaborations).omit({
  id: true,
  invitedAt: true,
  respondedAt: true,
});

export const insertStoryGroupSchema = createInsertSchema(storyGroups).omit({
  id: true,
  createdAt: true,
});

export const insertStoryGroupMemberSchema = createInsertSchema(storyGroupMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertCharacterVoiceAssignmentSchema = createInsertSchema(characterVoiceAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoryPlaybackSchema = createInsertSchema(storyPlaybacks).omit({
  id: true,
  playCount: true,
  likeCount: true,
  shareCount: true,
  createdAt: true,
  updatedAt: true,
});

// Collaboration type exports
export type StoryCollaboration = typeof storyCollaborations.$inferSelect;
export type InsertStoryCollaboration = z.infer<typeof insertStoryCollaborationSchema>;

export type StoryGroup = typeof storyGroups.$inferSelect;
export type InsertStoryGroup = z.infer<typeof insertStoryGroupSchema>;

export type StoryGroupMember = typeof storyGroupMembers.$inferSelect;
export type InsertStoryGroupMember = z.infer<typeof insertStoryGroupMemberSchema>;

export type CharacterVoiceAssignment = typeof characterVoiceAssignments.$inferSelect;
export type InsertCharacterVoiceAssignment = z.infer<typeof insertCharacterVoiceAssignmentSchema>;

export type StoryPlayback = typeof storyPlaybacks.$inferSelect;
export type InsertStoryPlayback = z.infer<typeof insertStoryPlaybackSchema>;

export type CharacterArchetype = typeof characterArchetypes.$inferSelect;
export type InsertCharacterArchetype = typeof characterArchetypes.$inferInsert;

export type UserCharacterPreference = typeof userCharacterPreferences.$inferSelect;
export type InsertUserCharacterPreference = typeof userCharacterPreferences.$inferInsert;

export type EmotionVoiceProfile = typeof emotionVoiceProfiles.$inferSelect;
export type InsertEmotionVoiceProfile = typeof emotionVoiceProfiles.$inferInsert;

// Story User Confidence schemas
export const insertStoryUserConfidenceSchema = createInsertSchema(storyUserConfidence).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type StoryUserConfidence = typeof storyUserConfidence.$inferSelect;
export type InsertStoryUserConfidence = z.infer<typeof insertStoryUserConfidenceSchema>;

// =============================================================================
// COLLABORATIVE ROLEPLAY SYSTEM - Template-Instance Architecture
// =============================================================================

// Story Templates - Master story content (immutable)
export const storyTemplates = pgTable("story_templates", {
  id: serial("id").primaryKey(),
  originalStoryId: integer("original_story_id").references(() => stories.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  genre: varchar("genre"),
  tags: text("tags").array(),
  isPublic: boolean("is_public").default(true),
  allowRemixes: boolean("allow_remixes").default(true),
  allowInstances: boolean("allow_instances").default(true),
  createdByUserId: varchar("created_by_user_id").references(() => users.id).notNull(),
  templateVersion: integer("template_version").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Story Instances - Production versions with specific cast assignments
export const storyInstances = pgTable("story_instances", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => storyTemplates.id).notNull(),
  instanceTitle: text("instance_title").notNull(),
  description: text("description"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id).notNull(),
  status: varchar("status").default("draft"), // draft, recording, processing, completed, published
  isPublic: boolean("is_public").default(false),
  allowCollaborators: boolean("allow_collaborators").default(true),
  estimatedDuration: integer("estimated_duration"), // in seconds
  completionPercentage: integer("completion_percentage").default(0),
  finalVideoUrl: text("final_video_url"),
  finalAudioUrl: text("final_audio_url"),
  viewCount: integer("view_count").default(0),
  likeCount: integer("like_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Story Remixes - Modified templates with customizations
export const storyRemixes = pgTable("story_remixes", {
  id: serial("id").primaryKey(),
  originalTemplateId: integer("original_template_id").references(() => storyTemplates.id).notNull(),
  remixTitle: text("remix_title").notNull(),
  description: text("description"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id).notNull(),
  modifications: jsonb("modifications"), // Store scene/setting changes
  isPublic: boolean("is_public").default(true),
  allowInstances: boolean("allow_instances").default(true),
  parentRemixId: integer("parent_remix_id"), // Self-reference will be added later
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Character Roles - Extracted from roleplay analysis
export const characterRoles = pgTable("character_roles", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => storyTemplates.id),
  remixId: integer("remix_id").references(() => storyRemixes.id),
  characterName: text("character_name").notNull(),
  characterDescription: text("character_description"),
  personality: text("personality"),
  role: varchar("role").notNull(), // protagonist, antagonist, supporting, narrator, other
  appearance: text("appearance"),
  traits: text("traits").array(),
  dialogueCount: integer("dialogue_count").default(0),
  estimatedRecordingTime: integer("estimated_recording_time"), // in seconds
  requiredEmotions: jsonb("required_emotions"), // Array of {emotion, intensity, sampleCount}
  aiVoiceDefault: varchar("ai_voice_default"), // fallback OpenAI voice
  createdAt: timestamp("created_at").defaultNow(),
});

// Instance Participants - Character assignments per instance
export const instanceParticipants = pgTable("instance_participants", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id").references(() => storyInstances.id).notNull(),
  characterRoleId: integer("character_role_id").references(() => characterRoles.id).notNull(),
  userId: varchar("user_id").references(() => users.id), // null if AI voice
  assignmentType: varchar("assignment_type").notNull(), // self, invited, ai
  invitationToken: varchar("invitation_token").unique(),
  invitationStatus: varchar("invitation_status").default("pending"), // pending, accepted, declined, completed
  profileImageUrl: text("profile_image_url"),
  recordingProgress: integer("recording_progress").default(0), // percentage
  voiceQualityScore: doublePrecision("voice_quality_score"),
  invitedAt: timestamp("invited_at"),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Character Media Submissions - Voice samples and profile pictures
export const characterMediaSubmissions = pgTable("character_media_submissions", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").references(() => instanceParticipants.id).notNull(),
  mediaType: varchar("media_type").notNull(), // voice, profile_image
  emotion: varchar("emotion"), // for voice samples
  intensity: integer("intensity"), // 1-10 for voice samples
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  duration: integer("duration"), // for voice samples in seconds
  qualityScore: doublePrecision("quality_score"),
  isApproved: boolean("is_approved").default(true),
  metadata: jsonb("metadata"), // additional file metadata
  createdAt: timestamp("created_at").defaultNow(),
});

// Scene Dialogues - Detailed scene breakdown for video generation
export const sceneDialogues = pgTable("scene_dialogues", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => storyTemplates.id),
  remixId: integer("remix_id").references(() => storyRemixes.id),
  sceneNumber: integer("scene_number").notNull(),
  sequenceNumber: integer("sequence_number").notNull(),
  characterRoleId: integer("character_role_id").references(() => characterRoles.id).notNull(),
  dialogueText: text("dialogue_text").notNull(),
  emotion: varchar("emotion").notNull(),
  intensity: integer("intensity").notNull(),
  stageDirection: text("stage_direction"),
  estimatedDuration: integer("estimated_duration"), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

// Scene Backgrounds - Visual settings for video generation
export const sceneBackgrounds = pgTable("scene_backgrounds", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => storyTemplates.id),
  remixId: integer("remix_id").references(() => storyRemixes.id),
  sceneNumber: integer("scene_number").notNull(),
  location: text("location").notNull(),
  timeOfDay: varchar("time_of_day"),
  atmosphere: text("atmosphere"),
  visualDescription: text("visual_description"),
  soundscape: text("soundscape"),
  lighting: text("lighting"),
  backgroundImageUrl: text("background_image_url"),
  isCustomized: boolean("is_customized").default(false), // true for remixes
  createdAt: timestamp("created_at").defaultNow(),
});

// Video Generation Jobs - Background processing queue
export const videoGenerationJobs = pgTable("video_generation_jobs", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id").references(() => storyInstances.id).notNull(),
  status: varchar("status").default("queued"), // queued, processing, completed, failed
  priority: integer("priority").default(5), // 1-10, higher = more priority
  progress: integer("progress").default(0), // 0-100 percentage
  errorMessage: text("error_message"),
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  outputVideoUrl: text("output_video_url"),
  outputAudioUrl: text("output_audio_url"),
  metadata: jsonb("metadata"), // processing details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Version Lineage - Track original→remix→instance relationships
export const versionLineage = pgTable("version_lineage", {
  id: serial("id").primaryKey(),
  parentType: varchar("parent_type").notNull(), // template, remix
  parentId: integer("parent_id").notNull(),
  childType: varchar("child_type").notNull(), // remix, instance
  childId: integer("child_id").notNull(),
  relationshipType: varchar("relationship_type").notNull(), // remix, instance, fork
  createdAt: timestamp("created_at").defaultNow(),
});

// Authentication schemas for new tables
export const insertUserProviderSchema = createInsertSchema(userProviders).omit({
  id: true,
  createdAt: true,
});

export const insertLocalUserSchema = createInsertSchema(localUsers).omit({
  createdAt: true,
});

export type UserProvider = typeof userProviders.$inferSelect;
export type InsertUserProvider = z.infer<typeof insertUserProviderSchema>;
export type LocalUser = typeof localUsers.$inferSelect;
export type InsertLocalUser = z.infer<typeof insertLocalUserSchema>;

// =============================================================================
// COLLABORATIVE ROLEPLAY SCHEMAS
// =============================================================================

// Story Template schemas
export const insertStoryTemplateSchema = createInsertSchema(storyTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Story Instance schemas
export const insertStoryInstanceSchema = createInsertSchema(storyInstances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Story Remix schemas
export const insertStoryRemixSchema = createInsertSchema(storyRemixes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Character Role schemas
export const insertCharacterRoleSchema = createInsertSchema(characterRoles).omit({
  id: true,
  createdAt: true,
});

// Instance Participant schemas
export const insertInstanceParticipantSchema = createInsertSchema(instanceParticipants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Character Media Submission schemas
export const insertCharacterMediaSubmissionSchema = createInsertSchema(characterMediaSubmissions).omit({
  id: true,
  createdAt: true,
});

// Scene Dialogue schemas
export const insertSceneDialogueSchema = createInsertSchema(sceneDialogues).omit({
  id: true,
  createdAt: true,
});

// Scene Background schemas
export const insertSceneBackgroundSchema = createInsertSchema(sceneBackgrounds).omit({
  id: true,
  createdAt: true,
});

// Video Generation Job schemas
export const insertVideoGenerationJobSchema = createInsertSchema(videoGenerationJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Version Lineage schemas
export const insertVersionLineageSchema = createInsertSchema(versionLineage).omit({
  id: true,
  createdAt: true,
});

// Story Analyses - Store narrative and roleplay analyses to prevent regeneration
export const storyAnalyses = pgTable("story_analyses", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  analysisType: text("analysis_type").notNull(), // 'narrative' or 'roleplay'
  analysisData: jsonb("analysis_data").notNull(), // Full analysis JSON
  generatedBy: varchar("generated_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Story Analysis schemas
export const insertStoryAnalysisSchema = createInsertSchema(storyAnalyses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type StoryAnalysis = typeof storyAnalyses.$inferSelect;
export type InsertStoryAnalysis = z.infer<typeof insertStoryAnalysisSchema>;

// Story Narrations schemas
export const insertStoryNarrationSchema = createInsertSchema(storyNarrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type StoryNarration = typeof storyNarrations.$inferSelect;
export type InsertStoryNarration = z.infer<typeof insertStoryNarrationSchema>;

// Audio Files schemas
export const insertAudioFileSchema = createInsertSchema(audioFiles).omit({
  id: true,
  createdAt: true,
});

export type AudioFile = typeof audioFiles.$inferSelect;
export type InsertAudioFile = z.infer<typeof insertAudioFileSchema>;

// =============================================================================
// VIDEO GENERATION SYSTEM - Character Assets & Caching
// =============================================================================

// Character assets for video generation with user overrides
export const characterAssets = pgTable("character_assets", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  characterName: varchar("character_name").notNull(),
  
  // AI-generated defaults
  aiGeneratedImageUrl: text("ai_generated_image_url"),
  aiGeneratedImagePrompt: text("ai_generated_image_prompt"),
  aiVoiceAssignment: varchar("ai_voice_assignment"), // OpenAI voice (alloy, echo, fable, nova, onyx, shimmer)
  
  // User overrides (takes precedence)
  userImageUrl: text("user_image_url"),
  userVoiceSampleUrl: text("user_voice_sample_url"),
  overriddenBy: varchar("overridden_by").references(() => users.id),
  
  // Generation and validation status
  imageGenerationStatus: varchar("image_generation_status").default("pending"), // pending, generating, completed, failed
  voiceAssignmentStatus: varchar("voice_assignment_status").default("pending"),
  lastValidationAt: timestamp("last_validation_at"),
  isValid: boolean("is_valid").default(false),
  validationErrors: jsonb("validation_errors"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_character_assets_story_character").on(table.storyId, table.characterName)
]);

// Video generation jobs and cache
export const videoGenerations = pgTable("video_generations", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  requestedBy: varchar("requested_by").references(() => users.id).notNull(),
  
  // Generation parameters and snapshot
  generationParams: jsonb("generation_params").notNull(),
  characterAssetsSnapshot: jsonb("character_assets_snapshot").notNull(),
  
  // Kling API task tracking
  taskId: varchar("task_id"), // Kling API task ID for polling
  provider: varchar("provider").default("kling"), // Video provider used
  
  // Status and outputs - Updated for validation workflow
  status: varchar("status").default("pending"), // pending, processing, completed, FINAL, failed
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"), // in seconds
  
  // User validation workflow
  userApproved: boolean("user_approved").default(false), // Has user approved the video?
  approvedAt: timestamp("approved_at"), // When user approved the video
  regenerationCount: integer("regeneration_count").default(0), // How many times regenerated
  
  // Error handling and retries
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  // Polling and timing
  lastPolledAt: timestamp("last_polled_at"), // Last time we checked status
  estimatedCompletionAt: timestamp("estimated_completion_at"), // When we expect completion
  
  // Caching and expiration
  cacheKey: varchar("cache_key").unique(),
  expiresAt: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_video_cache_key").on(table.cacheKey),
  index("idx_video_story_status").on(table.storyId, table.status),
  index("idx_video_task_id").on(table.taskId), // For polling by task ID
  index("idx_video_pending_poll").on(table.status, table.lastPolledAt) // For finding videos that need polling
]);

// Scene data for video generation
export const storyScenes = pgTable("story_scenes", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  sceneNumber: integer("scene_number").notNull(),
  title: varchar("title"),
  description: text("description"),
  
  // Scene content
  dialogues: jsonb("dialogues").notNull(),
  backgroundPrompt: text("background_prompt"),
  backgroundImageUrl: text("background_image_url"),
  
  // Timing and pacing
  estimatedDuration: integer("estimated_duration"), // in seconds
  pacing: varchar("pacing").default("normal"), // slow, normal, fast
  
  // Generation status
  backgroundGenerationStatus: varchar("background_generation_status").default("pending"),
  lastProcessedAt: timestamp("last_processed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_story_scenes_story_order").on(table.storyId, table.sceneNumber)
]);

// Asset cache for OpenAI generated content
export const aiAssetCache = pgTable("ai_asset_cache", {
  id: serial("id").primaryKey(),
  cacheKey: varchar("cache_key").unique().notNull(),
  assetType: varchar("asset_type").notNull(), // 'character_image', 'scene_background', 'voice_audio'
  
  // Generation parameters
  prompt: text("prompt").notNull(),
  model: varchar("model"),
  parameters: jsonb("parameters"),
  
  // Generated content
  assetUrl: text("asset_url").notNull(),
  metadata: jsonb("metadata"),
  
  // Validation and quality
  isValid: boolean("is_valid").default(true),
  validationErrors: jsonb("validation_errors"),
  qualityScore: doublePrecision("quality_score"),
  
  // Usage tracking for cost optimization
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  
  // Cache management
  expiresAt: timestamp("expires_at"),
  estimatedCost: doublePrecision("estimated_cost"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_asset_cache_key").on(table.cacheKey),
  index("idx_asset_cache_type_valid").on(table.assetType, table.isValid),
  index("idx_asset_cache_expires").on(table.expiresAt)
]);

// Video generation schemas
export const insertCharacterAssetSchema = createInsertSchema(characterAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVideoGenerationSchema = createInsertSchema(videoGenerations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStorySceneSchema = createInsertSchema(storyScenes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiAssetCacheSchema = createInsertSchema(aiAssetCache).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Video generation type exports
export type CharacterAsset = typeof characterAssets.$inferSelect;
export type InsertCharacterAsset = z.infer<typeof insertCharacterAssetSchema>;

export type VideoGeneration = typeof videoGenerations.$inferSelect;
export type InsertVideoGeneration = z.infer<typeof insertVideoGenerationSchema>;

export type StoryScene = typeof storyScenes.$inferSelect;
export type InsertStoryScene = z.infer<typeof insertStorySceneSchema>;

export type AiAssetCache = typeof aiAssetCache.$inferSelect;
export type InsertAiAssetCache = z.infer<typeof insertAiAssetCacheSchema>;

// =============================================================================
// COLLABORATIVE ROLEPLAY TYPE EXPORTS
// =============================================================================

export type StoryTemplate = typeof storyTemplates.$inferSelect;
export type InsertStoryTemplate = z.infer<typeof insertStoryTemplateSchema>;

export type StoryInstance = typeof storyInstances.$inferSelect;
export type InsertStoryInstance = z.infer<typeof insertStoryInstanceSchema>;

export type StoryRemix = typeof storyRemixes.$inferSelect;
export type InsertStoryRemix = z.infer<typeof insertStoryRemixSchema>;

export type CharacterRole = typeof characterRoles.$inferSelect;
export type InsertCharacterRole = z.infer<typeof insertCharacterRoleSchema>;

export type InstanceParticipant = typeof instanceParticipants.$inferSelect;
export type InsertInstanceParticipant = z.infer<typeof insertInstanceParticipantSchema>;

export type CharacterMediaSubmission = typeof characterMediaSubmissions.$inferSelect;
export type InsertCharacterMediaSubmission = z.infer<typeof insertCharacterMediaSubmissionSchema>;

export type SceneDialogue = typeof sceneDialogues.$inferSelect;
export type InsertSceneDialogue = z.infer<typeof insertSceneDialogueSchema>;

export type SceneBackground = typeof sceneBackgrounds.$inferSelect;
export type InsertSceneBackground = z.infer<typeof insertSceneBackgroundSchema>;

export type VideoGenerationJob = typeof videoGenerationJobs.$inferSelect;
export type InsertVideoGenerationJob = z.infer<typeof insertVideoGenerationJobSchema>;

export type VersionLineage = typeof versionLineage.$inferSelect;
export type InsertVersionLineage = z.infer<typeof insertVersionLineageSchema>;
