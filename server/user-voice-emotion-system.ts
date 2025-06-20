import { storage } from './storage';
import fs from 'fs/promises';
import path from 'path';
import { audioService } from './audio-service';

export interface UserVoiceEmotion {
  userId: string;
  emotion: string;
  intensity: number;
  audioUrl: string;
  fileName: string;
  timestamp: number;
  isBaseVoice: boolean; // True if this is the primary voice for interpolation
}

export interface EmotionInterpolationMap {
  baseEmotion: string;
  targetEmotion: string;
  intensityAdjustment: number;
  speedModification: number;
  pitchAdjustment: number;
}

export class UserVoiceEmotionSystem {
  private userVoiceDir: string;
  private interpolationRules: EmotionInterpolationMap[];

  constructor() {
    this.userVoiceDir = path.join(process.cwd(), 'persistent-cache', 'user-voice-emotions');
    this.ensureDirectoryExists();
    this.initializeInterpolationRules();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.userVoiceDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create user voice emotion directory:', error);
    }
  }

  private initializeInterpolationRules(): void {
    // Define emotion interpolation rules based on psychological emotion mapping
    this.interpolationRules = [
      // Joy-based interpolations
      { baseEmotion: 'joy', targetEmotion: 'hope', intensityAdjustment: -2, speedModification: 0.9, pitchAdjustment: 0.95 },
      { baseEmotion: 'joy', targetEmotion: 'excitement', intensityAdjustment: 1, speedModification: 1.2, pitchAdjustment: 1.1 },
      { baseEmotion: 'joy', targetEmotion: 'contentment', intensityAdjustment: -3, speedModification: 0.8, pitchAdjustment: 0.9 },
      
      // Grief-based interpolations
      { baseEmotion: 'grief', targetEmotion: 'sadness', intensityAdjustment: -1, speedModification: 0.9, pitchAdjustment: 0.95 },
      { baseEmotion: 'grief', targetEmotion: 'melancholy', intensityAdjustment: -2, speedModification: 0.8, pitchAdjustment: 0.9 },
      { baseEmotion: 'grief', targetEmotion: 'despair', intensityAdjustment: 2, speedModification: 0.7, pitchAdjustment: 0.8 },
      
      // Shock-based interpolations
      { baseEmotion: 'shock', targetEmotion: 'surprise', intensityAdjustment: -2, speedModification: 1.1, pitchAdjustment: 1.05 },
      { baseEmotion: 'shock', targetEmotion: 'fear', intensityAdjustment: 0, speedModification: 1.2, pitchAdjustment: 1.1 },
      { baseEmotion: 'shock', targetEmotion: 'confusion', intensityAdjustment: -3, speedModification: 0.9, pitchAdjustment: 0.95 },
      
      // Anger-based interpolations
      { baseEmotion: 'anger', targetEmotion: 'frustration', intensityAdjustment: -2, speedModification: 1.1, pitchAdjustment: 1.05 },
      { baseEmotion: 'anger', targetEmotion: 'rage', intensityAdjustment: 3, speedModification: 1.3, pitchAdjustment: 1.2 },
      { baseEmotion: 'anger', targetEmotion: 'irritation', intensityAdjustment: -4, speedModification: 1.05, pitchAdjustment: 1.02 },
      
      // Fear-based interpolations
      { baseEmotion: 'fear', targetEmotion: 'anxiety', intensityAdjustment: -1, speedModification: 1.1, pitchAdjustment: 1.05 },
      { baseEmotion: 'fear', targetEmotion: 'worry', intensityAdjustment: -3, speedModification: 0.95, pitchAdjustment: 1.0 },
      { baseEmotion: 'fear', targetEmotion: 'panic', intensityAdjustment: 2, speedModification: 1.4, pitchAdjustment: 1.3 },
      
      // Love-based interpolations
      { baseEmotion: 'love', targetEmotion: 'affection', intensityAdjustment: -2, speedModification: 0.9, pitchAdjustment: 0.95 },
      { baseEmotion: 'love', targetEmotion: 'compassion', intensityAdjustment: -1, speedModification: 0.85, pitchAdjustment: 0.9 },
      { baseEmotion: 'love', targetEmotion: 'tenderness', intensityAdjustment: -3, speedModification: 0.8, pitchAdjustment: 0.85 },
    ];
  }

  /**
   * Save a user voice sample for a specific emotion
   */
  async saveUserVoiceEmotion(
    userId: string, 
    emotion: string, 
    intensity: number, 
    audioBuffer: Buffer,
    isBaseVoice: boolean = false
  ): Promise<UserVoiceEmotion> {
    const timestamp = Date.now();
    const fileName = `${userId}-${emotion}-${intensity}-${timestamp}.mp3`;
    const filePath = path.join(this.userVoiceDir, fileName);
    const audioUrl = `/api/user-voice-emotions/${fileName}`;

    // Save audio file
    await fs.writeFile(filePath, audioBuffer);

    // Create metadata
    const voiceEmotion: UserVoiceEmotion = {
      userId,
      emotion,
      intensity,
      audioUrl,
      fileName,
      timestamp,
      isBaseVoice
    };

    // Save to database
    await storage.saveUserVoiceEmotion(voiceEmotion);

    console.log(`Saved user voice emotion: ${emotion} for user ${userId}`);
    return voiceEmotion;
  }

  /**
   * Get all user voice emotions for a user
   */
  async getUserVoiceEmotions(userId: string): Promise<UserVoiceEmotion[]> {
    return await storage.getUserVoiceEmotions(userId);
  }

  /**
   * Find the best user voice for a specific emotion with interpolation
   */
  async findBestUserVoiceForEmotion(
    userId: string, 
    targetEmotion: string, 
    targetIntensity: number
  ): Promise<{ audioUrl: string; isInterpolated: boolean; baseEmotion?: string } | null> {
    const userVoices = await this.getUserVoiceEmotions(userId);
    
    if (userVoices.length === 0) {
      return null;
    }

    // 1. First, try to find exact emotion match
    const exactMatch = userVoices.find(voice => 
      voice.emotion.toLowerCase() === targetEmotion.toLowerCase() && 
      Math.abs(voice.intensity - targetIntensity) <= 2
    );

    if (exactMatch) {
      console.log(`Using exact user voice match for ${targetEmotion}`);
      return { audioUrl: exactMatch.audioUrl, isInterpolated: false };
    }

    // 2. Try to find interpolation from existing emotions
    const interpolationRule = this.interpolationRules.find(rule => 
      rule.targetEmotion.toLowerCase() === targetEmotion.toLowerCase()
    );

    if (interpolationRule) {
      const baseVoice = userVoices.find(voice => 
        voice.emotion.toLowerCase() === interpolationRule.baseEmotion.toLowerCase()
      );

      if (baseVoice) {
        console.log(`Interpolating ${targetEmotion} from user's ${interpolationRule.baseEmotion} voice`);
        return { 
          audioUrl: baseVoice.audioUrl, 
          isInterpolated: true, 
          baseEmotion: interpolationRule.baseEmotion 
        };
      }
    }

    // 3. If we have any user voice, use the most recent one as base for interpolation
    const mostRecentVoice = userVoices.sort((a, b) => b.timestamp - a.timestamp)[0];
    console.log(`Using most recent user voice (${mostRecentVoice.emotion}) for ${targetEmotion} interpolation`);
    
    return { 
      audioUrl: mostRecentVoice.audioUrl, 
      isInterpolated: true, 
      baseEmotion: mostRecentVoice.emotion 
    };
  }

  /**
   * Generate audio for emotion using user voice interpolation
   */
  async generateEmotionAudioWithUserVoice(
    userId: string,
    text: string,
    emotion: string,
    intensity: number,
    storyId?: number
  ): Promise<{ audioUrl: string; isUserGenerated: boolean; voice: string }> {
    // Try to find user voice for this emotion
    const userVoiceResult = await this.findBestUserVoiceForEmotion(userId, emotion, intensity);
    
    if (userVoiceResult) {
      // Use user voice (either exact or interpolated)
      return {
        audioUrl: userVoiceResult.audioUrl,
        isUserGenerated: true,
        voice: userVoiceResult.isInterpolated ? 
          `user-interpolated-from-${userVoiceResult.baseEmotion}` : 
          'user-exact-match'
      };
    }

    // Fallback to AI voice generation
    console.log(`No user voice available for ${emotion}, using AI generation`);
    return await audioService.generateEmotionAudio({
      text,
      emotion,
      intensity,
      userId,
      storyId
    });
  }

  /**
   * Check if user has any voice samples (to determine if interpolation is possible)
   */
  async hasUserVoiceSamples(userId: string): Promise<boolean> {
    const userVoices = await this.getUserVoiceEmotions(userId);
    return userVoices.length > 0;
  }

  /**
   * Get missing emotions for a story that user should record
   */
  async getMissingEmotionsForStory(
    userId: string, 
    storyEmotions: string[]
  ): Promise<string[]> {
    const userVoices = await this.getUserVoiceEmotions(userId);
    const recordedEmotions = userVoices.map(voice => voice.emotion.toLowerCase());
    
    // Find emotions not directly recorded and not interpolatable
    const missingEmotions: string[] = [];
    
    for (const emotion of storyEmotions) {
      const emotionLower = emotion.toLowerCase();
      
      // Skip if directly recorded
      if (recordedEmotions.includes(emotionLower)) {
        continue;
      }
      
      // Skip if interpolatable from existing emotions
      const canInterpolate = this.interpolationRules.some(rule => 
        rule.targetEmotion.toLowerCase() === emotionLower &&
        recordedEmotions.includes(rule.baseEmotion.toLowerCase())
      );
      
      if (!canInterpolate && userVoices.length === 0) {
        missingEmotions.push(emotion);
      }
    }
    
    return missingEmotions;
  }

  /**
   * Clean up old voice samples (keep only last 50 per user)
   */
  async cleanupOldVoiceSamples(userId: string): Promise<void> {
    const userVoices = await this.getUserVoiceEmotions(userId);
    
    if (userVoices.length <= 50) {
      return;
    }

    // Sort by timestamp and keep only the 50 most recent
    const sortedVoices = userVoices.sort((a, b) => b.timestamp - a.timestamp);
    const voicesToDelete = sortedVoices.slice(50);

    for (const voice of voicesToDelete) {
      try {
        // Delete file
        const filePath = path.join(this.userVoiceDir, voice.fileName);
        await fs.unlink(filePath);
        
        // Delete from database
        await storage.deleteUserVoiceEmotion(voice.userId, voice.fileName);
        
        console.log(`Cleaned up old voice sample: ${voice.fileName}`);
      } catch (error) {
        console.error(`Failed to cleanup voice sample ${voice.fileName}:`, error);
      }
    }
  }
}

export const userVoiceEmotionSystem = new UserVoiceEmotionSystem();