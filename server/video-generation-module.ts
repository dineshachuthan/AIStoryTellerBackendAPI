import { VideoBusinessLogic, VideoGenerationRequest, VideoGenerationResult } from './video-business-logic';
import { KlingPromptTemplate, KlingPromptData } from './video-providers/kling-prompt-template';
import { videoProviderManager } from './video-generation-service';

/**
 * Kling-specific video generation module
 * Uses shared business logic with Kling-specific prompt generation
 */
export class VideoGenerationModule {
  /**
   * Generate video using Kling provider with enhanced prompt template
   */
  static async generateVideoFromRoleplay(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    // Create Kling-specific provider wrapper
    const klingProvider = {
      name: 'kling',
      generateVideo: async (data: any) => {
        return await this.callKlingAPI(data.promptData, data.prompt);
      },
      checkStatus: async (taskId: string) => {
        return await this.checkVideoStatus(taskId);
      }
    };

    // Prepare Kling-specific data
    const promptData = KlingPromptTemplate.extractFromRoleplayAnalysis(
      request.roleplayAnalysis,
      request.storyContent,
      request.duration || 20,
      request.quality || 'std'
    );

    const prompt = KlingPromptTemplate.generatePrompt(promptData);

    // Create enhanced provider with data
    const enhancedProvider = {
      name: 'kling',
      generateVideo: async (data: any) => {
        return await this.callKlingAPI(promptData, prompt);
      },
      checkStatus: async (taskId: string) => {
        return await this.checkVideoStatus(taskId);
      }
    };

    return VideoBusinessLogic.generateVideo(request, enhancedProvider);
  }

  /**
   * Call Kling API with prepared data
   */
  private static async callKlingAPI(promptData: KlingPromptData, prompt: string): Promise<{
    taskId?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
  }> {
    const provider = videoProviderManager.getProvider('kling');
    if (!provider) {
      throw new Error('Kling provider not available');
    }

    // Prepare video request
    const videoRequest = {
      content: prompt,
      duration: promptData.technicalSpecs.duration,
      aspectRatio: promptData.technicalSpecs.aspectRatio,
      quality: promptData.technicalSpecs.quality,
      characters: promptData.characters.map(char => ({
        name: char.name,
        description: char.physicalDescription,
        personality: char.personality,
        role: char.role,
        imageUrl: char.imageUrls?.[0] // Use first image if available
      })),
      scenes: promptData.scenes.map(scene => ({
        title: scene.location,
        backgroundDescription: scene.backgroundDescription,
        background: {
          location: scene.location,
          timeOfDay: scene.timeOfDay,
          atmosphere: scene.atmosphere,
          lighting: scene.lighting,
          visualDescription: scene.visualDetails
        }
      }))
    };

    console.log('Calling Kling API with enhanced request:', {
      promptLength: prompt.length,
      charactersCount: promptData.characters.length,
      scenesCount: promptData.scenes.length,
      duration: promptData.technicalSpecs.duration
    });

    const response = await provider.generateVideo(videoRequest);
    
    return {
      taskId: response.taskId,
      videoUrl: response.videoUrl,
      thumbnailUrl: response.thumbnailUrl
    };
  }

  /**
   * Poll video generation status until complete
   */
  private static async pollVideoStatus(taskId: string, storyId: number, userId: string): Promise<void> {
    const maxAttempts = 60; // 5 minutes
    let attempts = 0;

    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        const provider = videoProviderManager.getProvider('kling');
        if (!provider) {
          clearInterval(pollInterval);
          return;
        }

        // Check status (this would need to be implemented in the provider)
        const status = await this.checkVideoStatus(taskId);
        
        if (status.completed) {
          clearInterval(pollInterval);
          
          // Update database with final video
          await storage.updateVideoGeneration(storyId, {
            status: 'draft', // Keep as draft until user accepts
            videoUrl: status.videoUrl,
            thumbnailUrl: status.thumbnailUrl
          });
          
          console.log('Video generation completed:', { taskId, videoUrl: status.videoUrl });
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          
          // Mark as failed if timeout
          await storage.updateVideoGeneration(storyId, {
            status: 'failed'
          });
          
          console.error('Video generation timeout:', { taskId });
        }
        
      } catch (error) {
        console.error('Error polling video status:', error);
      }
    }, 5000); // Poll every 5 seconds
  }

  /**
   * Check video generation status
   */
  private static async checkVideoStatus(taskId: string): Promise<{
    completed: boolean;
    videoUrl?: string;
    thumbnailUrl?: string;
  }> {
    // This would call the Kling status endpoint
    // Real Kling status endpoint implementation required
    throw new Error('Kling video status checking not implemented - real API integration required');
  }

  /**
   * Accept/finalize video (delegate to shared business logic)
   */
  static async acceptVideo(storyId: number, userId: string): Promise<void> {
    return VideoBusinessLogic.acceptVideo(storyId, userId);
  }

  /**
   * Regenerate video (delegate to shared business logic)
   */
  static async regenerateVideo(storyId: number, userId: string): Promise<VideoGenerationResult> {
    const klingProvider = {
      name: 'kling',
      generateVideo: async (data: any) => {
        return await this.callKlingAPI(data.promptData, data.prompt);
      },
      checkStatus: async (taskId: string) => {
        return await this.checkVideoStatus(taskId);
      }
    };

    return VideoBusinessLogic.regenerateVideo(storyId, userId, klingProvider);
  }

  /**
   * Check video access permissions (delegate to shared business logic)
   */
  static async checkVideoAccess(storyId: number, userId: string): Promise<{
    canView: boolean;
    canShare: boolean;
    reason?: string;
  }> {
    const result = await VideoBusinessLogic.checkVideoAccess(storyId, userId);
    return {
      canView: result.canView,
      canShare: result.canShare,
      reason: result.reason
    };
  }

  /**
   * Generate unique video ID
   */
  private static generateVideoId(): string {
    return `video_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}