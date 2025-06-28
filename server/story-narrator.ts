import { audioService } from './audio-service';
import { storage } from './storage';

export interface NarrationSegment {
  text: string;
  emotion: string;
  intensity: number;
  audioUrl?: string;
  duration?: number;
  startTime: number; // Position in story where this segment starts
  endTime: number;   // Position in story where this segment ends
}

export interface StoryNarrationResult {
  storyId: number;
  segments: NarrationSegment[];
  totalDuration: number;
  hasUserVoices: boolean;
  generatedAt: Date;
}

export class StoryNarrator {
  /**
   * Generate complete story narration using user voice samples
   */
  async generateStoryNarration(
    storyId: number, 
    userId: string, 
    storyContent: string, 
    emotions: Array<{ emotion: string; intensity: number; context: string; quote?: string }>
  ): Promise<StoryNarrationResult> {
    
    // Split story into narrative segments based on emotional context
    const segments = await this.createNarrationSegments(storyContent, emotions);
    
    // Generate audio for each segment using user voice samples
    const audioSegments: NarrationSegment[] = [];
    let totalDuration = 0;
    let hasUserVoices = false;

    for (const segment of segments) {
      try {
        // Generate audio using user's voice for the detected emotion
        const audioResult = await audioService.generateEmotionAudio({
          text: segment.text,
          emotion: segment.emotion,
          intensity: segment.intensity,
          userId,
          storyId
        });

        const audioSegment: NarrationSegment = {
          ...segment,
          audioUrl: audioResult.audioUrl,
          duration: await this.getAudioDuration(audioResult.audioUrl)
        };

        if (audioResult.isUserGenerated) {
          hasUserVoices = true;
        }

        audioSegments.push(audioSegment);
        totalDuration += audioSegment.duration || 0;

      } catch (error) {
        console.error(`Failed to generate audio for segment: ${segment.text.substring(0, 50)}...`, error);
        // Add segment without audio as fallback
        audioSegments.push(segment);
      }
    }

    return {
      storyId,
      segments: audioSegments,
      totalDuration,
      hasUserVoices,
      generatedAt: new Date()
    };
  }

  /**
   * Create narrative segments from story content based on emotional analysis
   */
  private async createNarrationSegments(
    storyContent: string, 
    emotions: Array<{ emotion: string; intensity: number; context: string; quote?: string }>
  ): Promise<NarrationSegment[]> {
    
    // Split content into sentences for better narration flow
    const sentences = storyContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const segments: NarrationSegment[] = [];
    
    let currentPosition = 0;
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length === 0) continue;

      // Find the most relevant emotion for this sentence
      const relevantEmotion = this.findRelevantEmotion(trimmedSentence, emotions);
      
      const startTime = currentPosition;
      const endTime = currentPosition + trimmedSentence.length;
      
      segments.push({
        text: trimmedSentence,
        emotion: relevantEmotion.emotion,
        intensity: relevantEmotion.intensity,
        startTime,
        endTime
      });
      
      currentPosition = endTime;
    }

    return segments;
  }

  /**
   * Find the most relevant emotion for a text segment
   */
  private findRelevantEmotion(
    text: string, 
    emotions: Array<{ emotion: string; intensity: number; context: string; quote?: string }>
  ): { emotion: string; intensity: number } {
    
    // Try to find emotion by matching context or quote
    for (const emotion of emotions) {
      if (emotion.quote && text.includes(emotion.quote)) {
        return { emotion: emotion.emotion, intensity: emotion.intensity };
      }
      if (emotion.context && text.toLowerCase().includes(emotion.context.toLowerCase())) {
        return { emotion: emotion.emotion, intensity: emotion.intensity };
      }
    }

    // Default to the first emotion or neutral
    return emotions.length > 0 
      ? { emotion: emotions[0].emotion, intensity: emotions[0].intensity }
      : { emotion: 'neutral', intensity: 3 };
  }

  /**
   * Get audio duration from URL (estimate if needed)
   */
  private async getAudioDuration(audioUrl: string): Promise<number> {
    try {
      // For now, estimate duration based on text length
      // In a real implementation, you'd load the audio and get actual duration
      return 3; // Default 3 seconds per segment
    } catch (error) {
      return 3; // Fallback duration
    }
  }

  /**
   * Check if user has recorded voices for story emotions
   */
  async hasUserVoicesForStory(userId: string, emotions: string[]): Promise<boolean> {
    try {
      // Check if user has recorded any of the required emotions
      for (const emotion of emotions) {
        const userVoices = await storage.getUserVoiceEmotions?.(userId, emotion);
        if (userVoices && userVoices.length > 0) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking user voices:', error);
      return false;
    }
  }

  /**
   * Get narration preview info without generating full audio
   */
  async getNarrationPreview(
    storyId: number,
    userId: string,
    emotions: Array<{ emotion: string; intensity: number; context: string }>
  ): Promise<{
    segmentCount: number;
    estimatedDuration: number;
    availableUserEmotions: string[];
    missingUserEmotions: string[];
    canNarrate: boolean;
  }> {
    
    const uniqueEmotions = [...new Set(emotions.map(e => e.emotion))];
    const availableUserEmotions: string[] = [];
    const missingUserEmotions: string[] = [];

    // Check which emotions user has recorded
    for (const emotion of uniqueEmotions) {
      try {
        const userVoices = await storage.getUserVoiceEmotions?.(userId, emotion);
        if (userVoices && userVoices.length > 0) {
          availableUserEmotions.push(emotion);
        } else {
          missingUserEmotions.push(emotion);
        }
      } catch (error) {
        missingUserEmotions.push(emotion);
      }
    }

    const segmentCount = emotions.length;
    const estimatedDuration = segmentCount * 3; // 3 seconds per segment estimate
    const canNarrate = availableUserEmotions.length > 0;

    return {
      segmentCount,
      estimatedDuration,
      availableUserEmotions,
      missingUserEmotions,
      canNarrate
    };
  }
}

export const storyNarrator = new StoryNarrator();