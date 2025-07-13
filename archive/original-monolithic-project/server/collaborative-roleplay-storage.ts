import { 
  storyTemplates, storyInstances, storyRemixes, characterRoles, 
  instanceParticipants, characterMediaSubmissions, sceneDialogues, 
  sceneBackgrounds, videoGenerationJobs, versionLineage,
  type StoryTemplate, type InsertStoryTemplate,
  type StoryInstance, type InsertStoryInstance,
  type StoryRemix, type InsertStoryRemix,
  type CharacterRole, type InsertCharacterRole,
  type InstanceParticipant, type InsertInstanceParticipant,
  type CharacterMediaSubmission, type InsertCharacterMediaSubmission,
  type SceneDialogue, type InsertSceneDialogue,
  type SceneBackground, type InsertSceneBackground,
  type VideoGenerationJob, type InsertVideoGenerationJob,
  type VersionLineage, type InsertVersionLineage
} from '@shared/schema/schema';
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

export interface IRoleplayStorage {
  // Template Management
  createTemplate(template: InsertStoryTemplate): Promise<StoryTemplate>;
  getTemplate(templateId: number): Promise<StoryTemplate | null>;
  getPublicTemplates(): Promise<StoryTemplate[]>;
  getUserTemplates(userId: string): Promise<StoryTemplate[]>;
  
  // Instance Management
  createInstance(instance: InsertStoryInstance): Promise<StoryInstance>;
  getInstance(instanceId: number): Promise<StoryInstance | null>;
  getUserInstances(userId: string): Promise<StoryInstance[]>;
  updateInstance(instanceId: number, updates: Partial<InsertStoryInstance>): Promise<StoryInstance>;
  
  // Character Role Management
  createCharacterRole(role: InsertCharacterRole): Promise<CharacterRole>;
  getTemplateCharacterRoles(templateId: number): Promise<CharacterRole[]>;
  getRemixCharacterRoles(remixId: number): Promise<CharacterRole[]>;
  
  // Participant Management
  createParticipant(participant: InsertInstanceParticipant): Promise<InstanceParticipant>;
  getInstanceParticipants(instanceId: number): Promise<InstanceParticipant[]>;
  getParticipantByToken(token: string): Promise<InstanceParticipant | null>;
  updateParticipant(participantId: number, updates: Partial<InsertInstanceParticipant>): Promise<InstanceParticipant>;
  
  // Media Submission Management
  createMediaSubmission(submission: InsertCharacterMediaSubmission): Promise<CharacterMediaSubmission>;
  getParticipantMedia(participantId: number): Promise<CharacterMediaSubmission[]>;
  
  // Scene Management
  createSceneDialogue(dialogue: InsertSceneDialogue): Promise<SceneDialogue>;
  createSceneBackground(background: InsertSceneBackground): Promise<SceneBackground>;
  getTemplateScenes(templateId: number): Promise<{
    dialogues: SceneDialogue[];
    backgrounds: SceneBackground[];
  }>;
  
  // Video Generation Queue
  createVideoJob(job: InsertVideoGenerationJob): Promise<VideoGenerationJob>;
  getQueuedVideoJobs(): Promise<VideoGenerationJob[]>;
  updateVideoJob(jobId: number, updates: Partial<InsertVideoGenerationJob>): Promise<VideoGenerationJob>;
  
  // Invitation System
  generateInvitationToken(): string;
}

export class CollaborativeRoleplayStorage implements IRoleplayStorage {
  
  // Template Management
  async createTemplate(template: InsertStoryTemplate): Promise<StoryTemplate> {
    const [result] = await db.insert(storyTemplates).values(template).returning();
    return result;
  }
  
  async getTemplate(templateId: number): Promise<StoryTemplate | null> {
    const [template] = await db
      .select()
      .from(storyTemplates)
      .where(eq(storyTemplates.id, templateId));
    return template || null;
  }
  
  async getPublicTemplates(): Promise<StoryTemplate[]> {
    return await db
      .select()
      .from(storyTemplates)
      .where(eq(storyTemplates.isPublic, true))
      .orderBy(desc(storyTemplates.createdAt));
  }
  
  async getUserTemplates(userId: string): Promise<StoryTemplate[]> {
    return await db
      .select()
      .from(storyTemplates)
      .where(eq(storyTemplates.createdByUserId, userId))
      .orderBy(desc(storyTemplates.createdAt));
  }
  
  // Instance Management
  async createInstance(instance: InsertStoryInstance): Promise<StoryInstance> {
    const [result] = await db.insert(storyInstances).values(instance).returning();
    return result;
  }
  
  async getInstance(instanceId: number): Promise<StoryInstance | null> {
    const [instance] = await db
      .select()
      .from(storyInstances)
      .where(eq(storyInstances.id, instanceId));
    return instance || null;
  }
  
  async getUserInstances(userId: string): Promise<StoryInstance[]> {
    return await db
      .select()
      .from(storyInstances)
      .where(eq(storyInstances.createdByUserId, userId))
      .orderBy(desc(storyInstances.createdAt));
  }
  
  async updateInstance(instanceId: number, updates: Partial<InsertStoryInstance>): Promise<StoryInstance> {
    const [result] = await db
      .update(storyInstances)
      .set(updates)
      .where(eq(storyInstances.id, instanceId))
      .returning();
    return result;
  }
  
  // Character Role Management
  async createCharacterRole(role: InsertCharacterRole): Promise<CharacterRole> {
    const [result] = await db.insert(characterRoles).values(role).returning();
    return result;
  }
  
  async getTemplateCharacterRoles(templateId: number): Promise<CharacterRole[]> {
    return await db
      .select()
      .from(characterRoles)
      .where(eq(characterRoles.templateId, templateId));
  }
  
  async getRemixCharacterRoles(remixId: number): Promise<CharacterRole[]> {
    return await db
      .select()
      .from(characterRoles)
      .where(eq(characterRoles.remixId, remixId));
  }
  
  // Participant Management
  async createParticipant(participant: InsertInstanceParticipant): Promise<InstanceParticipant> {
    const [result] = await db.insert(instanceParticipants).values(participant).returning();
    return result;
  }
  
  async getInstanceParticipants(instanceId: number): Promise<InstanceParticipant[]> {
    return await db
      .select()
      .from(instanceParticipants)
      .where(eq(instanceParticipants.instanceId, instanceId));
  }
  
  async getParticipantByToken(token: string): Promise<InstanceParticipant | null> {
    const [participant] = await db
      .select()
      .from(instanceParticipants)
      .where(eq(instanceParticipants.invitationToken, token));
    return participant || null;
  }
  
  async updateParticipant(participantId: number, updates: Partial<InsertInstanceParticipant>): Promise<InstanceParticipant> {
    const [result] = await db
      .update(instanceParticipants)
      .set(updates)
      .where(eq(instanceParticipants.id, participantId))
      .returning();
    return result;
  }
  
  // Media Submission Management
  async createMediaSubmission(submission: InsertCharacterMediaSubmission): Promise<CharacterMediaSubmission> {
    const [result] = await db.insert(characterMediaSubmissions).values(submission).returning();
    return result;
  }
  
  async getParticipantMedia(participantId: number): Promise<CharacterMediaSubmission[]> {
    return await db
      .select()
      .from(characterMediaSubmissions)
      .where(eq(characterMediaSubmissions.participantId, participantId));
  }
  
  // Scene Management
  async createSceneDialogue(dialogue: InsertSceneDialogue): Promise<SceneDialogue> {
    const [result] = await db.insert(sceneDialogues).values(dialogue).returning();
    return result;
  }
  
  async createSceneBackground(background: InsertSceneBackground): Promise<SceneBackground> {
    const [result] = await db.insert(sceneBackgrounds).values(background).returning();
    return result;
  }
  
  async getTemplateScenes(templateId: number): Promise<{
    dialogues: SceneDialogue[];
    backgrounds: SceneBackground[];
  }> {
    const [dialogues, backgrounds] = await Promise.all([
      db.select().from(sceneDialogues).where(eq(sceneDialogues.templateId, templateId)),
      db.select().from(sceneBackgrounds).where(eq(sceneBackgrounds.templateId, templateId))
    ]);
    
    return { dialogues, backgrounds };
  }
  
  // Video Generation Queue
  async createVideoJob(job: InsertVideoGenerationJob): Promise<VideoGenerationJob> {
    const [result] = await db.insert(videoGenerationJobs).values(job).returning();
    return result;
  }
  
  async getQueuedVideoJobs(): Promise<VideoGenerationJob[]> {
    return await db
      .select()
      .from(videoGenerationJobs)
      .where(eq(videoGenerationJobs.status, "queued"))
      .orderBy(desc(videoGenerationJobs.priority), videoGenerationJobs.createdAt);
  }
  
  async updateVideoJob(jobId: number, updates: Partial<InsertVideoGenerationJob>): Promise<VideoGenerationJob> {
    const [result] = await db
      .update(videoGenerationJobs)
      .set(updates)
      .where(eq(videoGenerationJobs.id, jobId))
      .returning();
    return result;
  }
  
  // Invitation System
  generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

export const collaborativeRoleplayStorage = new CollaborativeRoleplayStorage();