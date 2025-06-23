import { BaseVideoProvider, VideoGenerationRequest, VideoGenerationResult, ProviderConfig } from './base-provider';

export class PikaLabsProvider extends BaseVideoProvider {
  constructor(config: ProviderConfig) {
    super('pika-labs', config);
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    try {
      const prompt = this.createPrompt(request);
      
      const response = await fetch(`${this.config.baseUrl || 'https://api.pika.art'}/v1/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          duration: Math.min(request.duration || 3, 4), // Pika Labs max 4s
          aspect_ratio: request.aspectRatio || '16:9',
          style: request.style || 'realistic',
          fps: 24
        })
      });

      if (!response.ok) {
        throw new Error(`Pika Labs API error: ${response.status} ${response.statusText}`);
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
      const response = await fetch(`${this.config.baseUrl || 'https://api.pika.art'}/v1/videos/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Pika Labs status check failed: ${response.status}`);
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
      const response = await fetch(`${this.config.baseUrl || 'https://api.pika.art'}/v1/videos/${jobId}/cancel`, {
        method: 'DELETE',
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
      const response = await fetch(`${this.config.baseUrl || 'https://api.pika.art'}/v1/account`, {
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
      maxDuration: 4,
      supportedFormats: ['mp4'],
      supportedResolutions: ['1920x1080', '1280x720', '512x512'],
      supportedStyles: ['realistic', 'cinematic', 'dramatic', 'documentary'],
      supportsCharacters: true,
      supportsVoice: false,
      supportsCustomImages: true
    };
  }

  async estimateCost(request: VideoGenerationRequest): Promise<number> {
    // Pika Labs pricing estimation (approximate)
    const duration = Math.min(request.duration || 3, 4);
    const baseRate = 0.75; // $0.75 per second (estimated)
    const qualityMultiplier = request.quality === 'ultra' ? 2.5 : request.quality === 'high' ? 1.8 : 1;
    
    return duration * baseRate * qualityMultiplier;
  }

  private createPrompt(request: VideoGenerationRequest): string {
    let prompt = `${request.style || 'Realistic'} cinematic video: `;
    
    // Add main narrative
    prompt += `"${request.title}". `;
    
    // Add character descriptions for visual context
    if (request.characters.length > 0) {
      const mainCharacters = request.characters.slice(0, 2); // Limit for clarity
      const characterDesc = mainCharacters.map(c => 
        `${c.name} (${c.description})`
      ).join(' and ');
      prompt += `Featuring ${characterDesc}. `;
    }

    // Add scene context
    if (request.scenes.length > 0) {
      const firstScene = request.scenes[0];
      prompt += `Scene: ${firstScene.description}. `;
      
      if (firstScene.backgroundDescription) {
        prompt += `Location: ${firstScene.backgroundDescription}. `;
      }

      // Add key dialogue for emotional context
      if (firstScene.dialogues.length > 0) {
        const keyDialogue = firstScene.dialogues[0];
        prompt += `"${keyDialogue.text}" - ${keyDialogue.character}. `;
      }
    }

    // Add visual style cues
    prompt += 'Professional cinematography, dramatic lighting, emotional depth.';

    return prompt;
  }
}