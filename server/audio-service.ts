import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { getCachedAudio, cacheAudio } from './content-cache';
import { pool } from './db';

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

  // Select voice based on character consistency first, then gender and emotion context
  // Check if user has any voice emotions in repository
  private async hasAnyUserVoiceEmotions(userId: string): Promise<boolean> {
    if (!userId) return false;
    
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM user_voice_emotions 
        WHERE user_id = $1
      `, [userId]);
      
      return parseInt(result.rows[0]?.count || '0') > 0;
    } catch (error) {
      console.error('Error checking user voice emotions:', error);
      return false;
    }
  }

  // Get user voice for specific emotion (with fallback to any user voice)
  private async getUserVoiceForEmotion(userId: string, emotion: string, intensity: number): Promise<{ audioUrl: string } | null> {
    if (!userId) return null;
    
    try {
      // First try exact emotion match
      let result = await pool.query(`
        SELECT audio_url, usage_count 
        FROM user_voice_emotions 
        WHERE user_id = $1 AND emotion = $2 
        ORDER BY ABS(intensity - $3), created_at DESC 
        LIMIT 1
      `, [userId, emotion, intensity]);
      
      if (result.rows.length > 0) {
        // Update usage count
        await pool.query(`
          UPDATE user_voice_emotions 
          SET usage_count = usage_count + 1, last_used_at = NOW() 
          WHERE user_id = $1 AND emotion = $2
        `, [userId, emotion]);
        
        return { audioUrl: result.rows[0].audio_url };
      }
      
      // Fallback to any user voice (most recently used)
      result = await pool.query(`
        SELECT audio_url 
        FROM user_voice_emotions 
        WHERE user_id = $1 
        ORDER BY last_used_at DESC, created_at DESC 
        LIMIT 1
      `, [userId]);
      
      if (result.rows.length > 0) {
        console.log(`Using fallback user voice for emotion: ${emotion}`);
        return { audioUrl: result.rows[0].audio_url };
      }
      
    } catch (error) {
      console.error('Error getting user voice emotion:', error);
    }
    
    return null;
  }

  // Select character-level voice (consistent per character)
  private selectCharacterVoice(characters?: any[]): string {
    if (characters && characters.length > 0) {
      const character = characters[0];
      if (character.assignedVoice) {
        return character.assignedVoice;
      }
    }
    
    // Default voice if no character voice assigned
    return 'alloy';
  }

  private selectEmotionVoice(emotion: string, intensity: number, characters?: any[]): string {
    // Priority 1: Use character's assigned voice from analysis if available
    if (characters && characters.length > 0) {
      const character = characters[0]; // Primary character for this emotion
      if (character.assignedVoice) {
        console.log(`Using character assigned voice: ${character.assignedVoice} for ${character.name} (emotion: ${emotion})`);
        return character.assignedVoice;
      }
      
      // Priority 2: Assign consistent voice based on character gender/role
      const description = character.description?.toLowerCase() || '';
      const appearance = character.appearance?.toLowerCase() || '';
      const name = character.name?.toLowerCase() || '';
      
      // Gender detection for voice consistency
      const isFemale = description.includes('woman') || description.includes('girl') || 
                      description.includes('female') || description.includes('she') ||
                      appearance.includes('woman') || appearance.includes('girl') ||
                      name.includes('louise') || name.includes('mary') || name.includes('anna');
      
      const isMale = description.includes('man') || description.includes('boy') || 
                    description.includes('male') || description.includes('he') ||
                    appearance.includes('man') || appearance.includes('boy');
      
      // Assign consistent character voice based on gender and role
      if (isFemale) {
        // Female character voices - consistent assignment
        if (character.role === 'protagonist') return 'nova';
        if (character.role === 'antagonist') return 'shimmer';
        return 'alloy'; // Supporting female characters
      }
      
      if (isMale) {
        // Male character voices - consistent assignment
        if (character.role === 'protagonist') return 'onyx';
        if (character.role === 'antagonist') return 'echo';
        return 'fable'; // Supporting male characters
      }
      
      // Default protagonist/antagonist assignment if gender unclear
      if (character.role === 'protagonist') return 'nova';
      if (character.role === 'antagonist') return 'echo';
    }
    
    // Priority 3: Fallback to emotion-appropriate voice (only if no character context)
    const emotionDefaults: { [key: string]: string } = {
      joy: 'nova',
      happiness: 'nova',
      excitement: 'shimmer',
      sadness: 'alloy',
      grief: 'alloy',
      melancholy: 'fable',
      anger: 'onyx',
      rage: 'onyx',
      fear: 'echo',
      anxiety: 'echo',
      surprise: 'shimmer',
      shock: 'echo',
      disgust: 'onyx',
      love: 'nova',
      trust: 'alloy',
      anticipation: 'shimmer',
      curiosity: 'shimmer',
      wisdom: 'fable',
      irony: 'echo',
      freedom: 'nova',
      despair: 'alloy'
    };

    return emotionDefaults[emotion.toLowerCase()] || 'alloy';
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

  // Get emotion-appropriate speech speed with dynamic modulation
  private getEmotionSpeed(emotion: string, intensity: number): number {
    const baseSpeed = 1.0;
    
    // Comprehensive emotion-to-speed mapping
    const speedMap: { [key: string]: number } = {
      // High energy emotions (faster)
      excitement: 1.25,
      joy: 1.15,
      happiness: 1.1,
      enthusiasm: 1.2,
      anger: 1.2,
      rage: 1.3,
      panic: 1.4,
      shock: 1.1,
      surprise: 1.15,
      anticipation: 1.1,
      
      // Medium energy emotions (normal to slightly varied)
      hope: 1.05,
      love: 0.95,
      contentment: 0.95,
      confusion: 0.9,
      curiosity: 1.05,
      trust: 0.98,
      acceptance: 0.95,
      
      // Low energy emotions (slower)
      sadness: 0.8,
      melancholy: 0.82,
      grief: 0.7,
      despair: 0.75,
      disappointment: 0.85,
      fear: 0.88,
      worry: 0.9,
      regret: 0.85,
      guilt: 0.87,
      shame: 0.8,
      loneliness: 0.82,
      nostalgia: 0.85,
      
      // Neutral/contemplative emotions
      neutral: 1.0,
      calm: 0.92,
      peace: 0.9,
      wisdom: 0.88,
      thoughtfulness: 0.9,
      reflection: 0.88
    };
    
    const emotionSpeed = speedMap[emotion.toLowerCase()] || baseSpeed;
    
    // Dynamic intensity adjustment - more nuanced than linear
    let intensityAdjustment = 0;
    if (intensity <= 3) {
      // Low intensity - slower and more subdued
      intensityAdjustment = -0.1 + (intensity * 0.02);
    } else if (intensity >= 8) {
      // High intensity - faster and more energetic
      intensityAdjustment = 0.05 + ((intensity - 8) * 0.03);
    } else {
      // Medium intensity - slight variation
      intensityAdjustment = (intensity - 5) * 0.015;
    }
    
    const finalSpeed = emotionSpeed + intensityAdjustment;
    
    // Clamp to reasonable bounds
    return Math.max(0.6, Math.min(1.8, finalSpeed));
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

  // Generate AI audio with dynamic emotion modulation
  private async generateAIAudio(options: AudioGenerationOptions): Promise<Buffer> {
    const selectedVoice = options.voice || this.selectCharacterVoice(options.characters);
    const emotionText = this.createEmotionText(options.text, options.emotion, options.intensity);
    const emotionSpeed = this.getEmotionSpeed(options.emotion, options.intensity);
    
    console.log(`Generating modulated audio: voice=${selectedVoice}, emotion=${options.emotion}, intensity=${options.intensity}, speed=${emotionSpeed}`);
    
    const response = await this.openai.audio.speech.create({
      model: "tts-1",
      voice: selectedVoice as any,
      input: emotionText,
      speed: emotionSpeed,
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

  // Detect which character is speaking based on emotion context
  private detectCharacterFromEmotion(text: string, emotion: string, characters?: any[]): any | null {
    if (!characters || characters.length === 0) return null;

    const lowerText = text.toLowerCase();
    
    // Specific character detection with priority order
    
    // Check for Mr. Mallard / husband references first
    if (lowerText.includes('mr. mallard') || lowerText.includes('mr mallard') || 
        lowerText.includes('husband') || lowerText.includes('him ') || 
        lowerText.includes('he ') || lowerText.includes('his ')) {
      const maleCharacter = characters.find(c => 
        c.name.toLowerCase().includes('mr.') || 
        c.description?.toLowerCase().includes('husband') ||
        c.description?.toLowerCase().includes('male')
      );
      if (maleCharacter) {
        console.log(`Character detected - Male: ${maleCharacter.name} (assigned voice: ${maleCharacter.assignedVoice})`);
        return maleCharacter;
      }
    }

    // Check for Louise Mallard / wife references
    if (lowerText.includes('louise mallard') || lowerText.includes('louise') ||
        lowerText.includes('wife') || lowerText.includes('woman') || 
        lowerText.includes('her ') || lowerText.includes('she ')) {
      const femaleCharacter = characters.find(c => 
        c.name.toLowerCase().includes('louise') || 
        c.description?.toLowerCase().includes('woman') ||
        c.description?.toLowerCase().includes('wife')
      );
      if (femaleCharacter) {
        console.log(`Character detected - Female: ${femaleCharacter.name} (assigned voice: ${femaleCharacter.assignedVoice})`);
        return femaleCharacter;
      }
    }

    // Generic "Mallard" - prefer protagonist (Louise)
    if (lowerText.includes('mallard')) {
      const protagonist = characters.find(c => c.role === 'protagonist');
      if (protagonist) {
        console.log(`Character detected - Protagonist: ${protagonist.name} (assigned voice: ${protagonist.assignedVoice})`);
        return protagonist;
      }
    }

    // Direct full name matching as fallback
    for (const character of characters) {
      const fullName = character.name.toLowerCase();
      if (lowerText.includes(fullName)) {
        console.log(`Character detected by full name: ${character.name} (assigned voice: ${character.assignedVoice})`);
        return character;
      }
    }

    // Default to protagonist if no specific match
    const protagonist = characters.find(c => c.role === 'protagonist') || characters[0];
    console.log(`Using default protagonist: ${protagonist?.name} (assigned voice: ${protagonist?.assignedVoice})`);
    return protagonist;
  }

  // Main method to generate or retrieve audio with simplified voice logic
  async generateEmotionAudio(options: AudioGenerationOptions): Promise<AudioResult> {
    const userId = options.userId || '';
    
    // Check if user has any voice emotions in their repository
    const hasUserVoices = await this.hasAnyUserVoiceEmotions(userId);
    
    if (hasUserVoices) {
      // User has voice samples - use user voice for all emotions
      const userVoiceResult = await this.getUserVoiceForEmotion(userId, options.emotion, options.intensity);
      if (userVoiceResult) {
        return {
          audioUrl: userVoiceResult.audioUrl,
          isUserGenerated: true,
          voice: 'user-emotion-repository'
        };
      }
    }

    // No user voices exist - use character-level AI voice
    const speakingCharacter = this.detectCharacterFromEmotion(options.text, options.emotion, options.characters);
    const characterArray = speakingCharacter ? [speakingCharacter] : options.characters;
    const selectedVoice = options.voice || this.selectCharacterVoice(characterArray);

    // Try cache first
    try {
      const cachedAudio = getCachedAudio(options.text, selectedVoice, options.emotion, options.intensity);
      if (cachedAudio) {
        const filePath = path.join(process.cwd(), 'persistent-cache', 'audio', path.basename(cachedAudio));
        try {
          await fs.access(filePath);
          return {
            audioUrl: `/api/emotions/cached-audio/${path.basename(cachedAudio)}`,
            isUserGenerated: false,
            voice: selectedVoice
          };
        } catch (fileError) {
          console.warn("Cached audio file missing, generating from source");
        }
      }
    } catch (cacheError) {
      console.warn("Cache read failed, generating from source:", cacheError);
    }

    // Generate new character-level AI audio
    const updatedOptions = { ...options, characters: characterArray };
    const buffer = await this.generateAIAudio(updatedOptions);
    const fileName = await this.cacheAudioFile(buffer, updatedOptions, selectedVoice);
    const audioUrl = `/api/emotions/cached-audio/${fileName}`;
    
    // Update cache
    try {
      await cacheAudio(options.text, selectedVoice, audioUrl, options.emotion, options.intensity);
    } catch (cacheUpdateError) {
      console.warn("Failed to update cache:", cacheUpdateError);
    }
    
    return {
      audioUrl,
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