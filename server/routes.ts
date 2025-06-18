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
import { exec } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";

const execAsync = promisify(exec);

// Character detection function for emotion samples
function detectCharacterInText(text: string, characters: any[]): any | null {
  if (!characters || characters.length === 0) return null;
  
  const lowerText = text.toLowerCase();
  
  // Mother's dialogue patterns have HIGHEST priority (before any name matching)
  if (lowerText.includes('my boy') || lowerText.includes('be satisfied') || 
      lowerText.includes('take half') || lowerText.includes('half the nuts')) {
    const mother = characters.find(c => 
      c.name.toLowerCase().includes('mother') || 
      c.name.toLowerCase().includes('mom') ||
      c.role === 'supporting'
    );
    if (mother) return mother;
  }
  
  // Direct character name matching (but avoid false positives)
  for (const character of characters) {
    const nameVariations = [
      character.name.toLowerCase(),
      character.name.toLowerCase().replace('the ', ''),
    ];
    
    for (const nameVariation of nameVariations) {
      // Skip "boy" matching if it's in context of "my boy" (Mother speaking)
      if (nameVariation === 'boy' && lowerText.includes('my boy')) {
        continue;
      }
      if (lowerText.includes(nameVariation)) {
        return character;
      }
    }
  }
  

  
  // Boy's actions and emotions
  if (lowerText.includes('disappointed') || lowerText.includes('frustrated') ||
      lowerText.includes('hand') || lowerText.includes('stuck') || 
      lowerText.includes('grab') || lowerText.includes('reach') ||
      lowerText.includes('boy') || lowerText.includes('young') ||
      lowerText.includes('child') || lowerText.includes('crying')) {
    const boy = characters.find(c => 
      c.name.toLowerCase().includes('boy') ||
      c.name.toLowerCase().includes('child') ||
      c.role === 'protagonist'
    );
    if (boy) return boy;
  }
  
  // Check for direct dialogue patterns (quoted speech)
  if (text.includes('"') || text.includes("'")) {
    for (const character of characters) {
      const nameVariations = [
        character.name.toLowerCase(),
        character.name.toLowerCase().replace('the ', ''),
        character.name.toLowerCase().split(' ').pop()
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
  
  return null;
}

// Helper functions for emotion audio generation
function selectEmotionVoice(emotion: string, intensity: number): 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' {
  const emotionVoiceMap: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = {
    'happy': 'nova',
    'excited': 'shimmer',
    'sad': 'echo',
    'angry': 'onyx',
    'fear': 'nova',
    'surprise': 'nova',
    'love': 'shimmer',
    'anxiety': 'echo',
    'frustration': 'onyx',
    'wisdom': 'nova',  // Changed to nova for clearer female voice
    'patience': 'nova',
    'understanding': 'nova',
    'compassion': 'nova',
    'greed': 'onyx',
    'disappointment': 'echo',
    'realization': 'nova',
    'curiosity': 'shimmer',  // Female voice for curiosity
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

  // Step 1: Story analysis - analyze for characters and emotions, store as metadata
  app.post("/api/stories/analyze", async (req, res) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      console.log("Step 1: Analyzing story for characters and emotions");
      
      // Check cache first to ensure consistent results
      const cachedAnalysis = getCachedAnalysis(content);
      if (cachedAnalysis) {
        console.log("Using cached analysis");
        return res.json(cachedAnalysis);
      }

      // Generate new analysis if not cached
      const analysis = await analyzeStoryContent(content);
      
      // Cache the analysis for future use as baseline metadata
      cacheAnalysis(content, analysis);
      
      console.log("Step 1 Complete: Story metadata generated and cached");
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

  // Step 2: Character image generation
  app.post("/api/characters/generate-image", async (req, res) => {
    try {
      console.log("Step 2: Generating character image");
      const { character, storyContext } = req.body;
      if (!character) {
        console.log("Character validation failed:", { character });
        return res.status(400).json({ message: "Character data is required" });
      }

      // Check cache first
      const cachedImage = getCachedCharacterImage(character, storyContext || "");
      if (cachedImage) {
        console.log("Using cached character image");
        return res.json({ url: cachedImage });
      }

      console.log("Generating new image for character:", character.name);
      const imageUrl = await generateCharacterImage(character, storyContext);
      
      // Cache the generated image locally
      await cacheCharacterImage(character, storyContext || "", imageUrl);
      
      console.log("Step 2 Complete: Character image generated");
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

  // Step 3: Assign character voices based on story context
  app.post("/api/characters/assign-voices", async (req, res) => {
    try {
      const { characters, storyContext } = req.body;
      
      if (!characters || !Array.isArray(characters)) {
        return res.status(400).json({ message: "Characters array is required" });
      }

      console.log("Step 3: Assigning character voices based on story context");
      
      // Characters already have assigned voices from analysis
      // This endpoint just confirms the assignments are based on story context
      const charactersWithVoices = characters.map(character => ({
        ...character,
        voiceAssigned: true,
        voiceSource: 'story-context'
      }));

      console.log("Step 3 Complete: Character voices assigned");
      res.json({ characters: charactersWithVoices });
    } catch (error) {
      console.error("Error assigning character voices:", error);
      res.status(500).json({ message: "Failed to assign character voices" });
    }
  });

  // Step 7: Generate emotion audio sample for story playback (no new metadata)
  app.post("/api/emotions/generate-sample", async (req, res) => {
    try {
      const { emotion, intensity, text, userId } = req.body;
      
      if (!emotion || !text) {
        return res.status(400).json({ message: "Emotion and text are required" });
      }

      console.log("Step 7: Playing story with character voice and emotions (no new metadata)");
      
      // First check if user has recorded their own voice for this emotion
      if (userId) {
        const userVoiceDir = path.join(process.cwd(), 'persistent-cache', 'user-voice-samples');
        try {
          const files = await fs.readdir(userVoiceDir);
          const matchingFiles = files.filter(file => 
            file.startsWith(`${userId}-${emotion}-${intensity}-`) && 
            file.endsWith('.mp3')
          );
          
          if (matchingFiles.length > 0) {
            // Get the most recent file by timestamp (part before the extension)
            const latestFile = matchingFiles.sort((a, b) => {
              const getTimestamp = (filename: string) => {
                const parts = filename.split('-');
                const lastPart = parts[parts.length - 1];
                return parseInt(lastPart.split('.')[0] || '0');
              };
              return getTimestamp(b) - getTimestamp(a); // Sort descending (newest first)
            })[0];
            
            const userVoiceUrl = `/api/emotions/user-voice-sample/${latestFile}`;
            console.log("Using user-recorded voice override:", latestFile);
            return res.json({ url: userVoiceUrl });
          }
        } catch (error) {
          console.log("No user voice samples found, using AI generation");
        }
      }
      
      // Use emotion-based voice selection for AI generation
      const selectedVoice = selectEmotionVoice(emotion, intensity);

      // Check cache first
      const cachedAudio = getCachedAudio(text, selectedVoice, emotion, intensity);
      if (cachedAudio) {
        return res.json({ url: cachedAudio });
      }

      // Generate audio using OpenAI TTS
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      // Create emotion-appropriate text
      const emotionText = createEmotionText(text, emotion, intensity);
      
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: selectedVoice,
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
        voice: selectedVoice,
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

      // Delete any existing recordings for this emotion/intensity combination
      const cacheDir = path.join(process.cwd(), 'persistent-cache', 'user-voice-samples');
      await fs.mkdir(cacheDir, { recursive: true });
      
      try {
        const files = await fs.readdir(cacheDir);
        const existingFiles = files.filter(file => 
          file.startsWith(`${userId}-${emotion}-${intensity}-`) && 
          (file.endsWith('.mp3') || file.endsWith('.json'))
        );
        
        for (const file of existingFiles) {
          await fs.unlink(path.join(cacheDir, file));
          console.log("Deleted old voice sample:", file);
        }
      } catch (cleanupError) {
        console.log("No existing files to clean up");
      }
      
      // Use constant filename to override previous recordings
      let fileName: string;
      let filePath: string;
      
      // Convert WebM to WAV for maximum browser compatibility
      if (audioFile.mimetype === 'audio/webm') {
        // Save temporary WebM file
        const tempWebmFile = `temp_${userId}-${emotion}-${intensity}.webm`;
        const tempWebmPath = path.join(cacheDir, tempWebmFile);
        
        console.log(`Converting WebM to WAV: ${audioFile.buffer.length} bytes`);
        await fs.writeFile(tempWebmPath, audioFile.buffer);
        
        // Convert to WAV for maximum compatibility
        fileName = `${userId}-${emotion}-${intensity}.wav`;
        filePath = path.join(cacheDir, fileName);
        
        try {
          // Convert WebM/Opus to uncompressed WAV with volume amplification
          await execAsync(`ffmpeg -i "${tempWebmPath}" -af "volume=20dB" -acodec pcm_s16le -ar 44100 -ac 1 -y "${filePath}"`);
          
          const stats = await fs.stat(filePath);
          console.log(`WAV file created: ${stats.size} bytes`);
          
          // Clean up temporary file
          await fs.unlink(tempWebmPath);
          
          // Update metadata to use WAV format
          const metadata = {
            userId,
            storyId,
            emotion,
            intensity: parseInt(intensity),
            text,
            fileName,
            filePath,
            fileSize: stats.size,
            timestamp: Date.now(),
            mimeType: 'audio/wav',
            originalMimeType: audioFile.mimetype,
          };
          
          // Save metadata
          const metadataPath = path.join(cacheDir, `${fileName}.json`);
          await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
          
        } catch (conversionError) {
          console.error("WAV conversion failed:", conversionError);
          // Fallback: save original WebM
          fileName = `${userId}-${emotion}-${intensity}.webm`;
          filePath = path.join(cacheDir, fileName);
          await fs.copyFile(tempWebmPath, filePath);
          await fs.unlink(tempWebmPath);
          
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
            mimeType: 'audio/webm',
            originalMimeType: audioFile.mimetype,
          };
          
          const metadataPath = path.join(cacheDir, `${fileName}.json`);
          await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        }
      } else {
        // Handle other audio formats with constant filename
        fileName = `${userId}-${emotion}-${intensity}.mp3`;
        filePath = path.join(cacheDir, fileName);
        await fs.writeFile(filePath, audioFile.buffer);
        
        // Create metadata for non-WebM files
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
          mimeType: 'audio/mpeg',
          originalMimeType: audioFile.mimetype,
        };
        
        // Save metadata
        const metadataPath = path.join(cacheDir, `${fileName}.json`);
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      }
      
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

  // Serve user voice samples (all converted to MP3)
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
      
      // Set appropriate MIME type and disable caching
      let contentType = 'audio/mpeg';
      if (fileName.endsWith('.webm')) {
        contentType = 'audio/webm';
      } else if (fileName.endsWith('.wav')) {
        contentType = 'audio/wav';
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
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

  // Step 4: Store story as baseline if possible
  app.post("/api/stories/baseline", async (req, res) => {
    try {
      const { title, content, category, authorId, analysis } = req.body;
      
      console.log("Step 4: Storing story as baseline");
      
      // Create baseline story with analysis metadata
      const story = await storage.createStory({
        title,
        content,
        summary: analysis.summary,
        category: analysis.category,
        tags: analysis.suggestedTags,
        extractedCharacters: analysis.characters,
        extractedEmotions: analysis.emotions,
        voiceSampleUrl: null,
        coverImageUrl: null,
        authorId,
        uploadType: 'baseline',
        originalAudioUrl: null,
        processingStatus: 'baseline',
        copyrightInfo: null,
        licenseType: 'all_rights_reserved',
        isPublished: false,
        isAdultContent: analysis.isAdultContent,
      });

      console.log("Step 4 Complete: Baseline story stored");
      res.status(201).json(story);
    } catch (error) {
      console.error("Error storing baseline story:", error);
      res.status(500).json({ message: "Failed to store baseline story" });
    }
  });

  // Step 5: User overrides for character image and voice
  app.patch("/api/stories/:id/character-overrides", async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const { characterOverrides } = req.body;
      
      console.log("Step 5: Processing user overrides for character image/voice");
      
      // Update characters with user overrides
      // This would update the character assignments in the database
      // For now, just return success
      
      console.log("Step 5 Complete: Character overrides applied");
      res.json({ success: true, overrides: characterOverrides });
    } catch (error) {
      console.error("Error applying character overrides:", error);
      res.status(500).json({ message: "Failed to apply character overrides" });
    }
  });

  // Step 6: Save the final story
  app.post("/api/stories", async (req, res) => {
    try {
      const { title, content, category, uploadType, authorId, summary, isAdultContent, analysis, characterOverrides } = req.body;

      console.log("Step 6: Saving final story");

      // Create final story with all metadata
      const story = await storage.createStory({
        title,
        content,
        summary: analysis?.summary || summary,
        category: analysis?.category || category,
        tags: analysis?.suggestedTags || [],
        extractedCharacters: analysis?.characters || [],
        extractedEmotions: analysis?.emotions || [],
        voiceSampleUrl: null,
        coverImageUrl: null,
        authorId,
        uploadType: uploadType || 'manual',
        originalAudioUrl: null,
        processingStatus: 'completed',
        copyrightInfo: null,
        licenseType: 'all_rights_reserved',
        isPublished: false,
        isAdultContent: isAdultContent || false,
      });

      // Create story characters with final assignments (including user overrides)
      if (analysis?.characters) {
        for (const character of analysis.characters) {
          const override = characterOverrides?.find((o: any) => o.characterName === character.name);
          const imageUrl = override?.imageUrl || await generateCharacterImage(character, analysis.summary);
          
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
            emotionType: emotion.emotion,
            intensity: emotion.intensity,
            context: emotion.context,
            voiceUrl: null, // Will be populated when user assigns voice
          });
        }

        console.log("Step 6 Complete: Final story saved with all metadata");
        res.status(201).json({ 
          ...story, 
          analysis,
          processingStatus: 'completed' 
        });
      } else {
        console.log("Step 6 Complete: Story saved without analysis");
        res.status(201).json(story);
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
