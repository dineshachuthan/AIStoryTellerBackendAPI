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
    const characterName = this.extractCharacterName(sentence); // Extract from any sentence
    
    console.log("Processing sentence:", sentence.substring(0, 60) + "...", "Detected character:", characterName);
    
    // Find the character who should voice this segment or create one
    let speakingCharacter = null;
    if (characterName) {
      speakingCharacter = characters.find(char => 
        char.name.toLowerCase().includes(characterName.toLowerCase()) ||
        characterName.toLowerCase().includes(char.name.toLowerCase())
      );
      
      // If no existing character found, create a temporary one for voice selection
      if (!speakingCharacter) {
        speakingCharacter = {
          name: characterName,
          role: characterName.toLowerCase() === 'mother' ? 'supporting' : 'protagonist'
        };
        console.log("Created temp character:", speakingCharacter.name, "with role:", speakingCharacter.role);
      }
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

        const selectedVoice = this.getStoredVoiceForCharacter(speakingCharacter, characters);
        console.log("Using stored voice:", selectedVoice, "for character:", speakingCharacter?.name || 'narrator');
        
        // Enhance text with emotional expressions and sound effects
        const enhancedText = this.addEmotionalExpressions(sentence, detectedEmotion.emotion, detectedEmotion.intensity);
        const emotionalSpeed = this.getEmotionalSpeed(detectedEmotion.emotion, detectedEmotion.intensity);
        
        console.log("Enhanced text for emotion:", enhancedText.substring(0, 100) + "...");
        
        const response = await openai.audio.speech.create({
          model: "tts-1",
          voice: selectedVoice as any,
          input: enhancedText.length > 4000 ? enhancedText.substring(0, 4000) : enhancedText,
          speed: emotionalSpeed,
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

    // Map character names and roles to specific voices for maximum distinction
    const characterVoiceMap: { [key: string]: string } = {
      'Boy': 'echo',        // Higher, younger male voice
      'Mother': 'fable',    // Mature, warmer female voice (more aged sounding)
      'Father': 'onyx',     // Deep, authoritative male voice
      'Girl': 'shimmer',    // Light, young female voice
      'Narrator': 'alloy',  // Neutral narrator voice
    };

    // First check for character name match (case insensitive)
    if (character.name) {
      const nameKey = Object.keys(characterVoiceMap).find(key => 
        key.toLowerCase() === character.name.toLowerCase()
      );
      if (nameKey) {
        console.log("Using character name mapping:", character.name, "->", characterVoiceMap[nameKey]);
        return characterVoiceMap[nameKey];
      }
    }

    // Map character roles to voices as fallback
    const roleVoiceMap: { [key: string]: string } = {
      'protagonist': 'echo',     // Young voice for main character
      'antagonist': 'onyx',      // Deeper, more intense voice
      'supporting': 'shimmer',   // Supporting character voice
      'narrator': 'alloy',       // Neutral narrator voice
      'other': 'fable'          // Alternative voice for others
    };

    // Emotion-based voice modulation (but keep character consistency)
    let baseVoice = roleVoiceMap[character.role] || 'alloy';
    
    // For the Boy character, always use echo regardless of emotion
    if (character.name === 'Boy' || character.name === 'boy') {
      return 'echo';
    }
    
    // For the Mother character, always use fable regardless of emotion
    if (character.name === 'Mother' || character.name === 'mother') {
      return 'fable';
    }

    return baseVoice;
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
    // Enhanced pattern to extract character names from dialogue
    const patterns = [
      /said\s+his\s+(\w+)/i,           // "said his mother"
      /(\w+)\s+said/i,                 // "mother said"
      /(\w+)\s+replied/i,              // "mother replied"
      /(\w+)\s+asked/i,                // "mother asked"
      /(\w+)\s+whispered/i,            // "mother whispered"
      /(\w+)\s+shouted/i,              // "mother shouted"
      /"[^"]*",?\s*said\s+his\s+(\w+)/i, // "text", said his mother
      /"[^"]*",?\s*(\w+)\s+said/i,     // "text", mother said
    ];

    for (const pattern of patterns) {
      const match = sentence.match(pattern);
      if (match && match[1]) {
        const name = match[1].toLowerCase();
        // Map common story roles to proper character names
        if (name === 'mother') return 'Mother';
        if (name === 'boy') return 'Boy';
        if (name === 'father') return 'Father';
        if (name === 'girl') return 'Girl';
        return match[1];
      }
    }

    // Check for dialogue without explicit "said" patterns
    if (sentence.includes('"')) {
      if (sentence.toLowerCase().includes('mother')) return 'Mother';
      if (sentence.toLowerCase().includes('boy')) return 'Boy';
    }

    // Check for character references in narrative text
    const text = sentence.toLowerCase();
    console.log("Checking narrative text:", text.substring(0, 50), "...");
    
    if (text.includes('a boy') || text.includes('the boy') || text.startsWith('boy ')) {
      console.log("Found Boy in narrative");
      return 'Boy';
    }
    if (text.includes('his mother') || text.includes('the mother') || text.includes('mother')) {
      console.log("Found Mother in narrative");
      return 'Mother';
    }
    
    // Check for pronouns referring to the boy in context
    if (text.includes(' he ') || text.includes(' his ') || text.includes(' him ')) {
      // If previous context suggests this is about the boy, return Boy
      return 'Boy';
    }

    return undefined;
  }

  private addEmotionalExpressions(text: string, emotion: string, intensity: number): string {
    let enhancedText = text;
    
    // Add emotional expressions based on emotion type and intensity
    switch (emotion) {
      case 'sad':
        if (text.toLowerCase().includes('cry') || text.toLowerCase().includes('crying')) {
          // Add crying sounds with varying intensity
          if (intensity >= 8) {
            enhancedText = enhancedText.replace(/cry/gi, 'cry... *sob* *sob*');
            enhancedText = enhancedText.replace(/crying/gi, 'crying... *waaah* *sniff*');
          } else if (intensity >= 6) {
            enhancedText = enhancedText.replace(/cry/gi, 'cry... *sniff*');
            enhancedText = enhancedText.replace(/crying/gi, 'crying... *sob*');
          } else {
            enhancedText = enhancedText.replace(/cry/gi, 'cry softly');
          }
        }
        // Add sighs and pauses for general sadness
        if (intensity >= 7) {
          enhancedText = `*sigh* ${enhancedText}`;
        }
        break;
        
      case 'angry':
        if (intensity >= 7) {
          enhancedText = enhancedText.replace(/!/g, '! *grumble*');
          enhancedText = `*frustrated growl* ${enhancedText}`;
        } else if (intensity >= 5) {
          enhancedText = enhancedText.replace(/\./g, '... *huff*');
        }
        break;
        
      case 'fear':
        if (intensity >= 7) {
          enhancedText = `*gasp* ${enhancedText} *nervous breathing*`;
        } else if (intensity >= 5) {
          enhancedText = `${enhancedText} *worried sigh*`;
        }
        break;
        
      case 'excitement':
      case 'happy':
        if (intensity >= 7) {
          enhancedText = enhancedText.replace(/!/g, '! *giggle*');
          enhancedText = `*cheerfully* ${enhancedText}`;
        } else if (intensity >= 5) {
          enhancedText = `*happily* ${enhancedText}`;
        }
        break;
        
      case 'surprise':
        if (intensity >= 6) {
          enhancedText = `*gasp* Oh! ${enhancedText}`;
        } else {
          enhancedText = `Oh... ${enhancedText}`;
        }
        break;
    }
    
    // Add character-specific expressions
    if (text.includes('mother') || text.includes('Mother')) {
      enhancedText = enhancedText.replace(/said/g, 'said gently');
    }
    
    // Add dramatic pauses for high-intensity emotions
    if (intensity >= 8) {
      enhancedText = enhancedText.replace(/\./g, '... *pause* .');
    }
    
    return enhancedText;
  }

  private getEmotionalSpeed(emotion: string, intensity: number): number {
    let baseSpeed = 1.0;
    
    switch (emotion) {
      case 'sad':
        // Slower speech when sad
        baseSpeed = intensity >= 7 ? 0.7 : 0.85;
        break;
      case 'angry':
        // Faster, more intense speech when angry
        baseSpeed = intensity >= 7 ? 1.3 : 1.15;
        break;
      case 'fear':
        // Rapid, nervous speech when scared
        baseSpeed = intensity >= 7 ? 1.4 : 1.2;
        break;
      case 'excitement':
      case 'happy':
        // Slightly faster, energetic speech
        baseSpeed = intensity >= 7 ? 1.2 : 1.1;
        break;
      case 'surprise':
        // Quick, startled speech
        baseSpeed = intensity >= 6 ? 1.3 : 1.1;
        break;
      default:
        baseSpeed = 1.0;
    }
    
    return Math.max(0.5, Math.min(2.0, baseSpeed)); // Clamp between 0.5x and 2.0x
  }

  private getStoredVoiceForCharacter(speakingCharacter: any, storyCharacters: any[]): string {
    // Use stored voice assignment from analysis if available
    if (speakingCharacter && speakingCharacter.name) {
      const storedCharacter = storyCharacters.find(char => 
        char.name.toLowerCase() === speakingCharacter.name.toLowerCase()
      );
      
      if (storedCharacter && storedCharacter.assignedVoice) {
        return storedCharacter.assignedVoice;
      }
    }
    
    // Fallback to character-specific voice mapping
    if (speakingCharacter && speakingCharacter.name) {
      const characterVoiceMap: { [key: string]: string } = {
        'Boy': 'echo',        // Higher, younger male voice
        'Mother': 'fable',    // Mature, warmer female voice
        'Father': 'onyx',     // Deep, authoritative male voice
        'Girl': 'shimmer',    // Light, young female voice
      };
      
      const nameKey = Object.keys(characterVoiceMap).find(key => 
        key.toLowerCase() === speakingCharacter.name.toLowerCase()
      );
      if (nameKey) {
        return characterVoiceMap[nameKey];
      }
    }
    
    // Default narrator voice
    return 'alloy';
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