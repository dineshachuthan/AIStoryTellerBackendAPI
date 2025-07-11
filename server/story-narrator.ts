import { audioService } from './audio-service';
import type { NarratorProfile } from './audio-service';
import { storage } from './storage';
import { userContentStorage } from './user-content-storage';
import { voiceOrchestrationService } from './voice-orchestration-service';
import { conversationStylesManager } from '../shared/utils/conversation-styles-manager';
import { db } from './db';

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
   * Get user's narrator profile with language, locale, native language, and profile ID
   */
  private async getUserNarratorProfile(userId: string): Promise<NarratorProfile> {
    try {
      const languageData = await storage.getUserLanguage(userId);
      
      // Get active voice profile to determine profile ID
      const activeProfile = await this.getActiveVoiceProfile(userId);
      
      const profile = {
        language: languageData?.language || 'en',
        locale: languageData?.locale,
        nativeLanguage: languageData?.nativeLanguage,
        profileId: activeProfile?.profileId || 'neutral'
      };
      
      console.log(`[StoryNarrator] getUserNarratorProfile for ${userId}: ${JSON.stringify(profile)}`);
      
      return profile;
    } catch (error) {
      console.error('Error fetching user narrator profile:', error);
      return { language: 'en', profileId: 'neutral' };
    }
  }

  /**
   * Get user's active voice profile to determine profile ID for cache key
   */
  private async getActiveVoiceProfile(userId: string): Promise<{ profileId: string } | null> {
    try {
      const { userVoiceProfiles } = await import('@shared/schema/schema');
      const { eq, and } = await import('drizzle-orm');
      
      const [profile] = await db
        .select({
          metadata: userVoiceProfiles.metadata
        })
        .from(userVoiceProfiles)
        .where(and(
          eq(userVoiceProfiles.userId, userId),
          eq(userVoiceProfiles.isActive, true)
        ))
        .limit(1);
      
      // Extract profile ID from metadata if it exists
      if (profile?.metadata && typeof profile.metadata === 'object') {
        const metadata = profile.metadata as any;
        if (metadata.presetType) {
          console.log(`[StoryNarrator] Found active voice profile: ${metadata.presetType}`);
          return { profileId: metadata.presetType };
        }
      }
      
      console.log(`[StoryNarrator] No active voice profile found, using default: neutral`);
      return { profileId: 'neutral' };
    } catch (error) {
      console.error('Error fetching active voice profile:', error);
      return null;
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
  async generateStoryNarration(storyId: number, userId: string, conversationStyle: string = 'respectful'): Promise<StoryNarrationResult> {
    
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
    
    // Get conversation style configuration for relationship-aware narration
    const styleConfig = await conversationStylesManager.getStyle(conversationStyle);
    console.log(`[StoryNarrator] Using conversation style: ${conversationStyle} - ${styleConfig?.displayName || 'Unknown'}`);
    
    // 4. Narrate story content with the determined narrator voice
    const segments = await this.createNarrationSegments(
      story.content, 
      narratorVoice, 
      narratorVoiceType, 
      userId, 
      storyId,
      extractedEmotions,
      userLanguage,
      narratorProfile,
      conversationStyle,
      styleConfig
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

    // Fallback logic goes here - removed voice sample fallback

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
    narratorProfile: NarratorProfile,
    conversationStyle: string,
    styleConfig: any
  ): Promise<NarrationSegment[]> {
    
    // Split content into manageable chunks for narration
    const chunks = this.splitIntoChunks(storyContent, 500); // 500 character chunks
    const segments: NarrationSegment[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Detect emotion and character for this chunk
        const chunkContext = this.detectChunkContext(chunk, extractedEmotions, []);
        
        // SOUND PATTERN ENHANCEMENT - Apply sound patterns to text before audio generation
        const { VoiceOrchestrationService } = await import('./voice-orchestration-service');
        const orchestrationService = new VoiceOrchestrationService();
        const enhancedChunk = await orchestrationService.enhanceWithSounds(chunk);
        
        console.log(`[StoryNarrator] 🎵 SOUND PATTERNS APPLIED:`);
        console.log(`[StoryNarrator] Original text: "${chunk.substring(0, 100)}..."`);
        console.log(`[StoryNarrator] Enhanced text: "${enhancedChunk.substring(0, 100)}..."`);
        console.log(`[StoryNarrator] Sound patterns detected: ${enhancedChunk !== chunk ? 'YES' : 'NO'}`);
        
        // Get orchestrated voice parameters
        const voiceSettings = await orchestrationService.calculateVoiceParameters(
          userId,
          enhancedChunk,
          chunkContext.character,
          chunkContext.emotion,
          storyId
        );
        
        // Add voice settings to narrator profile
        const enhancedNarratorProfile = {
          ...narratorProfile,
          voiceSettings
        };
        
        // Generate audio using the enhanced chunk with sound patterns
        const audioResult = await this.generateNarrationAudio(
          enhancedChunk, 
          narratorVoice, 
          narratorVoiceType, 
          userId, 
          storyId, 
          i,
          chunkContext,
          userLanguage,
          enhancedNarratorProfile,
          conversationStyle,
          styleConfig
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
    narratorProfile: NarratorProfile,
    conversationStyle: string = 'respectful',
    styleConfig?: any
  ): Promise<{ audioUrl: string; duration?: number }> {
    
    let audioBuffer: Buffer;
    
    if (narratorVoiceType === 'user' && narratorVoice.length === 20) {
      // ElevenLabs voice trained on all emotions - pass actual emotion for modulation
      console.log(`[StoryNarrator] Generating narration segment ${segmentIndex} using ElevenLabs voice: ${narratorVoice} with character: ${chunkContext.character}, emotion: ${chunkContext.emotion}, intensity: ${chunkContext.intensity}`);
      
      try {
        // Get voice settings from orchestration service
        const { voiceOrchestrationService } = await import('./voice-orchestration-service');
        const voiceSettings = await voiceOrchestrationService.getVoiceSettings(
          userId,
          chunkContext.character,
          chunkContext.emotion,
          storyId,
          conversationStyle
        );
        
        console.log(`[StoryNarrator] Using orchestrated voice settings:`, voiceSettings);
        
        // Apply conversation style modifications to voice settings
        if (styleConfig?.voiceParameters) {
          console.log(`[StoryNarrator] Applying conversation style '${conversationStyle}' modifications:`, styleConfig.voiceParameters);
          
          // Merge style parameters with orchestrated settings
          const mergedSettings = {
            ...voiceSettings,
            ...styleConfig.voiceParameters
          };
          
          console.log(`[StoryNarrator] Merged voice settings with style:`, mergedSettings);
          voiceSettings = mergedSettings;
        }
        
        // Note: text is already enhanced with sound patterns from createNarrationSegments
        console.log(`[StoryNarrator] Using enhanced text with sounds: ${text.substring(0, 100)}...`);
        
        const { VoiceProviderFactory } = await import('./voice-providers/voice-provider-factory');
        const arrayBuffer = await VoiceProviderFactory.generateSpeech(text, narratorVoice, chunkContext.emotion, voiceSettings, undefined, narratorProfile);
        audioBuffer = Buffer.from(arrayBuffer);
        
        console.log(`[StoryNarrator] ElevenLabs narration generated: ${audioBuffer.length} bytes with ${chunkContext.emotion} emotion and conversation style ${conversationStyle}`);
        
      } catch (error) {
        console.error(`[StoryNarrator] ElevenLabs generation failed:`, error);
        // Fallback logic goes here
        throw error;
      }
    } else {
      // Fallback logic goes here - no OpenAI voice fallback allowed
      throw new Error('No ElevenLabs voice available. Please generate your narrator voice first.');
    }
    
    // Store audio in story-specific directory structure
    const narratorProfileName = narratorProfile?.profileId || 'neutral';
    
    console.log(`[StoryNarrator] Cache key components - User: ${userId}, StoryID: ${storyId}, ConversationStyle: ${conversationStyle}, ProfileId: ${narratorProfileName}`);
    
    const localAudioUrl = await this.storeNarrationAudio(
      audioBuffer, 
      storyId, 
      segmentIndex, 
      userId,
      conversationStyle,
      narratorProfileName
    );
    
    return {
      audioUrl: localAudioUrl,
      duration: Math.ceil(text.length * 60) // Rough estimate: 60ms per character
    };
  }

  /**
   * Store narration audio buffer using multi-dimensional directory structure
   * Returns local URL for serving
   */
  private async storeNarrationAudio(
    buffer: Buffer, 
    storyId: number, 
    segmentIndex: number, 
    userId: string,
    conversationStyle: string = 'respectful',
    narratorProfile: string = 'neutral'
  ): Promise<string> {
    
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Create multi-dimensional directory structure
    const storyAudioDir = path.join(
      './stories/audio/narrations', 
      userId, 
      storyId.toString(),
      conversationStyle,
      narratorProfile
    );
    await fs.mkdir(storyAudioDir, { recursive: true });
    
    // Store segment file: segment-{index}.mp3
    const fileName = `segment-${segmentIndex}.mp3`;
    const filePath = path.join(storyAudioDir, fileName);
    
    await fs.writeFile(filePath, buffer);
    
    // Return URL for serving with full path
    const publicUrl = `/api/stories/audio/narrations/${userId}/${storyId}/${conversationStyle}/${narratorProfile}/${fileName}`;
    
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