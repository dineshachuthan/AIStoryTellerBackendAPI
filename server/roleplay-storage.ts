import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and, desc, asc } from 'drizzle-orm';
import { pool, withRetry } from './db';
import { stories } from '@shared/schema';
import {
  rolePlayProjects,
  rolePlayScenes,
  rolePlayCharacters,
  rolePlayDialogues,
  rolePlayProductions,
  rolePlayPerformances,
  rolePlayTemplates,
  type RolePlayProject,
  type RolePlayScene,
  type RolePlayCharacter,
  type RolePlayDialogue,
  type InsertRolePlayProject,
  type InsertRolePlayScene,
  type InsertRolePlayCharacter,
  type InsertRolePlayDialogue,
} from '@shared/roleplay-schema';

const rpDb = drizzle({ client: pool, schema: {
  stories,
  rolePlayProjects,
  rolePlayScenes,
  rolePlayCharacters,
  rolePlayDialogues,
  rolePlayProductions,
  rolePlayPerformances,
  rolePlayTemplates,
}});

export class RolePlayStorage {
  
  // Project Management
  async createProject(data: InsertRolePlayProject): Promise<RolePlayProject> {
    return withRetry(async () => {
      const [project] = await rpDb.insert(rolePlayProjects)
        .values(data)
        .returning();
      return project;
    });
  }

  async getProject(projectId: number): Promise<RolePlayProject | null> {
    return withRetry(async () => {
      const [project] = await rpDb.select()
        .from(rolePlayProjects)
        .where(eq(rolePlayProjects.id, projectId));
      return project || null;
    });
  }

  async getUserProjects(userId: string): Promise<RolePlayProject[]> {
    return withRetry(async () => {
      return rpDb.select()
        .from(rolePlayProjects)
        .where(eq(rolePlayProjects.authorId, userId))
        .orderBy(desc(rolePlayProjects.updatedAt));
    });
  }

  async updateProject(projectId: number, updates: Partial<InsertRolePlayProject>): Promise<RolePlayProject> {
    return withRetry(async () => {
      const [updated] = await rpDb.update(rolePlayProjects)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(rolePlayProjects.id, projectId))
        .returning();
      return updated;
    });
  }

  async deleteProject(projectId: number): Promise<void> {
    return withRetry(async () => {
      // Delete in reverse dependency order
      await rpDb.delete(rolePlayDialogues)
        .where(eq(rolePlayDialogues.sceneId, projectId));
      await rpDb.delete(rolePlayScenes)
        .where(eq(rolePlayScenes.projectId, projectId));
      await rpDb.delete(rolePlayCharacters)
        .where(eq(rolePlayCharacters.projectId, projectId));
      await rpDb.delete(rolePlayProjects)
        .where(eq(rolePlayProjects.id, projectId));
    });
  }

  // Scene Management
  async createScene(data: InsertRolePlayScene): Promise<RolePlayScene> {
    return withRetry(async () => {
      const [scene] = await rpDb.insert(rolePlayScenes)
        .values(data)
        .returning();
      return scene;
    });
  }

  async getProjectScenes(projectId: number): Promise<RolePlayScene[]> {
    return withRetry(async () => {
      return rpDb.select()
        .from(rolePlayScenes)
        .where(eq(rolePlayScenes.projectId, projectId))
        .orderBy(asc(rolePlayScenes.sceneNumber));
    });
  }

  async updateScene(sceneId: number, updates: Partial<InsertRolePlayScene>): Promise<RolePlayScene> {
    return withRetry(async () => {
      const [updated] = await rpDb.update(rolePlayScenes)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(rolePlayScenes.id, sceneId))
        .returning();
      return updated;
    });
  }

  async deleteScene(sceneId: number): Promise<void> {
    return withRetry(async () => {
      await rpDb.delete(rolePlayDialogues)
        .where(eq(rolePlayDialogues.sceneId, sceneId));
      await rpDb.delete(rolePlayScenes)
        .where(eq(rolePlayScenes.id, sceneId));
    });
  }

  // Character Management
  async createCharacter(data: InsertRolePlayCharacter): Promise<RolePlayCharacter> {
    return withRetry(async () => {
      const [character] = await rpDb.insert(rolePlayCharacters)
        .values(data)
        .returning();
      return character;
    });
  }

  async getProjectCharacters(projectId: number): Promise<RolePlayCharacter[]> {
    return withRetry(async () => {
      return rpDb.select()
        .from(rolePlayCharacters)
        .where(eq(rolePlayCharacters.projectId, projectId))
        .orderBy(asc(rolePlayCharacters.name));
    });
  }

  async updateCharacter(characterId: number, updates: Partial<InsertRolePlayCharacter>): Promise<RolePlayCharacter> {
    return withRetry(async () => {
      const [updated] = await rpDb.update(rolePlayCharacters)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(rolePlayCharacters.id, characterId))
        .returning();
      return updated;
    });
  }

  async deleteCharacter(characterId: number): Promise<void> {
    return withRetry(async () => {
      await rpDb.delete(rolePlayDialogues)
        .where(eq(rolePlayDialogues.characterId, characterId));
      await rpDb.delete(rolePlayCharacters)
        .where(eq(rolePlayCharacters.id, characterId));
    });
  }

  // Dialogue Management
  async createDialogue(data: InsertRolePlayDialogue): Promise<RolePlayDialogue> {
    return withRetry(async () => {
      const [dialogue] = await rpDb.insert(rolePlayDialogues)
        .values(data)
        .returning();
      return dialogue;
    });
  }

  async getSceneDialogues(sceneId: number): Promise<RolePlayDialogue[]> {
    return withRetry(async () => {
      return rpDb.select()
        .from(rolePlayDialogues)
        .where(eq(rolePlayDialogues.sceneId, sceneId))
        .orderBy(asc(rolePlayDialogues.sequenceOrder));
    });
  }

  async updateDialogue(dialogueId: number, updates: Partial<InsertRolePlayDialogue>): Promise<RolePlayDialogue> {
    return withRetry(async () => {
      const [updated] = await rpDb.update(rolePlayDialogues)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(rolePlayDialogues.id, dialogueId))
        .returning();
      return updated;
    });
  }

  async deleteDialogue(dialogueId: number): Promise<void> {
    return withRetry(async () => {
      await rpDb.delete(rolePlayDialogues)
        .where(eq(rolePlayDialogues.id, dialogueId));
    });
  }

  // Complex queries
  async getCompleteProject(projectId: number): Promise<{
    project: RolePlayProject;
    scenes: Array<RolePlayScene & { dialogues: RolePlayDialogue[] }>;
    characters: RolePlayCharacter[];
  } | null> {
    return withRetry(async () => {
      const project = await this.getProject(projectId);
      if (!project) return null;

      const [scenes, characters] = await Promise.all([
        this.getProjectScenes(projectId),
        this.getProjectCharacters(projectId)
      ]);

      const scenesWithDialogues = await Promise.all(
        scenes.map(async (scene) => ({
          ...scene,
          dialogues: await this.getSceneDialogues(scene.id)
        }))
      );

      return {
        project,
        scenes: scenesWithDialogues,
        characters
      };
    });
  }

  async saveCompleteRolePlay(
    userId: string,
    title: string,
    storyContent: string,
    rolePlayData: any
  ): Promise<number> {
    return withRetry(async () => {
      // Create project
      const project = await this.createProject({
        title,
        originalStoryContent: storyContent,
        genre: rolePlayData.genre,
        overallTone: rolePlayData.overallTone,
        totalScenes: rolePlayData.totalScenes,
        estimatedPlaytime: rolePlayData.estimatedPlaytime,
        authorId: userId,
      });

      // Create characters
      const characterMap = new Map<string, number>();
      for (const char of rolePlayData.characters) {
        const character = await this.createCharacter({
          projectId: project.id,
          name: char.name,
          role: char.role,
          personality: char.personality,
          voiceProfile: char.voiceProfile,
          costumeSuggestion: char.costumeSuggestion,
        });
        characterMap.set(char.name, character.id);
      }

      // Create scenes and dialogues
      for (const sceneData of rolePlayData.scenes) {
        const scene = await this.createScene({
          projectId: project.id,
          sceneNumber: sceneData.sceneNumber,
          title: sceneData.title,
          emotionalTone: sceneData.emotionalTone,
          estimatedDuration: sceneData.estimatedDuration,
          location: sceneData.background.location,
          timeOfDay: sceneData.background.timeOfDay,
          atmosphere: sceneData.background.atmosphere,
          visualDescription: sceneData.background.visualDescription,
          soundscape: sceneData.background.soundscape,
          lighting: sceneData.background.lighting,
          stageDirections: sceneData.stageDirections,
        });

        // Create dialogues
        for (let i = 0; i < sceneData.dialogueSequence.length; i++) {
          const dialogue = sceneData.dialogueSequence[i];
          const characterId = characterMap.get(dialogue.characterName);
          
          if (characterId) {
            await this.createDialogue({
              sceneId: scene.id,
              characterId,
              sequenceOrder: i + 1,
              dialogue: dialogue.dialogue,
              emotion: dialogue.emotion,
              intensity: dialogue.intensity,
              action: dialogue.action,
            });
          }
        }
      }

      return project.id;
    });
  }
}

export const rolePlayStorage = new RolePlayStorage();