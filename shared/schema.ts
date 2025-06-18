import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
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
  provider: varchar("provider"), // 'google', 'microsoft', 'facebook', 'local'
  providerId: varchar("provider_id"), // ID from the provider
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Local users table for email/password authentication
export const localUsers = pgTable("local_users", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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
  tags: text("tags").array().default([]),
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
  emotionId: integer("emotion_id").references(() => emotions.id),
  characterId: integer("character_id").references(() => storyCharacters.id), // Which character experiences this emotion
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
