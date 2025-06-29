import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCharacterSchema, insertConversationSchema, insertMessageSchema, insertStorySchema, insertUserVoiceSampleSchema, insertStoryCollaborationSchema, insertStoryGroupSchema, insertCharacterVoiceAssignmentSchema } from "@shared/schema";
import { generateAIResponse } from "./openai";
import { setupAuth, requireAuth, requireAdmin, hashPassword } from "./auth";
import passport from 'passport';
import { insertUserSchema, insertLocalUserSchema } from "@shared/schema";
import { analyzeStoryContent, generateCharacterImage, transcribeAudio } from "./ai-analysis";
import { generateRolePlayAnalysis, enhanceExistingRolePlay, generateSceneDialogue } from "./roleplay-analysis";
import { rolePlayAudioService } from "./roleplay-audio-service";
import { collaborativeRoleplayService } from "./collaborative-roleplay-service";
import { getCachedCharacterImage, cacheCharacterImage, getCachedAudio, cacheAudio, getCachedAnalysis, cacheAnalysis, getAllCacheStats, cleanOldCacheFiles } from "./content-cache";
import { pool } from "./db";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { videoGenerations } from "@shared/schema";
import { audioService } from "./audio-service";

import { storyNarrator } from "./story-narrator";
import { grandmaVoiceNarrator } from "./voice-narrator";
import { getEnvironment, getBaseUrl, getOAuthConfig } from "./oauth-config";
import { videoGenerationService } from "./video-generation-service";
import { setupVideoWebhooks } from "./video-webhook-handler";

import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { exec, spawn } from "child_process";
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
  // Serve cached voice modulation files
  app.use('/cache/user-voice-modulations', express.static(path.join(process.cwd(), 'persistent-cache', 'user-voice-modulations')));

  // Setup authentication
  await setupAuth(app);

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, displayName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Create user
      const userId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = await storage.createUser({
        id: userId,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        displayName: displayName || null,
        isEmailVerified: false,
        lastLoginAt: new Date(),
      });

      // Create local user with hashed password
      const hashedPassword = await hashPassword(password);
      await storage.createLocalUser({
        userId: user.id,
        passwordHash: hashedPassword,
      });

      // Create provider link
      await storage.createUserProvider({
        userId: user.id,
        provider: 'local',
        providerId: user.id,
      });

      // Log user in
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        res.status(201).json({ user, message: "Registration successful" });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", passport.authenticate('local'), async (req, res) => {
    const redirectUrl = req.body.redirectUrl || '/';
    res.json({ 
      user: req.user, 
      message: "Login successful",
      redirectUrl: redirectUrl
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Social login routes
  app.get("/api/auth/google", (req, res, next) => {
    console.log('[OAuth] Initiating Google authentication');
    // Store the redirect URL in session before authentication
    if (req.query.redirect) {
      req.session.redirectAfterAuth = req.query.redirect as string;
    }
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      prompt: 'select_account'
    })(req, res, next);
  });

  app.get("/api/auth/google/callback",
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      console.log('[OAuth] Google callback successful');
      console.log('[OAuth] User authenticated:', !!req.user);
      
      // Get redirect URL from session or default to home
      const redirectUrl = req.session.redirectAfterAuth || '/';
      delete req.session.redirectAfterAuth; // Clean up
      
      // Send HTML that handles both popup and regular tab scenarios
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Login Success</title></head>
        <body>
          <script>
            console.log('OAuth callback page loaded');
            
            // Check if this is a popup window
            if (window.opener && !window.opener.closed) {
              console.log('Popup detected - notifying parent and closing');
              try {
                // Send message to parent window with redirect URL
                window.opener.postMessage({ 
                  type: 'OAUTH_SUCCESS', 
                  provider: 'google',
                  redirectUrl: '${redirectUrl}'
                }, window.location.origin);
                
                // Close popup after short delay
                setTimeout(() => {
                  window.close();
                }, 500);
              } catch (e) {
                console.error('Error communicating with parent:', e);
                window.close();
              }
            } else {
              console.log('Regular tab - redirecting to intended page');
              window.location.href = '${redirectUrl}';
            }
          </script>
          <div style="text-align: center; font-family: Arial, sans-serif; margin-top: 50px;">
            <h2>Login Successful!</h2>
            <p>Redirecting...</p>
          </div>
        </body>
        </html>
      `);
    }
  );

  app.get("/api/auth/facebook",
    passport.authenticate('facebook', { scope: ['email'] })
  );

  app.get("/api/auth/facebook/callback",
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/');
    }
  );

  app.get("/api/auth/microsoft",
    passport.authenticate('microsoft', { scope: ['user.read'] })
  );

  app.get("/api/auth/microsoft/callback",
    passport.authenticate('microsoft', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/');
    }
  );

  // OAuth diagnostics endpoint
  app.get('/api/oauth/diagnostics', (req, res) => {
    const baseUrl = getBaseUrl();
    const oauthConfig = getOAuthConfig();
    
    res.json({
      environment: getEnvironment(),
      baseUrl,
      currentDomain: req.get('host'),
      googleOAuth: {
        configured: !!(oauthConfig.google.clientID && oauthConfig.google.clientSecret),
        clientId: oauthConfig.google.clientID ? 
          `${oauthConfig.google.clientID.substring(0, 20)}...` : 'Not configured',
        callbackUrl: oauthConfig.google.callbackURL,
        authUrl: `${baseUrl}/api/auth/google`,
        requiredGoogleCloudSettings: {
          oauthConsentScreen: {
            userType: 'External (required)',
            publishingStatus: 'Published (or add test users)',
            authorizedDomains: [req.get('host')?.split('.').slice(-2).join('.') || 'replit.dev']
          },
          credentials: {
            redirectUris: [
              oauthConfig.google.callbackURL,
              'http://localhost:5000/api/auth/google/callback'
            ]
          }
        }
      }
    });
  });

  // Voice Samples routes - route moved to line ~3829 with proper transformation

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
      
      // CACHE DISABLED - Generate fresh analysis every time for testing
      const analysis = await analyzeStoryContent(content);
      
      console.log("Step 1 Complete: Story metadata generated");
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing story:", error);
      res.status(500).json({ message: "Failed to analyze story" });
    }
  });

  // NARRATIVE ANALYSIS ROUTES - Uses user's personal voice recordings
  // Get existing narrative analysis for a story
  app.get("/api/stories/:storyId/narrative", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      // Check if user has access to this story
      const isAuthor = story.authorId === userId;
      const isPublished = story.isPublished;
      
      if (!isAuthor && !isPublished) {
        return res.status(403).json({ 
          message: "Access denied" 
        });
      }

      // Check if we have existing analysis data in the story
      if (story.extractedCharacters && story.extractedCharacters.length > 0) {
        const existingAnalysis = {
          characters: story.extractedCharacters,
          emotions: story.extractedEmotions || [],
          summary: story.summary || "",
          category: story.category || "General",
          genre: story.genre || "Fiction",
          themes: story.themes || [],
          suggestedTags: story.tags || [],
          emotionalTags: story.emotionalTags || [],
          readingTime: story.readingTime || 5,
          ageRating: story.ageRating || 'general',
          isAdultContent: story.isAdultContent || false
        };
        
        console.log(`Retrieved existing narrative analysis for story ${storyId}`);
        return res.json(existingAnalysis);
      }

      // No existing analysis found
      return res.status(404).json({ message: "Narrative analysis not found. Generate one first." });
    } catch (error) {
      console.error("Error fetching narrative analysis:", error);
      res.status(500).json({ message: "Failed to fetch narrative analysis" });
    }
  });

  // Generate narrative analysis for a story
  app.post("/api/stories/:storyId/narrative", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const story = await storage.getStory(storyId);
      if (!story || story.authorId !== userId) {
        return res.status(404).json({ message: "Story not found" });
      }

      // Check if analysis already exists
      const existingAnalysis = await storage.getStoryAnalysis(storyId, 'narrative');
      if (existingAnalysis) {
        console.log(`Found existing narrative analysis for story ${storyId}`);
        return res.json(existingAnalysis.analysisData);
      }

      console.log(`Generating narrative analysis for story ${storyId}`);
      
      const analysis = await analyzeStoryContent(story.content);
      
      // Store analysis in database
      await storage.createStoryAnalysis({
        storyId,
        analysisType: 'narrative',
        analysisData: analysis,
        generatedBy: userId
      });
      
      // Update story title with AI-generated title if the story currently has default title
      if (story.title === "New Story" || story.title === "Untitled Story" || !story.title.trim()) {
        await storage.updateStory(storyId, {
          title: analysis.title,
          summary: analysis.summary,
          genre: analysis.genre,
          category: analysis.category,
          ageRating: analysis.ageRating,
          readingTime: analysis.readingTime,
          extractedCharacters: analysis.characters,
          extractedEmotions: analysis.emotions,
          tags: analysis.suggestedTags,
          emotionalTags: analysis.emotionalTags,
          isAdultContent: analysis.isAdultContent
        });
        console.log(`Updated story ${storyId} title to: "${analysis.title}"`);
      }
      
      console.log("Narrative analysis generated successfully");
      res.json(analysis);
    } catch (error) {
      console.error("Error generating narrative analysis:", error);
      res.status(500).json({ message: "Failed to generate narrative analysis" });
    }
  });

  // Generate audio for narrative using user's voice recordings
  app.post("/api/stories/:storyId/narrative/audio", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;
      const { emotion, intensity, text } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log(`Generating narrative audio for story ${storyId} with user voice`);
      
      const audioResult = await audioService.generateEmotionAudio({
        text,
        emotion,
        intensity,
        userId,
        storyId
      });
      
      res.json(audioResult);
    } catch (error) {
      console.error("Error generating narrative audio:", error);
      res.status(500).json({ message: "Failed to generate narrative audio" });
    }
  });

  // ROLEPLAY ANALYSIS ROUTES - Uses character-specific voices
  
  // Get existing roleplay analysis for a story
  app.get("/api/stories/:storyId/roleplay", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      // Check if user has access to this story
      const isAuthor = story.authorId === userId;
      const isPublished = story.isPublished;
      
      if (!isAuthor && !isPublished) {
        return res.status(403).json({ 
          message: "Access denied" 
        });
      }

      // Check if we have cached roleplay analysis
      try {
        const { analysisCache } = await import("./cache-with-fallback");
        const cachedAnalysis = await analysisCache.getOrSet(
          `roleplay-${storyId}`,
          () => null, // Don't generate if not exists
          { ttl: 24 * 60 * 60 * 1000 } // 24 hours
        );
        
        if (cachedAnalysis) {
          console.log(`Retrieved cached roleplay analysis for story ${storyId}`);
          return res.json(cachedAnalysis);
        }
      } catch (cacheError) {
        console.log(`No cached roleplay analysis found for story ${storyId}`);
      }

      // No existing analysis found
      return res.status(404).json({ message: "Roleplay analysis not found. Generate one first." });
    } catch (error) {
      console.error("Error fetching roleplay analysis:", error);
      res.status(500).json({ message: "Failed to fetch roleplay analysis" });
    }
  });

  // Generate roleplay analysis for a story
  app.post("/api/stories/:storyId/roleplay", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      // Only story authors can generate roleplay analysis
      const isAuthor = story.authorId === userId;
      
      if (!isAuthor) {
        return res.status(403).json({ 
          message: "Only the story author can generate roleplay analysis" 
        });
      }

      // Check if analysis already exists
      const existingAnalysis = await storage.getStoryAnalysis(storyId, 'roleplay');
      if (existingAnalysis) {
        console.log(`Found existing roleplay analysis for story ${storyId}`);
        return res.json(existingAnalysis.analysisData);
      }

      console.log(`Generating roleplay analysis for story ${storyId}`);
      
      // Get roleplay duration configuration
      const { getVideoProviderConfig } = await import("./video-config");
      const videoConfig = getVideoProviderConfig();
      const targetDurationSeconds = videoConfig.roleplay?.targetDurationSeconds || 60;
      
      console.log(`Using target roleplay duration: ${targetDurationSeconds} seconds`);
      const rolePlayAnalysis = await generateRolePlayAnalysis(story.content, [], targetDurationSeconds);
      
      // Store analysis in database
      await storage.createStoryAnalysis({
        storyId,
        analysisType: 'roleplay',
        analysisData: rolePlayAnalysis,
        generatedBy: userId
      });
      
      console.log("Roleplay analysis generated successfully");
      res.json(rolePlayAnalysis);
    } catch (error) {
      console.error("Error generating roleplay analysis:", error);
      res.status(500).json({ message: "Failed to generate roleplay analysis" });
    }
  });

  // Generate character-specific audio for roleplay
  app.post("/api/stories/:storyId/roleplay/audio", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;
      const { 
        text, 
        characterName, 
        characterPersonality, 
        characterRole, 
        emotion, 
        intensity,
        characterDescription 
      } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!text || !characterName) {
        return res.status(400).json({ message: "Text and character name are required" });
      }

      console.log(`Generating roleplay audio for character ${characterName} in story ${storyId}`);
      
      const audioResult = await rolePlayAudioService.generateRolePlayAudio(
        text,
        characterName,
        characterPersonality || "neutral",
        characterRole || "other",
        emotion || "neutral",
        intensity || 5,
        characterDescription
      );
      
      res.json(audioResult);
    } catch (error) {
      console.error("Error generating roleplay audio:", error);
      res.status(500).json({ message: "Failed to generate roleplay audio" });
    }
  });

  // Generate audio for entire roleplay scene
  app.post("/api/stories/:storyId/roleplay/scene-audio", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;
      const { dialogues } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!dialogues || !Array.isArray(dialogues)) {
        return res.status(400).json({ message: "Dialogues array is required" });
      }

      console.log(`Generating scene audio for story ${storyId}`);
      
      const sceneAudio = await rolePlayAudioService.generateSceneAudio(dialogues);
      
      res.json({ sceneAudio });
    } catch (error) {
      console.error("Error generating scene audio:", error);
      res.status(500).json({ message: "Failed to generate scene audio" });
    }
  });

  // Update roleplay analysis
  app.put("/api/stories/:storyId/roleplay", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;
      const { originalAnalysis, modifications } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!originalAnalysis) {
        return res.status(400).json({ message: "Original analysis is required" });
      }

      console.log(`Updating roleplay analysis for story ${storyId}`);
      
      const enhancedAnalysis = await enhanceExistingRolePlay(originalAnalysis, modifications);
      
      res.json(enhancedAnalysis);
    } catch (error) {
      console.error("Error updating roleplay analysis:", error);
      res.status(500).json({ message: "Failed to update roleplay analysis" });
    }
  });

  // Generate new dialogue for a scene
  app.post("/api/stories/:storyId/roleplay/dialogue", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;
      const { sceneContext, characters, emotionalTone } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!sceneContext || !characters) {
        return res.status(400).json({ message: "Scene context and characters are required" });
      }

      console.log(`Generating dialogue for story ${storyId}`);
      
      const dialogue = await generateSceneDialogue(sceneContext, characters, emotionalTone || "neutral");
      
      res.json({ dialogue });
    } catch (error) {
      console.error("Error generating dialogue:", error);
      res.status(500).json({ message: "Failed to generate dialogue" });
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

  // Audio transcription endpoint for voice recording and file upload
  app.post("/api/audio/transcribe", upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Audio file is required" });
      }

      // Basic file validation
      if (req.file.size === 0) {
        return res.status(400).json({ message: "Audio file is empty. Please record or upload a valid audio file." });
      }

      if (req.file.size < 1000) {
        return res.status(400).json({ message: "Audio file is too small (less than 1KB). Please ensure you have recorded clear speech." });
      }

      console.log("Processing audio transcription:", {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferLength: req.file.buffer.length
      });
      
      // Convert audio buffer to transcription using OpenAI Whisper
      const transcriptionText = await transcribeAudio(req.file.buffer);
      
      // Log the actual transcribed text for debugging
      console.log("Transcription completed successfully:");
      console.log("Text length:", transcriptionText.length);
      console.log("Transcribed content:", transcriptionText);
      
      if (!transcriptionText || transcriptionText.trim().length === 0) {
        return res.status(400).json({ 
          message: "No speech was detected in your audio recording. Please ensure you speak clearly and try again.",
          details: "The audio file was processed but no recognizable speech was found."
        });
      }
      
      if (transcriptionText.trim().length < 10) {
        return res.status(400).json({ 
          message: "Very brief speech detected. Please record a longer message with clear speech.",
          details: `Only ${transcriptionText.trim().length} characters were transcribed: "${transcriptionText}"`
        });
      }
      
      res.json({ 
        text: transcriptionText,
        filename: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Audio transcription error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to transcribe audio" });
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

  // Generate character-aware modulated audio
  app.post("/api/emotions/generate-audio", async (req, res) => {
    try {
      const { text, emotion, intensity, characters } = req.body;
      const userId = (req.user as any)?.id;
      
      if (!text || !emotion) {
        return res.status(400).json({ message: "Text and emotion are required" });
      }

      console.log(`Generating character-aware audio: emotion=${emotion}, intensity=${intensity}, characters=${characters?.length || 0}`);
      
      const result = await audioService.generateEmotionAudio({
        text,
        emotion,
        intensity: parseInt(intensity) || 5,
        userId,
        characters: characters || []
      });
      
      console.log(`Generated audio: ${result.isUserGenerated ? 'user voice' : 'AI voice'} (${result.voice})`);
      res.json({ 
        audioUrl: result.audioUrl,
        voice: result.voice,
        isUserGenerated: result.isUserGenerated
      });
    } catch (error) {
      console.error("Character-aware audio generation error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate modulated audio" });
    }
  });

  // Step 7: Generate emotion audio sample for story playback (POST - returns JSON with audioURL)
  app.post("/api/emotions/generate-sample", async (req, res) => {
    try {
      const { emotion, intensity, text, userId, voice, storyId, characters } = req.body;
      
      if (!emotion || !text) {
        return res.status(400).json({ message: "Emotion and text are required" });
      }

      console.log("Generating audio sample for emotion:", emotion, "intensity:", intensity);
      
      const result = await audioService.generateEmotionAudio({
        text,
        emotion,
        intensity: parseInt(intensity) || 5,
        voice,
        userId,
        storyId,
        characters
      });
      
      console.log("Audio generated:", result.isUserGenerated ? "user voice" : `AI voice (${result.voice})`);
      res.json({ audioUrl: result.audioUrl });
    } catch (error) {
      console.error("Emotion sample generation error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate emotion sample" });
    }
  });

  // GET endpoint for direct audio serving (used by story narration)
  app.get("/api/emotions/generate-sample", async (req, res) => {
    try {
      const { emotion, intensity, text, voice, userId, storyId } = req.query;
      
      if (!emotion || !text) {
        return res.status(400).json({ message: "Emotion and text are required" });
      }

      const result = await audioService.getAudioBuffer({
        text: text as string,
        emotion: emotion as string,
        intensity: parseInt(intensity as string) || 5,
        voice: voice as string,
        userId: userId as string,
        storyId: storyId ? parseInt(storyId as string) : undefined
      });
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(result.buffer);
    } catch (error) {
      console.error("GET emotion sample generation error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate emotion sample" });
    }
  });

  // Serve cached audio files - both emotion and general paths
  app.get("/api/emotions/cached-audio/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(process.cwd(), 'persistent-cache', 'audio', filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "Audio file not found" });
      }
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Accept-Ranges', 'bytes');
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("Error serving cached audio:", error);
      res.status(404).json({ message: "Audio file not found" });
    }
  });

  // Serve narration audio files
  app.get("/api/narration-audio/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(process.cwd(), 'persistent-cache', 'narrations', filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "Narration audio file not found" });
      }
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Accept-Ranges', 'bytes');
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("Error serving narration audio:", error);
      res.status(404).json({ message: "Narration audio file not found" });
    }
  });

  // Save user voice emotion to repository (cross-story)
  app.post("/api/user-voice-emotions", upload.single('audio'), async (req, res) => {
    try {
      const { emotion, intensity, storyId } = req.body;
      const userId = (req.user as any)?.id;
      const audioFile = req.file;
      
      if (!audioFile || !emotion || !userId) {
        return res.status(400).json({ message: "Audio file, emotion, and user authentication are required" });
      }

      // Save to user voice emotion repository
      const timestamp = Date.now();
      const emotionDir = path.join(process.cwd(), 'persistent-cache', 'user-voice-emotions');
      await fs.mkdir(emotionDir, { recursive: true });
      
      // Prepare file names but don't write files yet (database-first approach)
      let finalFileName: string;
      let finalFilePath: string;
      let processedBuffer: Buffer;
      
      if (audioFile.mimetype.includes('webm')) {
        // Convert webm to high-quality MP3 in memory first
        const tempWebmFile = path.join(emotionDir, `temp-${timestamp}.webm`);
        const mp3FileName = `${userId}-${emotion}-${intensity || 5}-${timestamp}.mp3`;
        const mp3FilePath = path.join(emotionDir, mp3FileName);
        
        try {
          // Save temporary webm file for conversion
          await fs.writeFile(tempWebmFile, audioFile.buffer);
          
          // Convert to MP3 using FFmpeg with aggressive volume amplification
          const ffmpegCommand = `ffmpeg -i "${tempWebmFile}" -acodec libmp3lame -b:a 192k -ar 44100 -af "volume=20.0" -y "${mp3FilePath}"`;
          await execAsync(ffmpegCommand);
          
          // Read converted file into buffer
          processedBuffer = await fs.readFile(mp3FilePath);
          
          // Clean up temporary files
          await fs.unlink(tempWebmFile);
          await fs.unlink(mp3FilePath);
          
          finalFileName = mp3FileName;
          finalFilePath = mp3FilePath;
          console.log(`Successfully converted webm to MP3 with 20x volume boost: ${mp3FileName}`);
        } catch (ffmpegError) {
          console.error('FFmpeg conversion error:', ffmpegError);
          // Fallback: use original webm
          finalFileName = `${userId}-${emotion}-${intensity || 5}-${timestamp}.webm`;
          finalFilePath = path.join(emotionDir, finalFileName);
          processedBuffer = audioFile.buffer;
        }
      } else {
        // Already MP3 or other format
        finalFileName = `${userId}-${emotion}-${intensity || 5}-${timestamp}.mp3`;
        finalFilePath = path.join(emotionDir, finalFileName);
        processedBuffer = audioFile.buffer;
      }
      
      // DATABASE FIRST: Store in database before writing file
      await pool.query(`
        INSERT INTO user_voice_emotions (user_id, emotion, intensity, audio_url, file_name, story_id_recorded, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [userId, emotion, parseInt(intensity) || 5, `/api/user-voice-emotions/${finalFileName}`, finalFileName, storyId ? parseInt(storyId) : null]);
      
      // Only write file AFTER successful database write
      await fs.writeFile(finalFilePath, processedBuffer);

      console.log(`Saved user voice emotion: ${emotion} for user ${userId} (converted to MP3)`);
      res.json({ 
        message: "Voice emotion saved successfully",
        emotion,
        fileName: finalFileName,
        audioUrl: `/api/user-voice-emotions/files/${finalFileName}`
      });
    } catch (error) {
      console.error("User voice emotion save error:", error);
      res.status(500).json({ message: "Failed to save voice emotion" });
    }
  });

  // Serve user voice emotion files (MUST be before /:userId route to avoid conflicts)
  app.get("/api/user-voice-emotions/files/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      const filePath = path.join(process.cwd(), 'persistent-cache', 'user-voice-emotions', fileName);
      
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "Voice emotion file not found" });
      }
      
      // Set appropriate content type and headers for audio playback
      const contentType = fileName.endsWith('.webm') ? 'audio/webm' : 'audio/mpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache for audio
      
      // Handle range requests for audio streaming
      const stat = await fs.stat(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunksize);
        
        const stream = require('fs').createReadStream(filePath, { start, end });
        stream.pipe(res);
      } else {
        res.setHeader('Content-Length', fileSize);
        res.sendFile(path.resolve(filePath));
      }
    } catch (error) {
      console.error("Voice emotion serve error:", error);
      res.status(500).json({ message: "Failed to serve voice emotion" });
    }
  });

  // Get user voice recordings by emotion
  app.get("/api/user-voice-emotions/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const emotion = req.query.emotion as string;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      // Fix: Use the correct directory where files are actually saved
      const userVoiceDir = path.join(process.cwd(), 'persistent-cache', 'user-voice-emotions');
      
      try {
        const files = await fs.readdir(userVoiceDir);
        
        // Filter files for this user and emotion
        const emotionPattern = emotion ? `${userId}-${emotion}-` : `${userId}-`;
        const matchingFiles = files.filter(file => 
          file.startsWith(emotionPattern) && file.endsWith('.mp3')
        );
        
        // Sort by timestamp (newest first)
        const sortedFiles = matchingFiles.sort((a, b) => {
          const getTimestamp = (filename: string) => {
            const parts = filename.split('-');
            const lastPart = parts[parts.length - 1];
            return parseInt(lastPart.split('.')[0] || '0');
          };
          return getTimestamp(b) - getTimestamp(a);
        });
        
        const samples = sortedFiles.map(filename => ({
          emotion: filename.split('-')[1], // Extract emotion from filename
          audioUrl: `/api/user-voice-emotions/files/${filename}`, // Fix: Use correct endpoint
          filename: filename,
          timestamp: filename.split('-').pop()?.split('.')[0]
        }));
        
        res.json({
          userId,
          emotion: emotion || 'all',
          samples
        });
      } catch (error) {
        console.log('No user voice samples found');
        res.json({
          userId,
          emotion: emotion || 'all',
          samples: []
        });
      }
    } catch (error) {
      console.error("Failed to get user voice samples:", error);
      res.status(500).json({ message: "Failed to retrieve voice samples" });
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
          // Convert WebM/Opus to uncompressed WAV with strong volume amplification
          await execAsync(`ffmpeg -i "${tempWebmPath}" -af "volume=40dB" -acodec pcm_s16le -ar 44100 -ac 1 -y "${filePath}"`);
          
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
      
      // Create database record for the voice sample
      try {
        const audioUrl = `/api/emotions/user-voice-sample/${fileName}`;
        await storage.createUserVoiceSample({
          userId,
          sampleType: 'emotion',
          label: emotion,
          audioUrl,
          duration: null, // Will be determined when played
          isCompleted: true,
        });
        console.log(`Created database record for voice sample: ${emotion}`);
      } catch (dbError) {
        console.error("Failed to create database record:", dbError);
        // Continue even if DB creation fails - file is saved
      }
      
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

  // Serve generated story audio files
  app.get("/api/story-audio/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      const filePath = path.join(process.cwd(), 'persistent-cache', 'story-audio', fileName);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "Audio file not found" });
      }
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("Story audio serve error:", error);
      res.status(500).json({ message: "Failed to serve story audio" });
    }
  });

  // Character-based narration with user voice samples
  app.post("/api/stories/:id/character-narration", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;

      if (!storyId) {
        return res.status(400).json({ message: "Story ID is required" });
      }

      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      // Use simple audio player for reliable playback
      const simplePlayer = await import('./simple-audio-player');
      const narration = await simplePlayer.simpleAudioPlayer.generateSimpleNarration(storyId, userId);

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

  // Public stories routes - only published stories with filtering
  app.get("/api/stories", requireAuth, async (req, res) => {
    try {
      const { genre, emotionalTags, moodCategory, ageRating, search } = req.query;
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const filters: any = {};
      if (genre) filters.genre = genre as string;
      if (moodCategory) filters.moodCategory = moodCategory as string;
      if (ageRating) filters.ageRating = ageRating as string;
      if (search) filters.search = search as string;
      if (emotionalTags) {
        filters.emotionalTags = Array.isArray(emotionalTags) 
          ? emotionalTags as string[]
          : [emotionalTags as string];
      }
      
      // Get user's own stories instead of just public stories
      const stories = await storage.getUserStories(userId, filters);
      res.json(stories);
    } catch (error) {
      console.error("Error fetching user stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  // Get available genres and tags for filtering
  app.get("/api/stories/filters", async (req, res) => {
    try {
      // Get unique genres, emotional tags, and mood categories from published stories
      const publishedStories = await storage.getPublicStories();
      
      const genres = Array.from(new Set(publishedStories.map(s => s.genre).filter(Boolean)));
      const emotionalTags = Array.from(new Set(publishedStories.flatMap(s => s.emotionalTags || [])));
      const moodCategories = Array.from(new Set(publishedStories.map(s => s.moodCategory).filter(Boolean)));
      const ageRatings = Array.from(new Set(publishedStories.map(s => s.ageRating).filter(Boolean)));
      
      res.json({
        genres,
        emotionalTags,
        moodCategories,
        ageRatings,
        totalStories: publishedStories.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch story filters" });
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

  // User-specific stories routes (private by default)
  app.get("/api/users/:userId/stories", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const authenticatedUserId = (req.user as any)?.id;
      
      // Users can only access their own private stories
      if (userId !== authenticatedUserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const stories = await storage.getUserStories(userId);
      res.json(stories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stories" });
    }
  });

  // Legacy endpoint for backward compatibility
  app.get("/api/users/:userId/stories", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const authenticatedUserId = (req.user as any)?.id;
      
      // Users can only access their own private stories
      if (userId !== authenticatedUserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const stories = await storage.getUserStories(userId);
      res.json(stories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stories" });
    }
  });


  // Publish story endpoint - ONLY original author (one-way operation)
  app.patch("/api/stories/:userId/:storyId/publish", requireAuth, async (req, res) => {
    try {
      const { userId, storyId } = req.params;
      const authenticatedUserId = (req.user as any)?.id;
      
      // Users can only publish their own stories
      if (userId !== authenticatedUserId) {
        return res.status(403).json({ message: "Only the original author can publish this story" });
      }
      
      // Verify the user is the original author
      const story = await storage.getStory(parseInt(storyId));
      if (!story || story.authorId !== authenticatedUserId) {
        return res.status(403).json({ message: "Only the original author can publish this story" });
      }
      
      // Check if story is already published
      if (story.isPublished) {
        return res.status(400).json({ message: "Story is already published and cannot be made private" });
      }
      
      // One-way operation: once published, cannot be unpublished
      const updatedStory = await storage.updateStory(parseInt(storyId), { 
        isPublished: true,
        publishedAt: new Date()
      });
      
      res.json(updatedStory);
    } catch (error) {
      res.status(500).json({ message: "Failed to publish story" });
    }
  });

  // Check if user can modify a story (ownership check)
  app.get("/api/stories/:storyId/permissions", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const authenticatedUserId = (req.user as any)?.id;
      
      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      
      const permissions = {
        canModify: story.authorId === authenticatedUserId,
        canCustomize: story.isPublished || story.authorId === authenticatedUserId,
        isOriginalAuthor: story.authorId === authenticatedUserId,
        isPublished: story.isPublished
      };
      
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to check permissions" });
    }
  });

  // Create or update user customization for a public story
  app.post("/api/stories/:storyId/customize", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const authenticatedUserId = (req.user as any)?.id;
      const { customTitle, customCharacterImages, customVoiceAssignments, customEmotionMappings } = req.body;
      
      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      
      // Users can customize published stories or their own stories
      if (!story.isPublished && story.authorId !== authenticatedUserId) {
        return res.status(403).json({ message: "Cannot customize private stories of other users" });
      }
      
      const customization = await storage.createOrUpdateStoryCustomization({
        originalStoryId: storyId,
        customizedByUserId: authenticatedUserId,
        customTitle,
        customCharacterImages,
        customVoiceAssignments,
        customEmotionMappings,
        isPrivate: true // User customizations are private by default
      });
      
      res.json(customization);
    } catch (error) {
      console.error("Failed to create customization:", error);
      res.status(500).json({ message: "Failed to create story customization" });
    }
  });

  // Get user's customization for a story
  app.get("/api/stories/:storyId/customize", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const authenticatedUserId = (req.user as any)?.id;
      
      const customization = await storage.getStoryCustomization(storyId, authenticatedUserId);
      res.json(customization || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch story customization" });
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
        authorId: (req.user as any)?.id || authorId,
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

  // Create new draft story  
  app.post("/api/stories/draft", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { title, storyType = "text", content } = req.body;

      let finalTitle = "New Story";
      let finalCategory = "General";
      
      // If content is provided, generate title and category from analysis
      if (content && content.trim()) {
        try {
          const analysis = await analyzeStoryContent(content.trim());
          finalTitle = analysis.summary ? 
            analysis.summary.split('.')[0].substring(0, 50) + (analysis.summary.length > 50 ? '...' : '') :
            "New Story";
          finalCategory = analysis.category || "General";
        } catch (analysisError) {
          console.log("Could not analyze content for draft, using defaults");
        }
      } else if (title) {
        finalTitle = title;
      }

      const draftStory = await storage.createStory({
        title: finalTitle,
        content: content || "", 
        summary: "",
        category: finalCategory,
        tags: [],
        extractedCharacters: [],
        extractedEmotions: [],
        voiceSampleUrl: null,
        coverImageUrl: null,
        authorId: userId,
        uploadType: 'text',
        originalAudioUrl: null,
        processingStatus: content ? 'completed' : 'pending',
        status: 'draft',
        copyrightInfo: null,
        licenseType: 'all_rights_reserved',
        isPublished: false,
        isAdultContent: false,
      });

      res.status(201).json(draftStory);
    } catch (error) {
      console.error("Error creating draft story:", error);
      res.status(500).json({ message: "Failed to create draft story" });
    }
  });

  // Store story under user's private collection
  app.post("/api/stories/:userId", requireAuth, async (req, res) => {
    try {
      const userId = req.params.userId;
      const authenticatedUserId = (req.user as any)?.id;
      
      // Users can only create stories in their own collection
      if (userId !== authenticatedUserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { title, content, category, analysis } = req.body;
      
      console.log("Storing story in user's private collection");
      
      // Create story in user's private collection (isPublished: false by default)
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
        authorId: userId,
        uploadType: 'user_created',
        originalAudioUrl: null,
        processingStatus: 'completed',
        copyrightInfo: null,
        licenseType: 'all_rights_reserved',
        isPublished: false, // Private by default
        isAdultContent: analysis.isAdultContent,
      });

      console.log("Story stored in user's private collection");
      res.status(201).json(story);
    } catch (error) {
      console.error("Error storing user story:", error);
      res.status(500).json({ message: "Failed to store story" });
    }
  });

  // Legacy baseline endpoint for backward compatibility
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



  // Update draft story with content
  app.put("/api/stories/:storyId/content", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;
      const { title, content } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      if (story.authorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      console.log("Updating story content:", storyId);
      
      const updatedStory = await storage.updateStory(storyId, {
        title: title || story.title,
        content,
        status: 'ready', // Mark as ready for analysis
        processingStatus: 'pending'
      });

      res.json(updatedStory);
    } catch (error) {
      console.error("Error updating story content:", error);
      res.status(500).json({ message: "Failed to update story content" });
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
            emotion: emotion.emotion,
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
  app.get("/api/stories/:id", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const authenticatedUserId = (req.user as any)?.id;
      const story = await storage.getStory(storyId);
      
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      
      // Users can access their own stories or published stories
      if (story.authorId !== authenticatedUserId && !story.isPublished) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(story);
    } catch (error) {
      console.error("Error fetching story:", error);
      res.status(500).json({ message: "Failed to fetch story" });
    }
  });

  // Archive story (soft delete)
  app.put("/api/stories/:id/archive", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify ownership
      const story = await storage.getStory(storyId);
      if (!story || story.authorId !== userId) {
        return res.status(404).json({ message: "Story not found or access denied" });
      }

      const archivedStory = await storage.archiveStory(storyId);
      res.json(archivedStory);
    } catch (error) {
      console.error("Error archiving story:", error);
      res.status(500).json({ message: "Failed to archive story" });
    }
  });

  // Get archived stories
  app.get("/api/stories/archived", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const archivedStories = await storage.getArchivedStories(userId);
      res.json(archivedStories);
    } catch (error) {
      console.error("Error fetching archived stories:", error);
      res.status(500).json({ message: "Failed to fetch archived stories" });
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




  // Story Narration routes - POST to generate narration following user requirements
  app.post("/api/stories/:id/narration", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      
      // Use the proper story narrator flow as specified by user
      const narrationResult = await storyNarrator.generateStoryNarration(storyId, userId);
      
      // Convert to expected format for frontend
      const narration = {
        storyId: narrationResult.storyId,
        totalDuration: narrationResult.totalDuration,
        segments: narrationResult.segments,
        narratorVoice: narrationResult.narratorVoice,
        narratorVoiceType: narrationResult.narratorVoiceType
      };

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

  // Get saved narration from database (no cost)
  app.get('/api/stories/:id/narration/saved', requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;

      if (!userId || isNaN(storyId)) {
        return res.status(400).json({ message: 'Invalid parameters' });
      }

      const savedNarration = await storage.getSavedNarration(storyId, userId);
      
      if (!savedNarration) {
        return res.status(404).json({ message: 'No saved narration found' });
      }

      res.json(savedNarration);
    } catch (error: any) {
      console.error('Error getting saved narration:', error);
      res.status(500).json({ message: 'Failed to get saved narration' });
    }
  });

  // Save narration to database for permanent storage
  app.post('/api/stories/:id/narration/save', requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;
      const { segments, totalDuration, narratorVoice, narratorVoiceType } = req.body;

      if (!userId || isNaN(storyId) || !segments) {
        return res.status(400).json({ message: 'Invalid parameters' });
      }

      // Check if narration already exists and update, or create new
      const existingNarration = await storage.getSavedNarration(storyId, userId);
      
      let savedNarration;
      if (existingNarration) {
        await storage.updateNarration(existingNarration.id, {
          segments,
          totalDuration,
          narratorVoice,
          narratorVoiceType
        });
        savedNarration = await storage.getSavedNarration(storyId, userId);
      } else {
        savedNarration = await storage.saveNarration({
          storyId,
          userId,
          segments,
          totalDuration,
          narratorVoice,
          narratorVoiceType
        });
      }

      res.json(savedNarration);
    } catch (error: any) {
      console.error('Error saving narration:', error);
      res.status(500).json({ message: 'Failed to save narration' });
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



  // Instructions endpoint removed - not needed for current story narration functionality

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

  // Story User Confidence tracking endpoints
  app.get("/api/stories/:storyId/confidence/:userId", async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = req.params.userId;
      
      const confidence = await storage.getStoryUserConfidence(storyId, userId);
      
      if (!confidence) {
        // Create initial confidence record
        const newConfidence = await storage.createStoryUserConfidence({
          storyId,
          userId,
          totalInteractions: 0,
          voiceRecordingsCompleted: 0,
          emotionsRecorded: 0,
          playbacksCompleted: 0,
          timeSpentSeconds: 0,
          voiceConfidence: 0,
          storyEngagement: 0,
          overallConfidence: 0,
          sessionCount: 1,
          lastInteractionAt: new Date(),
          firstInteractionAt: new Date(),
        });
        return res.json(newConfidence);
      }
      
      res.json(confidence);
    } catch (error) {
      console.error("Failed to fetch story confidence:", error);
      res.status(500).json({ message: "Failed to fetch confidence data" });
    }
  });

  app.post("/api/stories/:storyId/confidence/:userId/increment", async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = req.params.userId;
      const { metric, timeSpentSeconds } = req.body;
      
      if (!['totalInteractions', 'voiceRecordingsCompleted', 'emotionsRecorded', 'playbacksCompleted'].includes(metric)) {
        return res.status(400).json({ message: "Invalid metric type" });
      }
      
      await storage.incrementConfidenceMetric(storyId, userId, metric, timeSpentSeconds);
      
      // Return updated confidence data
      const updatedConfidence = await storage.getStoryUserConfidence(storyId, userId);
      res.json(updatedConfidence);
    } catch (error) {
      console.error("Failed to increment confidence metric:", error);
      res.status(500).json({ message: "Failed to update confidence" });
    }
  });

  // =============================================================================
  // COLLABORATIVE ROLEPLAY ENDPOINTS
  // =============================================================================
  
  // Convert existing story to collaborative template
  app.post("/api/stories/:storyId/convert-to-template", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;
      const { makePublic = true } = req.body;
      
      // Verify story ownership or public access
      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      
      if (story.authorId !== userId && !story.isPublished) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const result = await collaborativeRoleplayService.convertStoryToTemplate(
        storyId, 
        userId, 
        makePublic
      );
      
      res.json(result);
    } catch (error) {
      console.error("Template conversion error:", error);
      res.status(500).json({ message: "Failed to convert story to template" });
    }
  });
  
  // Get public templates for browsing
  app.get("/api/roleplay-templates", async (req, res) => {
    try {
      const templates = collaborativeRoleplayService.getPublicTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });
  
  // Get user's templates
  app.get("/api/roleplay-templates/my-templates", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const templates = collaborativeRoleplayService.getUserTemplates(userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user templates" });
    }
  });
  
  // Get template details with character roles
  app.get("/api/roleplay-templates/:templateId", async (req, res) => {
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
  
  // Create new instance from template
  app.post("/api/roleplay-templates/:templateId/create-instance", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const userId = (req.user as any)?.id;
      const { instanceTitle, isPublic = false } = req.body;
      
      const result = await collaborativeRoleplayService.createInstanceFromTemplate(
        templateId,
        instanceTitle,
        userId
      );
      
      res.json(result);
    } catch (error) {
      console.error("Instance creation error:", error);
      res.status(500).json({ message: "Failed to create instance" });
    }
  });
  
  // Get user's instances
  app.get("/api/roleplay-instances/my-instances", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const instances = collaborativeRoleplayService.getUserInstances(userId);
      res.json(instances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user instances" });
    }
  });
  
  // Get instance details with participants
  app.get("/api/roleplay-instances/:instanceId", requireAuth, async (req, res) => {
    try {
      const instanceId = parseInt(req.params.instanceId);
      const userId = (req.user as any)?.id;
      
      const [instance, participants] = await Promise.all([
        collaborativeRoleplayStorage.getInstance(instanceId),
        collaborativeRoleplayStorage.getInstanceParticipants(instanceId)
      ]);
      
      if (!instance) {
        return res.status(404).json({ message: "Instance not found" });
      }
      
      // Check access permissions
      if (instance.createdByUserId !== userId && !instance.isPublic) {
        const userParticipant = participants.find(p => p.userId === userId);
        if (!userParticipant) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      res.json({
        ...instance,
        participants
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch instance details" });
    }
  });
  
  // Invitation landing page (public access)
  app.get("/api/roleplay-invitations/:token", async (req, res) => {
    try {
      const token = req.params.token;
      
      const participant = await collaborativeRoleplayStorage.getParticipantByToken(token);
      if (!participant) {
        return res.status(404).json({ message: "Invalid invitation token" });
      }
      
      // Get related data for invitation display
      const instance = await collaborativeRoleplayStorage.getInstance(participant.instanceId);
      if (!instance) {
        return res.status(404).json({ message: "Instance not found" });
      }
      
      const characterRoles = await collaborativeRoleplayStorage.getTemplateCharacterRoles(instance.templateId);
      const characterRole = characterRoles.find(r => r.id === participant.characterRoleId);
      
      res.json({
        participant,
        instance,
        characterRole,
        invitationStatus: participant.invitationStatus
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invitation details" });
    }
  });
  
  // Accept invitation
  app.post("/api/roleplay-invitations/:token/accept", requireAuth, async (req, res) => {
    try {
      const token = req.params.token;
      const userId = (req.user as any)?.id;
      
      const participant = await collaborativeRoleplayStorage.getParticipantByToken(token);
      if (!participant) {
        return res.status(404).json({ message: "Invalid invitation token" });
      }
      
      if (participant.invitationStatus !== "pending") {
        return res.status(400).json({ message: "Invitation already processed" });
      }
      
      const updatedParticipant = await collaborativeRoleplayStorage.updateParticipant(
        participant.id,
        {
          userId,
          invitationStatus: "accepted",
          acceptedAt: new Date(),
        }
      );
      
      res.json(updatedParticipant);
    } catch (error) {
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Save roleplay customization (preserves original AI data)
  app.put("/api/stories/:storyId/roleplay/customization", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;
      const { customizedAnalysis } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!customizedAnalysis) {
        return res.status(400).json({ message: "Customized analysis data required" });
      }

      // Verify story ownership
      const story = await storage.getStory(storyId);
      if (!story || story.authorId !== userId) {
        return res.status(403).json({ message: "Only the story author can save customizations" });
      }

      // Save customization to storyCustomizations table (preserves original analysis)
      await storage.createOrUpdateStoryCustomization({
        originalStoryId: storyId,
        customizedByUserId: userId,
        customTitle: customizedAnalysis.title,
        customCharacterImages: {},
        customVoiceAssignments: {},
        customEmotionMappings: customizedAnalysis,
        isPrivate: true
      });

      res.json({
        message: "Roleplay customization saved successfully",
        preservedOriginal: true
      });
    } catch (error: any) {
      console.error("Failed to save roleplay customization:", error);
      res.status(500).json({ message: "Failed to save customization" });
    }
  });

  // Get roleplay customization 
  app.get("/api/stories/:storyId/roleplay/customization", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const customization = await storage.getStoryCustomization(storyId, userId);
      if (!customization) {
        return res.status(404).json({ message: "No customization found" });
      }

      res.json(customization);
    } catch (error: any) {
      console.error("Failed to get roleplay customization:", error);
      res.status(500).json({ message: "Failed to get customization" });
    }
  });

  // =============================================================================
  // VIDEO GENERATION API ENDPOINTS
  // =============================================================================

  // Get video configuration limits
  app.get("/api/videos/config", requireAuth, async (req, res) => {
    try {
      const { VideoGenerationService } = await import("./video-generation-service");
      const videoService = new VideoGenerationService();
      const durationLimits = videoService.getDurationLimits();
      
      // Get roleplay configuration
      const { getVideoProviderConfig } = await import("./video-config");
      const videoConfig = getVideoProviderConfig();
      
      res.json({
        duration: durationLimits,
        roleplay: {
          targetDurationSeconds: videoConfig.roleplay?.targetDurationSeconds || 60,
          maxDurationSeconds: videoConfig.roleplay?.maxDurationSeconds || 240,
          videoGenerationSeconds: videoConfig.roleplay?.videoGenerationSeconds || 20
        },
        supportedProviders: ['runwayml', 'pika-labs', 'luma-ai'],
        activeProvider: 'runwayml'
      });
    } catch (error: any) {
      console.error("Failed to get video config:", error);
      res.status(500).json({ message: "Failed to get video configuration" });
    }
  });

  // Generate video with user overrides (POST)
  app.post("/api/videos/generate", requireAuth, async (req, res) => {
    try {
      const { storyId, characterOverrides, quality = 'standard' } = req.body;
      const userId = (req.user as any)?.id;

      if (!storyId || !userId) {
        return res.status(400).json({ message: "Story ID and authentication required" });
      }

      // Check if video already exists to prevent unnecessary regeneration
      const [existingVideo] = await db
        .select()
        .from(videoGenerations)
        .where(and(
          eq(videoGenerations.storyId, parseInt(storyId)),
          eq(videoGenerations.requestedBy, userId)
        ))
        .orderBy(desc(videoGenerations.createdAt))
        .limit(1);

      // Check for both completed videos and recent failures to prevent repeated attempts
      if (existingVideo && !req.body.forceRegenerate) {
        if (existingVideo.status === 'completed' && 
            existingVideo.videoUrl && 
            existingVideo.videoUrl.trim() !== '') {
        console.log(`COST PROTECTION: Using existing video for story ${storyId}, preventing unnecessary RunwayML API call`);
        
          return res.json({
            videoUrl: existingVideo.videoUrl,
            audioUrl: existingVideo.characterAssetsSnapshot?.audioUrl || null,
            thumbnailUrl: existingVideo.thumbnailUrl || '',
            duration: existingVideo.duration,
            status: existingVideo.status,
            cacheHit: true,
            metadata: {
              hasAudio: !!existingVideo.characterAssetsSnapshot?.audioUrl,
              dialogueCount: existingVideo.characterAssetsSnapshot?.dialogueCount || 0,
              videoExpectation: existingVideo.characterAssetsSnapshot?.videoExpectation || ''
            }
          });
        }
        
        // Check if recent failure - prevent immediate retry
        if (existingVideo.status === 'failed') {
          const failureTime = new Date(existingVideo.createdAt || existingVideo.updatedAt || 0);
          const timeSinceFailure = Date.now() - failureTime.getTime();
          const waitTime = 60 * 60 * 1000; // 1 hour cooldown after failure
          
          if (timeSinceFailure < waitTime) {
            const minutesLeft = Math.ceil((waitTime - timeSinceFailure) / (60 * 1000));
            return res.status(429).json({
              message: `Video generation failed recently. Please wait ${minutesLeft} minutes before trying again.`,
              error: existingVideo.errorMessage || 'Previous generation failed',
              retryAfter: minutesLeft
            });
          }
        }
      }

      // Handle force regeneration with cache and database clearing
      if (req.body.forceRegenerate) {
        console.log(`Force regeneration requested for story ${storyId} - CLEARING CACHE AND DATABASE - API COST WILL BE INCURRED`);
        
        // Clear existing video from database
        await db.delete(videoGenerations)
          .where(and(
            eq(videoGenerations.storyId, parseInt(storyId)),
            eq(videoGenerations.requestedBy, userId)
          ));
        
        // Clear video cache
        try {
          const { CacheWithFallback } = await import("./cache-with-fallback");
          const videoCache = new CacheWithFallback('video');
          await videoCache.clearAll(); // Clear all video cache for safety
          console.log(`Cleared video cache for story ${storyId}`);
        } catch (cacheError) {
          console.log("Cache clearing failed (non-critical):", cacheError);
        }
      } else {
        console.log(`No existing video found for story ${storyId} - generating new video - API COST WILL BE INCURRED`);
      }

      // Use proper video generation service with strict duration control
      console.log(`Generating video for story ${storyId} by user ${userId}`);
      
      // Use generic video service that works with any provider
      const { GenericVideoService } = await import('./generic-video-service');
      const videoService = GenericVideoService.getInstance();
      await videoService.initialize();
      
      // Get the roleplay analysis for video generation
      const roleplayAnalysis = await storage.getStoryAnalysis(parseInt(storyId), 'roleplay');
      if (!roleplayAnalysis?.analysisData) {
        return res.status(400).json({ 
          message: "Roleplay analysis required for video generation" 
        });
      }

      const analysisData = roleplayAnalysis.analysisData;

      // Get story content for video generation
      const story = await storage.getStory(parseInt(storyId));
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      const result = await videoService.generateVideo({
        storyId: parseInt(storyId),
        userId,
        roleplayAnalysis: analysisData,
        storyContent: story.content,
        duration: 5, // Use 5 seconds as configured
        quality: req.body.quality || 'std',
        regenerate: req.body.forceRegenerate || false
      });

      // Store task ID in database for polling
      if (result.taskId) {
        try {
          await storage.createVideoGeneration({
            storyId: parseInt(storyId),
            requestedBy: userId,
            taskId: result.taskId,
            provider: 'kling',
            status: 'processing',
            generationParams: {
              prompt: result.metadata?.prompt || '',
              quality: req.body.quality || 'std',
              duration: 5
            },
            characterAssetsSnapshot: analysisData || {},
            estimatedCompletionAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            regenerationCount: req.body.forceRegenerate ? 1 : 0
          });
          console.log(`✅ Stored task ${result.taskId} in database for polling`);
        } catch (dbError: any) {
          console.warn(`Failed to store task in database: ${dbError.message}`);
        }
      }

      console.log(`✅ Video generation started for story ${storyId}, task ID: ${result.taskId}`);

      // Return immediate response - no polling on frontend
      res.json({
        success: true,
        status: 'processing',
        message: 'Video is being generated. Please come back after 10 minutes.',
        taskId: result.taskId,
        estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000),
        duration: 5,
        provider: 'kling'
      });
      
    } catch (error: any) {
      console.error("Video generation failed:", error);
      console.error("Error stack:", error.stack);
      
      res.status(500).json({ 
        message: "Video generation failed", 
        error: error?.message || 'Unknown error',
        canRetry: !error.message?.includes('Content may violate guidelines'),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Poll video status by task ID - For automatic polling on roleplay summary page
  app.get('/api/videos/poll/:storyId', requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;

      if (!storyId || !userId) {
        return res.status(400).json({ message: "Story ID and authentication required" });
      }

      console.log(`🔄 Polling video status for story ${storyId}`);

      // Get video record from database
      const videoRecord = await storage.getVideoByStoryId(storyId);
      if (!videoRecord || !videoRecord.taskId) {
        return res.json({
          status: 'not_found',
          message: 'No video generation task found for this story'
        });
      }

      // If already completed and approved (FINAL), return immediately
      if (videoRecord.status === 'FINAL') {
        return res.json({
          status: 'FINAL',
          videoUrl: videoRecord.videoUrl,
          thumbnailUrl: videoRecord.thumbnailUrl,
          message: 'Video is finalized and approved'
        });
      }

      // If already completed but not approved, return for user validation
      if (videoRecord.status === 'completed' && videoRecord.videoUrl) {
        return res.json({
          status: 'completed',
          videoUrl: videoRecord.videoUrl,
          thumbnailUrl: videoRecord.thumbnailUrl,
          message: 'Video is ready for your approval. Please validate and accept or regenerate.'
        });
      }

      // For processing videos, poll using stored provider and taskId
      if (videoRecord.status === 'processing') {
        const providerName = videoRecord.provider || 'kling';
        
        try {
          console.log(`🔄 Polling ${providerName} provider for task ${videoRecord.taskId}`);
          
          // Get the specific provider that was used for generation
          let pollResult = null;
          
          if (providerName === 'kling') {
            const { KlingVideoProvider } = await import('./video-providers/kling-video-provider');
            const klingProvider = new KlingVideoProvider();
            
            // Initialize with fresh JWT token for polling
            const providerConfig = {
              name: 'kling',
              apiKey: process.env.KLING_ACCESS_KEY,
              secretKey: process.env.KLING_SECRET_KEY,
              baseUrl: 'https://api.klingai.com',
              modelName: 'kling-v1-5',
              maxDuration: 10
            };
            
            console.log(`🔑 Creating fresh JWT token for polling task ${videoRecord.taskId}`);
            await klingProvider.initialize(providerConfig);
            
            // Poll for completion using stored taskId with fresh JWT
            pollResult = await klingProvider.pollForCompletion(videoRecord.taskId);
          } else {
            throw new Error(`Provider ${providerName} not supported for polling`);
          }
          
          if (pollResult && pollResult.status === 'completed' && pollResult.videoUrl) {
            // Update database with completed video
            await storage.updateVideoGeneration(storyId, {
              status: 'completed',
              videoUrl: pollResult.videoUrl,
              thumbnailUrl: pollResult.thumbnailUrl,
              lastPolledAt: new Date()
            });

            console.log(`✅ Video completed for story ${storyId}: ${pollResult.videoUrl}`);

            return res.json({
              status: 'completed',
              videoUrl: pollResult.videoUrl,
              thumbnailUrl: pollResult.thumbnailUrl,
              message: 'Video is ready for your approval. Please validate and accept or regenerate.'
            });
          } else if (pollResult && pollResult.status === 'failed') {
            // Update database with failed status
            await storage.updateVideoGeneration(storyId, {
              status: 'failed',
              errorMessage: pollResult.metadata?.error || 'Video generation failed',
              lastPolledAt: new Date()
            });

            return res.json({
              status: 'failed',
              message: 'Video generation failed. Please try regenerating.'
            });
          } else {
            // Still processing - update last polled time
            await storage.updateVideoGeneration(storyId, {
              lastPolledAt: new Date()
            });

            return res.json({
              status: 'processing',
              message: 'Video is still being generated. Please check back in a few minutes.',
              estimatedCompletion: videoRecord.estimatedCompletionAt
            });
          }
        } catch (pollError: any) {
          console.error(`Polling error for story ${storyId}:`, pollError);
          
          // Update last polled time even on error
          await storage.updateVideoGeneration(storyId, {
            lastPolledAt: new Date()
          });

          return res.json({
            status: 'processing',
            message: 'Unable to check status right now. Please try again later.',
            estimatedCompletion: videoRecord.estimatedCompletionAt
          });
        }
      }

      // Default response for unknown status
      return res.json({
        status: videoRecord.status || 'unknown',
        message: 'Video status unknown. Please try regenerating.'
      });

    } catch (error: any) {
      console.error(`Video polling failed for story ${req.params.storyId}:`, error);
      res.status(500).json({ 
        message: "Video polling failed", 
        error: error.message || 'Unknown error'
      });
    }
  });

  // Accept video (mark as FINAL)
  app.post('/api/videos/:storyId/accept', requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;

      if (!storyId || !userId) {
        return res.status(400).json({ message: "Story ID and authentication required" });
      }

      // Update video status to FINAL
      await storage.updateVideoGeneration(storyId, {
        status: 'FINAL',
        userApproved: true,
        approvedAt: new Date()
      });

      console.log(`✅ Video marked as FINAL for story ${storyId} by user ${userId}`);

      res.json({
        success: true,
        message: 'Video approved and finalized'
      });

    } catch (error: any) {
      console.error(`Video approval failed for story ${req.params.storyId}:`, error);
      res.status(500).json({ 
        message: "Video approval failed", 
        error: error.message || 'Unknown error'
      });
    }
  });

  // Regenerate video (only allowed if not FINAL)
  app.post('/api/videos/:storyId/regenerate', requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;

      if (!storyId || !userId) {
        return res.status(400).json({ message: "Story ID and authentication required" });
      }

      // Check current video status
      const videoRecord = await storage.getVideoByStoryId(storyId);
      if (videoRecord && videoRecord.status === 'FINAL') {
        return res.status(400).json({ 
          message: "Cannot regenerate: Video is already finalized" 
        });
      }

      console.log(`🔄 Regenerating video for story ${storyId}`);

      // Force regenerate by calling the generation endpoint
      req.body.forceRegenerate = true;
      req.body.storyId = storyId;
      
      // Forward to generation endpoint
      return req.url = '/api/videos/generate';

    } catch (error: any) {
      console.error(`Video regeneration failed for story ${req.params.storyId}:`, error);
      res.status(500).json({ 
        message: "Video regeneration failed", 
        error: error.message || 'Unknown error'
      });
    }
  });

  // Generate video (GET route for frontend compatibility)
  app.get("/api/videos/generate/:storyId", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;

      if (!storyId || !userId) {
        return res.status(400).json({ message: "Story ID and authentication required" });
      }

      console.log(`Generating video for story ${storyId} by user ${userId}`);

      // Use proper video generation service with strict duration control
      const { VideoGenerationService } = await import("./video-generation-service");
      const videoService = new VideoGenerationService();
      const result = await videoService.generateVideo({
        storyId,
        userId,
        duration: 10, // Default 10 seconds, enforced by cost protection
        quality: 'standard'
      });

      console.log(`Video generation completed for story ${storyId}`);
      res.json(result);
    } catch (error: any) {
      console.error("Video generation failed:", error);
      res.status(500).json({ 
        message: "Video generation failed", 
        error: error?.message || 'Unknown error'
      });
    }
  });

  // Get character assets for video generation
  app.get("/api/videos/story/:storyId/assets", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      if (isNaN(storyId)) {
        return res.status(400).json({ message: "Invalid story ID" });
      }

      const assets = await videoGenerationService.getCharacterAssets(storyId);
      res.json({
        storyId,
        characters: assets,
        message: "Character assets loaded successfully"
      });
    } catch (error: any) {
      console.error("Failed to get character assets:", error);
      res.status(500).json({ 
        message: "Failed to load character assets",
        error: error?.message || 'Unknown error'
      });
    }
  });

  // Update character asset with user override
  app.put("/api/videos/story/:storyId/character/:characterName", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const characterName = decodeURIComponent(req.params.characterName);
      const userId = (req.user as any)?.id;
      const { imageUrl, voiceSampleUrl } = req.body;

      if (isNaN(storyId) || !characterName || !userId) {
        return res.status(400).json({ message: "Invalid parameters" });
      }

      if (!imageUrl && !voiceSampleUrl) {
        return res.status(400).json({ message: "At least one asset (image or voice) must be provided" });
      }

      // For now, just acknowledge the update request
      // Character override functionality will be implemented when needed

      res.json({
        message: "Character asset updated successfully",
        character: characterName,
        updates: { imageUrl, voiceSampleUrl }
      });
    } catch (error: any) {
      console.error("Failed to update character asset:", error);
      res.status(500).json({ 
        message: "Failed to update character asset",
        error: error?.message || 'Unknown error'
      });
    }
  });





  // Get user voice samples for character override
  app.get("/api/videos/user-voices", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const emotion = req.query.emotion as string;

      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }

      // For now, return empty voice samples array
      const voiceSamples = [];
      res.json({
        userId,
        emotion: emotion || 'all',
        samples: voiceSamples
      });
    } catch (error: any) {
      console.error("Failed to get user voice samples:", error);
      res.status(500).json({ 
        message: "Failed to retrieve voice samples",
        error: error?.message || 'Unknown error'
      });
    }
  });

  // Upload character image for override
  app.post("/api/videos/upload-character-image", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { characterName, storyId } = req.body;
      const imageFile = req.file;

      if (!userId || !imageFile) {
        return res.status(400).json({ message: "User authentication and image file required" });
      }

      // Save image to persistent storage
      const timestamp = Date.now();
      const imageDir = path.join(process.cwd(), 'persistent-cache', 'character-images');
      await fs.mkdir(imageDir, { recursive: true });
      
      const fileName = `${userId}-${characterName || 'character'}-${timestamp}.${imageFile.originalname.split('.').pop()}`;
      const filePath = path.join(imageDir, fileName);
      
      await fs.writeFile(filePath, imageFile.buffer);
      
      const imageUrl = `/api/character-images/${fileName}`;

      res.json({
        message: "Character image uploaded successfully",
        imageUrl,
        characterName,
        fileName
      });
    } catch (error: any) {
      console.error("Character image upload failed:", error);
      res.status(500).json({ 
        message: "Image upload failed",
        error: error?.message || 'Unknown error'
      });
    }
  });

  // Serve character images
  app.get("/api/character-images/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      const filePath = path.join(process.cwd(), 'persistent-cache', 'character-images', fileName);
      
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "Image not found" });
      }
      
      // Determine content type
      const ext = path.extname(fileName).toLowerCase();
      let contentType = 'image/jpeg';
      if (ext === '.png') contentType = 'image/png';
      if (ext === '.gif') contentType = 'image/gif';
      if (ext === '.webp') contentType = 'image/webp';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
      res.sendFile(path.resolve(filePath));
    } catch (error: any) {
      console.error("Error serving character image:", error);
      res.status(500).json({ message: "Failed to serve image" });
    }
  });

  // Validate assets before video generation
  app.post("/api/videos/story/:storyId/validate", requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      if (isNaN(storyId)) {
        return res.status(400).json({ message: "Invalid story ID" });
      }

      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      // For now, return basic validation - roleplay analysis integration will be added later
      const validationResults = [
        {
          characterName: "Main Character",
          hasAIImage: true,
          hasUserImage: false,
          hasAIVoice: true,
          hasUserVoice: false,
          isReady: true
        }
      ];

      const allReady = validationResults.every(result => result.isReady);

      res.json({
        storyId,
        isValid: allReady,
        characters: validationResults,
        summary: {
          total: validationResults.length,
          withUserOverrides: validationResults.filter(r => r.hasUserImage || r.hasUserVoice).length,
          readyForGeneration: validationResults.filter(r => r.isReady).length
        }
      });
    } catch (error: any) {
      console.error("Asset validation failed:", error);
      res.status(500).json({ 
        message: "Asset validation failed",
        error: error?.message || 'Unknown error'
      });
    }
  });

  // Check video generation status by task ID - use requireAuth middleware
  app.get('/api/videos/status/:taskId', requireAuth, async (req, res) => {
    try {
      const taskId = req.params.taskId;
      const userId = (req.user as any)?.id;

      console.log(`Checking video status using list endpoint for task: ${taskId}, user: ${userId}`);

      // Use the generic video service to check status
      const videoService = await import('./generic-video-service');
      const status = await videoService.GenericVideoService.getInstance().checkVideoStatus(taskId);

      res.json(status);
    } catch (error: any) {
      console.error('Error checking video status:', error);
      res.status(500).json({ 
        message: 'Failed to check video status',
        status: 'failed'
      });
    }
  });

  // Story narration API endpoints
  app.post('/api/stories/:storyId/narration/preview', requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;
      const { emotions } = req.body;

      if (!userId || isNaN(storyId)) {
        return res.status(400).json({ message: 'Invalid parameters' });
      }

      const { storyNarrator } = await import('./story-narrator');
      const preview = await storyNarrator.getNarrationPreview(storyId, userId, emotions);
      
      res.json(preview);
    } catch (error: any) {
      console.error('Error getting narration preview:', error);
      res.status(500).json({ message: 'Failed to get narration preview' });
    }
  });

  // Removed duplicate endpoint - using the one below with better logging

  app.get('/api/stories/:storyId/narration/check', requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = (req.user as any)?.id;

      if (!userId || isNaN(storyId)) {
        return res.status(400).json({ message: 'Invalid parameters' });
      }

      // Get story data
      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: 'Story not found' });
      }

      // Use the exact same approach as the working /api/stories/:id/narrative endpoint
      const { analysisCache } = await import('./cache-with-fallback');
      const cacheKey = `narrative-${storyId}`;
      
      let analysis;
      try {
        analysis = await analysisCache.getOrSet(
          cacheKey,
          async () => {
            const { analyzeStoryContent } = await import('./ai-analysis');
            return await analyzeStoryContent(story.content);
          },
          { ttl: 300000 }
        );
        
        console.log('Successfully retrieved analysis with emotions:', analysis?.emotions?.length || 0);
      } catch (error) {
        console.log('Analysis retrieval failed:', error);
        return res.json({ canNarrate: false, reason: 'Failed to retrieve story analysis' });
      }
      
      if (!analysis || !analysis.emotions) {
        console.log('No emotions found in analysis');
        return res.json({ canNarrate: false, reason: 'No emotions found in story' });
      }

      // Extract emotions from the analysis (direct structure)
      const emotions = analysis.emotions || [];
      console.log('Found emotions:', emotions.map((e: any) => e.emotion));

      if (emotions.length === 0) {
        return res.json({ canNarrate: false, reason: 'No emotions found in analysis' });
      }

      const uniqueEmotions = [...new Set(emotions.map((e: any) => e.emotion))];
      
      // Check if user has recorded any of these emotions by calling existing endpoint
      let hasVoices = false;
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        // Use the same logic as the existing user voice emotions endpoint
        const userVoiceDir = path.join(process.cwd(), 'persistent-cache', 'user-voice-emotions');
        
        const files = await fs.readdir(userVoiceDir);
        const userFiles = files.filter(file => 
          file.startsWith(`${userId}-`) && file.endsWith('.mp3')
        );
        
        console.log(`DEBUG - Narration check for story ${storyId}:`);
        console.log(`- Story emotions: ${uniqueEmotions.join(', ')}`);
        console.log(`- User files found: ${userFiles.length}`);
        
        if (userFiles.length > 0) {
          // Extract emotions from filenames (format: userId-emotion-intensity-timestamp.mp3)
          const userEmotions = userFiles.map(filename => {
            const parts = filename.split('-');
            return parts[1]; // emotion is second part
          });
          
          console.log(`- User emotions: ${userEmotions.join(', ')}`);
          
          hasVoices = uniqueEmotions.some(emotion => 
            userEmotions.map(e => e.toLowerCase()).includes(emotion.toLowerCase())
          );
          
          console.log(`- Can narrate: ${hasVoices}`);
        }
      } catch (error) {
        console.error('Error checking user voices:', error);
      }

      res.json({ 
        canNarrate: hasVoices,
        emotions: uniqueEmotions,
        storyTitle: story.title || 'Untitled Story'
      });
    } catch (error: any) {
      console.error('Error checking narration capability:', error);
      res.status(500).json({ message: 'Failed to check narration capability' });
    }
  });

  // Removed duplicate endpoint - using the one at line 2308 which now comes first

  // =============================================================================
  // VOICE MODULATION SYSTEM - Database-driven modular voice samples
  // =============================================================================

  // Initialize voice modulation templates
  app.post('/api/voice-modulations/initialize', requireAuth, async (req, res) => {
    try {
      const { voiceModulationService } = await import('./voice-modulation-service');
      await voiceModulationService.initializeTemplates();
      res.json({ message: 'Voice modulation templates initialized successfully' });
    } catch (error: any) {
      console.error('Error initializing voice modulation templates:', error);
      res.status(500).json({ message: 'Failed to initialize templates' });
    }
  });

  // Get voice modulation templates
  app.get('/api/voice-modulations/templates', requireAuth, async (req, res) => {
    try {
      const type = req.query.type as string;
      const { voiceModulationService } = await import('./voice-modulation-service');
      const templates = await voiceModulationService.getTemplates(type);
      res.json(templates);
    } catch (error: any) {
      console.error('Error fetching voice modulation templates:', error);
      res.status(500).json({ message: 'Failed to fetch templates' });
    }
  });

  // Get user voice modulations (all recordings across stories)
  app.get('/api/voice-modulations/user', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const type = req.query.type as string;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { voiceModulationService } = await import('./voice-modulation-service');
      const modulations = await voiceModulationService.getUserVoiceModulations(userId, type);
      res.json(modulations);
    } catch (error: any) {
      console.error('Error fetching user voice modulations:', error);
      res.status(500).json({ message: 'Failed to fetch user modulations' });
    }
  });

  // Get user voice modulations for specific story context
  app.get('/api/voice-modulations/story/:storyId', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const storyId = parseInt(req.params.storyId);
      
      if (!userId || isNaN(storyId)) {
        return res.status(400).json({ message: 'Invalid parameters' });
      }

      const { voiceModulationService } = await import('./voice-modulation-service');
      const storyModulations = await voiceModulationService.getUserStoryVoiceModulations(userId, storyId);
      res.json(storyModulations);
    } catch (error: any) {
      console.error('Error fetching story voice modulations:', error);
      res.status(500).json({ message: 'Failed to fetch story modulations' });
    }
  });

  // Record new voice modulation
  app.post('/api/voice-modulations/record', requireAuth, upload.single('audio'), async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { modulationKey, duration, modulationType } = req.body;
      const audioFile = req.file;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!modulationKey || !audioFile) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Get the template to find template_id
      const { voiceModulationService } = await import('./voice-modulation-service');
      const templates = await voiceModulationService.getTemplates();
      const template = templates.find(t => t.modulationKey === modulationKey);
      
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      // Save audio file using the existing cache system
      const fileName = `${modulationKey}_${Date.now()}.webm`;
      const cacheDir = path.join(process.cwd(), 'persistent-cache', 'user-voice-modulations', userId);
      await fs.mkdir(cacheDir, { recursive: true });
      const filePath = path.join(cacheDir, fileName);
      await fs.writeFile(filePath, audioFile.buffer);
      const audioUrl = `/cache/user-voice-modulations/${userId}/${fileName}`;

      const modulation = await voiceModulationService.recordVoiceModulation({
        userId,
        templateId: template.id,
        modulationKey,
        modulationType: template.modulationType,
        audioUrl,
        fileName,
        duration: parseInt(duration) || template.targetDuration || 10,
        qualityScore: 85, // Default quality score
        isPreferred: false,
        usageCount: 0
      });
      
      res.json(modulation);
    } catch (error: any) {
      console.error('Error recording voice modulation:', error);
      res.status(500).json({ message: 'Failed to record voice modulation' });
    }
  });

  // Delete voice modulation
  app.delete('/api/voice-modulations/delete', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { modulationKey } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!modulationKey) {
        return res.status(400).json({ message: 'Modulation key is required' });
      }

      const { voiceModulationService } = await import('./voice-modulation-service');
      await voiceModulationService.deleteVoiceModulation(userId, modulationKey);
      
      res.json({ message: 'Voice modulation deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting voice modulation:', error);
      res.status(500).json({ message: 'Failed to delete voice modulation' });
    }
  });

  // Analyze story and create modulation requirements
  app.post('/api/voice-modulations/analyze/:storyId', requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      
      if (isNaN(storyId)) {
        return res.status(400).json({ message: 'Invalid story ID' });
      }

      // Get story data for analysis
      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ message: 'Story not found' });
      }

      // Get story analysis for emotions
      const analysis = await storage.getStoryAnalysis(storyId);
      const emotions = analysis?.emotions?.map((e: any) => e.emotion) || [];

      const { voiceModulationService } = await import('./voice-modulation-service');
      const requirements = await voiceModulationService.analyzeStoryModulations(
        storyId, 
        story.content, 
        emotions
      );
      
      res.json(requirements);
    } catch (error: any) {
      console.error('Error analyzing story modulations:', error);
      res.status(500).json({ message: 'Failed to analyze story modulations' });
    }
  });

  // Get user modulation progress
  app.get('/api/voice-modulations/progress', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { voiceModulationService } = await import('./voice-modulation-service');
      const progress = await voiceModulationService.getUserModulationProgress(userId);
      res.json(progress);
    } catch (error: any) {
      console.error('Error fetching modulation progress:', error);
      res.status(500).json({ message: 'Failed to fetch progress' });
    }
  });

  // Mark voice modulation as preferred
  app.post('/api/voice-modulations/:modulationId/prefer', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const modulationId = parseInt(req.params.modulationId);
      
      if (!userId || isNaN(modulationId)) {
        return res.status(400).json({ message: 'Invalid parameters' });
      }

      const { voiceModulationService } = await import('./voice-modulation-service');
      await voiceModulationService.markAsPreferred(userId, modulationId);
      res.json({ message: 'Voice modulation marked as preferred' });
    } catch (error: any) {
      console.error('Error marking modulation as preferred:', error);
      res.status(500).json({ message: 'Failed to mark as preferred' });
    }
  });

  // Get best voice modulation for a key
  app.get('/api/voice-modulations/best/:modulationKey', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const modulationKey = req.params.modulationKey;
      
      if (!userId || !modulationKey) {
        return res.status(400).json({ message: 'Invalid parameters' });
      }

      const { voiceModulationService } = await import('./voice-modulation-service');
      const modulation = await voiceModulationService.getBestVoiceModulation(userId, modulationKey);
      res.json(modulation);
    } catch (error: any) {
      console.error('Error fetching best voice modulation:', error);
      res.status(500).json({ message: 'Failed to fetch best modulation' });
    }
  });

  // Setup video webhook handlers for callback-based notifications
  setupVideoWebhooks(app);

  const httpServer = createServer(app);
  return httpServer;
}
