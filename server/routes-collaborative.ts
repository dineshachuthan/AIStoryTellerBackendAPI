import { Router } from "express";
import { collaborativeRoleplayService } from "./collaborative-roleplay-service";
import { requireAuth } from "./auth";
import { getBaseUrl } from "./oauth-config";

const router = Router();

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

// Accept invitation
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

// Submit media for character role
router.post("/api/invitations/:token/submit-media", requireAuth, async (req, res) => {
  try {
    const token = req.params.token;
    const { mediaType, mediaUrl } = req.body;
    
    if (!mediaType || !mediaUrl) {
      return res.status(400).json({ message: "Media type and URL are required" });
    }
    
    const success = collaborativeRoleplayService.submitCharacterMedia(token, mediaType, mediaUrl);
    
    if (!success) {
      return res.status(400).json({ message: "Failed to submit media" });
    }
    
    res.json({ message: "Media submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit media" });
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