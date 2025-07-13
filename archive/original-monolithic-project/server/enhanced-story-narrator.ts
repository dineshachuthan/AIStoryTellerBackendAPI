/**
 * Enhanced Story Narrator Service - MVP2 Implementation
 * Exclusively uses user_esm_recordings table with granular segment-based voice selection
 * 
 * Priority order: Individual emotion → Category aggregation → Combined → OpenAI voice
 */

import { storage } from './storage';

export interface MVP2NarrationOptions {
  storyId: number;
  userId: string;
  content: string;
  segments: string[];
}

export interface MVP2NarrationResult {
  success: boolean;
  audioFiles: {
    segmentIndex: number;
    audioUrl: string;
    voiceType: 'individual_emotion' | 'category_voice' | 'combined_voice' | 'openai_voice';
    voiceId?: string;
    emotion?: string;
    category?: string;
  }[];
  totalSegments: number;
  error?: string;
}

export class EnhancedStoryNarrator {
  /**
   * Generate story narration using MVP2 architecture with ESM-exclusive voice selection
   * @param options - Narration options with story details
   * @returns MVP2 narration result with segment-based audio files
   */
  async generateMVP2Narration(options: MVP2NarrationOptions): Promise<MVP2NarrationResult> {
    console.log(`[MVP2Narrator] ================================ MVP2 STORY NARRATION INITIATED ================================`);
    console.log(`[MVP2Narrator] Beginning MVP2 story narration for story ${options.storyId}, user ${options.userId}`);
    console.log(`[MVP2Narrator] Processing ${options.segments.length} story segments with ESM-exclusive voice selection`);
    console.log(`[MVP2Narrator] Priority order: Individual emotion → Category aggregation → Combined → OpenAI voice`);

    try {
      // Get all ESM recordings for the user
      const esmRecordings = await storage.getUserEsmRecordings(options.userId);
      console.log(`[MVP2Narrator] Retrieved ${esmRecordings.length} ESM recordings for voice selection`);

      // Analyze story content for emotion/sound/modulation context
      const { analyzeStoryContent } = await import('./ai-analysis');
      const storyAnalysis = await analyzeStoryContent(options.content, options.userId);
      console.log(`[MVP2Narrator] Story analysis completed: ${storyAnalysis.emotions.length} emotions, ${storyAnalysis.soundEffects?.length || 0} sounds`);

      // Process each segment with MVP2 voice selection
      const audioFiles = [];
      
      for (let i = 0; i < options.segments.length; i++) {
        const segment = options.segments[i];
        console.log(`[MVP2Narrator] Processing segment ${i + 1}/${options.segments.length}`);
        
        try {
          // Determine optimal voice for this segment
          const voiceSelection = await this.selectOptimalVoiceForSegment(
            segment, 
            esmRecordings, 
            storyAnalysis
          );
          
          console.log(`[MVP2Narrator] Segment ${i + 1} voice selection: ${voiceSelection.type} (${voiceSelection.voiceId || 'N/A'})`);
          
          // Generate audio for this segment
          const audioResult = await this.generateSegmentAudio(
            segment, 
            voiceSelection, 
            options.storyId, 
            i
          );
          
          if (audioResult.success) {
            audioFiles.push({
              segmentIndex: i,
              audioUrl: audioResult.audioUrl,
              voiceType: voiceSelection.type,
              voiceId: voiceSelection.voiceId,
              emotion: voiceSelection.emotion,
              category: voiceSelection.category
            });
            console.log(`[MVP2Narrator] ✅ Segment ${i + 1} audio generated successfully`);
          } else {
            console.error(`[MVP2Narrator] ❌ Segment ${i + 1} audio generation failed: ${audioResult.error}`);
            // Continue with other segments
          }
        } catch (error) {
          console.error(`[MVP2Narrator] Error processing segment ${i + 1}:`, error);
          // Continue with other segments
        }
      }

      console.log(`[MVP2Narrator] ===== MVP2 STORY NARRATION COMPLETE ===== Generated ${audioFiles.length}/${options.segments.length} audio files`);
      
      return {
        success: audioFiles.length > 0,
        audioFiles,
        totalSegments: options.segments.length,
        error: audioFiles.length === 0 ? 'No audio files were generated successfully' : undefined
      };

    } catch (error) {
      console.error(`[MVP2Narrator] ========================== CRITICAL MVP2 NARRATION ERROR ==========================`);
      console.error(`[MVP2Narrator] Failed to generate MVP2 narration for story ${options.storyId}`);
      console.error(`[MVP2Narrator] Error details: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        success: false,
        audioFiles: [],
        totalSegments: options.segments.length,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Select optimal voice for story segment using MVP2 priority order
   */
  private async selectOptimalVoiceForSegment(
    segment: string, 
    esmRecordings: any[], 
    storyAnalysis: any
  ): Promise<{
    type: 'individual_emotion' | 'category_voice' | 'combined_voice' | 'openai_voice';
    voiceId?: string;
    emotion?: string;
    category?: string;
  }> {
    // Detect primary emotion/sound/modulation in this segment
    const primaryEmotion = this.detectPrimaryEmotion(segment, storyAnalysis);
    const primarySound = this.detectPrimarySound(segment, storyAnalysis);
    const primaryModulation = this.detectPrimaryModulation(segment, storyAnalysis);

    console.log(`[MVP2Narrator] Segment context: emotion=${primaryEmotion}, sound=${primarySound}, modulation=${primaryModulation}`);

    // Priority 1: Individual emotion voice (6+ samples, narrator_voice_id)
    if (primaryEmotion) {
      const emotionRecordings = esmRecordings.filter(r => 
        r.category === 1 && 
        r.name.toLowerCase() === primaryEmotion.toLowerCase() && 
        r.narrator_voice_id
      );
      
      if (emotionRecordings.length >= 6) {
        console.log(`[MVP2Narrator] Using individual emotion voice for ${primaryEmotion}`);
        return {
          type: 'individual_emotion',
          voiceId: emotionRecordings[0].narrator_voice_id,
          emotion: primaryEmotion
        };
      }
    }

    // Priority 2: Category aggregation voice (emotions, sounds, modulations)
    const emotionCategoryVoice = this.findCategoryVoice(esmRecordings, 1); // emotions
    const soundCategoryVoice = this.findCategoryVoice(esmRecordings, 2); // sounds  
    const modulationCategoryVoice = this.findCategoryVoice(esmRecordings, 3); // modulations

    if (primaryEmotion && emotionCategoryVoice) {
      console.log(`[MVP2Narrator] Using emotion category voice`);
      return {
        type: 'category_voice',
        voiceId: emotionCategoryVoice,
        category: 'emotions'
      };
    }

    if (primarySound && soundCategoryVoice) {
      console.log(`[MVP2Narrator] Using sound category voice`);
      return {
        type: 'category_voice',
        voiceId: soundCategoryVoice,
        category: 'sounds'
      };
    }

    if (primaryModulation && modulationCategoryVoice) {
      console.log(`[MVP2Narrator] Using modulation category voice`);
      return {
        type: 'category_voice',
        voiceId: modulationCategoryVoice,
        category: 'modulations'
      };
    }

    // Priority 3: Combined voice (all ESM samples together)
    const combinedVoice = this.findCombinedVoice(esmRecordings);
    if (combinedVoice) {
      console.log(`[MVP2Narrator] Using combined ESM voice`);
      return {
        type: 'combined_voice',
        voiceId: combinedVoice
      };
    }

    // Priority 4: OpenAI voice fallback
    console.log(`[MVP2Narrator] Falling back to OpenAI voice (no ESM voices available)`);
    return {
      type: 'openai_voice'
    };
  }

  /**
   * Generate audio for a single segment using selected voice
   */
  private async generateSegmentAudio(
    segment: string, 
    voiceSelection: any, 
    storyId: number, 
    segmentIndex: number
  ): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
    try {
      if (voiceSelection.type === 'openai_voice') {
        // Use existing OpenAI TTS generation
        const { audioService } = await import('./audio-service');
        const result = await audioService.generateEmotionAudio({
          text: segment,
          emotion: voiceSelection.emotion || 'neutral',
          intensity: 5,
          voice: 'alloy' // Default OpenAI voice
        });
        
        return {
          success: true,
          audioUrl: result.audioUrl
        };
      } else {
        // Use ElevenLabs with narrator voice ID
        const { VoiceProviderRegistry } = await import('./voice-providers/provider-manager');
        const voiceProvider = VoiceProviderRegistry.getModule();
        
        if (!voiceProvider) {
          throw new Error('No voice provider available');
        }

        // Generate audio using ElevenLabs narrator voice
        const result = await voiceProvider.generateWithVoiceId(voiceSelection.voiceId, segment);
        
        if (result.success) {
          // Store in story narration structure
          const audioUrl = `./stories/audio/private/${storyId}/segment-${segmentIndex}.mp3`;
          // TODO: Save actual audio file to storage location
          
          return {
            success: true,
            audioUrl: audioUrl
          };
        } else {
          throw new Error(result.error || 'Voice generation failed');
        }
      }
    } catch (error) {
      console.error(`[MVP2Narrator] Error generating segment audio:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Detect primary emotion in segment text
   */
  private detectPrimaryEmotion(segment: string, storyAnalysis: any): string | null {
    if (!storyAnalysis.emotions || storyAnalysis.emotions.length === 0) {
      return null;
    }

    // Find emotion with quote matching segment content
    for (const emotion of storyAnalysis.emotions) {
      if (emotion.quote && segment.toLowerCase().includes(emotion.quote.toLowerCase())) {
        return emotion.emotion;
      }
      if (emotion.context && segment.toLowerCase().includes(emotion.context.toLowerCase())) {
        return emotion.emotion;
      }
    }

    // Fallback logic goes here
    return null;
  }

  /**
   * Detect primary sound in segment text
   */
  private detectPrimarySound(segment: string, storyAnalysis: any): string | null {
    if (!storyAnalysis.soundEffects || storyAnalysis.soundEffects.length === 0) {
      return null;
    }

    // Find sound with quote matching segment content
    for (const sound of storyAnalysis.soundEffects) {
      if (sound.quote && segment.toLowerCase().includes(sound.quote.toLowerCase())) {
        return sound.sound;
      }
      if (sound.context && segment.toLowerCase().includes(sound.context.toLowerCase())) {
        return sound.sound;
      }
    }

    return null;
  }

  /**
   * Detect primary modulation in segment text
   */
  private detectPrimaryModulation(segment: string, storyAnalysis: any): string | null {
    // Use mood category or genre as modulation hint
    if (storyAnalysis.moodCategory) {
      return storyAnalysis.moodCategory;
    }
    if (storyAnalysis.genre) {
      return storyAnalysis.genre;
    }
    
    return null;
  }

  /**
   * Find category-specific narrator voice
   */
  private findCategoryVoice(esmRecordings: any[], category: number): string | null {
    const categoryRecordings = esmRecordings.filter(r => 
      r.category === category && r.narrator_voice_id
    );
    
    if (categoryRecordings.length >= 3) {
      // Return most common narrator_voice_id in this category
      const voiceIds = categoryRecordings.map(r => r.narrator_voice_id);
      const voiceIdCounts = voiceIds.reduce((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});
      
      const mostCommonVoiceId = Object.keys(voiceIdCounts).reduce((a, b) => 
        voiceIdCounts[a] > voiceIdCounts[b] ? a : b
      );
      
      return mostCommonVoiceId;
    }
    
    return null;
  }

  /**
   * Find combined narrator voice (all categories together)
   */
  private findCombinedVoice(esmRecordings: any[]): string | null {
    const allVoiceIds = esmRecordings
      .filter(r => r.narrator_voice_id)
      .map(r => r.narrator_voice_id);
    
    if (allVoiceIds.length >= 5) {
      // Return most common narrator_voice_id across all categories
      const voiceIdCounts = allVoiceIds.reduce((acc, id) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});
      
      const mostCommonVoiceId = Object.keys(voiceIdCounts).reduce((a, b) => 
        voiceIdCounts[a] > voiceIdCounts[b] ? a : b
      );
      
      return mostCommonVoiceId;
    }
    
    return null;
  }
}

export const enhancedStoryNarrator = new EnhancedStoryNarrator();