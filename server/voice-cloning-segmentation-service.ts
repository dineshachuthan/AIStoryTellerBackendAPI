/**
 * MVP2 Voice Cloning Segmentation Service
 * Intelligent three-level analysis for category-specific narrator voice generation
 * 
 * Architecture: Individual (6+ samples) → Category → Combined fallback
 * Automatic emotion-level locking for API cost control
 */

import { storage } from './storage';

export interface SegmentationMetadata {
  userId: string;
  segmentationType: 'individual' | 'category' | 'combined';
  targetItems: string[]; // Emotion/sound/modulation names
  categoryBreakdown: {
    emotions: { name: string; sampleCount: number; locked: boolean }[];
    sounds: { name: string; sampleCount: number; locked: boolean }[];
    modulations: { name: string; sampleCount: number; locked: boolean }[];
  };
  elevenLabsCalls: {
    type: 'individual' | 'category' | 'combined';
    items: string[];
    audioUrls: string[];
    metadata: any;
  }[];
  lockingPlan: {
    esmItemsToLock: { category: number; itemName: string; esmRefId: number }[];
  };
}

export class VoiceCloningSegmentationService {
  private readonly MIN_SAMPLES_INDIVIDUAL = 6;
  private readonly MIN_SAMPLES_CATEGORY = 3;

  /**
   * Smart three-level ElevenLabs segmentation analysis
   * @param userId - User identifier
   * @returns Segmentation metadata for MVP2 ElevenLabs integration
   */
  async determineElevenLabsSegmentation(userId: string): Promise<SegmentationMetadata> {
    console.log(`[MVP2Segmentation] ================================ SEGMENTATION ANALYSIS INITIATED ================================`);
    console.log(`[MVP2Segmentation] Beginning comprehensive three-level analysis for user: ${userId}`);
    console.log(`[MVP2Segmentation] MVP2 Thresholds: Individual=${this.MIN_SAMPLES_INDIVIDUAL}+ samples, Category=${this.MIN_SAMPLES_CATEGORY}+ samples`);

    try {
      // Get all ESM recordings for the user
      const esmRecordings = await storage.getUserEsmRecordings(userId);
      console.log(`[MVP2Segmentation] Retrieved ${esmRecordings.length} total ESM recordings for analysis`);
      console.log(`[MVP2Segmentation] Recording details:`, esmRecordings.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        audio_url: r.audio_url,
        is_locked: r.is_locked,
        duration: r.duration
      })));

      // Organize by category and analyze sample counts
      const categoryBreakdown = this.organizeByCategory(esmRecordings);
      console.log(`[MVP2Segmentation] Category breakdown completed:`, {
        emotions: categoryBreakdown.emotions.length,
        sounds: categoryBreakdown.sounds.length,
        modulations: categoryBreakdown.modulations.length
      });

      // Determine segmentation strategy
      const segmentationStrategy = this.analyzeSegmentationStrategy(categoryBreakdown);
      console.log(`[MVP2Segmentation] Segmentation strategy determined: ${segmentationStrategy.type}`);

      // Generate ElevenLabs API call plan
      const elevenLabsCalls = await this.generateElevenLabsCallPlan(segmentationStrategy, categoryBreakdown, userId);
      console.log(`[MVP2Segmentation] Generated ${elevenLabsCalls.length} ElevenLabs API calls`);

      // Generate emotion-level locking plan
      const lockingPlan = this.generateLockingPlan(segmentationStrategy, categoryBreakdown);
      console.log(`[MVP2Segmentation] Locking plan generated for automatic emotion-level locking`);

      const metadata: SegmentationMetadata = {
        userId,
        segmentationType: segmentationStrategy.type,
        targetItems: segmentationStrategy.targetItems,
        categoryBreakdown,
        elevenLabsCalls,
        lockingPlan
      };

      console.log(`[MVP2Segmentation] ===== SEGMENTATION ANALYSIS COMPLETE ===== Strategy: ${segmentationStrategy.type}`);
      return metadata;

    } catch (error) {
      console.error(`[MVP2Segmentation] ========================== CRITICAL SEGMENTATION ERROR ==========================`);
      console.error(`[MVP2Segmentation] Failed to analyze segmentation for user ${userId}`);
      console.error(`[MVP2Segmentation] Error details: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Organize ESM recordings by category for analysis
   */
  private organizeByCategory(esmRecordings: any[]) {
    const emotions = esmRecordings
      .filter(recording => recording.category === 1)
      .map(recording => ({
        name: recording.name,
        sampleCount: 1, // Each recording represents one sample
        locked: recording.emotion_locked || false,
        esmRefId: recording.esm_ref_id,
        audioUrl: recording.audio_url,
        userEsmId: recording.user_esm_id,
        recordingId: recording.id // Include recordingId for fault tolerance
      }));

    const sounds = esmRecordings
      .filter(recording => recording.category === 2)
      .map(recording => ({
        name: recording.name,
        sampleCount: 1,
        locked: recording.emotion_locked || false,
        esmRefId: recording.esm_ref_id,
        audioUrl: recording.audio_url,
        userEsmId: recording.user_esm_id,
        recordingId: recording.id // Include recordingId for fault tolerance
      }));

    const modulations = esmRecordings
      .filter(recording => recording.category === 3)
      .map(recording => ({
        name: recording.name,
        sampleCount: 1,
        locked: recording.emotion_locked || false,
        esmRefId: recording.esm_ref_id,
        audioUrl: recording.audio_url,
        userEsmId: recording.user_esm_id,
        recordingId: recording.id // Include recordingId for fault tolerance
      }));

    // Group by emotion/sound/modulation name and count samples
    const groupAndCount = (items: any[]) => {
      const grouped = items.reduce((acc, item) => {
        const existing = acc.find(a => a.name === item.name);
        if (existing) {
          existing.sampleCount += 1;
          existing.audioUrls = existing.audioUrls || [];
          existing.audioUrls.push(item.audioUrl);
          existing.recordingIds = existing.recordingIds || [];
          existing.recordingIds.push(item.recordingId);
        } else {
          acc.push({
            ...item,
            audioUrls: [item.audioUrl],
            recordingIds: [item.recordingId]
          });
        }
        return acc;
      }, []);
      return grouped;
    };

    return {
      emotions: groupAndCount(emotions),
      sounds: groupAndCount(sounds),
      modulations: groupAndCount(modulations)
    };
  }

  /**
   * Analyze and determine optimal segmentation strategy
   */
  private analyzeSegmentationStrategy(categoryBreakdown: any) {
    // Level 1: Individual emotion/sound/modulation analysis (6+ samples each)
    const individualCandidates = [];
    
    // Check emotions
    for (const emotion of categoryBreakdown.emotions) {
      if (emotion.sampleCount >= this.MIN_SAMPLES_INDIVIDUAL && !emotion.locked) {
        individualCandidates.push(`emotion:${emotion.name}`);
      }
    }
    
    // Check sounds
    for (const sound of categoryBreakdown.sounds) {
      if (sound.sampleCount >= this.MIN_SAMPLES_INDIVIDUAL && !sound.locked) {
        individualCandidates.push(`sound:${sound.name}`);
      }
    }
    
    // Check modulations
    for (const modulation of categoryBreakdown.modulations) {
      if (modulation.sampleCount >= this.MIN_SAMPLES_INDIVIDUAL && !modulation.locked) {
        individualCandidates.push(`modulation:${modulation.name}`);
      }
    }

    if (individualCandidates.length > 0) {
      console.log(`[MVP2Segmentation] Individual strategy selected: ${individualCandidates.length} items meet 6+ sample threshold`);
      return {
        type: 'individual' as const,
        targetItems: individualCandidates
      };
    }

    // Level 2: Category aggregation (3+ samples per category)
    const categoryCandidates = [];
    
    const unlockedEmotionCount = categoryBreakdown.emotions.filter(e => !e.locked).reduce((sum, e) => sum + e.sampleCount, 0);
    const unlockedSoundCount = categoryBreakdown.sounds.filter(s => !s.locked).reduce((sum, s) => sum + s.sampleCount, 0);
    const unlockedModulationCount = categoryBreakdown.modulations.filter(m => !m.locked).reduce((sum, m) => sum + m.sampleCount, 0);

    if (unlockedEmotionCount >= this.MIN_SAMPLES_CATEGORY) categoryCandidates.push('emotions');
    if (unlockedSoundCount >= this.MIN_SAMPLES_CATEGORY) categoryCandidates.push('sounds');
    if (unlockedModulationCount >= this.MIN_SAMPLES_CATEGORY) categoryCandidates.push('modulations');

    if (categoryCandidates.length > 0) {
      console.log(`[MVP2Segmentation] Category strategy selected: ${categoryCandidates.length} categories meet 3+ sample threshold`);
      return {
        type: 'category' as const,
        targetItems: categoryCandidates
      };
    }

    // Level 3: Combined fallback
    const totalUnlockedSamples = unlockedEmotionCount + unlockedSoundCount + unlockedModulationCount;
    console.log(`[MVP2Segmentation] Combined strategy selected: ${totalUnlockedSamples} total samples available`);
    
    return {
      type: 'combined' as const,
      targetItems: ['all_esm_samples']
    };
  }

  /**
   * Generate ElevenLabs API call plan based on segmentation strategy
   */
  private async generateElevenLabsCallPlan(segmentationStrategy: any, categoryBreakdown: any, userId: string) {
    const { audioStorageFactory } = await import('./audio-storage-providers');
    const audioStorageProvider = audioStorageFactory.getActiveProvider();
    
    const calls = [];

    if (segmentationStrategy.type === 'individual') {
      // Create individual voice clones for each qualifying emotion/sound/modulation
      for (const targetItem of segmentationStrategy.targetItems) {
        const [category, itemName] = targetItem.split(':');
        const categoryData = categoryBreakdown[category === 'emotion' ? 'emotions' : category === 'sound' ? 'sounds' : 'modulations'];
        const item = categoryData.find(i => i.name === itemName);
        
        if (item && item.audioUrls) {
          // Generate signed URLs for external API access
          const signedUrls = [];
          for (const audioUrl of item.audioUrls) {
            try {
              const signedUrl = await audioStorageProvider.generateSignedUrl(audioUrl, {
                expiresIn: '30m',
                purpose: 'external_api_access',
                userId: userId
              });
              signedUrls.push(signedUrl);
            } catch (error) {
              console.error(`[MVP2Segmentation] Failed to generate signed URL for ${audioUrl}:`, error);
            }
          }

          calls.push({
            type: 'individual',
            items: [itemName],
            audioUrls: signedUrls,
            recordingIds: item.recordingIds || [],
            metadata: {
              category: category,
              sampleCount: item.sampleCount,
              voiceType: `${category}_${itemName}`
            }
          });
        }
      }
    } else if (segmentationStrategy.type === 'category') {
      // Create category-specific voice clones
      for (const categoryName of segmentationStrategy.targetItems) {
        const categoryData = categoryBreakdown[categoryName];
        const allUrls = [];
        const itemNames = [];
        const allRecordingIds = [];

        for (const item of categoryData) {
          if (!item.locked && item.audioUrls) {
            itemNames.push(item.name);
            if (item.recordingIds) {
              allRecordingIds.push(...item.recordingIds);
            }
            for (const audioUrl of item.audioUrls) {
              try {
                const signedUrl = await audioStorageProvider.generateSignedUrl(audioUrl, {
                  expiresIn: '30m',
                  purpose: 'external_api_access',
                  userId: userId
                });
                allUrls.push(signedUrl);
              } catch (error) {
                console.error(`[MVP2Segmentation] Failed to generate signed URL for ${audioUrl}:`, error);
              }
            }
          }
        }

        calls.push({
          type: 'category',
          items: itemNames,
          audioUrls: allUrls,
          recordingIds: allRecordingIds,
          metadata: {
            category: categoryName,
            totalSamples: allUrls.length,
            voiceType: `category_${categoryName}`
          }
        });
      }
    } else {
      // Combined voice clone using all samples
      const allUrls = [];
      const allItems = [];
      const allRecordingIds = [];

      for (const categoryName of ['emotions', 'sounds', 'modulations']) {
        const categoryData = categoryBreakdown[categoryName];
        for (const item of categoryData) {
          if (!item.locked && item.audioUrls) {
            allItems.push(`${categoryName}:${item.name}`);
            if (item.recordingIds) {
              allRecordingIds.push(...item.recordingIds);
            }
            for (const audioUrl of item.audioUrls) {
              try {
                const signedUrl = await audioStorageProvider.generateSignedUrl(audioUrl, {
                  expiresIn: '30m',
                  purpose: 'external_api_access',
                  userId: userId
                });
                allUrls.push(signedUrl);
              } catch (error) {
                console.error(`[MVP2Segmentation] Failed to generate signed URL for ${audioUrl}:`, error);
              }
            }
          }
        }
      }

      // Log detailed sample information before creating the call
      console.log(`[MVP2Segmentation] Combined voice clone samples:`, {
        totalItems: allItems.length,
        items: allItems,
        totalUrls: allUrls.length,
        urls: allUrls.map((url, idx) => ({
          index: idx,
          item: allItems[idx] || 'unknown',
          url: url.substring(0, 100) + '...' // Log first 100 chars
        }))
      });
      
      calls.push({
        type: 'combined',
        items: allItems,
        audioUrls: allUrls,
        recordingIds: allRecordingIds,
        metadata: {
          category: 'all',
          totalSamples: allUrls.length,
          voiceType: 'combined_narrator'
        }
      });
    }

    return calls;
  }

  /**
   * Generate ESM item-level locking plan for automatic locking after voice generation
   */
  private generateLockingPlan(segmentationStrategy: any, categoryBreakdown: any) {
    const esmItemsToLock = [];

    if (segmentationStrategy.type === 'individual') {
      // Lock specific emotions/sounds/modulations that get individual voice clones
      for (const targetItem of segmentationStrategy.targetItems) {
        const [category, itemName] = targetItem.split(':');
        const categoryNum = category === 'emotion' ? 1 : category === 'sound' ? 2 : 3;
        const categoryKey = category === 'emotion' ? 'emotions' : category === 'sound' ? 'sounds' : 'modulations';
        const item = categoryBreakdown[categoryKey].find(i => i.name === itemName);
        
        if (item) {
          esmItemsToLock.push({
            category: categoryNum,
            itemName: itemName,
            esmRefId: item.esmRefId
          });
        }
      }
    } else if (segmentationStrategy.type === 'category') {
      // Lock all items in categories that get category-specific voice clones
      for (const categoryName of segmentationStrategy.targetItems) {
        const categoryNum = categoryName === 'emotions' ? 1 : categoryName === 'sounds' ? 2 : 3;
        const categoryData = categoryBreakdown[categoryName];
        
        for (const item of categoryData) {
          if (!item.locked) {
            esmItemsToLock.push({
              category: categoryNum,
              itemName: item.name,
              esmRefId: item.esmRefId
            });
          }
        }
      }
    } else {
      // Combined: Lock all unlocked ESM items across all categories
      const allCategories = [
        { name: 'emotions', num: 1, data: categoryBreakdown.emotions },
        { name: 'sounds', num: 2, data: categoryBreakdown.sounds },
        { name: 'modulations', num: 3, data: categoryBreakdown.modulations }
      ];

      for (const category of allCategories) {
        for (const item of category.data) {
          if (!item.locked) {
            esmItemsToLock.push({
              category: category.num,
              itemName: item.name,
              esmRefId: item.esmRefId
            });
          }
        }
      }
    }

    return { esmItemsToLock };
  }

  /**
   * Apply ESM item-level locking after successful voice generation
   * @param userId - User identifier
   * @param lockingPlan - Plan generated by determineElevenLabsSegmentation
   */
  async applyEsmItemLocking(userId: string, lockingPlan: any): Promise<void> {
    console.log(`[MVP2Segmentation] ===== APPLYING ESM ITEM-LEVEL LOCKING =====`);
    console.log(`[MVP2Segmentation] Locking ${lockingPlan.esmItemsToLock.length} ESM items`);

    try {
      for (const item of lockingPlan.esmItemsToLock) {
        await this.lockEsmReference(item.esmRefId, item.category, item.itemName);
      }

      console.log(`[MVP2Segmentation] ===== ESM ITEM-LEVEL LOCKING COMPLETE =====`);
    } catch (error) {
      console.error(`[MVP2Segmentation] Failed to apply ESM item-level locking:`, error);
      throw error;
    }
  }

  /**
   * Lock specific ESM reference item
   */
  private async lockEsmReference(esmRefId: number, category: number, itemName: string): Promise<void> {
    // TODO: Add esm_locked and esm_locked_at fields to esm_ref table
    // For now, we'll add this to the roadmap as the database schema needs updating
    console.log(`[MVP2Segmentation] Would lock ESM ref ID ${esmRefId} (category ${category}, item ${itemName}) - schema update required`);
  }
}

export const voiceCloningSegmentationService = new VoiceCloningSegmentationService();