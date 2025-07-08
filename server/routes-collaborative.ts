import { Router } from "express";
import { collaborativeRoleplayService } from "./collaborative-roleplay-service";
import { requireAuth } from "./auth";
import { getBaseUrl } from "./oauth-config";
import { notificationService } from "./notification-service";
import { storage } from "./storage";
import { db } from "./db";
import { storyInvitations } from "@shared/schema";
import { db } from "./db";
import { storyInvitations } from "@shared/schema";

const router = Router();

// Send story invitations (new endpoint for invite collaborators dialog)
router.post("/api/stories/:id/invitations", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const storyId = parseInt(req.params.id);
    const { invitations } = req.body;
    
    if (!invitations || !Array.isArray(invitations)) {
      return res.status(400).json({ message: "Invitations array is required" });
    }

    // Get story details
    const story = await storage.getStory(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Verify user owns the story
    if (story.authorId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get sender details
    const sender = await storage.getUser(userId);
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    const results = [];
    const errors = [];

    for (const invitation of invitations) {
      try {
        const { contactMethod, contactValue, characterName, invitationName } = invitation;
        
        // Create invitation token and link
        const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const baseUrl = getBaseUrl();
        const invitationLink = `${baseUrl}/roleplay-invitation/${invitationToken}`;
        
        console.log(`Created invitation for ${characterName} in story ${storyId}: ${invitationToken}`);
        
        // Store invitation in database
        const invitationData = {
          invitationToken,
          storyId,
          inviterId: userId,
          inviteeEmail: contactMethod === 'email' ? contactValue : null,
          inviteePhone: contactMethod === 'phone' ? contactValue : null,
          status: 'pending',
          message: `You've been invited to collaborate on a story as ${characterName}`,
          characterId: characterId || null,
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
        };
        
        const [savedInvitation] = await db.insert(storyInvitations).values(invitationData).returning();
        
        // Send notification
        const message = {
          to: contactValue,
          subject: `You're invited to roleplay as ${characterName}`,
          text: `${sender.firstName || 'Someone'} has invited you to participate in "${story.title}" as ${characterName}. Click here to view: ${invitationLink}`,
          html: `<p>${sender.firstName || 'Someone'} has invited you to participate in "<strong>${story.title}</strong>" as <strong>${characterName}</strong>.</p>
                 <p><a href="${invitationLink}">Click here to view the invitation</a></p>`
        };
        
        let notificationResult;
        if (contactMethod === 'email') {
          notificationResult = await notificationService.sendEmail(message);
        } else if (contactMethod === 'phone') {
          notificationResult = await notificationService.sendSms({
            to: contactValue,
            body: message.text
          });
        }
        
        results.push({
          invitation: savedInvitation,
          sent: notificationResult?.success || false
        });
        
      } catch (invError) {
        console.error(`Failed to send invitation:`, invError);
        errors.push({
          invitation,
          error: invError.message
        });
      }
    }

    res.json({
      success: results.length > 0,
      results,
      errors
    });
    
  } catch (error) {
    console.error("Failed to send invitations:", error);
    res.status(500).json({ message: "Failed to send invitations" });
  }
});

// Get notification service status
router.get("/api/collaborative/notification-status", requireAuth, async (req, res) => {
  try {
    const status = notificationService.getStatus();
    res.json(status);
  } catch (error) {
    console.error("Failed to get notification status:", error);
    res.status(500).json({ message: "Failed to get notification status" });
  }
});

// Send per-character invitation
router.post("/api/collaborative/templates", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { storyId, characterName, contactMethod, contactValue, invitationName } = req.body;
    
    if (!storyId || !characterName || !contactMethod || !contactValue) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Get story details for the invitation
    const story = await storage.getStory(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    // Get sender details
    const sender = await storage.getUser(userId);
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    // Create invitation token and link
    const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const baseUrl = getBaseUrl();
    const invitationLink = `${baseUrl}/roleplay-invitation/${invitationToken}`;
    
    console.log(`Created invitation for ${characterName} in story ${storyId}: ${invitationToken}`);
    
    // Send actual invitation based on contact method
    let invitationSent = false;
    let responseMessage = "";

    try {
      const invitationData = {
        recipientContact: contactValue,
        recipientName: invitationName || undefined,
        characterName,
        storyTitle: story.title,
        invitationLink,
        senderName: sender.firstName || sender.email || 'A storytelling friend'
      };

      if (contactMethod === 'email') {
        const result = await notificationService.sendInvitation('email', invitationData);
        invitationSent = result.success;
        responseMessage = result.success ? 
          "Email invitation sent successfully" : 
          `Invitation link created (email delivery failed: ${result.error || 'unknown error'} - you can share the link manually)`;
      } else if (contactMethod === 'phone') {
        const result = await notificationService.sendInvitation('sms', invitationData);
        invitationSent = result.success;
        responseMessage = result.success ? 
          "SMS invitation sent successfully" : 
          `Invitation link created (SMS delivery failed: ${result.error || 'SMS not configured'} - you can share the link manually)`;
      }
    } catch (error) {
      console.error(`Failed to send ${contactMethod} invitation:`, error);
      responseMessage = contactMethod === 'email' ? 
        "Invitation link created (email delivery failed - you can share the link manually)" :
        "Invitation link created (SMS delivery failed - you can share the link manually)";
    }
    
    // Return invitation details that match frontend expectations
    res.json({
      instanceId: invitationToken,
      templateId: storyId,
      characterName,
      invitationLink,
      invitationToken,
      contactMethod,
      contactValue,
      invitationSent,
      message: responseMessage
    });
    
  } catch (error) {
    console.error("Failed to create character invitation:", error);
    res.status(500).json({ message: "Failed to create invitation" });
  }
});

// Delete invitation
router.delete("/api/collaborative/invitations/:token", requireAuth, async (req, res) => {
  try {
    const token = req.params.token;
    const userId = (req.user as any)?.id;
    
    // Find and validate invitation
    const invitationDetails = collaborativeRoleplayService.getInvitationByToken(token);
    if (!invitationDetails) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    
    // Check if user owns this invitation (created the instance)
    if (invitationDetails.instance.createdBy !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this invitation" });
    }
    
    // Remove the participant from the instance
    const instance = invitationDetails.instance;
    const participantIndex = instance.participants.findIndex(p => p.invitationToken === token);
    
    if (participantIndex === -1) {
      return res.status(404).json({ message: "Participant not found" });
    }
    
    // Check if participant has voice recordings
    const participant = instance.participants[participantIndex];
    const hasRecordings = participant.voiceRecordings && participant.voiceRecordings.length > 0;
    
    // Remove participant
    instance.participants.splice(participantIndex, 1);
    
    res.json({ 
      message: "Invitation deleted successfully",
      hadVoiceRecordings: hasRecordings
    });
    
  } catch (error) {
    console.error("Failed to delete invitation:", error);
    res.status(500).json({ message: "Failed to delete invitation" });
  }
});

// Convert story to collaborative template
router.post("/api/stories/:storyId/convert-to-template", requireAuth, async (req, res) => {
  try {
    const storyId = parseInt(req.params.storyId);
    const userId = (req.user as any)?.id;
    const { makePublic = true } = req.body;
    
    const template = await collaborativeRoleplayService.convertStoryToTemplate(
      storyId, 
      userId, 
      makePublic
    );
    
    res.json(template);
  } catch (error) {
    console.error("Failed to convert story to template:", error);
    res.status(500).json({ message: "Failed to convert story to template" });
  }
});

// Get public templates
router.get("/api/roleplay-templates", async (req, res) => {
  try {
    const templates = collaborativeRoleplayService.getPublicTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});

// Get user's templates
router.get("/api/roleplay-templates/my-templates", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const templates = collaborativeRoleplayService.getUserTemplates(userId);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user templates" });
  }
});

// Get template details
router.get("/api/roleplay-templates/:templateId", async (req, res) => {
  try {
    const templateId = parseInt(req.params.templateId);
    const template = collaborativeRoleplayService.getTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch template details" });
  }
});

// Create instance from template
router.post("/api/roleplay-templates/:templateId/create-instance", requireAuth, async (req, res) => {
  try {
    const templateId = parseInt(req.params.templateId);
    const userId = (req.user as any)?.id;
    const { instanceTitle } = req.body;
    
    const result = await collaborativeRoleplayService.createInstanceFromTemplate(
      templateId,
      instanceTitle,
      userId
    );
    
    // Generate invitation links
    const baseUrl = getBaseUrl();
    const invitationLinks = collaborativeRoleplayService.generateInvitationLinks(
      result.instanceId,
      baseUrl
    );
    
    res.json({
      ...result,
      invitationLinks
    });
  } catch (error) {
    console.error("Failed to create instance:", error);
    res.status(500).json({ message: "Failed to create instance" });
  }
});

// Get user's instances
router.get("/api/roleplay-instances/my-instances", requireAuth, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const instances = collaborativeRoleplayService.getUserInstances(userId);
    res.json(instances);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user instances" });
  }
});

// Get instance details
router.get("/api/roleplay-instances/:instanceId", requireAuth, async (req, res) => {
  try {
    const instanceId = req.params.instanceId;
    const userId = (req.user as any)?.id;
    
    const instance = collaborativeRoleplayService.getInstance(instanceId);
    
    if (!instance) {
      return res.status(404).json({ message: "Instance not found" });
    }
    
    // Check access permissions
    const isOwner = instance.createdBy === userId;
    const isParticipant = instance.participants.some(p => p.userId === userId);
    
    if (!isOwner && !isParticipant) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json({
      ...instance,
      participants: instance.participants.map(p => ({
        ...p,
        // Hide sensitive info from non-owners
        invitationToken: isOwner ? p.invitationToken : undefined,
      }))
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch instance details" });
  }
});

// Get invitation details by token (public endpoint)
router.get("/api/invitations/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const invitation = collaborativeRoleplayService.getInvitationByToken(token);
    
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found or expired" });
    }
    
    const { instance, participant, template } = invitation;
    
    res.json({
      instanceTitle: instance.instanceTitle,
      characterName: participant.characterName,
      templateTitle: template.title,
      genre: template.genre,
      estimatedDuration: template.estimatedDuration,
      requiredEmotions: template.characterRoles.find(r => r.name === participant.characterName)?.requiredEmotions || [],
      invitationStatus: participant.invitationStatus
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch invitation details" });
  }
});

// Accept invitation (registered users)
router.post("/api/invitations/:token/accept", requireAuth, async (req, res) => {
  try {
    const token = req.params.token;
    const userId = (req.user as any)?.id;
    
    const success = collaborativeRoleplayService.acceptInvitation(token, userId);
    
    if (!success) {
      return res.status(400).json({ message: "Failed to accept invitation" });
    }
    
    res.json({ message: "Invitation accepted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to accept invitation" });
  }
});

// Accept invitation (guest users)
router.post("/api/invitations/:token/accept-guest", async (req, res) => {
  try {
    const token = req.params.token;
    const { guestName, guestEmail } = req.body;
    
    if (!guestName) {
      return res.status(400).json({ message: "Guest name is required" });
    }
    
    const success = collaborativeRoleplayService.acceptInvitationAsGuest(token, guestName, guestEmail);
    
    if (!success) {
      return res.status(400).json({ message: "Failed to accept invitation" });
    }
    
    res.json({ message: "Invitation accepted successfully as guest" });
  } catch (error) {
    res.status(500).json({ message: "Failed to accept invitation" });
  }
});

// Submit voice recording
router.post("/api/invitations/:token/submit-voice", async (req, res) => {
  try {
    const token = req.params.token;
    const { emotion, audioUrl } = req.body;
    
    if (!emotion || !audioUrl) {
      return res.status(400).json({ message: "Emotion and audio URL are required" });
    }
    
    const success = collaborativeRoleplayService.submitVoiceRecording(token, emotion, audioUrl);
    
    if (!success) {
      return res.status(400).json({ message: "Failed to submit voice recording" });
    }
    
    res.json({ message: "Voice recording submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit voice recording" });
  }
});

// Submit draft voice recording (temporary, not saved permanently)
router.post("/api/invitations/:token/submit-draft", async (req, res) => {
  try {
    const token = req.params.token;
    const { segmentId, audioData } = req.body;
    
    if (!segmentId || !audioData) {
      return res.status(400).json({ message: "Segment ID and audio data are required" });
    }
    
    const success = collaborativeRoleplayService.submitDraftRecording(token, segmentId, audioData);
    
    if (!success) {
      return res.status(400).json({ message: "Failed to submit draft recording" });
    }
    
    res.json({ 
      message: "Draft recording saved",
      audioUrl: `/temp-audio/${token}_${segmentId}.webm`
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit draft recording" });
  }
});

// Save final voice recording (permanent save)
router.post("/api/invitations/:token/save-recording", async (req, res) => {
  try {
    const token = req.params.token;
    const { segmentId, emotion } = req.body;
    
    if (!segmentId || !emotion) {
      return res.status(400).json({ message: "Segment ID and emotion are required" });
    }
    
    const success = collaborativeRoleplayService.saveFinalRecording(token, segmentId, emotion);
    
    if (!success) {
      return res.status(404).json({ message: "Invalid invitation token or no draft found" });
    }
    
    res.json({ message: "Recording saved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to save recording" });
  }
});

// Get roleplay session data (story content, character dialogues, etc.)
router.get("/api/invitations/:token/session", async (req, res) => {
  try {
    const token = req.params.token;
    
    const invitation = collaborativeRoleplayService.getInvitationByToken(token);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    
    const template = collaborativeRoleplayService.getTemplate(invitation.instance.templateId);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    // Get story analysis from the original story using storage import
    const { storage } = await import("./storage");
    const story = await storage.getStory(template.originalStoryId);
    // Real story analysis required - no mock data allowed
    if (!story) {
      throw new Error('Story not found for collaborative roleplay');
    }
    
    const storyAnalysis = await storage.getStoryAnalysis(template.originalStoryId);
    if (!storyAnalysis) {
      throw new Error('Story analysis required for collaborative roleplay - please analyze story first');
    }
    
    res.json({
      instance: invitation.instance,
      template,
      story,
      storyAnalysis,
      participantRole: invitation.participant
    });
  } catch (error) {
    console.error("Error fetching roleplay session:", error);
    res.status(500).json({ message: "Failed to fetch roleplay session" });
  }
});

// Submit character photo
router.post("/api/invitations/:token/submit-photo", async (req, res) => {
  try {
    const token = req.params.token;
    const { photoUrl } = req.body;
    
    if (!photoUrl) {
      return res.status(400).json({ message: "Photo URL is required" });
    }
    
    const success = collaborativeRoleplayService.submitCharacterPhoto(token, photoUrl);
    
    if (!success) {
      return res.status(400).json({ message: "Failed to submit photo" });
    }
    
    res.json({ message: "Photo submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit photo" });
  }
});

// Get participant's required emotions
router.get("/api/invitations/:token/requirements", async (req, res) => {
  try {
    const token = req.params.token;
    const requirements = collaborativeRoleplayService.getParticipantRequiredEmotions(token);
    
    res.json({ requirements });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch requirements" });
  }
});

// Generate new invitation links for instance
router.post("/api/roleplay-instances/:instanceId/generate-links", requireAuth, async (req, res) => {
  try {
    const instanceId = req.params.instanceId;
    const userId = (req.user as any)?.id;
    
    const instance = collaborativeRoleplayService.getInstance(instanceId);
    
    if (!instance) {
      return res.status(404).json({ message: "Instance not found" });
    }
    
    if (instance.createdBy !== userId) {
      return res.status(403).json({ message: "Only the instance creator can generate invitation links" });
    }
    
    const baseUrl = getBaseUrl();
    const invitationLinks = collaborativeRoleplayService.generateInvitationLinks(instanceId, baseUrl);
    
    res.json({ invitationLinks });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate invitation links" });
  }
});

export { router as collaborativeRoutes };