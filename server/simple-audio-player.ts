import { storage } from "./storage";
import { audioService } from "./audio-service";

export interface SimpleAudioSegment {
  text: string;
  audioUrl: string;
  emotion: string;
  intensity: number;
}

export interface SimpleAudioNarration {
  storyId: number;
  segments: SimpleAudioSegment[];
  totalDuration: number;
}

export class SimpleAudioPlayer {
  async generateSimpleNarration(storyId: number, userId: string): Promise<SimpleAudioNarration> {
    const story = await storage.getStory(storyId);
    if (!story) {
      throw new Error("Story not found");
    }

    // Get story analysis data with AI-generated voice assignments
    const storyCharacters = await storage.getStoryCharacters(storyId);
    const storyEmotions = await storage.getStoryEmotions(storyId);
    const userVoiceSamples = await storage.getUserVoiceSamples(userId);
    
    // Split story into sentences
    const sentences = this.splitIntoSentences(story.content);
    console.log(`Processing ${sentences.length} sentences for audio playback`);
    
    const segments: SimpleAudioSegment[] = [];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      
      // Find matching emotion for this sentence segment
      const matchingEmotion = storyEmotions.find(emotion => 
        sentence.toLowerCase().includes(emotion.context.toLowerCase())
      ) || storyEmotions[i % storyEmotions.length] || { emotion: 'neutral', intensity: 5 };
      
      // Priority 1: Check for user-generated voice first
      const userVoiceSample = userVoiceSamples.find(sample => 
        sample.sampleType === matchingEmotion.emotion && sample.isCompleted
      ) || userVoiceSamples.find(sample => sample.isCompleted);
      
      if (userVoiceSample) {
        // Use user-generated voice (highest priority)
        segments.push({
          text: sentence,
          audioUrl: userVoiceSample.audioUrl,
          emotion: userVoiceSample.sampleType || matchingEmotion.emotion,
          intensity: matchingEmotion.intensity
        });
      } else {
        // Priority 2: Use AI-generated voice through modular audio service
        const result = await audioService.generateEmotionAudio({
          text: sentence,
          emotion: matchingEmotion.emotion,
          intensity: matchingEmotion.intensity,
          userId: userId,
          storyId: storyId,
          characters: storyCharacters
        });
        
        segments.push({
          text: sentence,
          audioUrl: result.audioUrl,
          emotion: matchingEmotion.emotion,
          intensity: matchingEmotion.intensity
        });
      }
    }
    
    // Each segment is approximately 2 seconds (based on actual file duration)
    const totalDuration = segments.length * 2000;
    
    console.log(`Generated ${segments.length} audio segments with total duration: ${totalDuration}ms`);
    
    return {
      storyId,
      segments,
      totalDuration
    };
  }

  // Voice selection logic moved to audioService for consistency

  private splitIntoSentences(content: string): string[] {
    return content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
}

export const simpleAudioPlayer = new SimpleAudioPlayer();