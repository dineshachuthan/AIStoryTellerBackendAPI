import { BaseVideoProvider, VideoGenerationRequest, VideoGenerationResult, ProviderConfig } from './base-provider';

export class RunwayMLProvider extends BaseVideoProvider {
  constructor(config: ProviderConfig) {
    super('runwayml', config);
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    try {
      // Create narrative prompt from story content and characters
      const prompt = this.createPrompt(request);
      
      const response = await fetch(`${this.config.baseUrl || 'https://api.runwayml.com'}/v1/video/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          duration: Math.min(request.duration || 10, 30), // RunwayML max 30s
          resolution: '1920x1080',
          motion_bucket_id: 127, // Default motion setting
          seed: Math.floor(Math.random() * 1000000),
          style: request.style || 'cinematic'
        })
      });

      if (!response.ok) {
        throw new Error(`RunwayML API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'completed') {
        return this.normalizeVideo({
          videoUrl: result.video_url,
          thumbnailUrl: result.thumbnail_url,
          duration: result.duration,
          id: result.id
        });
      }

      // If processing, return partial result with job ID for status checking
      return {
        videoUrl: '',
        duration: request.duration || 0,
        status: 'processing',
        metadata: {
          provider: this.name,
          providerJobId: result.id,
          format: 'mp4',
          resolution: '1920x1080',
          codec: 'h264',
          generatedAt: new Date()
        }
      };

    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async checkStatus(jobId: string): Promise<VideoGenerationResult> {
    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.runwayml.com'}/v1/video/generations/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`RunwayML status check failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === 'completed') {
        return this.normalizeVideo(result);
      }

      return {
        videoUrl: '',
        duration: 0,
        status: result.status === 'failed' ? 'failed' : 'processing',
        metadata: {
          provider: this.name,
          providerJobId: jobId,
          format: 'mp4',
          resolution: '1920x1080',
          codec: 'h264',
          generatedAt: new Date()
        },
        error: result.error
      };

    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async cancelGeneration(jobId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.runwayml.com'}/v1/video/generations/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.runwayml.com'}/v1/account`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  getCapabilities() {
    return {
      maxDuration: 30,
      supportedFormats: ['mp4'],
      supportedResolutions: ['1920x1080', '1280x720'],
      supportedStyles: ['cinematic', 'realistic', 'dramatic'],
      supportsCharacters: true,
      supportsVoice: false,
      supportsCustomImages: true
    };
  }

  async estimateCost(request: VideoGenerationRequest): Promise<number> {
    // RunwayML pricing estimation (approximate)
    const duration = Math.min(request.duration || 10, 30);
    const baseRate = 0.50; // $0.50 per second (estimated)
    const qualityMultiplier = request.quality === 'ultra' ? 2 : request.quality === 'high' ? 1.5 : 1;
    
    return duration * baseRate * qualityMultiplier;
  }

  private createPrompt(request: VideoGenerationRequest): string {
    let prompt = `${request.style || 'Cinematic'} style video: `;
    
    // Add main narrative
    prompt += `${request.title}. `;
    
    // Add character descriptions
    if (request.characters.length > 0) {
      const characterDesc = request.characters.map(c => 
        `${c.name}: ${c.description}`
      ).join(', ');
      prompt += `Characters: ${characterDesc}. `;
    }

    // Add scene context from first scene
    if (request.scenes.length > 0) {
      const firstScene = request.scenes[0];
      prompt += `Scene: ${firstScene.description}. `;
      
      if (firstScene.backgroundDescription) {
        prompt += `Setting: ${firstScene.backgroundDescription}. `;
      }
    }

    // Add story excerpt for context
    const excerpt = request.content.substring(0, 200);
    prompt += `Story context: ${excerpt}...`;

    return prompt;
  }
}