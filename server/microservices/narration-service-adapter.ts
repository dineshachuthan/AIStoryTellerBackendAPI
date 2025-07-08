/**
 * Narration Service Adapter for Microservices Architecture
 * Manages voice cloning and story narration operations within monolith during migration
 * Follows Adapter Pattern for gradual extraction to independent service
 */

import { BaseMicroserviceAdapter } from './base-microservice-adapter';
import { storage } from '../storage';
import { openaiCachedProvider } from '../openai';
import { elevenLabsVoiceCloning } from '../elevenlabs-voice-cloning';
import { voiceProviderRegistry } from '../voice-providers/voice-provider-registry';

export class NarrationServiceAdapter extends BaseMicroserviceAdapter {
  constructor() {
    // Define owned tables for narration service
    const ownedTables = [
      'userVoiceSamples',
      'voiceCloningJobs',
      'userEsm',
      'userEsmRecordings',
      'storyNarrations',
      'aiAssetCache'
    ];
    
    super('narration', ownedTables);
  }

  /**
   * Initialize narration service event handlers
   */
  async initialize(): Promise<void> {
    this.setupEventHandlers();
    
    console.log('[NarrationAdapter] Initialized in monolith mode');
  }

  /**
   * Setup event handlers for cross-service communication
   */
  private setupEventHandlers(): void {
    // Listen for story events
    this.subscribeToEvent("story.created", async (event) => {
      console.log("[NarrationAdapter] Story created, voice narration available");
      // Track story for potential narration
      await this.publishEvent("narration.story.available", {
        storyId: event.payload.storyId,
        userId: event.payload.userId
      });
    });

    // Listen for collaboration completion to trigger video generation
    this.subscribeToEvent("collaboration.completed", async (event) => {
      console.log("[NarrationAdapter] Collaboration completed, checking for narration needs");
      const { templateId } = event.payload;
      
      // Check if all voice recordings are complete
      const template = await storage.getRoleplayTemplate?.(templateId);
      if (template) {
        await this.checkNarrationReadiness(template);
      }
    });

    // Listen for subscription changes
    this.subscribeToEvent("subscription.updated", async (event) => {
      console.log("[NarrationAdapter] Subscription updated, adjusting voice cloning limits");
      // Update voice cloning limits based on subscription tier
    });

    // Listen for user deletion
    this.subscribeToEvent("user.deleted", async (event) => {
      console.log("[NarrationAdapter] User deleted, archiving voice data");
      await this.archiveUserVoiceData(event.payload.userId);
    });
  }

  /**
   * Start voice cloning process
   */
  async startVoiceCloning(userId: string, voiceSamples: any[]): Promise<any> {
    try {
      // Check subscription limits
      const canClone = await this.checkVoiceCloningLimits(userId);
      if (!canClone.allowed) {
        throw new Error(`Voice cloning limit reached. Limit: ${canClone.limit}`);
      }

      // Create voice cloning job
      const job = await storage.createVoiceCloningJob?.({
        userId,
        status: 'pending',
        samplesCount: voiceSamples.length,
        provider: 'elevenlabs'
      });

      // Publish event
      await this.publishEvent("narration.voice.cloning.started", {
        userId,
        jobId: job.id,
        samplesCount: voiceSamples.length
      });

      // Start async voice cloning
      this.processVoiceCloning(userId, job.id, voiceSamples);

      return job;
    } catch (error) {
      console.error("Failed to start voice cloning:", error);
      throw error;
    }
  }

  /**
   * Process voice cloning asynchronously
   */
  private async processVoiceCloning(userId: string, jobId: number, voiceSamples: any[]): Promise<void> {
    try {
      // Update job status
      await storage.updateVoiceCloningJob?.(jobId, {
        status: 'processing',
        startedAt: new Date()
      });

      // Process with ElevenLabs
      const result = await elevenLabsVoiceCloning.processVoiceCloning(userId, voiceSamples);

      if (result.success) {
        // Update job with success
        await storage.updateVoiceCloningJob?.(jobId, {
          status: 'completed',
          completedAt: new Date(),
          voiceId: result.voiceId,
          metadata: result.metadata
        });

        // Publish success event
        await this.publishEvent("narration.voice.cloned", {
          userId,
          jobId,
          voiceId: result.voiceId
        });

        // Also publish to story service
        await this.publishEvent("voice.cloned", {
          userId,
          voiceId: result.voiceId
        });
      } else {
        // Update job with failure
        await storage.updateVoiceCloningJob?.(jobId, {
          status: 'failed',
          completedAt: new Date(),
          error: result.error
        });

        // Publish failure event
        await this.publishEvent("narration.voice.cloning.failed", {
          userId,
          jobId,
          error: result.error
        });
      }
    } catch (error) {
      console.error("Voice cloning processing failed:", error);
      
      await storage.updateVoiceCloningJob?.(jobId, {
        status: 'failed',
        completedAt: new Date(),
        error: error.message
      });

      await this.publishEvent("narration.voice.cloning.failed", {
        userId,
        jobId,
        error: error.message
      });
    }
  }

  /**
   * Generate story narration
   */
  async generateNarration(storyId: number, userId: string, options?: any): Promise<any> {
    try {
      const story = await storage.getStory(storyId);
      if (!story || story.userId !== userId) {
        throw new Error("Story not found or access denied");
      }

      // Check if narration already exists
      const existing = await storage.getStoryNarrations?.(storyId);
      if (existing && existing.length > 0 && !options?.regenerate) {
        return { narrations: existing, cached: true };
      }

      // Get narrator voice
      const narratorVoice = await this.getNarratorVoice(userId, story);

      // Publish start event
      await this.publishEvent("narration.generation.started", {
        storyId,
        userId,
        voiceType: narratorVoice.type
      });

      // Generate narration segments
      const segments = await this.generateNarrationSegments(story, narratorVoice);

      // Save narrations
      const narrations = [];
      for (let i = 0; i < segments.length; i++) {
        const narration = await storage.createStoryNarration?.({
          storyId,
          userId,
          segmentIndex: i,
          text: segments[i].text,
          audioUrl: segments[i].audioUrl,
          duration: segments[i].duration,
          emotion: segments[i].emotion,
          voiceId: narratorVoice.id,
          voiceType: narratorVoice.type
        });
        narrations.push(narration);
      }

      // Publish completion event
      await this.publishEvent("narration.generation.completed", {
        storyId,
        userId,
        segmentCount: narrations.length,
        totalDuration: narrations.reduce((sum, n) => sum + n.duration, 0)
      });

      return { narrations, cached: false };
    } catch (error) {
      console.error("Failed to generate narration:", error);
      
      await this.publishEvent("narration.generation.failed", {
        storyId,
        userId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Get narrator voice for story
   */
  private async getNarratorVoice(userId: string, story: any): Promise<any> {
    // Check for ElevenLabs narrator voice
    const userEsm = await storage.getUserEsm?.(userId);
    if (userEsm?.narrator_voice_id) {
      return {
        id: userEsm.narrator_voice_id,
        type: 'elevenlabs',
        provider: 'elevenlabs'
      };
    }

    // Fallback to OpenAI
    const voiceProvider = VoiceProviderRegistry.getInstance().getProvider('openai');
    const defaultVoice = voiceProvider?.getDefaultVoice() || 'alloy';
    
    return {
      id: defaultVoice,
      type: 'openai',
      provider: 'openai'
    };
  }

  /**
   * Generate narration segments
   */
  private async generateNarrationSegments(story: any, narratorVoice: any): Promise<any[]> {
    // This would implement the actual narration generation logic
    // For now, returning placeholder
    const segments = [];
    
    // Split story into segments based on paragraphs or scenes
    const paragraphs = story.content.split('\n\n').filter(p => p.trim());
    
    for (let i = 0; i < paragraphs.length; i++) {
      const text = paragraphs[i];
      const emotion = this.detectEmotion(text, story.analysisData);
      
      // Generate audio for segment
      const audio = await this.generateAudio(text, narratorVoice, emotion);
      
      segments.push({
        text,
        emotion,
        audioUrl: audio.url,
        duration: audio.duration
      });
    }
    
    return segments;
  }

  /**
   * Detect emotion for text segment
   */
  private detectEmotion(text: string, analysisData: any): string {
    // Simple emotion detection based on story analysis
    if (!analysisData?.emotions) return 'neutral';
    
    for (const emotion of analysisData.emotions) {
      if (emotion.quote && text.includes(emotion.quote)) {
        return emotion.emotion.toLowerCase();
      }
    }
    
    return 'neutral';
  }

  /**
   * Generate audio for text segment
   */
  private async generateAudio(text: string, voice: any, emotion: string): Promise<any> {
    // This would call the appropriate voice provider
    // For now, returning placeholder
    return {
      url: `/api/audio/narration/${Date.now()}.mp3`,
      duration: Math.ceil(text.split(' ').length / 3) // Rough estimate
    };
  }

  /**
   * Check voice cloning limits
   */
  private async checkVoiceCloningLimits(userId: string): Promise<{
    allowed: boolean;
    limit: number;
  }> {
    // Get subscription limits
    const { subscriptionServiceAdapter } = await import('./subscription-service-adapter');
    const limits = await subscriptionServiceAdapter.getFeatureLimits(userId);
    
    // Check monthly voice cloning count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const clonesThisMonth = await storage.countVoiceCloningJobsSince?.(userId, startOfMonth) || 0;
    
    return {
      allowed: limits.voiceClonesPerMonth === -1 || clonesThisMonth < limits.voiceClonesPerMonth,
      limit: limits.voiceClonesPerMonth
    };
  }

  /**
   * Check narration readiness
   */
  private async checkNarrationReadiness(template: any): Promise<void> {
    const submissions = await storage.getRoleplaySubmissions?.(template.id);
    const hasAllVoices = submissions.every(s => s.contentType === 'voice');
    
    if (hasAllVoices) {
      await this.publishEvent("narration.roleplay.ready", {
        templateId: template.id,
        storyId: template.storyId
      });
    }
  }

  /**
   * Archive user voice data
   */
  private async archiveUserVoiceData(userId: string): Promise<void> {
    // Archive voice samples
    const samples = await storage.getUserVoiceSamples?.(userId);
    for (const sample of samples || []) {
      await storage.updateUserVoiceSample?.(sample.id, { isActive: false });
    }
    
    // Archive ESM recordings
    const recordings = await storage.getUserEsmRecordings?.(userId);
    for (const recording of recordings || []) {
      await storage.updateUserEsmRecording?.(recording.id, { is_active: false });
    }
  }

  /**
   * Get user narration statistics
   */
  async getUserNarrationStats(userId: string): Promise<any> {
    const voiceSamples = await storage.getUserVoiceSamples?.(userId) || [];
    const narrations = await storage.getUserStoryNarrations?.(userId) || [];
    const voiceJobs = await storage.getUserVoiceCloningJobs?.(userId) || [];
    
    return {
      voiceSamplesCount: voiceSamples.length,
      narrationsCount: narrations.length,
      voiceCloningJobs: voiceJobs.length,
      hasNarratorVoice: !!(await storage.getUserEsm?.(userId))?.narrator_voice_id
    };
  }
}

// Export singleton instance
export const narrationServiceAdapter = new NarrationServiceAdapter();