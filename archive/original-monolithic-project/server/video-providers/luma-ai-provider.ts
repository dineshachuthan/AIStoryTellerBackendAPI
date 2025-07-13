import { BaseVideoProvider, VideoGenerationRequest, VideoGenerationResult, ProviderConfig } from './base-provider';

export class LumaAIProvider extends BaseVideoProvider {
  constructor(config: ProviderConfig) {
    super('luma-ai', config);
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    try {
      const prompt = this.createPrompt(request);
      
      const response = await fetch(`${this.config.baseUrl || 'https://api.lumalabs.ai'}/dream-machine/v1/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: request.aspectRatio || '16:9',
          loop: false,
          keyframes: {
            frame0: {
              type: 'generation',
              text: prompt
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Luma AI API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.state === 'completed') {
        return this.normalizeVideo({
          videoUrl: result.assets.video,
          thumbnailUrl: result.assets.thumbnail,
          duration: 5, // Luma AI default duration
          id: result.id
        });
      }

      return {
        videoUrl: '',
        duration: request.duration || 5,
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
      const response = await fetch(`${this.config.baseUrl || 'https://api.lumalabs.ai'}/dream-machine/v1/generations/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Luma AI status check failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.state === 'completed') {
        return this.normalizeVideo({
          videoUrl: result.assets.video,
          thumbnailUrl: result.assets.thumbnail,
          duration: 5,
          id: result.id
        });
      }

      return {
        videoUrl: '',
        duration: 5,
        status: result.state === 'failed' ? 'failed' : 'processing',
        metadata: {
          provider: this.name,
          providerJobId: jobId,
          format: 'mp4',
          resolution: '1920x1080',
          codec: 'h264',
          generatedAt: new Date()
        },
        error: result.failure_reason
      };

    } catch (error: any) {
      return this.handleError(error);
    }
  }

  async cancelGeneration(jobId: string): Promise<boolean> {
    // Luma AI doesn't support cancellation
    return false;
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.lumalabs.ai'}/dream-machine/v1/generations?limit=1`, {
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
      maxDuration: 5,
      supportedFormats: ['mp4'],
      supportedResolutions: ['1920x1080'],
      supportedStyles: ['realistic', 'cinematic', 'dramatic'],
      supportsCharacters: true,
      supportsVoice: false,
      supportsCustomImages: true
    };
  }

  async estimateCost(request: VideoGenerationRequest): Promise<number> {
    // Luma AI pricing estimation (approximate)
    const baseRate = 3.00; // $3 per generation (estimated)
    const qualityMultiplier = request.quality === 'ultra' ? 1.5 : request.quality === 'high' ? 1.2 : 1;
    
    return baseRate * qualityMultiplier;
  }

  private createPrompt(request: VideoGenerationRequest): string {
    let prompt = `High-quality ${request.style || 'cinematic'} video: `;
    
    // Add story context
    prompt += `"${request.title}". `;
    
    // Add main characters for visual consistency
    if (request.characters.length > 0) {
      const primaryChar = request.characters[0];
      prompt += `Featuring ${primaryChar.name}: ${primaryChar.description}. `;
      
      if (request.characters.length > 1) {
        const secondaryChar = request.characters[1];
        prompt += `Also featuring ${secondaryChar.name}: ${secondaryChar.description}. `;
      }
    }

    // Add scene setting
    if (request.scenes.length > 0) {
      const scene = request.scenes[0];
      prompt += `Scene: ${scene.description}. `;
      
      if (scene.backgroundDescription) {
        prompt += `Setting: ${scene.backgroundDescription}. `;
      }

      // Add emotional context from dialogue
      if (scene.dialogues.length > 0) {
        const dialogue = scene.dialogues[0];
        if (dialogue.emotion) {
          prompt += `Mood: ${dialogue.emotion}. `;
        }
      }
    }

    // Add cinematic quality indicators
    prompt += 'Professional filmmaking, realistic lighting, detailed environments, smooth camera movement.';

    return prompt;
  }
}