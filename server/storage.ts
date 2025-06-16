import { users, localUsers, userVoiceSamples, stories, storyCharacters, storyEmotions, characters, conversations, messages, type User, type UpsertUser, type UserVoiceSample, type InsertUserVoiceSample, type Story, type InsertStory, type StoryCharacter, type InsertStoryCharacter, type StoryEmotion, type InsertStoryEmotion, type Character, type InsertCharacter, type Conversation, type InsertConversation, type Message, type InsertMessage } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(userId: string, passwordHash: string): Promise<void>;
  getLocalUser(userId: string): Promise<{ passwordHash: string } | undefined>;
  
  // User Voice Samples
  getUserVoiceSamples(userId: string): Promise<UserVoiceSample[]>;
  getUserVoiceSample(userId: string, label: string): Promise<UserVoiceSample | undefined>;
  createUserVoiceSample(sample: InsertUserVoiceSample): Promise<UserVoiceSample>;
  updateUserVoiceSample(id: number, sample: Partial<InsertUserVoiceSample>): Promise<void>;
  deleteUserVoiceSample(id: number): Promise<void>;
  getUserVoiceProgress(userId: string): Promise<{ completed: number; total: number; percentage: number }>;
  
  // Stories
  getStories(): Promise<Story[]>;
  getUserStories(userId: string): Promise<Story[]>;
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

  async createLocalUser(userId: string, passwordHash: string): Promise<void> {
    await db.insert(localUsers).values({
      userId,
      passwordHash,
    });
  }

  async getLocalUser(userId: string): Promise<{ passwordHash: string } | undefined> {
    const [localUser] = await db.select().from(localUsers).where(eq(localUsers.userId, userId));
    return localUser ? { passwordHash: localUser.passwordHash } : undefined;
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
  async getStories(): Promise<Story[]> {
    return await db.select().from(stories).where(eq(stories.isPublished, true));
  }

  async getUserStories(userId: string): Promise<Story[]> {
    return await db.select().from(stories).where(eq(stories.authorId, userId));
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
}

export const storage = new DatabaseStorage();
