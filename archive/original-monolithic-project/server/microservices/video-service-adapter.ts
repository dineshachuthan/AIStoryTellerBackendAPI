/**
 * Video Service Adapter for Microservices Architecture
 * Manages video generation operations within monolith during migration
 * Follows Adapter Pattern for gradual extraction to independent service
 */

import { BaseMicroserviceAdapter } from './base-microservice-adapter';
import { storage } from '../storage';
import { collaborativeRoleplayStorage } from '../collaborative-roleplay-storage';
import { VideoProviderRegistry } from '../video-providers/provider-registry';
import { ErrorCodes } from '../../shared/api-response';

export class VideoServiceAdapter extends BaseMicroserviceAdapter {
  constructor() {
    // Define owned tables for video service
    const ownedTables = [
      'videoJobs',
      'videoProviders',
      'videoGeneration',
      'videoCache'
    ];
    
    super('video', ownedTables);
  }

  /**
   * Initialize video service event handlers
   */
  async initialize(): Promise<void> {
    this.setupEventHandlers();
    
    console.log('[VideoAdapter] Initialized in monolith mode');
  }

  /**
   * Setup event handlers for cross-service communication
   */
  private setupEventHandlers(): void {
    // Listen for collaboration completion
    this.subscribeToEvent("collaboration.completed", async (event) => {
      console.log("[VideoAdapter] Collaboration completed, checking for video generation");
      const { templateId } = event.payload;
      
      // Check if ready for video generation
      const template = await storage.getRoleplayTemplate?.(templateId);
      if (template) {
        await this.checkVideoGenerationReadiness(template);
      }
    });

    // Listen for narration completion
    this.subscribeToEvent("narration.generation.completed", async (event) => {
      console.log("[VideoAdapter] Narration completed for story", event.payload.storyId);
      // Track narration completion for potential video generation
    });

    // Listen for roleplay readiness
    this.subscribeToEvent("narration.roleplay.ready", async (event) => {
      console.log("[VideoAdapter] Roleplay ready for video generation");
      const { templateId, storyId } = event.payload;
      
      // Auto-trigger video generation if enabled
      const template = await storage.getRoleplayTemplate?.(templateId);
      if (template?.autoGenerateVideo) {
        await this.startVideoGeneration(templateId, template.userId);
      }
    });

    // Listen for subscription changes
    this.subscribeToEvent("subscription.updated", async (event) => {
      console.log("[VideoAdapter] Subscription updated, adjusting video generation limits");
      // Update video generation limits based on subscription tier
    });

    // Listen for user deletion
    this.subscribeToEvent("user.deleted", async (event) => {
      console.log("[VideoAdapter] User deleted, archiving video data");
      await this.archiveUserVideoData(event.payload.userId);
    });
  }

  /**
   * Start video generation process
   */
  async startVideoGeneration(templateId: number, userId: string, options?: any): Promise<any> {
    try {
      // Validate template ownership
      const template = await storage.getRoleplayTemplate?.(templateId);
      if (!template || template.userId !== userId) {
        throw new Error("Template not found or access denied");
      }

      // Check subscription limits
      const canGenerate = await this.checkVideoGenerationLimits(userId);
      if (!canGenerate.allowed) {
        throw new Error(`Video generation limit reached. Limit: ${canGenerate.limit}`);
      }

      // Get all submissions for the template
      const submissions = await storage.getRoleplaySubmissions?.(templateId);
      if (!submissions || submissions.length === 0) {
        throw new Error("No submissions found for template");
      }

      // Create video job
      const job = await collaborativeRoleplayStorage.createVideoJob({
        instanceId: templateId, // Using templateId as instanceId for now
        status: 'queued',
        priority: 1,
        videoParams: {
          provider: options?.provider || 'runwayml',
          quality: options?.quality || 'standard',
          duration: options?.duration || 30
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Publish event
      await this.publishEvent("video.generation.started", {
        userId,
        templateId,
        jobId: job.id,
        provider: job.provider
      });

      // Start async video generation
      this.processVideoGeneration(userId, templateId, job.id, submissions, options);

      return job;
    } catch (error) {
      console.error("Failed to start video generation:", error);
      throw error;
    }
  }

  /**
   * Process video generation asynchronously
   */
  private async processVideoGeneration(
    userId: string, 
    templateId: number, 
    jobId: number, 
    submissions: any[],
    options?: any
  ): Promise<void> {
    try {
      // Update job status
      await collaborativeRoleplayStorage.updateVideoJob(jobId, {
        status: 'processing',
        startedAt: new Date(),
        updatedAt: new Date()
      });

      // Get video provider
      const providerName = options?.provider || 'runwayml';
      const provider = VideoProviderRegistry.getInstance().getProvider(providerName);
      
      if (!provider) {
        throw new Error(`Video provider ${providerName} not available`);
      }

      // Prepare video generation request
      const videoRequest = await this.prepareVideoRequest(templateId, submissions);

      // Generate video
      const result = await provider.generateVideo(videoRequest);

      if (result.success) {
        // Save video
        const video = await storage.createVideoGeneration?.({
          jobId,
          templateId,
          userId,
          provider: providerName,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          duration: result.duration,
          metadata: result.metadata
        });

        // Update job with success
        await collaborativeRoleplayStorage.updateVideoJob(jobId, {
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        });

        // Publish success event
        await this.publishEvent("video.generation.completed", {
          userId,
          templateId,
          jobId,
          videoId: video.id,
          videoUrl: result.videoUrl
        });

        // Also publish generic event for other services
        await this.publishEvent("video.generated", {
          userId,
          videoId: video.id,
          duration: result.duration
        });
      } else {
        // Handle failure
        await collaborativeRoleplayStorage.updateVideoJob(jobId, {
          status: 'failed',
          completedAt: new Date(),
          error: result.error,
          updatedAt: new Date()
        });

        // Try fallback provider if available
        if (options?.allowFallback && providerName !== 'luma') {
          console.log(`[VideoAdapter] Trying fallback provider after ${providerName} failed`);
          await this.tryFallbackProvider(userId, templateId, jobId, submissions, result.error);
        } else {
          // Publish failure event
          await this.publishEvent("video.generation.failed", {
            userId,
            templateId,
            jobId,
            error: result.error
          });
        }
      }
    } catch (error) {
      console.error("Video generation processing failed:", error);
      
      await collaborativeRoleplayStorage.updateVideoJob(jobId, {
        status: 'failed',
        completedAt: new Date(),
        error: error.message,
        updatedAt: new Date()
      });

      await this.publishEvent("video.generation.failed", {
        userId,
        templateId,
        jobId,
        error: error.message
      });
    }
  }

  /**
   * Try fallback video provider - Disabled during development
   */
  private async tryFallbackProvider(
    userId: string,
    templateId: number,
    jobId: number,
    submissions: any[],
    previousError: string
  ): Promise<void> {
    console.warn(`[VideoAdapter] Primary provider failed, fallback needed`);
    
    // During development, return error code instead of trying fallbacks
    await collaborativeRoleplayStorage.updateVideoJob(jobId, {
      status: 'failed',
      completedAt: new Date(),
      error: previousError,
      errorCode: 1001,
      updatedAt: new Date()
    });

    // Publish failure event with error code
    await this.publishEvent("video.generation.failed", {
      userId,
      templateId,
      jobId,
      error: "Fallback provider needed",
      errorCode: 1001,
      messageKey: 'errors.api.fallback_provider_needed'
    });

    // Throw error with code
    const error = new Error('Fallback provider needed');
    (error as any).code = 1001;
    (error as any).messageKey = 'errors.api.fallback_provider_needed';
    throw error;
  }

  /**
   * Prepare video generation request
   */
  private async prepareVideoRequest(templateId: number, submissions: any[]): Promise<any> {
    const template = await storage.getRoleplayTemplate?.(templateId);
    const story = await storage.getStory(template.storyId);
    
    // Group submissions by type
    const voiceSubmissions = submissions.filter(s => s.contentType === 'voice');
    const videoSubmissions = submissions.filter(s => s.contentType === 'video');
    const imageSubmissions = submissions.filter(s => s.contentType === 'image');
    
    return {
      title: story.title,
      description: template.description,
      characters: template.characters,
      voiceUrls: voiceSubmissions.map(s => s.contentUrl),
      videoUrls: videoSubmissions.map(s => s.contentUrl),
      imageUrls: imageSubmissions.map(s => s.contentUrl),
      duration: 30, // Default duration
      style: template.videoStyle || 'cinematic',
      metadata: {
        templateId,
        storyId: story.id,
        submissionCount: submissions.length
      }
    };
  }

  /**
   * Check video generation limits
   */
  private async checkVideoGenerationLimits(userId: string): Promise<{
    allowed: boolean;
    limit: number;
  }> {
    // Get subscription limits
    const { subscriptionServiceAdapter } = await import('./subscription-service-adapter');
    const limits = await subscriptionServiceAdapter.getFeatureLimits(userId);
    
    // Check monthly video generation count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const videosThisMonth = await storage.countVideoJobsSince?.(userId, startOfMonth) || 0;
    
    return {
      allowed: limits.videosPerMonth === -1 || videosThisMonth < limits.videosPerMonth,
      limit: limits.videosPerMonth
    };
  }

  /**
   * Check if template is ready for video generation
   */
  private async checkVideoGenerationReadiness(template: any): Promise<void> {
    const submissions = await storage.getRoleplaySubmissions?.(template.id);
    const participants = await storage.getRoleplayParticipants?.(template.id);
    
    // Check if all participants have submitted
    if (submissions.length === participants.length) {
      await this.publishEvent("video.generation.ready", {
        templateId: template.id,
        storyId: template.storyId,
        submissionCount: submissions.length
      });
    }
  }

  /**
   * Archive user video data
   */
  private async archiveUserVideoData(userId: string): Promise<void> {
    // Archive video jobs - placeholder implementation
    // TODO: Implement getUserVideoJobs in collaborative roleplay storage
    console.log(`[VideoAdapter] Archiving video data for user ${userId}`);
  }

  /**
   * Get user video statistics
   */
  async getUserVideoStats(userId: string): Promise<any> {
    // TODO: Implement getUserVideoJobs in collaborative roleplay storage
    console.log(`[VideoAdapter] Getting video stats for user ${userId}`);
    
    return {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      videosGenerated: 0,
      totalDuration: 0,
      providers: {
        runwayml: 0,
        pika: 0,
        luma: 0
      }
    };
  }

  /**
   * Get video generation status
   */
  async getVideoJobStatus(jobId: number, userId: string): Promise<any> {
    const job = await collaborativeRoleplayStorage.getVideoJob(jobId);
    if (!job) {
      throw new Error("Job not found or access denied");
    }
    
    return {
      id: job.id,
      status: job.status,
      provider: job.videoParams?.provider,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      video: null // TODO: Implement video retrieval
    };
  }
}

// Export singleton instance
export const videoServiceAdapter = new VideoServiceAdapter();