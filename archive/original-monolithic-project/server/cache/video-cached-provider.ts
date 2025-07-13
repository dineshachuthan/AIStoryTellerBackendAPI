/**
 * Video Generation Cached Provider - Content Hash Based Video Generation Cache
 * Extends BaseCachedProvider to enforce cache-first pattern for video generation APIs (Kling/RunwayML)
 */

import { BaseCachedProvider, ExternalApiContext } from './base-cached-provider';
import { createHash } from 'crypto';

export interface VideoGenerationRequest {
  storyId: number;
  userId: string;
  prompt: string;
  characters?: Array<{
    name: string;
    description: string;
    imageUrl?: string;
  }>;
  scenes?: Array<{
    title: string;
    description: string;
    backgroundDescription?: string;
  }>;
  duration?: number;
  quality?: 'standard' | 'high' | 'ultra';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  provider?: 'kling' | 'runwayml';
}

export interface VideoGenerationResult {
  taskId: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  status: 'processing' | 'completed' | 'failed';
  duration: number;
  metadata: {
    provider: string;
    model: string;
    quality: string;
    generatedAt: Date;
  };
}

export interface VideoStatusRequest {
  taskId: string;
  provider: string;
}

export class VideoCachedProvider extends BaseCachedProvider {
  private klingConfig: {
    apiKey: string;
    secretKey: string;
    baseUrl: string;
  };
  
  private runwayConfig: {
    apiKey: string;
    baseUrl: string;
  };

  constructor(config: {
    kling?: {
      apiKey: string;
      secretKey: string;
      baseUrl?: string;
    };
    runwayml?: {
      apiKey: string;
      baseUrl?: string;
    };
    timeout?: number;
    retryCount?: number;
  }) {
    super({
      name: 'video-generation',
      timeout: config.timeout || 180000, // 3 minutes for video generation
      retryCount: config.retryCount || 3
    });
    
    this.klingConfig = {
      apiKey: config.kling?.apiKey || process.env.KLING_ACCESS_KEY || '',
      secretKey: config.kling?.secretKey || process.env.KLING_SECRET_KEY || '',
      baseUrl: config.kling?.baseUrl || 'https://api.klingai.com'
    };
    
    this.runwayConfig = {
      apiKey: config.runwayml?.apiKey || process.env.RUNWAYML_API_KEY || '',
      baseUrl: config.runwayml?.baseUrl || 'https://api.runway.team/v1'
    };
  }

  protected generateCacheKey(...args: any[]): string {
    const [operation, request] = args;
    
    switch (operation) {
      case 'video-generation':
        return this.generateVideoGenerationCacheKey(request);
      case 'video-status':
        return this.generateVideoStatusCacheKey(request);
      default:
        throw new Error(`Unknown video operation: ${operation}`);
    }
  }

  private generateVideoGenerationCacheKey(request: VideoGenerationRequest): string {
    // Create deterministic content hash from all generation parameters
    const contentObject = {
      prompt: request.prompt,
      characters: request.characters?.map(char => ({
        name: char.name,
        description: char.description,
        imageUrl: char.imageUrl || null
      })).sort((a, b) => a.name.localeCompare(b.name)) || [],
      scenes: request.scenes?.map(scene => ({
        title: scene.title,
        description: scene.description,
        backgroundDescription: scene.backgroundDescription || null
      })).sort((a, b) => a.title.localeCompare(b.title)) || [],
      duration: request.duration || 5,
      quality: request.quality || 'standard',
      aspectRatio: request.aspectRatio || '16:9',
      provider: request.provider || 'kling'
    };
    
    const contentString = JSON.stringify(contentObject);
    const contentHash = this.generateContentHash(Buffer.from(contentString, 'utf8'));
    
    return `video:generation:${contentHash}`;
  }

  private generateVideoStatusCacheKey(request: VideoStatusRequest): string {
    // Status checks are not cached with infinite TTL - they need real-time updates
    const contentString = JSON.stringify({
      taskId: request.taskId,
      provider: request.provider,
      timestamp: Math.floor(Date.now() / (5 * 60 * 1000)) // 5-minute buckets
    });
    
    return `video:status:${this.generateContentHash(Buffer.from(contentString, 'utf8'))}`;
  }

  private generateContentHash(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  protected async callExternalApi<T>(context: ExternalApiContext, ...args: any[]): Promise<T> {
    const [operation, request] = args;
    
    switch (operation) {
      case 'video-generation':
        return this.generateVideoWithProvider(request) as T;
      case 'video-status':
        return this.checkVideoStatusWithProvider(request) as T;
      default:
        throw new Error(`Unknown video operation: ${operation}`);
    }
  }

  protected async writeToDatabaseFirst<T>(key: string, data: T, options: CacheOptions): Promise<void> {
    // Write to cache table first, then file cache
    await this.cacheService.set(key, data, options.ttl, options.tags);
  }

  protected async readFromDatabase<T>(key: string): Promise<T | null> {
    return await this.cacheService.get<T>(key);
  }

  protected validateResponse<T>(data: T): boolean {
    if (!data) return false;
    
    // Validate video generation response
    if (typeof data === 'object' && 'taskId' in data) {
      const result = data as VideoGenerationResult;
      return !!(result.taskId && result.status);
    }
    
    return true;
  }

  async generateVideoWithCache(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    return this.executeWithCache(
      'video-generation',
      { 
        ttl: null, // Infinite - same prompt + parameters = same video forever
        tags: ['video-generation', `user:${request.userId}`, `story:${request.storyId}`] 
      },
      'video-generation',
      request
    );
  }

  async checkVideoStatusWithCache(request: VideoStatusRequest): Promise<VideoGenerationResult> {
    return this.executeWithCache(
      'video-status',
      { 
        ttl: 5 * 60 * 1000, // 5 minutes - status checks need regular updates
        tags: ['video-status', `task:${request.taskId}`] 
      },
      'video-status',
      request
    );
  }

  private async generateVideoWithProvider(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const provider = request.provider || 'kling';
    
    console.log(`[Video] Generating video with ${provider} provider for story ${request.storyId}`);
    
    switch (provider) {
      case 'kling':
        return this.generateVideoWithKling(request);
      case 'runwayml':
        return this.generateVideoWithRunwayML(request);
      default:
        throw new Error(`Unknown video provider: ${provider}`);
    }
  }

  private async generateVideoWithKling(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    try {
      // Generate JWT token for Kling API
      const token = await this.generateKlingJWT();
      
      const response = await fetch(`${this.klingConfig.baseUrl}/v1/videos/text2video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.prompt,
          aspect_ratio: request.aspectRatio || '16:9',
          duration: Math.min(request.duration || 5, 10), // Kling max 10 seconds
          professional_mode: request.quality === 'high' || request.quality === 'ultra',
          cfg_scale: 0.5,
          mode: 'std'
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Kling video generation failed: ${response.status} ${error}`);
      }
      
      const result = await response.json();
      
      return {
        taskId: result.data.task_id,
        status: 'processing',
        duration: request.duration || 5,
        metadata: {
          provider: 'kling',
          model: 'kling-v1-5',
          quality: request.quality || 'standard',
          generatedAt: new Date()
        }
      };
    } catch (error: any) {
      console.error('[Video] Kling generation failed:', error);
      throw error;
    }
  }

  private async generateVideoWithRunwayML(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    try {
      const response = await fetch(`${this.runwayConfig.baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.runwayConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskType: 'gen3',
          internal: false,
          options: {
            name: `Story ${request.storyId} Video`,
            seconds: Math.min(request.duration || 10, 20), // RunwayML max 20 seconds
            gen3_alpha: {
              prompt: request.prompt,
              aspect_ratio: request.aspectRatio || '16:9',
              seed: Math.floor(Math.random() * 1000000)
            }
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`RunwayML video generation failed: ${response.status} ${error}`);
      }
      
      const result = await response.json();
      
      return {
        taskId: result.task.id,
        status: 'processing',
        duration: request.duration || 10,
        metadata: {
          provider: 'runwayml',
          model: 'gen3-alpha',
          quality: request.quality || 'standard',
          generatedAt: new Date()
        }
      };
    } catch (error: any) {
      console.error('[Video] RunwayML generation failed:', error);
      throw error;
    }
  }

  private async checkVideoStatusWithProvider(request: VideoStatusRequest): Promise<VideoGenerationResult> {
    switch (request.provider) {
      case 'kling':
        return this.checkKlingVideoStatus(request.taskId);
      case 'runwayml':
        return this.checkRunwayMLVideoStatus(request.taskId);
      default:
        throw new Error(`Unknown video provider: ${request.provider}`);
    }
  }

  private async checkKlingVideoStatus(taskId: string): Promise<VideoGenerationResult> {
    try {
      const token = await this.generateKlingJWT();
      
      const response = await fetch(`${this.klingConfig.baseUrl}/v1/videos/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Kling status check failed: ${response.status}`);
      }
      
      const result = await response.json();
      const task = result.data;
      
      return {
        taskId,
        videoUrl: task.task_result?.videos?.[0]?.url || undefined,
        thumbnailUrl: task.task_result?.videos?.[0]?.cover_image_url || undefined,
        status: task.task_status === 'succeed' ? 'completed' : 
                task.task_status === 'failed' ? 'failed' : 'processing',
        duration: 5,
        metadata: {
          provider: 'kling',
          model: 'kling-v1-5',
          quality: 'standard',
          generatedAt: new Date()
        }
      };
    } catch (error: any) {
      console.error('[Video] Kling status check failed:', error);
      throw error;
    }
  }

  private async checkRunwayMLVideoStatus(taskId: string): Promise<VideoGenerationResult> {
    try {
      const response = await fetch(`${this.runwayConfig.baseUrl}/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.runwayConfig.apiKey}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`RunwayML status check failed: ${response.status}`);
      }
      
      const result = await response.json();
      const task = result.task;
      
      return {
        taskId,
        videoUrl: task.status === 'SUCCEEDED' ? task.output?.[0] : undefined,
        thumbnailUrl: task.artifacts?.find((a: any) => a.type === 'image')?.url || undefined,
        status: task.status === 'SUCCEEDED' ? 'completed' : 
                task.status === 'FAILED' ? 'failed' : 'processing',
        duration: 10,
        metadata: {
          provider: 'runwayml',
          model: 'gen3-alpha',
          quality: 'standard',
          generatedAt: new Date()
        }
      };
    } catch (error: any) {
      console.error('[Video] RunwayML status check failed:', error);
      throw error;
    }
  }

  private async generateKlingJWT(): Promise<string> {
    // Simple JWT generation for Kling API
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: this.klingConfig.apiKey,
      exp: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
      iat: Math.floor(Date.now() / 1000)
    })).toString('base64url');
    
    const signature = createHash('sha256')
      .update(`${header}.${payload}.${this.klingConfig.secretKey}`)
      .digest('base64url');
    
    return `${header}.${payload}.${signature}`;
  }

  getStats() {
    const baseStats = super.getStats();
    return {
      hitRate: baseStats.hitRate,
      provider: 'video-generation',
      totalRequests: baseStats.totalRequests,
      cacheHits: baseStats.cacheHits,
      cacheMisses: baseStats.cacheMisses,
      errors: baseStats.errors,
      timeouts: baseStats.timeouts,
      retries: baseStats.retries
    };
  }
}

// Singleton instance
let videoCachedProviderInstance: VideoCachedProvider | null = null;

export function getVideoCachedProvider(): VideoCachedProvider {
  if (!videoCachedProviderInstance) {
    const config = {
      kling: {
        apiKey: process.env.KLING_ACCESS_KEY || '',
        secretKey: process.env.KLING_SECRET_KEY || '',
        baseUrl: process.env.KLING_BASE_URL || 'https://api.klingai.com'
      },
      runwayml: {
        apiKey: process.env.RUNWAYML_API_KEY || '',
        baseUrl: process.env.RUNWAYML_BASE_URL || 'https://api.runway.team/v1'
      },
      timeout: 180000, // 3 minutes
      retryCount: 3
    };
    
    videoCachedProviderInstance = new VideoCachedProvider(config);
  }
  
  return videoCachedProviderInstance;
}