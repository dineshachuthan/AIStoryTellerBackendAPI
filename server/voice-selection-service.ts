import { storage } from './storage';
import { voiceTrainingService } from './voice-training-service';
// ELIMINATED LEGACY VOICE CONFIG - Voice emotions now come from ESM database

export interface VoiceMapping {
  text: string;
  emotion: string;
  character?: string;
  voiceId: string;
  isUserVoice: boolean;
  fallbackEmotion?: string;
  confidence: number;
}

export interface StorySegment {
  text: string;
  emotion: string;
  character?: string;
  sceneIndex: number;
  dialogueIndex: number;
}

export class VoiceSelectionService {
  
  /**
   * Create voice mapping for story segments with intelligent selection
   */
  async createVoiceMapping(
    userId: string, 
    segments: StorySegment[]
  ): Promise<VoiceMapping[]> {
    // Get user's available voices
    const userVoices = await this.getUserAvailableVoices(userId);
    
    const mappings: VoiceMapping[] = [];
    
    for (const segment of segments) {
      const mapping = await this.selectVoiceForSegment(userId, segment, userVoices);
      mappings.push(mapping);
    }
    
    return mappings;
  }

  /**
   * Get user's available voice clones and emotions
   */
  async getUserAvailableVoices(userId: string): Promise<{
    clonedVoices: { [emotion: string]: string };
    availableEmotions: string[];
    hasVoiceClone: boolean;
  }> {
    try {
      // Get voice training status
      const trainingStatus = await voiceTrainingService.getTrainingStatus(userId);
      
      if (!trainingStatus.hasVoiceClone || !trainingStatus.voiceCloneId) {
        return {
          clonedVoices: {},
          availableEmotions: [],
          hasVoiceClone: false
        };
      }

      // Get user's recorded emotions
      const samples = await storage.getAllUserVoiceSamples(userId);
      const recordedEmotions = samples
        .filter(s => s.isCompleted)
        .map(s => s.label);

      // Create voice mapping for each emotion
      const clonedVoices: { [emotion: string]: string } = {};
      for (const emotion of recordedEmotions) {
        clonedVoices[emotion] = trainingStatus.voiceCloneId;
      }

      return {
        clonedVoices,
        availableEmotions: recordedEmotions,
        hasVoiceClone: true
      };
    } catch (error) {
      console.error('Error getting user available voices:', error);
      return {
        clonedVoices: {},
        availableEmotions: [],
        hasVoiceClone: false
      };
    }
  }

  /**
   * Select best voice for a specific segment
   */
  async selectVoiceForSegment(
    userId: string,
    segment: StorySegment,
    userVoices: { clonedVoices: { [emotion: string]: string }; availableEmotions: string[]; hasVoiceClone: boolean }
  ): Promise<VoiceMapping> {
    // Priority 1: Exact emotion match with user's voice
    if (userVoices.clonedVoices[segment.emotion]) {
      return {
        text: segment.text,
        emotion: segment.emotion,
        character: segment.character,
        voiceId: userVoices.clonedVoices[segment.emotion],
        isUserVoice: true,
        confidence: 1.0
      };
    }

    // Priority 2: Similar emotion with user's voice
    const similarEmotion = this.findSimilarEmotion(segment.emotion, userVoices.availableEmotions);
    if (similarEmotion && userVoices.clonedVoices[similarEmotion]) {
      return {
        text: segment.text,
        emotion: segment.emotion,
        character: segment.character,
        voiceId: userVoices.clonedVoices[similarEmotion],
        isUserVoice: true,
        fallbackEmotion: similarEmotion,
        confidence: 0.8
      };
    }

    // Priority 3: Any user voice as fallback (use neutral/calm if available)
    const fallbackUserEmotion = this.getBestFallbackEmotion(userVoices.availableEmotions);
    if (fallbackUserEmotion && userVoices.clonedVoices[fallbackUserEmotion]) {
      return {
        text: segment.text,
        emotion: segment.emotion,
        character: segment.character,
        voiceId: userVoices.clonedVoices[fallbackUserEmotion],
        isUserVoice: true,
        fallbackEmotion: fallbackUserEmotion,
        confidence: 0.6
      };
    }

    // Priority 4: Never fall back to hardcoded voices - return error
    throw new Error(`No user voice available for emotion "${segment.emotion}". Please record more voice samples.`);
  }

  /**
   * Find similar emotion based on emotional categories
   */
  private findSimilarEmotion(targetEmotion: string, availableEmotions: string[]): string | null {
    // Get emotion categories from voice config
    const targetEmotionConfig = VOICE_EMOTIONS.find(e => e.emotion === targetEmotion);
    if (!targetEmotionConfig) return null;

    // Find emotions in the same category
    const sameCategory = VOICE_EMOTIONS.filter(e => 
      e.category === targetEmotionConfig.category && 
      availableEmotions.includes(e.emotion)
    );

    if (sameCategory.length > 0) {
      // Return the first match in same category
      return sameCategory[0].emotion;
    }

    // Find emotions with similar intensity
    const similarIntensity = VOICE_EMOTIONS.filter(e => 
      Math.abs(e.intensity - targetEmotionConfig.intensity) <= 1 &&
      availableEmotions.includes(e.emotion)
    );

    return similarIntensity.length > 0 ? similarIntensity[0].emotion : null;
  }

  /**
   * Get the best fallback emotion from available options
   */
  private getBestFallbackEmotion(availableEmotions: string[]): string | null {
    // Preferred fallback order
    const fallbackOrder = ['neutral', 'calm', 'happy', 'confident', 'thoughtful'];
    
    for (const preferred of fallbackOrder) {
      if (availableEmotions.includes(preferred)) {
        return preferred;
      }
    }
    
    // Return any available emotion as last resort
    return availableEmotions.length > 0 ? availableEmotions[0] : null;
  }

  /**
   * Extract emotion-character mapping from story analysis
   */
  async extractEmotionMapping(storyAnalysis: any): Promise<{
    [character: string]: { [emotion: string]: string[] }
  }> {
    const mapping: { [character: string]: { [emotion: string]: string[] } } = {};
    
    if (!storyAnalysis.scenes) return mapping;
    
    for (const scene of storyAnalysis.scenes) {
      if (!scene.dialogue) continue;
      
      for (const line of scene.dialogue) {
        const character = line.character || 'narrator';
        const emotion = line.emotion || 'neutral';
        const text = line.text || '';
        
        if (!mapping[character]) {
          mapping[character] = {};
        }
        
        if (!mapping[character][emotion]) {
          mapping[character][emotion] = [];
        }
        
        mapping[character][emotion].push(text);
      }
    }
    
    return mapping;
  }

  /**
   * Get voice selection statistics for user
   */
  async getVoiceSelectionStats(userId: string): Promise<{
    totalEmotionsInConfig: number;
    userRecordedEmotions: number;
    coveragePercentage: number;
    missingEmotions: string[];
    readyForNarration: boolean;
  }> {
    try {
      const userVoices = await this.getUserAvailableVoices(userId);
      const totalEmotions = VOICE_EMOTIONS.length;
      const recordedCount = userVoices.availableEmotions.length;
      
      const missingEmotions = VOICE_EMOTIONS
        .filter(e => !userVoices.availableEmotions.includes(e.emotion))
        .map(e => e.emotion);
      
      return {
        totalEmotionsInConfig: totalEmotions,
        userRecordedEmotions: recordedCount,
        coveragePercentage: Math.round((recordedCount / totalEmotions) * 100),
        missingEmotions,
        readyForNarration: userVoices.hasVoiceClone && recordedCount >= 3 // Minimum 3 emotions for basic narration
      };
    } catch (error) {
      console.error('Error getting voice selection stats:', error);
      return {
        totalEmotionsInConfig: VOICE_EMOTIONS.length,
        userRecordedEmotions: 0,
        coveragePercentage: 0,
        missingEmotions: VOICE_EMOTIONS.map(e => e.emotion),
        readyForNarration: false
      };
    }
  }
}

export const voiceSelectionService = new VoiceSelectionService();