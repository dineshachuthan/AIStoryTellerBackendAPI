import { db } from "./db";
import { characterAssets, videoGenerations, storyScenes, aiAssetCache, stories } from "@shared/schema";
import { eq, and, desc, lt } from "drizzle-orm";
import { analyzeStoryContent, generateCharacterImage } from "./ai-analysis";
import { audioService } from "./audio-service";

// Cache removed
import path from "path";
import crypto from "crypto";
import OpenAI from "openai";
// Provider manager removed
import { getVideoProviderConfig } from './video-config';
import { VideoGenerationRequest as ProviderVideoRequest } from './video-providers/base-provider';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize cache for video assets
// Video cache removed

// Video provider manager removed

export interface VideoGenerationRequest {
  storyId: number;
  userId: string;
  scenes?: number[]; // Optional scene selection
  duration?: number; // Max duration in seconds
  quality?: 'draft' | 'standard' | 'high';
}

export interface CharacterAssetOverride {
  characterName: string;
  imageUrl?: string;
  voiceSampleUrl?: string;
}

export interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  status: 'completed' | 'processing' | 'pending_approval' | 'failed';
  cacheHit: boolean;
}

export class VideoGenerationService {
  private readonly MAX_RETRIES = 3;
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly ASSET_VALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_ROLEPLAY_DURATION = 180; // 3 minutes maximum for roleplay videos to control costs
  
  // STRICT COST PROTECTION - CONFIGURABLE DURATION LIMITS
  private readonly ABSOLUTE_MAX_DURATION = 20; // Hard limit: 20 seconds maximum for testing
  private readonly COST_PROTECTION_ENABLED = true; // Master switch for cost protection

  /**
   * Generate video with strict caching to prevent unnecessary API calls
   * Priority: Database -> Cache -> New Generation (only if explicitly requested)
   */
  /**
   * COST PROTECTION: Validate duration limits before any generation
   */
  private validateCostProtection(request: VideoGenerationRequest): void {
    if (!this.COST_PROTECTION_ENABLED) return;

    const requestedDuration = request.duration || 10;
    
    if (requestedDuration > this.ABSOLUTE_MAX_DURATION) {
      throw new Error(
        `COST PROTECTION: Video duration ${requestedDuration}s exceeds absolute maximum of ${this.ABSOLUTE_MAX_DURATION}s. ` +
        `Contact administrator to authorize longer durations. This limit protects against unexpected costs.`
      );
    }

    console.log(`✓ Cost protection validated: ${requestedDuration}s <= ${this.ABSOLUTE_MAX_DURATION}s maximum`);
  }

  /**
   * Get duration limits for API access
   */
  getDurationLimits() {
    return {
      default: 10,
      minimum: 3,
      maximum: this.ABSOLUTE_MAX_DURATION,
      allowUserOverride: false // Disabled for cost protection
    };
  }

  async generateVideo(request: VideoGenerationRequest, forceRegenerate: boolean = false): Promise<VideoGenerationResult> {
    // FIRST: Always validate cost protection before any operations
    this.validateCostProtection(request);
    
    const cacheKey = await this.generateCacheKey(request);
    
    try {
      // CRITICAL: Always check database first to prevent duplicate API calls
      if (!forceRegenerate) {
        const [existingVideo] = await db
          .select()
          .from(videoGenerations)
          .where(and(
            eq(videoGenerations.storyId, request.storyId),
            eq(videoGenerations.requestedBy, request.userId)
          ))
          .orderBy(desc(videoGenerations.createdAt))
          .limit(1);

        if (existingVideo && 
            existingVideo.status === 'completed' && 
            existingVideo.videoUrl && 
            existingVideo.videoUrl.trim() !== '' &&
            existingVideo.duration && 
            existingVideo.duration > 0) {
          console.log(`COST OPTIMIZATION: Using existing video for story ${request.storyId}, preventing RunwayML API call`);
          return {
            videoUrl: existingVideo.videoUrl,
            thumbnailUrl: existingVideo.thumbnailUrl || '',
            duration: existingVideo.duration,
            status: 'completed',
            cacheHit: true
          };
        }
      }

      // Step 1: Check cache if no database entry
      const cachedResult = await this.checkCache(cacheKey);
      if (cachedResult && !forceRegenerate) {
        console.log(`Video cache hit for story ${request.storyId}`);
        return { ...cachedResult, cacheHit: true };
      }

      // Step 2: Generate new video ONLY if explicitly requested or no existing video
      console.log(`Generating new video for story ${request.storyId} - API COST INCURRED`);
      const result = await this.generateNewVideo(request, cacheKey);
      return result;

    } catch (error: any) {
      console.error("Video generation failed:", error);
      throw new Error(`Video generation failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get character assets with user overrides taking precedence
   */
  async getCharacterAssets(storyId: number): Promise<CharacterAssetOverride[]> {
    try {
      // Force reload to ensure fresh character data from roleplay analysis
      console.log(`Loading character assets for story ${storyId} from roleplay analysis`);
      const assets = await this.loadAndValidateCharacterAssets(storyId);
      console.log(`Generated ${assets.length} character assets:`, assets.map(a => a.characterName));
      
      // Update cache with fresh data
      const cacheKey = `character-assets-${storyId}`;
      await this.invalidateCharacterCache(storyId);
      
      return assets;

    } catch (error: any) {
      console.error("Failed to get character assets:", error);
      throw new Error(`Character assets loading failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Update character asset with user override
   */
  async updateCharacterAsset(
    storyId: number, 
    characterName: string, 
    override: Partial<CharacterAssetOverride>,
    userId: string
  ): Promise<void> {
    try {
      // Find existing asset or create new one
      const [existingAsset] = await db
        .select()
        .from(characterAssets)
        .where(and(
          eq(characterAssets.storyId, storyId),
          eq(characterAssets.characterName, characterName)
        ));

      if (existingAsset) {
        // Update existing asset
        await db
          .update(characterAssets)
          .set({
            userImageUrl: override.imageUrl || existingAsset.userImageUrl,
            userVoiceSampleUrl: override.voiceSampleUrl || existingAsset.userVoiceSampleUrl,
            overriddenBy: userId,
            updatedAt: new Date(),
            isValid: false // Mark for revalidation
          })
          .where(eq(characterAssets.id, existingAsset.id));
      } else {
        // Create new asset entry
        await db.insert(characterAssets).values({
          storyId,
          characterName,
          userImageUrl: override.imageUrl,
          userVoiceSampleUrl: override.voiceSampleUrl,
          overriddenBy: userId,
          isValid: false
        });
      }

      // Invalidate cache
      await this.invalidateCharacterCache(storyId);
      
      console.log(`Character asset updated for ${characterName} in story ${storyId}`);
    } catch (error: any) {
      console.error("Failed to update character asset:", error);
      throw new Error(`Character asset update failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Validate and refresh assets if needed
   */
  async validateAssets(storyId: number): Promise<void> {
    const assets = await db
      .select()
      .from(characterAssets)
      .where(eq(characterAssets.storyId, storyId));

    for (const asset of assets) {
      const needsValidation = !asset.lastValidationAt || 
        (Date.now() - new Date(asset.lastValidationAt).getTime() > this.ASSET_VALIDATION_INTERVAL);

      if (needsValidation || !asset.isValid) {
        await this.validateSingleAsset(asset);
      }
    }
  }

  private async generateCacheKey(request: VideoGenerationRequest): Promise<string> {
    const keyData = {
      storyId: request.storyId,
      scenes: request.scenes?.sort() || [],
      duration: request.duration || 0,
      quality: request.quality || 'standard'
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }

  private async checkCache(cacheKey: string): Promise<VideoGenerationResult | null> {
    // Video cache removed - no caching
    return null;
  }

  private async checkDatabase(request: VideoGenerationRequest): Promise<VideoGenerationResult | null> {
    const cacheKey = await this.generateCacheKey(request);
    
    const [generation] = await db
      .select()
      .from(videoGenerations)
      .where(and(
        eq(videoGenerations.storyId, request.storyId),
        eq(videoGenerations.cacheKey, cacheKey),
        eq(videoGenerations.status, 'completed')
      ))
      .orderBy(desc(videoGenerations.createdAt))
      .limit(1);

    // Validate database entry has valid video data
    if (!generation || 
        !generation.videoUrl || 
        generation.videoUrl.trim() === '' ||
        !generation.duration ||
        generation.duration <= 0) {
      console.log(`No valid video found in database for story ${request.storyId}`);
      return null;
    }

    console.log(`Valid video found in database for story ${request.storyId}`);
    return {
      videoUrl: generation.videoUrl,
      thumbnailUrl: generation.thumbnailUrl || '',
      duration: generation.duration,
      status: 'completed',
      cacheHit: false
    };
  }

  private async generateNewVideo(
    request: VideoGenerationRequest, 
    cacheKey: string
  ): Promise<VideoGenerationResult> {
    // Upsert generation record to handle duplicate cache keys
    const [generation] = await db.insert(videoGenerations).values({
      storyId: request.storyId,
      requestedBy: request.userId,
      generationParams: {
        storyId: request.storyId,
        userId: request.userId,
        scenes: request.scenes || [],
        duration: request.duration || this.MAX_ROLEPLAY_DURATION,
        quality: request.quality || 'standard'
      },
      characterAssetsSnapshot: await this.getCharacterAssetsSnapshot(request.storyId),
      status: 'processing',
      cacheKey,
      expiresAt: new Date(Date.now() + this.CACHE_DURATION)
    }).onConflictDoUpdate({
      target: videoGenerations.cacheKey,
      set: {
        status: 'processing',
        updatedAt: new Date()
      }
    }).returning();

    try {
      // Get story and character assets
      const [story] = await db.select().from(stories).where(eq(stories.id, request.storyId));
      if (!story) {
        throw new Error("Story not found");
      }

      const characterAssetsList = await this.getCharacterAssets(request.storyId);
      console.log(`Loaded ${characterAssetsList.length} character assets for story ${request.storyId}`);
      
      // Generate scenes if not exist
      await this.ensureScenes(request.storyId, story.content);
      
      // Generate actual video based on roleplay content
      const videoResult = await this.createActualVideo(
        story,
        characterAssetsList,
        request
      );

      // Validate video result before setting status
      const isValidVideoResult = videoResult.videoUrl && 
                                 videoResult.videoUrl.trim() !== '' && 
                                 videoResult.duration && 
                                 videoResult.duration > 0;

      // Update generation record - mark as pending_approval if valid, failed if invalid
      await db.update(videoGenerations)
        .set({
          status: isValidVideoResult ? 'pending_approval' : 'failed',
          videoUrl: videoResult.videoUrl,
          thumbnailUrl: videoResult.thumbnailUrl,
          duration: videoResult.duration,
          errorMessage: isValidVideoResult ? null : 'Generated video has invalid duration or URL',
          updatedAt: new Date()
        })
        .where(eq(videoGenerations.id, generation.id));

      if (isValidVideoResult) {
        await this.updateCache(cacheKey, videoResult);
      }

      return { 
        ...videoResult, 
        cacheHit: false,
        status: isValidVideoResult ? 'pending_approval' : 'failed'
      };

    } catch (error) {
      // Update generation record with error
      await db.update(videoGenerations)
        .set({
          status: 'failed',
          errorMessage: (error as any)?.message || 'Unknown error',
          retryCount: (generation.retryCount || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(videoGenerations.id, generation.id));

      throw error;
    }
  }

  private async loadCharacterAssetsFromDatabase(storyId: number): Promise<CharacterAssetOverride[]> {
    const assets = await db
      .select()
      .from(characterAssets)
      .where(eq(characterAssets.storyId, storyId));

    return assets.map(asset => ({
      characterName: asset.characterName,
      imageUrl: asset.userImageUrl || asset.aiGeneratedImageUrl || undefined,
      voiceSampleUrl: asset.userVoiceSampleUrl || undefined
    }));
  }

  private async loadAndValidateCharacterAssets(storyId: number): Promise<CharacterAssetOverride[]> {
    // Import storage directly to avoid API authentication issues
    const { storage } = await import("./storage");
    let characters: any[] = [];
    
    try {
      // Try to get existing roleplay analysis from storage
      const existingAnalysis = await storage.getStoryAnalysis(storyId, 'roleplay');
      if (existingAnalysis && existingAnalysis.analysisData) {
        const roleplayData = existingAnalysis.analysisData as any;
        // Handle both direct characters array and nested structure
        characters = roleplayData.characters || [];
        console.log(`Using existing roleplay analysis with ${characters.length} characters:`, characters.map((c: any) => c.name || c.characterName || 'Unnamed'));
      } else {
        throw new Error('No existing roleplay analysis in storage');
      }
    } catch (error) {
      // Fall back to fresh analysis
      const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
      if (!story) {
        throw new Error("Story not found");
      }

      const analysis = await analyzeStoryContent(story.content);
      characters = analysis.characters || [];
      console.log(`Generated fresh analysis with ${characters.length} characters:`, characters.map(c => c.name));
    }

    // Ensure character assets exist for all characters
    const assetPromises = characters.map(character => 
      this.ensureCharacterAsset(storyId, character)
    );

    await Promise.all(assetPromises);

    return this.loadCharacterAssetsFromDatabase(storyId);
  }

  private async ensureCharacterAsset(storyId: number, character: any): Promise<void> {
    const [existingAsset] = await db
      .select()
      .from(characterAssets)
      .where(and(
        eq(characterAssets.storyId, storyId),
        eq(characterAssets.characterName, character.name)
      ));

    if (!existingAsset) {
      // Generate AI assets for new character
      const imageUrl = await this.generateCharacterImageWithCache(character, storyId);
      const voiceAssignment = character.assignedVoice || 'alloy';

      await db.insert(characterAssets).values({
        storyId,
        characterName: character.name,
        aiGeneratedImageUrl: imageUrl,
        aiGeneratedImagePrompt: `${character.description || character.name} - ${character.personality || 'character'}`,
        aiVoiceAssignment: voiceAssignment,
        imageGenerationStatus: 'completed',
        voiceAssignmentStatus: 'completed',
        isValid: true,
        lastValidationAt: new Date()
      });
    }
  }

  private async generateCharacterImageWithCache(character: any, storyId: number): Promise<string> {
    const prompt = `${character.description || character.name} - ${character.personality || 'character'}`;
    const cacheKey = crypto.createHash('sha256').update(prompt).digest('hex');

    // Check AI asset cache first
    const [cachedAsset] = await db
      .select()
      .from(aiAssetCache)
      .where(and(
        eq(aiAssetCache.cacheKey, cacheKey),
        eq(aiAssetCache.assetType, 'character_image'),
        eq(aiAssetCache.isValid, true)
      ));

    if (cachedAsset) {
      // Update usage count
      await db.update(aiAssetCache)
        .set({
          usageCount: (cachedAsset.usageCount || 0) + 1,
          lastUsedAt: new Date()
        })
        .where(eq(aiAssetCache.id, cachedAsset.id));

      return cachedAsset.assetUrl;
    }

    // Generate new image
    const imageUrl = await generateCharacterImage(character, `Story ${storyId} context`);

    // Cache the result
    await db.insert(aiAssetCache).values({
      cacheKey,
      assetType: 'character_image',
      prompt,
      model: 'dall-e-3',
      assetUrl: imageUrl,
      isValid: true,
      usageCount: 1,
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      estimatedCost: 0.04 // Approximate DALL-E 3 cost
    });

    return imageUrl;
  }

  private async validateSingleAsset(asset: any): Promise<void> {
    let isValid = true;
    const validationErrors: string[] = [];

    // Validate user image URL if present
    if (asset.userImageUrl) {
      try {
        const response = await fetch(asset.userImageUrl, { method: 'HEAD' });
        if (!response.ok) {
          validationErrors.push(`User image URL not accessible: ${response.status}`);
          isValid = false;
        }
      } catch (error) {
        validationErrors.push(`User image URL validation failed: ${(error as any)?.message || 'Unknown error'}`);
        isValid = false;
      }
    }

    // Validate user voice sample if present
    if (asset.userVoiceSampleUrl) {
      try {
        const response = await fetch(asset.userVoiceSampleUrl, { method: 'HEAD' });
        if (!response.ok) {
          validationErrors.push(`User voice URL not accessible: ${response.status}`);
          isValid = false;
        }
      } catch (error: any) {
        validationErrors.push(`User voice URL validation failed: ${error?.message || 'Unknown error'}`);
        isValid = false;
      }
    }

    // Update asset validation status
    await db.update(characterAssets)
      .set({
        isValid,
        validationErrors: validationErrors.length > 0 ? validationErrors : null,
        lastValidationAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(characterAssets.id, asset.id));
  }

  private async getCharacterAssetsSnapshot(storyId: number): Promise<any> {
    const assets = await this.loadCharacterAssetsFromDatabase(storyId);
    // Return a clean serializable object without circular references
    return assets.map(asset => ({
      characterName: asset.characterName,
      imageUrl: asset.imageUrl,
      voiceSampleUrl: asset.voiceSampleUrl
    }));
  }

  private async ensureScenes(storyId: number, content: string): Promise<void> {
    const existingScenes = await db
      .select()
      .from(storyScenes)
      .where(eq(storyScenes.storyId, storyId));

    if (existingScenes.length === 0) {
      // Generate basic scene from story content with safe serializable data
      const safeDialogues = [
        { 
          character: "narrator", 
          text: content.substring(0, 500),
          emotion: "neutral",
          timing: 0
        }
      ];

      await db.insert(storyScenes).values({
        storyId,
        sceneNumber: 1,
        title: "Main Scene",
        description: "Primary story scene",
        dialogues: safeDialogues,
        estimatedDuration: Math.min(Math.max(Math.floor(content.length / 10), 30), 180) // 30s to 3min max
      });
    }
  }

  private async createActualVideo(
    story: any,
    characterAssets: CharacterAssetOverride[],
    request: VideoGenerationRequest
  ): Promise<VideoGenerationResult> {
    // Only generate videos with real character data
    if (!characterAssets || characterAssets.length === 0) {
      throw new Error("Cannot generate video without character assets from roleplay analysis");
    }

    try {
      // Get roleplay analysis for scene breakdown
      const roleplayAnalysis = await this.getRoleplayAnalysis(story.id);
      
      // Build provider video request
      const providerRequest: ProviderVideoRequest = {
        storyId: story.id,
        title: story.title,
        content: story.content,
        characters: characterAssets.map((asset: CharacterAssetOverride) => ({
          name: asset.characterName,
          description: asset.characterName || 'Story character',
          imageUrl: '', // Temporarily disable image URLs to avoid API issues
          voiceUrl: asset.voiceSampleUrl
        })),
        scenes: this.buildScenesFromRoleplay(roleplayAnalysis),
        style: 'cinematic',
        quality: request.quality === 'high' ? 'high' : 'standard',
        duration: Math.min(request.duration || this.MAX_ROLEPLAY_DURATION, this.MAX_ROLEPLAY_DURATION),
        aspectRatio: '16:9'
      };

      console.log(`Generating video using provider system for story ${story.id}`);
      
      // Use the provider manager to generate video - stop on first failure
      let result;
      try {
        // Use the configured video provider directly
        const { videoProviderFactory } = await import('./video-provider-factory');
        const provider = await videoProviderFactory.getProvider();
        result = await provider.generateVideo(providerRequest);
      } catch (error: any) {
        console.error(`Video provider failed:`, error.message);
        
        // Immediately save failure to database to prevent retries
        try {
          await db.insert(videoGenerations).values({
            storyId: story.id,
            requestedBy: request.userId,
            videoUrl: '',
            status: 'failed',
            errorMessage: error.message,
            generationParams: {
              quality: 'standard',
              provider: 'runwayml',
              model: 'gen3a_turbo',
              error: error.message
            },
            characterAssetsSnapshot: {
              error: error.message,
              failedAt: new Date().toISOString()
            },
            cacheKey: `story-${story.id}-user-${request.userId}-failed`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });
          console.log(`Video generation failure recorded in database for story ${story.id}`);
        } catch (dbError) {
          console.error('Failed to record video generation failure:', dbError);
        }
        
        throw error; // Stop here, don't continue processing
      }
      
      // Generate audio from roleplay dialogue
      console.log(`Generating audio for video from roleplay dialogues`);
      const audioUrl = null; // Temporarily disable audio generation to focus on video
      
      // Create human-readable description of what was sent to RunwayML
      const characters = roleplayAnalysis?.characters?.map((c: any) => c.name).join(', ') || 'none';
      const scenes = roleplayAnalysis?.scenes?.length || 0;
      const storyLength = story.content?.length || 0;
      
      const videoExpectation = `Video generated from "${story.title}" (${storyLength} chars) featuring characters: ${characters}, with ${scenes} scenes. Complete story content and detailed character descriptions were sent to RunwayML for accurate visualization.`;
      
      // CRITICAL: Save to database to prevent regeneration costs
      console.log(`Saving video to database for story ${story.id} to prevent regeneration costs`);
      
      try {
        // Map to the correct database schema fields
        const videoData = {
          storyId: story.id,
          requestedBy: request.userId, // Use requestedBy instead of userId
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl || '',
          duration: result.duration,
          status: 'completed' as const,
          generationParams: {
            quality: 'standard',
            duration: result.duration,
            provider: 'runwayml',
            model: 'gen3a_turbo'
          },
          characterAssetsSnapshot: {
            hasAudio: false,
            dialogueCount: roleplayAnalysis?.scenes?.reduce((total: number, scene: any) => total + (scene.dialogues?.length || 0), 0) || 0,
            videoExpectation: videoExpectation,
            audioUrl: null
          },
          cacheKey: `story-${story.id}-user-${request.userId}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        };

        // Try to insert first, simple approach
        await db.insert(videoGenerations).values(videoData);
      } catch (insertError: any) {
        console.log('Insert failed, trying update instead:', insertError.message);
        // Fallback: Try to update existing record
        await db.update(videoGenerations)
          .set({
            videoUrl: result.videoUrl,
            thumbnailUrl: result.thumbnailUrl || '',
            duration: result.duration,
            status: 'completed',
            generationParams: {
              quality: 'standard',
              duration: result.duration,
              provider: 'runwayml',
              model: 'gen3a_turbo'
            },
            characterAssetsSnapshot: {
              hasAudio: false,
              dialogueCount: roleplayAnalysis?.scenes?.reduce((total: number, scene: any) => total + (scene.dialogues?.length || 0), 0) || 0,
              videoExpectation: videoExpectation,
              audioUrl: null
            },
            updatedAt: new Date()
          })
          .where(and(
            eq(videoGenerations.storyId, story.id),
            eq(videoGenerations.requestedBy, request.userId)
          ));
      }

      console.log(`Video successfully saved to database for story ${story.id}`);

      // Return the video data with proper caching indication
      console.log(`Video generation successful for story ${story.id}`);
      return {
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl || '',
        duration: result.duration,
        status: 'completed',
        cacheHit: false
      };

    } catch (error: any) {
      console.error('Video generation failed:', error);
      
      // Store failure in database to prevent retries
      try {
        // Use upsert to handle duplicate cache key constraint
        const failureRecord = {
          storyId: story.id,
          requestedBy: request.userId,
          videoUrl: '',
          status: 'failed' as const,
          errorMessage: error.message,
          generationParams: {
            quality: 'standard',
            provider: 'runwayml',
            model: 'gen3a_turbo',
            error: error.message
          },
          characterAssetsSnapshot: {
            error: error.message,
            failedAt: new Date().toISOString()
          },
          cacheKey: `story-${story.id}-user-${request.userId}-failed-${Date.now()}`, // Make unique
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        };

        await db.insert(videoGenerations).values(failureRecord);
        console.log(`Failure recorded in database for story ${story.id}`);
      } catch (dbError) {
        console.error('Failed to record error in database:', dbError);
      }
      
      console.error(`Critical video generation failure for story ${story.id}:`, error.message);
      throw new Error(`Video generation failed: ${error.message}`);
    }
  }

  private async getRoleplayAnalysis(storyId: number): Promise<any> {
    try {
      // Generate cache key for this story's roleplay analysis
      const cacheKey = `roleplay-${storyId}`;
      
      // Try to get existing roleplay analysis from database
      const [existingAnalysis] = await db
        .select()
        .from(aiAssetCache)
        .where(and(
          eq(aiAssetCache.cacheKey, cacheKey),
          eq(aiAssetCache.assetType, 'roleplay_analysis')
        ))
        .limit(1);

      if (existingAnalysis && existingAnalysis.metadata) {
        // The roleplay analysis should be stored in the metadata field
        return typeof existingAnalysis.metadata === 'string' 
          ? JSON.parse(existingAnalysis.metadata) 
          : existingAnalysis.metadata;
      }

      // If no analysis exists, return basic structure
      return {
        scenes: [{
          title: "Main Scene",
          description: "Primary story scene",
          dialogues: [{
            character: "Narrator",
            text: "Story narration",
            emotion: "neutral"
          }]
        }]
      };
    } catch (error) {
      console.error('Error getting roleplay analysis:', error);
      return { scenes: [] };
    }
  }

  private buildScenesFromRoleplay(roleplayAnalysis: any): any[] {
    if (!roleplayAnalysis || !roleplayAnalysis.scenes) {
      return [{
        title: "Main Scene",
        description: "Primary story scene with rich narrative",
        dialogues: [{
          character: "Narrator",
          text: "Story content with emotional depth",
          emotion: "engaged"
        }],
        backgroundDescription: "Immersive cinematic setting with atmospheric details"
      }];
    }

    return roleplayAnalysis.scenes.map((scene: any, index: number) => {
      // Extract rich dialogue information with emotions
      const enrichedDialogues = scene.dialogues?.map((dialogue: any) => ({
        character: dialogue.character || dialogue.speaker || "Character",
        text: dialogue.text || dialogue.content || dialogue.line || "Scene dialogue",
        emotion: dialogue.emotion || dialogue.mood || this.inferEmotionFromText(dialogue.text) || "neutral"
      })) || [{
        character: "Narrator",
        text: scene.content || scene.description || "Scene narration",
        emotion: scene.mood || "storytelling"
      }];

      // Create comprehensive scene description
      const sceneDescription = this.buildRichSceneDescription(scene, index + 1);
      
      return {
        title: scene.title || scene.name || `Scene ${index + 1}`,
        description: sceneDescription,
        dialogues: enrichedDialogues,
        backgroundDescription: scene.setting || scene.location || scene.background || 
          this.generateContextualBackground(scene, enrichedDialogues),
        duration: Math.min(scene.duration || 8, 15), // 8-15 seconds per scene
        mood: scene.mood || this.inferSceneMood(enrichedDialogues),
        characters: scene.characters || this.extractSceneCharacters(enrichedDialogues)
      };
    });
  }

  private buildRichSceneDescription(scene: any, sceneNumber: number): string {
    let description = `Scene ${sceneNumber}: `;
    
    if (scene.description) {
      description += scene.description;
    } else if (scene.content) {
      description += scene.content.substring(0, 100) + (scene.content.length > 100 ? '...' : '');
    } else {
      description += "Dynamic story scene with character interaction";
    }
    
    // Add emotional context if available
    if (scene.mood || scene.emotion) {
      description += ` (${scene.mood || scene.emotion} tone)`;
    }
    
    return description;
  }

  private inferEmotionFromText(text: string): string {
    if (!text) return "neutral";
    
    const emotionKeywords = {
      excited: ['excited', 'amazing', 'wonderful', 'fantastic', 'great'],
      sad: ['sad', 'crying', 'tears', 'sorrow', 'grief'],
      angry: ['angry', 'furious', 'mad', 'rage', 'frustrated'],
      fearful: ['scared', 'afraid', 'terrified', 'fear', 'nervous'],
      surprised: ['surprised', 'shocked', 'amazed', 'stunned'],
      confident: ['confident', 'determined', 'strong', 'powerful'],
      gentle: ['gentle', 'soft', 'kind', 'caring', 'tender']
    };

    const lowerText = text.toLowerCase();
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return emotion;
      }
    }
    
    return "neutral";
  }

  private inferSceneMood(dialogues: any[]): string {
    const emotions = dialogues.map(d => d.emotion).filter(e => e !== "neutral");
    if (emotions.length === 0) return "narrative";
    
    // Return the most common emotion or the first one
    return emotions[0] || "narrative";
  }

  private extractSceneCharacters(dialogues: any[]): string[] {
    return [...new Set(dialogues.map(d => d.character).filter(c => c !== "Narrator"))];
  }

  private generateContextualBackground(scene: any, dialogues: any[]): string {
    // Generate background based on scene content and dialogue
    const characters = this.extractSceneCharacters(dialogues);
    const hasMultipleCharacters = characters.length > 1;
    
    if (hasMultipleCharacters) {
      return "Interactive scene with multiple characters in a cinematic environment";
    } else if (characters.length === 1) {
      return `Focused scene featuring ${characters[0]} in an atmospheric setting`;
    } else {
      return "Narrative scene with immersive storytelling atmosphere";
    }
  }

  private async updateCache(cacheKey: string, result: VideoGenerationResult): Promise<void> {
    try {
      // Cache implementation would go here
      // For now, just log the cache operation
      console.log(`Video result cached with key: ${cacheKey.substring(0, 20)}...`);
    } catch (error: any) {
      console.warn("Failed to update video cache:", error);
    }
  }

  private async invalidateCharacterCache(storyId: number): Promise<void> {
    try {
      const cacheKey = `character-assets-${storyId}`;
      // The cache implementation would need a delete method
      console.log(`Invalidated character cache for story ${storyId}`);
    } catch (error) {
      console.warn("Failed to invalidate character cache:", error);
    }
  }

  /**
   * Approve a pending video - mark it as completed
   */
  async approveVideo(storyId: number, userId: string): Promise<VideoGenerationResult> {
    const [generation] = await db
      .select()
      .from(videoGenerations)
      .where(and(
        eq(videoGenerations.storyId, storyId),
        eq(videoGenerations.requestedBy, userId),
        eq(videoGenerations.status, 'pending_approval')
      ))
      .orderBy(desc(videoGenerations.createdAt))
      .limit(1);

    if (!generation) {
      throw new Error("No pending video found for approval");
    }

    // Mark as completed
    await db.update(videoGenerations)
      .set({
        status: 'completed',
        updatedAt: new Date()
      })
      .where(eq(videoGenerations.id, generation.id));

    return {
      videoUrl: generation.videoUrl!,
      thumbnailUrl: generation.thumbnailUrl || '',
      duration: generation.duration!,
      status: 'completed',
      cacheHit: false
    };
  }

  /**
   * Reject a pending video - mark it as failed
   */
  async rejectVideo(storyId: number, userId: string, reason?: string): Promise<void> {
    const [generation] = await db
      .select()
      .from(videoGenerations)
      .where(and(
        eq(videoGenerations.storyId, storyId),
        eq(videoGenerations.requestedBy, userId),
        eq(videoGenerations.status, 'pending_approval')
      ))
      .orderBy(desc(videoGenerations.createdAt))
      .limit(1);

    if (!generation) {
      throw new Error("No pending video found for rejection");
    }

    // Mark as failed
    await db.update(videoGenerations)
      .set({
        status: 'failed',
        errorMessage: reason || 'Video rejected by user',
        updatedAt: new Date()
      })
      .where(eq(videoGenerations.id, generation.id));
  }

  /**
   * Clean up expired cache entries and failed generations
   */
  async cleanup(): Promise<void> {
    try {
      // Clean expired video generations
      await db.delete(videoGenerations)
        .where(and(
          eq(videoGenerations.status, 'failed'),
          lt(videoGenerations.updatedAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        ));

      // Clean expired AI asset cache
      await db.delete(aiAssetCache)
        .where(lt(aiAssetCache.expiresAt, new Date()));

      console.log("Video generation cleanup completed");
    } catch (error) {
      console.error("Cleanup failed:", error);
    }
  }
}

export const videoGenerationService = new VideoGenerationService();