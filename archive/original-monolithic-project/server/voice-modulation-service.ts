// Voice modulation system is now completely data-driven - no hardcoded configurations
// All functions removed to enforce data-driven approach per user requirements

/**
 * Voice Modulation Service - DEPRECATED AND REMOVED
 * 
 * This service has been eliminated to enforce data-driven approach.
 * All voice configurations now come from user recordings only.
 * No hardcoded templates or configurations allowed.
 */
export class VoiceModulationService {

  /**
   * Voice modulation is now completely data-driven
   * No hardcoded template initialization - users create their own through recording
   */
  async initializeTemplates(): Promise<void> {
    // No hardcoded template initialization - system is data-driven
    console.log("Voice modulation system is data-driven - no hardcoded templates initialized");
    return;
  }

  /**
   * Get user voice modulations from database - data-driven approach
   */
  async getUserVoiceModulations(userId: string, type?: string): Promise<any[]> {
    const { storage } = await import('./storage');
    
    try {
      // Get user emotion voices from database
      const emotionVoices = await storage.getUserEmotionVoices(userId);
      
      // Transform to expected format
      return emotionVoices.map(voice => ({
        id: voice.id,
        userId: voice.userId,
        emotion: voice.emotion,
        audioUrl: voice.audioUrl,
        modulationType: voice.sampleType || 'emotion',
        isCompleted: voice.isCompleted,
        isLocked: voice.isLocked,
        recordedAt: voice.recordedAt
      }));
    } catch (error) {
      console.error('Error fetching user voice modulations:', error);
      return [];
    }
  }

  /**
   * Get story-specific voice modulations - data-driven from user recordings
   */
  async getUserStoryVoiceModulations(userId: string, storyId: number): Promise<any[]> {
    // For now, return all user voice modulations as story can use any recorded emotion
    return this.getUserVoiceModulations(userId);
  }

  /**
   * Delete voice modulation - removes user recording
   */
  async deleteVoiceModulation(userId: string, modulationKey: string): Promise<void> {
    const { storage } = await import('./storage');
    
    try {
      // Find and delete the emotion voice
      const emotionVoices = await storage.getUserEmotionVoices(userId);
      const voiceToDelete = emotionVoices.find(v => v.emotion === modulationKey);
      
      if (voiceToDelete) {
        await storage.deleteUserEmotionVoice(voiceToDelete.id);
      }
    } catch (error) {
      console.error('Error deleting voice modulation:', error);
      throw error;
    }
  }

  /**
   * Analyze story modulations - extract emotions from story analysis
   */
  async analyzeStoryModulations(story: any): Promise<any> {
    // Return empty requirements - let AI analysis drive emotion detection
    return {
      requiredEmotions: [],
      suggestedVoices: [],
      analysisComplete: true
    };
  }

  /**
   * Mark modulation as preferred - user preference tracking
   */
  async markAsPreferred(userId: string, modulationId: number): Promise<void> {
    // Preference tracking could be added to database schema if needed
    console.log(`User ${userId} marked modulation ${modulationId} as preferred`);
  }

  /**
   * Get best voice modulation for user - data-driven selection
   */
  async getBestVoiceModulation(userId: string, modulationKey: string): Promise<any | null> {
    const userModulations = await this.getUserVoiceModulations(userId);
    return userModulations.find(m => m.emotion === modulationKey) || null;
  }
}

export const voiceModulationService = new VoiceModulationService();