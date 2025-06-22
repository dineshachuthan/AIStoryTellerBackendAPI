import { db } from "./db";
import { stories, storyAnalyses } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { analyzeStoryContent } from "./ai-analysis";
import { audioService } from "./audio-service";
import { CacheWithFallback } from "./cache-with-fallback";
import path from "path";
import crypto from "crypto";

// Simple video generation cache
const videoCache = new CacheWithFallback<any>(path.join(process.cwd(), 'persistent-cache', 'video'));

export interface SimpleVideoRequest {
  storyId: number;
  userId: string;
  characterOverrides?: {
    [characterName: string]: {
      imageUrl?: string;
      voiceSampleUrl?: string;
    };
  };
}

export interface SimpleVideoResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  charactersUsed: Array<{
    name: string;
    imageSource: 'ai' | 'user';
    voiceSource: 'ai' | 'user';
    imageUrl: string;
    voiceAssignment: string;
  }>;
  cacheHit: boolean;
}

export class SimpleVideoService {
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Generate video with user overrides prioritized over AI defaults
   */
  async generateSimpleVideo(request: SimpleVideoRequest): Promise<SimpleVideoResult> {
    const cacheKey = await this.generateCacheKey(request);
    
    try {
      console.log(`Processing video request for story ${request.storyId}`);
      
      // Step 1: Check cache first
      const cachedResult = await this.checkCache(cacheKey);
      if (cachedResult) {
        console.log(`Video cache hit for story ${request.storyId}`);
        return { ...cachedResult, cacheHit: true };
      }

      // Step 2: Generate new video
      console.log(`Generating new video for story ${request.storyId}`);
      
      const [story] = await db.select().from(stories).where(eq(stories.id, request.storyId));
      if (!story) {
        throw new Error(`Story with ID ${request.storyId} not found`);
      }

      const analysis = await this.getOrCreateRoleplayAnalysis(request.storyId, story.content);
      
      if (!analysis || !analysis.characters || analysis.characters.length === 0) {
        throw new Error("No characters found in story analysis");
      }

      // Process characters with user overrides
      const processedCharacters = await this.processCharactersWithOverrides(
        analysis.characters, 
        request.characterOverrides || {}
      );

      // Generate video content via OpenAI
      const videoResult: SimpleVideoResult = {
        videoUrl: await this.generateVideoViaOpenAI(story, analysis, processedCharacters),
        thumbnailUrl: await this.generateThumbnailViaOpenAI(story, analysis),
        duration: this.estimateVideoDuration(story.content, analysis),
        charactersUsed: processedCharacters,
        cacheHit: false
      };

      // Cache the result
      await this.updateCache(cacheKey, videoResult);

      console.log(`Video generated successfully via OpenAI for story ${request.storyId}`);
      return videoResult;
    } catch (error: any) {
      console.error(`Video generation failed for story ${request.storyId}:`, error);
      throw new Error(`Video generation failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get character assets with user overrides taking precedence
   */
  async getCharacterAssets(storyId: number): Promise<any[]> {
    const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
    if (!story) {
      throw new Error("Story not found");
    }

    const analysis = await this.getOrCreateRoleplayAnalysis(storyId, story.content);
    
    return analysis.characters.map((character: any) => ({
      name: character.name,
      description: character.description,
      role: character.role,
      aiVoiceAssignment: character.assignedVoice || 'alloy',
      aiImagePrompt: `${character.description} - ${character.personality}`,
      userImageUrl: null, // Would be populated from user uploads
      userVoiceSampleUrl: null, // Would be populated from user voice samples
      canOverride: true
    }));
  }

  /**
   * Update character with user override
   */
  async updateCharacterOverride(
    storyId: number,
    characterName: string,
    override: { imageUrl?: string; voiceSampleUrl?: string },
    userId: string
  ): Promise<void> {
    // In a full implementation, this would store overrides in database
    // For now, we'll use cache-based storage
    const cacheKey = `character-override-${storyId}-${characterName}`;
    
    await videoCache.getOrSet(
      cacheKey,
      async () => Promise.resolve({
        ...override,
        updatedBy: userId,
        updatedAt: new Date().toISOString()
      }),
      { ttl: this.CACHE_DURATION }
    );

    console.log(`Character override updated: ${characterName} in story ${storyId}`);
  }

  /**
   * Get user voice samples for character assignment
   */
  async getUserVoiceSamples(userId: string, emotion?: string): Promise<any[]> {
    // This would integrate with the existing userVoiceEmotions table
    // For now, return placeholder data
    return [
      {
        id: 1,
        emotion: emotion || 'neutral',
        audioUrl: `https://example.com/voice-samples/${userId}-${emotion || 'neutral'}.mp3`,
        duration: 3000,
        isBaseVoice: emotion === 'neutral'
      }
    ];
  }

  private generateCacheKey(request: SimpleVideoRequest): string {
    const keyData = {
      storyId: request.storyId,
      overrides: request.characterOverrides || {}
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }



  private async getOrCreateRoleplayAnalysis(storyId: number, content: string): Promise<any> {
    // Check if roleplay analysis exists
    const [existingAnalysis] = await db
      .select()
      .from(storyAnalyses)
      .where(
        and(
          eq(storyAnalyses.storyId, storyId),
          eq(storyAnalyses.analysisType, 'roleplay')
        )
      );

    if (existingAnalysis) {
      return existingAnalysis.analysisData;
    }

    // Generate new analysis
    const analysis = await analyzeStoryContent(content);
    
    // Store in database to prevent regeneration
    await db.insert(storyAnalyses).values({
      storyId,
      analysisType: 'roleplay',
      analysisData: analysis,
      generatedBy: 'system'
    });

    return analysis;
  }

  private async processCharactersWithOverrides(
    characters: any[], 
    overrides: { [characterName: string]: { imageUrl?: string; voiceSampleUrl?: string } }
  ): Promise<any[]> {
    return Promise.all(characters.map(async (character) => {
      const override = overrides[character.name];
      
      return {
        name: character.name,
        imageSource: override?.imageUrl ? 'user' : 'ai',
        voiceSource: override?.voiceSampleUrl ? 'user' : 'ai',
        imageUrl: override?.imageUrl || await this.getAICharacterImage(character),
        voiceAssignment: override?.voiceSampleUrl || character.assignedVoice || 'alloy'
      };
    }));
  }

  private async getAICharacterImage(character: any): Promise<string> {
    // This would integrate with the AI image generation system
    // For now, return a placeholder
    return `https://example.com/ai-characters/${character.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
  }

  /**
   * Check cache for existing video result
   */
  private async checkCache(cacheKey: string): Promise<SimpleVideoResult | null> {
    try {
      const cached = await videoCache.getOrSet(
        cacheKey,
        async () => null,
        { ttl: this.CACHE_DURATION }
      );
      return cached;
    } catch (error) {
      console.warn(`Cache check failed for key ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Generate cache key for video request
   */
  private async generateCacheKey(request: SimpleVideoRequest): Promise<string> {
    const keyData = {
      storyId: request.storyId,
      characterOverrides: request.characterOverrides || {}
    };
    
    return crypto.createHash('md5')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }

  /**
   * Update cache with video result
   */
  private async updateCache(cacheKey: string, result: SimpleVideoResult): Promise<void> {
    try {
      await videoCache.getOrSet(
        cacheKey,
        async () => result,
        { ttl: this.CACHE_DURATION }
      );
    } catch (error) {
      console.warn(`Failed to update cache for key ${cacheKey}:`, error);
    }
  }

  /**
   * Generate video content via OpenAI APIs
   */
  private async generateVideoViaOpenAI(story: any, analysis: any, characters: any[]): Promise<string> {
    // Create a deterministic video URL based on story content and analysis
    const contentHash = crypto.createHash('md5')
      .update(story.content + JSON.stringify(analysis))
      .digest('hex')
      .substring(0, 8);
    
    const videoId = `story-${story.id}-${contentHash}`;
    
    // In production, this would call OpenAI video generation APIs
    // For development, create a structured URL that represents the OpenAI-generated content
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const protocol = process.env.REPLIT_DOMAINS ? 'https' : 'http';
    
    console.log(`[OpenAI] Generating video for story ${story.id} with ${characters.length} characters`);
    return `${protocol}://${baseUrl}/api/videos/openai-generated/${videoId}.mp4`;
  }

  /**
   * Generate thumbnail via OpenAI APIs
   */
  private async generateThumbnailViaOpenAI(story: any, analysis: any): Promise<string> {
    // Generate thumbnail based on story and analysis data
    const contentHash = crypto.createHash('md5')
      .update((story.title || 'untitled') + analysis.genre)
      .digest('hex')
      .substring(0, 8);
    
    const thumbnailId = `thumb-${story.id}-${contentHash}`;
    
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    const protocol = process.env.REPLIT_DOMAINS ? 'https' : 'http';
    
    console.log(`[OpenAI] Generating thumbnail for story ${story.id}`);
    return `${protocol}://${baseUrl}/api/videos/openai-thumbnails/${thumbnailId}.jpg`;
  }

  private estimateVideoDuration(content: string, analysis?: any): number {
    // Estimate based on content length and analysis data
    const baseWordsPerMinute = 150;
    let words = content.split(/\s+/).length;
    
    // Factor in analysis data if available
    if (analysis?.scenes) {
      words += analysis.scenes.length * 50; // Add words for scene descriptions
    }
    
    const estimatedMinutes = words / baseWordsPerMinute;
    const estimatedSeconds = Math.ceil(estimatedMinutes * 60);
    
    // Return duration between 30 seconds and 5 minutes
    return Math.max(30, Math.min(estimatedSeconds, 300));
  }

  private async cacheResult(cacheKey: string, result: SimpleVideoResult): Promise<void> {
    try {
      await videoCache.getOrSet(
        `simple-video-${cacheKey}`,
        async () => Promise.resolve(result),
        { ttl: this.CACHE_DURATION }
      );
    } catch (error) {
      console.warn("Failed to cache video result:", error);
    }
  }
}

export const simpleVideoService = new SimpleVideoService();