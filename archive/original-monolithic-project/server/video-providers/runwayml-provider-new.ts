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
      let prompt = this.createPrompt(request);
      
      // Add character descriptions to prompt for better text-to-video generation
      if (request.characters && request.characters.length > 0) {
        const characterDescriptions = request.characters.map(char => 
          `${char.name}: ${char.description || 'main character'}`
        ).join(', ');
        prompt += ` Features characters: ${characterDescriptions}`;
        console.log(`Enhanced prompt with ${request.characters.length} character descriptions`);
      }
      
      console.log('Creating video task with story-specific prompt');
      console.log('=== COMPLETE PROMPT BEING SENT TO RUNWAYML ===');
      console.log(prompt);
      console.log('=== END PROMPT ===');
      
      // Use a simple solid color PNG to avoid any image validation issues
      console.log('Using simple solid color PNG to avoid content moderation issues');
      const promptImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAKklEQVQYV2NkYPjPgA4wYhVgoKJiahmA7gfWC2QbIa+ApgfIhkl4AAEAAI4IBxrk9WOOAAAAASUVORK5CYII=';
      
      // Get resolution based on quality setting
      const aspectRatio = this.getValidAspectRatio(request.aspectRatio, request.quality);
      
      // Use the available model
      const modelName = this.runwayConfig.defaultModel;
      
      const requestBody = {
        model: modelName,
        promptImage: promptImage,
        promptText: prompt,
        duration: Math.min(request.duration || this.runwayConfig.defaultDuration, this.runwayConfig.maxDuration),
        aspectRatio: aspectRatio
      };

      console.log('Making RunwayML API request with minimal image and text prompt');
      console.log('Prompt length:', prompt.length, 'Duration:', requestBody.duration);
      // Prompt already logged above
      
      const task = await this.runwayApiRequest('/v1/image_to_video', {
        method: 'POST',
        body: requestBody
      });
      
      console.log('RunwayML task created successfully:', task);

      // Wait for task completion
      const completedTask = await this.waitForCompletion(task.id);
      console.log('RunwayML task completed:', completedTask);

      // Extract video URL from task output
      console.log('Completed task structure:', JSON.stringify(completedTask, null, 2));
      
      const videoUrl = completedTask.output?.[0] || 
                      completedTask.artifacts?.[0]?.url || 
                      completedTask.output?.url ||
                      completedTask.videoUrl ||
                      '';
      
      if (!videoUrl) {
        console.error('No video URL found in completed task. Available fields:', Object.keys(completedTask));
        throw new Error(`No video URL returned from RunwayML task. Task structure: ${JSON.stringify(completedTask)}`);
      }
      
      // Get resolution info for metadata first
      const resolutionTier = request.quality === 'high' ? 'high' : 
                            request.quality === 'standard' ? 'standard' : 
                            this.runwayConfig.defaultResolution;
      const resolutionConfig = this.runwayConfig.resolution[resolutionTier];

      console.log('Video generation successful! URL:', videoUrl);
      console.log('Video metadata summary:');
      console.log('- Generated from prompt:', prompt.substring(0, 100) + '...');
      console.log('- Characters requested:', request.characters?.length || 0);
      console.log('- Scenes requested:', request.scenes?.length || 0);
      console.log('- Resolution tier:', resolutionTier);
      console.log('- Aspect ratio:', aspectRatio);
      
      return {
        videoUrl: videoUrl,
        thumbnailUrl: completedTask.thumbnails?.[0] || '',
        duration: request.duration || this.runwayConfig.defaultDuration,
        status: 'completed',
        metadata: {
          provider: 'runwayml',
          providerJobId: completedTask.id,
          format: 'mp4',
          resolution: aspectRatio,
          resolutionTier: resolutionTier,
          codec: 'h264',
          generatedAt: new Date(),
          generationType: 'image-to-video',
          model: modelName,
          costEstimate: this.runwayConfig.models.gen3a_turbo.costMultiplier
        }
      };

    } catch (error: any) {
      console.error('RunwayML generation error:', error);
      throw this.handleError(error);
    }
  }

  private async waitForCompletion(taskId: string): Promise<any> {
    const maxAttempts = 24; // 4 minutes with 10-second intervals - reduced to prevent infinite loops
    let attempts = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    console.log(`Polling RunwayML task ${taskId} for completion (max ${maxAttempts} attempts)`);

    while (attempts < maxAttempts) {
      try {
        const task = await this.runwayApiRequest(`/v1/tasks/${taskId}`);
        
        if (task.status === 'SUCCEEDED') {
          return task;
        } else if (task.status === 'FAILED') {
          const failureReason = task.failure?.reason || task.failure?.message || 'Content may violate guidelines or exceed limits';
          const failureDetails = task.failure || {};
          console.log(`RunwayML task ${taskId} failed:`, {
            reason: failureReason,
            details: failureDetails,
            fullTask: task
          });
          // Stop polling immediately on failure - don't retry
          throw new Error(`RunwayML generation failed: ${failureReason}`);
        }
        
        console.log(`Task ${taskId} status: ${task.status}, waiting... (attempt ${attempts + 1}/${maxAttempts})`);
        
        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
        
      } catch (error) {
        console.error('Error polling task status:', error);
        
        // If this is a RunwayML generation failure, stop immediately
        if (error instanceof Error && error.message.includes('RunwayML generation failed')) {
          console.log('Stopping polling due to RunwayML task failure');
          throw error;
        }
        
        attempts++;
        
        // Stop if too many attempts
        if (attempts >= maxAttempts) {
          throw new Error(`Polling failed after ${maxAttempts} attempts: ${error}`);
        }
        
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

    console.log('Final prompt details:', {
      originalContentLength: request.content.length,
      finalPromptLength: prompt.length,
      prompt: prompt.substring(0, 200) + '...'
    });
    return prompt;
  }

  private filterContentForPolicy(content: string): string {
    // Aggressive content filtering for RunwayML content policy compliance
    const filtered = content
      // Remove violence/death content
      .replace(/\b(violence|violent|death|kill|murder|blood|fight|attack|weapon|gun|knife|sword|die|dying|dead)\b/gi, 'journey')
      // Remove crime/theft content
      .replace(/\b(steal|stolen|theft|thief|rob|robbery|crime|criminal)\b/gi, 'adventure')
      // Remove fear/threatening content
      .replace(/\b(terrified|terror|fear|scary|frightening|threatening|menacing)\b/gi, 'surprised')
      // Remove crude/inappropriate language
      .replace(/\b(piss|shit|damn|hell|disgusting|stink|stinks)\b/gi, 'unpleasant')
      // Remove AI/consciousness themes that might be sensitive
      .replace(/\b(AI|artificial intelligence|chip in brain|control|creature|experiment)\b/gi, 'technology')
      // Remove dark themes
      .replace(/\b(dark|darkness|shadow|evil|sinister)\b/gi, 'mysterious')
      // Remove mature themes
      .replace(/\b(adult|mature|explicit|inappropriate)\b/gi, 'dramatic')
      // Remove medical/disability content that might be sensitive
      .replace(/\b(polio|paralysed|paralyzed|couldn't walk|miracle)\b/gi, 'recovered')
      // Make content more positive/neutral
      .replace(/\b(begged|begs)\b/gi, 'asked')
      .replace(/\b(vanish|vanished|disappear|disappeared)\b/gi, 'went away')
      .replace(/\b(alone)\b/gi, 'by himself');
    
    return filtered;
  }

  private getValidAspectRatio(requestedRatio?: string, quality?: string): string {
    const resolutionTier = quality === 'high' ? 'high' : 
                          quality === 'standard' ? 'standard' : 
                          this.runwayConfig.defaultResolution;
    
    const aspectRatios = this.runwayConfig.resolution[resolutionTier].aspectRatios;
    return aspectRatios[requestedRatio || '16:9'] || aspectRatios['16:9'];
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
        console.warn('Failed to cache image, will try original URL:', cacheError.message);
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