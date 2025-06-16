import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCharacterSchema, insertConversationSchema, insertMessageSchema, insertStorySchema, insertUserVoiceSampleSchema, insertStoryCollaborationSchema, insertStoryGroupSchema, insertCharacterVoiceAssignmentSchema } from "@shared/schema";
import { generateAIResponse } from "./openai";
import { setupAuth, requireAuth, requireAdmin } from "./auth";
import { analyzeStoryContent, generateCharacterImage, transcribeAudio } from "./ai-analysis";
import { getAllVoiceSamples, getVoiceSampleProgress } from "./voice-samples";
import { storyNarrator } from "./story-narrator";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Voice Samples routes
  app.get("/api/voice-samples/templates", (req, res) => {
    res.json(getAllVoiceSamples());
  });

  app.get("/api/users/:userId/voice-samples", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const samples = await storage.getUserVoiceSamples(userId);
      const progress = await storage.getUserVoiceProgress(userId);
      res.json({ samples, progress });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch voice samples" });
    }
  });

  app.post("/api/users/:userId/voice-samples", requireAuth, upload.single('audio'), async (req, res) => {
    try {
      const userId = req.params.userId;
      const { sampleType, label, duration } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "Audio file is required" });
      }

      // Save audio file (in production, use cloud storage)
      const filename = `voice_${userId}_${label}_${Date.now()}.${req.file.originalname.split('.').pop()}`;
      const audioUrl = `/uploads/voice/${filename}`;
      
      // Create uploads directory if it doesn't exist
      await fs.mkdir('./uploads/voice', { recursive: true });
      await fs.writeFile(`./uploads/voice/${filename}`, req.file.buffer);

      const voiceSample = await storage.createUserVoiceSample({
        userId,
        sampleType,
        label,
        audioUrl,
        duration: parseInt(duration) || null,
        isCompleted: true,
      });

      res.status(201).json(voiceSample);
    } catch (error) {
      console.error("Voice sample upload error:", error);
      res.status(500).json({ message: "Failed to upload voice sample" });
    }
  });

  app.put("/api/voice-samples/:id", requireAuth, upload.single('audio'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData: any = {};

      if (req.file) {
        const filename = `voice_updated_${id}_${Date.now()}.${req.file.originalname.split('.').pop()}`;
        const audioUrl = `/uploads/voice/${filename}`;
        
        await fs.mkdir('./uploads/voice', { recursive: true });
        await fs.writeFile(`./uploads/voice/${filename}`, req.file.buffer);
        
        updateData.audioUrl = audioUrl;
        updateData.isCompleted = true;
      }

      if (req.body.duration) {
        updateData.duration = parseInt(req.body.duration);
      }

      await storage.updateUserVoiceSample(id, updateData);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update voice sample" });
    }
  });

  // Story analysis endpoint
  app.post("/api/stories/analyze", async (req, res) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const analysis = await analyzeStoryContent(content);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing story:", error);
      res.status(500).json({ message: "Failed to analyze story" });
    }
  });

  // Audio transcription endpoint
  app.post("/api/transcribe", upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Audio file is required" });
      }

      const transcription = await transcribeAudio(req.file.buffer);
      res.json({ text: transcription });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });

  // Character image generation endpoint
  app.post("/api/characters/generate-image", async (req, res) => {
    try {
      const { character, storyContext } = req.body;
      if (!character) {
        return res.status(400).json({ message: "Character data is required" });
      }

      const imageUrl = await generateCharacterImage(character, storyContext);
      res.json({ url: imageUrl });
    } catch (error) {
      console.error("Error generating character image:", error);
      res.status(500).json({ message: "Failed to generate character image" });
    }
  });

  // Default character image endpoint
  app.get("/api/characters/default-image", (req, res) => {
    const { name, role } = req.query;
    // Generate a default avatar URL based on character name and role
    const defaultImageUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name as string)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    res.json({ url: defaultImageUrl });
  });

  // Default emotion sound endpoint
  app.get("/api/emotions/default-sound", (req, res) => {
    const { emotion, intensity } = req.query;
    // Return a placeholder sound URL - in production this would be actual sound files
    const defaultSoundUrl = `/sounds/${emotion}-${intensity}.mp3`;
    res.json({ url: defaultSoundUrl });
  });

  // Stories routes
  app.get("/api/stories", async (req, res) => {
    try {
      const stories = await storage.getStories();
      res.json(stories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  // Story analysis endpoint
  app.post("/api/stories/analyze", async (req, res) => {
    try {
      console.log("Received analysis request body:", req.body);
      const { content } = req.body;
      
      if (!content || typeof content !== 'string' || !content.trim()) {
        console.log("Content validation failed:", { content, type: typeof content, trimmed: content?.trim() });
        return res.status(400).json({ message: "Content is required" });
      }

      console.log("Analyzing content of length:", content.trim().length);
      const analysis = await analyzeStoryContent(content.trim());
      res.json(analysis);
    } catch (error) {
      console.error("Story analysis error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to analyze story content" });
    }
  });

  app.get("/api/users/:userId/stories", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const stories = await storage.getUserStories(userId);
      res.json(stories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stories" });
    }
  });

  app.post("/api/stories", requireAuth, upload.single('audio'), async (req, res) => {
    try {
      const { title, content, category, uploadType, authorId } = req.body;
      
      let processedContent = content;
      let originalAudioUrl = null;

      // Handle voice upload
      if (uploadType === 'voice' && req.file) {
        const filename = `story_audio_${Date.now()}.${req.file.originalname.split('.').pop()}`;
        originalAudioUrl = `/uploads/audio/${filename}`;
        
        await fs.mkdir('./uploads/audio', { recursive: true });
        await fs.writeFile(`./uploads/audio/${filename}`, req.file.buffer);

        // Transcribe audio to text
        try {
          processedContent = await transcribeAudio(req.file.buffer);
        } catch (transcriptionError) {
          console.error("Transcription failed:", transcriptionError);
          return res.status(400).json({ message: "Failed to transcribe audio" });
        }
      }

      // Create initial story
      const story = await storage.createStory({
        title,
        content: processedContent,
        summary: null,
        category,
        tags: [],
        extractedCharacters: [],
        extractedEmotions: [],
        voiceSampleUrl: null,
        coverImageUrl: null,
        authorId,
        uploadType,
        originalAudioUrl,
        processingStatus: 'processing',
        copyrightInfo: null,
        licenseType: 'all_rights_reserved',
        isPublished: false,
        isAdultContent: false,
      });

      // Analyze story content in background
      try {
        const analysis = await analyzeStoryContent(processedContent);
        
        // Update story with analysis results
        await storage.updateStory(story.id, {
          summary: analysis.summary,
          category: analysis.category,
          tags: analysis.suggestedTags,
          extractedCharacters: analysis.characters,
          extractedEmotions: analysis.emotions,
          processingStatus: 'completed',
          isAdultContent: analysis.isAdultContent,
        });

        // Create story characters with generated images
        for (const character of analysis.characters) {
          const imageUrl = await generateCharacterImage(character, analysis.summary);
          
          await storage.createStoryCharacter({
            storyId: story.id,
            name: character.name,
            description: character.description,
            personality: character.personality,
            role: character.role,
            imageUrl,
            isGenerated: true,
          });
        }

        // Create story emotions
        for (const emotion of analysis.emotions) {
          await storage.createStoryEmotion({
            storyId: story.id,
            emotion: emotion.emotion,
            intensity: emotion.intensity,
            context: emotion.context,
            voiceUrl: null, // Will be populated when user assigns voice
          });
        }

        res.status(201).json({ 
          ...story, 
          analysis,
          processingStatus: 'completed' 
        });
      } catch (analysisError) {
        console.error("Story analysis failed:", analysisError);
        await storage.updateStory(story.id, {
          processingStatus: 'failed',
        });
        res.status(201).json({ 
          ...story, 
          processingStatus: 'failed',
          error: 'Analysis failed but story was saved' 
        });
      }
    } catch (error) {
      console.error("Story creation error:", error);
      res.status(500).json({ message: "Failed to create story" });
    }
  });

  app.get("/api/stories/:id/characters", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const characters = await storage.getStoryCharacters(storyId);
      res.json(characters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch story characters" });
    }
  });

  app.post("/api/stories/:id/characters", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const characterData = {
        storyId,
        ...req.body,
        isGenerated: true,
      };

      const character = await storage.createStoryCharacter(characterData);
      res.json(character);
    } catch (error) {
      console.error("Error creating story character:", error);
      res.status(500).json({ message: "Failed to create story character" });
    }
  });

  app.get("/api/stories/:id/emotions", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const emotions = await storage.getStoryEmotions(storyId);
      res.json(emotions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch story emotions" });
    }
  });

  app.post("/api/stories/:id/emotions", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const emotionData = {
        storyId,
        ...req.body,
      };

      const emotion = await storage.createStoryEmotion(emotionData);
      res.json(emotion);
    } catch (error) {
      console.error("Error creating story emotion:", error);
      res.status(500).json({ message: "Failed to create story emotion" });
    }
  });

  app.post("/api/story-emotions/:id/voice", requireAuth, upload.single('audio'), async (req, res) => {
    try {
      const emotionId = parseInt(req.params.id);
      
      if (!req.file) {
        return res.status(400).json({ message: "Audio file is required" });
      }

      const filename = `emotion_${emotionId}_${Date.now()}.${req.file.originalname.split('.').pop()}`;
      const voiceUrl = `/uploads/emotions/${filename}`;
      
      await fs.mkdir('./uploads/emotions', { recursive: true });
      await fs.writeFile(`./uploads/emotions/${filename}`, req.file.buffer);

      await storage.updateStoryEmotion(emotionId, { voiceUrl });
      res.json({ success: true, voiceUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload emotion voice" });
    }
  });

  // Story Narration routes
  app.post("/api/stories/:id/narration", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;
      const { pacing, includeCharacterVoices } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      const narration = await storyNarrator.generateNarration(storyId, userId, {
        pacing: pacing || 'normal',
        includeCharacterVoices: includeCharacterVoices || false,
      });

      res.json(narration);
    } catch (error) {
      console.error("Narration generation error:", error);
      res.status(500).json({ message: "Failed to generate story narration" });
    }
  });

  app.get("/api/stories/:id/narration/instructions", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      const narration = await storyNarrator.generateNarration(storyId, userId);
      const instructions = await storyNarrator.generateAudioInstructions(narration);

      res.json({ instructions: instructions.join('\n') });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate narration instructions" });
    }
  });

  // Route to assign user voice samples to story emotions
  app.post("/api/stories/:id/assign-voices", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;
      const { emotionVoiceMapping } = req.body; // { emotionId: voiceSampleId }

      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      const userVoiceSamples = await storage.getUserVoiceSamples(userId);
      const storyEmotions = await storage.getStoryEmotions(storyId);

      for (const [emotionId, voiceSampleId] of Object.entries(emotionVoiceMapping)) {
        const voiceSample = userVoiceSamples.find(s => s.id === parseInt(voiceSampleId as string));
        if (voiceSample) {
          await storage.updateStoryEmotion(parseInt(emotionId), {
            voiceUrl: voiceSample.audioUrl,
          });
        }
      }

      res.json({ success: true, message: "Voice assignments updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to assign voices" });
    }
  });

  // Story Collaboration routes
  app.post("/api/stories/:id/invite", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const invitedByUserId = (req.user as any)?.id;
      const { invitedUserEmail, assignedCharacterId, permissions } = req.body;

      if (!invitedByUserId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      // Find invited user by email
      const invitedUser = await storage.getUserByEmail(invitedUserEmail);
      if (!invitedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if already invited
      const existingCollaborations = await storage.getStoryCollaborations(storyId);
      const existingInvite = existingCollaborations.find(c => c.invitedUserId === invitedUser.id);
      
      if (existingInvite) {
        return res.status(400).json({ message: "User already invited to this story" });
      }

      const collaboration = await storage.createStoryCollaboration({
        storyId,
        invitedUserId: invitedUser.id,
        invitedByUserId,
        assignedCharacterId: assignedCharacterId || null,
        permissions: permissions || 'voice_only',
        status: 'pending',
      });

      res.status(201).json(collaboration);
    } catch (error) {
      console.error("Story invitation error:", error);
      res.status(500).json({ message: "Failed to send story invitation" });
    }
  });

  app.get("/api/stories/:id/collaborations", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const collaborations = await storage.getStoryCollaborations(storyId);
      res.json(collaborations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collaborations" });
    }
  });

  app.put("/api/collaborations/:id/respond", requireAuth, async (req, res) => {
    try {
      const collaborationId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;
      const { status } = req.body; // 'accepted' or 'declined'

      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      await storage.updateStoryCollaboration(collaborationId, {
        status,
        respondedAt: new Date(),
      });

      // If accepted, create character voice assignment
      if (status === 'accepted') {
        const collaborations = await storage.getStoryCollaborations(0); // Get all to find this one
        const collaboration = collaborations.find(c => c.id === collaborationId);
        
        if (collaboration && collaboration.assignedCharacterId) {
          await storage.createCharacterVoiceAssignment({
            storyId: collaboration.storyId,
            characterId: collaboration.assignedCharacterId,
            userId,
            voiceSampleUrl: null,
            emotionMappings: {},
            isCompleted: false,
          });
        }
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to respond to collaboration" });
    }
  });

  app.get("/api/users/:userId/collaborations", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const collaborations = await storage.getUserCollaborations(userId);
      res.json(collaborations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user collaborations" });
    }
  });

  // Story Groups routes
  app.post("/api/stories/:id/groups", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const createdByUserId = (req.user as any)?.id;
      const { name, description, visibility, maxMembers } = req.body;

      if (!createdByUserId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      // Generate unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const group = await storage.createStoryGroup({
        storyId,
        name,
        description: description || null,
        visibility: visibility || 'private',
        createdByUserId,
        inviteCode,
        maxMembers: maxMembers || 10,
      });

      // Add creator as admin member
      await storage.createStoryGroupMember({
        groupId: group.id,
        userId: createdByUserId,
        assignedCharacterId: null,
        role: 'admin',
      });

      res.status(201).json(group);
    } catch (error) {
      console.error("Story group creation error:", error);
      res.status(500).json({ message: "Failed to create story group" });
    }
  });

  app.get("/api/stories/:id/groups", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const groups = await storage.getStoryGroups(storyId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch story groups" });
    }
  });

  app.post("/api/groups/join/:inviteCode", requireAuth, async (req, res) => {
    try {
      const { inviteCode } = req.params;
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      const group = await storage.getStoryGroupByInviteCode(inviteCode);
      if (!group) {
        return res.status(404).json({ message: "Invalid invite code" });
      }

      // Check if already a member
      const members = await storage.getStoryGroupMembers(group.id);
      const existingMember = members.find(m => m.userId === userId);
      
      if (existingMember) {
        return res.status(400).json({ message: "Already a member of this group" });
      }

      // Check if group is full
      if (members.length >= (group.maxMembers || 10)) {
        return res.status(400).json({ message: "Group is full" });
      }

      const member = await storage.createStoryGroupMember({
        groupId: group.id,
        userId,
        assignedCharacterId: null,
        role: 'member',
      });

      res.status(201).json({ group, member });
    } catch (error) {
      res.status(500).json({ message: "Failed to join group" });
    }
  });

  app.get("/api/groups/:id/members", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const members = await storage.getStoryGroupMembers(groupId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch group members" });
    }
  });

  app.post("/api/groups/:id/assign-character", requireAuth, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { userId, characterId } = req.body;
      const requestingUserId = (req.user as any)?.id;

      if (!requestingUserId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      // Check if requesting user is admin
      const members = await storage.getStoryGroupMembers(groupId);
      const requestingMember = members.find(m => m.userId === requestingUserId);
      
      if (!requestingMember || requestingMember.role !== 'admin') {
        return res.status(403).json({ message: "Only group admins can assign characters" });
      }

      // Update member's character assignment
      const targetMember = members.find(m => m.userId === userId);
      if (!targetMember) {
        return res.status(404).json({ message: "User not found in group" });
      }

      await storage.updateStoryGroupMember(targetMember.id, {
        assignedCharacterId: characterId,
      });

      // Create character voice assignment
      const group = await storage.getStoryGroup(groupId);
      if (group && characterId) {
        await storage.createCharacterVoiceAssignment({
          storyId: group.storyId,
          characterId,
          userId,
          voiceSampleUrl: null,
          emotionMappings: {},
          isCompleted: false,
        });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to assign character" });
    }
  });

  // Character Voice Assignment routes
  app.get("/api/stories/:id/voice-assignments", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const assignments = await storage.getCharacterVoiceAssignments(storyId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch voice assignments" });
    }
  });

  app.get("/api/stories/:id/my-voice-assignment", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      const assignment = await storage.getUserCharacterVoiceAssignment(storyId, userId);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch voice assignment" });
    }
  });

  app.post("/api/voice-assignments/:id/record", requireAuth, upload.single('audio'), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const { emotion, intensity } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "Audio file is required" });
      }

      const filename = `character_voice_${assignmentId}_${emotion}_${Date.now()}.${req.file.originalname.split('.').pop()}`;
      const voiceUrl = `/uploads/character-voices/${filename}`;
      
      await fs.mkdir('./uploads/character-voices', { recursive: true });
      await fs.writeFile(`./uploads/character-voices/${filename}`, req.file.buffer);

      // Update emotion mappings
      const assignment = await storage.getCharacterVoiceAssignments(0); // Get all and find this one
      const currentAssignment = assignment.find(a => a.id === assignmentId);
      
      if (currentAssignment) {
        const emotionMappings = currentAssignment.emotionMappings || {};
        emotionMappings[emotion] = {
          voiceUrl,
          intensity: parseInt(intensity) || 5,
          recordedAt: new Date().toISOString(),
        };

        await storage.updateCharacterVoiceAssignment(assignmentId, {
          emotionMappings,
          voiceSampleUrl: voiceUrl, // Latest recorded sample
        });
      }

      res.json({ success: true, voiceUrl });
    } catch (error) {
      console.error("Character voice recording error:", error);
      res.status(500).json({ message: "Failed to record character voice" });
    }
  });

  app.put("/api/voice-assignments/:id/complete", requireAuth, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      
      await storage.updateCharacterVoiceAssignment(assignmentId, {
        isCompleted: true,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark voice assignment as complete" });
    }
  });

  // Characters routes
  app.get("/api/characters", async (req, res) => {
    try {
      const characters = await storage.getCharacters();
      res.json(characters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch characters" });
    }
  });

  app.get("/api/characters/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const character = await storage.getCharacter(id);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }
      res.json(character);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch character" });
    }
  });

  app.post("/api/characters", async (req, res) => {
    try {
      const result = insertCharacterSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid character data", errors: result.error.issues });
      }
      
      const character = await storage.createCharacter(result.data);
      res.status(201).json(character);
    } catch (error) {
      res.status(500).json({ message: "Failed to create character" });
    }
  });

  app.post("/api/characters/:id/like", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const character = await storage.getCharacter(id);
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }
      
      await storage.updateCharacterStats(id, character.likes + 1);
      res.json({ likes: character.likes + 1 });
    } catch (error) {
      res.status(500).json({ message: "Failed to like character" });
    }
  });

  // Conversations routes
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const result = insertConversationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid conversation data", errors: result.error.issues });
      }
      
      const conversation = await storage.createConversation(result.data);
      
      // Increment chat count for the character
      const character = await storage.getCharacter(result.data.characterId!);
      if (character) {
        await storage.updateCharacterStats(character.id, undefined, character.chats + 1);
      }
      
      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Messages routes
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const result = insertMessageSchema.safeParse({
        ...req.body,
        conversationId,
      });
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid message data", errors: result.error.issues });
      }
      
      // Create user message
      const userMessage = await storage.createMessage(result.data);
      
      // Generate AI response if this is a user message
      if (!result.data.isAi) {
        const conversation = await storage.getConversation(conversationId);
        if (conversation) {
          const character = await storage.getCharacter(conversation.characterId!);
          if (character) {
            try {
              const aiResponse = await generateAIResponse(result.data.content, character);
              const aiMessage = await storage.createMessage({
                conversationId,
                content: aiResponse,
                isAi: true,
              });
              
              res.status(201).json({ userMessage, aiMessage });
              return;
            } catch (aiError) {
              console.error("AI response failed:", aiError);
              // Continue with just the user message if AI fails
            }
          }
        }
      }
      
      res.status(201).json({ userMessage });
    } catch (error) {
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
