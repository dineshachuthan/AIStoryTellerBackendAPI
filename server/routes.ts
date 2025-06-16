import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCharacterSchema, insertConversationSchema, insertMessageSchema, insertStorySchema, insertUserVoiceSampleSchema } from "@shared/schema";
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

  // Stories routes
  app.get("/api/stories", async (req, res) => {
    try {
      const stories = await storage.getStories();
      res.json(stories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stories" });
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

  app.get("/api/stories/:id/emotions", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const emotions = await storage.getStoryEmotions(storyId);
      res.json(emotions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch story emotions" });
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
