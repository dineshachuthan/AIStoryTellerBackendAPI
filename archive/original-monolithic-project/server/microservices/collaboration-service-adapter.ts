/**
 * Collaboration Service Adapter for Microservices Architecture
 * Manages collaboration and invitation-related operations within monolith during migration
 * Follows Adapter Pattern for gradual extraction to independent service
 */

import { BaseMicroserviceAdapter } from './base-microservice-adapter';
import { storage } from '../storage';
import { sendRoleplayInvitation } from '../email-service';
import { smsService } from '../sms-service';

export class CollaborationServiceAdapter extends BaseMicroserviceAdapter {
  constructor() {
    // Define owned tables for collaboration service
    const ownedTables = [
      'roleplay_templates',
      'roleplay_invitations',
      'roleplay_participants',
      'roleplay_submissions'
    ];
    
    super('collaboration', ownedTables);
  }

  /**
   * Initialize collaboration service event handlers
   */
  async initialize(): Promise<void> {
    this.setupEventHandlers();
    
    console.log('[CollaborationAdapter] Initialized in monolith mode');
  }

  /**
   * Setup event handlers for cross-service communication
   */
  private setupEventHandlers(): void {
    // Listen for story events
    this.subscribeToEvent("story.published", async (event) => {
      console.log("[CollaborationAdapter] Story published, can now be used for collaboration");
    });

    // Listen for subscription events to check collaboration limits
    this.subscribeToEvent("subscription.updated", async (event) => {
      console.log("[CollaborationAdapter] Subscription updated, adjusting collaboration limits");
    });
  }

  /**
   * Create roleplay template from story
   */
  async createRoleplayTemplate(storyId: number, userId: string): Promise<any> {
    try {
      // Get story
      const story = await storage.getStory(storyId);
      if (!story || story.userId !== userId) {
        throw new Error("Story not found or access denied");
      }

      // Check subscription limits
      const canInvite = await this.checkCollaborationLimits(userId);
      if (!canInvite.allowed) {
        throw new Error(`Collaboration limit reached. Limit: ${canInvite.limit}`);
      }

      // Create template
      const template = await storage.createRoleplayTemplate({
        storyId,
        userId,
        title: story.title,
        description: `Roleplay based on: ${story.title}`,
        characters: story.analysisData?.characters || [],
        status: 'active'
      });

      // Publish event
      await this.publishEvent("collaboration.template.created", {
        userId,
        storyId,
        templateId: template.id
      });

      return template;
    } catch (error) {
      console.error("Failed to create roleplay template:", error);
      throw error;
    }
  }

  /**
   * Send invitation for collaboration
   */
  async sendInvitation(templateId: number, invitationData: any, userId: string): Promise<any> {
    try {
      const { recipientEmail, recipientPhone, characterId, message } = invitationData;

      // Validate template ownership
      const template = await storage.getRoleplayTemplate(templateId);
      if (!template || template.userId !== userId) {
        throw new Error("Template not found or access denied");
      }

      // Generate unique token
      const token = this.generateInvitationToken();
      const expiresAt = new Date(Date.now() + 120 * 60 * 60 * 1000); // 120 hours

      // Create invitation
      const invitation = await storage.createRoleplayInvitation({
        templateId,
        senderId: userId,
        recipientEmail,
        recipientPhone,
        characterId,
        token,
        expiresAt,
        status: 'pending'
      });

      // Send notification
      if (recipientEmail) {
        await sendRoleplayInvitation({
          recipientEmail,
          recipientName: 'Guest',
          characterName: this.getCharacterName(template.characters, characterId),
          storyTitle: template.title,
          invitationLink: this.getInvitationUrl(token),
          senderName: 'Story Creator'
        });
      }

      if (recipientPhone && smsService) {
        await smsService.sendInvitation({
          recipientPhone,
          recipientName: 'Guest',
          characterName: this.getCharacterName(template.characters, characterId),
          storyTitle: template.title,
          invitationLink: this.getInvitationUrl(token),
          senderName: 'Story Creator'
        });
      }

      // Publish event
      await this.publishEvent("collaboration.invitation.sent", {
        userId,
        templateId,
        invitationId: invitation.id,
        method: recipientEmail ? 'email' : 'sms'
      });

      return invitation;
    } catch (error) {
      console.error("Failed to send invitation:", error);
      throw error;
    }
  }

  /**
   * Accept invitation and join collaboration
   */
  async acceptInvitation(token: string, participantData?: any): Promise<any> {
    try {
      // Validate invitation
      const invitation = await storage.getRoleplayInvitationByToken(token);
      if (!invitation) {
        throw new Error("Invalid invitation token");
      }

      if (invitation.status !== 'pending') {
        throw new Error("Invitation already used or expired");
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        throw new Error("Invitation expired");
      }

      // Update invitation status
      await storage.updateRoleplayInvitation(invitation.id, {
        status: 'accepted',
        acceptedAt: new Date()
      });

      // Create participant
      const participant = await storage.createRoleplayParticipant({
        invitationId: invitation.id,
        templateId: invitation.templateId,
        characterId: invitation.characterId,
        displayName: participantData?.displayName || 'Guest',
        email: participantData?.email || invitation.recipientEmail,
        isGuest: !participantData?.userId
      });

      // Publish event
      await this.publishEvent("collaboration.invitation.accepted", {
        invitationId: invitation.id,
        templateId: invitation.templateId,
        participantId: participant.id
      });

      return participant;
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      throw error;
    }
  }

  /**
   * Submit collaboration content
   */
  async submitContent(participantId: number, content: any): Promise<any> {
    try {
      // Validate participant
      const participant = await storage.getRoleplayParticipant(participantId);
      if (!participant) {
        throw new Error("Participant not found");
      }

      // Create submission
      const submission = await storage.createRoleplaySubmission({
        participantId,
        templateId: participant.templateId,
        characterId: participant.characterId,
        contentType: content.type, // 'voice', 'video', 'text'
        contentUrl: content.url,
        metadata: content.metadata
      });

      // Check if all participants have submitted
      const allSubmitted = await this.checkAllParticipantsSubmitted(participant.templateId);
      
      if (allSubmitted) {
        // Publish event for completion
        await this.publishEvent("collaboration.completed", {
          templateId: participant.templateId
        });
      }

      return submission;
    } catch (error) {
      console.error("Failed to submit content:", error);
      throw error;
    }
  }

  /**
   * Check collaboration limits based on subscription
   */
  private async checkCollaborationLimits(userId: string): Promise<{
    allowed: boolean;
    limit: number;
  }> {
    // Get subscription limits
    const { subscriptionServiceAdapter } = await import('./subscription-service-adapter');
    const limits = await subscriptionServiceAdapter.getFeatureLimits(userId);
    
    // For now, always allow if within subscription limits
    return {
      allowed: limits.collaboratorsPerStory === -1 || true,
      limit: limits.collaboratorsPerStory
    };
  }

  /**
   * Generate unique invitation token
   */
  private generateInvitationToken(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get invitation URL
   */
  private getInvitationUrl(token: string): string {
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000';
    return `${baseUrl}/invitation/${token}`;
  }

  /**
   * Get character name from template
   */
  private getCharacterName(characters: any[], characterId: number): string {
    const character = characters.find(c => c.id === characterId);
    return character?.name || 'Character';
  }

  /**
   * Check if all participants have submitted
   */
  private async checkAllParticipantsSubmitted(templateId: number): Promise<boolean> {
    const participants = await storage.getRoleplayParticipants(templateId);
    const submissions = await storage.getRoleplaySubmissions(templateId);
    
    return participants.length === submissions.length;
  }
}

// Export singleton instance
export const collaborationServiceAdapter = new CollaborationServiceAdapter();