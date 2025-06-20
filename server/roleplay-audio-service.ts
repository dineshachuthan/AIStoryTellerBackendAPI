import OpenAI from "openai";
import { withRetry } from "./db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RolePlayVoiceConfig {
  openaiVoice: 'alloy' | 'echo' | 'fable' | 'nova' | 'onyx' | 'shimmer';
  speed: number; // 0.25 to 4.0
  pitch?: string; // for modulation description
  characterType: 'male' | 'female' | 'child' | 'elderly' | 'animal' | 'narrator' | 'other';
}

export interface RolePlayAudioResult {
  audioUrl: string;
  voiceConfig: RolePlayVoiceConfig;
  characterName: string;
  duration: number;
}

export class RolePlayAudioService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // Assign voice based on character attributes
  getCharacterVoiceConfig(
    characterName: string,
    personality: string,
    role: string,
    description?: string
  ): RolePlayVoiceConfig {
    const lowerName = characterName.toLowerCase();
    const lowerPersonality = personality.toLowerCase();
    const lowerDescription = (description || '').toLowerCase();
    const combined = `${lowerName} ${lowerPersonality} ${lowerDescription}`;

    // Animal characters
    if (this.isAnimalCharacter(combined)) {
      return {
        openaiVoice: 'fable',
        speed: 1.1,
        pitch: 'varied for animal sounds',
        characterType: 'animal'
      };
    }

    // Child characters
    if (this.isChildCharacter(combined)) {
      return {
        openaiVoice: 'alloy',
        speed: 1.2,
        pitch: 'higher pitch for youth',
        characterType: 'child'
      };
    }

    // Elderly characters
    if (this.isElderlyCharacter(combined)) {
      return {
        openaiVoice: 'echo',
        speed: 0.9,
        pitch: 'slower, more deliberate',
        characterType: 'elderly'
      };
    }

    // Female characters
    if (this.isFemaleCharacter(combined)) {
      const femaleVoices: ('nova' | 'shimmer')[] = ['nova', 'shimmer'];
      const selectedVoice = femaleVoices[Math.floor(Math.random() * femaleVoices.length)];
      return {
        openaiVoice: selectedVoice,
        speed: 1.0,
        pitch: 'natural female range',
        characterType: 'female'
      };
    }

    // Male characters (default for most protagonists/antagonists)
    const maleVoices: ('onyx' | 'echo')[] = ['onyx', 'echo'];
    const selectedVoice = maleVoices[Math.floor(Math.random() * maleVoices.length)];
    
    return {
      openaiVoice: selectedVoice,
      speed: 1.0,
      pitch: 'natural male range',
      characterType: 'male'
    };
  }

  // Character type detection methods
  private isAnimalCharacter(text: string): boolean {
    const animalKeywords = [
      'dog', 'cat', 'bird', 'horse', 'lion', 'tiger', 'bear', 'wolf',
      'rabbit', 'fox', 'deer', 'elephant', 'mouse', 'rat', 'pig',
      'cow', 'sheep', 'goat', 'duck', 'chicken', 'owl', 'eagle',
      'animal', 'creature', 'beast', 'pet', 'wild'
    ];
    return animalKeywords.some(keyword => text.includes(keyword));
  }

  private isChildCharacter(text: string): boolean {
    const childKeywords = [
      'child', 'kid', 'boy', 'girl', 'young', 'little', 'small',
      'youth', 'teenager', 'adolescent', 'juvenile', 'minor',
      'student', 'pupil', 'baby', 'toddler', 'infant'
    ];
    return childKeywords.some(keyword => text.includes(keyword));
  }

  private isElderlyCharacter(text: string): boolean {
    const elderlyKeywords = [
      'old', 'elderly', 'aged', 'senior', 'grandfather', 'grandmother',
      'grandpa', 'grandma', 'ancient', 'wise', 'elder', 'patriarch',
      'matriarch', 'veteran', 'retired', 'grey', 'gray', 'wrinkled'
    ];
    return elderlyKeywords.some(keyword => text.includes(keyword));
  }

  private isFemaleCharacter(text: string): boolean {
    const femaleKeywords = [
      'woman', 'lady', 'girl', 'female', 'mother', 'mom', 'sister',
      'daughter', 'wife', 'aunt', 'grandmother', 'grandma', 'queen',
      'princess', 'duchess', 'maiden', 'miss', 'mrs', 'she', 'her'
    ];
    const femaleNames = [
      'emma', 'sophia', 'olivia', 'ava', 'isabella', 'mia', 'charlotte',
      'amelia', 'harper', 'evelyn', 'abigail', 'emily', 'ella', 'elizabeth',
      'camila', 'luna', 'sofia', 'avery', 'mila', 'aria', 'scarlett',
      'penelope', 'layla', 'chloe', 'victoria', 'madison', 'eleanor',
      'grace', 'nora', 'riley', 'zoey', 'hannah', 'hazel', 'lily',
      'ellie', 'violet', 'lillian', 'zoe', 'stella', 'aurora', 'natalie',
      'bianca', 'louise', 'mary', 'anna', 'sarah', 'jessica', 'ashley'
    ];
    return femaleKeywords.some(keyword => text.includes(keyword)) ||
           femaleNames.some(name => text.includes(name));
  }

  // Generate audio for role play dialogue
  async generateRolePlayAudio(
    text: string,
    characterName: string,
    characterPersonality: string,
    characterRole: string,
    emotion: string,
    intensity: number,
    characterDescription?: string
  ): Promise<RolePlayAudioResult> {
    const voiceConfig = this.getCharacterVoiceConfig(
      characterName,
      characterPersonality,
      characterRole,
      characterDescription
    );

    // Adjust speed based on emotion and character type
    let adjustedSpeed = voiceConfig.speed;
    
    // Emotion-based speed adjustments
    switch (emotion.toLowerCase()) {
      case 'excited':
      case 'angry':
      case 'panicked':
        adjustedSpeed *= 1.2;
        break;
      case 'sad':
      case 'tired':
      case 'contemplative':
        adjustedSpeed *= 0.8;
        break;
      case 'dramatic':
        adjustedSpeed *= 0.9;
        break;
      default:
        // Keep base speed
        break;
    }

    // Intensity adjustments (higher intensity = more dramatic speed changes)
    const intensityFactor = intensity / 10;
    if (emotion.toLowerCase() === 'angry' || emotion.toLowerCase() === 'excited') {
      adjustedSpeed += (intensityFactor * 0.3);
    } else if (emotion.toLowerCase() === 'sad' || emotion.toLowerCase() === 'calm') {
      adjustedSpeed -= (intensityFactor * 0.2);
    }

    // Clamp speed to OpenAI limits
    adjustedSpeed = Math.max(0.25, Math.min(4.0, adjustedSpeed));

    // Create emotion-enhanced text for better delivery
    const enhancedText = this.enhanceTextForEmotion(text, emotion, intensity, voiceConfig.characterType);

    try {
      const response = await this.openai.audio.speech.create({
        model: "tts-1",
        voice: voiceConfig.openaiVoice,
        input: enhancedText,
        speed: adjustedSpeed,
      });

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      // Save audio file with character-specific naming
      const filename = `roleplay_${characterName.replace(/\s+/g, '_')}_${Date.now()}.mp3`;
      const audioUrl = await this.saveAudioFile(audioBuffer, filename);

      return {
        audioUrl,
        voiceConfig: {
          ...voiceConfig,
          speed: adjustedSpeed
        },
        characterName,
        duration: this.estimateAudioDuration(enhancedText, adjustedSpeed)
      };
    } catch (error) {
      console.error('Role play audio generation failed:', error);
      throw new Error(`Failed to generate audio for character ${characterName}`);
    }
  }

  // Enhance text delivery based on emotion and character type
  private enhanceTextForEmotion(
    text: string,
    emotion: string,
    intensity: number,
    characterType: string
  ): string {
    let enhanced = text;

    // Add character-specific speech patterns
    switch (characterType) {
      case 'animal':
        // Add subtle animal-like inflections for animal characters
        if (text.includes('!')) {
          enhanced = text.replace(/!/g, ' woof!').replace(/\?/g, ' meow?');
        }
        break;
      case 'elderly':
        // Add pauses for elderly characters
        enhanced = text.replace(/\./g, '... ').replace(/,/g, ', ');
        break;
      case 'child':
        // Make child speech more energetic
        enhanced = text.replace(/\./g, '! ');
        break;
    }

    // Emotion-based enhancements
    switch (emotion.toLowerCase()) {
      case 'angry':
        if (intensity >= 7) {
          enhanced = enhanced.toUpperCase();
        }
        break;
      case 'whisper':
      case 'secretive':
        enhanced = `(whispered) ${enhanced}`;
        break;
      case 'dramatic':
        enhanced = enhanced.replace(/\./g, '...');
        break;
      case 'questioning':
        if (!enhanced.includes('?')) {
          enhanced += '?';
        }
        break;
    }

    return enhanced;
  }

  // Save audio file to storage
  private async saveAudioFile(audioBuffer: Buffer, filename: string): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const audioDir = path.join(process.cwd(), 'persistent-cache', 'roleplay-audio');
    await fs.mkdir(audioDir, { recursive: true });
    
    const filePath = path.join(audioDir, filename);
    await fs.writeFile(filePath, audioBuffer);
    
    return `/cache/roleplay-audio/${filename}`;
  }

  // Estimate audio duration based on text length and speed
  private estimateAudioDuration(text: string, speed: number): number {
    // Rough estimation: average speaking rate is ~150 words per minute
    const wordCount = text.split(/\s+/).length;
    const baseMinutes = wordCount / 150;
    const adjustedMinutes = baseMinutes / speed;
    return Math.round(adjustedMinutes * 60); // Convert to seconds
  }

  // Generate audio for entire scene
  async generateSceneAudio(
    dialogues: Array<{
      characterName: string;
      dialogue: string;
      emotion: string;
      intensity: number;
      characterPersonality: string;
      characterRole: string;
      characterDescription?: string;
    }>
  ): Promise<RolePlayAudioResult[]> {
    const audioResults: RolePlayAudioResult[] = [];

    for (const dialogue of dialogues) {
      const audioResult = await this.generateRolePlayAudio(
        dialogue.dialogue,
        dialogue.characterName,
        dialogue.characterPersonality,
        dialogue.characterRole,
        dialogue.emotion,
        dialogue.intensity,
        dialogue.characterDescription
      );
      
      audioResults.push(audioResult);
      
      // Add small delay between API calls to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return audioResults;
  }
}

export const rolePlayAudioService = new RolePlayAudioService();