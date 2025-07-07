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
import { detectFormatWithFallback, getPreferredWebFormat, VIDEO_FORMAT_VALIDATION } from '@shared/video-format-config';
import { ExternalIntegrationStateReset } from '../external-integration-state-reset';

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
  private cachedJwtToken?: string;
  private tokenExpiryTime?: number;

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

    console.log('=== KLING VIDEO GENERATION START (POLLING MODE) ===');
    console.log('Request details:', {
      prompt: request.prompt.substring(0, 100) + '...',
      quality: request.quality,
      duration: `${request.duration}s (using Kling default 5s)`
    });

    try {
      const token = await this.getJWTToken();
      
      const response = await fetch(`${this.config!.baseUrl}/v1/videos/text2video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: request.prompt,
          model: this.config!.modelName
          // Note: No callback_url - using polling-based approach
          // Note: Kling generates 5-second videos by default
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('=== KLING API RESPONSE ===');
      console.log('Response data:', JSON.stringify(data, null, 2));

      if (data.code !== 0) {
        throw new Error(`API Error: ${data.message}`);
      }

      const taskId = data.data?.task_id;
      if (!taskId) {
        throw new Error('No task ID returned from Kling API');
      }

      console.log(`✅ Video generation started with task ID: ${taskId}`);
      console.log(`📅 Task will be ready in approximately 10 minutes`);
      console.log(`🔄 Use polling to check status with this task ID`);

      // Return immediately with task ID - no waiting
      return {
        taskId,
        status: 'processing',
        estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        metadata: {
          provider: this.name,
          model: this.config!.modelName || 'kling-v1-5',
          completionMethod: 'polling',
          message: 'Video generation started. Please check back in 10 minutes.'
        }
      };
      
    } catch (error: any) {
      console.error('=== KLING VIDEO GENERATION ERROR ===', error);
      
      // Reset state using centralized service
      try {
        const { externalIntegrationStateReset } = await import('../external-integration-state-reset');
        const { externalIdService } = await import('../external-id-service');
        const externalId = request.metadata?.userId ? 
          await externalIdService.getOrCreateExternalId(request.metadata.userId) : 
          'unknown';
        
        await externalIntegrationStateReset.resetIntegrationState({
          userId: externalId,
          provider: 'kling',
          operationType: 'video_generation',
          operationId: request.metadata?.storyId,
          error: error.message || 'Kling video generation failed'
        });
      } catch (resetError) {
        console.error('Failed to reset Kling state:', resetError);
      }
      
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
      // Use cached JWT Token for status check
      const jwtToken = await this.getJWTToken();

      const response = await fetch(`${this.config.baseUrl}/v1/videos/text2video?pageNum=1&pageSize=30`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      console.log(`Status check response for task ${taskId}:`, response.status);

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Log complete response structure for debugging
      console.log('=== COMPLETE KLING RESPONSE ===');
      console.log('Task ID:', taskId);
      console.log('Full Response:', JSON.stringify(result, null, 2));
      
      // Find our specific task in the list response
      const taskData = result.data?.list?.find((task: any) => task.task_id === taskId);
      
      if (!taskData) {
        console.log(`⚠️ Task ${taskId} not found in list of ${result.data?.list?.length || 0} tasks`);
        console.log('Available task IDs:', result.data?.list?.map((t: any) => t.task_id).slice(0, 3) || []);
        
        // Return processing status when task not found in list (still processing)
        return {
          taskId,
          status: 'processing',
          progress: 25,
          videoUrl: undefined,
          thumbnailUrl: undefined
        };
      }
      
      const taskStatus = taskData.task_status;
      console.log(`✓ Found task ${taskId} with status: ${taskStatus}`);
      
      // Check if task has been processing for too long (over 3 minutes)
      const createdAt = taskData?.created_at;
      const updatedAt = taskData?.updated_at;
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (createdAt && currentTime - createdAt > 180) { // 3 minutes
        console.log(`⚠️ Task ${taskId} has been processing for ${currentTime - createdAt}s (over 3 minutes)`);
        console.log(`Last update: ${updatedAt ? new Date(updatedAt * 1000).toISOString() : 'N/A'}`);
      }
      
      // Try multiple possible video URL locations
      let videoUrl = undefined;
      if (taskData) {
        // Check various possible locations in the response
        const possiblePaths = [
          taskData.task_result?.videos?.[0]?.url,
          taskData.task_result?.url,
          taskData.result?.videos?.[0]?.url,
          taskData.result?.url,
          taskData.videos?.[0]?.url,
          taskData.video_url,
          taskData.url
        ];
        
        for (const path of possiblePaths) {
          if (path) {
            videoUrl = path;
            console.log('✓ Found video URL at path:', path);
            break;
          }
        }
        
        if (!videoUrl && taskStatus === 'succeed') {
          console.log('⚠️ Video marked as succeed but no URL found in any of these paths:');
          console.log('- taskData.task_result?.videos?.[0]?.url');
          console.log('- taskData.task_result?.url');
          console.log('- taskData.result?.videos?.[0]?.url');
          console.log('- taskData.result?.url');
          console.log('- taskData.videos?.[0]?.url');
          console.log('- taskData.video_url');
          console.log('- taskData.url');
        }
      }
      
      const statusResponse = {
        taskId,
        status: this.mapKlingStatus(taskStatus),
        progress: this.calculateProgress(taskStatus),
        videoUrl: videoUrl,
        thumbnailUrl: taskData?.task_result?.videos?.[0]?.cover_image_url
      };
      
      console.log('Returning status response:', statusResponse);
      return statusResponse;
    } catch (error: any) {
      throw this.handleKlingError(error);
    }
  }

  /**
   * Poll for video completion when we have a specific task ID
   * This is the primary method for checking video status
   */
  async pollForCompletion(taskId: string): Promise<StandardVideoResponse | null> {
    console.log(`🔄 Polling for task completion: ${taskId}`);
    
    try {
      const status = await this.checkStatus(taskId);
      
      if (status.status === 'completed' && status.videoUrl) {
        console.log(`✅ Video completed: ${taskId}`);
        return {
          taskId,
          status: 'completed',
          videoUrl: status.videoUrl,
          thumbnailUrl: status.thumbnailUrl,
          estimatedCompletion: new Date(),
          metadata: {
            provider: this.name,
            model: this.config!.modelName || 'kling-v1-5',
            completionMethod: 'polling'
          }
        };
      } else if (status.status === 'failed') {
        console.log(`❌ Video failed: ${taskId}`);
        return {
          taskId,
          status: 'failed',
          estimatedCompletion: new Date(),
          metadata: {
            provider: this.name,
            error: 'Video generation failed on Kling servers'
          }
        };
      } else {
        console.log(`⏳ Video still processing: ${taskId}`);
        return null; // Still processing
      }
        
    } catch (error: any) {
      console.error(`❌ Polling error for task ${taskId}:`, error);
      return {
        taskId,
        status: 'failed',
        estimatedCompletion: new Date(),
        metadata: {
          provider: this.name,
          error: error.message
        }
      };
    }
  }

  private detectVideoFormat(buffer: Buffer): string {
    const detectedFormat = detectFormatWithFallback(buffer);
    if (detectedFormat) {
      console.log(`Kling: Detected video format: ${detectedFormat.name} (.${detectedFormat.extension})`);
      return detectedFormat.extension;
    }
    
    // Fallback to preferred web format
    const preferredFormat = getPreferredWebFormat();
    console.log(`Kling: Unknown format detected, using preferred: ${preferredFormat.extension}`);
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
    
    // Generate callback URL for webhook notifications
    // Use REPLIT_DEV_DOMAIN or fallback to a placeholder (won't work locally but needed for production)
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAIN;
    const baseUrl = domain ? `https://${domain}` : 'https://placeholder-domain.replit.app';
    const callbackUrl = `${baseUrl}/api/webhooks/kling/video-complete`;
    
    // Kling API doesn't support duration parameter - use their default length
    const klingRequest = {
      model: this.config!.modelName || 'kling-v1',
      prompt: this.sanitizePrompt(request.prompt),
      aspect_ratio: request.aspectRatio || '16:9',
      mode: klingMode,
      callback_url: callbackUrl // Tell Kling where to send completion notification
      // No duration parameter - Kling uses their default (~5 seconds)
    };
    
    console.log(`Prepared Kling request with callback URL: ${callbackUrl}`);
    return klingRequest;
  }

  private async getJWTToken(): Promise<string> {
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if we have a valid cached token (expires 5 minutes before actual expiry)
    if (this.cachedJwtToken && this.tokenExpiryTime && currentTime < (this.tokenExpiryTime - 300)) {
      console.log('Using cached JWT token');
      return this.cachedJwtToken;
    }
    
    // Generate new token
    console.log('Generating new JWT token...');
    this.cachedJwtToken = await JWTAuthUtil.generateJWTToken('kling', {
      apiKey: this.config!.apiKey!,
      secretKey: this.config!.secretKey!,
      expirationMinutes: 30,
      notBeforeSeconds: 5
    });
    
    // Cache expiry time (30 minutes from now)
    this.tokenExpiryTime = currentTime + (30 * 60);
    console.log('JWT token cached until:', new Date(this.tokenExpiryTime * 1000).toISOString());
    
    return this.cachedJwtToken;
  }

  private async createVideoTask(request: any): Promise<any> {
    console.log('=== CREATING VIDEO TASK ===');
    const currentTime = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    console.log('Current timestamp:', currentTime);
    
    // Get JWT Token (cached or generate new)
    const jwtToken = await this.getJWTToken();
    console.log('Using JWT token, length:', jwtToken.length);
    
    const uri = '/v1/videos/text2video';
    const requestBody = JSON.stringify(request);
    
    console.log('=== API REQUEST DETAILS ===');
    console.log('Making request to:', `${this.config!.baseUrl}${uri}`);
    console.log('Base URL configured as:', this.config!.baseUrl);
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

  private handleKlingError(error: any, userId?: string): VideoProviderException {
    const errorMessage = error.message || 'Unknown Kling error';
    
    // STANDARD PATTERN: Log failure without storing completion records
    ExternalIntegrationStateReset.logFailureWithoutStorage(
      'Kling', 
      'video_generation', 
      userId || 'unknown', 
      errorMessage
    );
    
    console.error('Kling provider error:', error);
    
    if (errorMessage.includes('Auth failed') || errorMessage.includes('authentication')) {
      return new VideoProviderException(
        VideoProviderError.AUTHENTICATION_FAILED,
        'Kling authentication failed. Please verify API credentials.',
        this.name,
        error
      );
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      return new VideoProviderException(
        VideoProviderError.QUOTA_EXCEEDED,
        'Kling quota exceeded. Please check account limits.',
        this.name,
        error
      );
    }
    
    if (errorMessage.includes('content') || errorMessage.includes('policy')) {
      return new VideoProviderException(
        VideoProviderError.CONTENT_POLICY_VIOLATION,
        'Content violates Kling policies. Please review story content.',
        this.name,
        error
      );
    }
    
    return new VideoProviderException(
      VideoProviderError.UNKNOWN_ERROR,
      `Kling error: ${errorMessage}`,
      this.name,
      error
    );
  }
}