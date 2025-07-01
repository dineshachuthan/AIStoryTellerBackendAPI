/**
 * Voice Cloning Session Manager
 * Handles session-based counting and UI state management for ElevenLabs integration
 */

import { VOICE_CLONING_CONFIG } from '@shared/voice-config';

// In-memory store for tracking cloning completion across sessions
const cloningCompletionStore = new Map<string, {
  userId: string;
  category: VoiceCategoryType;
  success: boolean;
  completedAt: Date;
}>();

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
  static get CLONING_THRESHOLD() {
    return VOICE_CLONING_CONFIG.sampleThreshold;
  }

  /**
   * Initialize session voice cloning data on login
   */
  static async initializeSessionData(req: any): Promise<VoiceCloningSessionData> {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get current database state using ESM architecture
    const { storage } = await import('./storage');
    
    // Count user ESM recordings by category
    const userEsmData = await storage.getUserEsmByUser(userId);
    
    // Count recorded samples by ESM category
    let recordedEmotions = 0;
    let recordedSounds = 0;
    let recordedModulations = 0;
    
    // Use SQL query to efficiently count recordings by category
    const { db } = await import('./db');
    const { sql } = await import('drizzle-orm');
    
    const countResult = await db.execute(sql`
      SELECT er.category, COUNT(DISTINCT uer.user_esm_recording_id) as recording_count
      FROM user_esm ue
      JOIN esm_ref er ON ue.esm_ref_id = er.esm_ref_id
      JOIN user_esm_recordings uer ON ue.user_esm_id = uer.user_esm_id
      WHERE ue.user_id = ${userId}
      GROUP BY er.category
    `);
    
    for (const row of countResult.rows) {
      const category = row.category as number;
      const count = parseInt(row.recording_count as string) || 0;
      
      if (category === 1) recordedEmotions = count; // Emotions
      else if (category === 2) recordedSounds = count; // Sounds  
      else if (category === 3) recordedModulations = count; // Modulations
    }

    console.log(`[VoiceCloningSession] Session initialization counts for user ${userId}:`);
    
    // Check category-specific cloning status using timeout service
    const { VoiceCloningTimeoutService } = await import('./voice-cloning-timeout-service');
    const emotionsCloning = VoiceCloningTimeoutService.isOperationRunning(userId, 'emotions');
    const soundsCloning = VoiceCloningTimeoutService.isOperationRunning(userId, 'sounds');
    const modulationsCloning = VoiceCloningTimeoutService.isOperationRunning(userId, 'modulations');

    console.log(`  EMOTIONS: ${recordedEmotions} samples (threshold: ${this.CLONING_THRESHOLD}) - Cloning: ${emotionsCloning ? 'IN PROGRESS' : 'IDLE'}`);
    console.log(`  SOUNDS: ${recordedSounds} samples (threshold: ${this.CLONING_THRESHOLD}) - Cloning: ${soundsCloning ? 'IN PROGRESS' : 'IDLE'}`);
    console.log(`  MODULATIONS: ${recordedModulations} samples (threshold: ${this.CLONING_THRESHOLD}) - Cloning: ${modulationsCloning ? 'IN PROGRESS' : 'IDLE'}`);

    // Check if any category meets threshold for auto-trigger
    if (recordedEmotions >= this.CLONING_THRESHOLD) {
      console.log(`🎯 EMOTIONS THRESHOLD MET: ${recordedEmotions} >= ${this.CLONING_THRESHOLD} - Ready for manual cloning`);
    }
    if (recordedSounds >= this.CLONING_THRESHOLD) {
      console.log(`🎯 SOUNDS THRESHOLD MET: ${recordedSounds} >= ${this.CLONING_THRESHOLD} - Ready for manual cloning`);
    }
    if (recordedModulations >= this.CLONING_THRESHOLD) {
      console.log(`🎯 MODULATIONS THRESHOLD MET: ${recordedModulations} >= ${this.CLONING_THRESHOLD} - Ready for manual cloning`);
    }

    const sessionData: VoiceCloningSessionData = {
      emotions_not_cloned: recordedEmotions,
      sounds_not_cloned: recordedSounds,
      modulations_not_cloned: recordedModulations,
      cloning_in_progress: {
        emotions: emotionsCloning,
        sounds: soundsCloning,
        modulations: modulationsCloning
      },
      cloning_status: {
        emotions: emotionsCloning ? 'cloning' : (recordedEmotions === 0 ? 'idle' : 'idle'),
        sounds: soundsCloning ? 'cloning' : (recordedSounds === 0 ? 'idle' : 'idle'),
        modulations: modulationsCloning ? 'cloning' : (recordedModulations === 0 ? 'idle' : 'idle')
      }
    };

    // Store in session
    req.session.voiceCloning = sessionData;
    
    // DISABLED: No automatic triggering - user requested manual control only
    // Check eligible categories for logging but don't auto-trigger
    const eligibleCategories: VoiceCategoryType[] = [];
    if (recordedEmotions >= this.CLONING_THRESHOLD && !emotionsCloning) {
      eligibleCategories.push('emotions');
    }
    if (recordedSounds >= this.CLONING_THRESHOLD && !soundsCloning) {
      eligibleCategories.push('sounds');
    }
    if (recordedModulations >= this.CLONING_THRESHOLD && !modulationsCloning) {
      eligibleCategories.push('modulations');
    }
    
    // Log eligible categories but don't trigger automatically
    if (eligibleCategories.length > 0) {
      console.log(`🎯 Categories ready for manual cloning: ${eligibleCategories.join(', ')} (${eligibleCategories.map(cat => {
        const count = cat === 'emotions' ? recordedEmotions : cat === 'sounds' ? recordedSounds : recordedModulations;
        return `${cat}: ${count}/${this.CLONING_THRESHOLD}`;
      }).join(', ')})`);
    }
    
    // Manual triggering only - no automatic background processing
    console.log(`📊 Sample counts - EMOTIONS: ${recordedEmotions} samples (threshold: ${this.CLONING_THRESHOLD}), SOUNDS: ${recordedSounds} samples (threshold: ${this.CLONING_THRESHOLD}), MODULATIONS: ${recordedModulations} samples (threshold: ${this.CLONING_THRESHOLD})`);
    console.log(`🎮 Manual control enabled - no automatic ElevenLabs triggering`);
    
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
    console.log(`[SessionManager] ===================================== SESSION COUNTER INCREMENT OPERATION =====================================`);
    console.log(`[SessionManager] Beginning session counter increment operation for voice cloning category: "${category}" at ${new Date().toISOString()}`);
    console.log(`[SessionManager] User session ID: ${req.session.id || 'no session ID'}, User authentication: ${req.session.userId ? 'authenticated' : 'not authenticated'}`);
    console.log(`[SessionManager] Operation purpose: Track sample count to determine when to trigger automatic ElevenLabs voice cloning at ${this.CLONING_THRESHOLD}-sample threshold`);
    
    const sessionData = this.getSessionData(req);
    const preIncrementState = JSON.parse(JSON.stringify(sessionData));
    
    console.log(`[SessionManager] Pre-increment session state: ${JSON.stringify(preIncrementState, null, 2)}`);
    console.log(`[SessionManager] Current counter values before increment: emotions=${sessionData.emotions_not_cloned}, sounds=${sessionData.sounds_not_cloned}, modulations=${sessionData.modulations_not_cloned}`);
    console.log(`[SessionManager] Cloning status before increment: emotions=${sessionData.cloning_status.emotions}, sounds=${sessionData.cloning_status.sounds}, modulations=${sessionData.cloning_status.modulations}`);
    
    switch (category) {
      case 'emotions':
        sessionData.emotions_not_cloned++;
        console.log(`[SessionManager] Incremented emotions counter: ${sessionData.emotions_not_cloned - 1} → ${sessionData.emotions_not_cloned} (threshold: ${this.CLONING_THRESHOLD})`);
        break;
      case 'sounds':
        sessionData.sounds_not_cloned++;
        console.log(`[SessionManager] Incremented sounds counter: ${sessionData.sounds_not_cloned - 1} → ${sessionData.sounds_not_cloned} (threshold: ${this.CLONING_THRESHOLD})`);
        break;
      case 'modulations':
        sessionData.modulations_not_cloned++;
        console.log(`[SessionManager] Incremented modulations counter: ${sessionData.modulations_not_cloned - 1} → ${sessionData.modulations_not_cloned} (threshold: ${this.CLONING_THRESHOLD})`);
        break;
    }

    req.session.voiceCloning = sessionData;
    
    console.log(`[SessionManager] Post-increment session state: ${JSON.stringify(sessionData, null, 2)}`);
    console.log(`[SessionManager] Session data successfully updated in Express session memory. Counter increment operation completed successfully.`);
    console.log(`[SessionManager] Next operation: Threshold check will determine if automatic voice cloning should be triggered for category "${category}"`);
  }

  /**
   * Check if category has reached cloning threshold
   * For MVP1 hybrid approach: Check unique emotions count (6 different emotions = 1 voice clone)
   */
  static async shouldTriggerCloning(req: any, category: VoiceCategoryType): Promise<boolean> {
    const userId = req.user?.id;
    if (!userId) return false;

    if (category === 'emotions') {
      // MVP1 Hybrid approach: Check unique emotion count instead of total samples
      return await this.shouldTriggerHybridEmotionCloning(userId);
    } else {
      // For sounds and modulations, use original threshold logic
      const sessionData = this.getSessionData(req);
      switch (category) {
        case 'sounds':
          return sessionData.sounds_not_cloned >= this.CLONING_THRESHOLD;
        case 'modulations':
          return sessionData.modulations_not_cloned >= this.CLONING_THRESHOLD;
        default:
          return false;
      }
    }
  }

  /**
   * MVP1 Hybrid approach: Check if user has minimum different emotion samples
   * This triggers ONE voice clone that gets stored as separate entities for each emotion
   */
  static async shouldTriggerHybridEmotionCloning(userId: string): Promise<boolean> {
    try {
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');
      
      // Get count of unique emotions recorded by user using ESM architecture
      const result = await db.execute(sql`
        SELECT COUNT(DISTINCT er.name) as unique_emotion_count
        FROM user_esm ue
        JOIN esm_ref er ON ue.esm_ref_id = er.esm_ref_id
        JOIN user_esm_recordings uer ON ue.user_esm_id = uer.user_esm_id
        WHERE ue.user_id = ${userId} AND er.category = 1
      `);
      
      const uniqueEmotionCount = parseInt(result.rows[0]?.unique_emotion_count as string) || 0;
      
      console.log(`[HybridCloning] User ${userId} has recorded ${uniqueEmotionCount} unique emotions`);
      console.log(`[HybridCloning] Hybrid threshold: ${this.CLONING_THRESHOLD} different emotions to trigger ONE voice clone for all emotions`);
      
      // Check if user has enough different emotion samples (MVP1 single sample approach)
      const hasEnoughUniqueEmotions = uniqueEmotionCount >= this.CLONING_THRESHOLD;
      
      if (hasEnoughUniqueEmotions) {
        console.log(`[HybridCloning] ✅ HYBRID THRESHOLD REACHED: ${uniqueEmotionCount}/${this.CLONING_THRESHOLD} unique emotions - triggering ElevenLabs voice cloning`);
        console.log(`[HybridCloning] This will create ONE voice clone and store it as separate entities for each emotion`);
      } else {
        console.log(`[HybridCloning] ⏳ Hybrid threshold not reached: ${uniqueEmotionCount}/${this.CLONING_THRESHOLD} unique emotions`);
      }
      
      return hasEnoughUniqueEmotions;
    } catch (error) {
      console.error('[HybridCloning] Error checking hybrid emotion threshold:', error);
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
   * Complete cloning process for category (can be called without session)
   */
  static completeCategoryCloning(userId: string, category: VoiceCategoryType, success: boolean): void {
    // ONLY store completion records on SUCCESS - failures should not be stored
    if (success) {
      const completionKey = `${userId}-${category}`;
      cloningCompletionStore.set(completionKey, {
        userId,
        category,
        success: true, // Only successful completions stored
        completedAt: new Date()
      });
      
      console.log(`✅ Cloning SUCCESS stored: ${userId} ${category}`);
      
      // Clean up old completions (older than 10 minutes)
      setTimeout(() => {
        for (const [key, completion] of cloningCompletionStore.entries()) {
          const ageMinutes = (Date.now() - completion.completedAt.getTime()) / (1000 * 60);
          if (ageMinutes > 10) {
            cloningCompletionStore.delete(key);
          }
        }
      }, 0);
    } else {
      // On failure, just log - do NOT store anything
      console.log(`❌ Cloning FAILED: ${userId} ${category} - no storage on failure`);
    }
  }

  /**
   * Apply any pending completions to current session
   */
  static applyPendingCompletions(req: any): void {
    const userId = req.user?.id;
    if (!userId) return;

    const sessionData = this.getSessionData(req);
    
    for (const category of ['emotions', 'sounds', 'modulations'] as VoiceCategoryType[]) {
      const completionKey = `${userId}-${category}`;
      const completion = cloningCompletionStore.get(completionKey);
      
      // Only successful completions are stored, so completion.success is always true
      if (completion) {
        console.log(`✅ Applying successful completion: ${category}`);
        
        sessionData.cloning_in_progress[category] = false;
        sessionData.cloning_status[category] = 'completed';
        
        // Reset counter on successful completion
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
        
        // Remove from pending completions
        cloningCompletionStore.delete(completionKey);
      }
    }
    
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
   * Determine category from ESM reference name
   */
  static async getCategoryFromEsmName(esmName: string): Promise<VoiceCategoryType> {
    try {
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');
      
      // Query ESM reference to find category
      const result = await db.execute(sql`
        SELECT category FROM esm_ref WHERE name = ${esmName.toLowerCase()} LIMIT 1
      `);
      
      if (result.rows.length > 0) {
        const category = result.rows[0].category as number;
        if (category === 1) return 'emotions';
        else if (category === 2) return 'sounds';
        else if (category === 3) return 'modulations';
      }
      
      // Default fallback based on emotion naming patterns
      return 'emotions';
    } catch (error) {
      console.error('Error determining ESM category:', error);
      return 'emotions'; // Default fallback
    }
  }

  /**
   * Legacy method for backwards compatibility
   */
  static getCategoryFromModulationKey(modulationKey: string): VoiceCategoryType {
    // For legacy compatibility, assume emotions by default
    // The new system should use getCategoryFromEsmName instead
    return 'emotions';
  }
}