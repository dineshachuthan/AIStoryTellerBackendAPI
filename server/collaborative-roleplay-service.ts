import { storage } from "./storage";
import { generateRolePlayAnalysis } from "./roleplay-analysis";
import type { RolePlayAnalysis } from "./roleplay-analysis";
import { 
  getCollaborativeConfig, 
  getDefaultEmotionsForCharacter, 
  getProgressThreshold,
  type CollaborativeConfig 
} from "@shared/collaborative-config";
import {
  CollaborativeValidator,
  CollaborativePermissionManager,
  CollaborativeTokenManager,
  CollaborativeProgressCalculator,
  CollaborativeNotificationManager,
  CollaborativeServiceFactory
} from "./collaborative-utils";

export interface CollaborativeTemplate {
  id: number;
  originalStoryId: number;
  title: string;
  description: string;
  genre: string;
  characterRoles: Array<{
    name: string;
    description: string;
    personality: string;
    role: string;
    requiredEmotions: Array<{
      emotion: string;
      intensity: number;
      sampleCount: number;
    }>;
    aiVoiceDefault: string;
  }>;
  sceneCount: number;
  estimatedDuration: number;
  createdBy: string;
  isPublic: boolean;
  createdAt: Date;
}

export interface CollaborativeInstance {
  id: string;
  templateId: number;
  instanceTitle: string;
  createdBy: string;
  language: string;
  status: "draft" | "inviting" | "recording" | "processing" | "completed";
  participants: Array<{
    characterName: string;
    userId?: string; // For registered users
    guestName?: string; // For unregistered guests
    guestEmail?: string; // Optional guest contact
    invitationToken: string;
    invitationStatus: "pending" | "accepted" | "declined" | "completed";
    recordingProgress: number;
    profileImageUrl?: string;
    isGuest: boolean;
    voiceRecordings?: Array<{
      emotion: string;
      audioUrl: string;
      uploadedAt: Date;
    }>;
    characterPhoto?: string;
  }>;
  completionPercentage: number;
  finalVideoUrl?: string;
  finalAudioUrl?: string;
  createdAt: Date;
}

export class CollaborativeRoleplayService {
  private templates: Map<number, CollaborativeTemplate> = new Map();
  private instances: Map<string, CollaborativeInstance> = new Map();
  private nextTemplateId = 1;
  private config: CollaborativeConfig;
  
  // Modular utilities
  private validator: CollaborativeValidator;
  private permissionManager: CollaborativePermissionManager;
  private tokenManager: CollaborativeTokenManager;
  private progressCalculator: CollaborativeProgressCalculator;
  private notificationManager: CollaborativeNotificationManager;

  constructor(config?: Partial<CollaborativeConfig>) {
    this.config = { ...getCollaborativeConfig(), ...config };
    
    // Initialize modular utilities
    this.validator = CollaborativeServiceFactory.createValidator();
    this.permissionManager = CollaborativeServiceFactory.createPermissionManager();
    this.tokenManager = CollaborativeServiceFactory.createTokenManager();
    this.progressCalculator = CollaborativeServiceFactory.createProgressCalculator();
    this.notificationManager = CollaborativeServiceFactory.createNotificationManager();
  }

  /**
   * Convert existing story to collaborative template
   */
  async convertStoryToTemplate(
    storyId: number, 
    userId: string,
    makePublic: boolean = true
  ): Promise<CollaborativeTemplate> {
    
    const story = await storage.getStory(storyId);
    if (!story) {
      throw new Error("Story not found");
    }

    // Generate roleplay analysis
    const roleplayAnalysis = await generateRolePlayAnalysis(story.content, story.title || "Untitled Story");
    
    const template: CollaborativeTemplate = {
      id: this.nextTemplateId++,
      originalStoryId: storyId,
      title: roleplayAnalysis.title || story.title,
      description: `${roleplayAnalysis.genre} story with ${roleplayAnalysis.totalScenes} scenes`,
      genre: roleplayAnalysis.genre,
      characterRoles: roleplayAnalysis.characters.map(char => ({
        name: char.name,
        description: char.personality,
        personality: char.personality,
        role: char.role,
        requiredEmotions: this.extractRequiredEmotions(roleplayAnalysis, char.name),
        aiVoiceDefault: char.voiceProfile || "alloy",
      })),
      sceneCount: roleplayAnalysis.totalScenes,
      estimatedDuration: roleplayAnalysis.estimatedPlaytime * 60,
      createdBy: userId,
      isPublic: makePublic,
      createdAt: new Date(),
    };

    this.templates.set(template.id, template);
    return template;
  }

  /**
   * Create instance from template
   */
  async createInstanceFromTemplate(
    templateId: number,
    instanceTitle: string,
    userId: string
  ): Promise<{
    instanceId: string;
    participantSlots: Array<{
      characterName: string;
      invitationToken: string;
    }>;
  }> {
    
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const instanceId = `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const participants = template.characterRoles.map(role => ({
      characterName: role.name,
      invitationToken: this.generateInvitationToken(),
      invitationStatus: "pending" as const,
      recordingProgress: 0,
      isGuest: false,
      voiceRecordings: [] as Array<{
        emotion: string;
        audioUrl: string;
        uploadedAt: Date;
      }>,
    }));

    const instance: CollaborativeInstance = {
      id: instanceId,
      templateId,
      instanceTitle,
      createdBy: userId,
      status: "draft",
      participants,
      completionPercentage: 0,
      createdAt: new Date(),
    };

    this.instances.set(instanceId, instance);

    return {
      instanceId,
      participantSlots: participants.map(p => ({
        characterName: p.characterName,
        invitationToken: p.invitationToken,
      })),
    };
  }

  /**
   * Get public templates
   */
  getPublicTemplates(): CollaborativeTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.isPublic);
  }

  /**
   * Get user's templates
   */
  getUserTemplates(userId: string): CollaborativeTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.createdBy === userId);
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: number): CollaborativeTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get user's instances
   */
  getUserInstances(userId: string): CollaborativeInstance[] {
    return Array.from(this.instances.values()).filter(i => i.createdBy === userId);
  }

  /**
   * Get instance by ID
   */
  getInstance(instanceId: string): CollaborativeInstance | null {
    return this.instances.get(instanceId) || null;
  }

  /**
   * Get invitation details by token
   */
  getInvitationByToken(token: string): {
    instance: CollaborativeInstance;
    participant: CollaborativeInstance['participants'][0];
    template: CollaborativeTemplate;
  } | null {
    
    for (const instance of Array.from(this.instances.values())) {
      const participant = instance.participants.find(p => p.invitationToken === token);
      if (participant) {
        const template = this.templates.get(instance.templateId);
        if (template) {
          return { instance, participant, template };
        }
      }
    }
    return null;
  }

  /**
   * Accept invitation (for registered users)
   */
  acceptInvitation(token: string, userId: string): boolean {
    for (const instance of Array.from(this.instances.values())) {
      const participant = instance.participants.find(p => p.invitationToken === token);
      if (participant && participant.invitationStatus === "pending") {
        participant.userId = userId;
        participant.invitationStatus = "accepted";
        participant.isGuest = false;
        return true;
      }
    }
    return false;
  }

  /**
   * Accept invitation (for guest users)
   */
  acceptInvitationAsGuest(token: string, guestName: string, guestEmail?: string): boolean {
    for (const instance of Array.from(this.instances.values())) {
      const participant = instance.participants.find(p => p.invitationToken === token);
      if (participant && participant.invitationStatus === "pending") {
        participant.guestName = guestName;
        participant.guestEmail = guestEmail;
        participant.invitationStatus = "accepted";
        participant.isGuest = true;
        return true;
      }
    }
    return false;
  }

  /**
   * Submit voice recording for character role
   */
  submitVoiceRecording(token: string, emotion: string, audioUrl: string): boolean {
    const invitation = this.getInvitationByToken(token);
    if (!invitation) return false;

    const { instance, participant } = invitation;
    
    // Initialize voice recordings array if not exists
    if (!participant.voiceRecordings) {
      participant.voiceRecordings = [];
    }
    
    // Add or update voice recording for this emotion
    const existingIndex = participant.voiceRecordings.findIndex(r => r.emotion === emotion);
    const recording = {
      emotion,
      audioUrl,
      uploadedAt: new Date()
    };
    
    if (existingIndex >= 0) {
      participant.voiceRecordings[existingIndex] = recording;
    } else {
      participant.voiceRecordings.push(recording);
    }
    
    // Update progress based on required emotions
    const template = this.getTemplate(instance.templateId);
    if (template) {
      const characterRole = template.characterRoles.find(r => r.name === participant.characterName);
      if (characterRole) {
        const requiredEmotions = characterRole.requiredEmotions.length;
        const completedEmotions = participant.voiceRecordings.length;
        participant.recordingProgress = Math.round((completedEmotions / requiredEmotions) * 70); // 70% for voice
      }
    }
    
    this.updateInstanceProgress(instance);
    return true;
  }

  /**
   * Submit character photo
   */
  submitCharacterPhoto(token: string, photoUrl: string): boolean {
    const invitation = this.getInvitationByToken(token);
    if (!invitation) return false;

    const { instance, participant } = invitation;
    participant.characterPhoto = photoUrl;
    participant.recordingProgress = Math.min(100, participant.recordingProgress + 30); // 30% for photo
    
    this.updateInstanceProgress(instance);
    return true;
  }

  /**
   * Update overall instance progress using configuration
   */
  private updateInstanceProgress(instance: CollaborativeInstance): void {
    const totalProgress = instance.participants.reduce((sum, p) => sum + p.recordingProgress, 0);
    instance.completionPercentage = Math.round(totalProgress / (instance.participants.length * 100) * 100);
    
    const minimumThreshold = getProgressThreshold('minimum');
    const allCompleted = instance.participants.every(p => p.recordingProgress >= minimumThreshold);
    
    if (allCompleted && this.canTransitionStatus(instance.status, "processing")) {
      instance.status = "processing";
    }
  }

  /**
   * Check if status transition is allowed based on configuration
   */
  private canTransitionStatus(currentStatus: string, newStatus: string): boolean {
    const allowedTransitions = this.config.instance.statusFlow[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Get default voice for character based on configuration
   */
  private getDefaultVoiceForCharacter(character: any): string {
    const characterType = this.determineCharacterType(character);
    const defaultEmotions = getDefaultEmotionsForCharacter(characterType);
    return defaultEmotions[0]?.aiVoice || 'alloy';
  }

  /**
   * Determine character type for voice mapping
   */
  private determineCharacterType(character: any): string {
    const traits = (character.traits || []).join(' ').toLowerCase();
    const personality = (character.personality || '').toLowerCase();
    const description = (character.description || '').toLowerCase();
    
    const combinedText = `${traits} ${personality} ${description}`;
    
    if (combinedText.includes('child') || combinedText.includes('young') || combinedText.includes('kid')) {
      return 'child';
    }
    if (combinedText.includes('old') || combinedText.includes('elder') || combinedText.includes('ancient')) {
      return 'elderly';
    }
    return 'adult';
  }

  /**
   * Get participant's required emotions
   */
  getParticipantRequiredEmotions(token: string): Array<{
    emotion: string;
    intensity: number;
    sampleCount: number;
    completed: boolean;
  }> {
    const invitation = this.getInvitationByToken(token);
    if (!invitation) return [];

    const { instance, participant, template } = invitation;
    const characterRole = template.characterRoles.find(r => r.name === participant.characterName);
    
    if (!characterRole) return [];

    return characterRole.requiredEmotions.map(emotion => ({
      ...emotion,
      completed: (participant.voiceRecordings || []).some(r => r.emotion === emotion.emotion)
    }));
  }

  /**
   * Check if participant can access story content
   */
  canParticipantAccessStory(token: string): boolean {
    const invitation = this.getInvitationByToken(token);
    if (!invitation) return false;

    const { participant } = invitation;
    return participant.invitationStatus === "accepted";
  }

  /**
   * Generate invitation links for instance
   */
  generateInvitationLinks(instanceId: string, baseUrl: string): Array<{
    characterName: string;
    invitationUrl: string;
    token: string;
  }> {
    const instance = this.getInstance(instanceId);
    if (!instance) return [];

    return instance.participants.map(participant => ({
      characterName: participant.characterName,
      invitationUrl: `${baseUrl}/invitations/roleplay/${participant.invitationToken}`,
      token: participant.invitationToken,
    }));
  }

  private extractRequiredEmotions(analysis: RolePlayAnalysis, characterName: string): Array<{
    emotion: string;
    intensity: number;
    sampleCount: number;
  }> {
    const emotions = new Map<string, { intensity: number; count: number }>();
    
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
    
    return Array.from(emotions.entries()).map(([emotion, data]) => ({
      emotion,
      intensity: data.intensity,
      sampleCount: Math.min(data.count, 3),
    }));
  }

  private generateInvitationToken(): string {
    return `invite_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Submit draft recording (temporary, for practice)
   */
  submitDraftRecording(token: string, segmentId: string, audioData: string): boolean {
    for (const instance of Array.from(this.instances.values())) {
      const participant = instance.participants.find((p: any) => p.invitationToken === token);
      if (participant) {
        // Store draft recording temporarily (in memory)
        if (!(participant as any).draftRecordings) {
          (participant as any).draftRecordings = new Map();
        }
        (participant as any).draftRecordings.set(segmentId, {
          audioData,
          timestamp: new Date(),
          segmentId
        });
        return true;
      }
    }
    return false;
  }

  /**
   * Save final recording (permanent save)
   */
  saveFinalRecording(token: string, segmentId: string, emotion: string): boolean {
    for (const instance of Array.from(this.instances.values())) {
      const participant = instance.participants.find((p: any) => p.invitationToken === token);
      if (participant && (participant as any).draftRecordings?.has(segmentId)) {
        // Move draft to final recordings
        if (!participant.voiceRecordings) {
          participant.voiceRecordings = [];
        }
        
        participant.voiceRecordings.push({
          emotion,
          audioUrl: `/recordings/${token}_${segmentId}_${Date.now()}.webm`,
          uploadedAt: new Date()
        });
        
        // Remove from drafts
        (participant as any).draftRecordings.delete(segmentId);
        
        // Update progress manually since updateInstanceProgress is private
        const completedRecordings = participant.voiceRecordings.length;
        const totalRequired = 3; // Default required recordings
        participant.recordingProgress = Math.min(100, (completedRecordings / totalRequired) * 100);
        
        return true;
      }
    }
    return false;
  }
}

export const collaborativeRoleplayService = new CollaborativeRoleplayService();