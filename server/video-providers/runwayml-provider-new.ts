import { BaseVideoProvider, VideoGenerationRequest, VideoGenerationResult, ProviderConfig } from './base-provider';
import RunwayML, { TaskFailedError } from '@runwayml/sdk';

export class RunwayMLProvider extends BaseVideoProvider {
  private client: RunwayML;

  constructor(config: ProviderConfig) {
    super('runwayml', config);
    
    // Initialize RunwayML SDK client
    this.client = new RunwayML({
      apiKey: config.apiKey
    });
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    try {
      const prompt = this.createPrompt(request);
      
      console.log(`Generating video using RunwayML API with SDK authentication`);
      console.log('Comprehensive prompt:', prompt);

      // Use direct API call for text-to-video (SDK doesn't have textToVideo method)
      // but leverage SDK's authentication mechanism
      const response = await fetch('https://api.runwayml.com/v1/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.client.apiKey}`,
          'Content-Type': 'application/json',
          'X-Runway-Version': '2024-09-13'
        },
        body: JSON.stringify({
          taskType: 'gen3a_turbo',
          internal: false,
          options: {
            promptText: prompt,
            seconds: Math.min(request.duration || 10, 20),
            gen3a_turbo: {
              mode: 'gen3a_turbo',
              seed: Math.floor(Math.random() * 2147483647),
              watermark: false,
              init_image: null,
              motion_bucket_id: 127,
              cond_aug: 0.02,
              width: request.aspectRatio === '9:16' ? 768 : 
                     request.aspectRatio === '1:1' ? 1024 : 1280,
              height: request.aspectRatio === '9:16' ? 1344 : 
                      request.aspectRatio === '1:1' ? 1024 : 720
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`RunwayML API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`RunwayML API error: ${response.status} ${response.statusText}: ${errorText}`);
      }

      const task = await response.json();
      console.log('RunwayML task created:', task);

      // Wait for task completion by polling
      let completedTask = task;
      if (task.status !== 'SUCCEEDED') {
        completedTask = await this.waitForCompletion(task.id);
      }

      const videoUrl = completedTask.output?.[0] || completedTask.artifacts?.[0]?.url || '';
      
      if (!videoUrl) {
        throw new Error('No video URL returned from RunwayML');
      }

      return {
        videoUrl: videoUrl,
        thumbnailUrl: completedTask.thumbnail || '',
        duration: request.duration || 10,
        status: 'completed',
        metadata: {
          provider: 'runwayml',
          providerJobId: task.id,
          format: 'mp4',
          resolution: request.aspectRatio === '9:16' ? '768x1344' : 
                     request.aspectRatio === '1:1' ? '1024x1024' : '1280x720',
          codec: 'h264',
          generatedAt: new Date()
        }
      };

    } catch (error: any) {
      console.error('RunwayML generation error:', error);
      
      if (error instanceof TaskFailedError) {
        console.error('The video failed to generate.');
        console.error('Task details:', error.taskDetails);
        throw new Error(`Video generation failed: ${error.taskDetails?.error || 'Task failed'}`);
      }
      
      throw this.handleError(error);
    }
  }

  private async waitForCompletion(taskId: string): Promise<any> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const task = await this.client.tasks.retrieve(taskId);
        
        if (task.status === 'SUCCEEDED') {
          return task;
        } else if (task.status === 'FAILED') {
          throw new Error(`Task failed: ${task.failure?.reason || 'Unknown error'}`);
        }
        
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
      // Get task status using SDK
      const task = await this.client.tasks.retrieve(jobId);
      
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
      // Cancel task using SDK
      await this.client.tasks.delete(jobId);
      return true;
    } catch (error: any) {
      console.error('RunwayML cancel error:', error);
      return false;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test the API key by trying to retrieve a task list (simpler endpoint)
      // Since the SDK doesn't have a users.me() method, we'll use a different approach
      const response = await fetch('https://api.runwayml.com/v1/tasks', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.client.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
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
}