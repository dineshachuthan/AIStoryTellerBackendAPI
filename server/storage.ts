import { users, localUsers, userProviders, userVoiceSamples, stories, storyCharacters, storyEmotions, characters, conversations, messages, storyCollaborations, storyGroups, storyGroupMembers, characterVoiceAssignments, storyPlaybacks, storyAnalyses, storyNarrations, audioFiles, videoGenerations, emotionTextPrompts, userVoiceEmotions, type User, type InsertUser, type UpsertUser, type UserProvider, type InsertUserProvider, type LocalUser, type InsertLocalUser, type UserVoiceSample, type InsertUserVoiceSample, type Story, type InsertStory, type StoryCharacter, type InsertStoryCharacter, type StoryEmotion, type InsertStoryEmotion, type Character, type InsertCharacter, type Conversation, type InsertConversation, type Message, type InsertMessage, type StoryCollaboration, type InsertStoryCollaboration, type StoryGroup, type InsertStoryGroup, type StoryGroupMember, type InsertStoryGroupMember, type CharacterVoiceAssignment, type InsertCharacterVoiceAssignment, type StoryPlayback, type InsertStoryPlayback, type StoryAnalysis, type InsertStoryAnalysis, type StoryNarration, type InsertStoryNarration, type AudioFile, type InsertAudioFile } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like } from "drizzle-orm";
import path from "path";
import fs from "fs/promises";

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
  getUserVoiceSample(userId: string, label: string): Promise<UserVoiceSample | undefined>;
  createUserVoiceSample(sample: InsertUserVoiceSample): Promise<UserVoiceSample>;
  updateUserVoiceSample(id: number, sample: Partial<InsertUserVoiceSample>): Promise<void>;
  deleteUserVoiceSample(id: number): Promise<void>;
  getUserVoiceProgress(userId: string): Promise<{ completed: number; total: number; percentage: number }>;
  
  // Voice Profiles
  getUserVoiceProfile(userId: string): Promise<any>;
  createUserVoiceProfile(profile: any): Promise<any>;
  updateUserVoiceProfile(userId: string, updates: any): Promise<any>;
  
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

  // User Voice Emotions
  getUserVoiceEmotions(userId: string): Promise<any[]>;
  saveUserVoiceEmotion(userId: string, emotion: string, audioBlob: any, duration: number): Promise<any>;
  getUserVoiceEmotion(userId: string, emotion: string): Promise<any>;

  // Emotion Text Prompts
  getEmotionTextPrompts(): Promise<any[]>;
  initializeDefaultEmotionPrompts(): Promise<void>;
  getEmotionTextPrompt(emotion: string): Promise<any | null>;
  createEmotionTextPrompt(promptData: any): Promise<any>;
  updateEmotionTextPrompt(emotion: string, updates: any): Promise<any | null>;
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

  // Voice Profiles
  async getUserVoiceProfile(userId: string): Promise<any> {
    const result = await db.execute({
      sql: 'SELECT * FROM user_voice_profiles WHERE user_id = $1 AND is_active = true LIMIT 1',
      args: [userId]
    });
    return result.rows[0] || null;
  }

  async createUserVoiceProfile(profile: any): Promise<any> {
    const result = await db.execute({
      sql: `INSERT INTO user_voice_profiles 
            (user_id, elevenlabs_voice_id, voice_name, training_status, training_progress, sample_count, quality_score, settings) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *`,
      args: [
        profile.userId,
        profile.elevenLabsVoiceId,
        profile.voiceName,
        profile.trainingStatus || 'pending',
        profile.trainingProgress || 0,
        profile.sampleCount || 0,
        profile.qualityScore || null,
        JSON.stringify(profile.settings || {})
      ]
    });
    return result.rows[0];
  }

  async updateUserVoiceProfile(userId: string, updates: any): Promise<any> {
    const setParts = [];
    const args = [];
    let argIndex = 1;

    if (updates.elevenLabsVoiceId !== undefined) {
      setParts.push(`elevenlabs_voice_id = $${argIndex++}`);
      args.push(updates.elevenLabsVoiceId);
    }
    if (updates.trainingStatus !== undefined) {
      setParts.push(`training_status = $${argIndex++}`);
      args.push(updates.trainingStatus);
    }
    if (updates.trainingProgress !== undefined) {
      setParts.push(`training_progress = $${argIndex++}`);
      args.push(updates.trainingProgress);
    }
    if (updates.sampleCount !== undefined) {
      setParts.push(`sample_count = $${argIndex++}`);
      args.push(updates.sampleCount);
    }
    if (updates.qualityScore !== undefined) {
      setParts.push(`quality_score = $${argIndex++}`);
      args.push(updates.qualityScore);
    }
    if (updates.settings !== undefined) {
      setParts.push(`settings = $${argIndex++}`);
      args.push(JSON.stringify(updates.settings));
    }

    setParts.push(`updated_at = NOW()`);
    if (updates.trainingStatus === 'completed') {
      setParts.push(`last_trained_at = NOW()`);
    }

    args.push(userId);

    const result = await db.execute({
      sql: `UPDATE user_voice_profiles SET ${setParts.join(', ')} WHERE user_id = $${argIndex} AND is_active = true RETURNING *`,
      args
    });
    return result.rows[0] || null;
  }

  // Emotion text prompts methods
  async getEmotionTextPrompts(): Promise<any[]> {
    try {
      const result = await db.select().from(emotionTextPrompts).where(eq(emotionTextPrompts.isActive, true));
      
      // If no prompts exist, initialize with default data
      if (result.length === 0) {
        await this.initializeDefaultEmotionPrompts();
        return await db.select().from(emotionTextPrompts).where(eq(emotionTextPrompts.isActive, true));
      }
      
      return result;
    } catch (error) {
      console.error('Error getting emotion text prompts:', error);
      return [];
    }
  }

  async initializeDefaultEmotionPrompts(): Promise<void> {
    const defaultPrompts = [
      {
        emotion: 'happy',
        promptText: 'Say "I am so happy today!" with genuine joy and excitement',
        description: 'Express joy and excitement in your voice',
        category: 'primary'
      },
      {
        emotion: 'sad',
        promptText: 'Say "I feel really sad about this" with a melancholic tone',
        description: 'Express sadness and melancholy in your voice',
        category: 'primary'
      },
      {
        emotion: 'angry',
        promptText: 'Say "This makes me so angry!" with frustration and intensity',
        description: 'Express anger and frustration in your voice',
        category: 'primary'
      },
      {
        emotion: 'calm',
        promptText: 'Say "I feel very calm and peaceful" with a serene, relaxed tone',
        description: 'Express calmness and tranquility in your voice',
        category: 'primary'
      },
      {
        emotion: 'fearful',
        promptText: 'Say "I am really scared and nervous" with fear and trembling in your voice',
        description: 'Express fear and nervousness in your voice',
        category: 'primary'
      }
    ];

    try {
      for (const prompt of defaultPrompts) {
        await db.insert(emotionTextPrompts)
          .values(prompt)
          .onConflictDoNothing();
      }
    } catch (error) {
      console.error('Error initializing emotion prompts:', error);
    }
  }

  async getEmotionTextPrompt(emotion: string): Promise<any | null> {
    try {
      const result = await db.select().from(emotionTextPrompts).where(eq(emotionTextPrompts.emotion, emotion));
      return result[0] || null;
    } catch (error) {
      console.error('Error getting emotion text prompt:', error);
      return null;
    }
  }

  async createEmotionTextPrompt(promptData: any): Promise<any> {
    try {
      const result = await db.insert(emotionTextPrompts).values(promptData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating emotion text prompt:', error);
      throw error;
    }
  }

  async updateEmotionTextPrompt(emotion: string, updates: any): Promise<any | null> {
    try {
      const result = await db.update(emotionTextPrompts)
        .set(updates)
        .where(eq(emotionTextPrompts.emotion, emotion))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating emotion text prompt:', error);
      return null;
    }
  }

  async getUserVoiceEmotions(userId: string): Promise<any[]> {
    try {
      const result = await db.select().from(userVoiceEmotions).where(eq(userVoiceEmotions.userId, userId));
      return result;
    } catch (error) {
      console.error('Error getting user voice emotions:', error);
      return [];
    }
  }

  async saveUserVoiceEmotion(userId: string, emotion: string, audioBlob: any, duration: number): Promise<any> {
    try {
      const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
      const filename = `voice_${userId}_${emotion}_${Date.now()}.webm`;
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      // Save to filesystem
      await fs.writeFile(filePath, audioBuffer);
      
      // Save to database
      const result = await db.insert(userVoiceEmotions).values({
        userId,
        emotion,
        audioUrl: `/uploads/${filename}`,
        duration: duration || 0
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error saving user voice emotion:', error);
      throw error;
    }
  }

  async getUserVoiceEmotion(userId: string, emotion: string): Promise<any> {
    try {
      const result = await db.select().from(userVoiceEmotions)
        .where(and(eq(userVoiceEmotions.userId, userId), eq(userVoiceEmotions.emotion, emotion)));
      return result[0] || null;
    } catch (error) {
      console.error('Error getting user voice emotion:', error);
      return null;
    }
  }

  async getEmotionTextPrompt(emotion: string): Promise<any | null> {
    try {
      const [result] = await db.select()
        .from(schema.emotionTextPrompts)
        .where(eq(schema.emotionTextPrompts.emotion, emotion));
      return result || null;
    } catch (error) {
      console.error('Error getting emotion text prompt:', error);
      return null;
    }
  }

  async createEmotionTextPrompt(promptData: any): Promise<any> {
    try {
      const [result] = await db.insert(schema.emotionTextPrompts)
        .values(promptData)
        .returning();
      return result;
    } catch (error) {
      console.error('Error creating emotion text prompt:', error);
      throw error;
    }
  }

  async updateEmotionTextPrompt(emotion: string, updates: any): Promise<any | null> {
    try {
      const [result] = await db.update(schema.emotionTextPrompts)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(schema.emotionTextPrompts.emotion, emotion))
        .returning();
      return result || null;
    } catch (error) {
      console.error('Error updating emotion text prompt:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();