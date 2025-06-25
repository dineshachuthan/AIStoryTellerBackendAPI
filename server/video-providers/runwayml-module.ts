import { VideoBusinessLogic, VideoGenerationRequest, VideoGenerationResult } from '../video-business-logic';
import { videoProviderManager } from '../video-generation-service';

/**
 * RunwayML-specific video generation module
 * Uses shared business logic with RunwayML-specific features
 */
export class RunwayMLVideoModule {
  /**
   * Generate video using RunwayML provider
   */
  static async generateVideoFromRoleplay(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    // Create RunwayML-specific provider wrapper
    const runwayProvider = {
      name: 'runwayml',
      generateVideo: async (data: any) => {
        return await this.callRunwayMLAPI(data);
      },
      checkStatus: async (taskId: string) => {
        return await this.checkVideoStatus(taskId);
      }
    };

    return VideoBusinessLogic.generateVideo(request, runwayProvider);
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
    const runwayProvider = {
      name: 'runwayml',
      generateVideo: async (data: any) => {
        return await this.callRunwayMLAPI(data);
      },
      checkStatus: async (taskId: string) => {
        return await this.checkVideoStatus(taskId);
      }
    };

    return VideoBusinessLogic.regenerateVideo(storyId, userId, runwayProvider);
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

  // RunwayML-specific implementation methods
  private static async callRunwayMLAPI(data: any): Promise<any> {
    const provider = videoProviderManager.getProvider('runwayml');
    if (!provider) {
      throw new Error('RunwayML provider not available');
    }

    // Prepare RunwayML-specific request format
    const runwayRequest = {
      content: this.buildRunwayMLPrompt(data),
      duration: data.duration || 20,
      aspectRatio: data.aspectRatio || '16:9',
      quality: data.quality || 'standard',
      characters: data.characters,
      scenes: data.scenes
    };

    const response = await provider.generateVideo(runwayRequest);
    
    return {
      taskId: response.taskId,
      videoUrl: response.videoUrl,
      thumbnailUrl: response.thumbnailUrl
    };
  }

  private static buildRunwayMLPrompt(data: any): string {
    // RunwayML-specific prompt building logic
    let prompt = '';
    
    if (data.characters?.length > 0) {
      const charDesc = data.characters.map((char: any) => 
        `${char.name}: ${char.description}`
      ).join(', ');
      prompt += `Characters: ${charDesc}. `;
    }
    
    if (data.scenes?.length > 0) {
      const sceneDesc = data.scenes.map((scene: any) => 
        scene.backgroundDescription || scene.title
      ).join(', ');
      prompt += `Scenes: ${sceneDesc}. `;
    }
    
    prompt += 'Professional cinematic video with high quality visuals and engaging storytelling.';
    
    return prompt;
  }

  private static async checkVideoStatus(taskId: string): Promise<{
    completed: boolean;
    videoUrl?: string;
    thumbnailUrl?: string;
  }> {
    // RunwayML status checking logic
    return { completed: false };
  }
}