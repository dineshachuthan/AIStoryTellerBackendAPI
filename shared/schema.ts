import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index, doublePrecision } from "drizzle-orm/pg-core";
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
  copyrightInfo: text("copyright_info"),
  licenseType: text("license_type").default("all_rights_reserved"),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  isAdultContent: boolean("is_adult_content").default(false),
  viewCount: integer("view_count").default(0),
  likes: integer("likes").default(0),
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
