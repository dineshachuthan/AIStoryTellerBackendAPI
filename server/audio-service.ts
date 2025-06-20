import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { getCachedAudio, cacheAudio } from './content-cache';

export interface AudioGenerationOptions {
  text: string;
  emotion: string;
  intensity: number;
  voice?: string;
  userId?: string;
  storyId?: number;
  characters?: any[];
}

export interface AudioResult {
  audioUrl: string;
  isUserGenerated: boolean;
  voice: string;
}

export class AudioService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Select voice based on emotion, character context, and gender
  private selectEmotionVoice(emotion: string, intensity: number, characters?: any[]): string {
    // Voice mapping based on emotion and character context
    const emotionVoiceMap: { [key: string]: string[] } = {
      joy: ['nova', 'shimmer'],
      happiness: ['nova', 'shimmer'],
      excitement: ['shimmer', 'nova'],
      sadness: ['onyx', 'fable'],
      grief: ['onyx', 'fable'],
      melancholy: ['fable', 'onyx'],
      anger: ['onyx', 'echo'],
      rage: ['onyx', 'echo'],
      fear: ['echo', 'fable'],
      anxiety: ['echo', 'fable'],
      surprise: ['shimmer', 'nova'],
      shock: ['echo', 'onyx'],
      disgust: ['onyx', 'echo'],
      love: ['nova', 'shimmer'],
      trust: ['alloy', 'nova'],
      anticipation: ['shimmer', 'echo'],
      curiosity: ['shimmer', 'alloy'],
      wisdom: ['fable', 'alloy'],
      irony: ['echo', 'fable'],
      freedom: ['nova', 'shimmer'],
      despair: ['onyx', 'fable']
    };

    // Get voices for this emotion or default
    const emotionVoices = emotionVoiceMap[emotion.toLowerCase()] || ['alloy', 'echo'];
    
    // If we have character context, consider gender
    if (characters && characters.length > 0) {
      const character = characters[0]; // Use first character for voice selection
      const description = character.description?.toLowerCase() || '';
      const appearance = character.appearance?.toLowerCase() || '';
      
      // Simple gender detection
      const isFemale = description.includes('woman') || description.includes('girl') || 
                      description.includes('female') || description.includes('she') ||
                      appearance.includes('woman') || appearance.includes('girl');
      
      const isMale = description.includes('man') || description.includes('boy') || 
                    description.includes('male') || description.includes('he') ||
                    appearance.includes('man') || appearance.includes('boy');
      
      // Prefer female voices for female characters
      if (isFemale) {
        const femaleVoices = emotionVoices.filter(v => ['nova', 'shimmer', 'alloy'].includes(v));
        if (femaleVoices.length > 0) {
          return femaleVoices[0];
        }
      }
      
      // Prefer male voices for male characters
      if (isMale) {
        const maleVoices = emotionVoices.filter(v => ['onyx', 'echo', 'fable'].includes(v));
        if (maleVoices.length > 0) {
          return maleVoices[0];
        }
      }
    }
    
    // Default to first voice for emotion, with intensity consideration
    if (intensity >= 8) {
      return emotionVoices[0]; // More expressive voice for high intensity
    } else {
      return emotionVoices[emotionVoices.length - 1]; // Calmer voice for lower intensity
    }
  }

  // Create emotion-appropriate text
  private createEmotionText(originalText: string, emotion: string, intensity: number): string {
    // For very short texts, return as-is to avoid over-processing
    if (originalText.length < 50) {
      return originalText;
    }
    
    // Add subtle emotional context without being too heavy-handed
    const emotionPrefixes: { [key: string]: string[] } = {
      joy: ['With a sense of joy,', 'Happily,', 'With delight,'],
      sadness: ['With a heavy heart,', 'Sadly,', 'With sorrow,'],
      anger: ['With frustration,', 'Angrily,', 'With irritation,'],
      fear: ['With trepidation,', 'Fearfully,', 'With anxiety,'],
      surprise: ['Suddenly,', 'Unexpectedly,', 'With surprise,'],
      disgust: ['With distaste,', 'Reluctantly,', 'With aversion,'],
      anticipation: ['With anticipation,', 'Eagerly,', 'With expectation,'],
      trust: ['With confidence,', 'Trustingly,', 'With assurance,']
    };
    
    // Only add prefix for higher intensity emotions
    if (intensity >= 7 && emotionPrefixes[emotion.toLowerCase()]) {
      const prefixes = emotionPrefixes[emotion.toLowerCase()];
      const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      return `${randomPrefix} ${originalText}`;
    }
    
    return originalText;
  }

  // Get emotion-appropriate speech speed
  private getEmotionSpeed(emotion: string, intensity: number): number {
    const baseSpeed = 1.0;
    const speedMap: { [key: string]: number } = {
      excitement: 1.2,
      joy: 1.1,
      anger: 1.15,
      fear: 0.9,
      sadness: 0.8,
      melancholy: 0.85,
      grief: 0.7,
      wisdom: 0.9,
      anticipation: 1.1,
      shock: 0.95,
      surprise: 1.05
    };
    
    const emotionSpeed = speedMap[emotion.toLowerCase()] || baseSpeed;
    
    // Adjust based on intensity (higher intensity = slightly faster)
    const intensityAdjustment = (intensity - 5) * 0.02; // -0.08 to +0.1
    
    return Math.max(0.5, Math.min(2.0, emotionSpeed + intensityAdjustment));
  }

  // Check for user-recorded voice override
  private async getUserVoiceOverride(userId: string, emotion: string, intensity: number, storyId?: number): Promise<string | null> {
    if (!userId) return null;
    
    const userVoiceDir = path.join(process.cwd(), 'persistent-cache', 'user-voice-samples');
    
    try {
      const files = await fs.readdir(userVoiceDir);
      
      // Look for story-specific voice first, then general emotion voice
      const patterns = storyId ? 
        [`${userId}-${storyId}-${emotion}-${intensity}-`, `${userId}-${emotion}-${intensity}-`] :
        [`${userId}-${emotion}-${intensity}-`];
      
      for (const pattern of patterns) {
        const matchingFiles = files.filter(file => 
          file.startsWith(pattern) && file.endsWith('.mp3')
        );
        
        if (matchingFiles.length > 0) {
          // Get the most recent file by timestamp
          const latestFile = matchingFiles.sort((a, b) => {
            const getTimestamp = (filename: string) => {
              const parts = filename.split('-');
              const lastPart = parts[parts.length - 1];
              return parseInt(lastPart.split('.')[0] || '0');
            };
            return getTimestamp(b) - getTimestamp(a);
          })[0];
          
          return `/api/emotions/user-voice-sample/${latestFile}`;
        }
      }
    } catch (error) {
      console.log('No user voice samples found');
    }
    
    return null;
  }

  // Generate AI audio
  private async generateAIAudio(options: AudioGenerationOptions): Promise<Buffer> {
    const selectedVoice = options.voice || this.selectEmotionVoice(options.emotion, options.intensity, options.characters);
    const emotionText = this.createEmotionText(options.text, options.emotion, options.intensity);
    
    const response = await this.openai.audio.speech.create({
      model: "tts-1",
      voice: selectedVoice as any,
      input: emotionText,
      speed: this.getEmotionSpeed(options.emotion, options.intensity),
    });

    return Buffer.from(await response.arrayBuffer());
  }

  // Cache audio file
  private async cacheAudioFile(buffer: Buffer, options: AudioGenerationOptions, voice: string): Promise<string> {
    const cacheDir = path.join(process.cwd(), 'persistent-cache', 'audio');
    await fs.mkdir(cacheDir, { recursive: true });
    
    const fileName = `emotion-${options.emotion}-${options.intensity}-${Date.now()}.mp3`;
    const filePath = path.join(cacheDir, fileName);
    
    await fs.writeFile(filePath, buffer);
    
    const metadata = {
      text: options.text,
      voice,
      emotion: options.emotion,
      intensity: options.intensity,
      fileName,
      timestamp: Date.now(),
      fileSize: buffer.length,
    };
    
    const metadataPath = path.join(cacheDir, `${fileName}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    return fileName;
  }

  // Main method to generate or retrieve audio
  async generateEmotionAudio(options: AudioGenerationOptions): Promise<AudioResult> {
    // Check for user voice override first
    const userVoiceUrl = await this.getUserVoiceOverride(options.userId || '', options.emotion, options.intensity, options.storyId);
    if (userVoiceUrl) {
      return {
        audioUrl: userVoiceUrl,
        isUserGenerated: true,
        voice: 'user'
      };
    }

    const selectedVoice = options.voice || this.selectEmotionVoice(options.emotion, options.intensity, options.characters);

    // Check cache for AI-generated audio
    const cachedAudio = getCachedAudio(options.text, selectedVoice, options.emotion, options.intensity);
    if (cachedAudio) {
      return {
        audioUrl: `/api/emotions/cached-audio/${path.basename(cachedAudio)}`,
        isUserGenerated: false,
        voice: selectedVoice
      };
    }

    // Generate new AI audio
    const buffer = await this.generateAIAudio(options);
    const fileName = await this.cacheAudioFile(buffer, options, selectedVoice);
    
    return {
      audioUrl: `/api/emotions/cached-audio/${fileName}`,
      isUserGenerated: false,
      voice: selectedVoice
    };
  }

  // Get audio buffer for direct streaming
  async getAudioBuffer(options: AudioGenerationOptions): Promise<{ buffer: Buffer; voice: string }> {
    const selectedVoice = options.voice || this.selectEmotionVoice(options.emotion, options.intensity, options.characters);

    // Check cache first
    const cachedAudio = getCachedAudio(options.text, selectedVoice, options.emotion, options.intensity);
    if (cachedAudio) {
      const filePath = path.join(process.cwd(), 'persistent-cache', 'audio', path.basename(cachedAudio));
      const buffer = await fs.readFile(filePath);
      return { buffer, voice: selectedVoice };
    }

    // Generate new audio
    const buffer = await this.generateAIAudio(options);
    await this.cacheAudioFile(buffer, options, selectedVoice);
    
    return { buffer, voice: selectedVoice };
  }
}

export const audioService = new AudioService();