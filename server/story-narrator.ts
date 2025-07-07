import { audioService } from './audio-service';
import { storage } from './storage';
import { userContentStorage } from './user-content-storage';

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
    
    // PRIORITY 1: Check for ElevenLabs trained narrator voice from ESM recordings
    try {
      const esmRecordings = await storage.getUserEsmRecordings(userId);
      if (esmRecordings && esmRecordings.length > 0) {
        // Find any ESM recording with narrator_voice_id (MVP1 design stores same ID in all recordings)
        const recordingWithNarratorVoice = esmRecordings.find(r => r.narrator_voice_id);
        if (recordingWithNarratorVoice && recordingWithNarratorVoice.narrator_voice_id) {
          console.log(`[StoryNarrator] Using ElevenLabs narrator voice: ${recordingWithNarratorVoice.narrator_voice_id}`);
          return { voice: recordingWithNarratorVoice.narrator_voice_id, type: 'user' };
        }
      }
    } catch (error) {
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
      console.log('[StoryNarrator] No user voice samples found, using AI voice');
    }

    // PRIORITY 3: Final fallback to analysis-based AI voice (from story's existing analysis)
    const analysisVoice = this.getAnalysisVoice(story);
    console.log(`[StoryNarrator] Using AI voice fallback: ${analysisVoice}`);
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
   * PRIORITY: ElevenLabs narrator voice → User samples → AI voice
   */
  private async generateNarrationAudio(
    text: string,
    narratorVoice: string,
    narratorVoiceType: 'ai' | 'user',
    userId: string,
    storyId: number,
    segmentIndex: number
  ): Promise<{ audioUrl: string; duration?: number }> {
    
    let audioBuffer: Buffer;
    
    if (narratorVoiceType === 'user' && narratorVoice.length === 20) {
      // ElevenLabs voice ID is exactly 20 characters - use ElevenLabs directly
      console.log(`[StoryNarrator] Generating narration segment ${segmentIndex} using ElevenLabs voice: ${narratorVoice}`);
      
      try {
        const { VoiceProviderFactory } = await import('./voice-providers/voice-provider-factory');
        const arrayBuffer = await VoiceProviderFactory.generateSpeech(text, narratorVoice, 'neutral');
        audioBuffer = Buffer.from(arrayBuffer);
        
        console.log(`[StoryNarrator] ElevenLabs narration generated: ${audioBuffer.length} bytes`);
        
      } catch (error) {
        console.error(`[StoryNarrator] ElevenLabs generation failed, falling back to audio service:`, error);
        // Fallback to audio service if ElevenLabs fails
        const { buffer } = await audioService.getAudioBuffer({
          text,
          emotion: 'neutral',
          intensity: 5,
          voice: narratorVoice,
          userId,
          storyId
        });
        audioBuffer = buffer;
      }
    } else {
      // Use audio service for user samples or AI voices
      const { buffer } = await audioService.getAudioBuffer({
        text,
        emotion: 'neutral',
        intensity: 5,
        voice: narratorVoice,
        userId,
        storyId
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