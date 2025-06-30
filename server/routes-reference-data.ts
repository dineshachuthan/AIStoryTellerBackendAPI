/**
 * Reference Data Routes
 * API endpoints for managing reference data architecture
 * - Browse reference stories (shared catalog)
 * - Create user narrations from reference stories  
 * - Migration from old user-owned stories to reference data
 */

import { Router } from 'express';
import { DatabaseStorage } from './storage.js';
import { ReferenceDataService } from './reference-data-service.js';
import { requireAuth } from './auth.js';

const router = Router();
const storage = new DatabaseStorage();
const referenceDataService = new ReferenceDataService(storage);

// DEMO MIGRATION ENDPOINT - Create reference data manually
router.post('/migrate-demo', async (req, res) => {
  try {
    console.log('[ReferenceDataRoutes] Starting demo migration to reference data architecture');
    
    // Create a sample reference story manually
    const sampleReferenceStory = {
      title: "The Mystical Forest",
      content: "Deep in the enchanted forest, magical creatures dance under moonlight...",
      summary: "A fantasy tale about magical forest creatures",
      category: "fantasy",
      genre: "adventure", 
      subGenre: "magical_realism",
      tags: ["magic", "forest", "creatures"],
      emotionalTags: ["wonder", "mystery", "joy"],
      moodCategory: "whimsical",
      ageRating: "general",
      readingTime: 5,
      extractedCharacters: [
        { name: "Forest Guardian", traits: ["wise", "mysterious"] },
        { name: "Moon Sprites", traits: ["playful", "luminous"] }
      ],
      extractedEmotions: [
        { emotion: "wonder", intensity: 8, context: "discovering magical creatures" },
        { emotion: "joy", intensity: 7, context: "dancing under moonlight" }
      ],
      originalAuthorId: "demo-user",
      visibility: "public",
      uploadType: "text",
      copyrightInfo: "Demo content for reference architecture",
      licenseType: "shared_reference",
      isAdultContent: false,
      viewCount: 0,
      likes: 0,
      language: "en-US",
      publishedAt: new Date(),
    };

    const referenceStory = await storage.createReferenceStory(sampleReferenceStory);
    console.log(`[ReferenceDataRoutes] Created reference story: ${referenceStory.id}`);

    // Create reference story analysis
    const analysisData = {
      referenceStoryId: referenceStory.id,
      analysisType: 'narrative',
      analysisData: {
        characters: [
          { name: "Forest Guardian", personality: "wise and protective", voiceProfile: "deep and resonant" },
          { name: "Moon Sprites", personality: "playful and ethereal", voiceProfile: "light and musical" }
        ],
        emotions: [
          { emotion: "wonder", scenes: [1, 2], intensity: 8 },
          { emotion: "joy", scenes: [2, 3], intensity: 7 }
        ],
        themes: ["nature", "magic", "harmony"],
        mood: "whimsical and enchanting"
      },
      generatedBy: 'demo-migration-gpt-4o'
    };

    const analysis = await storage.createReferenceStoryAnalysis(analysisData);
    console.log(`[ReferenceDataRoutes] Created reference analysis: ${analysis.id}`);

    res.json({
      success: true,
      message: "Demo reference data created successfully",
      data: {
        referenceStory,
        analysis,
        architecture: "reference_data_v1",
        implementation: "complete"
      }
    });

  } catch (error) {
    console.error('[ReferenceDataRoutes] Demo migration failed:', error);
    res.status(500).json({ 
      error: 'Demo migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// BROWSE REFERENCE STORIES - Public catalog available to all users
router.get('/reference-stories', async (req, res) => {
  try {
    const { category, genre, limit = 20, offset = 0 } = req.query;
    
    const filters = {
      category: category as string,
      genre: genre as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    const referenceStories = await storage.browseReferenceStories(filters);
    
    res.json({
      stories: referenceStories,
      total: referenceStories.length,
      filters: filters,
      architecture: "reference_data_catalog"
    });

  } catch (error) {
    console.error('[ReferenceDataRoutes] Failed to browse reference stories:', error);
    res.status(500).json({ 
      error: 'Failed to browse reference stories', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET REFERENCE STORY WITH ANALYSIS - Complete reference data
router.get('/reference-stories/:id', async (req, res) => {
  try {
    const referenceStoryId = parseInt(req.params.id);
    
    // Get reference story and analysis separately using storage methods
    const referenceStory = await storage.getReferenceStory(referenceStoryId);
    if (!referenceStory) {
      return res.status(404).json({ error: 'Reference story not found' });
    }
    
    const analysis = await storage.getReferenceStoryAnalysis(referenceStoryId);
    const roleplayAnalysis = await storage.getReferenceRoleplayAnalysis(referenceStoryId);
    
    res.json({
      referenceStory,
      analysis,
      roleplayAnalysis,
      architecture: "complete_reference_data"
    });

  } catch (error) {
    console.error('[ReferenceDataRoutes] Failed to get reference story:', error);
    res.status(500).json({ 
      error: 'Failed to get reference story', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// CREATE USER NARRATION FROM REFERENCE STORY - User instance
router.post('/reference-stories/:id/create-narration', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const referenceStoryId = parseInt(req.params.id);
    const { narratorVoice = 'default', narratorVoiceType = 'ai' } = req.body;
    
    const userNarration = await referenceDataService.createUserNarrationFromReference(
      userId,
      referenceStoryId, 
      narratorVoice,
      narratorVoiceType
    );
    
    res.json({
      userNarration,
      message: "User narration created from reference story",
      architecture: "user_instance_created"
    });

  } catch (error) {
    console.error('[ReferenceDataRoutes] Failed to create user narration:', error);
    res.status(500).json({ 
      error: 'Failed to create user narration', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET USER NARRATIONS - User's personalized narrations
router.get('/user-narrations', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    
    const userNarrations = await storage.getUserStoryNarrations(userId);
    
    res.json({
      narrations: userNarrations,
      userId: userId,
      architecture: "user_specific_instances"
    });

  } catch (error) {
    console.error('[ReferenceDataRoutes] Failed to get user narrations:', error);
    res.status(500).json({ 
      error: 'Failed to get user narrations', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// MIGRATION STATUS - Check migration progress
router.get('/migration-status', async (req, res) => {
  try {
    const referenceStories = await storage.getAllReferenceStories();
    const totalReferenceStories = referenceStories.length;
    
    res.json({
      referenceDataImplemented: true,
      totalReferenceStories,
      architecture: "reference_data_operational",
      migration: {
        status: "ready",
        tablesCreated: ["reference_stories", "reference_story_analyses", "reference_roleplay_analyses", "user_story_narrations", "user_roleplay_segments"],
        storageImplemented: true,
        apiRoutesImplemented: true
      }
    });

  } catch (error) {
    console.error('[ReferenceDataRoutes] Failed to get migration status:', error);
    res.status(500).json({ 
      error: 'Failed to get migration status', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;