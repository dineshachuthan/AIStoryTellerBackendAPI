/**
 * Voice Samples Service
 * Manages emotion-based voice sample collection for users
 */

import { storage } from './storage';
import { getAllEmotionConfigs } from '@shared/voice-config';
import fs from 'fs';
import path from 'path';

export interface VoiceSampleTemplate {
  emotion: string;
  displayName: string;
  description: string;
  sampleText: string;
  targetDuration: number;
  category: string;
}

export interface UserVoiceSampleData {
  emotion: string;
  audioUrl: string;
  duration: number;
  recordedAt: Date;
  storyId?: number;
}

export interface VoiceSampleProgress {
  totalEmotions: number;
  recordedEmotions: number;
  completionPercentage: number;
  missingEmotions: string[];
  recordedSamples: UserVoiceSampleData[];
}

export class VoiceSamplesService {
  private audioDir: string;

  constructor() {
    this.audioDir = path.join(process.cwd(), 'uploads', 'voice-samples');
    this.ensureDirectoryExists();
  }

  /**
   * Get emotion templates for voice recording
   */
  getEmotionTemplates(): VoiceSampleTemplate[] {
    const configs = getAllEmotionConfigs();
    return configs.map(config => ({
      emotion: config.emotion,
      displayName: config.displayName,
      description: config.description,
      sampleText: config.sampleText,
      targetDuration: config.targetDuration,
      category: 'emotion' // All emotion configs are in the 'emotion' category for the UI
    }));
  }

  /**
   * Get user's voice sample progress
   */
  async getUserVoiceProgress(userId: string): Promise<VoiceSampleProgress> {
    try {
      // Get all available emotion templates
      const templates = this.getEmotionTemplates();
      const totalEmotions = templates.length;

      // Get user's recorded voice samples
      const userSamples = await storage.getUserVoiceSamples(userId);
      const recordedEmotions = userSamples.length;
      const recordedEmotionsList = userSamples.map(sample => sample.label);

      // Calculate missing emotions
      const missingEmotions = templates
        .map(t => t.emotion)
        .filter(emotion => !recordedEmotionsList.includes(emotion));

      // Map samples to response format
      const recordedSamples: UserVoiceSampleData[] = userSamples.map(sample => ({
        emotion: sample.emotion,
        audioUrl: sample.audioUrl,
        duration: sample.duration || 0,
        recordedAt: sample.createdAt || new Date(),
        storyId: sample.storyIdRecorded
      }));

      return {
        totalEmotions,
        recordedEmotions,
        completionPercentage: Math.round((recordedEmotions / totalEmotions) * 100),
        missingEmotions,
        recordedSamples
      };
    } catch (error) {
      console.error('Error getting user voice progress:', error);
      return {
        totalEmotions: 0,
        recordedEmotions: 0,
        completionPercentage: 0,
        missingEmotions: [],
        recordedSamples: []
      };
    }
  }

  /**
   * Save user voice sample for an emotion
   */
  async saveVoiceSample(
    userId: string,
    modulationKey: string,
    audioBuffer: Buffer,
    duration: number,
    storyId?: number
  ): Promise<string> {
    try {
      // Get template to determine modulation type
      const template = await this.getModulationTemplate(modulationKey);
      if (!template) {
        throw new Error(`Template not found for modulation key: ${modulationKey}`);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${userId}_${modulationKey}_${timestamp}.webm`;
      const filePath = path.join(this.audioDir, filename);
      const audioUrl = `/uploads/voice-samples/${filename}`;

      // Save file to disk first (database-first architecture)
      await fs.promises.writeFile(filePath, audioBuffer);

      // Create database record using existing schema
      await storage.createUserVoiceSample({
        userId,
        sampleType: template.modulationType, // Maps to the existing sampleType field
        label: modulationKey, // Maps to the existing label field
        audioUrl,
        duration: Math.round(duration * 1000), // Convert to milliseconds
        isCompleted: true
      });

      console.log(`Voice sample saved for user ${userId}, modulation: ${modulationKey}, type: ${template.modulationType}`);
      return audioUrl;
    } catch (error) {
      console.error('Error saving voice sample:', error);
      throw new Error('Failed to save voice sample');
    }
  }

  /**
   * Get modulation template by key
   */
  private async getModulationTemplate(modulationKey: string): Promise<any> {
    try {
      // Use the voice modulation service directly
      const { voiceModulationService } = await import('./voice-modulation-service');
      const templates = await voiceModulationService.getTemplates();
      const template = templates.find((t: any) => t.modulationKey === modulationKey);
      return template || null;
    } catch (error) {
      console.error('Error fetching modulation template:', error);
      return null;
    }
  }

  /**
   * Get voice sample for specific emotion
   */
  async getUserVoiceSample(userId: string, emotion: string): Promise<UserVoiceSampleData | null> {
    try {
      const samples = await storage.getUserVoiceEmotions(userId);
      const sample = samples.find(s => s.emotion === emotion);
      
      if (!sample) return null;

      return {
        emotion: sample.emotion,
        audioUrl: sample.audioUrl,
        duration: sample.duration || 0,
        recordedAt: sample.createdAt || new Date(),
        storyId: sample.storyIdRecorded
      };
    } catch (error) {
      console.error('Error getting user voice sample:', error);
      return null;
    }
  }

  /**
   * Delete voice sample for emotion
   */
  async deleteVoiceSample(userId: string, emotion: string): Promise<boolean> {
    try {
      const samples = await storage.getUserVoiceEmotions(userId);
      const sample = samples.find(s => s.emotion === emotion);
      
      if (!sample) return false;

      // Delete file from disk
      const filePath = path.join(this.audioDir, sample.fileName);
      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        console.warn('Could not delete audio file:', error);
      }

      // Delete database record
      await storage.deleteUserVoiceEmotion(userId, emotion);
      
      console.log(`Voice sample deleted for user ${userId}, emotion: ${emotion}`);
      return true;
    } catch (error) {
      console.error('Error deleting voice sample:', error);
      return false;
    }
  }

  /**
   * Get emotions for specific story
   */
  async getStoryEmotions(storyId: number): Promise<string[]> {
    try {
      // Get story analysis to extract emotions
      const story = await storage.getStory(storyId);
      if (!story) return [];

      // This would need to be implemented based on story analysis
      // For now, return common emotions
      return ['happy', 'sad', 'excited', 'calm', 'surprised'];
    } catch (error) {
      console.error('Error getting story emotions:', error);
      return [];
    }
  }

  /**
   * Initialize default emotion templates in database
   */
  async initializeEmotionTemplates(): Promise<void> {
    try {
      const templates = this.getEmotionTemplates();
      
      for (const template of templates) {
        // Check if template already exists
        const existing = await storage.getEmotionTemplate(template.emotion);
        if (!existing) {
          await storage.createEmotionTemplate({
            emotion: template.emotion,
            displayName: template.displayName,
            description: template.description,
            sampleText: template.sampleText,
            targetDuration: template.targetDuration,
            category: template.category
          });
        }
      }
      
      console.log('Emotion templates initialized successfully');
    } catch (error) {
      console.error('Error initializing emotion templates:', error);
    }
  }

  /**
   * Ensure upload directory exists
   */
  private ensureDirectoryExists(): void {
    try {
      if (!fs.existsSync(this.audioDir)) {
        fs.mkdirSync(this.audioDir, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating voice samples directory:', error);
    }
  }
}

export const voiceSamplesService = new VoiceSamplesService();