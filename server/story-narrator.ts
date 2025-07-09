import { audioService } from './audio-service';
import type { NarratorProfile } from './audio-service';
import { storage } from './storage';
import { userContentStorage } from './user-content-storage';
import { voiceOrchestrationService } from './voice-orchestration-service';

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
   * Get user's language preference and narrator profile from database
   */
  private async getUserLanguage(userId: string): Promise<string> {
    try {
      const user = await storage.getUser(userId);
      return user?.language || 'en';
    } catch (error) {
      console.error('Error fetching user language:', error);
      return 'en';
    }
  }

  /**
   * Get user's narrator profile with language, locale, and native language
   */
  private async getUserNarratorProfile(userId: string): Promise<NarratorProfile> {
    try {
      const languageData = await storage.getUserLanguage(userId);
      return {
        language: languageData?.language || 'en',
        locale: languageData?.locale,
        nativeLanguage: languageData?.nativeLanguage
      };
    } catch (error) {
      console.error('Error fetching user narrator profile:', error);
      return { language: 'en' };
    }
  }
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
    
    // Get user language preference
    const userLanguage = await this.getUserLanguage(userId);

    // STRATEGIC FIX: Always fetch current narrator voice from ESM tables
    // ESM tables are the single source of truth - no caching at story level
    const voiceSelection = await this.selectNarratorVoice(userId, story);
    
    // If no ElevenLabs voice exists, cannot generate narration
    if (!voiceSelection) {
      throw new Error('No ElevenLabs narrator voice found. Please generate your narrator voice first.');
    }
    
    const narratorVoice = voiceSelection.voice;
    const narratorVoiceType = voiceSelection.type;
    
    console.log(`[StoryNarrator] Using narrator voice from ESM tables: ${narratorVoice} (type: ${narratorVoiceType})`);
    // DO NOT store at story level - always fetch fresh from ESM

    // Extract emotions from story analysis
    const extractedEmotions = story.extractedEmotions || [];
    
    // Get user's narrator profile for voice generation
    const narratorProfile = await this.getUserNarratorProfile(userId);
    
    // 4. Narrate story content with the determined narrator voice
    const segments = await this.createNarrationSegments(
      story.content, 
      narratorVoice, 
      narratorVoiceType, 
      userId, 
      storyId,
      extractedEmotions,
      userLanguage,
      narratorProfile
    );
    
    const totalDuration = segments.reduce((sum, segment) => sum + (segment.duration || 0), 0);

    // 5. Save narration to database for future access
    const narrationResult = {
      storyId,
      segments,
      totalDuration,
      narratorVoice,
      narratorVoiceType,
      generatedAt: new Date()
    };
    
    await this.saveNarrationToDatabase(narrationResult, userId);

    return narrationResult;
  }

  /**
   * Select narrator voice based on priority: ElevenLabs narrator voice -> user samples -> AI voice
   */
  private async selectNarratorVoice(userId: string, story: any): Promise<{ voice: string; type: 'ai' | 'user' }> {
    
    // PRIORITY 1: Check for ElevenLabs trained narrator voice (USER IS THE NARRATOR)
    try {
      const narratorVoiceId = await storage.getUserNarratorVoice(userId);
      console.log(`[StoryNarrator] getUserNarratorVoice returned: ${narratorVoiceId}`);
      if (narratorVoiceId) {
        console.log(`[StoryNarrator] Using USER'S ElevenLabs narrator voice: ${narratorVoiceId}`);
        return { voice: narratorVoiceId, type: 'user' };
      }
    } catch (error) {
      console.log('[StoryNarrator] Error getting narrator voice:', error);
      console.log('[StoryNarrator] No ElevenLabs narrator voice found, checking user voice samples');
    }

    // PRIORITY 2: Check if user has any voice samples (narrator or emotion)
    try {
      const userVoices = await storage.getUserVoiceSamples(userId);
      if (userVoices && userVoices.length > 0) {
        // Prefer narrator-type voices, fallback to any emotion voice
        const narratorVoice = userVoices.find(v => v.sampleType === 'narrator' || v.label === 'narrator');
        if (narratorVoice && narratorVoice.audioUrl) {
          // User has recorded narrator voice - use it directly for authentic custom voice
          return { voice: narratorVoice.audioUrl, type: 'user' };
        }
        
        // Use first available emotion voice as narrator base
        const emotionVoice = userVoices.find(v => v.sampleType === 'emotion' && v.audioUrl);
        if (emotionVoice && emotionVoice.audioUrl) {
          // User has emotion voice recording - use it for narration
          return { voice: emotionVoice.audioUrl, type: 'user' };
        }
      }
    } catch (error) {
      console.log('[StoryNarrator] No user voice samples found');
    }

    // NO FALLBACK - If no ElevenLabs voice exists, return null
    console.log(`[StoryNarrator] No ElevenLabs narrator voice found - narration cannot be generated`);
    return null;
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
   * @deprecated - No longer storing voice at story level
   * ESM tables are the single source of truth for narrator voice
   */
  private async storeNarratorVoice(storyId: number, voice: string, voiceType: 'ai' | 'user'): Promise<void> {
    // DO NOT STORE - ESM tables are single source of truth
    console.log(`[StoryNarrator] Skipping story-level voice storage - using ESM tables`);
  }

  /**
   * Create narration segments from story content using single narrator voice
   */
  private async createNarrationSegments(
    storyContent: string,
    narratorVoice: string,
    narratorVoiceType: 'ai' | 'user',
    userId: string,
    storyId: number,
    extractedEmotions: any[],
    userLanguage: string,
    narratorProfile: NarratorProfile
  ): Promise<NarrationSegment[]> {
    
    // Split content into manageable chunks for narration
    const chunks = this.splitIntoChunks(storyContent, 500); // 500 character chunks
    const segments: NarrationSegment[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Detect emotion and character for this chunk
        const chunkContext = this.detectChunkContext(chunk, extractedEmotions, []);
        
        // Get orchestrated voice parameters
        const voiceSettings = await voiceOrchestrationService.calculateVoiceParameters(
          userId,
          chunk,
          chunkContext.character,
          chunkContext.emotion,
          storyId
        );
        
        // Add voice settings to narrator profile
        const enhancedNarratorProfile = {
          ...narratorProfile,
          voiceSettings
        };
        
        // Generate audio using the determined narrator voice with orchestrated settings
        const audioResult = await this.generateNarrationAudio(
          chunk, 
          narratorVoice, 
          narratorVoiceType, 
          userId, 
          storyId, 
          i,
          chunkContext,
          userLanguage,
          enhancedNarratorProfile
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
   * Detect emotion and character for a text chunk based on story analysis
   */
  private detectChunkContext(chunk: string, extractedEmotions: any[], extractedCharacters: any[]): { 
    emotion: string; 
    intensity: number; 
    character: string;
  } {
    let emotion = 'neutral';
    let intensity = 5;
    let character = 'Narrator';
    
    const chunkLower = chunk.toLowerCase();
    
    // Detect emotion from analysis
    if (extractedEmotions && extractedEmotions.length > 0) {
      for (const emotionData of extractedEmotions) {
        if (emotionData.quote && chunkLower.includes(emotionData.quote.toLowerCase())) {
          emotion = emotionData.emotion || 'neutral';
          intensity = emotionData.intensity || 5;
          break;
        }
        if (emotionData.context && chunkLower.includes(emotionData.context.toLowerCase())) {
          emotion = emotionData.emotion || 'neutral';
          intensity = emotionData.intensity || 5;
          break;
        }
      }
    }
    
    // Detect character from analysis
    if (extractedCharacters && extractedCharacters.length > 0) {
      for (const charData of extractedCharacters) {
        if (charData.name && chunk.includes(charData.name)) {
          character = charData.name;
          break;
        }
        // Check if chunk contains dialogue patterns
        if (charData.dialogues && Array.isArray(charData.dialogues)) {
          for (const dialogue of charData.dialogues) {
            if (chunkLower.includes(dialogue.toLowerCase())) {
              character = charData.name;
              break;
            }
          }
        }
      }
    }
    
    return { emotion, intensity, character };
  }

  /**
   * Generate audio for narration segment using narrator voice
   * PRIORITY: ElevenLabs narrator voice → User samples → AI voice
   */
  private async generateNarrationAudio(
    text: string,
    narratorVoice: string,
    narratorVoiceType: 'ai' | 'user',
    userId: string,
    storyId: number,
    segmentIndex: number,
    chunkContext: { emotion: string; intensity: number; character: string },
    userLanguage: string,
    narratorProfile: NarratorProfile
  ): Promise<{ audioUrl: string; duration?: number }> {
    
    let audioBuffer: Buffer;
    
    if (narratorVoiceType === 'user' && narratorVoice.length === 20) {
      // ElevenLabs voice trained on all emotions - pass actual emotion for modulation
      console.log(`[StoryNarrator] Generating narration segment ${segmentIndex} using ElevenLabs voice: ${narratorVoice} with character: ${chunkContext.character}, emotion: ${chunkContext.emotion}, intensity: ${chunkContext.intensity}`);
      
      try {
        const { VoiceProviderFactory } = await import('./voice-providers/voice-provider-factory');
        const arrayBuffer = await VoiceProviderFactory.generateSpeech(text, narratorVoice, chunkContext.emotion, undefined, narratorProfile);
        audioBuffer = Buffer.from(arrayBuffer);
        
        console.log(`[StoryNarrator] ElevenLabs narration generated: ${audioBuffer.length} bytes with ${chunkContext.emotion} emotion`);
        
      } catch (error) {
        console.error(`[StoryNarrator] ElevenLabs generation failed, falling back to audio service:`, error);
        // Fallback to audio service if ElevenLabs fails - pass emotion here too
        const { buffer } = await audioService.getAudioBuffer({
          text,
          emotion: chunkContext.emotion, // Pass actual emotion for fallback
          intensity: chunkContext.intensity,
          voice: narratorVoice,
          userId,
          storyId,
          narratorProfile
        });
        audioBuffer = buffer;
      }
    } else {
      // Use audio service for AI voices - pass actual emotions for OpenAI modulation
      console.log(`[StoryNarrator] Generating narration with OpenAI voice, character: ${chunkContext.character}, emotion: ${chunkContext.emotion}, intensity: ${chunkContext.intensity}, language: ${userLanguage}`);
      
      const { buffer } = await audioService.getAudioBuffer({
        text,
        emotion: chunkContext.emotion, // Use detected emotion for OpenAI voices
        intensity: chunkContext.intensity,
        voice: narratorVoice,
        userId,
        storyId,
        narratorProfile
      });
      audioBuffer = buffer;
    }
    
    // Store audio in story-specific directory structure
    const localAudioUrl = await this.storeNarrationAudio(audioBuffer, storyId, segmentIndex, userId);
    
    return {
      audioUrl: localAudioUrl,
      duration: Math.ceil(text.length * 60) // Rough estimate: 60ms per character
    };
  }

  /**
   * Store narration audio buffer using new story audio directory structure
   * Returns local URL for serving
   */
  private async storeNarrationAudio(
    buffer: Buffer, 
    storyId: number, 
    segmentIndex: number, 
    userId: string
  ): Promise<string> {
    
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Create directory structure: /stories/audio/private/{userId}/{storyId}/
    const storyAudioDir = path.join('./stories/audio/private', userId, storyId.toString());
    await fs.mkdir(storyAudioDir, { recursive: true });
    
    // Store segment file: segment-{index}.mp3
    const fileName = `segment-${segmentIndex}.mp3`;
    const filePath = path.join(storyAudioDir, fileName);
    
    await fs.writeFile(filePath, buffer);
    
    // Return URL for serving: /api/stories/audio/private/{userId}/{storyId}/segment-{index}.mp3
    const publicUrl = `/api/stories/audio/private/${userId}/${storyId}/${fileName}`;
    
    console.log(`[StoryNarrator] Stored narration segment: ${filePath} (${buffer.length} bytes)`);
    
    return publicUrl;
  }

  /**
   * Save narration to database for future access and replay
   */
  private async saveNarrationToDatabase(narrationResult: StoryNarrationResult, userId: string): Promise<void> {
    const { storage } = await import('./storage');

    try {
      await storage.saveNarration({
        storyId: narrationResult.storyId,
        userId,
        narratorVoice: narrationResult.narratorVoice,
        narratorVoiceType: narrationResult.narratorVoiceType,
        segments: narrationResult.segments,
        totalDuration: narrationResult.totalDuration
      });
      
      console.log(`Saved narration to database: Story ${narrationResult.storyId}, ${narrationResult.segments.length} segments, ${narrationResult.totalDuration}ms total`);
    } catch (error) {
      console.error('Failed to save narration to database:', error);
      // Don't throw error - narration generation still worked
    }
  }


}

export const storyNarrator = new StoryNarrator();