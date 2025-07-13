/**
 * Standard interface that all video providers must implement
 * This ensures plug-and-play compatibility
 */
export interface IVideoProvider {
  readonly name: string;
  readonly version: string;
  readonly capabilities: VideoProviderCapabilities;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: VideoProviderConfig): Promise<void>;

  /**
   * Check if provider is healthy and ready
   */
  isHealthy(): Promise<boolean>;

  /**
   * Generate video from request
   */
  generateVideo(request: StandardVideoRequest): Promise<StandardVideoResponse>;

  /**
   * Check status of video generation task
   */
  checkStatus(taskId: string): Promise<VideoStatusResponse>;

  /**
   * Cancel video generation if supported
   */
  cancelGeneration?(taskId: string): Promise<boolean>;

  /**
   * Estimate cost for video generation
   */
  estimateCost?(request: StandardVideoRequest): Promise<CostEstimate>;
}

export interface VideoProviderCapabilities {
  maxDuration: number;
  supportedAspectRatios: string[];
  supportedQualities: string[];
  supportsImageToVideo: boolean;
  supportsTextToVideo: boolean;
  supportsVoiceIntegration: boolean;
  supportsCharacterConsistency: boolean;
  supportsCancellation: boolean;
  supportsCostEstimation: boolean;
}

export interface VideoProviderConfig {
  apiKey: string;
  secretKey?: string;
  baseUrl?: string;
  modelName?: string;
  timeout?: number;
  retryCount?: number;
  maxDuration?: number;
  defaultQuality?: string;
  [key: string]: any; // Allow provider-specific config
}

export interface StandardVideoRequest {
  prompt: string;
  duration: number;
  aspectRatio: string;
  quality: string;
  characters?: Array<{
    name: string;
    description: string;
    personality: string;
    role: string;
    imageUrl?: string;
    voiceProfile?: string;
  }>;
  scenes?: Array<{
    title: string;
    backgroundDescription: string;
    background?: {
      location: string;
      timeOfDay: string;
      atmosphere: string;
      lighting: string;
      visualDescription: string;
    };
  }>;
  metadata?: {
    storyId: number;
    userId: string;
    regenerate?: boolean;
    [key: string]: any;
  };
}

export interface StandardVideoResponse {
  taskId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  status: 'processing' | 'completed' | 'failed';
  estimatedCompletion?: Date;
  metadata?: {
    provider: string;
    model?: string;
    processingTime?: number;
    [key: string]: any;
  };
}

export interface VideoStatusResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  estimatedCompletion?: Date;
}

export interface CostEstimate {
  currency: string;
  amount: number;
  breakdown?: {
    duration: number;
    quality: string;
    additionalFeatures: string[];
  };
}

export enum VideoProviderError {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CONTENT_POLICY_VIOLATION = 'CONTENT_POLICY_VIOLATION',
  INVALID_REQUEST = 'INVALID_REQUEST',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  GENERATION_TIMEOUT = 'GENERATION_TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class VideoProviderException extends Error {
  constructor(
    public readonly errorType: VideoProviderError,
    message: string,
    public readonly providerName: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'VideoProviderException';
  }
}