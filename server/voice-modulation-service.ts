import { db } from "./db";
import { 
  voiceModulationTemplates, 
  userVoiceModulations, 
  storyModulationRequirements,
  type VoiceModulationTemplate,
  type UserVoiceModulation,
  type StoryModulationRequirement,
  type InsertVoiceModulationTemplate,
  type InsertUserVoiceModulation,
  type InsertStoryModulationRequirement
} from "@shared/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { getAllEmotionConfigs } from "@shared/voice-config";

/**
 * Voice Modulation Service - Database-driven modular voice sample system
 * 
 * This service manages:
 * 1. Voice modulation templates (emotions, sounds, descriptions)
 * 2. User voice recordings collected at story level
 * 3. Story-specific modulation requirements
 * 4. Cross-story accumulation of voice samples
 */
export class VoiceModulationService {

  /**
   * Voice modulation is now completely data-driven
   * No hardcoded template initialization - users create their own through recording
   */
  async initializeTemplates(): Promise<void> {
    // No hardcoded template initialization - system is data-driven
    console.log("Voice modulation system is data-driven - no hardcoded templates initialized");
    return;


  }

  /**
   * Get all available voice modulation templates
   */
  async getTemplates(type?: string): Promise<VoiceModulationTemplate[]> {
    const conditions = [eq(voiceModulationTemplates.isActive, true)];
    if (type) {
      conditions.push(eq(voiceModulationTemplates.modulationType, type));
    }

    return await db
      .select()
      .from(voiceModulationTemplates)
      .where(and(...conditions))
      .orderBy(voiceModulationTemplates.sortOrder);
  }

  /**
   * Get user's voice modulations - all recordings across all stories
   */
  async getUserVoiceModulations(userId: string, type?: string): Promise<UserVoiceModulation[]> {
    const conditions = [eq(userVoiceModulations.userId, userId)];
    if (type) {
      conditions.push(eq(userVoiceModulations.modulationType, type));
    }

    return await db
      .select()
      .from(userVoiceModulations)
      .where(and(...conditions))
      .orderBy(desc(userVoiceModulations.recordedAt));
  }

  /**
   * Get user's voice modulations for specific story context
   */
  async getUserStoryVoiceModulations(userId: string, storyId: number): Promise<{
    recorded: UserVoiceModulation[];
    required: StoryModulationRequirement[];
    missing: VoiceModulationTemplate[];
  }> {
    // Get user's recorded modulations
    const recorded = await this.getUserVoiceModulations(userId);

    // Get story requirements
    const required = await db
      .select()
      .from(storyModulationRequirements)
      .where(eq(storyModulationRequirements.storyId, storyId));

    // Find missing modulations
    const recordedKeys = new Set(recorded.map(r => r.modulationKey));
    const requiredKeys = required.map(r => r.modulationKey);
    
    const missingKeys = requiredKeys.filter(key => !recordedKeys.has(key));
    const missing = missingKeys.length > 0 
      ? await db
          .select()
          .from(voiceModulationTemplates)
          .where(
            and(
              sql`${voiceModulationTemplates.modulationKey} = ANY(${missingKeys})`,
              eq(voiceModulationTemplates.isActive, true)
            )
          )
      : [];

    return { recorded, required, missing };
  }

  /**
   * Record a new voice modulation for user
   */
  async recordVoiceModulation(data: InsertUserVoiceModulation): Promise<UserVoiceModulation> {
    const [recorded] = await db
      .insert(userVoiceModulations)
      .values(data)
      .returning();
    
    return recorded;
  }

  /**
   * Analyze story and create modulation requirements
   */
  async analyzeStoryModulations(storyId: number, storyContent: string, emotions: string[]): Promise<StoryModulationRequirement[]> {
    // Clear existing requirements
    await db
      .delete(storyModulationRequirements)
      .where(eq(storyModulationRequirements.storyId, storyId));

    const requirements: InsertStoryModulationRequirement[] = [];

    // Add emotion requirements based on story analysis
    for (const emotion of emotions) {
      const template = await db
        .select()
        .from(voiceModulationTemplates)
        .where(
          and(
            eq(voiceModulationTemplates.modulationType, 'emotion'),
            eq(voiceModulationTemplates.modulationKey, emotion.toLowerCase())
          )
        )
        .limit(1);

      if (template.length > 0) {
        requirements.push({
          storyId,
          modulationType: 'emotion',
          modulationKey: emotion.toLowerCase(),
          templateId: template[0].id,
          isRequired: true,
          contextUsage: `Emotion detected in story: ${emotion}`,
          detectedBy: 'ai',
          confidence: 0.9
        });
      }
    }

    // Add sound requirements based on content analysis
    const contentLower = storyContent.toLowerCase();
    const soundKeywords = [
      { keyword: ['animal', 'cat', 'dog', 'bird'], sound: 'animal_sound' },
      { keyword: ['wind', 'rain', 'ocean', 'storm'], sound: 'nature_sound' },
      { keyword: ['engine', 'car', 'machine', 'robot'], sound: 'mechanical_sound' }
    ];

    for (const { keyword, sound } of soundKeywords) {
      if (keyword.some(k => contentLower.includes(k))) {
        const template = await db
          .select()
          .from(voiceModulationTemplates)
          .where(
            and(
              eq(voiceModulationTemplates.modulationType, 'sound'),
              eq(voiceModulationTemplates.modulationKey, sound)
            )
          )
          .limit(1);

        if (template.length > 0) {
          requirements.push({
            storyId,
            modulationType: 'sound',
            modulationKey: sound,
            templateId: template[0].id,
            isRequired: false,
            contextUsage: `Sound detected from keywords: ${keyword.filter(k => contentLower.includes(k)).join(', ')}`,
            detectedBy: 'ai',
            confidence: 0.7
          });
        }
      }
    }

    // Add narrator style requirements based on story characteristics
    let narratorStyle = 'fast_narrator'; // default
    if (contentLower.includes('mysterious') || contentLower.includes('secret')) {
      narratorStyle = 'whispering_narrator';
    } else if (contentLower.includes('dramatic') || contentLower.includes('battle')) {
      narratorStyle = 'dramatic_narrator';
    } else if (contentLower.includes('peaceful') || contentLower.includes('calm')) {
      narratorStyle = 'slow_narrator';
    }

    const narratorTemplate = await db
      .select()
      .from(voiceModulationTemplates)
      .where(
        and(
          eq(voiceModulationTemplates.modulationType, 'modulation'),
          eq(voiceModulationTemplates.modulationKey, narratorStyle)
        )
      )
      .limit(1);

    if (narratorTemplate.length > 0) {
      requirements.push({
        storyId,
        modulationType: 'modulation',
        modulationKey: narratorStyle,
        templateId: narratorTemplate[0].id,
        isRequired: true,
        contextUsage: `Narrator style selected based on story tone`,
        detectedBy: 'ai',
        confidence: 0.8
      });
    }

    // Insert requirements
    if (requirements.length > 0) {
      const inserted = await db
        .insert(storyModulationRequirements)
        .values(requirements)
        .returning();
      return inserted;
    }

    return [];
  }

  /**
   * Get modulation progress for user - across all stories
   */
  async getUserModulationProgress(userId: string): Promise<{
    totalTemplates: number;
    recordedTemplates: number;
    completionPercentage: number;
    recordedSamples: Array<{
      emotion: string;
      audioUrl: string;
      recordedAt: Date;
      duration: number;
    }>;
    byType: Record<string, { total: number; recorded: number; progress: number }>;
  }> {
    // Get all active templates
    const templates = await this.getTemplates();
    
    // Get user recordings
    const recorded = await this.getUserVoiceModulations(userId);
    
    // Calculate overall progress
    const totalTemplates = templates.length;
    const recordedKeys = new Set(recorded.map(r => r.modulationKey));
    const recordedTemplates = templates.filter(t => recordedKeys.has(t.modulationKey)).length;
    const completionPercentage = totalTemplates > 0 ? Math.round((recordedTemplates / totalTemplates) * 100) : 0;

    // Map recorded samples to frontend format
    const recordedSamples = recorded.map(record => ({
      emotion: record.modulationKey,
      audioUrl: record.audioUrl,
      recordedAt: record.recordedAt || new Date(),
      duration: record.duration || 0
    }));

    // Calculate progress by type
    const byType: Record<string, { total: number; recorded: number; progress: number }> = {};
    
    for (const template of templates) {
      if (!byType[template.modulationType]) {
        byType[template.modulationType] = { total: 0, recorded: 0, progress: 0 };
      }
      byType[template.modulationType].total++;
      
      if (recordedKeys.has(template.modulationKey)) {
        byType[template.modulationType].recorded++;
      }
    }

    // Calculate progress percentages
    for (const type in byType) {
      const typeData = byType[type];
      typeData.progress = typeData.total > 0 ? Math.round((typeData.recorded / typeData.total) * 100) : 0;
    }

    return {
      totalTemplates,
      recordedTemplates,
      completionPercentage,
      recordedSamples,
      byType
    };
  }

  /**
   * Get best voice modulation for a given key
   */
  async getBestVoiceModulation(userId: string, modulationKey: string): Promise<UserVoiceModulation | null> {
    const modulations = await db
      .select()
      .from(userVoiceModulations)
      .where(
        and(
          eq(userVoiceModulations.userId, userId),
          eq(userVoiceModulations.modulationKey, modulationKey)
        )
      )
      .orderBy(
        desc(userVoiceModulations.isPreferred),
        desc(userVoiceModulations.qualityScore),
        desc(userVoiceModulations.usageCount)
      )
      .limit(1);

    return modulations.length > 0 ? modulations[0] : null;
  }

  /**
   * Delete a voice modulation for user
   */
  async deleteVoiceModulation(userId: string, modulationKey: string): Promise<void> {
    await db
      .delete(userVoiceModulations)
      .where(
        and(
          eq(userVoiceModulations.userId, userId),
          eq(userVoiceModulations.modulationKey, modulationKey)
        )
      );
  }

  /**
   * Mark a voice modulation as preferred
   */
  async markAsPreferred(userId: string, modulationId: number): Promise<void> {
    // First, unmark all other modulations of the same key as non-preferred
    const modulation = await db
      .select()
      .from(userVoiceModulations)
      .where(eq(userVoiceModulations.id, modulationId))
      .limit(1);

    if (modulation.length > 0) {
      // Remove preferred status from other modulations of same key
      await db
        .update(userVoiceModulations)
        .set({ isPreferred: false })
        .where(
          and(
            eq(userVoiceModulations.userId, userId),
            eq(userVoiceModulations.modulationKey, modulation[0].modulationKey)
          )
        );

      // Set this one as preferred
      await db
        .update(userVoiceModulations)
        .set({ isPreferred: true })
        .where(eq(userVoiceModulations.id, modulationId));
    }
  }

  /**
   * Update usage statistics
   */
  async updateUsageStats(modulationId: number): Promise<void> {
    await db
      .update(userVoiceModulations)
      .set({ 
        usageCount: sql`${userVoiceModulations.usageCount} + 1`,
        lastUsedAt: new Date()
      })
      .where(eq(userVoiceModulations.id, modulationId));
  }
}

// Singleton instance
export const voiceModulationService = new VoiceModulationService();