import { BaseVideoProvider, VideoGenerationRequest, VideoGenerationResult, ProviderConfig } from './base-provider';
import { runwayMLConfig, RunwayMLConfig } from './runwayml-config';

export class RunwayMLProvider extends BaseVideoProvider {
  private apiKey: string;
  private runwayConfig: RunwayMLConfig;
  private readonly API_BASE_URL = 'https://api.dev.runwayml.com';

  constructor(config: ProviderConfig) {
    super('runwayml', config);
    
    if (!config.apiKey) {
      throw new Error('RunwayML API key is required but not provided');
    }
    
    this.apiKey = config.apiKey;
    this.runwayConfig = runwayMLConfig;
    
    console.log('RunwayML provider initialized with API key:', config.apiKey ? 'present' : 'missing');
    console.log('RunwayML config loaded - API version:', this.runwayConfig.apiVersion);
  }

  /**
   * Make authenticated API request to RunwayML
   */
  private async runwayApiRequest<T = any>(endpoint: string, options: {
    method?: string;
    body?: any;
  } = {}): Promise<T> {
    const { method = 'GET', body } = options;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Runway-Version': this.runwayConfig.apiVersion,
    };

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(body);
    }

    const url = `${this.API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    console.log(`Making RunwayML API request: ${method} ${url}`);

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: response.statusText || 'Unknown error' };
      }

      throw new Error(
        JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          details: errorData,
        })
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    try {
      const prompt = this.createPrompt(request);
      
      // Check if we have character images for image-to-video generation
      const hasCharacterImages = request.characters && request.characters.some(char => char.imageUrl);
      
      if (hasCharacterImages) {
        console.log(`Generating video using RunwayML SDK imageToVideo method with character references`);
        console.log('Character images found:', request.characters?.filter(char => char.imageUrl).length);
        
        // Use the first character image as the primary reference
        const primaryCharacter = request.characters?.find(char => char.imageUrl);
        if (!primaryCharacter?.imageUrl) {
          throw new Error('Character image URL is required for image-to-video generation');
        }

        // Try to use image-to-video, but gracefully fall back to text-to-video if image processing fails
        try {
          // Try data URI first, fallback to cached URL if needed
          let promptImage: string;
          try {
            promptImage = await this.convertImageUrlToDataUri(primaryCharacter.imageUrl);
          } catch (error) {
            console.log('Failed to convert to data URI, trying cached URL fallback:', error.message);
            
            // Try to get cached image URL as fallback
            const { imageAssetService } = await import('../image-asset-service');
            const cachedAsset = await imageAssetService.cacheImage(primaryCharacter.imageUrl, 'runway-video');
            const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
              `https://${process.env.REPLIT_DEV_DOMAIN}` : 
              'http://localhost:5000';
            promptImage = imageAssetService.getAbsoluteUrl(cachedAsset.publicUrl, baseUrl);
            console.log('Using cached image URL as fallback:', promptImage);
          }
          
          console.log('Creating image-to-video task with prompt:', prompt.substring(0, 100) + '...');
          
          const task = await this.runwayApiRequest('/v1/image_to_video', {
            method: 'POST',
            body: {
              model: 'gen3a_turbo',
              promptImage: promptImage,
              promptText: prompt,
              duration: Math.min(request.duration || 10, 20),
              seed: Math.floor(Math.random() * 2147483647),
              watermark: false,
              ratio: this.getValidAspectRatio(request.aspectRatio)
            }
          });
            
          console.log('RunwayML image-to-video task created, waiting for completion...');
            
          // Wait for task completion manually
          const completedTask = await this.waitForCompletion(task.id);
          console.log('RunwayML image-to-video task completed:', completedTask);
          
          // Extract video URL from task output
          const videoUrl = completedTask.output?.[0] || completedTask.artifacts?.[0]?.url || '';
          
          if (!videoUrl) {
            throw new Error('No video URL returned from RunwayML image-to-video task');
          }

          return {
            videoUrl: videoUrl,
            thumbnailUrl: completedTask.thumbnails?.[0] || '',
            duration: request.duration || 10,
            status: 'completed',
            metadata: {
              provider: 'runwayml',
              providerJobId: completedTask.id,
              format: 'mp4',
              resolution: request.aspectRatio === '9:16' ? '720x1280' : 
                         request.aspectRatio === '1:1' ? '1024x1024' : '1280x720',
              codec: 'h264',
              generatedAt: new Date(),
              generationType: 'image-to-video',
              referenceImage: primaryCharacter.imageUrl
            }
          };
        } catch (imageError) {
          console.warn('Image-to-video failed, falling back to text-to-video:', imageError.message);
          // Continue to text-to-video generation below
        }
      }
      
      // Text-to-video generation (either no character images or image-to-video failed)
      {
        console.log(`Generating video using RunwayML SDK textToVideo method`);
        console.log(hasCharacterImages ? 
          'Character images were found but failed to process, using text-to-video generation' : 
          'No character images found, using text-to-video generation');

        // Use RunwayML API for text-to-video generation
        console.log('Creating text-to-video task with prompt:', prompt.substring(0, 100) + '...');
        
        const task = await this.runwayApiRequest('/v1/image_to_video', {
          method: 'POST',
          body: {
            model: 'gen3a_turbo',
            promptText: prompt,
            duration: Math.min(request.duration || 10, 20),
            seed: Math.floor(Math.random() * 2147483647),
            watermark: false,
            ratio: this.getValidAspectRatio(request.aspectRatio)
          }
        });
          
        console.log('RunwayML task created, waiting for completion...');

        // Wait for task completion manually
        const completedTask = await this.waitForCompletion(task.id);
        console.log('RunwayML text-to-video task completed:', completedTask);

        // Extract video URL from task output
        const videoUrl = completedTask.output?.[0] || completedTask.artifacts?.[0]?.url || '';
        
        if (!videoUrl) {
          throw new Error('No video URL returned from RunwayML task');
        }

        return {
          videoUrl: videoUrl,
          thumbnailUrl: completedTask.thumbnails?.[0] || '',
          duration: request.duration || 10,
          status: 'completed',
          metadata: {
            provider: 'runwayml',
            providerJobId: completedTask.id,
            format: 'mp4',
            resolution: request.aspectRatio === '9:16' ? '720x1280' : 
                       request.aspectRatio === '1:1' ? '1024x1024' : '1280x720',
            codec: 'h264',
            generatedAt: new Date(),
            generationType: 'text-to-video'
          }
        };
      }

    } catch (error: any) {
      console.error('RunwayML generation error:', error);
      throw this.handleError(error);
    }
  }

  private async waitForCompletion(taskId: string): Promise<any> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const task = await this.runwayApiRequest(`/v1/tasks/${taskId}`);
        
        if (task.status === 'SUCCEEDED') {
          return task;
        } else if (task.status === 'FAILED') {
          throw new Error(`Task failed: ${task.failure?.reason || 'Unknown error'}`);
        }
        
        console.log(`Task ${taskId} status: ${task.status}, waiting...`);
        
        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
        
      } catch (error) {
        console.error('Error polling task status:', error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    throw new Error('Task timed out waiting for completion');
  }

  async checkStatus(jobId: string): Promise<VideoGenerationResult> {
    try {
      // Get task status using API
      const task = await this.runwayApiRequest(`/v1/tasks/${jobId}`);
      
      return {
        videoUrl: task.status === 'SUCCEEDED' ? (task.output?.[0] || '') : '',
        thumbnailUrl: task.thumbnail || '',
        duration: 10,
        status: task.status === 'SUCCEEDED' ? 'completed' : 
                task.status === 'FAILED' ? 'failed' : 'processing',
        metadata: {
          provider: 'runwayml',
          providerJobId: task.id,
          format: 'mp4',
          resolution: '1280x720',
          codec: 'h264',
          generatedAt: new Date()
        }
      };

    } catch (error: any) {
      console.error('RunwayML status check error:', error);
      throw this.handleError(error);
    }
  }

  async cancelGeneration(jobId: string): Promise<boolean> {
    try {
      // Cancel task using API
      await this.runwayApiRequest(`/v1/tasks/${jobId}`, { method: 'DELETE' });
      return true;
    } catch (error: any) {
      console.error('RunwayML cancel error:', error);
      return false;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test the API key by trying to retrieve a task list
      await this.runwayApiRequest('/v1/tasks');
      return true;
    } catch (error: any) {
      console.error('RunwayML config validation failed:', error);
      return false;
    }
  }

  getCapabilities() {
    return {
      maxDuration: 10, // seconds
      supportedFormats: ['mp4'],
      supportedResolutions: ['1280x720', '768x1344', '1024x1024'],
      supportedStyles: ['cinematic', 'documentary', 'animated', 'realistic'],
      supportsCharacters: true,
      supportsVoice: true,
      supportsCustomImages: false
    };
  }

  async estimateCost(request: VideoGenerationRequest): Promise<number> {
    const duration = Math.min(request.duration || 10, 10);
    const baseRate = 0.95; // $0.95 per second for gen3a_turbo
    const qualityMultiplier = request.quality === 'high' ? 1.2 : 1;
    
    return duration * baseRate * qualityMultiplier;
  }

  private createPrompt(request: VideoGenerationRequest): string {
    let prompt = `${request.style || 'Cinematic'} style video adaptation of "${request.title}". `;
    
    // Add detailed character information with voice and appearance
    if (request.characters.length > 0) {
      prompt += `CHARACTERS: `;
      const characterDetails = request.characters.map(c => {
        let charDesc = `${c.name} - ${c.description || 'main character'}`;
        if (c.imageUrl) {
          charDesc += ` (custom appearance defined)`;
        }
        if (c.voiceUrl) {
          charDesc += ` (custom voice provided)`;
        }
        return charDesc;
      }).join('; ');
      prompt += `${characterDetails}. `;
    }

    // Add comprehensive scene information from roleplay analysis
    if (request.scenes.length > 0) {
      prompt += `SCENES: `;
      const sceneDetails = request.scenes.map((scene, index) => {
        let sceneDesc = `Scene ${index + 1}: ${scene.title || scene.description}`;
        
        // Add dialogue context if available
        if (scene.dialogues && scene.dialogues.length > 0) {
          const keyDialogue = scene.dialogues.slice(0, 2).map(d => 
            `${d.character}: "${d.text.substring(0, 50)}${d.text.length > 50 ? '...' : ''}"`
          ).join(', ');
          sceneDesc += ` - Key dialogue: ${keyDialogue}`;
        }
        
        // Add background/setting
        if (scene.backgroundDescription) {
          sceneDesc += ` - Setting: ${scene.backgroundDescription}`;
        }
        
        return sceneDesc;
      }).join('; ');
      prompt += `${sceneDetails}. `;
    }

    // Add story narrative with emotional context
    const storyExcerpt = request.content.substring(0, 400);
    prompt += `NARRATIVE: ${storyExcerpt}${request.content.length > 400 ? '...' : ''}. `;
    
    // Add visual style instructions
    prompt += `VISUAL STYLE: Professional ${request.style || 'cinematic'} quality with clear character focus, `;
    prompt += `natural lighting, and immersive storytelling. `;
    
    // Add duration and pacing guidance
    prompt += `Create a ${request.duration || 10}-second video that captures the essence of this story with smooth transitions and engaging visual narrative.`;

    return prompt;
  }

  private getValidAspectRatio(requestedRatio?: string): string {
    return this.runwayConfig.aspectRatioMappings[requestedRatio || '16:9'] || '1280:768';
  }

  private async convertImageUrlToDataUri(imageUrl: string): Promise<string> {
    try {
      console.log('Converting image URL to data URI:', imageUrl);
      
      // Import the image asset service
      const { imageAssetService } = await import('../image-asset-service');
      
      // First try to cache the image locally to avoid expired URL issues
      let finalImageUrl = imageUrl;
      try {
        const cachedAsset = await imageAssetService.cacheImage(imageUrl, 'runway-video');
        // Use absolute URL for our cached image
        const baseUrl = process.env.REPLIT_DEV_DOMAIN ? 
          `https://${process.env.REPLIT_DEV_DOMAIN}` : 
          'http://localhost:5000'; // fallback for development
        finalImageUrl = imageAssetService.getAbsoluteUrl(cachedAsset.publicUrl, baseUrl);
        console.log('Using cached image URL:', finalImageUrl);
      } catch (cacheError) {
        console.warn('Failed to cache image, using original URL:', cacheError.message);
        // Continue with original URL as fallback
      }
      
      const response = await fetch(finalImageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const imageBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(imageBuffer);
      
      // Check size limits per RunwayML documentation
      if (buffer.length > this.runwayConfig.sizeLimits.dataUriMaxSize) {
        const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
        const limitMB = (this.runwayConfig.sizeLimits.dataUriMaxSize / 1024 / 1024).toFixed(1);
        throw new Error(`Image too large for data URI (${sizeMB}MB > ${limitMB}MB). Use direct URL instead.`);
      }
      
      // Validate content type per RunwayML requirements
      let mimeType = response.headers.get('content-type') || '';
      const supportedTypes = this.runwayConfig.supportedFormats;
      
      if (!supportedTypes.includes(mimeType)) {
        // Fallback based on URL extension
        if (finalImageUrl.toLowerCase().includes('.png')) {
          mimeType = 'image/png';
        } else if (finalImageUrl.toLowerCase().includes('.webp')) {
          mimeType = 'image/webp';
        } else {
          mimeType = 'image/jpeg'; // Default fallback
        }
      }
      
      const base64 = buffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64}`;
      
      console.log(`Converted image to data URI: ${(buffer.length / 1024).toFixed(1)}KB, type: ${mimeType}`);
      return dataUri;
      
    } catch (error) {
      console.error('Error converting image URL to data URI:', error);
      throw new Error(`Failed to convert image URL to data URI: ${error.message}`);
    }
  }
}