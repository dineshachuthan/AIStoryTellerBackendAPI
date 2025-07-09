import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { getCachedAudio, cacheAudio } from './cache/cache-service';
import { pool } from './db';

export interface NarratorProfile {
  language: string; // Language for narration (en, ta, hi)
  locale?: string; // Where you live (en-US, en-IN, etc)
  nativeLanguage?: string; // Your mother tongue that influences accent (ta, hi, etc)
}

export interface AudioGenerationOptions {
  text: string;
  emotion: string;
  intensity: number;
  voice?: string;
  userId?: string;
  storyId?: number;
  characters?: any[];
  narratorProfile?: NarratorProfile; // Complete narrator personality
  conversationStyle?: string; // For multi-dimensional caching
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    prosody?: {
      pitch?: string;
      rate?: string;
      volume?: string;
    };
  };
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

  // Get user's language preference from database
  private async getUserLanguage(userId: string): Promise<string> {
    if (!userId) return 'en';
    
    try {
      const result = await pool.query(`
        SELECT language 
        FROM users 
        WHERE id = $1
      `, [userId]);
      
      return result.rows[0]?.language || 'en';
    } catch (error) {
      console.error('Error fetching user language:', error);
      return 'en';
    }
  }

  // Get user voice for specific emotion with character-aware modulation
  private async getUserVoiceForEmotion(userId: string, emotion: string, intensity: number, character?: any): Promise<{ audioUrl: string; voiceModulation?: any } | null> {
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
        
        return { 
          audioUrl: result.rows[0].audio_url,
          voiceModulation: this.getCharacterModulation(character, emotion, intensity)
        };
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
        console.log(`Using fallback user voice for emotion: ${emotion} with character modulation`);
        return { 
          audioUrl: result.rows[0].audio_url,
          voiceModulation: this.getCharacterModulation(character, emotion, intensity)
        };
      }
      
    } catch (error) {
      console.error('Error getting user voice emotion:', error);
    }
    
    return null;
  }

  // Get character-specific voice modulation parameters
  private getCharacterModulation(character: any, emotion: string, intensity: number): any {
    if (!character) return null;
    
    const modulation = {
      pitchShift: 0,
      speedAdjustment: this.getEmotionSpeed(emotion, intensity),
      toneAdjustment: 'normal',
      characterType: 'human'
    };

    const characterName = character.name?.toLowerCase() || '';
    const characterDesc = character.description?.toLowerCase() || '';
    const characterTraits = character.traits?.map((t: string) => t.toLowerCase()) || [];

    // Animal character modulations
    if (this.isAnimalCharacter(characterName, characterDesc, characterTraits)) {
      modulation.characterType = 'animal';
      
      // Specific animal voice adjustments
      if (characterName.includes('dog') || characterDesc.includes('dog')) {
        modulation.pitchShift = 0.1; // Slightly higher pitch
        modulation.toneAdjustment = 'energetic';
      } else if (characterName.includes('cat') || characterDesc.includes('cat')) {
        modulation.pitchShift = 0.15; // Higher pitch, more refined
        modulation.toneAdjustment = 'smooth';
      } else if (characterName.includes('lion') || characterDesc.includes('lion')) {
        modulation.pitchShift = -0.2; // Lower, more powerful
        modulation.toneAdjustment = 'commanding';
      } else if (characterName.includes('bird') || characterDesc.includes('bird')) {
        modulation.pitchShift = 0.3; // Much higher pitch
        modulation.toneAdjustment = 'bright';
      } else {
        // Generic animal modulation
        modulation.pitchShift = 0.05;
        modulation.toneAdjustment = 'natural';
      }
    }
    // Age-based modulations
    else if (this.isChildCharacter(characterName, characterDesc, characterTraits)) {
      modulation.characterType = 'child';
      modulation.pitchShift = 0.2; // Higher pitch for children
      modulation.speedAdjustment *= 1.1; // Slightly faster
      modulation.toneAdjustment = 'youthful';
    }
    else if (this.isElderlyCharacter(characterName, characterDesc, characterTraits)) {
      modulation.characterType = 'elderly';
      modulation.pitchShift = -0.1; // Slightly lower pitch
      modulation.speedAdjustment *= 0.9; // Slower pace
      modulation.toneAdjustment = 'wise';
    }
    // Gender-based subtle modulations
    else if (this.isFemaleCharacter(characterName, characterDesc, characterTraits)) {
      modulation.characterType = 'female';
      modulation.pitchShift = 0.05; // Slightly higher
      modulation.toneAdjustment = 'feminine';
    }
    else if (this.isMaleCharacter(characterName, characterDesc, characterTraits)) {
      modulation.characterType = 'male';
      modulation.pitchShift = -0.05; // Slightly lower
      modulation.toneAdjustment = 'masculine';
    }

    // Personality-based fine-tuning
    if (characterTraits.includes('aggressive') || characterTraits.includes('angry')) {
      modulation.speedAdjustment *= 1.1;
      modulation.toneAdjustment = 'intense';
    } else if (characterTraits.includes('gentle') || characterTraits.includes('kind')) {
      modulation.speedAdjustment *= 0.95;
      modulation.toneAdjustment = 'soft';
    } else if (characterTraits.includes('wise') || characterTraits.includes('intelligent')) {
      modulation.speedAdjustment *= 0.92;
      modulation.toneAdjustment = 'thoughtful';
    }

    console.log(`Character modulation for ${character.name}: type=${modulation.characterType}, pitch=${modulation.pitchShift}, speed=${modulation.speedAdjustment}`);
    return modulation;
  }

  // Character type detection helpers
  private isAnimalCharacter(name: string, desc: string, traits: string[]): boolean {
    const animalIndicators = ['dog', 'cat', 'lion', 'tiger', 'bear', 'wolf', 'fox', 'bird', 'eagle', 'owl', 'horse', 'elephant', 'mouse', 'rabbit', 'deer', 'dragon', 'snake', 'fish', 'whale', 'dolphin'];
    return animalIndicators.some(animal => 
      name.includes(animal) || desc.includes(animal) || traits.some(trait => trait.includes(animal))
    );
  }

  private isChildCharacter(name: string, desc: string, traits: string[]): boolean {
    const childIndicators = ['child', 'kid', 'boy', 'girl', 'young', 'little', 'small', 'teenager', 'teen'];
    return childIndicators.some(indicator => 
      name.includes(indicator) || desc.includes(indicator) || traits.includes(indicator)
    );
  }

  private isElderlyCharacter(name: string, desc: string, traits: string[]): boolean {
    const elderlyIndicators = ['old', 'elderly', 'aged', 'grandfather', 'grandmother', 'grandpa', 'grandma', 'elder', 'senior', 'ancient'];
    return elderlyIndicators.some(indicator => 
      name.includes(indicator) || desc.includes(indicator) || traits.includes(indicator)
    );
  }

  private isFemaleCharacter(name: string, desc: string, traits: string[]): boolean {
    const femaleIndicators = ['woman', 'lady', 'girl', 'mother', 'daughter', 'sister', 'queen', 'princess', 'female', 'she', 'her'];
    return femaleIndicators.some(indicator => 
      name.includes(indicator) || desc.includes(indicator) || traits.includes(indicator)
    );
  }

  private isMaleCharacter(name: string, desc: string, traits: string[]): boolean {
    const maleIndicators = ['man', 'gentleman', 'boy', 'father', 'son', 'brother', 'king', 'prince', 'male', 'he', 'him'];
    return maleIndicators.some(indicator => 
      name.includes(indicator) || desc.includes(indicator) || traits.includes(indicator)
    );
  }

  // Detect which character is speaking based on text content and context
  private detectCharacterFromEmotion(text: string, emotion: string, characters: any[]): any {
    if (!characters || characters.length === 0) return null;
    
    const textLower = text.toLowerCase();
    
    // Look for character names mentioned in the text
    for (const character of characters) {
      const charName = character.name?.toLowerCase();
      if (charName && textLower.includes(charName)) {
        return character;
      }
    }
    
    // If no explicit character found, try to match by emotion context
    // For example, if emotion is "anger" and we have an aggressive character
    const emotionCharacterMap: { [key: string]: string[] } = {
      anger: ['aggressive', 'fierce', 'warrior', 'fighter'],
      joy: ['happy', 'cheerful', 'optimistic', 'bright'],
      sadness: ['melancholy', 'sorrowful', 'tragic', 'depressed'],
      fear: ['timid', 'scared', 'anxious', 'nervous'],
      wisdom: ['wise', 'intelligent', 'scholarly', 'sage'],
      love: ['romantic', 'caring', 'gentle', 'loving']
    };
    
    const emotionTraits = emotionCharacterMap[emotion.toLowerCase()] || [];
    if (emotionTraits.length > 0) {
      for (const character of characters) {
        const charTraits = character.traits?.map((t: string) => t.toLowerCase()) || [];
        const charDesc = character.description?.toLowerCase() || '';
        
        if (emotionTraits.some(trait => 
          charTraits.includes(trait) || charDesc.includes(trait)
        )) {
          return character;
        }
      }
    }
    
    // Default to first character if no specific match
    return characters[0] || null;
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
  private createEmotionText(originalText: string, emotion: string, intensity: number, language?: string): string {
    // For very short texts, return as-is to avoid over-processing
    if (originalText.length < 50) {
      return originalText;
    }
    
    // Language-aware emotion prefixes
    const emotionPrefixesByLanguage: { [lang: string]: { [key: string]: string[] } } = {
      en: {
        joy: ['With a sense of joy,', 'Happily,', 'With delight,'],
        sadness: ['With a heavy heart,', 'Sadly,', 'With sorrow,'],
        anger: ['With frustration,', 'Angrily,', 'With irritation,'],
        fear: ['With trepidation,', 'Fearfully,', 'With anxiety,'],
        surprise: ['Suddenly,', 'Unexpectedly,', 'With surprise,'],
        disgust: ['With distaste,', 'Reluctantly,', 'With aversion,'],
        anticipation: ['With anticipation,', 'Eagerly,', 'With expectation,'],
        trust: ['With confidence,', 'Trustingly,', 'With assurance,']
      },
      ta: {
        joy: ['மகிழ்ச்சியுடன்,', 'சந்தோஷமாக,', 'உவகையுடன்,'],
        sadness: ['வருத்தத்துடன்,', 'சோகமாக,', 'துக்கத்துடன்,'],
        anger: ['கோபத்துடன்,', 'எரிச்சலுடன்,', 'சினத்துடன்,'],
        fear: ['பயத்துடன்,', 'அச்சத்துடன்,', 'கவலையுடன்,'],
        surprise: ['திடீரென,', 'எதிர்பாராமல்,', 'ஆச்சரியத்துடன்,'],
        disgust: ['வெறுப்புடன்,', 'தயக்கத்துடன்,', 'அருவருப்புடன்,'],
        anticipation: ['எதிர்பார்ப்புடன்,', 'ஆர்வத்துடன்,', 'நம்பிக்கையுடன்,'],
        trust: ['நம்பிக்கையுடன்,', 'உறுதியுடன்,', 'தைரியத்துடன்,']
      }
    };
    
    // Get language-specific prefixes or fallback to English
    const langPrefixes = emotionPrefixesByLanguage[language || 'en'] || emotionPrefixesByLanguage['en'];
    const emotionPrefixes = langPrefixes[emotion.toLowerCase()];
    
    // Only add prefix for higher intensity emotions
    if (intensity >= 7 && emotionPrefixes) {
      const randomPrefix = emotionPrefixes[Math.floor(Math.random() * emotionPrefixes.length)];
      return `${randomPrefix} ${originalText}`;
    }
    
    return originalText;
  }

  // Build narrator voice instructions based on profile
  private buildNarratorInstructions(profile?: NarratorProfile): string {
    if (!profile) return '';
    
    const instructions: string[] = [];
    
    // Handle native language influence on narration
    if (profile.nativeLanguage && profile.language !== profile.nativeLanguage) {
      // User is narrating in a non-native language
      if (profile.nativeLanguage === 'ta' && profile.language === 'en') {
        instructions.push('Speak English with a natural Tamil-influenced accent, allowing Indian expressions and intonation patterns to come through authentically.');
      } else if (profile.nativeLanguage === 'hi' && profile.language === 'en') {
        instructions.push('Speak English with a natural Hindi-influenced accent, incorporating Indian expressions naturally.');
      } else if (profile.nativeLanguage && profile.language === 'en') {
        instructions.push(`Speak English with a natural ${profile.nativeLanguage}-influenced accent and expressions.`);
      }
      
      // Add location context if available
      if (profile.locale === 'en-US' && (profile.nativeLanguage === 'ta' || profile.nativeLanguage === 'hi')) {
        instructions.push('Mix American vocabulary with Indian expressions as someone living in the US would.');
      }
    } else {
      // Native speaker or same language
      switch (profile.locale) {
        case 'en-IN':
          instructions.push('Speak as an Indian English narrator with natural Indian expressions and intonation.');
          break;
        case 'en-US':
          instructions.push('Speak as an American English narrator with standard American pronunciation.');
          break;
        case 'en-GB':
          instructions.push('Speak as a British English narrator with British pronunciation and expressions.');
          break;
        case 'hi-IN':
          instructions.push('Speak Hindi with authentic Indian accent and natural expressions.');
          break;
        case 'ta-IN':
          instructions.push('Speak Tamil with authentic Tamil pronunciation and expressions.');
          break;
        default:
          // For other locales, use the language naturally
          instructions.push(`Speak ${profile.language} naturally with appropriate regional accent.`);
      }
    }
    
    return instructions.join(' ');
  }
  
  // Enhance text with narrator personality (without changing story content)
  private enhanceNarratorVoice(text: string, profile?: NarratorProfile): string {
    // For now, return text as-is since we're letting the TTS model handle accent/style
    // based on the narrator instructions
    return text;
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
    
    // Create narrator profile if not provided
    const narratorProfile = options.narratorProfile || {
      language: options.userId ? await this.getUserLanguage(options.userId) : 'en'
    };
    
    // Create emotion text with language awareness
    const emotionText = this.createEmotionText(options.text, options.emotion, options.intensity, narratorProfile.language);
    
    // Enhance with narrator personality
    const narratorText = this.enhanceNarratorVoice(emotionText, narratorProfile);
    
    // Build narrator instructions for OpenAI
    const narratorInstructions = this.buildNarratorInstructions(narratorProfile);
    
    const emotionSpeed = this.getEmotionSpeed(options.emotion, options.intensity);
    
    console.log(`Generating modulated audio: voice=${selectedVoice}, emotion=${options.emotion}, intensity=${options.intensity}, speed=${emotionSpeed}, language=${narratorProfile.language}, dialect=${narratorProfile.dialect || 'none'}`);
    
    // Check if this is an ElevenLabs voice ID (20 characters long)
    if (selectedVoice && selectedVoice.length === 20) {
      console.log(`[AudioService] Detected ElevenLabs voice ID, using ElevenLabs provider`);
      try {
        const { VoiceProviderFactory } = await import('./voice-providers/voice-provider-factory');
        // Pass voice settings if provided
        const voiceSettings = options.voiceSettings || {};
        // ElevenLabs should only receive the actual text, not the instructions
        const arrayBuffer = await VoiceProviderFactory.generateSpeech(
          narratorText, 
          selectedVoice, 
          options.emotion,
          voiceSettings
        );
        return Buffer.from(arrayBuffer);
      } catch (error) {
        console.error(`[AudioService] ElevenLabs generation failed, falling back to default voice:`, error);
        // Fall back to a default OpenAI voice if ElevenLabs fails
        const fallbackVoice = 'nova';
        // For fallback, combine instructions with text like normal OpenAI
        const fallbackText = narratorInstructions ? `${narratorInstructions} "${narratorText}"` : narratorText;
        const response = await this.openai.audio.speech.create({
          model: "tts-1",
          voice: fallbackVoice as any,
          input: fallbackText,
          speed: emotionSpeed,
        });
        return Buffer.from(await response.arrayBuffer());
      }
    }
    
    // Use OpenAI TTS for regular voices - combine instructions with text
    const finalText = narratorInstructions ? `${narratorInstructions} "${narratorText}"` : narratorText;
    const response = await this.openai.audio.speech.create({
      model: "tts-1",
      voice: selectedVoice as any,
      input: finalText,
      speed: emotionSpeed,
    });

    return Buffer.from(await response.arrayBuffer());
  }

  // Cache audio file
  private async cacheAudioFile(buffer: Buffer, options: AudioGenerationOptions, voice: string): Promise<string> {
    // Store narration audio with multi-dimensional caching structure
    if (!options.userId || !options.storyId) {
      throw new Error('userId and storyId are required for caching narration audio');
    }
    
    // Extract conversation style and narrator profile
    const conversationStyle = options.conversationStyle || 'respectful';
    const narratorProfile = options.narratorProfile?.language || 'neutral';
    
    // Create full directory path with all dimensions
    const cacheDir = path.join(
      process.cwd(), 
      'stories', 
      'audio', 
      'narrations', 
      options.userId, 
      options.storyId.toString(),
      conversationStyle,
      narratorProfile
    );
    await fs.mkdir(cacheDir, { recursive: true });
    
    // Generate filename with emotion and unique identifiers
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileName = `${options.emotion}_${timestamp}_${randomId}.mp3`;
    const filePath = path.join(cacheDir, fileName);
    
    await fs.writeFile(filePath, buffer);
    
    // Return URL for serving through Express route
    const publicUrl = `/api/stories/audio/narrations/${options.userId}/${options.storyId}/${conversationStyle}/${narratorProfile}/${fileName}`;
    
    return publicUrl;
  }



  // COMMENTED OUT: This method was replaced by getAudioBuffer and forceGenerateAudio
  // which provide more direct control over caching and generation
  /*
  // Main method to generate or retrieve audio with simplified voice logic
  async generateEmotionAudio(options: AudioGenerationOptions): Promise<AudioResult> {
    const userId = options.userId || '';
    
    // Check if user has any voice emotions in their repository
    const hasUserVoices = await this.hasAnyUserVoiceEmotions(userId);
    
    if (hasUserVoices) {
      // User has voice samples - use user voice for all emotions with character modulation
      const speakingCharacter = this.detectCharacterFromEmotion(options.text, options.emotion, options.characters || []);
      const userVoiceResult = await this.getUserVoiceForEmotion(userId, options.emotion, options.intensity, speakingCharacter);
      if (userVoiceResult) {
        return {
          audioUrl: userVoiceResult.audioUrl,
          isUserGenerated: true,
          voice: `user-${userVoiceResult.voiceModulation?.characterType || 'modulated'}`
        };
      }
    }

    // No user voices exist - use character-level AI voice
    const speakingCharacter = this.detectCharacterFromEmotion(options.text, options.emotion, options.characters || []);
    const characterArray = speakingCharacter ? [speakingCharacter] : (options.characters || []);
    const selectedVoice = options.voice || this.selectCharacterVoice(characterArray);

    // Generate new character-level AI audio
    const updatedOptions = { ...options, characters: characterArray };
    const buffer = await this.generateAIAudio(updatedOptions);
    const audioUrl = await this.cacheAudioFile(buffer, updatedOptions, selectedVoice);
    
    return {
      audioUrl,
      isUserGenerated: false,
      voice: selectedVoice
    };
  }
  */

  // Get audio buffer for direct streaming
  async getAudioBuffer(options: AudioGenerationOptions): Promise<{ buffer: Buffer; voice: string }> {
    const selectedVoice = options.voice || this.selectEmotionVoice(options.emotion, options.intensity, options.characters);

    // Check cache first
    const cachedAudio = await getCachedAudio(options.text, { voice: selectedVoice, emotion: options.emotion, intensity: options.intensity });
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

  // Force generate audio without any cache checking
  async forceGenerateAudio(options: AudioGenerationOptions): Promise<{ buffer: Buffer; voice: string }> {
    const selectedVoice = options.voice || this.selectEmotionVoice(options.emotion, options.intensity, options.characters);
    
    // Always generate fresh audio, no cache check
    const buffer = await this.generateAIAudio(options);
    
    // Don't cache this forced generation to avoid polluting the cache
    return { buffer, voice: selectedVoice };
  }
}

export const audioService = new AudioService();