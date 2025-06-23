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
      
      // First, get authentication token using X-API-Key
      let authToken;
      try {
        authToken = await this.getAuthToken();
        console.log('Successfully obtained auth token for video generation');
      } catch (authError) {
        console.error('Authentication failed:', authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }
      
      // Use correct text-to-video endpoint with Bearer token
      const url = `${this.config.baseUrl || 'https://api.runway.team/v1'}/text_to_video`;
      const headers = {
        'Authorization': `Bearer ${authToken}`,
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
      console.log('Auth token obtained:', !!authToken);
      
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
      const authToken = await this.getAuthToken();
      const response = await fetch(`${this.config.baseUrl || 'https://api.runway.team/v1'}/tasks/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
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
      const authToken = await this.getAuthToken();
      const response = await fetch(`${this.config.baseUrl || 'https://api.runway.team/v1'}/tasks/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const authToken = await this.getAuthToken();
      const response = await fetch(`${this.config.baseUrl || 'https://api.runway.team/v1'}/account`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
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
      console.log('RunwayML: Getting authentication token...');
      
      // Get authentication token using X-API-Key
      const response = await fetch(`${this.config.baseUrl || 'https://api.runway.team/v1'}/auth/token`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.config.apiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log(`RunwayML auth response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`RunwayML auth error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Auth failed: ${response.status} ${response.statusText}: ${errorText}`);
      }

      const result = await response.json();
      console.log('RunwayML auth response keys:', Object.keys(result));
      
      const token = result.access_token || result.token;
      if (!token) {
        throw new Error(`No token found in auth response: ${JSON.stringify(result)}`);
      }
      
      console.log(`RunwayML: Successfully obtained auth token (length: ${token.length})`);
      return token;
    } catch (error: any) {
      console.error('RunwayML authentication failed:', error);
      throw new Error(`RunwayML authentication failed: ${error.message}`);
    }
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
}