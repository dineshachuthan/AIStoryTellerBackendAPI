import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index, doublePrecision, numeric, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===== CENTRALIZED STATE MANAGEMENT SYSTEM =====

// Main app_states table - Single source of truth for all application states
export const appStates = pgTable("app_states", {
  id: serial("id").primaryKey(),
  stateType: varchar("state_type", { length: 50 }).notNull(), // 'story', 'story_instance', 'video_job', etc.
  stateKey: varchar("state_key", { length: 50 }).notNull(), // 'draft', 'published', 'processing', etc.
  displayName: varchar("display_name", { length: 100 }).notNull(), // 'Draft', 'Published', 'Processing'
  description: text("description"),
  isInitial: boolean("is_initial").default(false),
  isTerminal: boolean("is_terminal").default(false),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_app_states_type_key").on(table.stateType, table.stateKey),
]);

// State transitions table - Defines valid state flow rules
export const stateTransitions = pgTable("state_transitions", {
  id: serial("id").primaryKey(),
  stateType: varchar("state_type", { length: 50 }).notNull(),
  fromState: varchar("from_state", { length: 50 }).notNull(),
  toState: varchar("to_state", { length: 50 }).notNull(),
  isAutomatic: boolean("is_automatic").default(false),
  requiresPermission: boolean("requires_permission").default(false),
  validationRules: jsonb("validation_rules"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_state_transitions_type_from").on(table.stateType, table.fromState),
]);

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
  externalId: varchar("external_id", { length: 20 }).unique(), // Anonymous ID for external services (e.g., "anon_1234567890")
  language: varchar("language", { length: 10 }).default('en'), // User's preferred UI language
  locale: varchar("locale", { length: 20 }), // Full locale from OAuth (en-US, hi-IN, ta-IN)
  nativeLanguage: varchar("native_language", { length: 10 }), // Mother tongue (ta, hi, te, etc.)
  isEmailVerified: boolean("is_email_verified").default(false),
  isAdmin: boolean("is_admin").default(false),
  isActive: boolean("is_active").default(true),
  stripeCustomerId: varchar("stripe_customer_id"), // Stripe customer ID
  stripeSubscriptionId: varchar("stripe_subscription_id"), // Stripe subscription ID
  subscriptionStatus: varchar("subscription_status", { length: 50 }), // active, cancelled, past_due, etc.
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User language preferences - Multi-language support per user
export const userLanguagePreferences = pgTable("user_language_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  language: varchar("language", { length: 10 }).notNull(), // 'en', 'ta', 'hi', 'te', etc.
  proficiencyLevel: varchar("proficiency_level", { length: 20 }).default('native'), // 'native', 'fluent', 'intermediate', 'basic'
  isPreferred: boolean("is_preferred").default(false), // Primary language for UI
  useContexts: text("use_contexts").array(), // ['family', 'work', 'friends', 'formal']
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_language_prefs_user_lang").on(table.userId, table.language),
]);

// User relationships - Complex relationship mapping with language and style preferences (REMOVED DUPLICATE - see line 665)

// Language-specific voice profiles - Different narrator voices per language
export const userLanguageVoiceProfiles = pgTable("user_language_voice_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  profileName: varchar("profile_name", { length: 100 }).notNull(), // "Tamil Narrator", "English Business Voice"
  elevenlabsVoiceId: text("elevenlabs_voice_id"),
  voiceCharacteristics: jsonb("voice_characteristics"), // Language-specific voice settings
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_lang_voice_user_lang").on(table.userId, table.language),
]);

// Language-specific conversation styles - Cultural context per language
export const languageConversationStyles = pgTable("language_conversation_styles", {
  id: serial("id").primaryKey(),
  language: varchar("language", { length: 10 }).notNull(),
  styleKey: varchar("style_key", { length: 50 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  voiceParameters: jsonb("voice_parameters"), // Language-specific voice modifications
  culturalContext: text("cultural_context"), // Language-specific cultural considerations
  samplePhrases: text("sample_phrases").array(), // Example phrases in this language/style
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lang_conv_styles_lang_key").on(table.language, table.styleKey),
]);

// Story sharing contexts - Multi-dimensional relationship-aware narration
export const storySharingContexts = pgTable("story_sharing_contexts", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  recipientRelationshipId: integer("recipient_relationship_id").references(() => userRelationships.id),
  language: varchar("language", { length: 10 }).notNull(),
  conversationStyle: varchar("conversation_style", { length: 50 }).notNull(),
  narrationUrl: text("narration_url"), // Cached narration for this specific context
  cacheKey: varchar("cache_key", { length: 255 }), // User.Story.Language.Style.Relationship
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_story_sharing_contexts_cache").on(table.cacheKey),
  index("idx_story_sharing_contexts_story_recipient").on(table.storyId, table.recipientRelationshipId),
]);

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
  passwordHint: varchar("password_hint", { length: 255 }),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  accountLockedUntil: timestamp("account_locked_until"),
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
  isLocked: boolean("is_locked").default(false), // locked after voice cloning
  lockedAt: timestamp("locked_at"), // when sample was locked
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Legacy Story Narrations - will be replaced by enhanced storyNarrations table below

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
  content: text("content"), // nullable - can be empty for draft stories
  summary: text("summary"), // nullable - generated by AI
  category: text("category").notNull(), // required from frontend
  genre: text("genre"), // nullable - generated by AI analysis
  subGenre: text("sub_genre"), // nullable - generated by AI analysis
  tags: text("tags").array().default([]), // nullable with default
  emotionalTags: text("emotional_tags").array().default([]), // nullable with default - generated by AI
  moodCategory: text("mood_category"), // nullable - generated by AI
  ageRating: text("age_rating").default("general"), // nullable with default
  readingTime: integer("reading_time"), // nullable - calculated by system
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
  language: varchar("language", { length: 10 }).default("en-US"), // Story language (en-US, es-ES, fr-FR, etc.)
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

// Individual emotion voice clones (one per emotion per user)
export const userEmotionVoices = pgTable("user_emotion_voices", {
  id: serial("id").primaryKey(),
  userVoiceProfileId: integer("user_voice_profile_id").references(() => userVoiceProfiles.id).notNull(),
  emotion: varchar("emotion").notNull(), // happy, sad, angry, etc.
  elevenLabsVoiceId: text("elevenlabs_voice_id"), // unique voice ID from ElevenLabs - nullable until trained
  trainingStatus: varchar("training_status").notNull().default("pending"), // collecting, training, completed, failed
  sampleCount: integer("sample_count").default(0), // how many samples used for this emotion - nullable with default
  qualityScore: doublePrecision("quality_score"), // ElevenLabs quality rating - nullable until training complete
  voiceSettings: jsonb("voice_settings"), // stability, similarity_boost, etc. - nullable
  trainingMetadata: jsonb("training_metadata"), // ElevenLabs response data - nullable
  trainingCost: numeric("training_cost"), // track API cost spent - nullable
  lastUsedAt: timestamp("last_used_at"), // nullable
  usageCount: integer("usage_count").default(0), // nullable with default
  neverDelete: boolean("never_delete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Voice modulation templates - configurable database-driven voice samples
// Voice modulation templates removed - functionality integrated into ESM reference data

// User voice samples - story-level collection that accumulates across stories
// User voice modulations removed - functionality integrated into ESM user_esm_recordings table

// Generated audio cache removed - functionality integrated into ESM system

// Link cache to stories (many-to-many reuse)
export const storyAudioSegments = pgTable("story_audio_segments", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  segmentOrder: integer("segment_order").notNull(),
  // generatedAudioCacheId removed - using ESM architecture
  characterName: varchar("character_name"),
  isReused: boolean("is_reused").default(false), // was this reused from cache?
  createdAt: timestamp("created_at").defaultNow(),
});

// Story analysis cache to avoid re-processing
export const storyAnalysisCache = pgTable("story_analysis_cache", {
  id: serial("id").primaryKey(),
  storyContentHash: varchar("story_content_hash").notNull().unique(), // MD5 of story content
  analysisData: jsonb("analysis_data").notNull(), // full OpenAI analysis result
  charactersExtracted: jsonb("characters_extracted"), // extracted characters
  emotionsDetected: jsonb("emotions_detected"), // detected emotions
  apiCost: numeric("api_cost"), // track analysis cost
  generatedAt: timestamp("generated_at").defaultNow(),
  reuseCount: integer("reuse_count").default(1),
});

// Story narration tracking
export const storyNarrations = pgTable("story_narrations", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  userId: text("user_id").notNull(),
  narratorVoice: varchar("narrator_voice").notNull(),
  narratorVoiceType: varchar("narrator_voice_type").notNull(),
  narratorProfile: varchar("narrator_profile").default('neutral'), // User-friendly narrator profile name (grandma, kid, neutral, etc.)
  conversationStyle: varchar("conversation_style").references(() => conversationStyles.styleKey), // Relationship context for this narration
  relationshipId: integer("relationship_id").references(() => userRelationships.id), // Link to user relationship
  sharedWithIdentifier: text("shared_with_identifier"), // For non-registered recipients (email/phone)
  segments: jsonb("segments").notNull(), // array of {text, emotion, audioUrl, voiceUsed}
  totalDuration: integer("total_duration").notNull(), // milliseconds
  audioFileUrl: text("audio_file_url"), // final combined audio file
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_story_narrations_story_user").on(table.storyId, table.userId),
  index("idx_story_narrations_conversation_style").on(table.conversationStyle),
  index("idx_story_narrations_relationship").on(table.relationshipId),
]);

// Story modulation requirements - what modulations a story needs
export const storyModulationRequirements = pgTable("story_modulation_requirements", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  modulationType: varchar("modulation_type").notNull(), // 'emotion', 'sound', 'description'
  modulationKey: varchar("modulation_key").notNull(), // 'happy', 'cat_sound', 'fast_description'
  // templateId removed - using ESM architecture
  isRequired: boolean("is_required").default(true),
  contextUsage: text("context_usage"), // Where in story this modulation is used
  detectedBy: varchar("detected_by").default('ai'), // 'ai', 'user', 'manual'
  confidence: doublePrecision("confidence").default(1.0), // AI confidence in requirement (0-1)
  createdAt: timestamp("created_at").defaultNow(),
});

// Emotion templates with sample texts for voice recording
export const emotionTemplates = pgTable("emotion_templates", {
  id: serial("id").primaryKey(),
  emotion: varchar("emotion").notNull().unique(),
  displayName: varchar("display_name").notNull(),
  description: text("description").notNull(),
  sampleText: text("sample_text").notNull(),
  category: varchar("category").notNull().default("basic"), // basic, advanced, specialized
  targetDuration: integer("target_duration").default(10), // seconds
  difficulty: varchar("difficulty").default("easy"), // easy, medium, hard
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User voice cloning profiles (enhanced for ElevenLabs integration)
export const userVoiceProfiles = pgTable("user_voice_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  profileName: varchar("profile_name", { length: 255 }).notNull(), // e.g., "English_Adult_Native", "Spanish_Adult_NonNative"
  elevenLabsVoiceId: text("elevenlabs_voice_id"), // ElevenLabs voice ID, nullable
  
  // Language settings
  language: varchar("language").notNull().default("en"), // Language this profile is for (en, es, fr, etc.)
  
  // Voice parameters based on user characteristics
  pitch: varchar("pitch").notNull().default("0%"), // e.g., "+5%", "-3%"
  rate: varchar("rate").notNull().default("85%"), // Speaking rate percentage
  stability: real("stability").notNull().default(0.75), // 0-1
  similarityBoost: real("similarity_boost").notNull().default(0.85), // 0-1
  style: real("style").notNull().default(0.5), // 0-1
  volume: varchar("volume").notNull().default("medium"), // soft, medium, loud
  
  // User characteristics that influenced the profile
  userAge: integer("user_age"), // Age at time of profile creation
  nativeLanguage: varchar("native_language"), // User's native language
  isNativeSpeaker: boolean("is_native_speaker").notNull().default(false),
  
  // Training and status fields (existing)
  baseVoice: text("base_voice").notNull().default("alloy"), // Required base voice for training
  trainingStatus: varchar("training_status", { length: 50 }).notNull().default("pending"), // Fixed column name and default
  totalSamples: integer("total_samples").default(0), // Nullable with default
  trainingCost: numeric("training_cost"), // Nullable - set by system after training
  qualityScore: doublePrecision("quality_score"), // Nullable - set by system after training
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"), // Provider-specific metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  provider: varchar("provider").default("elevenlabs"),
  voiceName: text("voice_name").default("Custom Voice"),
  status: varchar("status").default("none"), // Keep for backward compatibility
  totalEmotionsRequired: integer("total_emotions_required").default(5),
  emotionsCompleted: integer("emotions_completed").default(0),
  overallQualityScore: doublePrecision("overall_quality_score").default(0.0),
  trainingStartedAt: timestamp("training_started_at"),
  trainingCompletedAt: timestamp("training_completed_at"),
  lastTrainingError: text("last_training_error"),
  isReadyForNarration: boolean("is_ready_for_narration").default(false),
  lastTrainingAt: timestamp("last_training_at"),
}, (table) => [
  index("idx_user_voice_profiles_user_language").on(table.userId, table.language),
  index("idx_user_voice_profiles_active").on(table.userId, table.isActive),
]);

// Voice generation cache for performance
export const voiceGenerationCache = pgTable("voice_generation_cache", {
  id: serial("id").primaryKey(),
  cacheKey: varchar("cache_key").notNull().unique(),
  userId: varchar("user_id").references(() => users.id),
  voiceId: varchar("voice_id"),
  emotion: varchar("emotion"),
  textHash: varchar("text_hash").notNull(),
  audioData: text("audio_data"),
  audioUrl: varchar("audio_url"),
  provider: varchar("provider").notNull(),
  duration: doublePrecision("duration"),
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

// ===== CONTENT SHARING AND RELATIONSHIP SYSTEM =====

// Conversation styles table - defines relationship-based conversation tones
export const conversationStyles = pgTable("conversation_styles", {
  id: serial("id").primaryKey(),
  styleKey: varchar("style_key", { length: 50 }).notNull().unique(), // 'respectful', 'business', 'jovial', etc.
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  voiceParameters: jsonb("voice_parameters").notNull(), // JSON structure with stability, similarity_boost, style, prosody
  relationshipContext: varchar("relationship_context", { length: 100 }), // 'parent_to_child', 'professional', 'casual', etc.
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_conversation_styles_key").on(table.styleKey),
  index("idx_conversation_styles_active").on(table.isActive),
]);

// Content items table - stores any shareable content
export const contentItems = pgTable("content_items", {
  id: serial("id").primaryKey(),
  type: varchar("type").notNull(), // 'story', 'article', 'video', 'custom'
  sourceUrl: text("source_url"), // For external content
  originalContent: text("original_content"), // Text/markdown content
  summary: text("summary"), // AI-generated base summary
  metadata: jsonb("metadata"), // title, author, date, etc.
  contentHash: varchar("content_hash"), // For caching
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_content_items_type").on(table.type),
  index("idx_content_items_hash").on(table.contentHash),
]);

// User relationships table - maps conversation styles between users
export const userRelationships = pgTable("user_relationships", {
  id: serial("id").primaryKey(),
  fromUserId: varchar("from_user_id").references(() => users.id).notNull(),
  toUserId: varchar("to_user_id").references(() => users.id), // Can be null for anonymous
  toIdentifier: text("to_identifier"), // Email/phone for non-users
  conversationStyle: varchar("conversation_style").notNull().references(() => conversationStyles.styleKey), // FK to conversation_styles table
  nickname: varchar("nickname"), // "Mom", "Boss", etc.
  relationshipContext: text("relationship_context"), // Optional notes
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_relationships_from").on(table.fromUserId),
  index("idx_user_relationships_to").on(table.toUserId),
  index("idx_user_relationships_style").on(table.conversationStyle),
]);

// Content shares table - tracks individual shares with personalization
export const contentShares = pgTable("content_shares", {
  id: serial("id").primaryKey(),
  contentItemId: integer("content_item_id").references(() => contentItems.id).notNull(),
  sharedByUserId: varchar("shared_by_user_id").references(() => users.id).notNull(),
  sharedWith: text("shared_with").notNull(), // Email/phone
  relationshipId: integer("relationship_id").references(() => userRelationships.id),
  shareToken: varchar("share_token").notNull().unique(), // Unique URL token
  
  // Personalization
  personalizedSummary: text("personalized_summary"), // Relationship-specific summary
  personalizedMessage: text("personalized_message"), // Optional custom message
  conversationStyle: varchar("conversation_style").references(() => conversationStyles.styleKey), // Override style for this share
  
  // Audio generation
  audioGenerated: boolean("audio_generated").default(false),
  audioUrl: text("audio_url"),
  voiceParameters: jsonb("voice_parameters"), // Stored voice settings
  audioGeneratedAt: timestamp("audio_generated_at"),
  audioCacheKey: varchar("audio_cache_key"), // For cache lookup
  
  // Tracking
  clickedAt: timestamp("clicked_at"), // When recipient first clicked
  playCount: integer("play_count").default(0),
  lastPlayedAt: timestamp("last_played_at"),
  expiresAt: timestamp("expires_at"), // Auto-cleanup
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_content_shares_token").on(table.shareToken),
  index("idx_content_shares_content").on(table.contentItemId),
  index("idx_content_shares_sender").on(table.sharedByUserId),
  index("idx_content_shares_cache").on(table.audioCacheKey),
]);

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
  contentHash: varchar("content_hash", { length: 64 }), // SHA256 hash of story content at analysis time
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

// Legacy voice-related type definitions (keeping for backward compatibility)
export type EmotionTemplate = typeof emotionTemplates.$inferSelect;
export type InsertEmotionTemplate = z.infer<typeof insertEmotionTemplateSchema>;

export type UserVoiceProfile = typeof userVoiceProfiles.$inferSelect;
export type InsertUserVoiceProfile = z.infer<typeof insertUserVoiceProfileSchema>;

export type VoiceGenerationCache = typeof voiceGenerationCache.$inferSelect;
export type InsertVoiceGenerationCache = z.infer<typeof insertVoiceGenerationCacheSchema>;

// Legacy voice schema definitions
export const insertEmotionTemplateSchema = createInsertSchema(emotionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserVoiceProfileSchema = createInsertSchema(userVoiceProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoiceGenerationCacheSchema = createInsertSchema(voiceGenerationCache).omit({
  id: true,
  createdAt: true,
});

// REFERENCE DATA ARCHITECTURE - NEW TABLES

// Reference Stories - Published story content becomes shared reference data
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

// Reference Story Analysis - AI narrative analysis becomes shared reference data
export const referenceStoryAnalyses = pgTable("reference_story_analyses", {
  id: serial("id").primaryKey(),
  referenceStoryId: integer("reference_story_id").references(() => referenceStories.id).notNull(),
  analysisType: varchar("analysis_type").notNull().default("narrative"),
  analysisData: jsonb("analysis_data").notNull(), // Characters, emotions, themes
  generatedBy: varchar("generated_by").notNull(), // AI model version
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reference Roleplay Analysis - AI roleplay analysis becomes shared reference data
export const referenceRoleplayAnalyses = pgTable("reference_roleplay_analyses", {
  id: serial("id").primaryKey(),
  referenceStoryId: integer("reference_story_id").references(() => referenceStories.id).notNull(),
  analysisData: jsonb("analysis_data").notNull(), // Scenes, dialogues, character roles
  totalScenes: integer("total_scenes").notNull(),
  estimatedDuration: integer("estimated_duration"), // seconds
  characterRoles: jsonb("character_roles").notNull(),
  sceneBreakdown: jsonb("scene_breakdown").notNull(),
  generatedBy: varchar("generated_by").notNull(), // AI model version
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

// User Roleplay Segments - User's personal roleplay segments (NOT tied to story tables)
export const userRoleplaySegments = pgTable("user_roleplay_segments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  referenceStoryId: integer("reference_story_id").references(() => referenceStories.id), // Optional - can be based on reference story
  referenceRoleplayId: integer("reference_roleplay_id").references(() => referenceRoleplayAnalyses.id), // Optional - can be based on reference roleplay
  title: varchar("title").notNull(),
  characterRole: varchar("character_role").notNull(), // User's chosen character
  sceneNumber: integer("scene_number").notNull(),
  dialogueText: text("dialogue_text").notNull(),
  emotionContext: varchar("emotion_context"), // Context for this dialogue
  voiceSettings: jsonb("voice_settings"), // User's voice preferences for this segment
  audioFileUrl: text("audio_file_url"), // User's recorded audio for this segment
  isComplete: boolean("is_complete").default(false),
  isPublic: boolean("is_public").default(false), // Can be shared with collaborators
  collaborationId: varchar("collaboration_id"), // Link to collaborative roleplay session
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reference Data Types
export type ReferenceStory = typeof referenceStories.$inferSelect;
export type InsertReferenceStory = typeof referenceStories.$inferInsert;
export type ReferenceStoryAnalysis = typeof referenceStoryAnalyses.$inferSelect;
export type InsertReferenceStoryAnalysis = typeof referenceStoryAnalyses.$inferInsert;
export type ReferenceRoleplayAnalysis = typeof referenceRoleplayAnalyses.$inferSelect;
export type InsertReferenceRoleplayAnalysis = typeof referenceRoleplayAnalyses.$inferInsert;
export type UserStoryNarration = typeof userStoryNarrations.$inferSelect;
export type InsertUserStoryNarration = typeof userStoryNarrations.$inferInsert;
export type UserRoleplaySegment = typeof userRoleplaySegments.$inferSelect;
export type InsertUserRoleplaySegment = typeof userRoleplaySegments.$inferInsert;

// =============================================================================
// MANUAL VOICE CLONING SCHEMAS
// =============================================================================

// Voice ID cleanup tracking for deleted voice IDs
export const voiceIdCleanup = pgTable('voice_id_cleanup', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  integrationPartner: varchar('integration_partner', { length: 50 }).notNull(), // e.g., "ElevenLabs"
  partnerVoiceId: varchar('partner_voice_id', { length: 255 }).notNull(), // The voice ID from partner
  deletedAt: timestamp('deleted_at').notNull().defaultNow(),
  deleteStatus: varchar('delete_status', { length: 50 }).notNull().default('pending'), // pending, confirmed, failed
  deleteAttempts: integer('delete_attempts').notNull().default(1),
  lastAttemptAt: timestamp('last_attempt_at'),
  errorMessage: text('error_message'),
  responseData: jsonb('response_data'), // Store API response details, confirmation IDs, etc.
});

// Cost tracking for ElevenLabs API usage
export const voiceCloningCosts = pgTable("voice_cloning_costs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  storyId: integer("story_id").references(() => stories.id),
  operation: varchar("operation").notNull(), // 'voice_clone', 'audio_generation'
  provider: varchar("provider").default("elevenlabs"),
  costCents: integer("cost_cents"), // Cost in cents - nullable
  apiCallsCount: integer("api_calls_count").default(1),
  samplesProcessed: integer("samples_processed").default(0),
  audioSecondsGenerated: integer("audio_seconds_generated").default(0),
  metadata: jsonb("metadata"), // Additional operation details
  createdAt: timestamp("created_at").defaultNow(),
});

// Manual cloning jobs for user-triggered operations
export const voiceCloningJobs = pgTable("voice_cloning_jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  category: varchar("category").notNull(), // 'emotions', 'sounds', 'modulations'
  status: varchar("status").default("pending"), // 'pending', 'processing', 'completed', 'failed'
  requiredSamples: integer("required_samples").notNull(),
  completedSamples: integer("completed_samples").notNull(),
  samplesList: jsonb("samples_list"), // List of emotion/sound names for this job
  elevenLabsVoiceId: text("elevenlabs_voice_id"),
  errorMessage: text("error_message"),
  estimatedCostCents: integer("estimated_cost_cents"),
  actualCostCents: integer("actual_cost_cents"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Voice cloning schemas
export const insertVoiceIdCleanupSchema = createInsertSchema(voiceIdCleanup).omit({
  id: true,
  deletedAt: true,
  deleteStatus: true,
  deleteAttempts: true,
});

export const insertVoiceCloningCostSchema = createInsertSchema(voiceCloningCosts).omit({
  id: true,
  createdAt: true,
});

export const insertVoiceCloningJobSchema = createInsertSchema(voiceCloningJobs).omit({
  id: true,
  createdAt: true,
});

export type VoiceIdCleanup = typeof voiceIdCleanup.$inferSelect;
export type InsertVoiceIdCleanup = z.infer<typeof insertVoiceIdCleanupSchema>;
export type VoiceCloningCost = typeof voiceCloningCosts.$inferSelect;
export type InsertVoiceCloningCost = z.infer<typeof insertVoiceCloningCostSchema>;
export type VoiceCloningJob = typeof voiceCloningJobs.$inferSelect;
export type InsertVoiceCloningJob = z.infer<typeof insertVoiceCloningJobSchema>;

// Reference Data Validation Schemas
export const insertReferenceStorySchema = createInsertSchema(referenceStories);
export const insertReferenceStoryAnalysisSchema = createInsertSchema(referenceStoryAnalyses);
export const insertReferenceRoleplayAnalysisSchema = createInsertSchema(referenceRoleplayAnalyses);
export const insertUserStoryNarrationSchema = createInsertSchema(userStoryNarrations);
export const insertUserRoleplaySegmentSchema = createInsertSchema(userRoleplaySegments);

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

// =============================================================================
// VOICE MODULATION SYSTEM SCHEMAS
// =============================================================================

// Voice Modulation Template schemas removed - functionality integrated into ESM system

// User Voice Modulation schemas removed - functionality integrated into ESM system

// Story Modulation Requirement schemas
export const insertStoryModulationRequirementSchema = createInsertSchema(storyModulationRequirements).omit({
  id: true,
  createdAt: true,
});

export type StoryModulationRequirement = typeof storyModulationRequirements.$inferSelect;
export type InsertStoryModulationRequirement = z.infer<typeof insertStoryModulationRequirementSchema>;

// =============================================================================
// COLLABORATIVE STORYTELLING SCHEMAS
// =============================================================================

// Story invitations table
export const storyInvitations = pgTable("story_invitations", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").references(() => stories.id).notNull(),
  inviterId: varchar("inviter_id").references(() => users.id).notNull(),
  inviteeEmail: varchar("invitee_email"),
  inviteePhone: varchar("invitee_phone"),
  invitationToken: varchar("invitation_token").unique().notNull(),
  status: varchar("status").default('pending').notNull(), // pending, accepted, completed
  message: text("message"), // Optional personalized message
  characterId: integer("character_id").references(() => storyCharacters.id), // Optional character assignment
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at").notNull(), // 120 hours from creation
}, (table) => [
  index("idx_story_invitations_story").on(table.storyId),
  index("idx_story_invitations_token").on(table.invitationToken),
]);

// Participant narrations table
export const participantNarrations = pgTable("participant_narrations", {
  id: serial("id").primaryKey(),
  invitationId: integer("invitation_id").references(() => storyInvitations.id).notNull(),
  participantName: varchar("participant_name").notNull(),
  participantId: varchar("participant_id").references(() => users.id), // NULL for guests
  narratorVoiceId: varchar("narrator_voice_id"), // ElevenLabs voice ID
  narrationData: jsonb("narration_data"), // Cached narration segments
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_participant_narrations_invitation").on(table.invitationId),
]);

// Standard voice samples reference table
export const standardVoiceSamples = pgTable("standard_voice_samples", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // emotion, sound, character
  sampleText: text("sample_text"),
  displayOrder: integer("display_order").default(0),
  isRequired: boolean("is_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Participant voice samples table (for guest users)
export const participantVoiceSamples = pgTable("participant_voice_samples", {
  id: serial("id").primaryKey(),
  invitationId: integer("invitation_id").references(() => storyInvitations.id).notNull(),
  standardSampleId: integer("standard_sample_id").references(() => standardVoiceSamples.id).notNull(),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration"), // in seconds
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_participant_voice_samples_invitation").on(table.invitationId),
]);

// Create insert schemas and types
export const insertStoryInvitationSchema = createInsertSchema(storyInvitations).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  completedAt: true,
});

export const insertParticipantNarrationSchema = createInsertSchema(participantNarrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStandardVoiceSampleSchema = createInsertSchema(standardVoiceSamples).omit({
  id: true,
  createdAt: true,
});

export const insertParticipantVoiceSampleSchema = createInsertSchema(participantVoiceSamples).omit({
  id: true,
  createdAt: true,
});

export type StoryInvitation = typeof storyInvitations.$inferSelect;
export type InsertStoryInvitation = z.infer<typeof insertStoryInvitationSchema>;

export type ParticipantNarration = typeof participantNarrations.$inferSelect;
export type InsertParticipantNarration = z.infer<typeof insertParticipantNarrationSchema>;

export type StandardVoiceSample = typeof standardVoiceSamples.$inferSelect;
export type InsertStandardVoiceSample = z.infer<typeof insertStandardVoiceSampleSchema>;

export type ParticipantVoiceSample = typeof participantVoiceSamples.$inferSelect;
export type InsertParticipantVoiceSample = z.infer<typeof insertParticipantVoiceSampleSchema>;

// Conversation styles schema and types
export const insertConversationStyleSchema = createInsertSchema(conversationStyles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ConversationStyle = typeof conversationStyles.$inferSelect;
export type InsertConversationStyle = z.infer<typeof insertConversationStyleSchema>;

// =============================================================================
// AUTHENTICATION & USER TRACKING SCHEMAS
// =============================================================================

// User login history tracking
export const userLoginHistory = pgTable("user_login_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  loginTimestamp: timestamp("login_timestamp").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  deviceInfo: jsonb("device_info"),
  locationInfo: jsonb("location_info"),
  loginMethod: varchar("login_method", { length: 50 }), // 'google', 'email', 'microsoft', 'facebook'
  sessionId: varchar("session_id", { length: 255 }),
  isSuccessful: boolean("is_successful").default(true),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_login_history_user").on(table.userId),
  index("idx_login_history_session").on(table.sessionId),
]);

// User emotion tracking throughout session
export const userEmotionTracking = pgTable("user_emotion_tracking", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 255 }),
  emotion: varchar("emotion", { length: 50 }).notNull().default("neutral"),
  emotionConfidence: doublePrecision("emotion_confidence"), // 0.0 to 1.0
  detectionMethod: varchar("detection_method", { length: 50 }), // 'manual', 'voice_analysis', 'text_sentiment'
  context: varchar("context", { length: 100 }), // 'story_reading', 'voice_recording', 'invitation_viewing'
  storyId: integer("story_id").references(() => stories.id),
  metadata: jsonb("metadata"),
  capturedAt: timestamp("captured_at").defaultNow(),
}, (table) => [
  index("idx_emotion_tracking_user_session").on(table.userId, table.sessionId),
  index("idx_emotion_tracking_story").on(table.storyId),
]);

// User security questions for password recovery
export const userSecurityQuestions = pgTable("user_security_questions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  questionId: integer("question_id"),
  answerHash: text("answer_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_security_questions_user").on(table.userId),
]);

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  token: varchar("token", { length: 255 }).unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_password_reset_token").on(table.token),
  index("idx_password_reset_user").on(table.userId),
]);

// Two-factor authentication settings
export const user2faSettings = pgTable("user_2fa_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).unique(),
  method: varchar("method", { length: 50 }), // 'sms', 'email', 'authenticator'
  isEnabled: boolean("is_enabled").default(false),
  phoneNumber: varchar("phone_number", { length: 20 }),
  authenticatorSecret: varchar("authenticator_secret", { length: 255 }),
  backupCodes: text("backup_codes").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for authentication tables
export const insertUserLoginHistorySchema = createInsertSchema(userLoginHistory).omit({
  id: true,
  loginTimestamp: true,
  createdAt: true,
});

export const insertUserEmotionTrackingSchema = createInsertSchema(userEmotionTracking).omit({
  id: true,
  capturedAt: true,
});

export const insertUserSecurityQuestionSchema = createInsertSchema(userSecurityQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertUser2faSettingsSchema = createInsertSchema(user2faSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for authentication tables
export type UserLoginHistory = typeof userLoginHistory.$inferSelect;
export type InsertUserLoginHistory = z.infer<typeof insertUserLoginHistorySchema>;

export type UserEmotionTracking = typeof userEmotionTracking.$inferSelect;
export type InsertUserEmotionTracking = z.infer<typeof insertUserEmotionTrackingSchema>;

export type UserSecurityQuestion = typeof userSecurityQuestions.$inferSelect;
export type InsertUserSecurityQuestion = z.infer<typeof insertUserSecurityQuestionSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type User2faSettings = typeof user2faSettings.$inferSelect;
export type InsertUser2faSettings = z.infer<typeof insertUser2faSettingsSchema>;

// Re-export notification tracking schemas
export * from './notification-tracking';
