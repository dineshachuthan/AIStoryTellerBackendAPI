/**
 * Voice Cloning Session Manager
 * Handles session-based counting and UI state management for ElevenLabs integration
 */

export interface VoiceCloningSessionData {
  emotions_not_cloned: number;
  sounds_not_cloned: number;
  modulations_not_cloned: number;
  cloning_in_progress: {
    emotions: boolean;
    sounds: boolean;
    modulations: boolean;
  };
  cloning_status: {
    emotions: 'idle' | 'cloning' | 'completed' | 'failed';
    sounds: 'idle' | 'cloning' | 'completed' | 'failed';
    modulations: 'idle' | 'cloning' | 'completed' | 'failed';
  };
}

export type VoiceCategoryType = 'emotions' | 'sounds' | 'modulations';

export class VoiceCloningSessionManager {
  private static readonly CLONING_THRESHOLD = 5;

  /**
   * Initialize session voice cloning data on login
   */
  static async initializeSessionData(req: any): Promise<VoiceCloningSessionData> {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get current database state
    const { storage } = await import('./storage');
    const { voiceModulationService } = await import('./voice-modulation-service');
    
    // Count unlocked samples by category
    const emotionTemplates = await voiceModulationService.getTemplates('emotion');
    const soundTemplates = await voiceModulationService.getTemplates('sound');
    const modulationTemplates = await voiceModulationService.getTemplates('modulation');
    
    const userModulations = await voiceModulationService.getUserVoiceModulations(userId);
    
    // Count recorded but not cloned samples by category
    // Note: isLocked field may not exist in current schema, treating all as unlocked for now
    const recordedEmotions = userModulations.filter(m => 
      m.modulationType === 'emotion'
    ).length;
    const recordedSounds = userModulations.filter(m => 
      m.modulationType === 'sound'
    ).length;
    const recordedModulations = userModulations.filter(m => 
      m.modulationType === 'modulation'
    ).length;

    // Check if any category is currently being cloned
    const { voiceTrainingService } = await import('./voice-training-service');
    const trainingStatus = await voiceTrainingService.getTrainingStatus(userId);
    const isCloning = trainingStatus.status === 'training';

    const sessionData: VoiceCloningSessionData = {
      emotions_not_cloned: recordedEmotions,
      sounds_not_cloned: recordedSounds,
      modulations_not_cloned: recordedModulations,
      cloning_in_progress: {
        emotions: isCloning,
        sounds: isCloning,
        modulations: isCloning
      },
      cloning_status: {
        emotions: isCloning ? 'cloning' : (recordedEmotions === 0 ? 'idle' : 'idle'),
        sounds: isCloning ? 'cloning' : (recordedSounds === 0 ? 'idle' : 'idle'),
        modulations: isCloning ? 'cloning' : (recordedModulations === 0 ? 'idle' : 'idle')
      }
    };

    // Store in session
    req.session.voiceCloning = sessionData;
    
    // Auto-trigger cloning for any categories that have reached threshold
    const categoriesToTrigger: VoiceCategoryType[] = [];
    if (recordedEmotions >= this.CLONING_THRESHOLD && !isCloning) {
      categoriesToTrigger.push('emotions');
    }
    if (recordedSounds >= this.CLONING_THRESHOLD && !isCloning) {
      categoriesToTrigger.push('sounds');
    }
    if (recordedModulations >= this.CLONING_THRESHOLD && !isCloning) {
      categoriesToTrigger.push('modulations');
    }
    
    // Trigger cloning for eligible categories in background
    if (categoriesToTrigger.length > 0) {
      console.log(`🚀 Auto-triggering ElevenLabs cloning for categories: ${categoriesToTrigger.join(', ')} (user has enough samples)`);
      
      // Set cloning in progress for all eligible categories
      categoriesToTrigger.forEach(category => {
        sessionData.cloning_in_progress[category] = true;
        sessionData.cloning_status[category] = 'cloning';
      });
      req.session.voiceCloning = sessionData;
      
      // Start background cloning process
      setTimeout(async () => {
        try {
          const { voiceTrainingService } = await import('./voice-training-service');
          const result = await voiceTrainingService.triggerAutomaticTraining(userId);
          
          if (result.success) {
            console.log(`✅ Auto-triggered ElevenLabs cloning completed for user ${userId}`);
            // Complete all triggered categories
            categoriesToTrigger.forEach(category => {
              this.completeCategoryCloning(req, category, true);
            });
          } else {
            console.error(`❌ Auto-triggered ElevenLabs cloning failed for user ${userId}: ${result.error}`);
            categoriesToTrigger.forEach(category => {
              this.completeCategoryCloning(req, category, false);
            });
          }
        } catch (error) {
          console.error(`❌ Auto-triggered ElevenLabs cloning error for user ${userId}:`, error);
          categoriesToTrigger.forEach(category => {
            this.completeCategoryCloning(req, category, false);
          });
        }
      }, 100);
    }
    
    return sessionData;
  }

  /**
   * Get session voice cloning data
   */
  static getSessionData(req: any): VoiceCloningSessionData {
    return req.session.voiceCloning || {
      emotions_not_cloned: 0,
      sounds_not_cloned: 0,
      modulations_not_cloned: 0,
      cloning_in_progress: {
        emotions: false,
        sounds: false,
        modulations: false
      },
      cloning_status: {
        emotions: 'idle',
        sounds: 'idle',
        modulations: 'idle'
      }
    };
  }

  /**
   * Increment category counter after successful voice sample save
   */
  static incrementCategoryCounter(req: any, category: VoiceCategoryType): void {
    const sessionData = this.getSessionData(req);
    
    switch (category) {
      case 'emotions':
        sessionData.emotions_not_cloned++;
        break;
      case 'sounds':
        sessionData.sounds_not_cloned++;
        break;
      case 'modulations':
        sessionData.modulations_not_cloned++;
        break;
    }

    req.session.voiceCloning = sessionData;
  }

  /**
   * Check if category has reached cloning threshold
   */
  static shouldTriggerCloning(req: any, category: VoiceCategoryType): boolean {
    const sessionData = this.getSessionData(req);
    
    switch (category) {
      case 'emotions':
        return sessionData.emotions_not_cloned >= this.CLONING_THRESHOLD;
      case 'sounds':
        return sessionData.sounds_not_cloned >= this.CLONING_THRESHOLD;
      case 'modulations':
        return sessionData.modulations_not_cloned >= this.CLONING_THRESHOLD;
      default:
        return false;
    }
  }

  /**
   * Set category cloning status to "in progress"
   */
  static setCloningInProgress(req: any, category: VoiceCategoryType): void {
    const sessionData = this.getSessionData(req);
    
    sessionData.cloning_in_progress[category] = true;
    sessionData.cloning_status[category] = 'cloning';
    
    req.session.voiceCloning = sessionData;
  }

  /**
   * Complete cloning process for category
   */
  static completeCategoryCloning(req: any, category: VoiceCategoryType, success: boolean): void {
    const sessionData = this.getSessionData(req);
    
    // Reset counter for this category
    switch (category) {
      case 'emotions':
        sessionData.emotions_not_cloned = 0;
        break;
      case 'sounds':
        sessionData.sounds_not_cloned = 0;
        break;
      case 'modulations':
        sessionData.modulations_not_cloned = 0;
        break;
    }
    
    // Update status
    sessionData.cloning_in_progress[category] = false;
    sessionData.cloning_status[category] = success ? 'completed' : 'failed';
    
    req.session.voiceCloning = sessionData;
  }

  /**
   * Check if any category is currently cloning
   */
  static isAnyCategoryCloning(req: any): boolean {
    const sessionData = this.getSessionData(req);
    return sessionData.cloning_in_progress.emotions || 
           sessionData.cloning_in_progress.sounds || 
           sessionData.cloning_in_progress.modulations;
  }

  /**
   * Get navigation button label based on cloning status
   */
  static getNavigationButtonLabel(req: any): string {
    return this.isAnyCategoryCloning(req) ? "Cloning in Progress" : "Voice Samples";
  }

  /**
   * Determine category from modulation key
   */
  static getCategoryFromModulationKey(modulationKey: string): VoiceCategoryType {
    // Get from voice-config to determine category
    const emotionKeys = ['happy', 'sad', 'angry', 'excited', 'calm', 'fearful', 'surprised', 'disgusted', 'confident', 'loving'];
    const soundKeys = ['whisper', 'shout', 'laugh', 'cry', 'sigh'];
    
    if (emotionKeys.includes(modulationKey)) {
      return 'emotions';
    } else if (soundKeys.includes(modulationKey)) {
      return 'sounds';
    } else {
      return 'modulations';
    }
  }
}