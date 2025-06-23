/**
 * Base interface for video generation providers
 */
export interface VideoGenerationRequest {
  storyId: number;
  title: string;
  content: string;
  characters: Array<{
    name: string;
    description: string;
    imageUrl?: string;
    voiceUrl?: string;
  }>;
  scenes: Array<{
    title: string;
    description: string;
    dialogues: Array<{
      character: string;
      text: string;
      emotion?: string;
    }>;
    backgroundDescription?: string;
    duration?: number;
  }>;
  style?: 'cinematic' | 'documentary' | 'dramatic' | 'realistic';
  quality?: 'standard' | 'high' | 'ultra';
  duration?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
}

export interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  status: 'completed' | 'processing' | 'failed';
  metadata: {
    provider: string;
    providerJobId?: string;
    format: string;
    resolution: string;
    codec: string;
    fileSize?: number;
    generatedAt: Date;
  };
  error?: string;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryCount?: number;
  customSettings?: Record<string, any>;
}

export abstract class BaseVideoProvider {
  protected config: ProviderConfig;
  protected name: string;

  constructor(name: string, config: ProviderConfig) {
    this.name = name;
    this.config = config;
  }

  abstract generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult>;
  
  abstract checkStatus(jobId: string): Promise<VideoGenerationResult>;
  
  abstract cancelGeneration(jobId: string): Promise<boolean>;

  /**
   * Validate provider configuration
   */
  abstract validateConfig(): Promise<boolean>;

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(): {
    maxDuration: number;
    supportedFormats: string[];
    supportedResolutions: string[];
    supportedStyles: string[];
    supportsCharacters: boolean;
    supportsVoice: boolean;
    supportsCustomImages: boolean;
  };

  /**
   * Estimate generation cost
   */
  abstract estimateCost(request: VideoGenerationRequest): Promise<number>;

  /**
   * Convert provider-specific video to standard format
   */
  protected async normalizeVideo(providerResult: any): Promise<VideoGenerationResult> {
    // Default implementation - providers can override
    return {
      videoUrl: providerResult.videoUrl,
      thumbnailUrl: providerResult.thumbnailUrl,
      duration: providerResult.duration || 0,
      status: 'completed',
      metadata: {
        provider: this.name,
        providerJobId: providerResult.id || providerResult.jobId,
        format: 'mp4',
        resolution: '1920x1080',
        codec: 'h264',
        generatedAt: new Date()
      }
    };
  }

  /**
   * Handle provider-specific errors
   */
  protected handleError(error: any): VideoGenerationResult {
    return {
      videoUrl: '',
      duration: 0,
      status: 'failed',
      metadata: {
        provider: this.name,
        format: '',
        resolution: '',
        codec: '',
        generatedAt: new Date()
      },
      error: error.message || 'Unknown provider error'
    };
  }
}