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
    if (!config.apiKey || !config.secretKey) {
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
    if (this.config.maxDuration > 20) {
      this.config.maxDuration = 20;
    }

    console.log('Kling config initialized:', {
      baseUrl: this.config.baseUrl,
      hasApiKey: !!this.config.apiKey,
      hasSecretKey: !!this.config.secretKey,
      apiKeyLength: this.config.apiKey?.length || 0,
      secretKeyLength: this.config.secretKey?.length || 0
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
    // Ensure duration is exactly 20 seconds or less
    const duration = Math.min(request.duration || 20, 20);
    
    return {
      model: 'kling-v1',
      prompt: this.sanitizePrompt(request.prompt),
      aspect_ratio: request.aspectRatio || '16:9',
      duration: duration,
      mode: klingMode
    };
  }

  private async createVideoTask(request: any): Promise<any> {
    const currentTime = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    
    // Create JWT Token for authentication
    const jwtToken = await this.generateJWTToken(currentTime);
    
    const uri = '/v1/videos/text2video';
    const requestBody = JSON.stringify(request);
    
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
    console.log('Kling API response:', response.status, responseText);
    
    if (!response.ok) {
      throw new Error(`Kling API error: ${response.status} - ${responseText}`);
    }

    return JSON.parse(responseText);
  }

  private async generateJWTToken(currentTime: number): Promise<string> {
    // JWT Header - matches Java example exactly
    const header = {
      alg: 'HS256'
    };

    // JWT Payload - matches Java withIssuer, withNotBefore, withExpiresAt
    const payload = {
      iss: this.config!.apiKey, // AccessKey as issuer (withIssuer)
      exp: currentTime + 1800, // Token expires in 30 minutes (withExpiresAt)
      nbf: currentTime - 5 // Not before current time - 5 seconds (withNotBefore)
    };

    // Base64 encode header and payload
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    // Create signature using SecretKey
    const crypto = await import('crypto');
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
      .createHmac('sha256', this.config!.secretKey!)
      .update(signatureInput)
      .digest('base64url');

    // Combine to create JWT
    const jwtToken = `${encodedHeader}.${encodedPayload}.${signature}`;
    
    console.log('Generated JWT token matching Java pattern for Kling API:', {
      headerAlg: header.alg,
      issuer: this.config!.apiKey!.substring(0, 8) + '...',
      expiry: new Date((currentTime + 1800) * 1000).toISOString(),
      notBefore: new Date((currentTime - 5) * 1000).toISOString(),
      tokenLength: jwtToken.length
    });
    return jwtToken;
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