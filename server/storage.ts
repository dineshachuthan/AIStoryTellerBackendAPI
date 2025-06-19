import { users, localUsers, userProviders, userVoiceSamples, stories, storyCharacters, storyEmotions, characters, conversations, messages, storyCollaborations, storyGroups, storyGroupMembers, characterVoiceAssignments, storyPlaybacks, storyUserConfidence, type User, type InsertUser, type UpsertUser, type UserProvider, type InsertUserProvider, type LocalUser, type InsertLocalUser, type UserVoiceSample, type InsertUserVoiceSample, type Story, type InsertStory, type StoryCharacter, type InsertStoryCharacter, type StoryEmotion, type InsertStoryEmotion, type Character, type InsertCharacter, type Conversation, type InsertConversation, type Message, type InsertMessage, type StoryCollaboration, type InsertStoryCollaboration, type StoryGroup, type InsertStoryGroup, type StoryGroupMember, type InsertStoryGroupMember, type CharacterVoiceAssignment, type InsertCharacterVoiceAssignment, type StoryPlayback, type InsertStoryPlayback, type StoryUserConfidence, type InsertStoryUserConfidence } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

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
  
  // Story User Confidence
  getStoryUserConfidence(storyId: number, userId: string): Promise<StoryUserConfidence | undefined>;
  createStoryUserConfidence(confidence: InsertStoryUserConfidence): Promise<StoryUserConfidence>;
  updateStoryUserConfidence(storyId: number, userId: string, updates: Partial<InsertStoryUserConfidence>): Promise<void>;
  incrementConfidenceMetric(storyId: number, userId: string, metric: 'totalInteractions' | 'voiceRecordingsCompleted' | 'emotionsRecorded' | 'playbacksCompleted', timeSpentSeconds?: number): Promise<void>;
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
    return user || undefined;
  }

  // Authentication Provider operations
  async getUserProvider(userId: string, provider: string): Promise<UserProvider | undefined> {
    const [userProvider] = await db
      .select()
      .from(userProviders)
      .where(and(eq(userProviders.userId, userId), eq(userProviders.provider, provider)));
    return userProvider || undefined;
  }

  async getUserByProvider(provider: string, providerId: string): Promise<User | undefined> {
    const [result] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        displayName: users.displayName,
        profileImageUrl: users.profileImageUrl,
        isEmailVerified: users.isEmailVerified,
        isAdmin: users.isAdmin,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(userProviders, eq(users.id, userProviders.userId))
      .where(and(eq(userProviders.provider, provider), eq(userProviders.providerId, providerId)));
    return result || undefined;
  }

  async createUserProvider(userProvider: InsertUserProvider): Promise<UserProvider> {
    const [provider] = await db
      .insert(userProviders)
      .values(userProvider)
      .returning();
    return provider;
  }

  // Local Authentication operations
  async createLocalUser(localUser: InsertLocalUser): Promise<LocalUser> {
    const [user] = await db
      .insert(localUsers)
      .values(localUser)
      .returning();
    return user;
  }

  async getLocalUser(userId: string): Promise<LocalUser | undefined> {
    const [localUser] = await db.select().from(localUsers).where(eq(localUsers.userId, userId));
    return localUser || undefined;
  }

  // User Voice Samples operations
  async getUserVoiceSamples(userId: string): Promise<UserVoiceSample[]> {
    return await db.select().from(userVoiceSamples).where(eq(userVoiceSamples.userId, userId));
  }

  async getUserVoiceSample(userId: string, label: string): Promise<UserVoiceSample | undefined> {
    const [sample] = await db.select().from(userVoiceSamples)
      .where(and(eq(userVoiceSamples.userId, userId), eq(userVoiceSamples.label, label)));
    return sample || undefined;
  }

  async createUserVoiceSample(sampleData: InsertUserVoiceSample): Promise<UserVoiceSample> {
    const [sample] = await db.insert(userVoiceSamples).values(sampleData).returning();
    return sample;
  }

  async updateUserVoiceSample(id: number, sampleData: Partial<InsertUserVoiceSample>): Promise<void> {
    await db.update(userVoiceSamples).set(sampleData).where(eq(userVoiceSamples.id, id));
  }

  async deleteUserVoiceSample(id: number): Promise<void> {
    await db.delete(userVoiceSamples).where(eq(userVoiceSamples.id, id));
  }

  async getUserVoiceProgress(userId: string): Promise<{ completed: number; total: number; percentage: number }> {
    const userSamples = await this.getUserVoiceSamples(userId);
    const completed = userSamples.filter(s => s.isCompleted).length;
    const total = 24; // Total number of voice samples (8 emotions + 8 sounds + 8 descriptions)
    const percentage = Math.round((completed / total) * 100);
    
    return { completed, total, percentage };
  }

  // Story operations
  async getPublicStories(filters?: {
    genre?: string;
    emotionalTags?: string[];
    moodCategory?: string;
    ageRating?: string;
    search?: string;
  }): Promise<Story[]> {
    // Build where conditions array
    const conditions = [eq(stories.isPublished, true)];
    
    if (filters?.genre) {
      conditions.push(eq(stories.genre, filters.genre));
    }
    
    if (filters?.moodCategory) {
      conditions.push(eq(stories.moodCategory, filters.moodCategory));
    }
    
    if (filters?.ageRating) {
      conditions.push(eq(stories.ageRating, filters.ageRating));
    }
    
    // Execute query with combined conditions
    const allStories = await db.select().from(stories).where(and(...conditions));
    
    let filteredStories = allStories;
    
    // Filter by emotional tags in memory
    if (filters?.emotionalTags && filters.emotionalTags.length > 0) {
      filteredStories = filteredStories.filter(story => {
        const storyTags = story.emotionalTags || [];
        return filters.emotionalTags!.some(tag => storyTags.includes(tag));
      });
    }
    
    // Filter by search term in memory
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredStories = filteredStories.filter(story => 
        story.title.toLowerCase().includes(searchTerm) ||
        story.summary?.toLowerCase().includes(searchTerm) ||
        story.content.toLowerCase().includes(searchTerm) ||
        (story.tags || []).some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    return filteredStories;
  }

  async getUserStories(userId: string, filters?: {
    genre?: string;
    emotionalTags?: string[];
    moodCategory?: string;
    ageRating?: string;
    search?: string;
  }): Promise<Story[]> {
    // Get user's own stories (both private and public) AND all public stories from other users
    // Build where conditions for user's own stories
    const userConditions = [eq(stories.authorId, userId)];
    
    // Build where conditions for public stories from all users
    const publicConditions = [eq(stories.isPublished, true)];
    
    if (filters?.genre) {
      userConditions.push(eq(stories.genre, filters.genre));
      publicConditions.push(eq(stories.genre, filters.genre));
    }
    
    if (filters?.moodCategory) {
      userConditions.push(eq(stories.moodCategory, filters.moodCategory));
      publicConditions.push(eq(stories.moodCategory, filters.moodCategory));
    }
    
    if (filters?.ageRating) {
      userConditions.push(eq(stories.ageRating, filters.ageRating));
      publicConditions.push(eq(stories.ageRating, filters.ageRating));
    }
    
    // Execute both queries
    const [userStories, publicStories] = await Promise.all([
      db.select().from(stories).where(and(...userConditions)).orderBy(desc(stories.id)),
      db.select().from(stories).where(and(...publicConditions)).orderBy(desc(stories.id))
    ]);
    
    // Combine and deduplicate stories (user's own stories take precedence)
    const storyMap = new Map();
    
    // Add user's stories first (both private and public)
    userStories.forEach(story => storyMap.set(story.id, story));
    
    // Add public stories from other users (won't overwrite user's own stories)
    publicStories.forEach(story => {
      if (!storyMap.has(story.id)) {
        storyMap.set(story.id, story);
      }
    });
    
    let filteredStories = Array.from(storyMap.values());
    
    // Filter by emotional tags in memory
    if (filters?.emotionalTags && filters.emotionalTags.length > 0) {
      filteredStories = filteredStories.filter(story => {
        const storyTags = story.emotionalTags || [];
        return filters.emotionalTags!.some(tag => storyTags.includes(tag));
      });
    }
    
    // Filter by search term in memory
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredStories = filteredStories.filter(story => 
        story.title.toLowerCase().includes(searchTerm) ||
        story.summary?.toLowerCase().includes(searchTerm) ||
        story.content.toLowerCase().includes(searchTerm) ||
        (story.tags || []).some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    // Sort by ID descending (newest first)
    filteredStories.sort((a, b) => b.id - a.id);
    
    return filteredStories;
  }

  async getStory(id: number): Promise<Story | undefined> {
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    return story || undefined;
  }

  async createStory(storyData: InsertStory): Promise<Story> {
    const [story] = await db.insert(stories).values(storyData).returning();
    return story;
  }

  async updateStory(id: number, storyData: Partial<InsertStory>): Promise<Story | undefined> {
    const [story] = await db
      .update(stories)
      .set({ ...storyData, updatedAt: new Date() })
      .where(eq(stories.id, id))
      .returning();
    return story || undefined;
  }

  async deleteStory(id: number): Promise<void> {
    await db.delete(stories).where(eq(stories.id, id));
  }

  // Story Characters operations
  async getStoryCharacters(storyId: number): Promise<StoryCharacter[]> {
    return await db.select().from(storyCharacters).where(eq(storyCharacters.storyId, storyId));
  }

  async createStoryCharacter(characterData: InsertStoryCharacter): Promise<StoryCharacter> {
    const [character] = await db.insert(storyCharacters).values(characterData).returning();
    return character;
  }

  async updateStoryCharacter(id: number, characterData: Partial<InsertStoryCharacter>): Promise<void> {
    await db.update(storyCharacters).set(characterData).where(eq(storyCharacters.id, id));
  }

  async deleteStoryCharacter(id: number): Promise<void> {
    await db.delete(storyCharacters).where(eq(storyCharacters.id, id));
  }

  // Story Emotions operations
  async getStoryEmotions(storyId: number): Promise<StoryEmotion[]> {
    return await db.select().from(storyEmotions).where(eq(storyEmotions.storyId, storyId));
  }

  async createStoryEmotion(emotionData: InsertStoryEmotion): Promise<StoryEmotion> {
    const [emotion] = await db.insert(storyEmotions).values(emotionData).returning();
    return emotion;
  }

  async updateStoryEmotion(id: number, emotionData: Partial<InsertStoryEmotion>): Promise<void> {
    await db.update(storyEmotions).set(emotionData).where(eq(storyEmotions.id, id));
  }

  async deleteStoryEmotion(id: number): Promise<void> {
    await db.delete(storyEmotions).where(eq(storyEmotions.id, id));
  }

  // Character operations
  async getCharacters(): Promise<Character[]> {
    return await db.select().from(characters);
  }

  async getCharacter(id: number): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    return character || undefined;
  }

  async createCharacter(characterData: InsertCharacter, userId?: string): Promise<Character> {
    const [character] = await db.insert(characters).values({
      ...characterData,
      createdById: userId || null,
    }).returning();
    return character;
  }

  async updateCharacterStats(id: number, likes?: number, chats?: number): Promise<void> {
    const updateData: any = {};
    if (likes !== undefined) updateData.likes = likes;
    if (chats !== undefined) updateData.chats = chats;
    
    if (Object.keys(updateData).length > 0) {
      await db.update(characters).set(updateData).where(eq(characters.id, id));
    }
  }

  // Conversation operations
  async getConversations(userId: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.userId, userId));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(conversationData).returning();
    return conversation;
  }

  // Message operations
  async getMessages(conversationId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.conversationId, conversationId));
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(messageData).returning();
    return message;
  }

  // Story Collaborations
  async getStoryCollaborations(storyId: number): Promise<StoryCollaboration[]> {
    return await db.select().from(storyCollaborations).where(eq(storyCollaborations.storyId, storyId));
  }

  async getUserCollaborations(userId: string): Promise<StoryCollaboration[]> {
    return await db.select().from(storyCollaborations).where(eq(storyCollaborations.invitedUserId, userId));
  }

  async createStoryCollaboration(collaborationData: InsertStoryCollaboration): Promise<StoryCollaboration> {
    const [collaboration] = await db
      .insert(storyCollaborations)
      .values(collaborationData)
      .returning();
    return collaboration;
  }

  async updateStoryCollaboration(id: number, collaborationData: Partial<InsertStoryCollaboration>): Promise<void> {
    await db
      .update(storyCollaborations)
      .set(collaborationData)
      .where(eq(storyCollaborations.id, id));
  }

  async deleteStoryCollaboration(id: number): Promise<void> {
    await db.delete(storyCollaborations).where(eq(storyCollaborations.id, id));
  }

  // Story Groups
  async getStoryGroups(storyId: number): Promise<StoryGroup[]> {
    return await db.select().from(storyGroups).where(eq(storyGroups.storyId, storyId));
  }

  async getStoryGroup(id: number): Promise<StoryGroup | undefined> {
    const [group] = await db.select().from(storyGroups).where(eq(storyGroups.id, id));
    return group;
  }

  async createStoryGroup(groupData: InsertStoryGroup): Promise<StoryGroup> {
    const [group] = await db
      .insert(storyGroups)
      .values(groupData)
      .returning();
    return group;
  }

  async updateStoryGroup(id: number, groupData: Partial<InsertStoryGroup>): Promise<void> {
    await db
      .update(storyGroups)
      .set(groupData)
      .where(eq(storyGroups.id, id));
  }

  async deleteStoryGroup(id: number): Promise<void> {
    await db.delete(storyGroups).where(eq(storyGroups.id, id));
  }

  async getStoryGroupByInviteCode(inviteCode: string): Promise<StoryGroup | undefined> {
    const [group] = await db.select().from(storyGroups).where(eq(storyGroups.inviteCode, inviteCode));
    return group;
  }

  // Story Group Members
  async getStoryGroupMembers(groupId: number): Promise<StoryGroupMember[]> {
    return await db.select().from(storyGroupMembers).where(eq(storyGroupMembers.groupId, groupId));
  }

  async createStoryGroupMember(memberData: InsertStoryGroupMember): Promise<StoryGroupMember> {
    const [member] = await db
      .insert(storyGroupMembers)
      .values(memberData)
      .returning();
    return member;
  }

  async updateStoryGroupMember(id: number, memberData: Partial<InsertStoryGroupMember>): Promise<void> {
    await db
      .update(storyGroupMembers)
      .set(memberData)
      .where(eq(storyGroupMembers.id, id));
  }

  async deleteStoryGroupMember(id: number): Promise<void> {
    await db.delete(storyGroupMembers).where(eq(storyGroupMembers.id, id));
  }

  // Character Voice Assignments
  async getCharacterVoiceAssignments(storyId: number): Promise<CharacterVoiceAssignment[]> {
    return await db.select().from(characterVoiceAssignments).where(eq(characterVoiceAssignments.storyId, storyId));
  }

  async getUserCharacterVoiceAssignment(storyId: number, userId: string): Promise<CharacterVoiceAssignment | undefined> {
    const [assignment] = await db
      .select()
      .from(characterVoiceAssignments)
      .where(and(
        eq(characterVoiceAssignments.storyId, storyId),
        eq(characterVoiceAssignments.userId, userId)
      ));
    return assignment;
  }

  async createCharacterVoiceAssignment(assignmentData: InsertCharacterVoiceAssignment): Promise<CharacterVoiceAssignment> {
    const [assignment] = await db
      .insert(characterVoiceAssignments)
      .values(assignmentData)
      .returning();
    return assignment;
  }

  async updateCharacterVoiceAssignment(id: number, assignmentData: Partial<InsertCharacterVoiceAssignment>): Promise<void> {
    await db
      .update(characterVoiceAssignments)
      .set(assignmentData)
      .where(eq(characterVoiceAssignments.id, id));
  }

  async deleteCharacterVoiceAssignment(id: number): Promise<void> {
    await db.delete(characterVoiceAssignments).where(eq(characterVoiceAssignments.id, id));
  }

  // Story Playbacks
  async getStoryPlaybacks(storyId: number): Promise<StoryPlayback[]> {
    return await db.select().from(storyPlaybacks).where(eq(storyPlaybacks.storyId, storyId)).orderBy(desc(storyPlaybacks.createdAt));
  }

  async getStoryPlayback(id: number): Promise<StoryPlayback | undefined> {
    const [playback] = await db.select().from(storyPlaybacks).where(eq(storyPlaybacks.id, id));
    return playback;
  }

  async createStoryPlayback(playbackData: InsertStoryPlayback): Promise<StoryPlayback> {
    const [playback] = await db
      .insert(storyPlaybacks)
      .values(playbackData)
      .returning();
    return playback;
  }

  async updateStoryPlayback(id: number, playbackData: Partial<InsertStoryPlayback>): Promise<void> {
    await db
      .update(storyPlaybacks)
      .set(playbackData)
      .where(eq(storyPlaybacks.id, id));
  }

  async deleteStoryPlayback(id: number): Promise<void> {
    await db.delete(storyPlaybacks).where(eq(storyPlaybacks.id, id));
  }

  // Story User Confidence operations
  async getStoryUserConfidence(storyId: number, userId: string): Promise<StoryUserConfidence | undefined> {
    const results = await db
      .select()
      .from(storyUserConfidence)
      .where(and(
        eq(storyUserConfidence.storyId, storyId),
        eq(storyUserConfidence.userId, userId)
      ));
    return results[0];
  }

  async createStoryUserConfidence(confidenceData: InsertStoryUserConfidence): Promise<StoryUserConfidence> {
    const results = await db
      .insert(storyUserConfidence)
      .values(confidenceData)
      .returning();
    return results[0];
  }

  async updateStoryUserConfidence(storyId: number, userId: string, updates: Partial<InsertStoryUserConfidence>): Promise<void> {
    await db
      .update(storyUserConfidence)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(storyUserConfidence.storyId, storyId),
        eq(storyUserConfidence.userId, userId)
      ));
  }

  async incrementConfidenceMetric(
    storyId: number, 
    userId: string, 
    metric: 'totalInteractions' | 'voiceRecordingsCompleted' | 'emotionsRecorded' | 'playbacksCompleted',
    timeSpentSeconds?: number
  ): Promise<void> {
    // Get or create confidence record
    let confidence = await this.getStoryUserConfidence(storyId, userId);
    
    if (!confidence) {
      confidence = await this.createStoryUserConfidence({
        storyId,
        userId,
        totalInteractions: 0,
        voiceRecordingsCompleted: 0,
        emotionsRecorded: 0,
        playbacksCompleted: 0,
        timeSpentSeconds: 0,
        voiceConfidence: 0,
        storyEngagement: 0,
        overallConfidence: 0,
        sessionCount: 1,
        lastInteractionAt: new Date(),
        firstInteractionAt: new Date(),
      });
    }

    // Increment the specific metric
    const updates: Partial<InsertStoryUserConfidence> = {
      [metric]: (confidence[metric] || 0) + 1,
      lastInteractionAt: new Date(),
    };

    // Add time spent if provided
    if (timeSpentSeconds !== undefined) {
      updates.timeSpentSeconds = (confidence.timeSpentSeconds || 0) + timeSpentSeconds;
    }

    // Calculate confidence scores based on metrics
    const newVoiceConfidence = Math.min(100, (updates.voiceRecordingsCompleted || confidence.voiceRecordingsCompleted || 0) * 25);
    const newStoryEngagement = Math.min(100, 
      ((updates.playbacksCompleted || confidence.playbacksCompleted || 0) * 20) +
      (Math.min(60, (updates.timeSpentSeconds || confidence.timeSpentSeconds || 0) / 60) * 1.5)
    );
    const newOverallConfidence = Math.round((newVoiceConfidence + newStoryEngagement) / 2);

    updates.voiceConfidence = newVoiceConfidence;
    updates.storyEngagement = newStoryEngagement;
    updates.overallConfidence = newOverallConfidence;

    await this.updateStoryUserConfidence(storyId, userId, updates);
  }
}

export const storage = new DatabaseStorage();
