import { 
  IVideoProvider, 
  VideoProviderCapabilities, 
  VideoProviderConfig, 
  StandardVideoRequest, 
  StandardVideoResponse,
  VideoStatusResponse,
  VideoProviderError,
  VideoProviderException
} from './video-provider-interface';
import { detectFormatWithFallback, getPreferredWebFormat, VIDEO_FORMAT_VALIDATION } from '@shared/config/video-format-config';
import { ExternalIntegrationStateReset } from '../external-integration-state-reset';

/**
 * RunwayML video provider implementation
 * Follows the standard interface for plug-and-play compatibility
 */
export class RunwayMLVideoProvider implements IVideoProvider {
  readonly name = 'runwayml';
  readonly version = '1.0.0';
  readonly capabilities: VideoProviderCapabilities = {
    maxDuration: 20,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedQualities: ['standard', 'high'],
    supportsImageToVideo: true,
    supportsTextToVideo: true,
    supportsVoiceIntegration: false,
    supportsCharacterConsistency: true,
    supportsCancellation: true,
    supportsCostEstimation: true
  };

  private config: VideoProviderConfig | null = null;
  private initialized = false;

  async initialize(config: VideoProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new VideoProviderException(
        VideoProviderError.AUTHENTICATION_FAILED,
        'RunwayML requires API key',
        this.name
      );
    }

    this.config = {
      baseUrl: 'https://api.runway.team/v1',
      timeout: 60000,
      retryCount: 2,
      maxDuration: 20,
      defaultQuality: 'standard',
      ...config
    };

    this.initialized = true;
    console.log('RunwayML provider initialized successfully');
  }

  async isHealthy(): Promise<boolean> {
    if (!this.initialized || !this.config) {
      return false;
    }

    try {
      // Simple health check
      return true;
    } catch (error) {
      console.error('RunwayML health check failed:', error);
      return false;
    }
  }

  async generateVideo(request: StandardVideoRequest): Promise<StandardVideoResponse> {
    this.validateRequest(request);

    try {
      // Prepare RunwayML-specific request
      const runwayRequest = this.prepareRunwayRequest(request);
      
      // Create video task
      const taskResponse = await this.createVideoTask(runwayRequest);
      
      return {
        taskId: taskResponse.id,
        status: 'processing',
        estimatedCompletion: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes
        metadata: {
          provider: this.name,
          model: 'gen3',
          quality: request.quality
        }
      };
    } catch (error: any) {
      // Reset state using centralized service
      try {
        const { externalIntegrationStateReset } = await import('../external-integration-state-reset');
        await externalIntegrationStateReset.resetIntegrationState({
          userId: request.metadata?.userId || 'unknown',
          provider: 'runwayml',
          operationType: 'video_generation',
          operationId: request.metadata?.storyId,
          error: error.message || 'RunwayML video generation failed'
        });
      } catch (resetError) {
        console.error('Failed to reset RunwayML state:', resetError);
      }
      
      throw this.handleRunwayError(error);
    }
  }

  async checkStatus(taskId: string): Promise<VideoStatusResponse> {
    if (!this.config) {
      throw new VideoProviderException(
        VideoProviderError.PROVIDER_UNAVAILABLE,
        'Provider not initialized',
        this.name
      );
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Runway-Version': '2024-11-06'
        }
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        taskId,
        status: this.mapRunwayStatus(result.status),
        progress: this.calculateProgress(result.status, result.progress),
        videoUrl: result.output?.[0],
        errorMessage: result.failure_reason
      };
    } catch (error: any) {
      throw this.handleRunwayError(error);
    }
  }

  async cancelGeneration(taskId: string): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/tasks/${taskId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Runway-Version': '2024-11-06'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to cancel RunwayML task:', error);
      return false;
    }
  }

  private validateRequest(request: StandardVideoRequest): void {
    if (!this.initialized || !this.config) {
      throw new VideoProviderException(
        VideoProviderError.PROVIDER_UNAVAILABLE,
        'Provider not initialized',
        this.name
      );
    }

    if (request.duration > this.capabilities.maxDuration) {
      throw new VideoProviderException(
        VideoProviderError.INVALID_REQUEST,
        `Duration ${request.duration}s exceeds maximum ${this.capabilities.maxDuration}s`,
        this.name
      );
    }
  }

  private detectVideoFormat(buffer: Buffer): string {
    const detectedFormat = detectFormatWithFallback(buffer);
    if (detectedFormat) {
      console.log(`Detected video format: ${detectedFormat.name} (.${detectedFormat.extension})`);
      return detectedFormat.extension;
    }
    
    // Fallback to preferred web format
    const preferredFormat = getPreferredWebFormat();
    console.log(`Unknown format detected, using preferred: ${preferredFormat.extension}`);
    return preferredFormat.extension;
  }

  private validateVideoFormat(buffer: Buffer, fileName?: string): { isValid: boolean; format: string; error?: string } {
    const detectedFormat = detectFormatWithFallback(buffer, fileName);
    
    if (!detectedFormat) {
      return { isValid: false, format: 'unknown', error: 'Unknown video format' };
    }
    
    if (!detectedFormat.isSupported) {
      return { 
        isValid: false, 
        format: detectedFormat.extension, 
        error: `Format ${detectedFormat.extension} is not supported for web playback` 
      };
    }
    
    if (buffer.length > VIDEO_FORMAT_VALIDATION.MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        format: detectedFormat.extension, 
        error: `File size exceeds maximum limit of ${VIDEO_FORMAT_VALIDATION.MAX_FILE_SIZE / 1024 / 1024}MB` 
      };
    }
    
    return { isValid: true, format: detectedFormat.extension };
  }

  private prepareRunwayRequest(request: StandardVideoRequest): any {
    return {
      taskType: 'generation',
      internal: false,
      options: {
        name: `Story Video Generation`,
        seconds: Math.min(request.duration, this.capabilities.maxDuration),
        gen3a_standalone: {
          mode: 'text_to_video',
          prompt: this.sanitizePrompt(request.prompt),
          aspect_ratio: request.aspectRatio,
          resolution: request.quality === 'high' ? '1280x768' : '768x1280'
        }
      }
    };
  }

  private async createVideoTask(request: any): Promise<any> {
    const response = await fetch(`${this.config!.baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config!.apiKey}`,
        'X-Runway-Version': '2024-11-06',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RunwayML API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  private sanitizePrompt(prompt: string): string {
    // RunwayML-specific content filtering
    return prompt
      .replace(/\b(violence|violent|kill|murder|death|blood)\b/gi, 'conflict')
      .replace(/\b(explicit|inappropriate|adult)\b/gi, 'dramatic')
      .replace(/\b(weapon|gun|knife|sword)\b/gi, 'tool')
      .substring(0, 512); // RunwayML prompt length limit
  }

  private mapRunwayStatus(runwayStatus: string): 'pending' | 'processing' | 'completed' | 'failed' {
    switch (runwayStatus) {
      case 'PENDING':
        return 'pending';
      case 'RUNNING':
        return 'processing';
      case 'SUCCEEDED':
        return 'completed';
      case 'FAILED':
      case 'CANCELLED':
        return 'failed';
      default:
        return 'processing';
    }
  }

  private calculateProgress(status: string, progress?: number): number {
    if (progress !== undefined) {
      return Math.round(progress * 100);
    }

    switch (status) {
      case 'PENDING': return 10;
      case 'RUNNING': return 50;
      case 'SUCCEEDED': return 100;
      case 'FAILED': 
      case 'CANCELLED': return 0;
      default: return 30;
    }
  }

  private handleRunwayError(error: any, userId?: string): VideoProviderException {
    const errorMessage = error.message || 'Unknown RunwayML error';
    
    // STANDARD PATTERN: Log failure without storing completion records
    ExternalIntegrationStateReset.logFailureWithoutStorage(
      'RunwayML', 
      'video_generation', 
      userId || 'unknown', 
      errorMessage
    );
    
    console.error('RunwayML provider error:', error);
    
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('authentication')) {
      return new VideoProviderException(
        VideoProviderError.AUTHENTICATION_FAILED,
        'RunwayML authentication failed. Please verify API key.',
        this.name,
        error
      );
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return new VideoProviderException(
        VideoProviderError.QUOTA_EXCEEDED,
        'RunwayML quota exceeded. Please check account limits.',
        this.name,
        error
      );
    }
    
    return new VideoProviderException(
      VideoProviderError.UNKNOWN_ERROR,
      `RunwayML error: ${errorMessage}`,
      this.name,
      error
    );
  }
}