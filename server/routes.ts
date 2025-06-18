import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCharacterSchema, insertConversationSchema, insertMessageSchema, insertStorySchema, insertUserVoiceSampleSchema, insertStoryCollaborationSchema, insertStoryGroupSchema, insertCharacterVoiceAssignmentSchema } from "@shared/schema";
import { generateAIResponse } from "./openai";
import { setupAuth, requireAuth, requireAdmin } from "./auth";
import { analyzeStoryContent, generateCharacterImage, transcribeAudio } from "./ai-analysis";
import { getCachedCharacterImage, cacheCharacterImage, getCachedAudio, cacheAudio, getCachedAnalysis, cacheAnalysis, getAllCacheStats, cleanOldCacheFiles } from "./content-cache";
import { getAllVoiceSamples, getVoiceSampleProgress } from "./voice-samples";
import { storyNarrator } from "./story-narrator";
import { grandmaVoiceNarrator } from "./voice-narrator";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import OpenAI from "openai";

// Character detection function for emotion samples
function detectCharacterInText(text: string, characters: any[]): any | null {
  const lowerText = text.toLowerCase();
  
  // Priority 1: Mother's specific dialogue patterns - "My boy" indicates Mother is speaking
  if (lowerText.includes('my boy') || lowerText.includes('my child') || 
      lowerText.includes('be satisfied') || lowerText.includes('take half') ||
      lowerText.includes('half the nuts')) {
    const mother = characters.find(c => c.name.toLowerCase().includes('mother'));
    if (mother) return mother;
  }
  
  // Priority 2: Check for direct dialogue patterns (quoted speech)
  if (text.includes('"') || text.includes("'")) {
    // Look for character names in dialogue attribution - who is speaking
    for (const character of characters) {
      const nameVariations = [
        character.name.toLowerCase(),
        character.name.toLowerCase().replace('the ', ''),
        character.name.toLowerCase().split(' ').pop() // Last word of name
      ];
      
      for (const nameVariation of nameVariations) {
        if (lowerText.includes(`said ${nameVariation}`) || 
            lowerText.includes(`${nameVariation} said`) ||
            lowerText.includes(`asked ${nameVariation}`) ||
            lowerText.includes(`${nameVariation} asked`) ||
            lowerText.includes(`replied ${nameVariation}`) ||
            lowerText.includes(`${nameVariation} replied`)) {
          return character;
        }
      }
    }
  }
  
  // Priority 3: Boy's frustration/action patterns (but not when Mother is clearly speaking)
  if ((lowerText.includes('hand out') || lowerText.includes('stuck') || 
       lowerText.includes('disappointed') || lowerText.includes('cry')) &&
      !lowerText.includes('my boy') && !lowerText.includes('be satisfied')) {
    const boy = characters.find(c => c.name.toLowerCase().includes('boy'));
    if (boy) return boy;
  }
  
  return null;
}

// Helper functions for emotion audio generation
function selectEmotionVoice(emotion: string, intensity: number): 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' {
  const emotionVoiceMap: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = {
    'happy': 'nova',
    'excited': 'shimmer',
    'sad': 'echo',
    'angry': 'onyx',
    'fear': 'fable',
    'surprise': 'nova',
    'love': 'shimmer',
    'anxiety': 'echo',
    'frustration': 'onyx',
    'wisdom': 'fable',
    'patience': 'alloy',
    'understanding': 'alloy',
    'compassion': 'nova',
    'greed': 'onyx',
    'disappointment': 'echo',
    'realization': 'fable',
  };
  
  return emotionVoiceMap[emotion] || 'alloy';
}

function createEmotionText(originalText: string, emotion: string, intensity: number): string {
  // Shorten text for audio sample (max 100 characters)
  const text = originalText.length > 100 ? originalText.substring(0, 97) + "..." : originalText;
  
  // Add emotion context for better TTS expression
  const emotionPrefixes: Record<string, string> = {
    'happy': 'With joy: ',
    'sad': 'With sorrow: ',
    'angry': 'With anger: ',
    'excited': 'With excitement: ',
    'fear': 'With fear: ',
    'wisdom': 'With wisdom: ',
    'frustration': 'With frustration: ',
    'patience': 'Patiently: ',
    'understanding': 'With understanding: ',
    'compassion': 'Compassionately: ',
    'greed': 'Greedily: ',
    'disappointment': 'With disappointment: ',
    'realization': 'With realization: ',
  };
  
  const prefix = emotionPrefixes[emotion] || '';
  return prefix + text;
}

function getEmotionSpeed(emotion: string, intensity: number): number {
  const baseSpeed = 1.0;
  
  // Adjust speed based on emotion
  const speedMap: Record<string, number> = {
    'excited': 1.2,
    'happy': 1.1,
    'angry': 1.3,
    'frustration': 1.2,
    'fear': 0.9,
    'sad': 0.8,
    'wisdom': 0.9,
    'patience': 0.8,
    'understanding': 0.9,
    'compassion': 0.9,
    'disappointment': 0.8,
  };
  
  const emotionSpeed = speedMap[emotion] || baseSpeed;
  
  // Adjust based on intensity (1-10 scale)
  const intensityMultiplier = 0.8 + (intensity / 10) * 0.4; // Range: 0.8 to 1.2
  
  return Math.min(Math.max(emotionSpeed * intensityMultiplier, 0.5), 2.0);
}

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

      // Check cache first to ensure consistent results
      const cachedAnalysis = getCachedAnalysis(content);
      if (cachedAnalysis) {
        return res.json(cachedAnalysis);
      }

      // Generate new analysis if not cached
      const analysis = await analyzeStoryContent(content);
      
      // Cache the analysis for future use
      cacheAnalysis(content, analysis);
      
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
      console.log("Received image generation request body:", req.body);
      const { character, storyContext } = req.body;
      if (!character) {
        console.log("Character validation failed:", { character });
        return res.status(400).json({ message: "Character data is required" });
      }

      // Check cache first
      const cachedImage = getCachedCharacterImage(character, storyContext || "");
      if (cachedImage) {
        return res.json({ url: cachedImage });
      }

      console.log("Generating new image for character:", character.name);
      const imageUrl = await generateCharacterImage(character, storyContext);
      
      // Cache the generated image locally
      await cacheCharacterImage(character, storyContext || "", imageUrl);
      
      res.json({ url: imageUrl });
    } catch (error) {
      console.error("Error generating character image:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate character image" });
    }
  });

  // Default character image endpoint
  app.get("/api/characters/default-image", (req, res) => {
    const { name, role } = req.query;
    // Generate a default avatar URL based on character name and role
    const defaultImageUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name as string)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    res.json({ url: defaultImageUrl });
  });

  // Content cache management endpoints
  app.get("/api/admin/cache/stats", (req, res) => {
    try {
      const stats = getAllCacheStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get cache stats" });
    }
  });

  app.post("/api/admin/cache/clean", (req, res) => {
    try {
      const result = cleanOldCacheFiles();
      res.json({ message: `Cleaned ${result.cleaned} old cache files, freed ${result.freedKB}KB` });
    } catch (error) {
      res.status(500).json({ message: "Failed to clean cache" });
    }
  });

  // Default emotion sound endpoint
  app.get("/api/emotions/default-sound", (req, res) => {
    const { emotion, intensity } = req.query;
    // Return a placeholder sound URL - in production this would be actual sound files
    const defaultSoundUrl = `/sounds/${emotion}-${intensity}.mp3`;
    res.json({ url: defaultSoundUrl });
  });

  // Generate emotion audio sample with character-specific voice
  app.post("/api/emotions/generate-sample", async (req, res) => {
    try {
      const { emotion, intensity, text, storyId, analysisCharacters } = req.body;
      
      if (!emotion || !text) {
        return res.status(400).json({ message: "Emotion and text are required" });
      }

      // Detect character from the text and get their assigned voice
      let selectedVoice = 'alloy'; // Default narrator voice
      let characters = [];
      
      if (storyId) {
        try {
          characters = await storage.getStoryCharacters(storyId);
        } catch (error) {
          // Fall back to default voice selection
        }
      } else if (analysisCharacters) {
        // Use characters from analysis phase (before story is created)
        characters = analysisCharacters;
      }
      
      if (characters.length > 0) {
        // Detect which character is speaking in this text
        const detectedCharacter = detectCharacterInText(text, characters);
        console.log(`Character detection result: ${detectedCharacter ? detectedCharacter.name : 'none'}`);
        if (detectedCharacter && detectedCharacter.assignedVoice) {
          selectedVoice = detectedCharacter.assignedVoice;
          console.log(`Selected voice: ${selectedVoice} for ${detectedCharacter.name}`);
        } else {
          console.log(`No character detected or no voice assigned, using default: ${selectedVoice}`);
        }
      }

      // Check cache first with character-specific voice
      const cachedAudio = getCachedAudio(text, selectedVoice, emotion, intensity);
      if (cachedAudio) {
        console.log(`Using cached emotion audio for: ${emotion} with voice: ${selectedVoice}`);
        return res.json({ url: cachedAudio });
      }
      
      console.log(`Generating new emotion audio for: ${emotion} with voice: ${selectedVoice}`);

      // Generate audio using OpenAI TTS
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Use the character-specific voice
      const voice = selectedVoice;
      
      // Create emotion-appropriate text
      const emotionText = createEmotionText(text, emotion, intensity);
      
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice,
        input: emotionText,
        speed: getEmotionSpeed(emotion, intensity),
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Save audio to cache directory and get file URL
      const cacheDir = path.join(process.cwd(), 'persistent-cache', 'audio');
      await fs.mkdir(cacheDir, { recursive: true });
      
      const fileName = `emotion-${emotion}-${intensity}-${Date.now()}.mp3`;
      const filePath = path.join(cacheDir, fileName);
      
      // Write audio file
      await fs.writeFile(filePath, buffer);
      
      // Create file URL
      const audioUrl = `/api/cached-audio/${fileName}`;
      
      // Save metadata for caching
      const metadata = {
        text,
        voice,
        emotion,
        intensity,
        fileName,
        timestamp: Date.now(),
        fileSize: buffer.length,
      };
      
      const metadataPath = path.join(cacheDir, `${fileName}.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      console.log("Generated emotion audio sample for:", emotion);
      res.json({ url: audioUrl });
    } catch (error) {
      console.error("Emotion sample generation error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate emotion sample" });
    }
  });

  // Save user voice recording for emotion
  app.post("/api/emotions/save-voice-sample", upload.single('audio'), async (req, res) => {
    try {
      console.log("Received voice sample save request:", req.body);
      const { emotion, intensity, text, userId, storyId } = req.body;
      const audioFile = req.file;
      
      if (!audioFile || !emotion || !text || !userId) {
        return res.status(400).json({ message: "Audio file, emotion, text, and userId are required" });
      }

      // Save audio file to persistent cache
      const cacheDir = path.join(process.cwd(), 'persistent-cache', 'user-voice-samples');
      await fs.mkdir(cacheDir, { recursive: true });
      
      const fileName = `${userId}-${emotion}-${intensity}-${Date.now()}.webm`;
      const filePath = path.join(cacheDir, fileName);
      
      // Write audio file
      await fs.writeFile(filePath, audioFile.buffer);
      
      // Create metadata
      const metadata = {
        userId,
        storyId,
        emotion,
        intensity: parseInt(intensity),
        text,
        fileName,
        filePath,
        fileSize: audioFile.size,
        timestamp: Date.now(),
        mimeType: audioFile.mimetype,
      };
      
      // Save metadata
      const metadataPath = path.join(cacheDir, `${fileName}.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      console.log(`Saved user voice sample: ${fileName} (${audioFile.size} bytes)`);
      
      res.json({ 
        message: "Voice sample saved successfully",
        fileName,
        url: `/api/emotions/user-voice-sample/${fileName}`
      });
    } catch (error) {
      console.error("Voice sample save error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to save voice sample" });
    }
  });

  // Serve cached audio files
  app.get("/api/cached-audio/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      const filePath = path.join(process.cwd(), 'persistent-cache', 'audio', fileName);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "Audio file not found" });
      }
      
      // Serve the audio file
      res.setHeader('Content-Type', 'audio/mpeg');
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("Audio serve error:", error);
      res.status(500).json({ message: "Failed to serve audio file" });
    }
  });

  // Serve user voice samples
  app.get("/api/emotions/user-voice-sample/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      const filePath = path.join(process.cwd(), 'persistent-cache', 'user-voice-samples', fileName);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "Voice sample not found" });
      }
      
      // Serve the audio file
      res.setHeader('Content-Type', 'audio/webm');
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("Voice sample serve error:", error);
      res.status(500).json({ message: "Failed to serve voice sample" });
    }
  });

  // Character-based narration with user voice samples
  app.post("/api/stories/:id/character-narration", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const { useUserVoices = true, userId = 'user_123' } = req.body;

      if (!storyId) {
        return res.status(400).json({ message: "Story ID is required" });
      }

      // Get story with characters and emotions
      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      const characters = await storage.getStoryCharacters(storyId);
      const emotions = await storage.getStoryEmotions(storyId);
      
      // Get user voice samples if using user voices
      let userVoiceSamples = [];
      if (useUserVoices) {
        userVoiceSamples = await storage.getUserVoiceSamples(userId);
      }

      // Generate character-based narration segments
      const narrator = await import('./story-narrator');
      const narration = await narrator.storyNarrator.generateNarration(storyId, userId, {
        useUserVoices,
        characters,
        emotions,
        userVoiceSamples
      });

      console.log(`Generated character narration with ${narration.segments.length} segments`);
      res.json(narration);
    } catch (error) {
      console.error("Character narration error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate character narration" });
    }
  });

  // Basic text-to-speech for story content
  app.post("/api/stories/text-to-speech", async (req, res) => {
    try {
      const { text, voice = 'alloy' } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      // Check cache first
      const cachedAudio = getCachedAudio(text, voice);
      if (cachedAudio) {
        console.log("Using cached text-to-speech audio");
        return res.json({ url: cachedAudio });
      }

      // Generate audio using OpenAI TTS
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice as any,
        input: text.length > 4000 ? text.substring(0, 4000) : text,
        speed: 1.0,
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Save audio to cache directory
      const cacheDir = path.join(process.cwd(), 'persistent-cache', 'audio');
      await fs.mkdir(cacheDir, { recursive: true });
      
      const fileName = `story-tts-${Date.now()}.mp3`;
      const filePath = path.join(cacheDir, fileName);
      
      // Write audio file
      await fs.writeFile(filePath, buffer);
      
      const audioUrl = `/api/cached-audio/${fileName}`;
      
      console.log("Generated text-to-speech audio for story content");
      res.json({ url: audioUrl });
    } catch (error) {
      console.error("Text-to-speech error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate speech" });
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

  // Separate endpoint for audio story uploads
  app.post("/api/stories/upload-audio", upload.single('audio'), async (req, res) => {
    try {
      console.log("Received audio story upload:", req.body);
      const { title, category, authorId } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "Audio file is required" });
      }

      const filename = `story_audio_${Date.now()}.${req.file.originalname.split('.').pop()}`;
      const originalAudioUrl = `/uploads/audio/${filename}`;
      
      await fs.mkdir('./uploads/audio', { recursive: true });
      await fs.writeFile(`./uploads/audio/${filename}`, req.file.buffer);

      // Transcribe audio to text
      let processedContent;
      try {
        processedContent = await transcribeAudio(req.file.buffer);
      } catch (transcriptionError) {
        console.error("Transcription failed:", transcriptionError);
        return res.status(400).json({ message: "Failed to transcribe audio" });
      }

      // Create story with transcribed content
      const story = await storage.createStory({
        title: title || 'Untitled Voice Story',
        content: processedContent,
        summary: null,
        category: category || 'General',
        tags: [],
        extractedCharacters: [],
        extractedEmotions: [],
        voiceSampleUrl: null,
        coverImageUrl: null,
        authorId: authorId || 'test_user_123',
        uploadType: 'voice',
        originalAudioUrl,
        processingStatus: 'completed',
        copyrightInfo: null,
        licenseType: 'all_rights_reserved',
        isPublished: false,
        isAdultContent: false,
      });

      res.status(201).json(story);
    } catch (error) {
      console.error("Audio story creation error:", error);
      res.status(500).json({ message: "Failed to create story from audio" });
    }
  });

  // Main story creation endpoint for text/manual uploads
  app.post("/api/stories", async (req, res) => {
    try {


      const { title, content, category, uploadType, authorId, summary, isAdultContent } = req.body;

      // Create initial story
      const story = await storage.createStory({
        title,
        content,
        summary,
        category,
        tags: [],
        extractedCharacters: [],
        extractedEmotions: [],
        voiceSampleUrl: null,
        coverImageUrl: null,
        authorId,
        uploadType: uploadType || 'manual',
        originalAudioUrl: null,
        processingStatus: 'processing',
        copyrightInfo: null,
        licenseType: 'all_rights_reserved',
        isPublished: false,
        isAdultContent: isAdultContent || false,
      });

      // Analyze story content in background
      try {
        const analysis = await analyzeStoryContent(content);
        
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

        // Create story characters with generated images and voice assignments
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
            assignedVoice: character.assignedVoice, // Store voice assignment from analysis
            voiceSampleId: character.voiceSampleId || null,
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

  // Get individual story by ID (no auth required for viewing)
  app.get("/api/stories/:id", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const story = await storage.getStory(storyId);
      
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      
      res.json(story);
    } catch (error) {
      console.error("Error fetching story:", error);
      res.status(500).json({ message: "Failed to fetch story" });
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

  // Story Narration routes - POST to generate narration with stored voice assignments
  app.post("/api/stories/:id/narration", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const story = await storage.getStory(storyId);
      
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      // Get pre-analyzed data with voice assignments
      const characters = await storage.getStoryCharacters(storyId);
      const emotions = await storage.getStoryEmotions(storyId);
      
      console.log("Using stored characters with voice assignments:", characters.map(c => ({ name: c.name, voice: c.assignedVoice })));
      
      // Generate narration using stored analysis data and voice assignments
      const narration = await storyNarrator.generateNarration(storyId, 'user_123', {
        pacing: 'normal',
        includeCharacterVoices: true,
        useUserVoices: false,
        characters,
        emotions,
        userVoiceSamples: []
      });

      // Save the generated narration as playback
      const narrationData = {
        segments: narration.segments,
        totalDuration: narration.totalDuration,
        pacing: narration.pacing
      };
      
      await storage.createStoryPlayback({
        storyId: storyId,
        createdByUserId: 'user_123',
        narrationData: narrationData
      });

      res.json(narration);
    } catch (error) {
      console.error("Error generating story narration:", error);
      res.status(500).json({ message: "Failed to generate story narration" });
    }
  });

  // Story Narration routes - GET to retrieve existing narration
  app.get("/api/stories/:id/narration", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      
      // Check if we have a cached narration
      const existingPlayback = await storage.getStoryPlaybacks(storyId);
      if (existingPlayback.length > 0) {
        const playback = existingPlayback[0];
        if (playback.narrationData) {
          const narrationData = playback.narrationData as any;
          return res.json({
            storyId: storyId,
            totalDuration: narrationData.totalDuration || 0,
            segments: narrationData.segments || [],
            pacing: narrationData.pacing || 'normal'
          });
        }
      }

      // Return empty narration if none exists
      res.json({
        storyId: storyId,
        totalDuration: 0,
        segments: [],
        pacing: 'normal'
      });
    } catch (error) {
      console.error("Error fetching story narration:", error);
      res.status(500).json({ message: "Failed to fetch story narration" });
    }
  });

  // Grandma voice narration endpoint
  app.post('/api/stories/:id/grandma-narration', async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      
      const narration = await grandmaVoiceNarrator.generateGrandmaNarration(storyId);
      
      res.json(narration);
    } catch (error) {
      console.error('Grandma narration generation error:', error);
      res.status(500).json({ message: 'Failed to generate grandma narration' });
    }
  });

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
  app.get("/api/stories/:id/voice-assignments", async (req, res) => {
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

  // Serve cached audio files
  app.get("/api/cached-audio/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const path = require('path');
      const fs = require('fs');
      
      const filePath = path.join(process.cwd(), 'persistent-cache', 'audio', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Audio file not found" });
      }
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving cached audio:", error);
      res.status(500).json({ message: "Failed to serve audio file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
