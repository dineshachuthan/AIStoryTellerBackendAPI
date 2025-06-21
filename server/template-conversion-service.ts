import { collaborativeRoleplayStorage } from "./collaborative-roleplay-storage";
import { storage } from "./storage";
import { generateRolePlayAnalysis } from "./roleplay-analysis";
import type { RolePlayAnalysis } from "./roleplay-analysis";
import type { Story } from "@shared/schema";

export interface TemplateConversionResult {
  templateId: number;
  characterRoles: Array<{
    id: number;
    name: string;
    description: string;
    requiredEmotions: Array<{
      emotion: string;
      intensity: number;
      sampleCount: number;
    }>;
  }>;
  sceneCount: number;
  estimatedDuration: number;
}

export class TemplateConversionService {
  
  /**
   * Convert an existing story with roleplay analysis into a template
   */
  async convertStoryToTemplate(
    storyId: number, 
    userId: string,
    makePublic: boolean = true
  ): Promise<TemplateConversionResult> {
    
    // Get the original story
    const story = await storage.getStory(storyId);
    if (!story) {
      throw new Error("Story not found");
    }
    
    // Generate roleplay analysis if not exists
    let roleplayAnalysis: RolePlayAnalysis;
    try {
      roleplayAnalysis = await generateRolePlayAnalysis(story.content, story.title);
    } catch (error) {
      throw new Error(`Failed to generate roleplay analysis: ${error.message}`);
    }
    
    // Create the story template
    const template = await collaborativeRoleplayStorage.createTemplate({
      originalStoryId: storyId,
      title: roleplayAnalysis.title || story.title,
      description: `${roleplayAnalysis.genre} story with ${roleplayAnalysis.totalScenes} scenes`,
      genre: roleplayAnalysis.genre,
      tags: [roleplayAnalysis.genre, roleplayAnalysis.overallTone],
      isPublic: makePublic,
      allowRemixes: true,
      allowInstances: true,
      createdByUserId: userId,
      templateVersion: 1,
    });
    
    // Create character roles from analysis
    const characterRoles = [];
    for (const character of roleplayAnalysis.characters) {
      const requiredEmotions = this.extractRequiredEmotions(roleplayAnalysis, character.name);
      
      const role = await collaborativeRoleplayStorage.createCharacterRole({
        templateId: template.id,
        remixId: null,
        characterName: character.name,
        characterDescription: character.personality,
        personality: character.personality,
        role: character.role as any,
        appearance: character.costumeSuggestion || null,
        traits: [character.personality],
        dialogueCount: this.countCharacterDialogue(roleplayAnalysis, character.name),
        estimatedRecordingTime: this.estimateRecordingTime(roleplayAnalysis, character.name),
        requiredEmotions: requiredEmotions,
        aiVoiceDefault: character.voiceProfile,
      });
      
      characterRoles.push({
        id: role.id,
        name: role.characterName,
        description: role.characterDescription || "",
        requiredEmotions: requiredEmotions
      });
    }
    
    // Create scene dialogues and backgrounds
    await this.createSceneData(template.id, roleplayAnalysis, characterRoles);
    
    return {
      templateId: template.id,
      characterRoles,
      sceneCount: roleplayAnalysis.totalScenes,
      estimatedDuration: roleplayAnalysis.estimatedPlaytime * 60 // convert to seconds
    };
  }
  
  /**
   * Create an instance from a template for collaborative recording
   */
  async createInstanceFromTemplate(
    templateId: number,
    instanceTitle: string,
    userId: string,
    isPublic: boolean = false
  ): Promise<{
    instanceId: number;
    participantSlots: Array<{
      characterName: string;
      participantId: number;
      invitationToken: string | null;
    }>;
  }> {
    
    // Create the instance
    const instance = await collaborativeRoleplayStorage.createInstance({
      templateId,
      instanceTitle,
      description: `Collaborative recording of ${instanceTitle}`,
      createdByUserId: userId,
      status: "draft",
      isPublic,
      allowCollaborators: true,
      estimatedDuration: null,
      completionPercentage: 0,
    });
    
    // Get character roles for this template
    const characterRoles = await collaborativeRoleplayStorage.getTemplateCharacterRoles(templateId);
    
    // Create participant slots for each character
    const participantSlots = [];
    for (const role of characterRoles) {
      const participant = await collaborativeRoleplayStorage.createParticipant({
        instanceId: instance.id,
        characterRoleId: role.id,
        userId: null, // Will be assigned when invited/accepted
        assignmentType: "invited",
        invitationToken: collaborativeRoleplayStorage.generateInvitationToken(),
        invitationStatus: "pending",
        recordingProgress: 0,
      });
      
      participantSlots.push({
        characterName: role.characterName,
        participantId: participant.id,
        invitationToken: participant.invitationToken,
      });
    }
    
    return {
      instanceId: instance.id,
      participantSlots
    };
  }
  
  private extractRequiredEmotions(analysis: RolePlayAnalysis, characterName: string): Array<{
    emotion: string;
    intensity: number;
    sampleCount: number;
  }> {
    const emotions = new Map<string, { intensity: number; count: number }>();
    
    // Scan all scenes for this character's emotions
    for (const scene of analysis.scenes) {
      for (const dialogue of scene.dialogueSequence) {
        if (dialogue.characterName === characterName) {
          const key = dialogue.emotion.toLowerCase();
          const existing = emotions.get(key);
          if (existing) {
            existing.intensity = Math.max(existing.intensity, dialogue.intensity);
            existing.count++;
          } else {
            emotions.set(key, { intensity: dialogue.intensity, count: 1 });
          }
        }
      }
    }
    
    // Convert to required format
    return Array.from(emotions.entries()).map(([emotion, data]) => ({
      emotion,
      intensity: data.intensity,
      sampleCount: Math.min(data.count, 5) // Cap at 5 samples per emotion
    }));
  }
  
  private countCharacterDialogue(analysis: RolePlayAnalysis, characterName: string): number {
    let count = 0;
    for (const scene of analysis.scenes) {
      for (const dialogue of scene.dialogueSequence) {
        if (dialogue.characterName === characterName) {
          count++;
        }
      }
    }
    return count;
  }
  
  private estimateRecordingTime(analysis: RolePlayAnalysis, characterName: string): number {
    let totalWords = 0;
    for (const scene of analysis.scenes) {
      for (const dialogue of scene.dialogueSequence) {
        if (dialogue.characterName === characterName) {
          totalWords += dialogue.dialogue.split(' ').length;
        }
      }
    }
    // Estimate 150 words per minute, plus time for multiple takes
    return Math.ceil((totalWords / 150) * 60 * 2); // 2x for retakes
  }
  
  private async createSceneData(
    templateId: number, 
    analysis: RolePlayAnalysis, 
    characterRoles: Array<{id: number; name: string}>
  ): Promise<void> {
    
    const roleMap = new Map(characterRoles.map(r => [r.name, r.id]));
    
    for (const scene of analysis.scenes) {
      // Create scene background
      await collaborativeRoleplayStorage.createSceneBackground({
        templateId,
        remixId: null,
        sceneNumber: scene.sceneNumber,
        location: scene.background.location,
        timeOfDay: scene.background.timeOfDay,
        atmosphere: scene.background.atmosphere,
        visualDescription: scene.background.visualDescription,
        soundscape: scene.background.soundscape || null,
        lighting: scene.background.lighting || null,
        backgroundImageUrl: null,
        isCustomized: false,
      });
      
      // Create dialogue sequences
      for (let i = 0; i < scene.dialogueSequence.length; i++) {
        const dialogue = scene.dialogueSequence[i];
        const characterRoleId = roleMap.get(dialogue.characterName);
        
        if (characterRoleId) {
          await collaborativeRoleplayStorage.createSceneDialogue({
            templateId,
            remixId: null,
            sceneNumber: scene.sceneNumber,
            sequenceNumber: i + 1,
            characterRoleId,
            dialogueText: dialogue.dialogue,
            emotion: dialogue.emotion,
            intensity: dialogue.intensity,
            stageDirection: dialogue.action || null,
            estimatedDuration: Math.ceil(dialogue.dialogue.split(' ').length / 2.5), // ~150 wpm
          });
        }
      }
    }
  }
}

export const templateConversionService = new TemplateConversionService();