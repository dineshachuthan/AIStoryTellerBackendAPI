/**
 * Reference Data Service
 * Manages the conversion of user-owned stories into shared reference data
 * and creates user-specific narration instances pointing to reference data
 */

import { DatabaseStorage } from './storage.js';
import type { 
  Story, 
  StoryAnalysis,
  ReferenceStory, 
  InsertReferenceStory,
  ReferenceStoryAnalysis,
  InsertReferenceStoryAnalysis,
  ReferenceRoleplayAnalysis,
  InsertReferenceRoleplayAnalysis,
  UserStoryNarration,
  InsertUserStoryNarration
} from '../shared/schema.js';

interface StoryMigrationResult {
  referenceStoryId: number;
  originalStoryId: number;
  userNarrationId?: number;
  migrated: boolean;
  error?: string;
}

interface MigrationSummary {
  totalStories: number;
  successfulMigrations: number;
  failedMigrations: number;
  storiesConverted: StoryMigrationResult[];
  errors: string[];
}

export class ReferenceDataService {
  constructor(private storage: DatabaseStorage) {}

  /**
   * Migrate existing user stories to reference data architecture
   * Each user story becomes a reference story + user narration instance
   */
  async migrateStoriesToReferenceData(): Promise<MigrationSummary> {
    const results: StoryMigrationResult[] = [];
    const errors: string[] = [];

    try {
      // Get all existing stories from the stories table
      const existingStories = await this.storage.getAllStories();
      
      console.log(`[ReferenceDataService] Starting migration of ${existingStories.length} stories`);

      for (const story of existingStories) {
        try {
          const migrationResult = await this.migrateStoryToReference(story);
          results.push(migrationResult);
          
          if (migrationResult.migrated) {
            console.log(`[ReferenceDataService] Successfully migrated story ${story.id}: "${story.title}"`);
          }
        } catch (error) {
          const errorMsg = `Failed to migrate story ${story.id}: ${error}`;
          errors.push(errorMsg);
          console.error(`[ReferenceDataService] ${errorMsg}`);
          
          results.push({
            referenceStoryId: -1,
            originalStoryId: story.id,
            migrated: false,
            error: errorMsg
          });
        }
      }

      const successCount = results.filter(r => r.migrated).length;
      const failureCount = results.filter(r => !r.migrated).length;

      return {
        totalStories: existingStories.length,
        successfulMigrations: successCount,
        failedMigrations: failureCount,
        storiesConverted: results,
        errors
      };

    } catch (error) {
      console.error('[ReferenceDataService] Migration failed completely:', error);
      throw new Error(`Migration failed: ${error}`);
    }
  }

  /**
   * Convert a single story to reference data architecture
   */
  private async migrateStoryToReference(story: Story): Promise<StoryMigrationResult> {
    try {
      // 1. Create reference story (shared content)
      const referenceStoryData: InsertReferenceStory = {
        title: story.title,
        content: story.content,
        summary: story.summary,
        category: story.category,
        genre: story.genre,
        subGenre: story.subGenre,
        tags: story.tags || [],
        emotionalTags: story.emotionalTags || [],
        moodCategory: story.moodCategory,
        ageRating: story.ageRating || 'general',
        readingTime: story.readingTime,
        extractedCharacters: story.extractedCharacters || [],
        extractedEmotions: story.extractedEmotions || [],
        coverImageUrl: story.coverImageUrl,
        originalAuthorId: 'migration-user', // Default for migration
        visibility: 'public', // Make available to all users
        uploadType: story.uploadType,
        originalAudioUrl: story.originalAudioUrl,
        copyrightInfo: 'User generated content',
        licenseType: 'shared_reference',
        isAdultContent: story.isAdultContent || false,
        viewCount: story.viewCount || 0,
        likes: story.likes || 0,
        language: story.language || 'en-US',
        publishedAt: new Date(),
      };

      const referenceStory = await this.createReferenceStory(referenceStoryData);

      // 2. Migrate story analysis to reference analysis
      const storyAnalysis = await this.storage.getStoryAnalysis(story.id);
      if (storyAnalysis) {
        await this.migrateStoryAnalysisToReference(referenceStory.id, storyAnalysis);
      }

      // 3. Create user narration instance (user-specific)
      let userNarrationId: number | undefined;
      if (story.userId) {
        const userNarrationData: InsertUserStoryNarration = {
          userId: story.userId,
          referenceStoryId: referenceStory.id,
          narratorVoice: 'default', // Will be updated when user records voice
          narratorVoiceType: 'ai',
          segments: [], // Will be populated when user generates narration
          totalDuration: 0,
          audioFileUrl: null,
          voiceModifications: null,
          isPublic: false,
        };

        const userNarration = await this.createUserNarration(userNarrationData);
        userNarrationId = userNarration.id;
      }

      return {
        referenceStoryId: referenceStory.id,
        originalStoryId: story.id,
        userNarrationId,
        migrated: true
      };

    } catch (error) {
      throw new Error(`Story migration failed: ${error}`);
    }
  }

  /**
   * Migrate story analysis to reference story analysis
   */
  private async migrateStoryAnalysisToReference(
    referenceStoryId: number, 
    analysis: StoryAnalysis
  ): Promise<ReferenceStoryAnalysis> {
    const referenceAnalysisData: InsertReferenceStoryAnalysis = {
      referenceStoryId,
      analysisType: analysis.analysisType,
      analysisData: analysis.analysisData,
      generatedBy: analysis.generatedBy,
    };

    return await this.createReferenceStoryAnalysis(referenceAnalysisData);
  }

  /**
   * Create a new reference story (shared across all users)
   */
  async createReferenceStory(data: InsertReferenceStory): Promise<ReferenceStory> {
    const db = this.storage.getDb();
    const { referenceStories } = await import('../shared/schema.js');
    
    const [referenceStory] = await db.insert(referenceStories)
      .values(data)
      .returning();
    
    return referenceStory;
  }

  /**
   * Create reference story analysis (shared AI analysis)
   */
  async createReferenceStoryAnalysis(data: InsertReferenceStoryAnalysis): Promise<ReferenceStoryAnalysis> {
    const db = this.storage.getDb();
    const { referenceStoryAnalyses } = await import('../shared/schema.js');
    
    const [analysis] = await db.insert(referenceStoryAnalyses)
      .values(data)
      .returning();
    
    return analysis;
  }

  /**
   * Create reference roleplay analysis (shared roleplay structure)
   */
  async createReferenceRoleplayAnalysis(data: InsertReferenceRoleplayAnalysis): Promise<ReferenceRoleplayAnalysis> {
    const db = this.storage.getDb();
    const { referenceRoleplayAnalyses } = await import('../shared/schema.js');
    
    const [analysis] = await db.insert(referenceRoleplayAnalyses)
      .values(data)
      .returning();
    
    return analysis;
  }

  /**
   * Create user narration instance (user's personalized version)
   */
  async createUserNarration(data: InsertUserStoryNarration): Promise<UserStoryNarration> {
    const db = this.storage.getDb();
    const { userStoryNarrations } = await import('../shared/schema.js');
    
    const [narration] = await db.insert(userStoryNarrations)
      .values(data)
      .returning();
    
    return narration;
  }

  /**
   * Get all reference stories (public story catalog)
   */
  async getAllReferenceStories(): Promise<ReferenceStory[]> {
    const db = this.storage.getDb();
    const { referenceStories } = await import('../shared/schema.js');
    
    return await db.select()
      .from(referenceStories)
      .where({ visibility: 'public' })
      .orderBy('publishedAt');
  }

  /**
   * Get reference story with analysis
   */
  async getReferenceStoryWithAnalysis(referenceStoryId: number): Promise<{
    story: ReferenceStory;
    analysis: ReferenceStoryAnalysis | null;
    roleplayAnalysis: ReferenceRoleplayAnalysis | null;
  }> {
    const db = this.storage.getDb();
    const { referenceStories, referenceStoryAnalyses, referenceRoleplayAnalyses } = await import('../shared/schema.js');
    
    const story = await db.select()
      .from(referenceStories)
      .where({ id: referenceStoryId })
      .limit(1);

    if (!story.length) {
      throw new Error(`Reference story ${referenceStoryId} not found`);
    }

    const analysis = await db.select()
      .from(referenceStoryAnalyses)
      .where({ referenceStoryId })
      .limit(1);

    const roleplayAnalysis = await db.select()
      .from(referenceRoleplayAnalyses)
      .where({ referenceStoryId })
      .limit(1);

    return {
      story: story[0],
      analysis: analysis.length ? analysis[0] : null,
      roleplayAnalysis: roleplayAnalysis.length ? roleplayAnalysis[0] : null
    };
  }

  /**
   * Get user's narrations (their personalized versions of reference stories)
   */
  async getUserNarrations(userId: string): Promise<UserStoryNarration[]> {
    const db = this.storage.getDb();
    const { userStoryNarrations } = await import('../shared/schema.js');
    
    return await db.select()
      .from(userStoryNarrations)
      .where({ userId })
      .orderBy('createdAt');
  }

  /**
   * Create user narration from reference story
   */
  async createUserNarrationFromReference(
    userId: string, 
    referenceStoryId: number,
    narratorVoice: string = 'default',
    narratorVoiceType: 'ai' | 'user' = 'ai'
  ): Promise<UserStoryNarration> {
    // Verify reference story exists
    const referenceData = await this.getReferenceStoryWithAnalysis(referenceStoryId);
    
    const narrationData: InsertUserStoryNarration = {
      userId,
      referenceStoryId,
      narratorVoice,
      narratorVoiceType,
      segments: [],
      totalDuration: 0,
      audioFileUrl: null,
      voiceModifications: null,
      isPublic: false,
    };

    return await this.createUserNarration(narrationData);
  }

  /**
   * Get all available reference stories for browsing
   */
  async browseReferenceStories(filters?: {
    category?: string;
    genre?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<ReferenceStory[]> {
    const db = this.storage.getDb();
    const { referenceStories } = await import('../shared/schema.js');
    
    let query = db.select()
      .from(referenceStories)
      .where({ visibility: 'public' });

    if (filters?.category) {
      query = query.where({ category: filters.category });
    }

    if (filters?.genre) {
      query = query.where({ genre: filters.genre });
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return await query.orderBy('publishedAt');
  }
}