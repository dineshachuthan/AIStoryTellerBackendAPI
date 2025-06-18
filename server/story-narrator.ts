import { storage } from "./storage";
import type { Story, StoryEmotion, UserVoiceSample } from "@shared/schema";

export interface NarrationSegment {
  text: string;
  emotion: string;
  intensity: number;
  voiceUrl?: string;
  startTime: number; // in milliseconds
  duration: number; // estimated duration in milliseconds
  characterName?: string;
}

export interface StoryNarration {
  storyId: number;
  totalDuration: number;
  segments: NarrationSegment[];
  backgroundMusic?: string;
  pacing: 'slow' | 'normal' | 'fast';
}

export class StoryNarrator {
  private readonly WORDS_PER_MINUTE = 150; // Average reading speed
  private readonly EMOTION_PAUSE_MULTIPLIER = 1.3; // Slow down for emotional moments
  private readonly CHARACTER_VOICE_MULTIPLIER = 1.1; // Slightly slower for character voices

  async generateNarration(storyId: number, userId: string, options?: {
    pacing?: 'slow' | 'normal' | 'fast';
    includeCharacterVoices?: boolean;
    useUserVoices?: boolean;
    characters?: any[];
    emotions?: any[];
    userVoiceSamples?: any[];
  }): Promise<StoryNarration> {
    const story = await storage.getStory(storyId);
    if (!story) {
      throw new Error("Story not found");
    }

    // Use provided data or fetch from storage
    const storyCharacters = options?.characters || await storage.getStoryCharacters(storyId);
    const storyEmotions = options?.emotions || await storage.getStoryEmotions(storyId);
    const userVoiceSamples = options?.userVoiceSamples || await storage.getUserVoiceSamples(userId);
    
    // Parse story content into segments based on characters, emotions and dialogue
    const segments = await this.parseStoryIntoSegments(
      story, 
      storyCharacters,
      storyEmotions, 
      userVoiceSamples,
      options
    );

    const totalDuration = segments.reduce((total, segment) => total + segment.duration, 0);

    return {
      storyId,
      totalDuration,
      segments,
      pacing: options?.pacing || 'normal',
    };
  }

  private async parseStoryIntoSegments(
    story: Story,
    characters: any[],
    emotions: StoryEmotion[],
    voiceSamples: UserVoiceSample[],
    options?: any
  ): Promise<NarrationSegment[]> {
    const segments: NarrationSegment[] = [];
    const content = story.content;
    
    console.log("Story content:", content?.substring(0, 100) + "...");
    console.log("Characters:", characters?.length || 0);
    console.log("Emotions:", emotions?.length || 0);
    
    // Split content into sentences and paragraphs
    const sentences = this.splitIntoSentences(content);
    console.log("Sentences found:", sentences.length);
    
    let currentTime = 0;

    for (const sentence of sentences) {
      const segment = await this.createSegmentFromSentence(
        sentence,
        characters,
        emotions,
        voiceSamples,
        currentTime,
        options?.pacing || 'normal',
        options?.useUserVoices || false
      );
      
      segments.push(segment);
      currentTime += segment.duration;
    }

    return segments;
  }

  private splitIntoSentences(content: string): string[] {
    // Split by sentence endings, keeping dialogue and emotional context
    return content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private async createSegmentFromSentence(
    sentence: string,
    characters: any[],
    emotions: StoryEmotion[],
    voiceSamples: UserVoiceSample[],
    startTime: number,
    pacing: string,
    useUserVoices: boolean = false
  ): Promise<NarrationSegment> {
    // Detect emotion in the sentence
    const detectedEmotion = this.detectEmotionInText(sentence, emotions);
    
    // Detect if it's dialogue and which character is speaking
    const isDialogue = sentence.includes('"') || sentence.includes("'");
    const characterName = isDialogue ? this.extractCharacterName(sentence) : undefined;
    
    // Find the character who should voice this segment
    let speakingCharacter = null;
    if (characterName) {
      speakingCharacter = characters.find(char => 
        char.name.toLowerCase().includes(characterName.toLowerCase()) ||
        characterName.toLowerCase().includes(char.name.toLowerCase())
      );
    }
    
    // Find matching voice sample for the emotion
    let voiceUrl = undefined;
    if (useUserVoices && detectedEmotion) {
      const voiceSample = this.findMatchingVoiceSample(
        detectedEmotion.emotion,
        voiceSamples
      );
      voiceUrl = voiceSample?.audioUrl;
    }
    
    // If no user voice sample, generate AI voice using OpenAI TTS
    if (!voiceUrl) {
      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const response = await openai.audio.speech.create({
          model: "tts-1",
          voice: this.selectVoiceForCharacter(speakingCharacter, detectedEmotion.emotion) as any,
          input: sentence.length > 4000 ? sentence.substring(0, 4000) : sentence,
          speed: 1.0,
        });

        const buffer = Buffer.from(await response.arrayBuffer());
        
        // Save audio to cache directory
        const fs = await import('fs/promises');
        const path = await import('path');
        const cacheDir = path.join(process.cwd(), 'persistent-cache', 'audio');
        await fs.mkdir(cacheDir, { recursive: true });
        
        const fileName = `narrator-${Date.now()}.mp3`;
        const filePath = path.join(cacheDir, fileName);
        
        // Write audio file
        await fs.writeFile(filePath, buffer);
        
        voiceUrl = `/api/cached-audio/${fileName}`;
        
        console.log("Generated AI voice for sentence:", sentence.substring(0, 50) + "...");
      } catch (error) {
        console.error('Error generating AI voice:', error);
      }
    }

    // Calculate duration based on word count and emotion
    const wordCount = sentence.split(/\s+/).length;
    const baseDuration = this.calculateBaseDuration(wordCount, pacing);
    
    // Adjust duration based on emotion intensity
    let adjustedDuration = baseDuration;
    if (detectedEmotion.intensity > 7) {
      adjustedDuration *= this.EMOTION_PAUSE_MULTIPLIER;
    }
    
    if (isDialogue) {
      adjustedDuration *= this.CHARACTER_VOICE_MULTIPLIER;
    }

    return {
      text: sentence,
      emotion: detectedEmotion.emotion,
      intensity: detectedEmotion.intensity,
      voiceUrl,
      startTime,
      duration: adjustedDuration,
      characterName: speakingCharacter?.name || characterName,
    };
  }

  private detectEmotionInText(
    text: string,
    emotions: StoryEmotion[]
  ): { emotion: string; intensity: number } {
    const lowercaseText = text.toLowerCase();
    
    // Look for direct emotion matches in the story emotions
    for (const emotion of emotions) {
      if (emotion.context && lowercaseText.includes(emotion.context.toLowerCase())) {
        return {
          emotion: emotion.emotion,
          intensity: emotion.intensity || 5,
        };
      }
    }

    // Fallback emotion detection based on text patterns
    const emotionPatterns = {
      'happy': /\b(joy|happy|excited|wonderful|amazing|great|fantastic|love)\b/i,
      'sad': /\b(sad|sorrow|tears|cry|depressed|lonely|grief)\b/i,
      'angry': /\b(angry|furious|rage|mad|frustrated|annoyed)\b/i,
      'fear': /\b(scared|afraid|terrified|frightened|worried|anxious)\b/i,
      'surprise': /\b(surprised|shocked|amazed|astonished|wow)\b/i,
      'excitement': /\b(excited|thrilled|amazing|incredible|awesome)\b/i,
    };

    for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
      if (pattern.test(text)) {
        return { emotion, intensity: 6 };
      }
    }

    // Default neutral emotion
    return { emotion: 'neutral', intensity: 3 };
  }

  private findMatchingVoiceSample(
    emotion: string,
    voiceSamples: UserVoiceSample[]
  ): UserVoiceSample | undefined {
    // First try exact match
    let sample = voiceSamples.find(
      s => s.label === emotion && s.isCompleted && s.sampleType === 'emotion'
    );

    if (sample) return sample;

    // Try similar emotions
    const emotionMappings: Record<string, string[]> = {
      'happy': ['excited', 'joy'],
      'sad': ['disappointed'],
      'angry': ['frustrated'],
      'fear': ['scared', 'worried'],
      'surprise': ['surprised', 'shocked'],
      'excitement': ['happy', 'excited'],
    };

    for (const similarEmotion of emotionMappings[emotion] || []) {
      sample = voiceSamples.find(
        s => s.label === similarEmotion && s.isCompleted
      );
      if (sample) return sample;
    }

    // Fallback to any completed voice sample
    return voiceSamples.find(s => s.isCompleted);
  }

  private selectVoiceForCharacter(character: any, emotion: string): string {
    // Select OpenAI voice based on character traits and emotion
    if (!character) {
      return 'alloy'; // Default narrator voice
    }

    // Map character roles to voices
    const roleVoiceMap: { [key: string]: string } = {
      'protagonist': 'nova',
      'antagonist': 'onyx',
      'supporting': 'shimmer',
      'narrator': 'alloy',
      'other': 'echo'
    };

    // Adjust voice based on emotion
    if (emotion === 'angry' || emotion === 'fear') {
      return 'onyx'; // Deeper, more intense voice
    } else if (emotion === 'happy' || emotion === 'excitement') {
      return 'nova'; // Brighter, more energetic voice
    } else if (emotion === 'sad') {
      return 'fable'; // Softer, more gentle voice
    }

    return roleVoiceMap[character.role] || 'alloy';
  }

  private calculateBaseDuration(wordCount: number, pacing: string): number {
    let wpm = this.WORDS_PER_MINUTE;
    
    switch (pacing) {
      case 'slow':
        wpm = 120;
        break;
      case 'fast':
        wpm = 180;
        break;
      default:
        wpm = 150;
    }

    // Convert to milliseconds
    return (wordCount / wpm) * 60 * 1000;
  }

  private extractCharacterName(sentence: string): string | undefined {
    // Simple pattern to extract character names from dialogue
    const patterns = [
      /(\w+)\s+said/i,
      /(\w+)\s+replied/i,
      /(\w+)\s+asked/i,
      /(\w+)\s+whispered/i,
      /(\w+)\s+shouted/i,
    ];

    for (const pattern of patterns) {
      const match = sentence.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  async generateAudioInstructions(narration: StoryNarration): Promise<string[]> {
    const instructions: string[] = [];
    
    instructions.push(`# DeeVee Story Narration Instructions`);
    instructions.push(`Story ID: ${narration.storyId}`);
    instructions.push(`Total Duration: ${Math.round(narration.totalDuration / 1000)}s`);
    instructions.push(`Pacing: ${narration.pacing}`);
    instructions.push('');
    
    for (let i = 0; i < narration.segments.length; i++) {
      const segment = narration.segments[i];
      const startSeconds = Math.round(segment.startTime / 1000);
      const durationSeconds = Math.round(segment.duration / 1000);
      
      instructions.push(`## Segment ${i + 1} (${startSeconds}s - ${startSeconds + durationSeconds}s)`);
      instructions.push(`Text: "${segment.text}"`);
      instructions.push(`Emotion: ${segment.emotion} (intensity: ${segment.intensity}/10)`);
      
      if (segment.characterName) {
        instructions.push(`Character: ${segment.characterName}`);
      }
      
      if (segment.voiceUrl) {
        instructions.push(`Voice Sample: ${segment.voiceUrl}`);
      }
      
      instructions.push(`Duration: ${durationSeconds}s`);
      instructions.push('');
    }

    return instructions;
  }
}

export const storyNarrator = new StoryNarrator();