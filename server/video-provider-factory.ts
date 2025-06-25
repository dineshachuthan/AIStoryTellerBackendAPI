import { VideoGenerationModule } from './video-generation-module';
import { RunwayMLVideoModule } from './video-providers/runwayml-module';
import { VideoGenerationRequest, VideoGenerationResult } from './video-business-logic';

/**
 * Factory to get the appropriate video generation module based on provider
 */
export class VideoProviderFactory {
  /**
   * Get video generation module for specified provider
   */
  static getModule(provider: string): VideoModule {
    switch (provider.toLowerCase()) {
      case 'kling':
        return VideoGenerationModule;
      case 'runwayml':
        return RunwayMLVideoModule;
      default:
        throw new Error(`Unsupported video provider: ${provider}`);
    }
  }

  /**
   * Generate video using active or specified provider
   */
  static async generateVideo(
    request: VideoGenerationRequest,
    provider?: string
  ): Promise<VideoGenerationResult> {
    const activeProvider = provider || this.getActiveProvider();
    const module = this.getModule(activeProvider);
    
    return module.generateVideoFromRoleplay(request);
  }

  /**
   * Accept video using active provider
   */
  static async acceptVideo(storyId: number, userId: string, provider?: string): Promise<void> {
    const activeProvider = provider || this.getActiveProvider();
    const module = this.getModule(activeProvider);
    
    return module.acceptVideo(storyId, userId);
  }

  /**
   * Regenerate video using active provider
   */
  static async regenerateVideo(
    storyId: number, 
    userId: string, 
    provider?: string
  ): Promise<VideoGenerationResult> {
    const activeProvider = provider || this.getActiveProvider();
    const module = this.getModule(activeProvider);
    
    return module.regenerateVideo(storyId, userId);
  }

  /**
   * Check video access using provider-agnostic logic
   */
  static async checkVideoAccess(storyId: number, userId: string): Promise<{
    canView: boolean;
    canShare: boolean;
    reason?: string;
  }> {
    // This uses shared business logic, no provider specifics needed
    const module = this.getModule('kling'); // Use any module since logic is shared
    return module.checkVideoAccess(storyId, userId);
  }

  /**
   * Get currently active provider
   */
  private static getActiveProvider(): string {
    // This would read from config or environment
    return process.env.ACTIVE_VIDEO_PROVIDER || 'kling';
  }
}

/**
 * Interface that all video modules must implement
 */
export interface VideoModule {
  generateVideoFromRoleplay(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
  acceptVideo(storyId: number, userId: string): Promise<void>;
  regenerateVideo(storyId: number, userId: string): Promise<VideoGenerationResult>;
  checkVideoAccess(storyId: number, userId: string): Promise<{
    canView: boolean;
    canShare: boolean;
    reason?: string;
  }>;
}