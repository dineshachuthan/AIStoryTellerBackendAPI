import { storage } from './storage';
import { voiceSelectionService, type StorySegment, type VoiceMapping } from './voice-selection-service';
import { audioCacheService, type AudioGenerationRequest } from './audio-cache-service';
import { ElevenLabsProvider } from './voice-providers/elevenlabs-provider';
import { analyzeStoryContent } from './ai-analysis';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface NarrationSegment {
  id: string;
  text: string;
  emotion: string;
  character?: string;
  voiceId: string;
  isUserVoice: boolean;
  audioUrl?: string;
  duration: number;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface StoryNarrationResult {
  segments: NarrationSegment[];
  totalDuration: number;
  finalAudioUrl: string;
  emotionVoicesUsed: { [emotion: string]: string };
  cacheHitRate: number;
  generationStats: {
    totalSegments: number;
    userVoiceSegments: number;
    cachedSegments: number;
    newGenerations: number;
  };
}

export class EnhancedStoryNarrator {
  private elevenLabs: ElevenLabsProvider;
  private outputDir: string;

  constructor() {
    this.elevenLabs = new ElevenLabsProvider();
    this.outputDir = path.join(process.cwd(), 'persistent-cache', 'narrations');
  }

  /**
   * Generate complete story narration with user voice cloning
   */
  async generateStoryNarration(
    storyId: number,
    userId: string,
    options: {
      useUserVoice?: boolean;
      targetDuration?: number;
      includeNarrator?: boolean;
    } = {}
  ): Promise<StoryNarrationResult> {
    try {
      console.log(`[EnhancedNarrator] Starting narration generation for story ${storyId}`);

      // Get story and analysis
      const story = await storage.getStory(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      // Get or create story analysis
      let analysis = await storage.getStoryAnalysis(storyId, 'character-extraction');
      if (!analysis) {
        console.log('[EnhancedNarrator] Generating story analysis...');
        analysis = await analyzeStoryContent(story.content);
        await storage.saveStoryAnalysis(storyId, 'character-extraction', analysis, 'enhanced-narrator');
      }

      // Extract story segments with character-emotion mapping
      const segments = await this.extractStorySegments(story, analysis);
      console.log(`[EnhancedNarrator] Extracted ${segments.length} story segments`);

      // Create voice mappings using intelligent selection
      const voiceMappings = await voiceSelectionService.createVoiceMapping(userId, segments);
      console.log(`[EnhancedNarrator] Created voice mappings for ${voiceMappings.length} segments`);

      // Generate audio for each segment with caching
      const narrationSegments = await this.generateSegmentAudio(voiceMappings, userId);
      console.log(`[EnhancedNarrator] Generated audio for ${narrationSegments.length} segments`);

      // Sequence and combine audio segments
      const finalResult = await this.sequenceAudioSegments(narrationSegments, storyId);
      console.log(`[EnhancedNarrator] Final narration duration: ${finalResult.totalDuration}s`);

      // Save narration record to database
      await this.saveNarrationRecord(storyId, userId, finalResult);

      return finalResult;
    } catch (error) {
      console.error('[EnhancedNarrator] Error generating story narration:', error);
      throw error;
    }
  }

  /**
   * Extract story segments with character-emotion mapping per scene
   */
  async extractStorySegments(story: any, analysis: any): Promise<StorySegment[]> {
    const segments: StorySegment[] = [];
    let segmentId = 0;

    // Process narrative sections (narrator voice)
    if (story.content) {
      const paragraphs = story.content.split('\n\n').filter(p => p.trim());
      
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i].trim();
        if (paragraph) {
          // Detect if this is dialogue or narrative
          const isDialogue = paragraph.includes('"') || paragraph.includes(''') || paragraph.includes(''');
          
          if (isDialogue) {
            // Extract dialogue segments with character detection
            const dialogueSegments = this.extractDialogueFromParagraph(paragraph, analysis);
            segments.push(...dialogueSegments.map(d => ({
              ...d,
              sceneIndex: i,
              dialogueIndex: segmentId++
            })));
          } else {
            // Narrative segment
            segments.push({
              text: paragraph,
              emotion: this.detectNarrativeEmotion(paragraph),
              character: 'narrator',
              sceneIndex: i,
              dialogueIndex: segmentId++
            });
          }
        }
      }
    }

    // Process structured scenes if available
    if (analysis.scenes) {
      for (let sceneIndex = 0; sceneIndex < analysis.scenes.length; sceneIndex++) {
        const scene = analysis.scenes[sceneIndex];
        
        if (scene.dialogue) {
          for (let dialogueIndex = 0; dialogueIndex < scene.dialogue.length; dialogueIndex++) {
            const line = scene.dialogue[dialogueIndex];
            segments.push({
              text: line.text || '',
              emotion: line.emotion || 'neutral',
              character: line.character || 'narrator',
              sceneIndex,
              dialogueIndex: segmentId++
            });
          }
        }
      }
    }

    return segments;
  }

  /**
   * Extract dialogue segments from paragraph with character detection
   */
  private extractDialogueFromParagraph(paragraph: string, analysis: any): StorySegment[] {
    const segments: StorySegment[] = [];
    const characters = analysis.characters || [];
    
    // Split on dialogue markers
    const parts = paragraph.split(/["'']/);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (part) {
        if (i % 2 === 1) {
          // This is inside quotes - dialogue
          const character = this.detectCharacterFromContext(paragraph, characters);
          const emotion = this.detectEmotionFromText(part);
          
          segments.push({
            text: part,
            emotion,
            character: character?.name || 'speaker',
            sceneIndex: 0,
            dialogueIndex: 0
          });
        } else {
          // This is narrative text
          if (part.length > 10) { // Only include substantial narrative
            segments.push({
              text: part,
              emotion: this.detectNarrativeEmotion(part),
              character: 'narrator',
              sceneIndex: 0,
              dialogueIndex: 0
            });
          }
        }
      }
    }
    
    return segments;
  }

  /**
   * Detect character from context in paragraph
   */
  private detectCharacterFromContext(paragraph: string, characters: any[]): any | null {
    const lowerParagraph = paragraph.toLowerCase();
    
    for (const character of characters) {
      const name = character.name.toLowerCase();
      if (lowerParagraph.includes(name)) {
        return character;
      }
    }
    
    return null;
  }

  /**
   * Detect emotion from text content
   */
  private detectEmotionFromText(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Simple emotion detection based on keywords
    if (lowerText.includes('!') || lowerText.includes('angry') || lowerText.includes('furious')) {
      return 'angry';
    }
    if (lowerText.includes('happy') || lowerText.includes('joy') || lowerText.includes('laugh')) {
      return 'happy';
    }
    if (lowerText.includes('sad') || lowerText.includes('cry') || lowerText.includes('tear')) {
      return 'sad';
    }
    if (lowerText.includes('scared') || lowerText.includes('afraid') || lowerText.includes('fear')) {
      return 'fearful';
    }
    if (lowerText.includes('surprise') || lowerText.includes('wow') || lowerText.includes('amazing')) {
      return 'surprised';
    }
    
    return 'neutral';
  }

  /**
   * Detect narrative emotion based on content tone
   */
  private detectNarrativeEmotion(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('peaceful') || lowerText.includes('calm') || lowerText.includes('serene')) {
      return 'calm';
    }
    if (lowerText.includes('dark') || lowerText.includes('ominous') || lowerText.includes('threat')) {
      return 'concerned';
    }
    if (lowerText.includes('beautiful') || lowerText.includes('wonderful') || lowerText.includes('amazing')) {
      return 'happy';
    }
    
    return 'thoughtful'; // Default narrative emotion
  }

  /**
   * Generate audio for each segment with intelligent caching
   */
  async generateSegmentAudio(voiceMappings: VoiceMapping[], userId: string): Promise<NarrationSegment[]> {
    const segments: NarrationSegment[] = [];
    let currentTime = 0;
    let cacheHits = 0;
    let newGenerations = 0;

    for (let i = 0; i < voiceMappings.length; i++) {
      const mapping = voiceMappings[i];
      
      try {
        // Create audio generation request
        const audioRequest: AudioGenerationRequest = {
          text: mapping.text,
          voiceId: mapping.voiceId,
          emotion: mapping.emotion,
          provider: 'elevenlabs',
          metadata: {
            character: mapping.character,
            isUserVoice: mapping.isUserVoice,
            fallbackEmotion: mapping.fallbackEmotion
          }
        };

        // Generate or get cached audio
        const audioResult = await audioCacheService.generateOrGetCachedAudio(
          audioRequest,
          async () => {
            console.log(`[EnhancedNarrator] Generating new audio for segment ${i + 1}/${voiceMappings.length}`);
            return await this.elevenLabs.generateSpeech(mapping.text, mapping.voiceId, {
              emotion: mapping.emotion,
              isUserVoice: mapping.isUserVoice
            });
          }
        );

        if (audioResult.cached) {
          cacheHits++;
        } else {
          newGenerations++;
        }

        // Create narration segment
        const duration = audioResult.cacheEntry.duration;
        const segment: NarrationSegment = {
          id: `segment-${i}`,
          text: mapping.text,
          emotion: mapping.emotion,
          character: mapping.character,
          voiceId: mapping.voiceId,
          isUserVoice: mapping.isUserVoice,
          audioUrl: audioResult.audioUrl,
          duration,
          startTime: currentTime,
          endTime: currentTime + duration,
          confidence: mapping.confidence
        };

        segments.push(segment);
        currentTime += duration + 0.5; // Add 0.5s pause between segments
        
      } catch (error) {
        console.error(`[EnhancedNarrator] Error generating audio for segment ${i}:`, error);
        
        // Create silent segment for errors
        const silentSegment: NarrationSegment = {
          id: `segment-${i}-error`,
          text: mapping.text,
          emotion: mapping.emotion,
          character: mapping.character,
          voiceId: mapping.voiceId,
          isUserVoice: mapping.isUserVoice,
          duration: 2.0, // 2 second placeholder
          startTime: currentTime,
          endTime: currentTime + 2.0,
          confidence: 0
        };
        
        segments.push(silentSegment);
        currentTime += 2.5;
      }
    }

    console.log(`[EnhancedNarrator] Audio generation stats: ${cacheHits} cached, ${newGenerations} new`);
    return segments;
  }

  /**
   * Sequence and combine audio segments into final narration
   */
  async sequenceAudioSegments(segments: NarrationSegment[], storyId: number): Promise<StoryNarrationResult> {
    try {
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });
      
      // Create output filename using hierarchical storage
      const timestamp = Date.now();
      const outputFile = path.join(this.outputDir, `story-${storyId}-${timestamp}.mp3`);
      
      // Build FFmpeg command to concatenate segments with pauses
      const segmentFiles: string[] = [];
      let ffmpegInputs = '';
      let filterComplex = '';
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        if (segment.audioUrl) {
          // Convert relative URL to file path
          const audioPath = segment.audioUrl.replace('/api/audio-cache/', 
            path.join(process.cwd(), 'persistent-cache', 'audio-cache', 'development/'));
          
          segmentFiles.push(audioPath);
          ffmpegInputs += `-i "${audioPath}" `;
          
          if (i === 0) {
            filterComplex = `[0:a]`;
          } else {
            filterComplex += `[${i}:a]`;
          }
        }
      }
      
      // Add silence between segments and concatenate
      if (segmentFiles.length > 0) {
        filterComplex += `concat=n=${segmentFiles.length}:v=0:a=1[outa]`;
        
        const ffmpegCommand = `ffmpeg ${ffmpegInputs} -filter_complex "${filterComplex}" -map "[outa]" -y "${outputFile}"`;
        
        console.log('[EnhancedNarrator] Combining audio segments...');
        await execAsync(ffmpegCommand);
        
        // Get final audio duration
        const durationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${outputFile}"`;
        const { stdout } = await execAsync(durationCommand);
        const totalDuration = parseFloat(stdout.trim());
        
        // Create final result
        const emotionVoicesUsed: { [emotion: string]: string } = {};
        let userVoiceSegments = 0;
        let cachedSegments = 0;
        
        for (const segment of segments) {
          emotionVoicesUsed[segment.emotion] = segment.voiceId;
          if (segment.isUserVoice) userVoiceSegments++;
          // Note: cache info would need to be tracked during generation
        }
        
        const result: StoryNarrationResult = {
          segments,
          totalDuration,
          finalAudioUrl: `/api/narrations/story-${storyId}-${timestamp}.mp3`,
          emotionVoicesUsed,
          cacheHitRate: cachedSegments / segments.length,
          generationStats: {
            totalSegments: segments.length,
            userVoiceSegments,
            cachedSegments,
            newGenerations: segments.length - cachedSegments
          }
        };
        
        return result;
      } else {
        throw new Error('No valid audio segments to combine');
      }
      
    } catch (error) {
      console.error('[EnhancedNarrator] Error sequencing audio:', error);
      throw error;
    }
  }

  /**
   * Save narration record to database
   */
  private async saveNarrationRecord(storyId: number, userId: string, result: StoryNarrationResult): Promise<void> {
    try {
      await storage.createStoryNarration({
        storyId,
        userId,
        narrationSegments: result.segments,
        useUserVoice: result.generationStats.userVoiceSegments > 0,
        emotionVoicesUsed: result.emotionVoicesUsed,
        generationStatus: 'completed',
        audioUrl: result.finalAudioUrl,
        duration: result.totalDuration,
        segmentCount: result.segments.length,
        cacheHitRate: result.cacheHitRate
      });
      
      console.log(`[EnhancedNarrator] Saved narration record for story ${storyId}`);
    } catch (error) {
      console.error('[EnhancedNarrator] Error saving narration record:', error);
    }
  }
}

export const enhancedStoryNarrator = new EnhancedStoryNarrator();