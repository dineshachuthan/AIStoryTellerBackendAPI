import { users, localUsers, userProviders, stories, storyCharacters, storyEmotions, characters, conversations, messages, storyCollaborations, storyGroups, storyGroupMembers, characterVoiceAssignments, storyPlaybacks, storyAnalyses, storyNarrations, audioFiles, videoGenerations, voiceIdCleanup, type User, type InsertUser, type UpsertUser, type UserProvider, type InsertUserProvider, type LocalUser, type InsertLocalUser, type Story, type InsertStory, type StoryCharacter, type InsertStoryCharacter, type StoryEmotion, type InsertStoryEmotion, type Character, type InsertCharacter, type Conversation, type InsertConversation, type Message, type InsertMessage, type StoryCollaboration, type InsertStoryCollaboration, type StoryGroup, type InsertStoryGroup, type StoryGroupMember, type InsertStoryGroupMember, type CharacterVoiceAssignment, type InsertCharacterVoiceAssignment, type StoryPlayback, type InsertStoryPlayback, type StoryAnalysis, type InsertStoryAnalysis, type StoryNarration, type InsertStoryNarration, type AudioFile, type InsertAudioFile, type VoiceIdCleanup, type InsertVoiceIdCleanup } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like, lt, sql, isNotNull } from "drizzle-orm";
// Content hash functionality moved to unified cache architecture

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Authentication Providers
  getUserProvider(userId: string, provider: string): Promise<UserProvider | undefined>;
  getUserByProvider(provider: string, providerId: string): Promise<User | undefined>;
  createUserProvider(userProvider: InsertUserProvider): Promise<UserProvider>;
  
  // Local Authentication
  createLocalUser(localUser: InsertLocalUser): Promise<LocalUser>;
  getLocalUser(userId: string): Promise<LocalUser | undefined>;
  
  // User Voice Samples
  getUserVoiceSamples(userId: string): Promise<UserVoiceSample[]>;
  getAllUserVoiceSamples(userId: string): Promise<UserVoiceSample[]>;
  getUserUnlockedSamplesCount(userId: string): Promise<number>;
  getUserTotalSamplesCount(userId: string): Promise<number>;
  getUserVoiceSample(userId: string, label: string): Promise<UserVoiceSample | undefined>;
  createUserVoiceSample(sample: InsertUserVoiceSample): Promise<UserVoiceSample>;
  updateUserVoiceSample(id: number, sample: Partial<InsertUserVoiceSample>): Promise<void>;
  deleteUserVoiceSample(id: number): Promise<void>;
  getUserVoiceProgress(userId: string): Promise<{ completed: number; total: number; percentage: number }>;
  
  // User Voice Emotions (for voice samples service)
  getUserVoiceEmotions(userId: string, storyId?: number): Promise<any[]>;
  createUserVoiceEmotion(emotion: any): Promise<any>;
  deleteUserVoiceEmotion(userId: string, emotion: string): Promise<void>;
  
  // Emotion Templates
  getEmotionTemplate(emotion: string): Promise<any | null>;
  createEmotionTemplate(template: any): Promise<any>;
  
  // Voice Modulation Templates
  getVoiceModulationTemplates(): Promise<any[]>;
  
  // ESM Reference Data
  getEsmRef(category: number, name: string): Promise<any | null>;
  createEsmRef(esmRef: {
    category: number;
    name: string;
    display_name: string;
    sample_text: string;
    intensity?: number;
    description?: string;
    ai_variations?: any;
    created_by: string;
  }): Promise<any>;
  getAllEsmRefs(): Promise<any[]>;
  getEsmRefsByCategory(category: number): Promise<any[]>;
  updateEsmRef(esmRefId: number, updates: Partial<{ sample_text: string; display_name: string; description: string }>): Promise<void>;
  
  // User ESM Data
  getUserEsm(userId: string): Promise<any[]>;
  getUserEsmByRef(userId: string, esmRefId: number): Promise<any | null>;
  createUserEsm(userEsm: {
    user_id: string;
    esm_ref_id: number;
    created_by: string;
  }): Promise<any>;
  updateUserEsm(userEsmId: number, updates: any): Promise<void>;
  getUserEsmByUser(userId: string): Promise<any[]>;
  
  // User ESM Recordings
  createUserEsmRecording(recording: {
    user_esm_id: number;
    audio_url: string;
    duration: number;
    file_size: number;
    audio_quality_score?: number;
    transcribed_text?: string;
    created_by: string;
  }): Promise<any>;

  
  // ElevenLabs Voice Profiles
  getUserVoiceProfiles(userId: string): Promise<any[]>;
  getUserVoiceProfile(userId: string): Promise<any | undefined>;
  createUserVoiceProfile(profile: any): Promise<any>;
  updateUserVoiceProfile(id: number, profile: any): Promise<any>;
  deleteUserVoiceProfile(id: number): Promise<void>;

  // Audio Cache Methods
  getAudioCacheEntry(contentHash: string): Promise<any | null>;
  createAudioCacheEntry(entry: any): Promise<any>;
  updateAudioCacheUsage(id: number): Promise<void>;
  deleteAudioCacheEntry(id: number): Promise<void>;
  getAudioCacheStats(): Promise<any>;
  getExpiredAudioCacheEntries(maxAge: number): Promise<any[]>;
  getLeastRecentlyUsedAudioCache(limitMB: number): Promise<any[]>;
  clearAudioCache(): Promise<void>;
  
  // ElevenLabs Emotion Voices
  getUserEmotionVoices(userId: string): Promise<any[]>;
  getUserEmotionVoice(userId: string, emotion: string): Promise<any | undefined>;
  createUserEmotionVoice(emotionVoice: any): Promise<any>;
  updateUserEmotionVoice(id: number, emotionVoice: any): Promise<any>;
  deleteUserEmotionVoice(id: number): Promise<void>;
  
  // Voice Generation Cache
  getVoiceGenerationCache(contentHash: string): Promise<any | undefined>;
  createVoiceGenerationCache(cache: any): Promise<any>;
  updateVoiceGenerationCacheAccess(id: number): Promise<void>;
  cleanupExpiredVoiceCache(): Promise<number>;
  
  // Story Analysis Cache
  getStoryAnalysisCache(contentHash: string): Promise<any | undefined>;
  createStoryAnalysisCache(cache: any): Promise<any>;
  
  // Story User Confidence
  getStoryUserConfidence(storyId: number, userId: string): Promise<any | undefined>;
  createStoryUserConfidence(confidence: any): Promise<any>;
  incrementConfidenceMetric(storyId: number, userId: string, metric: string): Promise<void>;
  
  // ESM User Recordings
  getUserEsmRecordings(userId: string): Promise<any[]>;
  updateStoryAnalysisCacheReuse(id: number): Promise<void>;
  
  // Enhanced Story Narrations
  getStoryNarration(userId: string, storyId: number): Promise<any | undefined>;
  createStoryNarration(narration: any): Promise<any>;
  updateStoryNarration(id: number, narration: any): Promise<any>;
  deleteStoryNarration(id: number): Promise<void>;
  
  // Stories
  getPublicStories(filters?: {
    genre?: string;
    emotionalTags?: string[];
    moodCategory?: string;
    ageRating?: string;
    search?: string;
  }): Promise<Story[]>;
  getUserStories(userId: string, filters?: {
    genre?: string;
    emotionalTags?: string[];
    moodCategory?: string;
    ageRating?: string;
    search?: string;
  }): Promise<Story[]>;
  getStory(id: number): Promise<Story | undefined>;
  createStory(story: InsertStory): Promise<Story>;
  updateStory(id: number, story: Partial<InsertStory>): Promise<Story | undefined>;
  deleteStory(id: number): Promise<void>;
  archiveStory(id: number): Promise<Story | undefined>;
  getArchivedStories(userId: string): Promise<Story[]>;
  
  // Story Characters
  getStoryCharacters(storyId: number): Promise<StoryCharacter[]>;
  createStoryCharacter(character: InsertStoryCharacter): Promise<StoryCharacter>;
  updateStoryCharacter(id: number, character: Partial<InsertStoryCharacter>): Promise<void>;
  deleteStoryCharacter(id: number): Promise<void>;
  
  // Story Emotions
  getStoryEmotions(storyId: number): Promise<StoryEmotion[]>;
  createStoryEmotion(emotion: InsertStoryEmotion): Promise<StoryEmotion>;
  updateStoryEmotion(id: number, emotion: Partial<InsertStoryEmotion>): Promise<void>;
  deleteStoryEmotion(id: number): Promise<void>;
  
  // Characters
  getCharacters(): Promise<Character[]>;
  getCharacter(id: number): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter, userId?: string): Promise<Character>;
  updateCharacterStats(id: number, likes?: number, chats?: number): Promise<void>;
  
  // Conversations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  
  // Messages
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Story Collaborations
  getStoryCollaborations(storyId: number): Promise<StoryCollaboration[]>;
  getUserCollaborations(userId: string): Promise<StoryCollaboration[]>;
  createStoryCollaboration(collaboration: InsertStoryCollaboration): Promise<StoryCollaboration>;
  updateStoryCollaboration(id: number, collaboration: Partial<InsertStoryCollaboration>): Promise<void>;
  deleteStoryCollaboration(id: number): Promise<void>;
  
  // Story Groups
  getStoryGroups(storyId: number): Promise<StoryGroup[]>;
  getStoryGroup(id: number): Promise<StoryGroup | undefined>;
  createStoryGroup(group: InsertStoryGroup): Promise<StoryGroup>;
  updateStoryGroup(id: number, group: Partial<InsertStoryGroup>): Promise<void>;
  deleteStoryGroup(id: number): Promise<void>;
  getStoryGroupByInviteCode(inviteCode: string): Promise<StoryGroup | undefined>;
  
  // Story Group Members
  getStoryGroupMembers(groupId: number): Promise<StoryGroupMember[]>;
  createStoryGroupMember(member: InsertStoryGroupMember): Promise<StoryGroupMember>;
  updateStoryGroupMember(id: number, member: Partial<InsertStoryGroupMember>): Promise<void>;
  deleteStoryGroupMember(id: number): Promise<void>;
  
  // Character Voice Assignments
  getCharacterVoiceAssignments(storyId: number): Promise<CharacterVoiceAssignment[]>;
  getUserCharacterVoiceAssignment(storyId: number, userId: string): Promise<CharacterVoiceAssignment | undefined>;
  createCharacterVoiceAssignment(assignment: InsertCharacterVoiceAssignment): Promise<CharacterVoiceAssignment>;
  updateCharacterVoiceAssignment(id: number, assignment: Partial<InsertCharacterVoiceAssignment>): Promise<void>;
  deleteCharacterVoiceAssignment(id: number): Promise<void>;
  
  // Story Playbacks
  getStoryPlaybacks(storyId: number): Promise<StoryPlayback[]>;
  getStoryPlayback(id: number): Promise<StoryPlayback | undefined>;
  createStoryPlayback(playback: InsertStoryPlayback): Promise<StoryPlayback>;
  updateStoryPlayback(id: number, playback: Partial<InsertStoryPlayback>): Promise<void>;
  deleteStoryPlayback(id: number): Promise<void>;
  
  // Story Analyses
  getStoryAnalysis(storyId: number, analysisType: 'narrative' | 'roleplay'): Promise<StoryAnalysis | undefined>;
  createStoryAnalysis(analysis: InsertStoryAnalysis): Promise<StoryAnalysis>;
  updateStoryAnalysis(storyId: number, analysisType: 'narrative' | 'roleplay', analysisData: any, userId: string): Promise<StoryAnalysis>;
  
  // Content Hash-Based Cache Invalidation
  getStoryAnalysisWithContentCheck(storyId: number, analysisType: 'narrative' | 'roleplay', currentContent: string): Promise<{ analysis: StoryAnalysis | undefined, needsRegeneration: boolean }>;
  createStoryAnalysisWithContentHash(analysis: InsertStoryAnalysis, contentHash: string): Promise<StoryAnalysis>;

  // Story Customizations
  createOrUpdateStoryCustomization(customization: {
    originalStoryId: number;
    customizedByUserId: string;
    customTitle: string;
    customCharacterImages: any;
    customVoiceAssignments: any;
    customEmotionMappings: any;
    isPrivate: boolean;
  }): Promise<void>;
  getStoryCustomization(storyId: number, userId: string): Promise<any>;

  // Video Generation
  saveVideoGeneration(storyId: number, userId: string, videoData: any): Promise<void>;
  getVideoByStoryId(storyId: number): Promise<any>;
  deleteVideoGeneration(storyId: number): Promise<void>;
  updateVideoGeneration(storyId: number, updates: any): Promise<void>;
  updateVideo(id: number, updates: any): Promise<any>;
  getStuckVideoGenerations(threshold: Date): Promise<any[]>;

  // Story Narrations
  getSavedNarration(storyId: number, userId: string): Promise<StoryNarration | undefined>;
  saveNarration(narrationData: InsertStoryNarration): Promise<StoryNarration>;
  updateNarration(id: number, updates: Partial<InsertStoryNarration>): Promise<void>;
  deleteNarration(id: number): Promise<void>;

  // Audio Files - Database-based storage
  saveAudioFile(audioData: InsertAudioFile): Promise<AudioFile>;
  getAudioFile(id: number): Promise<AudioFile | undefined>;
  deleteAudioFile(id: number): Promise<void>;

  // Voice Cloning Integration - ElevenLabs
  getUserVoiceProfile(userId: string): Promise<any | undefined>;
  createUserVoiceProfile(userId: string, profileData: any): Promise<any>;
  updateUserVoiceProfile(userId: string, updates: any): Promise<void>;
  
  // Audio Cache System
  getAudioCacheEntry(contentHash: string): Promise<any | undefined>;
  createAudioCacheEntry(cacheData: any): Promise<any>;
  updateAudioCacheUsage(id: number): Promise<void>;
  deleteAudioCacheEntry(id: number): Promise<void>;
  getAudioCacheStats(): Promise<any>;
  getExpiredAudioCacheEntries(maxAge: number): Promise<any[]>;
  
  // Story Narrations Enhanced
  createStoryNarrationRecord(narrationData: any): Promise<any>;

  // REFERENCE DATA ARCHITECTURE METHODS
  
  // Reference Stories (shared across all users)
  getAllReferenceStories(): Promise<any[]>;
  getReferenceStory(id: number): Promise<any | undefined>;
  createReferenceStory(data: any): Promise<any>;
  updateReferenceStory(id: number, data: any): Promise<any>;
  deleteReferenceStory(id: number): Promise<void>;
  browseReferenceStories(filters?: any): Promise<any[]>;
  
  // Reference Story Analysis (shared AI analysis)
  getReferenceStoryAnalysis(referenceStoryId: number): Promise<any | undefined>;
  createReferenceStoryAnalysis(data: any): Promise<any>;
  updateReferenceStoryAnalysis(id: number, data: any): Promise<any>;
  
  // Reference Roleplay Analysis (shared roleplay structure)
  getReferenceRoleplayAnalysis(referenceStoryId: number): Promise<any | undefined>;
  createReferenceRoleplayAnalysis(data: any): Promise<any>;
  updateReferenceRoleplayAnalysis(id: number, data: any): Promise<any>;
  
  // User Story Narrations (user's personalized narrations)
  getUserStoryNarrations(userId: string): Promise<any[]>;
  getUserStoryNarration(userId: string, referenceStoryId: number): Promise<any | undefined>;
  createUserStoryNarration(data: any): Promise<any>;
  updateUserStoryNarration(id: number, data: any): Promise<any>;
  deleteUserStoryNarration(id: number): Promise<void>;
  
  // User Roleplay Segments (user's personal roleplay segments)
  getUserRoleplaySegments(userId: string): Promise<any[]>;
  getUserRoleplaySegment(userId: string, id: number): Promise<any | undefined>;
  createUserRoleplaySegment(data: any): Promise<any>;
  updateUserRoleplaySegment(id: number, data: any): Promise<any>;
  deleteUserRoleplaySegment(id: number): Promise<void>;
  
  // Reference Data Migration
  migrateStoryToReference(storyId: number): Promise<any>;
  migrateAllStoriesToReference(): Promise<any>;
  
  // Cache Management Methods
  getCacheEntry(key: string): Promise<any | null>;
  createCacheEntry(entry: any): Promise<any>;
  updateCacheEntry(key: string, entry: any): Promise<any>;
  updateCacheUsage(key: string): Promise<void>;
  deleteCacheEntry(key: string): Promise<boolean>;
  getCacheEntriesByPattern(pattern: string): Promise<any[]>;
  getCacheEntriesByTags(tags: string[]): Promise<any[]>;
  getCacheStats(): Promise<any>;
  getAllCacheEntries(): Promise<any[]>;
  clearAllCacheEntries(): Promise<void>;
  getExpiredCacheEntries(): Promise<any[]>;
  getOldestCacheEntries(limit: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUserLanguage(userId: string): Promise<{ language: string; locale?: string; nativeLanguage?: string } | undefined> {
    const [user] = await db.select({
      language: users.language,
      locale: users.locale,
      nativeLanguage: users.nativeLanguage
    }).from(users).where(eq(users.id, userId));
    return user || undefined;
  }

  async updateUserLanguage(userId: string, language: string, locale?: string, nativeLanguage?: string): Promise<void> {
    await db.update(users)
      .set({ 
        language, 
        locale,
        nativeLanguage,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  // Story Analysis operations
  async getStoryAnalysis(storyId: number, analysisType: 'narrative' | 'roleplay'): Promise<StoryAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(storyAnalyses)
      .where(and(eq(storyAnalyses.storyId, storyId), eq(storyAnalyses.analysisType, analysisType)))
      .orderBy(desc(storyAnalyses.createdAt))
      .limit(1);
    return analysis || undefined;
  }

  async createStoryAnalysis(analysisData: InsertStoryAnalysis): Promise<StoryAnalysis> {
    const [analysis] = await db
      .insert(storyAnalyses)
      .values(analysisData)
      .returning();
    return analysis;
  }

  async updateStoryAnalysis(storyId: number, analysisType: 'narrative' | 'roleplay', analysisData: any, userId: string): Promise<StoryAnalysis> {
    const existing = await this.getStoryAnalysis(storyId, analysisType);
    
    if (existing) {
      const [updated] = await db
        .update(storyAnalyses)
        .set({ 
          analysisData,
          updatedAt: new Date()
        })
        .where(eq(storyAnalyses.id, existing.id))
        .returning();
      return updated;
    } else {
      return await this.createStoryAnalysis({
        storyId,
        analysisType,
        analysisData,
        generatedBy: userId
      });
    }
  }

  // Content Hash-Based Cache Invalidation Methods
  async getStoryAnalysisWithContentCheck(storyId: number, analysisType: 'narrative' | 'roleplay', currentContent: string): Promise<{ analysis: StoryAnalysis | undefined, needsRegeneration: boolean }> {
    const [analysis] = await db
      .select()
      .from(storyAnalyses)
      .where(and(eq(storyAnalyses.storyId, storyId), eq(storyAnalyses.analysisType, analysisType)))
      .orderBy(desc(storyAnalyses.createdAt))
      .limit(1);

    if (!analysis) {
      return { analysis: undefined, needsRegeneration: true };
    }

    // Check if content has changed using hash comparison
    const crypto = await import('crypto');
    const currentContentHash = crypto.createHash('sha256').update(currentContent).digest('hex');
    const needsRegeneration = !analysis.contentHash || analysis.contentHash !== currentContentHash;
    
    return { 
      analysis: analysis || undefined, 
      needsRegeneration 
    };
  }

  async createStoryAnalysisWithContentHash(analysisData: InsertStoryAnalysis, contentHash: string): Promise<StoryAnalysis> {
    try {
      // Try to insert new analysis
      const [analysis] = await db
        .insert(storyAnalyses)
        .values({
          ...analysisData,
          contentHash
        })
        .returning();
      return analysis;
    } catch (error: any) {
      // If duplicate key error, update existing analysis instead
      if (error.code === '23505') {
        console.log(`[Content Hash Cache] Updating existing analysis for story ${analysisData.storyId} with new content hash`);
        const [updatedAnalysis] = await db
          .update(storyAnalyses)
          .set({
            analysisData: analysisData.analysisData,
            contentHash,
            updatedAt: new Date(),
            generatedBy: analysisData.generatedBy
          })
          .where(and(
            eq(storyAnalyses.storyId, analysisData.storyId),
            eq(storyAnalyses.analysisType, analysisData.analysisType)
          ))
          .returning();
        return updatedAnalysis;
      }
      throw error;
    }
  }

  // Minimal implementation of required methods for compilation
  async getUserProvider(userId: string, provider: string): Promise<UserProvider | undefined> {
    const [userProvider] = await db.select().from(userProviders).where(and(eq(userProviders.userId, userId), eq(userProviders.provider, provider)));
    return userProvider || undefined;
  }

  async getUserByProvider(provider: string, providerId: string): Promise<User | undefined> {
    const results = await db
      .select({ user: users })
      .from(userProviders)
      .innerJoin(users, eq(userProviders.userId, users.id))
      .where(and(eq(userProviders.provider, provider), eq(userProviders.providerId, providerId)));
    return results[0]?.user;
  }

  async createUserProvider(userProvider: InsertUserProvider): Promise<UserProvider> {
    const [provider] = await db.insert(userProviders).values(userProvider).returning();
    return provider;
  }

  async createLocalUser(localUser: InsertLocalUser): Promise<LocalUser> {
    const [user] = await db.insert(localUsers).values(localUser).returning();
    return user;
  }

  async getLocalUser(userId: string): Promise<LocalUser | undefined> {
    const [user] = await db.select().from(localUsers).where(eq(localUsers.userId, userId));
    return user || undefined;
  }

  async getUserVoiceSamples(userId: string): Promise<UserVoiceSample[]> {
    // Use ESM architecture - get user's recordings with ESM reference data
    const result = await db.execute(
      sql`SELECT 
            user_recordings.user_esm_recordings_id as id,
            user_recordings.audio_url as "audioUrl",
            user_recordings.duration,
            user_recordings.file_size as "fileSize",
            user_recordings.created_date as "recordingTimestamp",
            user_recordings.audio_quality_score as "audioQualityScore",
            user_recordings.transcribed_text as "transcribedText",
            ue.sample_count as "sampleCount",
            ue.quality_tier as "qualityTier",
            ue.is_locked as "isLocked",
            er.category,
            er.name,
            er.display_name as "displayName",
            er.sample_text as "sampleText",
            er.intensity,
            (CASE WHEN user_recordings.user_esm_recordings_id IS NOT NULL THEN true ELSE false END) as "isCompleted"
          FROM esm_ref er
          LEFT JOIN user_esm ue ON er.esm_ref_id = ue.esm_ref_id AND ue.user_id = ${userId}
          LEFT JOIN user_esm_recordings user_recordings ON ue.user_esm_id = user_recordings.user_esm_id
          ORDER BY er.category, er.name`
    );
    
    return result.rows.map((row: any) => ({
      id: row.id || 0,
      userId: userId,
      sampleType: row.category === 1 ? 'emotions' : row.category === 2 ? 'sounds' : 'modulations',
      label: `${row.category === 1 ? 'emotions' : row.category === 2 ? 'sounds' : 'modulations'}-${row.name}`,
      audioUrl: row.audioUrl || '',
      duration: row.duration || 0,
      isCompleted: row.isCompleted || false,
      isLocked: row.isLocked || false,
      lockedAt: row.lockedAt || null,
      recordedAt: row.recordingTimestamp || null
    }));
  }

  async getAllUserVoiceSamples(userId: string): Promise<UserVoiceSample[]> {
    // Use ESM architecture - get user's recordings with ESM reference data
    const result = await db.execute(
      sql`SELECT 
            user_recordings.user_esm_recordings_id as id,
            user_recordings.audio_url as "audioUrl",
            user_recordings.duration,
            user_recordings.file_size as "fileSize",
            user_recordings.is_locked as "isLocked",
            user_recordings.locked_at as "lockedAt",
            user_recordings.created_date as "recordedAt",
            user_recordings.audio_quality_score as "audioQualityScore",
            user_recordings.transcribed_text as "transcribedText",
            ue.sample_count as "sampleCount",
            ue.quality_tier as "qualityTier",
            er.category,
            er.name,
            er.display_name as "displayName",
            er.sample_text as "sampleText",
            er.intensity,
            CONCAT(CASE 
              WHEN er.category = 1 THEN 'emotions'
              WHEN er.category = 2 THEN 'sounds' 
              ELSE 'modulations'
            END, '-', er.name) as label,
            true as "isCompleted"
          FROM user_esm_recordings user_recordings
          JOIN user_esm ue ON user_recordings.user_esm_id = ue.user_esm_id
          JOIN esm_ref er ON ue.esm_ref_id = er.esm_ref_id
          WHERE ue.user_id = ${userId}
          ORDER BY er.category, er.name, user_recordings.created_date DESC`
    );
    
    return result.rows.map((row: any) => ({
      id: row.id,
      userId: userId,
      sampleType: row.category === 1 ? 'emotions' : row.category === 2 ? 'sounds' : 'modulations',
      label: row.label,
      audioUrl: row.audioUrl || '',
      duration: row.duration || 0,
      isCompleted: row.isCompleted || false,
      isLocked: row.isLocked || false,
      lockedAt: row.lockedAt || null,
      recordedAt: row.recordedAt
    }));
  }

  async getUserUnlockedSamplesCount(userId: string): Promise<number> {
    // Use ESM architecture - count unlocked recordings
    const result = await db.execute(
      sql`SELECT COUNT(*) as count
          FROM user_esm_recordings uer
          JOIN user_esm ue ON uer.user_esm_id = ue.user_esm_id
          WHERE ue.user_id = ${userId} 
          AND (uer.is_locked = false OR uer.is_locked IS NULL)`
    );
    return Number(result.rows[0]?.count) || 0;
  }

  async getUserTotalSamplesCount(userId: string): Promise<number> {
    // Use ESM system for count
    const result = await db.execute(
      sql`SELECT COUNT(*) as count 
          FROM user_esm_recordings uer
          JOIN user_esm ue ON uer.user_esm_id = ue.user_esm_id
          WHERE ue.user_id = ${userId}`
    );
    return Number(result.rows[0]?.count) || 0;
  }

  async getUserVoiceSample(userId: string, label: string): Promise<any | undefined> {
    // Use ESM system
    const samples = await this.getAllUserVoiceSamples(userId);
    return samples.find(sample => sample.label === label);
  }

  async createUserVoiceSample(sample: any): Promise<any> {
    // Use ESM system
    return await this.createUserVoiceEmotion(sample);
  }

  async updateUserVoiceSample(id: number, sample: Partial<InsertUserVoiceSample>): Promise<void> {
    // Update ESM recording with lock status
    const updates: any = {};
    if (sample.isLocked !== undefined) {
      updates.is_locked = sample.isLocked;
    }
    if (sample.lockedAt !== undefined) {
      updates.locked_at = sample.lockedAt;
    }
    
    if (Object.keys(updates).length > 0) {
      await db.execute(
        sql`UPDATE user_esm_recordings 
            SET ${sql.raw(Object.keys(updates).map(key => `${key} = ${updates[key] === null ? 'NULL' : `'${updates[key]}'`}`).join(', '))}
            WHERE user_esm_recordings_id = ${id}`
      );
    }
  }

  async deleteUserVoiceSample(id: number): Promise<void> {
    // Use ESM system
    await db.execute(
      sql`DELETE FROM user_esm_recordings WHERE user_esm_recordings_id = ${id}`
    );
  }

  async getUserVoiceProgress(userId: string): Promise<{ completed: number; total: number; percentage: number }> {
    const samples = await this.getUserVoiceSamples(userId);
    const completed = samples.filter(s => s.isCompleted).length;
    const total = samples.length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }

  async getPublicStories(): Promise<Story[]> {
    return await db.select().from(stories).where(eq(stories.isPublished, true));
  }

  async getUserStories(userId: string): Promise<Story[]> {
    const allStories = await db.select().from(stories).where(eq(stories.authorId, userId)).orderBy(desc(stories.createdAt));
    // Filter out archived stories (identified by [ARCHIVED] prefix for now)
    return allStories.filter(story => !story.title.startsWith("[ARCHIVED]"));
  }

  async getStory(id: number): Promise<Story | undefined> {
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    return story || undefined;
  }

  async createStory(story: InsertStory): Promise<Story> {
    const [created] = await db.insert(stories).values(story).returning();
    return created;
  }

  async updateStory(id: number, story: Partial<InsertStory>): Promise<Story | undefined> {
    const [updated] = await db.update(stories).set({ ...story, updatedAt: new Date() }).where(eq(stories.id, id)).returning();
    return updated;
  }

  async deleteStory(id: number): Promise<void> {
    await db.delete(stories).where(eq(stories.id, id));
  }

  async archiveStory(id: number): Promise<Story | undefined> {
    // Use the title field to mark as archived with prefix
    const story = await this.getStory(id);
    if (!story) return undefined;

    const [archivedStory] = await db
      .update(stories)
      .set({ 
        title: "[ARCHIVED] " + story.title,
        updatedAt: new Date()
      })
      .where(eq(stories.id, id))
      .returning();

    return archivedStory || undefined;
  }

  async getArchivedStories(userId: string): Promise<Story[]> {
    const allStories = await db
      .select()
      .from(stories)
      .where(eq(stories.authorId, userId))
      .orderBy(desc(stories.updatedAt));
    
    // Filter archived stories by title prefix for now
    return allStories.filter(story => story.title.startsWith("[ARCHIVED]"));
  }

  async getStoryCharacters(storyId: number): Promise<StoryCharacter[]> {
    return await db.select().from(storyCharacters).where(eq(storyCharacters.storyId, storyId));
  }

  async createStoryCharacter(character: InsertStoryCharacter): Promise<StoryCharacter> {
    const [created] = await db.insert(storyCharacters).values(character).returning();
    return created;
  }

  async updateStoryCharacter(id: number, character: Partial<InsertStoryCharacter>): Promise<void> {
    await db.update(storyCharacters).set(character).where(eq(storyCharacters.id, id));
  }

  async deleteStoryCharacter(id: number): Promise<void> {
    await db.delete(storyCharacters).where(eq(storyCharacters.id, id));
  }

  async getStoryEmotions(storyId: number): Promise<StoryEmotion[]> {
    return await db.select().from(storyEmotions).where(eq(storyEmotions.storyId, storyId));
  }

  async createStoryEmotion(emotion: InsertStoryEmotion): Promise<StoryEmotion> {
    const [created] = await db.insert(storyEmotions).values(emotion).returning();
    return created;
  }

  async updateStoryEmotion(id: number, emotion: Partial<InsertStoryEmotion>): Promise<void> {
    await db.update(storyEmotions).set(emotion).where(eq(storyEmotions.id, id));
  }

  async deleteStoryEmotion(id: number): Promise<void> {
    await db.delete(storyEmotions).where(eq(storyEmotions.id, id));
  }

  async getCharacters(): Promise<Character[]> {
    return await db.select().from(characters);
  }

  async getCharacter(id: number): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    return character || undefined;
  }

  async createCharacter(character: InsertCharacter): Promise<Character> {
    const [created] = await db.insert(characters).values(character).returning();
    return created;
  }

  async updateCharacterStats(id: number, likes?: number, chats?: number): Promise<void> {
    const updates: any = {};
    if (likes !== undefined) updates.likes = likes;
    if (chats !== undefined) updates.chats = chats;
    if (Object.keys(updates).length > 0) {
      await db.update(characters).set(updates).where(eq(characters.id, id));
    }
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.userId, userId));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conversation).returning();
    return created;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.conversationId, conversationId));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async getStoryCollaborations(storyId: number): Promise<StoryCollaboration[]> {
    return await db.select().from(storyCollaborations).where(eq(storyCollaborations.storyId, storyId));
  }

  async getUserCollaborations(userId: string): Promise<StoryCollaboration[]> {
    return await db.select().from(storyCollaborations).where(eq(storyCollaborations.invitedUserId, userId));
  }

  async createStoryCollaboration(collaboration: InsertStoryCollaboration): Promise<StoryCollaboration> {
    const [created] = await db.insert(storyCollaborations).values(collaboration).returning();
    return created;
  }

  async updateStoryCollaboration(id: number, collaboration: Partial<InsertStoryCollaboration>): Promise<void> {
    await db.update(storyCollaborations).set(collaboration).where(eq(storyCollaborations.id, id));
  }

  async deleteStoryCollaboration(id: number): Promise<void> {
    await db.delete(storyCollaborations).where(eq(storyCollaborations.id, id));
  }

  async getStoryGroups(storyId: number): Promise<StoryGroup[]> {
    return await db.select().from(storyGroups).where(eq(storyGroups.storyId, storyId));
  }

  async getStoryGroup(id: number): Promise<StoryGroup | undefined> {
    const [group] = await db.select().from(storyGroups).where(eq(storyGroups.id, id));
    return group || undefined;
  }

  async createStoryGroup(group: InsertStoryGroup): Promise<StoryGroup> {
    const [created] = await db.insert(storyGroups).values(group).returning();
    return created;
  }

  async updateStoryGroup(id: number, group: Partial<InsertStoryGroup>): Promise<void> {
    await db.update(storyGroups).set(group).where(eq(storyGroups.id, id));
  }

  async deleteStoryGroup(id: number): Promise<void> {
    await db.delete(storyGroups).where(eq(storyGroups.id, id));
  }

  async getStoryGroupByInviteCode(inviteCode: string): Promise<StoryGroup | undefined> {
    const [group] = await db.select().from(storyGroups).where(eq(storyGroups.inviteCode, inviteCode));
    return group || undefined;
  }

  async getStoryGroupMembers(groupId: number): Promise<StoryGroupMember[]> {
    return await db.select().from(storyGroupMembers).where(eq(storyGroupMembers.groupId, groupId));
  }

  async createStoryGroupMember(member: InsertStoryGroupMember): Promise<StoryGroupMember> {
    const [created] = await db.insert(storyGroupMembers).values(member).returning();
    return created;
  }

  async updateStoryGroupMember(id: number, member: Partial<InsertStoryGroupMember>): Promise<void> {
    await db.update(storyGroupMembers).set(member).where(eq(storyGroupMembers.id, id));
  }

  async deleteStoryGroupMember(id: number): Promise<void> {
    await db.delete(storyGroupMembers).where(eq(storyGroupMembers.id, id));
  }

  async getCharacterVoiceAssignments(storyId: number): Promise<CharacterVoiceAssignment[]> {
    return await db.select().from(characterVoiceAssignments).where(eq(characterVoiceAssignments.storyId, storyId));
  }

  async getUserCharacterVoiceAssignment(storyId: number, userId: string): Promise<CharacterVoiceAssignment | undefined> {
    const [assignment] = await db.select().from(characterVoiceAssignments).where(and(eq(characterVoiceAssignments.storyId, storyId), eq(characterVoiceAssignments.userId, userId)));
    return assignment || undefined;
  }

  async createCharacterVoiceAssignment(assignment: InsertCharacterVoiceAssignment): Promise<CharacterVoiceAssignment> {
    const [created] = await db.insert(characterVoiceAssignments).values(assignment).returning();
    return created;
  }

  async updateCharacterVoiceAssignment(id: number, assignment: Partial<InsertCharacterVoiceAssignment>): Promise<void> {
    await db.update(characterVoiceAssignments).set(assignment).where(eq(characterVoiceAssignments.id, id));
  }

  async deleteCharacterVoiceAssignment(id: number): Promise<void> {
    await db.delete(characterVoiceAssignments).where(eq(characterVoiceAssignments.id, id));
  }

  async getStoryPlaybacks(storyId: number): Promise<StoryPlayback[]> {
    return await db.select().from(storyPlaybacks).where(eq(storyPlaybacks.storyId, storyId));
  }

  async getStoryPlayback(id: number): Promise<StoryPlayback | undefined> {
    const [playback] = await db.select().from(storyPlaybacks).where(eq(storyPlaybacks.id, id));
    return playback || undefined;
  }

  async createStoryPlayback(playback: InsertStoryPlayback): Promise<StoryPlayback> {
    const [created] = await db.insert(storyPlaybacks).values(playback).returning();
    return created;
  }

  async updateStoryPlayback(id: number, playback: Partial<InsertStoryPlayback>): Promise<void> {
    await db.update(storyPlaybacks).set(playback).where(eq(storyPlaybacks.id, id));
  }

  async deleteStoryPlayback(id: number): Promise<void> {
    await db.delete(storyPlaybacks).where(eq(storyPlaybacks.id, id));
  }

  // Story Analysis operations (duplicates removed)

  // Story Customization operations
  async createOrUpdateStoryCustomization(customization: {
    originalStoryId: number;
    customizedByUserId: string;
    customTitle: string;
    customCharacterImages: any;
    customVoiceAssignments: any;
    customEmotionMappings: any;
    isPrivate: boolean;
  }): Promise<void> {
    // For now, store in a simple JSON format in story metadata
    // In a full implementation, this would use a dedicated storyCustomizations table
    const story = await this.getStory(customization.originalStoryId);
    if (story) {
      await this.updateStory(customization.originalStoryId, {
        metadata: {
          ...story.metadata,
          customizations: {
            [customization.customizedByUserId]: {
              customTitle: customization.customTitle,
              customCharacterImages: customization.customCharacterImages,
              customVoiceAssignments: customization.customVoiceAssignments,
              customEmotionMappings: customization.customEmotionMappings,
              isPrivate: customization.isPrivate,
              updatedAt: new Date()
            }
          }
        }
      });
    }
  }

  async getStoryCustomization(storyId: number, userId: string): Promise<any> {
    const story = await this.getStory(storyId);
    if (story?.metadata?.customizations?.[userId]) {
      return story.metadata.customizations[userId];
    }
    return null;
  }

  // Video Generation Methods
  async saveVideoGeneration(storyId: number, userId: string, videoData: any): Promise<void> {
    const { videoGenerations } = await import("@shared/schema");
    
    try {
      await db.insert(videoGenerations).values({
        storyId,
        requestedBy: userId,
        videoUrl: videoData.videoUrl,
        thumbnailUrl: videoData.thumbnailUrl,
        duration: videoData.duration,
        status: videoData.status,
        provider: videoData.provider,
        taskId: videoData.taskId,
        generationParams: {
          quality: 'std',
          duration: videoData.duration,
          provider: videoData.provider
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error: any) {
      // If insert fails, try update
      await db.update(videoGenerations)
        .set({
          videoUrl: videoData.videoUrl,
          thumbnailUrl: videoData.thumbnailUrl,
          duration: videoData.duration,
          status: videoData.status,
          provider: videoData.provider,
          taskId: videoData.taskId,
          updatedAt: new Date()
        })
        .where(and(
          eq(videoGenerations.storyId, storyId),
          eq(videoGenerations.requestedBy, userId)
        ));
    }
  }

  async getVideoByStoryId(storyId: number): Promise<any> {
    const { videoGenerations } = await import("@shared/schema");
    
    const [video] = await db
      .select()
      .from(videoGenerations)
      .where(eq(videoGenerations.storyId, storyId))
      .orderBy(desc(videoGenerations.createdAt))
      .limit(1);

    if (!video) return null;

    return {
      id: video.id,
      storyId: video.storyId,
      taskId: video.taskId,
      provider: video.provider || 'kling',
      status: video.status || 'pending',
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration || 5,
      userApproved: video.userApproved || false,
      approvedAt: video.approvedAt,
      regenerationCount: video.regenerationCount || 0,
      lastPolledAt: video.lastPolledAt,
      estimatedCompletionAt: video.estimatedCompletionAt,
      errorMessage: video.errorMessage,
      generationParams: video.generationParams,
      characterAssetsSnapshot: video.characterAssetsSnapshot,
      createdAt: video.createdAt || new Date(),
      updatedAt: video.updatedAt
    };
  }

  async deleteVideoGeneration(storyId: number): Promise<void> {
    const { videoGenerations } = await import("@shared/schema");
    
    await db.delete(videoGenerations)
      .where(eq(videoGenerations.storyId, storyId));
  }

  async updateVideoGeneration(storyId: number, updates: any): Promise<void> {
    const { videoGenerations } = await import("@shared/schema");
    
    await db.update(videoGenerations)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(videoGenerations.storyId, storyId));
  }

  async updateVideo(id: number, updates: any): Promise<any> {
    const { videoGenerations } = await import("@shared/schema");
    
    const [updatedVideo] = await db.update(videoGenerations)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(videoGenerations.id, id))
      .returning();
    
    return updatedVideo;
  }

  async getStuckVideoGenerations(threshold: Date): Promise<any[]> {
    const { videoGenerations } = await import("@shared/schema");
    
    return await db.select()
      .from(videoGenerations)
      .where(and(
        eq(videoGenerations.status, 'processing'),
        lt(videoGenerations.updatedAt, threshold)
      ));
  }

  async createVideoGeneration(videoData: any): Promise<any> {
    const { videoGenerations } = await import("@shared/schema");
    
    const [created] = await db.insert(videoGenerations).values({
      ...videoData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return created;
  }

  // Story Narrations
  async getSavedNarration(storyId: number, userId: string): Promise<StoryNarration | undefined> {
    const [narration] = await db
      .select()
      .from(storyNarrations)
      .where(and(eq(storyNarrations.storyId, storyId), eq(storyNarrations.userId, userId)))
      .orderBy(desc(storyNarrations.createdAt))
      .limit(1);
    return narration || undefined;
  }

  async saveNarration(narrationData: InsertStoryNarration): Promise<StoryNarration> {
    const [narration] = await db
      .insert(storyNarrations)
      .values({
        ...narrationData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return narration;
  }

  async updateNarration(id: number, updates: Partial<InsertStoryNarration>): Promise<void> {
    await db
      .update(storyNarrations)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(storyNarrations.id, id));
  }

  async deleteNarration(id: number): Promise<void> {
    await db.delete(storyNarrations).where(eq(storyNarrations.id, id));
  }

  // Audio Files - Database-based storage implementation
  async saveAudioFile(audioData: InsertAudioFile): Promise<AudioFile> {
    const [audioFile] = await db.insert(audioFiles).values(audioData).returning();
    return audioFile;
  }

  async getAudioFile(id: number): Promise<AudioFile | undefined> {
    const [audioFile] = await db.select().from(audioFiles).where(eq(audioFiles.id, id));
    return audioFile;
  }

  async deleteAudioFile(id: number): Promise<void> {
    await db.delete(audioFiles).where(eq(audioFiles.id, id));
  }

  // User Voice Emotions (for voice samples service)
  async getUserVoiceEmotions(userId: string, storyId?: number): Promise<any[]> {
    // Use ESM system for voice recordings
    return await this.getAllUserVoiceSamples(userId);
  }

  async createUserVoiceEmotion(data: any): Promise<any> {
    // Use ESM system - need to create user_esm_recordings entry
    const result = await db.execute(
      sql`INSERT INTO user_esm_recordings (user_esm_id, audio_url, duration, file_size, audio_quality_score, transcribed_text, created_by, created_date)
          VALUES (${data.user_esm_id}, ${data.audioUrl}, ${data.duration}, ${data.file_size || 0}, ${data.audio_quality_score || 0.8}, ${data.transcribed_text || ''}, ${data.userId}, NOW())
          RETURNING *`
    );
    return result.rows[0];
  }

  async deleteUserVoiceEmotion(userId: string, emotion: string): Promise<void> {
    // Use ESM system to delete recordings
    await db.execute(
      sql`DELETE FROM user_esm_recordings 
          WHERE user_esm_id IN (
            SELECT ue.user_esm_id FROM user_esm ue 
            JOIN esm_ref er ON ue.esm_ref_id = er.esm_ref_id 
            WHERE ue.user_id = ${userId} AND er.name = ${emotion}
          )`
    );
  }

  // Emotion Templates (simple implementation)
  async getEmotionTemplate(emotion: string): Promise<any | null> {
    // For now, return null since templates are handled by voice-config
    return null;
  }

  async createEmotionTemplate(template: any): Promise<any> {
    // For now, just return the template since templates are handled by voice-config
    return template;
  }

  async getVoiceModulationTemplates(): Promise<any[]> {
    // ELIMINATED LEGACY VOICE CONFIG - Now uses ESM database exclusively
    // All voice templates come from story analysis via ESM reference data
    const result = await db.execute(
      sql`SELECT esm_ref_id as id, 'emotion' as modulationType, name as modulationKey, 
          display_name as displayName, sample_text as sampleText, 
          category, name as emotion, display_name as displayName, sample_text as description,
          6 as targetDuration, true as isActive, 0 as sortOrder,
          NOW() as createdAt, NOW() as updatedAt
          FROM esm_ref 
          WHERE category = 1 
          ORDER BY display_name`
    );
    return result.rows;
  }

  // ESM Reference Data Implementation
  async getEsmRef(category: number, name: string): Promise<any | null> {
    console.log('🔍 getEsmRef called with:', { category, name });
    const result = await db.execute(
      sql`SELECT * FROM esm_ref WHERE category = ${category} AND name = ${name} AND is_active = true LIMIT 1`
    );
    console.log('🔍 getEsmRef result:', result.rows[0] ? 'FOUND' : 'NOT FOUND');
    return result.rows[0] || null;
  }

  async createEsmRef(esmRef: {
    category: number;
    name: string;
    display_name: string;
    sample_text: string;
    intensity?: number;
    description?: string;
    ai_variations?: any;
    created_by: string;
  }): Promise<any> {
    console.log('🚨 createEsmRef called - THIS SHOULD NOT HAPPEN during voice recording!');
    console.log('🚨 createEsmRef data:', esmRef);
    const result = await db.execute(
      sql`INSERT INTO esm_ref (category, name, display_name, sample_text, intensity, description, ai_variations, created_by, created_date)
          VALUES (${esmRef.category}, ${esmRef.name}, ${esmRef.display_name}, ${esmRef.sample_text}, 
                  ${esmRef.intensity || 5}, ${esmRef.description || null}, ${JSON.stringify(esmRef.ai_variations) || null}, ${esmRef.created_by}, NOW())
          RETURNING *`
    );
    return result.rows[0];
  }

  async getAllEsmRefs(): Promise<any[]> {
    const result = await db.execute(sql`SELECT * FROM esm_ref WHERE is_active = true ORDER BY category, name`);
    return result.rows;
  }

  async getUserEsmRecordingByEmotion(userId: string, emotion: string): Promise<any | null> {
    const result = await db.execute(
      sql`SELECT * FROM user_esm_recordings WHERE user_id = ${userId} AND emotion = ${emotion} LIMIT 1`
    );
    return result.rows[0] || null;
  }

  async getUserEsmRecordingByEmotionAndCategory(userId: string, emotion: string, category: number): Promise<any | null> {
    const result = await db.execute(
      sql`SELECT uer.* 
          FROM user_esm_recordings uer
          JOIN user_esm ue ON uer.user_esm_id = ue.user_esm_id
          JOIN esm_ref er ON ue.esm_ref_id = er.esm_ref_id
          WHERE ue.user_id = ${userId} 
          AND er.name = ${emotion}
          AND er.category = ${category}
          AND uer.is_active = true
          AND ue.is_active = true
          AND er.is_active = true
          LIMIT 1`
    );
    return result.rows[0] || null;
  }

  async deleteUserEsmRecording(recordingId: number): Promise<void> {
    // Soft delete - set is_active to false instead of hard delete
    await db.execute(
      sql`UPDATE user_esm_recordings 
          SET is_active = false 
          WHERE user_esm_recordings_id = ${recordingId}`
    );
  }

  async updateUserEsmRecording(id: number, updates: {
    audio_url?: string;
    duration?: number;
    narrator_voice_id?: string;
    file_size?: number;
  }): Promise<any> {
    const result = await db.execute(
      sql`UPDATE user_esm_recordings 
          SET audio_url = COALESCE(${updates.audio_url || null}, audio_url),
              duration = COALESCE(${updates.duration || null}, duration),
              narrator_voice_id = COALESCE(${updates.narrator_voice_id || null}, narrator_voice_id),
              file_size = COALESCE(${updates.file_size || null}, file_size)
          WHERE user_esm_recordings_id = ${id}
          RETURNING *`
    );
    return result.rows[0];
  }

  async getEsmRefsByCategory(category: number): Promise<any[]> {
    const result = await db.execute(
      sql`SELECT * FROM esm_ref WHERE category = ${category} AND is_active = true ORDER BY name`
    );
    return result.rows;
  }

  async updateEsmRef(esmRefId: number, updates: Partial<{ sample_text: string; display_name: string; description: string }>): Promise<void> {
    if (Object.keys(updates).length === 0) return;
    
    if (updates.sample_text !== undefined) {
      await db.execute(
        sql`UPDATE esm_ref SET sample_text = ${updates.sample_text} WHERE esm_ref_id = ${esmRefId}`
      );
    }
    if (updates.display_name !== undefined) {
      await db.execute(
        sql`UPDATE esm_ref SET display_name = ${updates.display_name} WHERE esm_ref_id = ${esmRefId}`
      );
    }
    if (updates.description !== undefined) {
      await db.execute(
        sql`UPDATE esm_ref SET description = ${updates.description} WHERE esm_ref_id = ${esmRefId}`
      );
    }
  }

  // User ESM Data Implementation
  /**
   * Get all ESM records for a user (global voice samples)
   * @param userId - User identifier
   * @returns Array of user ESM records with progress data
   */
  async getUserEsm(userId: string): Promise<any[]> {
    const result = await db.execute(
      sql`SELECT * FROM user_esm WHERE user_id = ${userId} AND is_active = true`
    );
    return result.rows;
  }

  /**
   * Get specific user ESM record by user ID and ESM reference ID
   * @param userId - User identifier
   * @param esmRefId - ESM reference table ID (emotion/sound/modulation)
   * @returns User ESM record with progress data or null if not found
   */
  async getUserEsmByRef(userId: string, esmRefId: number): Promise<any | null> {
    console.log('🔍 getUserEsmByRef called with:', { userId, esmRefId });
    const result = await db.execute(
      sql`SELECT * FROM user_esm WHERE user_id = ${userId} AND esm_ref_id = ${esmRefId} AND is_active = true LIMIT 1`
    );
    console.log('🔍 getUserEsmByRef result:', result.rows[0] ? 'FOUND' : 'NOT FOUND');
    return result.rows[0] || null;
  }

  async createUserEsm(userEsm: {
    user_id: string;
    esm_ref_id: number;
    created_by: string;
  }): Promise<any> {
    console.log('🔍 createUserEsm called with:', userEsm);
    const result = await db.execute(
      sql`INSERT INTO user_esm (user_id, esm_ref_id, created_by, created_date)
          VALUES (${userEsm.user_id}, ${userEsm.esm_ref_id}, ${userEsm.created_by}, NOW())
          RETURNING *`
    );
    return result.rows[0];
  }

  async updateUserEsm(userEsmId: number, updates: any): Promise<void> {
    // Build safe SQL query with proper parameter binding
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      updateFields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
    
    if (updateFields.length === 0) return;
    
    values.push(userEsmId); // Add WHERE clause parameter
    
    const query = `UPDATE user_esm SET ${updateFields.join(', ')} WHERE user_esm_id = $${paramCount}`;
    
    await db.execute(sql.raw(query, values));
  }

  async getUserEsmByUser(userId: string): Promise<any[]> {
    const result = await db.execute(
      sql`SELECT ue.*, er.name, er.display_name, er.category, er.sample_text
          FROM user_esm ue
          JOIN esm_ref er ON ue.esm_ref_id = er.esm_ref_id
          WHERE ue.user_id = ${userId}
          AND ue.is_active = true
          AND er.is_active = true
          ORDER BY er.category, er.name`
    );
    return result.rows;
  }

  // User ESM Recordings Implementation
  /**
   * Create new ESM recording for user voice sample
   * @param recording - Recording data with user_esm_id, audio_url, duration, etc.
   * @returns Created recording record with ID
   */
  async createUserEsmRecording(recording: {
    user_esm_id: number;
    audio_url: string;
    duration: number;
    file_size: number;
    audio_quality_score?: number;
    transcribed_text?: string;
    created_by: string;
    story_id?: number;
  }): Promise<any> {
    console.log('🎯 Creating ESM recording with data:', {
      user_esm_id: recording.user_esm_id,
      audio_url: recording.audio_url,
      duration: recording.duration,
      file_size: recording.file_size,
      audio_quality_score: recording.audio_quality_score,
      transcribed_text: recording.transcribed_text,
      created_by: recording.created_by,
      story_id: recording.story_id
    });
    
    // Handle nullable values outside SQL template
    const audioQualityScore = recording.audio_quality_score ?? null;
    const transcribedText = recording.transcribed_text ?? null;
    const storyId = recording.story_id ?? null;
    
    console.log('🔍 SQL Debug - Values:', {
      user_esm_id: recording.user_esm_id,
      audio_url: recording.audio_url,
      duration: recording.duration,
      file_size: recording.file_size,
      audioQualityScore,
      transcribedText,
      created_by: recording.created_by
    });
    
    // Build the exact SQL that will be executed
    const fullSQL = `INSERT INTO user_esm_recordings (user_esm_id, audio_url, duration, file_size, audio_quality_score, transcribed_text, created_by, story_id) VALUES (${recording.user_esm_id}, '${recording.audio_url}', ${recording.duration}, ${recording.file_size}, ${audioQualityScore}, ${transcribedText === null ? 'NULL' : `'${transcribedText}'`}, '${recording.created_by}', ${storyId === null ? 'NULL' : storyId}) RETURNING *`;
    
    console.log('🔍 FULL SQL STATEMENT:');
    console.log(fullSQL);
    console.log('🔍 SQL LENGTH:', fullSQL.length);
    console.log('🔍 CHARACTER AT POSITION 173:', fullSQL.charAt(172)); // Position 173 is index 172
    console.log('🔍 CHARACTERS AROUND POSITION 173:', fullSQL.substring(165, 180));
    
    try {
      const result = await db.execute(
        sql`INSERT INTO user_esm_recordings (user_esm_id, audio_url, duration, file_size, audio_quality_score, transcribed_text, created_by, story_id)
            VALUES (${recording.user_esm_id}, ${recording.audio_url}, ${recording.duration}, ${recording.file_size}, ${audioQualityScore}, ${transcribedText}, ${recording.created_by}, ${storyId})
            RETURNING *`
      );
      return result.rows[0];
    } catch (sqlError) {
      console.error('🚨 SQL ERROR at position', sqlError.position);
      console.error('🚨 Full error:', sqlError.message);
      throw sqlError;
    }
  }



  // ElevenLabs Voice Profiles
  async getUserVoiceProfiles(userId: string): Promise<any[]> {
    const userVoiceProfiles = await import("@shared/schema").then(m => m.userVoiceProfiles);
    return await db.select().from(userVoiceProfiles)
      .where(eq(userVoiceProfiles.userId, userId));
  }

  async createUserVoiceProfile(profile: any): Promise<any> {
    const userVoiceProfiles = await import("@shared/schema").then(m => m.userVoiceProfiles);
    
    // Validate required fields before attempting insert
    if (!profile.userId) {
      throw new Error('userId is required for voice profile creation');
    }
    if (!profile.profileName) {
      throw new Error('profileName is required for voice profile creation');
    }
    if (!profile.baseVoice) {
      throw new Error('baseVoice is required for voice profile creation');
    }
    // voiceName is optional - has default value in database
    
    const [created] = await db.insert(userVoiceProfiles).values({
      ...profile,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return created;
  }

  async updateUserVoiceProfile(id: number, profile: any): Promise<any> {
    const userVoiceProfiles = await import("@shared/schema").then(m => m.userVoiceProfiles);
    const [updated] = await db.update(userVoiceProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(userVoiceProfiles.id, id))
      .returning();
    return updated;
  }

  async deleteUserVoiceProfile(id: number): Promise<void> {
    const userVoiceProfiles = await import("@shared/schema").then(m => m.userVoiceProfiles);
    await db.delete(userVoiceProfiles).where(eq(userVoiceProfiles.id, id));
  }

  // ElevenLabs Emotion Voices - using existing user_voice_emotions table
  async getUserEmotionVoices(userId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT 
        id,
        emotion,
        intensity,
        audio_url,
        usage_count,
        last_used_at,
        created_at
      FROM user_voice_emotions 
      WHERE user_id = ${userId}
    `);
    return result.rows.map(row => ({
      id: row.id,
      emotion: row.emotion,
      intensity: row.intensity,
      audioUrl: row.audio_url,
      usageCount: row.usage_count || 0,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at
    }));
  }

  async getUserEmotionVoice(userId: string, emotion: string): Promise<any | undefined> {
    const result = await db.execute(sql`
      SELECT 
        id,
        emotion,
        intensity,
        audio_url,
        usage_count,
        last_used_at,
        created_at
      FROM user_voice_emotions 
      WHERE user_id = ${userId} AND emotion = ${emotion}
      LIMIT 1
    `);
    const row = result.rows[0];
    return row ? {
      id: row.id,
      emotion: row.emotion,
      intensity: row.intensity,
      audioUrl: row.audio_url,
      usageCount: row.usage_count || 0,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at
    } : undefined;
  }

  async createUserEmotionVoice(emotionVoice: any): Promise<any> {
    throw new Error("createUserEmotionVoice not implemented - requires database schema alignment with user_voice_emotions table");
  }

  async updateUserEmotionVoice(id: number, emotionVoice: any): Promise<any> {
    throw new Error("updateUserEmotionVoice not implemented - requires database schema alignment with user_voice_emotions table");
  }

  async deleteUserEmotionVoice(id: number): Promise<void> {
    throw new Error("deleteUserEmotionVoice not implemented - requires database schema alignment with user_voice_emotions table");
  }

  // Voice Generation Cache
  // Voice generation cache removed - using ESM architecture

  // All voice generation cache methods removed - using ESM architecture

  // Story Analysis Cache
  async getStoryAnalysisCache(contentHash: string): Promise<any | undefined> {
    const storyAnalysisCache = await import("@shared/schema").then(m => m.storyAnalysisCache);
    const [cached] = await db.select().from(storyAnalysisCache)
      .where(eq(storyAnalysisCache.storyContentHash, contentHash));
    return cached || undefined;
  }

  async createStoryAnalysisCache(cache: any): Promise<any> {
    const storyAnalysisCache = await import("@shared/schema").then(m => m.storyAnalysisCache);
    const [created] = await db.insert(storyAnalysisCache).values(cache).returning();
    return created;
  }

  async updateStoryAnalysisCacheReuse(id: number): Promise<void> {
    const storyAnalysisCache = await import("@shared/schema").then(m => m.storyAnalysisCache);
    await db.update(storyAnalysisCache)
      .set({ reuseCount: sql`${storyAnalysisCache.reuseCount} + 1` })
      .where(eq(storyAnalysisCache.id, id));
  }

  // Enhanced Story Narrations
  async getStoryNarration(userId: string, storyId: number): Promise<any | undefined> {
    const enhancedStoryNarrations = await import("@shared/schema").then(m => m.storyNarrations);
    const [narration] = await db.select().from(enhancedStoryNarrations)
      .where(and(
        eq(enhancedStoryNarrations.userId, userId),
        eq(enhancedStoryNarrations.storyId, storyId)
      ));
    return narration || undefined;
  }

  async createStoryNarration(narration: any): Promise<any> {
    const enhancedStoryNarrations = await import("@shared/schema").then(m => m.storyNarrations);
    const [created] = await db.insert(enhancedStoryNarrations).values(narration).returning();
    return created;
  }

  async updateStoryNarration(id: number, narration: any): Promise<any> {
    const enhancedStoryNarrations = await import("@shared/schema").then(m => m.storyNarrations);
    const [updated] = await db.update(enhancedStoryNarrations)
      .set({ ...narration, updatedAt: new Date() })
      .where(eq(enhancedStoryNarrations.id, id))
      .returning();
    return updated;
  }

  async deleteStoryNarration(id: number): Promise<void> {
    const enhancedStoryNarrations = await import("@shared/schema").then(m => m.storyNarrations);
    await db.delete(enhancedStoryNarrations).where(eq(enhancedStoryNarrations.id, id));
  }

  // Voice Cloning Integration - ElevenLabs methods
  async getUserVoiceProfile(userId: string): Promise<any | undefined> {
    const userVoiceProfiles = await import("@shared/schema").then(m => m.userVoiceProfiles);
    const [profile] = await db.select().from(userVoiceProfiles)
      .where(eq(userVoiceProfiles.userId, userId));
    return profile || undefined;
  }



  // Audio Cache System methods
  // getAudioCacheEntry removed - using ESM architecture

  // createAudioCacheEntry removed - using ESM architecture

  // updateAudioCacheUsage removed - using ESM architecture

  // deleteAudioCacheEntry removed - using ESM architecture

  // getAudioCacheStats and getExpiredAudioCacheEntries removed - using ESM architecture

  // Story Narrations Enhanced methods

  async createStoryNarrationRecord(narrationData: any): Promise<any> {
    const enhancedStoryNarrations = await import("@shared/schema").then(m => m.storyNarrations);
    const [created] = await db.insert(enhancedStoryNarrations).values({
      ...narrationData,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return created;
  }

  // MVP1 Hybrid Voice Cloning - Get unique emotions recorded by user
  async getUserUniqueEmotions(userId: string): Promise<string[]> {
    // Use ESM architecture - get unique emotions from ESM reference data
    const result = await db.execute(
      sql`SELECT DISTINCT er.name as emotion
          FROM user_esm_recordings uer
          JOIN user_esm ue ON uer.user_esm_id = ue.user_esm_id
          JOIN esm_ref er ON ue.esm_ref_id = er.esm_ref_id
          WHERE ue.user_id = ${userId} 
          AND er.category = 1
          ORDER BY er.name`
    );
    
    return result.rows.map((row: any) => row.emotion).filter(Boolean);
  }

  // REFERENCE DATA ARCHITECTURE IMPLEMENTATIONS
  
  // Reference Stories (shared across all users)
  async getAllReferenceStories(): Promise<any[]> {
    const { referenceStories } = await import('@shared/schema');
    return await db.select().from(referenceStories).orderBy(referenceStories.publishedAt);
  }
  
  async getReferenceStory(id: number): Promise<any | undefined> {
    const { referenceStories } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    const [story] = await db.select().from(referenceStories).where(eq(referenceStories.id, id));
    return story || undefined;
  }
  
  async createReferenceStory(data: any): Promise<any> {
    const { referenceStories } = await import('@shared/schema');
    const [story] = await db.insert(referenceStories).values(data).returning();
    return story;
  }
  
  async updateReferenceStory(id: number, data: any): Promise<any> {
    const { referenceStories } = await import('@shared/schema');
    const [story] = await db
      .update(referenceStories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(referenceStories.id, id))
      .returning();
    return story;
  }
  
  async deleteReferenceStory(id: number): Promise<void> {
    const { referenceStories } = await import('@shared/schema');
    await db.delete(referenceStories).where(eq(referenceStories.id, id));
  }
  
  async browseReferenceStories(filters?: any): Promise<any[]> {
    const { referenceStories } = await import('@shared/schema');
    let query = db.select().from(referenceStories);
    
    if (filters?.category) {
      query = query.where(eq(referenceStories.category, filters.category));
    }
    
    return await query.orderBy(referenceStories.publishedAt);
  }
  
  // Reference Story Analysis (shared AI analysis)
  async getReferenceStoryAnalysis(referenceStoryId: number): Promise<any | undefined> {
    const { referenceStoryAnalyses } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    const [analysis] = await db
      .select()
      .from(referenceStoryAnalyses)
      .where(eq(referenceStoryAnalyses.referenceStoryId, referenceStoryId));
    return analysis || undefined;
  }
  
  async createReferenceStoryAnalysis(data: any): Promise<any> {
    const { referenceStoryAnalyses } = await import('@shared/schema');
    const [analysis] = await db.insert(referenceStoryAnalyses).values(data).returning();
    return analysis;
  }
  
  async updateReferenceStoryAnalysis(id: number, data: any): Promise<any> {
    const { referenceStoryAnalyses } = await import('@shared/schema');
    const [analysis] = await db
      .update(referenceStoryAnalyses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(referenceStoryAnalyses.id, id))
      .returning();
    return analysis;
  }
  
  // Reference Roleplay Analysis (shared roleplay structure)
  async getReferenceRoleplayAnalysis(referenceStoryId: number): Promise<any | undefined> {
    const { referenceRoleplayAnalyses } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    const [analysis] = await db
      .select()
      .from(referenceRoleplayAnalyses)
      .where(eq(referenceRoleplayAnalyses.referenceStoryId, referenceStoryId));
    return analysis || undefined;
  }
  
  async createReferenceRoleplayAnalysis(data: any): Promise<any> {
    const { referenceRoleplayAnalyses } = await import('@shared/schema');
    const [analysis] = await db.insert(referenceRoleplayAnalyses).values(data).returning();
    return analysis;
  }
  
  async updateReferenceRoleplayAnalysis(id: number, data: any): Promise<any> {
    const { referenceRoleplayAnalyses } = await import('@shared/schema');
    const [analysis] = await db
      .update(referenceRoleplayAnalyses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(referenceRoleplayAnalyses.id, id))
      .returning();
    return analysis;
  }
  
  // User Story Narrations (user's personalized narrations)
  async getUserStoryNarrations(userId: string): Promise<any[]> {
    const { userStoryNarrations } = await import('@shared/schema');
    return await db
      .select()
      .from(userStoryNarrations)
      .where(eq(userStoryNarrations.userId, userId))
      .orderBy(userStoryNarrations.createdAt);
  }
  
  async getUserStoryNarration(userId: string, referenceStoryId: number): Promise<any | undefined> {
    const { userStoryNarrations } = await import('@shared/schema');
    const [narration] = await db
      .select()
      .from(userStoryNarrations)
      .where(and(
        eq(userStoryNarrations.userId, userId),
        eq(userStoryNarrations.referenceStoryId, referenceStoryId)
      ));
    return narration || undefined;
  }
  
  async createUserStoryNarration(data: any): Promise<any> {
    const { userStoryNarrations } = await import('@shared/schema');
    const [narration] = await db.insert(userStoryNarrations).values(data).returning();
    return narration;
  }
  
  async updateUserStoryNarration(id: number, data: any): Promise<any> {
    const { userStoryNarrations } = await import('@shared/schema');
    const [narration] = await db
      .update(userStoryNarrations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userStoryNarrations.id, id))
      .returning();
    return narration;
  }
  
  async deleteUserStoryNarration(id: number): Promise<void> {
    const { userStoryNarrations } = await import('@shared/schema');
    await db.delete(userStoryNarrations).where(eq(userStoryNarrations.id, id));
  }
  
  // User Roleplay Segments (user's personal roleplay segments)
  async getUserRoleplaySegments(userId: string): Promise<any[]> {
    const { userRoleplaySegments } = await import('@shared/schema');
    return await db
      .select()
      .from(userRoleplaySegments)
      .where(eq(userRoleplaySegments.userId, userId))
      .orderBy(userRoleplaySegments.createdAt);
  }
  
  async getUserRoleplaySegment(userId: string, id: number): Promise<any | undefined> {
    const { userRoleplaySegments } = await import('@shared/schema');
    const [segment] = await db
      .select()
      .from(userRoleplaySegments)
      .where(and(
        eq(userRoleplaySegments.userId, userId),
        eq(userRoleplaySegments.id, id)
      ));
    return segment || undefined;
  }
  
  async createUserRoleplaySegment(data: any): Promise<any> {
    const { userRoleplaySegments } = await import('@shared/schema');
    const [segment] = await db.insert(userRoleplaySegments).values(data).returning();
    return segment;
  }
  
  async updateUserRoleplaySegment(id: number, data: any): Promise<any> {
    const { userRoleplaySegments } = await import('@shared/schema');
    const [segment] = await db
      .update(userRoleplaySegments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userRoleplaySegments.id, id))
      .returning();
    return segment;
  }
  
  async deleteUserRoleplaySegment(id: number): Promise<void> {
    const { userRoleplaySegments } = await import('@shared/schema');
    await db.delete(userRoleplaySegments).where(eq(userRoleplaySegments.id, id));
  }
  
  // Reference Data Migration (placeholder implementations)
  async migrateStoryToReference(storyId: number): Promise<any> {
    throw new Error('Use ReferenceDataService.migrateStoryToReference() instead');
  }
  
  async migrateAllStoriesToReference(): Promise<any> {
    throw new Error('Use ReferenceDataService.migrateStoriesToReferenceData() instead');
  }

  // Story User Confidence methods
  async getStoryUserConfidence(storyId: number, userId: string): Promise<any | undefined> {
    // No story confidence table in schema - implementation required
    throw new Error('Story user confidence tracking not implemented - database schema required');
  }

  async createStoryUserConfidence(confidence: any): Promise<any> {
    // No story confidence table in schema - implementation required
    throw new Error('Story user confidence creation not implemented - database schema required');
  }

  async incrementConfidenceMetric(storyId: number, userId: string, metric: string): Promise<void> {
    // No story confidence table in schema - implementation required
    throw new Error('Confidence metric tracking not implemented - database schema required');
  }

  // ESM User Recordings methods
  async getUserEsmRecordings(userId: string): Promise<any[]> {
    const result = await db.execute(
      sql`SELECT 
            uer.user_esm_recordings_id as id,
            uer.audio_url,
            uer.duration,
            uer.created_date,
            uer.is_locked,
            uer.locked_at,
            uer.narrator_voice_id as recording_narrator_voice_id,
            uer.story_id,
            ue.narrator_voice_id,
            ue.kling_voice_id,
            er.name,
            er.display_name,
            er.category
          FROM user_esm_recordings uer
          INNER JOIN user_esm ue ON uer.user_esm_id = ue.user_esm_id
          INNER JOIN esm_ref er ON ue.esm_ref_id = er.esm_ref_id
          WHERE ue.user_id = ${userId}
          AND uer.is_active = true
          AND ue.is_active = true
          AND er.is_active = true
          ORDER BY uer.created_date DESC`
    );
    
    console.log(`📊 Found ${result.rows.length} ESM recordings for user ${userId}`);
    return result.rows;
  }

  async getUserNarratorVoice(userId: string): Promise<string | null> {
    try {
      const { userEsm } = await import('@shared/schema');
      const result = await db.select({ narrator_voice_id: userEsm.narrator_voice_id })
        .from(userEsm)
        .where(and(
          eq(userEsm.userId, userId),
          isNotNull(userEsm.narrator_voice_id)
        ))
        .limit(1);
      
      console.log(`[Storage] getUserNarratorVoice for ${userId}:`, result[0]?.narrator_voice_id || null);
      return result[0]?.narrator_voice_id || null;
    } catch (error) {
      console.error('[Storage] Error getting user narrator voice:', error);
      return null;
    }
  }

  // DUPLICATE METHOD - Commented out (was causing SQL conflicts)
  // async getEsmRef(category: number, name: string): Promise<any> {
  //   const result = await db.execute(
  //     sql`SELECT * FROM esm_ref WHERE category = ${category} AND name = ${name} LIMIT 1`
  //   );
  //   return result.rows[0] || null;
  // }

  async createEsmRef(data: any): Promise<any> {
    const result = await db.execute(
      sql`INSERT INTO esm_ref (category, name, display_name, sample_text, intensity, description, ai_variations, created_by)
          VALUES (${data.category}, ${data.name}, ${data.display_name}, ${data.sample_text}, ${data.intensity}, 
                  ${data.description}, ${JSON.stringify(data.ai_variations)}, ${data.created_by})
          RETURNING *`
    );
    return result.rows[0];
  }

  // DUPLICATE METHOD - Commented out (identical to getUserEsmByRef)
  // async getUserEsm(userId: string, esmRefId: number): Promise<any> {
  //   const result = await db.execute(
  //     sql`SELECT * FROM user_esm WHERE user_id = ${userId} AND esm_ref_id = ${esmRefId} LIMIT 1`
  //   );
  //   return result.rows[0] || null;
  // }



  /**
   * Create new user ESM entry
   * @param data - User ESM data with user_id, esm_ref_id, created_by
   * @returns Created user ESM record
   */
  async createUserEsm(data: any): Promise<any> {
    const sampleCount = data.sample_count ?? 0;
    const qualityTier = data.quality_tier ?? 'none';
    const createdBy = data.created_by ?? data.user_id;
    
    const result = await db.execute(
      sql`INSERT INTO user_esm (user_id, esm_ref_id, sample_count, quality_tier, created_by)
          VALUES (${data.user_id}, ${data.esm_ref_id}, ${sampleCount}, ${qualityTier}, ${createdBy})
          RETURNING *`
    );
    return result.rows[0];
  }

  // =============================================================================
  // MANUAL VOICE CLONING STORAGE METHODS
  // =============================================================================

  async createVoiceCloningJob(job: any): Promise<any> {
    const { voiceCloningJobs } = await import('@shared/schema');
    
    const [newJob] = await db.insert(voiceCloningJobs).values(job).returning();
    console.log(`✨ Created voice cloning job ${newJob.id} for user ${job.userId}`);
    return newJob;
  }

  async updateVoiceCloningJob(jobId: number, updates: any): Promise<void> {
    const { voiceCloningJobs } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    await db.update(voiceCloningJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(voiceCloningJobs.id, jobId));
    
    console.log(`📝 Updated voice cloning job ${jobId}:`, updates);
  }

  async getVoiceCloningJob(jobId: number): Promise<any> {
    const { voiceCloningJobs } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const [job] = await db.select()
      .from(voiceCloningJobs)
      .where(eq(voiceCloningJobs.id, jobId));
    
    return job;
  }

  async getUserVoiceCloningJobs(userId: string): Promise<any[]> {
    const { voiceCloningJobs } = await import('@shared/schema');
    const { eq, desc } = await import('drizzle-orm');
    
    const jobs = await db.select()
      .from(voiceCloningJobs)
      .where(eq(voiceCloningJobs.userId, userId))
      .orderBy(desc(voiceCloningJobs.createdAt));
    
    console.log(`📋 Found ${jobs.length} voice cloning jobs for user ${userId}`);
    return jobs;
  }

  // Voice cloning cost tracking removed - functionality integrated into ESM voice cloning jobs table

  // Voice ID cleanup tracking methods for audit trail
  async trackVoiceIdDeletion(data: InsertVoiceIdCleanup): Promise<VoiceIdCleanup> {
    const [record] = await db.insert(voiceIdCleanup).values(data).returning();
    return record;
  }

  async updateVoiceIdCleanupStatus(id: number, status: string, errorMessage?: string, responseData?: any): Promise<void> {
    await db.update(voiceIdCleanup)
      .set({ 
        deleteStatus: status, 
        lastAttemptAt: new Date(),
        deleteAttempts: sql`${voiceIdCleanup.deleteAttempts} + 1`,
        errorMessage: errorMessage || null,
        responseData: responseData || null
      })
      .where(eq(voiceIdCleanup.id, id));
  }

  async getPendingVoiceCleanups(partner?: string): Promise<VoiceIdCleanup[]> {
    let query = db.select().from(voiceIdCleanup);
    
    if (partner) {
      query = query.where(and(
        eq(voiceIdCleanup.deleteStatus, 'pending'),
        eq(voiceIdCleanup.integrationPartner, partner)
      ));
    } else {
      query = query.where(eq(voiceIdCleanup.deleteStatus, 'pending'));
    }
    
    return query;
  }

  async getVoiceCleanupHistory(userId: string, limit: number = 50): Promise<VoiceIdCleanup[]> {
    return db.select()
      .from(voiceIdCleanup)
      .where(eq(voiceIdCleanup.userId, userId))
      .orderBy(desc(voiceIdCleanup.deletedAt))
      .limit(limit);
  }

  // Add missing database access method for reference data service
  getDb() {
    return db;
  }

  // Cache Management Methods Implementation
  async getCacheEntry(key: string): Promise<any | null> {
    // Cache table implementation will be added with database schema
    // For now, return null to indicate cache miss
    return null;
  }

  async createCacheEntry(entry: any): Promise<any> {
    // Cache entry creation will be implemented with database schema
    return entry;
  }

  async updateCacheEntry(key: string, entry: any): Promise<any> {
    // Cache entry update will be implemented with database schema
    return entry;
  }

  async updateCacheUsage(key: string): Promise<void> {
    // Cache usage tracking will be implemented with database schema
  }

  async deleteCacheEntry(key: string): Promise<boolean> {
    // Cache entry deletion will be implemented with database schema
    return true;
  }

  async getCacheEntriesByPattern(pattern: string): Promise<any[]> {
    // Pattern-based cache retrieval will be implemented with database schema
    return [];
  }

  async getCacheEntriesByTags(tags: string[]): Promise<any[]> {
    // Tag-based cache retrieval will be implemented with database schema
    return [];
  }

  async getCacheStats(): Promise<any> {
    // Cache statistics will be implemented with database schema
    return {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0
    };
  }

  async getAllCacheEntries(): Promise<any[]> {
    // All cache entries retrieval will be implemented with database schema
    return [];
  }

  async clearAllCacheEntries(): Promise<void> {
    // Cache clearing will be implemented with database schema
  }

  async getExpiredCacheEntries(): Promise<any[]> {
    // Expired cache entries retrieval will be implemented with database schema
    return [];
  }

  async getOldestCacheEntries(limit: number): Promise<any[]> {
    // Oldest cache entries retrieval will be implemented with database schema
    return [];
  }
}

export const storage = new DatabaseStorage();