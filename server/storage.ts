import { users, localUsers, userProviders, userVoiceSamples, stories, storyCharacters, storyEmotions, characters, conversations, messages, storyCollaborations, storyGroups, storyGroupMembers, characterVoiceAssignments, storyPlaybacks, storyAnalyses, storyNarrations, audioFiles, videoGenerations, type User, type InsertUser, type UpsertUser, type UserProvider, type InsertUserProvider, type LocalUser, type InsertLocalUser, type UserVoiceSample, type InsertUserVoiceSample, type Story, type InsertStory, type StoryCharacter, type InsertStoryCharacter, type StoryEmotion, type InsertStoryEmotion, type Character, type InsertCharacter, type Conversation, type InsertConversation, type Message, type InsertMessage, type StoryCollaboration, type InsertStoryCollaboration, type StoryGroup, type InsertStoryGroup, type StoryGroupMember, type InsertStoryGroupMember, type CharacterVoiceAssignment, type InsertCharacterVoiceAssignment, type StoryPlayback, type InsertStoryPlayback, type StoryAnalysis, type InsertStoryAnalysis, type StoryNarration, type InsertStoryNarration, type AudioFile, type InsertAudioFile } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like, lt, sql } from "drizzle-orm";

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
  
  // ElevenLabs Voice Profiles
  getUserVoiceProfiles(userId: string): Promise<any[]>;
  getUserVoiceProfile(userId: string): Promise<any | undefined>;
  createUserVoiceProfile(profile: any): Promise<any>;
  updateUserVoiceProfile(id: number, profile: any): Promise<any>;
  deleteUserVoiceProfile(id: number): Promise<void>;
  
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

  // Story Narrations
  getSavedNarration(storyId: number, userId: string): Promise<StoryNarration | undefined>;
  saveNarration(narrationData: InsertStoryNarration): Promise<StoryNarration>;
  updateNarration(id: number, updates: Partial<InsertStoryNarration>): Promise<void>;
  deleteNarration(id: number): Promise<void>;

  // Audio Files - Database-based storage
  saveAudioFile(audioData: InsertAudioFile): Promise<AudioFile>;
  getAudioFile(id: number): Promise<AudioFile | undefined>;
  deleteAudioFile(id: number): Promise<void>;
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
    return await db.select().from(userVoiceSamples).where(eq(userVoiceSamples.userId, userId));
  }

  async getAllUserVoiceSamples(userId: string): Promise<UserVoiceSample[]> {
    return await db.select().from(userVoiceSamples).where(eq(userVoiceSamples.userId, userId));
  }

  async getUserUnlockedSamplesCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(userVoiceSamples)
      .where(and(
        eq(userVoiceSamples.userId, userId),
        eq(userVoiceSamples.isLocked, false),
        eq(userVoiceSamples.isCompleted, true)
      ));
    return result[0]?.count || 0;
  }

  async getUserTotalSamplesCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(userVoiceSamples)
      .where(and(
        eq(userVoiceSamples.userId, userId),
        eq(userVoiceSamples.isCompleted, true)
      ));
    return result[0]?.count || 0;
  }

  async getUserVoiceSample(userId: string, label: string): Promise<UserVoiceSample | undefined> {
    const [sample] = await db.select().from(userVoiceSamples).where(and(eq(userVoiceSamples.userId, userId), eq(userVoiceSamples.label, label)));
    return sample || undefined;
  }

  async createUserVoiceSample(sample: InsertUserVoiceSample): Promise<UserVoiceSample> {
    const [created] = await db.insert(userVoiceSamples).values(sample).returning();
    return created;
  }

  async updateUserVoiceSample(id: number, sample: Partial<InsertUserVoiceSample>): Promise<void> {
    await db.update(userVoiceSamples).set(sample).where(eq(userVoiceSamples.id, id));
  }

  async deleteUserVoiceSample(id: number): Promise<void> {
    await db.delete(userVoiceSamples).where(eq(userVoiceSamples.id, id));
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
    // Note: userVoiceSamples table doesn't have storyId column, so we ignore storyId parameter
    return await db.select().from(userVoiceSamples)
      .where(eq(userVoiceSamples.userId, userId));
  }

  async createUserVoiceEmotion(emotion: any): Promise<any> {
    const [result] = await db.insert(userVoiceSamples).values(emotion).returning();
    return result;
  }

  async deleteUserVoiceEmotion(userId: string, emotion: string): Promise<void> {
    await db.delete(userVoiceSamples)
      .where(and(
        eq(userVoiceSamples.userId, userId),
        eq(userVoiceSamples.label, emotion)
      ));
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
    // Get templates from voice-config.ts since they're already configured there
    const { getAllEmotionConfigs } = await import('../shared/voice-config');
    const emotionConfigs = getAllEmotionConfigs();
    
    // Convert to the expected format with modulationType and modulationKey
    return emotionConfigs.map((config, index) => ({
      id: index + 1,
      modulationType: 'emotion',
      modulationKey: config.emotion,
      displayName: config.displayName,
      description: config.description,
      sampleText: config.sampleText,
      targetDuration: config.targetDuration,
      category: config.category,
      voiceSettings: config.voiceSettings,
      isActive: true,
      sortOrder: index,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  // ElevenLabs Voice Profiles
  async getUserVoiceProfiles(userId: string): Promise<any[]> {
    const userVoiceProfiles = await import("@shared/schema").then(m => m.userVoiceProfiles);
    return await db.select().from(userVoiceProfiles)
      .where(eq(userVoiceProfiles.userId, userId));
  }

  async createUserVoiceProfile(profile: any): Promise<any> {
    const userVoiceProfiles = await import("@shared/schema").then(m => m.userVoiceProfiles);
    const [created] = await db.insert(userVoiceProfiles).values(profile).returning();
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

  // ElevenLabs Emotion Voices
  async getUserEmotionVoices(userId: string): Promise<any[]> {
    const { userEmotionVoices, userVoiceProfiles } = await import("@shared/schema");
    return await db.select({
      id: userEmotionVoices.id,
      emotion: userEmotionVoices.emotion,
      elevenLabsVoiceId: userEmotionVoices.elevenLabsVoiceId,
      status: userEmotionVoices.status,
      sampleCount: userEmotionVoices.sampleCount,
      qualityScore: userEmotionVoices.qualityScore,
      voiceSettings: userEmotionVoices.voiceSettings,
      lastUsedAt: userEmotionVoices.lastUsedAt,
      usageCount: userEmotionVoices.usageCount,
      createdAt: userEmotionVoices.createdAt,
      updatedAt: userEmotionVoices.updatedAt
    })
    .from(userEmotionVoices)
    .innerJoin(userVoiceProfiles, eq(userEmotionVoices.userVoiceProfileId, userVoiceProfiles.id))
    .where(eq(userVoiceProfiles.userId, userId));
  }

  async getUserEmotionVoice(userId: string, emotion: string): Promise<any | undefined> {
    const { userEmotionVoices, userVoiceProfiles } = await import("@shared/schema");
    const [result] = await db.select()
      .from(userEmotionVoices)
      .innerJoin(userVoiceProfiles, eq(userEmotionVoices.userVoiceProfileId, userVoiceProfiles.id))
      .where(and(
        eq(userVoiceProfiles.userId, userId),
        eq(userEmotionVoices.emotion, emotion)
      ));
    return result || undefined;
  }

  async createUserEmotionVoice(emotionVoice: any): Promise<any> {
    const userEmotionVoices = await import("@shared/schema").then(m => m.userEmotionVoices);
    const [created] = await db.insert(userEmotionVoices).values(emotionVoice).returning();
    return created;
  }

  async updateUserEmotionVoice(id: number, emotionVoice: any): Promise<any> {
    const userEmotionVoices = await import("@shared/schema").then(m => m.userEmotionVoices);
    const [updated] = await db.update(userEmotionVoices)
      .set({ ...emotionVoice, updatedAt: new Date() })
      .where(eq(userEmotionVoices.id, id))
      .returning();
    return updated;
  }

  async deleteUserEmotionVoice(id: number): Promise<void> {
    const userEmotionVoices = await import("@shared/schema").then(m => m.userEmotionVoices);
    await db.delete(userEmotionVoices).where(eq(userEmotionVoices.id, id));
  }

  // Voice Generation Cache
  async getVoiceGenerationCache(contentHash: string): Promise<any | undefined> {
    const generatedAudioCache = await import("@shared/schema").then(m => m.generatedAudioCache);
    const [cached] = await db.select().from(generatedAudioCache)
      .where(eq(generatedAudioCache.contentHash, contentHash));
    return cached || undefined;
  }

  async createVoiceGenerationCache(cache: any): Promise<any> {
    const generatedAudioCache = await import("@shared/schema").then(m => m.generatedAudioCache);
    const [created] = await db.insert(generatedAudioCache).values(cache).returning();
    return created;
  }

  async updateVoiceGenerationCacheAccess(id: number): Promise<void> {
    const generatedAudioCache = await import("@shared/schema").then(m => m.generatedAudioCache);
    await db.update(generatedAudioCache)
      .set({ 
        lastAccessedAt: new Date(),
        accessCount: sql`${generatedAudioCache.accessCount} + 1`
      })
      .where(eq(generatedAudioCache.id, id));
  }

  async cleanupExpiredVoiceCache(): Promise<number> {
    const generatedAudioCache = await import("@shared/schema").then(m => m.generatedAudioCache);
    const result = await db.delete(generatedAudioCache)
      .where(lt(generatedAudioCache.expiresAt, new Date()));
    return result.rowCount || 0;
  }

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
}

export const storage = new DatabaseStorage();