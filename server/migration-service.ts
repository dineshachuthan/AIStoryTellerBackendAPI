import { db } from "./db";
import { stories, storyAnalyses } from '@shared/schema/schema';
import { eq } from "drizzle-orm";

/**
 * Migration Service - Handles transition from flawed user-owned stories 
 * to correct reference data architecture
 * 
 * Current Problem: Stories are user-owned, should be reference data
 * Solution: Gradually migrate to reference data + user narration instances
 */

export class MigrationService {
  
  /**
   * PHASE 1: Update reference data extraction to work with current schema
   * Keep existing stories but treat published ones as reference data
   */
  async extractReferenceDataFromExistingStories(): Promise<void> {
    console.log("🔄 Starting reference data extraction from existing stories...");
    
    try {
      // Get all published stories (these should become reference data)
      const publishedStories = await db
        .select()
        .from(stories)
        .where(eq(stories.isPublished, true));
      
      console.log(`Found ${publishedStories.length} published stories to process as reference data`);
      
      // Process each published story
      for (const story of publishedStories) {
        await this.processStoryAsReferenceData(story.id);
      }
      
      // Also process stories with existing analyses (even if not published)
      const analysisRecords = await db
        .select({ storyId: storyAnalyses.storyId })
        .from(storyAnalyses);
      
      const uniqueStoryIds = [...new Set(analysisRecords.map(a => a.storyId))];
      console.log(`Found ${uniqueStoryIds.length} stories with analyses to process`);
      
      for (const storyId of uniqueStoryIds) {
        await this.processStoryAsReferenceData(storyId);
      }
      
      console.log("✅ Reference data extraction completed");
      
    } catch (error) {
      console.error("❌ Reference data extraction failed:", error);
      throw error;
    }
  }
  
  /**
   * Process individual story as reference data
   */
  private async processStoryAsReferenceData(storyId: number): Promise<void> {
    try {
      console.log(`📖 Processing story ${storyId} as reference data...`);
      
      // Get story and its analyses
      const story = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1);
      
      if (story.length === 0) {
        console.log(`⚠️ Story ${storyId} not found, skipping`);
        return;
      }
      
      const analyses = await db
        .select()
        .from(storyAnalyses)
        .where(eq(storyAnalyses.storyId, storyId));
      
      // Process each analysis for reference data extraction
      for (const analysis of analyses) {
        console.log(`🔍 Processing ${analysis.analysisType} analysis for story ${storyId}`);
        
        // Import and use the reference data service
        const { referenceDataService } = await import('./reference-data-service');
        await referenceDataService.processAnalysisForReferenceData(
          analysis.analysisData as any, 
          storyId
        );
      }
      
      console.log(`✅ Completed processing story ${storyId} as reference data`);
      
    } catch (error) {
      console.error(`❌ Failed to process story ${storyId}:`, error);
    }
  }
  
  /**
   * PHASE 2: Identify stories that should be treated as reference data
   */
  async identifyReferenceDataCandidates(): Promise<{
    publishedStories: number[];
    storiesWithAnalyses: number[];
    storiesWithNarrations: number[];
  }> {
    const publishedStories = await db
      .select({ id: stories.id })
      .from(stories)
      .where(eq(stories.isPublished, true));
    
    const storiesWithAnalyses = await db
      .select({ storyId: storyAnalyses.storyId })
      .from(storyAnalyses);
    
    // TODO: Add stories with narrations when we implement user_story_narrations table
    
    return {
      publishedStories: publishedStories.map(s => s.id),
      storiesWithAnalyses: [...new Set(storiesWithAnalyses.map(s => s.storyId))],
      storiesWithNarrations: [] // Will be populated later
    };
  }
  
  /**
   * PHASE 3: Create reference data statistics
   */
  async getReferenceDataMigrationStats(): Promise<{
    totalStories: number;
    publishedStories: number;
    storiesWithAnalyses: number;
    extractedEmotions: number;
    extractedSounds: number;
    extractedModulations: number;
  }> {
    const totalStories = await db.select().from(stories);
    const candidates = await this.identifyReferenceDataCandidates();
    
    // Get reference data stats
    const { referenceDataService } = await import('./reference-data-service');
    const stats = await referenceDataService.getReferenceDataStats();
    
    return {
      totalStories: totalStories.length,
      publishedStories: candidates.publishedStories.length,
      storiesWithAnalyses: candidates.storiesWithAnalyses.length,
      extractedEmotions: stats.emotions,
      extractedSounds: stats.sounds,
      extractedModulations: stats.modulations
    };
  }
  
  /**
   * FUTURE: Migrate user narrations to new user_story_narrations table
   * This will be implemented once we create the new schema tables
   */
  async migrateUserNarrationsToNewSchema(): Promise<void> {
    console.log("⏳ User narration migration not yet implemented");
    console.log("Will be implemented after new reference schema tables are created");
  }
  
  /**
   * Emergency: Reset all reference data extraction
   */
  async resetReferenceDataExtraction(): Promise<void> {
    console.log("🔄 Resetting all reference data extraction...");
    
    try {
      // Clear voice modulation templates that were auto-generated
      const { voiceModulationTemplates } = await import('@shared/schema');
      await db.delete(voiceModulationTemplates);
      
      console.log("✅ Reference data reset completed");
      
    } catch (error) {
      console.error("❌ Reference data reset failed:", error);
      throw error;
    }
  }
}

export const migrationService = new MigrationService();