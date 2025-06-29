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
   * Initialize voice modulation templates from voice-config.ts
   * Populates database with configurable templates
   */
  async initializeTemplates(): Promise<void> {
    try {
      // Check if templates already exist
      const existingTemplates = await db.select().from(voiceModulationTemplates).limit(1);
      if (existingTemplates.length > 0) {
        console.log("Voice modulation templates already initialized");
        return;
      }

      // Create emotion templates from voice-config.ts
      const voiceEmotions = getAllEmotionConfigs();
      const emotionTemplates: InsertVoiceModulationTemplate[] = voiceEmotions.map((emotion, index) => ({
        modulationType: 'emotion',
        modulationKey: emotion.emotion,
        displayName: emotion.displayName,
        description: emotion.description,
        sampleText: emotion.sampleText,
        targetDuration: 8, // 8 seconds for emotions
        category: emotion.category,
        voiceSettings: {
          speed_modifier: 1.0,
          pitch_modifier: 0.0,
          emphasis: emotion.emotion === 'happy' ? 'high' : emotion.emotion === 'sad' ? 'low' : 'medium'
        },
        sortOrder: index,
        isActive: true
      }));

      // Create sound effect templates
      const soundTemplates: InsertVoiceModulationTemplate[] = [
        {
          modulationType: 'sound',
          modulationKey: 'animal_sound',
          displayName: 'Animal Sound',
          description: 'Make animal sounds (cat, dog, bird, etc.)',
          sampleText: 'Make a cat meowing sound: "Meow meow meow"',
          targetDuration: 5,
          category: 'basic',
          voiceSettings: { speed_modifier: 1.2 },
          sortOrder: 100,
          isActive: true
        },
        {
          modulationType: 'sound',
          modulationKey: 'nature_sound',
          displayName: 'Nature Sound',
          description: 'Mimic nature sounds (wind, rain, ocean)',
          sampleText: 'Make a wind sound: "Whoooosh... whoooosh..."',
          targetDuration: 6,
          category: 'basic',
          voiceSettings: { speed_modifier: 0.8 },
          sortOrder: 101,
          isActive: true
        },
        {
          modulationType: 'sound',
          modulationKey: 'mechanical_sound',
          displayName: 'Mechanical Sound',
          description: 'Make mechanical sounds (engine, beeping, buzzing)',
          sampleText: 'Make an engine sound: "Vroom vroom, beep beep"',
          targetDuration: 5,
          category: 'advanced',
          voiceSettings: { speed_modifier: 1.3 },
          sortOrder: 102,
          isActive: true
        }
      ];

      // Create modulation templates
      const modulationTemplates: InsertVoiceModulationTemplate[] = [
        {
          modulationType: 'modulation',
          modulationKey: 'fast_narrator',
          displayName: 'Fast Narrator',
          description: 'Quick, energetic narration style',
          sampleText: 'This is a fast-paced, exciting story that moves quickly from scene to scene!',
          targetDuration: 8,
          category: 'basic',
          voiceSettings: { speed_modifier: 1.4 },
          sortOrder: 200,
          isActive: true
        },
        {
          modulationType: 'modulation',
          modulationKey: 'slow_narrator',
          displayName: 'Slow Narrator',
          description: 'Calm, deliberate narration style',
          sampleText: 'This is a peaceful, contemplative story that unfolds slowly and thoughtfully.',
          targetDuration: 12,
          category: 'basic',
          voiceSettings: { speed_modifier: 0.7 },
          sortOrder: 201,
          isActive: true
        },
        {
          modulationType: 'modulation',
          modulationKey: 'dramatic_narrator',
          displayName: 'Dramatic Narrator',
          description: 'Theatrical, intense narration style',
          sampleText: 'In the depths of darkness, a hero emerges! The battle for destiny begins NOW!',
          targetDuration: 10,
          category: 'advanced',
          voiceSettings: { speed_modifier: 1.1, emphasis: 'high' },
          sortOrder: 202,
          isActive: true
        },
        {
          modulationType: 'modulation',
          modulationKey: 'whispering_narrator',
          displayName: 'Whispering Narrator',
          description: 'Soft, mysterious narration style',
          sampleText: 'Secrets hide in the shadows, whispered tales of mystery and wonder.',
          targetDuration: 10,
          category: 'specialized',
          voiceSettings: { speed_modifier: 0.8, volume: 'low' },
          sortOrder: 203,
          isActive: true
        }
      ];

      // Insert all templates
      const allTemplates = [...emotionTemplates, ...soundTemplates, ...modulationTemplates];
      await db.insert(voiceModulationTemplates).values(allTemplates);

      console.log(`Initialized ${allTemplates.length} voice modulation templates`);
    } catch (error) {
      console.error("Error initializing voice modulation templates:", error);
      throw error;
    }
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
      recordedCount,
      progress,
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