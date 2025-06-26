import { VideoProviderRegistry } from './video-providers/provider-registry';
import { VideoBusinessLogic, VideoGenerationRequest, VideoGenerationResult } from './video-business-logic';
import { KlingPromptTemplate } from './video-providers/kling-prompt-template';
import { StandardVideoRequest, VideoProviderException } from './video-providers/video-provider-interface';

/**
 * Generic video service that works with any configured provider
 * Routes are completely provider-agnostic
 */
export class GenericVideoService {
  private static instance: GenericVideoService;
  private registry: VideoProviderRegistry;

  private constructor() {
    this.registry = VideoProviderRegistry.getInstance();
  }

  static getInstance(): GenericVideoService {
    if (!GenericVideoService.instance) {
      GenericVideoService.instance = new GenericVideoService();
    }
    return GenericVideoService.instance;
  }

  /**
   * Initialize the service and auto-configure providers
   */
  async initialize(): Promise<void> {
    await this.registry.autoConfigureFromEnvironment();
    console.log('Generic video service initialized');
  }

  /**
   * Generate video using active provider
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const provider = this.registry.getActiveProvider();
    if (!provider) {
      throw new Error('No video providers are configured or enabled');
    }

    console.log(`Generating video using provider: ${provider.name}`);

    try {
      // Convert to standard video request
      const standardRequest = await this.prepareStandardRequest(request, provider.name);
      
      // Generate video using provider
      const response = await provider.generateVideo(standardRequest);
      
      // Convert to business logic format
      const result: VideoGenerationResult = {
        videoId: response.taskId || this.generateVideoId(),
        status: response.status === 'completed' ? 'draft' : 'processing',
        videoUrl: response.videoUrl,
        thumbnailUrl: response.thumbnailUrl,
        duration: request.duration || 20,
        createdAt: new Date(),
        prompt: standardRequest.prompt,
        provider: provider.name,
        taskId: response.taskId
      };

      // Save to database using business logic
      await VideoBusinessLogic.saveVideoRecord(request.storyId, request.userId, result);

      // Start status polling if needed
      if (response.taskId && !response.videoUrl) {
        this.startStatusPolling(response.taskId, request.storyId, request.userId, provider.name);
      }

      return result;
    } catch (error: any) {
      console.error(`Video generation failed with provider ${provider.name}:`, error);
      throw error;
    }
  }

  /**
   * Check video generation status
   */
  async checkVideoStatus(taskId: string, providerName?: string): Promise<any> {
    const provider = providerName 
      ? this.registry.getProvider(providerName)
      : this.registry.getActiveProvider();

    if (!provider) {
      throw new Error('Provider not available');
    }

    return await provider.checkStatus(taskId);
  }

  /**
   * Cancel video generation
   */
  async cancelVideo(taskId: string, providerName?: string): Promise<boolean> {
    const provider = providerName 
      ? this.registry.getProvider(providerName)
      : this.registry.getActiveProvider();

    if (!provider || !provider.cancelGeneration) {
      return false;
    }

    return await provider.cancelGeneration(taskId);
  }

  /**
   * Get provider status and capabilities
   */
  async getProvidersStatus(): Promise<any> {
    return await this.registry.getProviderStatus();
  }

  /**
   * Switch active provider
   */
  switchProvider(providerName: string): boolean {
    return this.registry.setActiveProvider(providerName);
  }

  /**
   * Accept video (finalize)
   */
  async acceptVideo(storyId: number, userId: string): Promise<void> {
    return VideoBusinessLogic.acceptVideo(storyId, userId);
  }

  /**
   * Regenerate video
   */
  async regenerateVideo(storyId: number, userId: string): Promise<VideoGenerationResult> {
    // Get original request data
    const story = await this.getStory(storyId, userId);
    const roleplayAnalysis = await this.getRoleplayAnalysis(storyId);

    if (!story || !roleplayAnalysis) {
      throw new Error('Story or roleplay analysis not found');
    }

    // Clear existing video
    await VideoBusinessLogic.deleteVideoRecord(storyId);

    // Generate new video
    return this.generateVideo({
      storyId,
      userId,
      roleplayAnalysis,
      storyContent: story.content,
      regenerate: true
    });
  }

  /**
   * Check video access
   */
  async checkVideoAccess(storyId: number, userId: string): Promise<any> {
    return VideoBusinessLogic.checkVideoAccess(storyId, userId);
  }

  // Private helper methods

  private async prepareStandardRequest(request: VideoGenerationRequest, providerName: string): Promise<StandardVideoRequest> {
    let prompt = '';
    
    // Use provider-specific prompt generation
    if (providerName === 'kling') {
      const promptData = KlingPromptTemplate.extractFromRoleplayAnalysis(
        request.roleplayAnalysis,
        request.storyContent,
        request.duration || 20,
        request.quality || 'std'
      );
      prompt = KlingPromptTemplate.generatePrompt(promptData);
    } else {
      // Generic prompt for other providers
      prompt = this.buildGenericPrompt(request);
    }

    return {
      prompt,
      duration: request.duration || 20,
      aspectRatio: '16:9',
      quality: request.quality || 'std',
      characters: request.roleplayAnalysis.characters?.map(char => ({
        name: char.name,
        description: char.description || '',
        personality: char.personality || '',
        role: char.role || 'character',
        imageUrl: char.imageUrl
      })) || [],
      scenes: request.roleplayAnalysis.scenes?.map(scene => ({
        title: scene.title || 'Scene',
        backgroundDescription: scene.backgroundDescription || '',
        background: scene.background
      })) || [],
      metadata: {
        storyId: request.storyId,
        userId: request.userId,
        regenerate: request.regenerate
      }
    };
  }

  private buildGenericPrompt(request: VideoGenerationRequest): string {
    let prompt = '';
    
    if (request.roleplayAnalysis.characters?.length > 0) {
      const chars = request.roleplayAnalysis.characters.map(c => `${c.name}: ${c.description}`).join(', ');
      prompt += `Characters: ${chars}. `;
    }
    
    if (request.roleplayAnalysis.scenes?.length > 0) {
      const scenes = request.roleplayAnalysis.scenes.map(s => s.backgroundDescription || s.title).join(', ');
      prompt += `Scenes: ${scenes}. `;
    }
    
    prompt += `Story: ${request.storyContent.substring(0, 300)}. `;
    prompt += 'Professional cinematic video with engaging storytelling.';
    
    return prompt;
  }





  private startStatusPolling(taskId: string, storyId: number, userId: string, providerName: string): void {
    console.log(`Starting status polling for task ${taskId}`);
    
    let attempts = 0;
    let consecutiveErrors = 0;
    const maxAttempts = 18; // 3 minutes (18 * 10 seconds) 
    const maxConsecutiveErrors = 3;

    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        const status = await this.checkVideoStatus(taskId, providerName);
        consecutiveErrors = 0; // Reset on successful call
        
        console.log(`Poll ${attempts}/${maxAttempts} - Status: ${status.status}`);
        
        if (status.status === 'completed' && status.videoUrl) {
          clearInterval(pollInterval);
          
          const { VideoBusinessLogic } = await import('./video-business-logic');
          await VideoBusinessLogic.updateVideoStatus(storyId, 'complete', {
            videoUrl: status.videoUrl,
            thumbnailUrl: status.thumbnailUrl
          });
          
          console.log(`Video generation completed: ${taskId}`);
          return;
        } 
        
        if (status.status === 'failed') {
          clearInterval(pollInterval);
          
          const { VideoBusinessLogic } = await import('./video-business-logic');
          await VideoBusinessLogic.updateVideoStatus(storyId, 'failed');
          
          console.log(`Video generation failed: ${taskId}`);
          return;
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          console.log(`Polling timeout for task ${taskId} after ${attempts} attempts`);
          return;
        }
        
      } catch (error: any) {
        consecutiveErrors++;
        console.error(`Poll error ${consecutiveErrors}/${maxConsecutiveErrors}:`, error.message);
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          clearInterval(pollInterval);
          console.log(`Stopping polling for task ${taskId} - too many consecutive errors`);
          return;
        }
      }
    }, 10000); // Poll every 10 seconds
  }

  private generateVideoId(): string {
    return `video_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private async getStory(storyId: number, userId: string): Promise<any> {
    // This would use your existing storage system
    const { storage } = await import('./storage');
    return await storage.getStory(storyId);
  }

  private async getRoleplayAnalysis(storyId: number): Promise<any> {
    // This would use your existing storage system
    const { storage } = await import('./storage');
    const analysis = await storage.getStoryAnalysis(storyId, 'roleplay');
    return analysis?.analysisData || null;
  }
}