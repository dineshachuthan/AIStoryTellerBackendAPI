import { storage } from "./storage";

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

    // Get user voice samples
    const userVoiceSamples = await storage.getUserVoiceSamples(userId);
    
    // Split story into sentences
    const sentences = this.splitIntoSentences(story.content);
    console.log(`Processing ${sentences.length} sentences for audio playback`);
    
    const segments: SimpleAudioSegment[] = [];
    
    // If user has voice samples, use them; otherwise use OpenAI TTS
    if (userVoiceSamples.length > 0) {
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        
        // Use existing user voice sample
        const voiceSample = userVoiceSamples.find(sample => sample.sampleType === 'shock') || 
                           userVoiceSamples.find(sample => sample.sampleType === 'neutral') ||
                           userVoiceSamples[0];
        
        segments.push({
          text: sentence,
          audioUrl: voiceSample.audioUrl,
          emotion: voiceSample.sampleType || 'neutral',
          intensity: 5
        });
      }
    } else {
      // Fallback to OpenAI TTS when no user voice samples exist
      console.log('No user voice samples found, using OpenAI TTS fallback');
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        segments.push({
          text: sentence,
          audioUrl: `/api/tts/generate?text=${encodeURIComponent(sentence)}&voice=alloy`,
          emotion: 'neutral',
          intensity: 5
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

  private splitIntoSentences(content: string): string[] {
    return content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
}

export const simpleAudioPlayer = new SimpleAudioPlayer();