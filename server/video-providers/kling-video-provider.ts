import { 
  IVideoProvider, 
  VideoProviderCapabilities, 
  VideoProviderConfig, 
  StandardVideoRequest, 
  StandardVideoResponse,
  VideoStatusResponse,
  CostEstimate,
  VideoProviderError,
  VideoProviderException
} from './video-provider-interface';
import { JWTAuthUtil } from './jwt-auth-util';

/**
 * Kling AI video provider implementation
 * Follows the standard interface for plug-and-play compatibility
 */
export class KlingVideoProvider implements IVideoProvider {
  readonly name = 'kling';
  readonly version = '1.0.0';
  readonly capabilities: VideoProviderCapabilities = {
    maxDuration: 20,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedQualities: ['std', 'pro', 'standard'], // Add standard support
    supportsImageToVideo: true,
    supportsTextToVideo: true,
    supportsVoiceIntegration: false, // Voice handled separately
    supportsCharacterConsistency: true,
    supportsCancellation: false,
    supportsCostEstimation: false
  };

  private config: VideoProviderConfig | null = null;
  private initialized = false;

  async initialize(config: VideoProviderConfig): Promise<void> {
    console.log('=== KLING PROVIDER INITIALIZE ===');
    console.log('Received config in initialize:', {
      hasApiKey: !!config.apiKey,
      hasSecretKey: !!config.secretKey,
      apiKeyPreview: config.apiKey ? config.apiKey.substring(0, 8) + '...' : 'MISSING',
      secretKeyLength: config.secretKey?.length || 0,
      baseUrl: config.baseUrl
    });
    
    console.log('Environment check:', {
      KLING_ACCESS_KEY: process.env.KLING_ACCESS_KEY ? process.env.KLING_ACCESS_KEY.substring(0, 8) + '...' : 'MISSING',
      KLING_SECRET_KEY: process.env.KLING_SECRET_KEY ? 'Present' : 'MISSING'
    });
    
    if (!config.apiKey || !config.secretKey) {
      console.error('Missing credentials in initialize method');
      throw new VideoProviderException(
        VideoProviderError.AUTHENTICATION_FAILED,
        'Kling requires both access key and secret key',
        this.name
      );
    }

    this.config = {
      baseUrl: 'https://api-singapore.klingai.com',
      timeout: 120000,
      retryCount: 2,
      maxDuration: 20,
      defaultQuality: 'std',
      ...config
    };
    
    // Ensure duration is capped at 20 seconds
    if (this.config.maxDuration! > 20) {
      this.config.maxDuration = 20;
    }

    console.log('Kling config finalized:', {
      baseUrl: this.config.baseUrl,
      hasApiKey: !!this.config.apiKey,
      hasSecretKey: !!this.config.secretKey,
      apiKeyLength: this.config.apiKey?.length || 0,
      secretKeyLength: this.config.secretKey?.length || 0,
      credentialsMatch: {
        apiKey: this.config.apiKey === process.env.KLING_ACCESS_KEY,
        secretKey: this.config.secretKey === process.env.KLING_SECRET_KEY
      }
    });

    this.initialized = true;
    console.log('Kling provider initialized successfully');
  }

  async isHealthy(): Promise<boolean> {
    if (!this.initialized || !this.config) {
      return false;
    }

    try {
      // Simple health check - could ping a status endpoint
      return true;
    } catch (error) {
      console.error('Kling health check failed:', error);
      return false;
    }
  }

  async generateVideo(request: StandardVideoRequest): Promise<StandardVideoResponse> {
    this.validateRequest(request);

    console.log('=== KLING VIDEO GENERATION START ===');
    console.log('Request details:', {
      prompt: request.prompt.substring(0, 100) + '...',
      quality: request.quality,
      aspectRatio: request.aspectRatio
    });
    console.log('Config check:', {
      hasApiKey: !!this.config?.apiKey,
      hasSecretKey: !!this.config?.secretKey,
      apiKeyPreview: this.config?.apiKey?.substring(0, 8) + '...',
      secretKeyLength: this.config?.secretKey?.length
    });

    try {
      // Prepare Kling-specific request
      const klingRequest = this.prepareKlingRequest(request);
      
      // Create video task
      const taskResponse = await this.createVideoTask(klingRequest);
      
      // Return standardized response
      return {
        taskId: taskResponse.data?.task_id,
        status: 'processing',
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        metadata: {
          provider: this.name,
          model: 'kling-v1',
          mode: request.quality
        }
      };
    } catch (error: any) {
      console.error('=== KLING VIDEO GENERATION ERROR ===', error);
      throw this.handleKlingError(error);
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
      const response = await fetch(`${this.config.baseUrl}/v1/videos/${taskId}`, {
        headers: {
          'Authorization': this.config.apiKey!
        }
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        taskId,
        status: this.mapKlingStatus(result.data?.task_status),
        progress: this.calculateProgress(result.data?.task_status),
        videoUrl: result.data?.task_result?.videos?.[0]?.url,
        thumbnailUrl: result.data?.task_result?.videos?.[0]?.cover_image_url
      };
    } catch (error: any) {
      throw this.handleKlingError(error);
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

    if (!this.capabilities.supportedQualities.includes(request.quality)) {
      throw new VideoProviderException(
        VideoProviderError.INVALID_REQUEST,
        `Quality ${request.quality} not supported. Supported: ${this.capabilities.supportedQualities.join(', ')}`,
        this.name
      );
    }
  }

  private prepareKlingRequest(request: StandardVideoRequest): any {
    // Map standard quality to std for Kling API
    const klingMode = (request.quality === 'pro') ? 'pro' : 'std';
    
    // Remove duration parameter - Kling uses default duration (~5-10 seconds)
    const klingRequest = {
      model: 'kling-v1',
      prompt: this.sanitizePrompt(request.prompt),
      aspect_ratio: request.aspectRatio || '16:9',
      mode: klingMode
    };
    
    console.log('Prepared Kling request:', klingRequest);
    return klingRequest;
  }

  private async createVideoTask(request: any): Promise<any> {
    console.log('=== CREATING VIDEO TASK ===');
    const currentTime = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    console.log('Current timestamp:', currentTime);
    
    // Create JWT Token for authentication using shared utility
    const jwtToken = await JWTAuthUtil.generateJWTToken('kling', {
      apiKey: this.config!.apiKey!,
      secretKey: this.config!.secretKey!,
      expirationMinutes: 30,
      notBeforeSeconds: 5
    });
    console.log('JWT token generated, length:', jwtToken.length);
    
    const uri = '/v1/videos/text2video';
    const requestBody = JSON.stringify(request);
    
    console.log('=== API REQUEST DETAILS ===');
    console.log('Making request to:', `${this.config!.baseUrl}${uri}`);
    console.log('Request body:', requestBody);
    console.log('Authorization header format:', `Bearer ${jwtToken.substring(0, 20)}...`);
    
    const response = await fetch(`${this.config!.baseUrl}${uri}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: requestBody
    });

    const responseText = await response.text();
    console.log('=== API RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Response:', responseText);
    
    if (!response.ok) {
      console.error('=== API ERROR ===');
      try {
        const errorData = JSON.parse(responseText);
        console.error('Error code:', errorData.code);
        console.error('Error message:', errorData.message);
      } catch (e) {
        console.error('Raw error:', responseText);
      }
      throw new Error(`Kling API error: ${response.status} - ${responseText}`);
    }

    return JSON.parse(responseText);
  }



  private sanitizePrompt(prompt: string): string {
    return prompt
      .replace(/\b(violence|violent|kill|murder|death|blood|weapon|fight|attack)\b/gi, 'conflict')
      .replace(/\b(steal|stolen|theft|crime|criminal|rob)\b/gi, 'adventure')
      .replace(/\b(explicit|inappropriate|adult|mature)\b/gi, 'dramatic')
      .replace(/\b(terrified|terror|fear|scary|frightening)\b/gi, 'surprised')
      .replace(/\b(AI|artificial intelligence|robot|android|cyborg)\b/gi, 'technology');
  }

  private mapKlingStatus(klingStatus: string): 'pending' | 'processing' | 'completed' | 'failed' {
    switch (klingStatus) {
      case 'submitted':
      case 'queued':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'succeed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'processing';
    }
  }

  private calculateProgress(status: string): number {
    switch (status) {
      case 'submitted': return 10;
      case 'queued': return 20;
      case 'processing': return 50;
      case 'succeed': return 100;
      case 'failed': return 0;
      default: return 30;
    }
  }

  private handleKlingError(error: any): VideoProviderException {
    console.error('Kling provider error:', error);
    
    if (error.message?.includes('Auth failed') || error.message?.includes('authentication')) {
      return new VideoProviderException(
        VideoProviderError.AUTHENTICATION_FAILED,
        'Kling authentication failed. Please verify API credentials.',
        this.name,
        error
      );
    }
    
    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      return new VideoProviderException(
        VideoProviderError.QUOTA_EXCEEDED,
        'Kling quota exceeded. Please check account limits.',
        this.name,
        error
      );
    }
    
    if (error.message?.includes('content') || error.message?.includes('policy')) {
      return new VideoProviderException(
        VideoProviderError.CONTENT_POLICY_VIOLATION,
        'Content violates Kling policies. Please review story content.',
        this.name,
        error
      );
    }
    
    return new VideoProviderException(
      VideoProviderError.UNKNOWN_ERROR,
      `Kling error: ${error.message}`,
      this.name,
      error
    );
  }
}