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
      
      // Check for user voice override first
      const userVoiceSample = userVoiceSamples.find(sample => 
        sample.sampleType === matchingEmotion.emotion && sample.isCompleted
      ) || userVoiceSamples.find(sample => sample.isCompleted);
      
      if (userVoiceSample) {
        // Use user-recorded voice sample
        segments.push({
          text: sentence,
          audioUrl: userVoiceSample.audioUrl,
          emotion: userVoiceSample.sampleType || matchingEmotion.emotion,
          intensity: matchingEmotion.intensity
        });
      } else {
        // Use AI-generated voice based on analysis (characters have assigned voices)
        const aiVoice = this.selectAIVoiceForEmotion(matchingEmotion.emotion, storyCharacters);
        segments.push({
          text: sentence,
          audioUrl: `/api/emotions/generate-sample?emotion=${matchingEmotion.emotion}&intensity=${matchingEmotion.intensity}&text=${encodeURIComponent(sentence)}&voice=${aiVoice}`,
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

  private selectAIVoiceForEmotion(emotion: string, characters: any[]): string {
    // Use character analysis to select appropriate AI voice
    const emotionVoiceMap: { [key: string]: string } = {
      'joy': 'shimmer',
      'happiness': 'shimmer', 
      'excitement': 'echo',
      'sadness': 'nova',
      'grief': 'nova',
      'anger': 'onyx',
      'rage': 'onyx',
      'fear': 'fable',
      'shock': 'echo',
      'surprise': 'echo',
      'neutral': 'alloy',
      'curiosity': 'echo',
      'disappointment': 'nova',
      'wisdom': 'fable'
    };

    // If we have character data, use their assigned voices
    if (characters.length > 0) {
      const primaryCharacter = characters.find(c => c.role === 'protagonist') || characters[0];
      if (primaryCharacter && primaryCharacter.assignedVoice) {
        return primaryCharacter.assignedVoice;
      }
    }

    return emotionVoiceMap[emotion.toLowerCase()] || 'alloy';
  }

  private splitIntoSentences(content: string): string[] {
    return content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
}

export const simpleAudioPlayer = new SimpleAudioPlayer();