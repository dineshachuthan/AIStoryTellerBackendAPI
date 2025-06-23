import { BaseVideoProvider, VideoGenerationRequest, VideoGenerationResult, ProviderConfig } from './base-provider';

export class RunwayMLProvider extends BaseVideoProvider {
  constructor(config: ProviderConfig) {
    super('runwayml', config);
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    try {
      // Create narrative prompt from story content and characters
      const prompt = this.createPrompt(request);
      
      console.log(`Generating video using runwayml provider`);
      
      // Use correct text-to-video endpoint with direct API key authentication
      const url = `${this.config.baseUrl || 'https://api.runway.team/v1'}/text_to_video`;
      const headers = {
        'X-API-Key': this.config.apiKey,
        'Content-Type': 'application/json'
      };
      const body = {
        prompt: prompt,
        duration: Math.min(request.duration || 10, 10),
        model: 'gen3a_turbo',
        watermark: false,
        enhance_prompt: true,
        seed: Math.floor(Math.random() * 2147483647)
      };
      
      console.log('RunwayML API Request Details:');
      console.log('URL:', url);
      console.log('Headers:', JSON.stringify(headers, null, 2));
      console.log('Body:', JSON.stringify(body, null, 2));
      
      // RunwayML Gen-3 API endpoint - back to original endpoint with proper auth
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      console.log(`RunwayML API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`RunwayML API error: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`RunwayML API error: ${response.status} ${response.statusText}: ${errorBody}`);
      }

      const result = await response.json();
      console.log(`RunwayML API response:`, JSON.stringify(result, null, 2));
      
      if (result.status === 'SUCCEEDED') {
        return this.normalizeVideo({
          videoUrl: result.output?.[0] || result.video_url || result.url,
          thumbnailUrl: result.thumbnail_url || result.preview_url,
          duration: result.duration || request.duration || 10,
          id: result.id
        });
      }

      if (result.status === 'FAILED') {
        throw new Error(`RunwayML generation failed: ${result.failure_reason || 'Unknown error'}`);
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
      const response = await fetch(`${this.config.baseUrl || 'https://api.runway.team/v1'}/tasks/${jobId}`, {
        headers: {
          'X-API-Key': this.config.apiKey
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
      const response = await fetch(`${this.config.baseUrl || 'https://api.runway.team/v1'}/tasks/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.config.apiKey
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.runway.team/v1'}/account`, {
        headers: {
          'X-API-Key': this.config.apiKey
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

  private async getAuthToken(): Promise<string> {
    try {
      // Get authentication token using API key
      const response = await fetch(`${this.config.baseUrl || 'https://api.runway.team/v1'}/auth/token`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.config.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.access_token || result.token;
    } catch (error: any) {
      throw new Error(`RunwayML authentication failed: ${error.message}`);
    }
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