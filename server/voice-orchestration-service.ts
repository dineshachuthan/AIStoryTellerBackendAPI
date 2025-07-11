/**
 * Voice Orchestration Service
 * Dynamically calculates optimal voice parameters by merging user profiles, 
 * emotion settings, and character patterns
 */

import fs from 'fs/promises';
import path from 'path';
import _ from 'lodash';
import { db } from './db';
import { userVoiceProfiles, stories, storyAnalyses } from '@shared/schema/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

interface VoiceStyle {
  stability: number;
  similarityBoost: number;
  style: number;
  prosody: {
    pitch: string;
    rate: string;
    volume: string;
  };
}

interface VoiceConfigData {
  globalDefaults: any;
  weightedDefaults: any[];
  characters: Record<string, any>;
  userProfiles?: Record<string, any>;
  learnedPatterns?: any[];
}

interface ConversationStyle {
  stability: { mean: number; range: [number, number] };
  similarity_boost: { mean: number; range: [number, number] };
  style: { mean: number; range: [number, number] };
  prosody: {
    pitch: { base: string; range: [number, number] };
    rate: { base: string; range: [number, number] };
    volume: string;
  };
}

interface NarratorProfile {
  voice_id?: string;
  baselineVoice: {
    stability: number;
    similarity_boost: number;
    style: number;
    pitch: string;
    rate: string;
    volume: string;
  };
}

interface SoundPattern {
  pattern: string;
  insert: string;
}

export class VoiceOrchestrationService {
  private configPath = path.join(process.cwd(), 'config/data/fullVoiceConfig.json');
  private conversationStylePath = path.join(process.cwd(), 'config/data/conversationStyle.json');
  private soundsPatternsPath = path.join(process.cwd(), 'config/data/soundsPattern.json');
  private config: VoiceConfigData | null = null;
  private conversationStyles: Record<string, ConversationStyle> | null = null;
  private soundsPatterns: SoundPattern[] | null = null;
  private configLastLoaded: number = 0;
  private CONFIG_RELOAD_INTERVAL = 60000; // Reload config every minute

  /**
   * Random number generator for voice parameter variability
   */
  private randInRange(min: number, max: number): number {
    return +(Math.random() * (max - min) + min).toFixed(2);
  }

  /**
   * Get or load voice configuration
   */
  private async getConfig(): Promise<VoiceConfigData> {
    const now = Date.now();
    if (!this.config || now - this.configLastLoaded > this.CONFIG_RELOAD_INTERVAL) {
      try {
        const configContent = await fs.readFile(this.configPath, 'utf8');
        this.config = JSON.parse(configContent);
        this.configLastLoaded = now;
      } catch (error) {
        console.error('[VoiceOrchestration] Failed to load config, using defaults', error);
        // Return minimal defaults if config not found
        this.config = {
          globalDefaults: {
            stability: { mean: 0.75, range: [0.7, 0.8] },
            similarity_boost: { mean: 0.85, range: [0.8, 0.9] },
            style: { mean: 0.5, range: [0.3, 0.7] },
            prosody: {
              pitch: { base: "0%", range: [-3, 3] },
              rate: { base: "85%", range: [80, 90] },
              volume: "medium"
            }
          },
          weightedDefaults: [],
          characters: {}
        };
      }
    }
    return this.config!;
  }

  /**
   * Get or load sound patterns configuration
   */
  private async getSoundPatterns(): Promise<SoundPattern[]> {
    if (!this.soundsPatterns) {
      try {
        const patternsContent = await fs.readFile(this.soundsPatternsPath, 'utf8');
        this.soundsPatterns = JSON.parse(patternsContent);
      } catch (error) {
        console.error('[VoiceOrchestration] Failed to load sound patterns, using empty array', error);
        this.soundsPatterns = [];
      }
    }
    return this.soundsPatterns!;
  }

  /**
   * Get or load conversation styles configuration
   */
  private async getConversationStyles(): Promise<Record<string, ConversationStyle>> {
    const now = Date.now();
    if (!this.conversationStyles || now - this.configLastLoaded > this.CONFIG_RELOAD_INTERVAL) {
      try {
        const styleContent = await fs.readFile(this.conversationStylePath, 'utf8');
        this.conversationStyles = JSON.parse(styleContent);
        console.log('[VoiceOrchestration] Loaded conversation styles:', Object.keys(this.conversationStyles || {}));
      } catch (error) {
        console.error('[VoiceOrchestration] Failed to load conversation styles, using empty set', error);
        this.conversationStyles = {};
      }
    }
    return this.conversationStyles!;
  }

  /**
   * Save updated configuration
   */
  private async saveConfig(config: VoiceConfigData): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      this.config = config;
      this.configLastLoaded = Date.now();
      console.log('[VoiceOrchestration] Configuration updated successfully');
    } catch (error) {
      console.error('[VoiceOrchestration] Failed to save config', error);
    }
  }

  /**
   * Get voice settings - matches your original JavaScript logic exactly
   */
  async getVoiceSettings(
    userId: string,
    character: string = 'Narrator',
    emotion: string = 'neutral',
    storyId?: number,
    conversationType?: string,
    narratorProfile?: NarratorProfile
  ): Promise<VoiceStyle> {
    console.log(`[VoiceOrchestration] Getting voice settings for character: ${character}, emotion: ${emotion}, conversation: ${conversationType || 'none'}`);

    // Get voice configuration
    const config = await this.getConfig();
    
    // Ensure voice profile exists for this character/emotion combo
    this.ensureVoiceProfile(config, character, emotion);
    
    // Apply weighted defaults based on character and emotion
    let style = this.applyWeightedDefaults(character, emotion, config);
    
    // Overlay character-specific settings
    style = this.overlayCharacterEmotion(style, character, emotion, config);
    
    // Apply conversation style if specified
    if (conversationType) {
      const conversationStyles = await this.getConversationStyles();
      style = this.overlayConversationStyle(style, conversationType, conversationStyles);
    }
    
    // Merge with narrator profile if provided
    if (narratorProfile?.baselineVoice) {
      style = this.mergeNarratorWithStyle(narratorProfile.baselineVoice, style);
    }
    
    // Learn from this interaction
    if (storyId) {
      await this.learnFromInteraction(userId, storyId, character, emotion, style);
    }
    
    return style;
  }

  /**
   * Calculate voice parameters for a text segment
   */
  async calculateVoiceParameters(
    userId: string,
    text: string,
    character: string = 'Narrator',
    emotion: string = 'neutral',
    storyId?: number,
    conversationType?: string,
    narratorProfile?: NarratorProfile
  ): Promise<VoiceStyle> {
    console.log(`[VoiceOrchestration] Calculating parameters for character: ${character}, emotion: ${emotion}, conversation: ${conversationType || 'none'}`);

    // Get user's baseline voice profile
    const userProfile = await this.getUserVoiceProfile(userId);
    
    // Get voice configuration
    const config = await this.getConfig();
    
    // Apply weighted defaults based on character and emotion
    let style = this.applyWeightedDefaults(character, emotion, config);
    
    // Overlay character-specific settings
    style = this.overlayCharacterEmotion(style, character, emotion, config);
    
    // Apply conversation style if specified
    if (conversationType) {
      const conversationStyles = await this.getConversationStyles();
      style = await this.overlayConversationStyle(style, conversationType, conversationStyles);
    }
    
    // Merge with narrator profile if provided
    if (narratorProfile) {
      style = this.mergeWithNarratorProfile(narratorProfile, style);
    } else if (userProfile) {
      // Fallback to user's baseline if no narrator profile
      style = this.mergeWithUserBaseline(userProfile, style);
    }
    
    // Learn from this interaction
    if (storyId) {
      await this.learnFromInteraction(userId, storyId, character, emotion, style);
    }
    
    return style;
  }

  /**
   * Get user's voice profile from database
   */
  private async getUserVoiceProfile(userId: string): Promise<any> {
    try {
      const [profile] = await db
        .select()
        .from(userVoiceProfiles)
        .where(and(
          eq(userVoiceProfiles.userId, userId),
          eq(userVoiceProfiles.isActive, true)
        ))
        .limit(1);
      
      if (profile) {
        return {
          stability: profile.stability,
          similarity_boost: profile.similarityBoost,
          style: profile.style,
          pitch: profile.pitch || "0%",
          rate: profile.rate || "85%",
          age: profile.age,
          nativeLanguage: profile.nativeLanguage,
          storytellingLanguage: profile.storytellingLanguage
        };
      }
    } catch (error) {
      console.error('[VoiceOrchestration] Error fetching user profile', error);
    }
    return null;
  }

  /**
   * Apply weighted defaults based on patterns - matches your JS logic exactly
   */
  private applyWeightedDefaults(character: string, emotion: string, config: VoiceConfigData): VoiceStyle {
    let style = _.cloneDeep(config.globalDefaults);
    
    // Apply weighted defaults
    for (const weight of config.weightedDefaults) {
      const charPattern = weight.match.characterPattern ? 
        new RegExp(weight.match.characterPattern, 'i') : null;
      const emoMatch = weight.match.emotion === emotion;
      
      if ((charPattern && charPattern.test(character)) || emoMatch) {
        for (const [path, value] of Object.entries(weight.apply)) {
          _.set(style, path, value);
        }
      }
    }

    return style;
  }

  /**
   * Ensure voice profile exists for character/emotion combo - matches your JS logic
   */
  private ensureVoiceProfile(config: VoiceConfigData, character: string, emotion: string): void {
    if (!config.characters[character]) {
      config.characters[character] = {};
    }
    
    if (!config.characters[character][emotion]) {
      config.characters[character][emotion] = {
        stability: this.randInRange(0.6, 0.9),
        similarity_boost: this.randInRange(0.8, 0.95),
        style: this.randInRange(0.3, 0.7),
        prosody: {
          pitch: `${this.randInRange(-5, 5)}%`,
          rate: `${this.randInRange(80, 100)}%`,
          volume: "medium"
        }
      };
      console.log(`🆕 Added new profile: ${character} -> ${emotion}`);
    }
  }

  /**
   * Merge narrator baseline with style - matches your JS logic exactly
   */
  private mergeNarratorWithStyle(narratorBaseline: any, style: any): VoiceStyle {
    return {
      stability: (narratorBaseline.stability + style.stability.mean) / 2,
      similarityBoost: (narratorBaseline.similarity_boost + style.similarity_boost.mean) / 2,
      style: (narratorBaseline.style + style.style.mean) / 2,
      prosody: {
        pitch: `${parseInt(narratorBaseline.pitch) + parseInt(style.prosody.pitch.base) + this.randInRange(style.prosody.pitch.range[0], style.prosody.pitch.range[1])}%`,
        rate: `${parseInt(narratorBaseline.rate) + parseInt(style.prosody.rate.base) + this.randInRange(style.prosody.rate.range[0], style.prosody.rate.range[1])}%`,
        volume: narratorBaseline.volume || style.prosody.volume
      }
    };
  }

  /**
   * Overlay character-specific emotion settings - matches your JS logic exactly
   */
  private overlayCharacterEmotion(
    style: any, 
    character: string, 
    emotion: string, 
    config: VoiceConfigData
  ): any {
    if (config.characters[character]) {
      const charCfg = config.characters[character][emotion] || config.characters[character]['default'];
      if (charCfg) {
        _.merge(style, charCfg);
      }
    }
    return style;
  }

  /**
   * Overlay conversation style settings - matches your JS logic exactly
   */
  private overlayConversationStyle(
    style: any,
    conversationType: string,
    conversationStyles: Record<string, any>
  ): any {
    const overlay = conversationStyles[conversationType];
    if (overlay) {
      _.merge(style, overlay);
    }
    return style;
  }

  /**
   * Merge prosody value with range variation
   */
  private mergeProsodyWithRange(current: string, base: string, range: [number, number]): string {
    const currentNum = parseInt(current) || 0;
    const baseNum = parseInt(base) || 0;
    const variation = Math.round(Math.random() * (range[1] - range[0]) + range[0]);
    const merged = Math.round((currentNum + baseNum + variation) / 2);
    return `${merged}%`;
  }

  /**
   * Merge calculated style with narrator profile
   */
  private mergeWithNarratorProfile(narratorProfile: NarratorProfile, style: VoiceStyle): VoiceStyle {
    const baseline = narratorProfile.baselineVoice;
    
    return {
      stability: (baseline.stability + style.stability) / 2,
      similarityBoost: (baseline.similarity_boost + style.similarityBoost) / 2,
      style: (baseline.style + style.style) / 2,
      prosody: {
        pitch: this.mergeProsodyValue(baseline.pitch, style.prosody.pitch),
        rate: this.mergeProsodyValue(baseline.rate, style.prosody.rate),
        volume: baseline.volume || style.prosody.volume
      }
    };
  }

  /**
   * Merge calculated style with user's baseline
   */
  private mergeWithUserBaseline(userBaseline: any, style: VoiceStyle): VoiceStyle {
    // Average stability and similarity with user's baseline
    const merged: VoiceStyle = {
      stability: (userBaseline.stability + style.stability) / 2,
      similarityBoost: (userBaseline.similarity_boost + style.similarityBoost) / 2,
      style: (userBaseline.style + style.style) / 2,
      prosody: {
        pitch: this.mergeProsodyValue(userBaseline.pitch, style.prosody.pitch),
        rate: this.mergeProsodyValue(userBaseline.rate, style.prosody.rate),
        volume: style.prosody.volume
      }
    };

    // Adjust for user characteristics
    if (userBaseline.age) {
      if (userBaseline.age < 25) {
        // Younger users might prefer more dynamic voices
        merged.style = Math.min(merged.style + 0.1, 1);
        merged.prosody.rate = this.adjustPercentage(merged.prosody.rate, 5);
      } else if (userBaseline.age > 50) {
        // Older users might prefer more stable voices
        merged.stability = Math.min(merged.stability + 0.1, 1);
        merged.prosody.rate = this.adjustPercentage(merged.prosody.rate, -5);
      }
    }

    return merged;
  }

  /**
   * Merge prosody percentage values
   */
  private mergeProsodyValue(baseline: string, calculated: string): string {
    const baselineNum = parseInt(baseline) || 0;
    const calculatedNum = parseInt(calculated) || 0;
    const average = Math.round((baselineNum + calculatedNum) / 2);
    return `${average}%`;
  }

  /**
   * Adjust percentage value
   */
  private adjustPercentage(value: string, adjustment: number): string {
    const current = parseInt(value) || 0;
    return `${current + adjustment}%`;
  }

  /**
   * Learn from user interactions and update configuration
   */
  private async learnFromInteraction(
    userId: string,
    storyId: number,
    character: string,
    emotion: string,
    usedStyle: VoiceStyle
  ): Promise<void> {
    try {
      // Get story analysis to find new patterns
      const [analysis] = await db
        .select()
        .from(storyAnalyses)
        .where(eq(storyAnalyses.storyId, storyId))
        .limit(1);

      if (analysis && analysis.result) {
        const result = analysis.result as any;
        
        // Extract character patterns from analysis
        if (result.characters && Array.isArray(result.characters)) {
          for (const char of result.characters) {
            if (char.name && !this.config?.characters[char.name]) {
              // New character discovered - add to configuration
              await this.addNewCharacterPattern(char.name, char.personality || {});
            }
          }
        }

        // Track emotion usage patterns
        if (result.emotions && Array.isArray(result.emotions)) {
          await this.trackEmotionPatterns(result.emotions);
        }
      }

      // Update learned patterns
      await this.updateLearnedPatterns(character, emotion, usedStyle);
      
    } catch (error) {
      console.error('[VoiceOrchestration] Error learning from interaction', error);
    }
  }

  /**
   * Add new character pattern to configuration
   */
  private async addNewCharacterPattern(characterName: string, personality: any): Promise<void> {
    const config = await this.getConfig();
    
    if (!config.characters[characterName]) {
      console.log(`[VoiceOrchestration] Discovered new character: ${characterName}`);
      
      // Generate default settings based on personality traits
      const defaultSettings = this.generateCharacterDefaults(personality);
      
      config.characters[characterName] = {
        default: defaultSettings,
        // Add emotion variants
        happy: { ...defaultSettings, prosody: { ...defaultSettings.prosody, pitch: "+3%", rate: "90%" } },
        sad: { ...defaultSettings, prosody: { ...defaultSettings.prosody, pitch: "-2%", rate: "80%" } },
        angry: { ...defaultSettings, stability: 0.6, prosody: { ...defaultSettings.prosody, rate: "95%" } }
      };

      await this.saveConfig(config);
    }
  }

  /**
   * Generate character defaults based on personality
   */
  private generateCharacterDefaults(personality: any): any {
    const defaults = {
      stability: 0.75,
      similarity_boost: 0.85,
      style: 0.5,
      prosody: {
        pitch: "0%",
        rate: "85%",
        volume: "medium"
      }
    };

    // Adjust based on personality traits
    if (personality.traits) {
      if (personality.traits.includes('authoritative') || personality.traits.includes('commanding')) {
        defaults.stability = 0.8;
        defaults.prosody.pitch = "-3%";
        defaults.prosody.volume = "loud";
      }
      if (personality.traits.includes('gentle') || personality.traits.includes('soft')) {
        defaults.similarity_boost = 0.9;
        defaults.prosody.volume = "soft";
      }
      if (personality.traits.includes('energetic') || personality.traits.includes('enthusiastic')) {
        defaults.style = 0.7;
        defaults.prosody.rate = "95%";
      }
    }

    return defaults;
  }

  /**
   * Track emotion usage patterns
   */
  private async trackEmotionPatterns(emotions: any[]): Promise<void> {
    const config = await this.getConfig();
    
    if (!config.learnedPatterns) {
      config.learnedPatterns = [];
    }

    // Analyze emotion frequency and intensity
    const emotionStats: Record<string, { count: number; avgIntensity: number }> = {};
    
    for (const emotion of emotions) {
      if (!emotionStats[emotion.emotion]) {
        emotionStats[emotion.emotion] = { count: 0, avgIntensity: 0 };
      }
      emotionStats[emotion.emotion].count++;
      emotionStats[emotion.emotion].avgIntensity += emotion.intensity || 5;
    }

    // Update weighted defaults for frequently used emotions
    for (const [emotion, stats] of Object.entries(emotionStats)) {
      stats.avgIntensity /= stats.count;
      
      // If emotion appears frequently, consider adding to weighted defaults
      if (stats.count >= 3 && !config.weightedDefaults.find(w => w.match.emotion === emotion)) {
        console.log(`[VoiceOrchestration] Adding weighted default for frequent emotion: ${emotion}`);
        
        config.weightedDefaults.push({
          match: { emotion },
          apply: this.generateEmotionDefaults(emotion, stats.avgIntensity)
        });
        
        await this.saveConfig(config);
      }
    }
  }

  /**
   * Generate emotion-based defaults
   */
  private generateEmotionDefaults(emotion: string, avgIntensity: number): any {
    const intensityFactor = avgIntensity / 10; // 0-1 scale
    
    const emotionProfiles: Record<string, any> = {
      fear: {
        "prosody.pitch.base": `-${Math.round(5 * intensityFactor)}%`,
        "prosody.rate.base": `${Math.round(75 + 10 * (1 - intensityFactor))}%`,
        "stability.mean": 0.6 + 0.2 * (1 - intensityFactor)
      },
      excitement: {
        "prosody.pitch.base": `+${Math.round(5 * intensityFactor)}%`,
        "prosody.rate.base": `${Math.round(90 + 10 * intensityFactor)}%`,
        "style.mean": 0.5 + 0.2 * intensityFactor
      },
      contemplative: {
        "prosody.rate.base": `${Math.round(80 - 5 * intensityFactor)}%`,
        "stability.mean": 0.8 + 0.1 * intensityFactor
      }
    };

    return emotionProfiles[emotion] || {
      "stability.mean": 0.75,
      "prosody.rate.base": "85%"
    };
  }

  /**
   * Update learned patterns based on usage
   */
  private async updateLearnedPatterns(
    character: string, 
    emotion: string, 
    usedStyle: VoiceStyle
  ): Promise<void> {
    const config = await this.getConfig();
    
    if (!config.learnedPatterns) {
      config.learnedPatterns = [];
    }

    // Find or create pattern entry
    let pattern = config.learnedPatterns.find(
      p => p.character === character && p.emotion === emotion
    );

    if (!pattern) {
      pattern = {
        character,
        emotion,
        stability: usedStyle.stability,
        similarityBoost: usedStyle.similarityBoost,
        style: usedStyle.style,
        usageCount: 1
      };
      config.learnedPatterns.push(pattern);
    } else {
      // Update with weighted average
      const weight = pattern.usageCount / (pattern.usageCount + 1);
      pattern.stability = pattern.stability * weight + usedStyle.stability * (1 - weight);
      pattern.similarityBoost = pattern.similarityBoost * weight + usedStyle.similarityBoost * (1 - weight);
      pattern.style = pattern.style * weight + usedStyle.style * (1 - weight);
      pattern.usageCount++;
    }

    // Save periodically (every 10 uses)
    if (pattern.usageCount % 10 === 0) {
      await this.saveConfig(config);
    }
  }

  /**
   * Build implicit user profile from their stories
   */
  async buildImplicitUserProfile(userId: string): Promise<void> {
    try {
      // Analyze user's stories to understand preferences
      const userStories = await db
        .select()
        .from(stories)
        .where(eq(stories.userId, userId))
        .limit(10); // Analyze last 10 stories

      if (userStories.length === 0) return;

      // Extract patterns from stories
      const patterns = {
        averageLength: 0,
        emotionalRange: new Set<string>(),
        characterTypes: new Set<string>(),
        genres: new Set<string>()
      };

      for (const story of userStories) {
        patterns.averageLength += story.content.length;
        
        // Get story analysis
        const [analysis] = await db
          .select()
          .from(storyAnalyses)
          .where(eq(storyAnalyses.storyId, story.id))
          .limit(1);

        if (analysis?.result) {
          const result = analysis.result as any;
          
          // Collect emotions
          if (result.emotions) {
            result.emotions.forEach((e: any) => patterns.emotionalRange.add(e.emotion));
          }
          
          // Collect character types
          if (result.characters) {
            result.characters.forEach((c: any) => {
              if (c.personality?.traits) {
                c.personality.traits.forEach((t: string) => patterns.characterTypes.add(t));
              }
            });
          }
        }
      }

      patterns.averageLength /= userStories.length;

      // Update user profile based on patterns
      await this.updateUserProfileFromPatterns(userId, patterns);
      
    } catch (error) {
      console.error('[VoiceOrchestration] Error building implicit profile', error);
    }
  }

  /**
   * Update user profile based on detected patterns
   */
  private async updateUserProfileFromPatterns(userId: string, patterns: any): Promise<void> {
    // Determine voice preferences from patterns
    const updates: any = {};

    // Longer stories might prefer more stable narration
    if (patterns.averageLength > 5000) {
      updates.stability = 0.8;
    }

    // Emotional diversity suggests dynamic voice preferences
    if (patterns.emotionalRange.size > 5) {
      updates.style = 0.7;
      updates.similarityBoost = 0.9;
    }

    // Character traits influence voice settings
    if (patterns.characterTypes.has('mysterious') || patterns.characterTypes.has('dark')) {
      updates.pitch = "-3%";
    }
    if (patterns.characterTypes.has('cheerful') || patterns.characterTypes.has('optimistic')) {
      updates.pitch = "+2%";
      updates.rate = "90%";
    }

    // Update profile if we have insights
    if (Object.keys(updates).length > 0) {
      await db
        .update(userVoiceProfiles)
        .set(updates)
        .where(eq(userVoiceProfiles.userId, userId));
      
      console.log(`[VoiceOrchestration] Updated user profile based on story patterns`);
    }
  }

  /**
   * Enhance text with sound effects based on patterns - matches your JS logic exactly
   */
  async enhanceWithSounds(text: string): Promise<string> {
    const patterns = await this.getSoundPatterns();
    let enriched = text;
    
    for (const p of patterns) {
      try {
        const regex = new RegExp(p.pattern, 'i');
        if (regex.test(enriched)) {
          enriched += ` ${p.insert}`;
        }
      } catch (error) {
        console.error(`[VoiceOrchestration] Invalid regex pattern: ${p.pattern}`, error);
      }
    }
    
    return enriched;
  }

  /**
   * Build SSML (Speech Synthesis Markup Language) for text with prosody settings
   */
  buildSSML(text: string, prosody: VoiceStyle['prosody']): string {
    return `<speak><prosody pitch='${prosody.pitch}' rate='${prosody.rate}' volume='${prosody.volume}'>${text}</prosody></speak>`;
  }

  /**
   * Get voice parameters with SSML formatting
   */
  async getVoiceParametersWithSSML(
    userId: string,
    text: string,
    character: string = 'Narrator',
    emotion: string = 'neutral',
    storyId?: number,
    conversationType?: string,
    narratorProfile?: NarratorProfile
  ): Promise<{ voiceSettings: VoiceStyle; ssml: string; voiceId?: string }> {
    const voiceSettings = await this.calculateVoiceParameters(
      userId,
      text,
      character,
      emotion,
      storyId,
      conversationType,
      narratorProfile
    );

    const ssml = this.buildSSML(text, voiceSettings.prosody);

    return {
      voiceSettings,
      ssml,
      voiceId: narratorProfile?.voice_id
    };
  }
}

// Export singleton instance
export const voiceOrchestrationService = new VoiceOrchestrationService();