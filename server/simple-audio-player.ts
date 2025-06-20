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
        // Priority 2: Use AI-generated voice as default fallback
        const aiVoice = this.selectAIVoiceForEmotion(matchingEmotion.emotion, storyCharacters);
        
        // Generate AI voice audio URL with proper parameters
        const params = new URLSearchParams({
          emotion: matchingEmotion.emotion,
          intensity: matchingEmotion.intensity.toString(),
          text: sentence,
          voice: aiVoice
        });
        
        segments.push({
          text: sentence,
          audioUrl: `/api/emotions/generate-sample?${params.toString()}`,
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
    // Priority 1: Use character's assigned voice from analysis
    if (characters.length > 0) {
      // Find character with assigned voice (from AI analysis)
      const characterWithVoice = characters.find(c => c.assignedVoice);
      if (characterWithVoice) {
        console.log(`Using character voice: ${characterWithVoice.assignedVoice} for ${characterWithVoice.name}`);
        return characterWithVoice.assignedVoice;
      }
      
      // Fallback to protagonist if no assigned voice found
      const protagonist = characters.find(c => c.role === 'protagonist');
      if (protagonist && protagonist.assignedVoice) {
        return protagonist.assignedVoice;
      }
    }

    // Priority 2: Emotion-based voice mapping as fallback
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
      'wisdom': 'fable',
      'melancholy': 'nova',
      'freedom': 'shimmer',
      'irony': 'fable'
    };

    const selectedVoice = emotionVoiceMap[emotion.toLowerCase()] || 'alloy';
    console.log(`Using emotion-based voice: ${selectedVoice} for emotion: ${emotion}`);
    return selectedVoice;
  }

  private splitIntoSentences(content: string): string[] {
    return content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
}

export const simpleAudioPlayer = new SimpleAudioPlayer();