import { audioService } from './audio-service';
import { storage } from './storage';

export interface NarrationSegment {
  text: string;
  audioUrl?: string;
  duration?: number;
}

export interface StoryNarrationResult {
  storyId: number;
  segments: NarrationSegment[];
  totalDuration: number;
  narratorVoice: string;
  narratorVoiceType: 'ai' | 'user';
  generatedAt: Date;
}

export class StoryNarrator {
  /**
   * Generate complete story narration using stored narrator voice
   * REQUIREMENTS:
   * 1. Pull story metadata from database
   * 2. Check for user narrator voice, fallback to emotion voices, then AI voice
   * 3. Store narrator voice at story level
   * 4. Narrate with stored narrator voice
   * 5. NO new OpenAI analysis during narration
   */
  async generateStoryNarration(storyId: number, userId: string): Promise<StoryNarrationResult> {
    
    // 1. Pull story metadata from database
    const story = await storage.getStory(storyId);
    if (!story) {
      throw new Error(`Story with ID ${storyId} not found`);
    }

    // 2. Check if narrator voice is already stored at story level
    let narratorVoice = story.narratorVoice;
    let narratorVoiceType = story.narratorVoiceType as 'ai' | 'user';
    
    if (!narratorVoice) {
      // Determine narrator voice using priority: user narrator -> emotion voices -> AI voice
      const voiceSelection = await this.selectNarratorVoice(userId, story);
      narratorVoice = voiceSelection.voice;
      narratorVoiceType = voiceSelection.type;
      
      // 3. Store narrator voice at story level
      await this.storeNarratorVoice(storyId, narratorVoice, narratorVoiceType);
    }

    // 4. Narrate story content with the determined narrator voice
    const segments = await this.createNarrationSegments(story.content, narratorVoice, narratorVoiceType, userId, storyId);
    
    const totalDuration = segments.reduce((sum, segment) => sum + (segment.duration || 0), 0);

    return {
      storyId,
      segments,
      totalDuration,
      narratorVoice,
      narratorVoiceType,
      generatedAt: new Date()
    };
  }

  /**
   * Select narrator voice based on priority: user narrator -> emotion voices -> AI voice
   */
  private async selectNarratorVoice(userId: string, story: any): Promise<{ voice: string; type: 'ai' | 'user' }> {
    
    // Check if user has any voice samples (narrator or emotion)
    try {
      const userVoices = await storage.getUserVoiceSamples(userId);
      if (userVoices && userVoices.length > 0) {
        // Prefer narrator-type voices, fallback to any emotion voice
        const narratorVoice = userVoices.find(v => v.sampleType === 'narrator' || v.label === 'narrator');
        if (narratorVoice) {
          return { voice: narratorVoice.id.toString(), type: 'user' };
        }
        
        // Use first available emotion voice as narrator base
        const emotionVoice = userVoices.find(v => v.sampleType === 'emotion');
        if (emotionVoice) {
          return { voice: emotionVoice.id.toString(), type: 'user' };
        }
      }
    } catch (error) {
      console.log('No user voices found, using AI voice');
    }

    // Final fallback to analysis-based AI voice (from story's existing analysis)
    const analysisVoice = this.getAnalysisVoice(story);
    return { voice: analysisVoice, type: 'ai' };
  }

  /**
   * Get AI voice from story analysis (no new analysis calls)
   */
  private getAnalysisVoice(story: any): string {
    try {
      // Use existing extracted characters to find assigned voice
      if (story.extractedCharacters && Array.isArray(story.extractedCharacters)) {
        for (const character of story.extractedCharacters) {
          if (character.assignedVoice) {
            return character.assignedVoice;
          }
        }
      }
      
      // Default AI voice if no analysis available
      return 'alloy';
    } catch (error) {
      return 'alloy';
    }
  }

  /**
   * Store narrator voice at story level in database
   */
  private async storeNarratorVoice(storyId: number, voice: string, voiceType: 'ai' | 'user'): Promise<void> {
    try {
      await storage.updateStory(storyId, {
        narratorVoice: voice,
        narratorVoiceType: voiceType
      });
    } catch (error) {
      console.error('Failed to store narrator voice:', error);
      throw error;
    }
  }

  /**
   * Create narration segments from story content using single narrator voice
   */
  private async createNarrationSegments(
    storyContent: string,
    narratorVoice: string,
    narratorVoiceType: 'ai' | 'user',
    userId: string,
    storyId: number
  ): Promise<NarrationSegment[]> {
    
    // Split content into manageable chunks for narration
    const chunks = this.splitIntoChunks(storyContent, 500); // 500 character chunks
    const segments: NarrationSegment[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Generate audio using the determined narrator voice
        const audioResult = await this.generateNarrationAudio(
          chunk, 
          narratorVoice, 
          narratorVoiceType, 
          userId, 
          storyId, 
          i
        );

        segments.push({
          text: chunk,
          audioUrl: audioResult.audioUrl,
          duration: audioResult.duration || 3000 // 3 seconds default
        });

      } catch (error) {
        console.error(`Failed to generate audio for segment ${i}:`, error);
        // Add text-only segment as fallback
        segments.push({
          text: chunk
        });
      }
    }

    return segments;
  }

  /**
   * Split text into narration chunks
   */
  private splitIntoChunks(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length === 0) continue;
      
      if (currentChunk.length + trimmedSentence.length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Generate audio for narration segment using narrator voice
   */
  private async generateNarrationAudio(
    text: string,
    narratorVoice: string,
    narratorVoiceType: 'ai' | 'user',
    userId: string,
    storyId: number,
    segmentIndex: number
  ): Promise<{ audioUrl: string; duration?: number }> {
    
    if (narratorVoiceType === 'user') {
      // Use user voice sample for generation
      const audioResult = await audioService.generateEmotionAudio({
        text,
        emotion: 'neutral', // Neutral emotion for narration
        intensity: 5, // Medium intensity
        userId,
        storyId,
        voice: narratorVoice
      });
      
      return {
        audioUrl: audioResult.audioUrl,
        duration: 3000 // Estimate, could be calculated from actual audio
      };
      
    } else {
      // Use AI voice for generation
      const audioResult = await audioService.generateEmotionAudio({
        text,
        emotion: 'neutral',
        intensity: 5,
        voice: narratorVoice, // AI voice name (alloy, echo, etc.)
        userId,
        storyId
      });
      
      return {
        audioUrl: audioResult.audioUrl,
        duration: 3000
      };
    }
  }


}

export const storyNarrator = new StoryNarrator();