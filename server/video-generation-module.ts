import { storage } from './storage';
import { RolePlayAnalysis } from './roleplay-analysis';
import { KlingPromptTemplate, KlingPromptData } from './video-providers/kling-prompt-template';
import { videoProviderManager } from './video-generation-service';

export interface VideoGenerationRequest {
  storyId: number;
  userId: string;
  roleplayAnalysis: RolePlayAnalysis;
  storyContent: string;
  duration?: number;
  quality?: 'std' | 'pro';
  regenerate?: boolean;
}

export interface VideoGenerationResult {
  videoId: string;
  status: 'draft' | 'processing' | 'complete' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  createdAt: Date;
  prompt: string;
  provider: string;
}

export class VideoGenerationModule {
  /**
   * Generate video from roleplay analysis with automatic prompt creation
   */
  static async generateVideoFromRoleplay(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    console.log('Starting video generation from roleplay analysis:', {
      storyId: request.storyId,
      userId: request.userId,
      duration: request.duration || 20,
      quality: request.quality || 'std',
      regenerate: request.regenerate || false
    });

    try {
      // 1. Check if video already exists (unless regenerating)
      if (!request.regenerate) {
        const existingVideo = await storage.getVideoByStoryId(request.storyId);
        if (existingVideo && existingVideo.status !== 'failed') {
          console.log('Existing video found, returning current result');
          return existingVideo;
        }
      }

      // 2. Extract prompt data from roleplay analysis
      const promptData = KlingPromptTemplate.extractFromRoleplayAnalysis(
        request.roleplayAnalysis,
        request.storyContent,
        request.duration || 20,
        request.quality || 'std'
      );

      // 3. Generate optimized Kling prompt
      const prompt = KlingPromptTemplate.generatePrompt(promptData);

      // 4. Create video generation task
      const videoResult = await this.callKlingAPI(promptData, prompt);

      // 5. Store video record in database with draft status
      const videoRecord: VideoGenerationResult = {
        videoId: videoResult.taskId || this.generateVideoId(),
        status: 'processing',
        videoUrl: videoResult.videoUrl,
        thumbnailUrl: videoResult.thumbnailUrl,
        duration: request.duration || 20,
        createdAt: new Date(),
        prompt,
        provider: 'kling'
      };

      // 6. Save to database
      await storage.saveVideoGeneration(request.storyId, request.userId, videoRecord);

      // 7. Start status polling if needed
      if (videoResult.taskId && !videoResult.videoUrl) {
        this.pollVideoStatus(videoResult.taskId, request.storyId, request.userId);
      }

      console.log('Video generation initiated successfully:', {
        videoId: videoRecord.videoId,
        status: videoRecord.status,
        promptLength: prompt.length
      });

      return videoRecord;

    } catch (error: any) {
      console.error('Video generation failed:', error);

      // Store failed status
      const failedRecord: VideoGenerationResult = {
        videoId: this.generateVideoId(),
        status: 'failed',
        duration: request.duration || 20,
        createdAt: new Date(),
        prompt: 'Generation failed',
        provider: 'kling'
      };

      await storage.saveVideoGeneration(request.storyId, request.userId, failedRecord);
      
      throw new Error(`Video generation failed: ${error.message}`);
    }
  }

  /**
   * Call Kling API with prepared data
   */
  private static async callKlingAPI(promptData: KlingPromptData, prompt: string): Promise<{
    taskId?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
  }> {
    const provider = videoProviderManager.getProvider('kling');
    if (!provider) {
      throw new Error('Kling provider not available');
    }

    // Prepare video request
    const videoRequest = {
      content: prompt,
      duration: promptData.technicalSpecs.duration,
      aspectRatio: promptData.technicalSpecs.aspectRatio,
      quality: promptData.technicalSpecs.quality,
      characters: promptData.characters.map(char => ({
        name: char.name,
        description: char.physicalDescription,
        personality: char.personality,
        role: char.role,
        imageUrl: char.imageUrls?.[0] // Use first image if available
      })),
      scenes: promptData.scenes.map(scene => ({
        title: scene.location,
        backgroundDescription: scene.backgroundDescription,
        background: {
          location: scene.location,
          timeOfDay: scene.timeOfDay,
          atmosphere: scene.atmosphere,
          lighting: scene.lighting,
          visualDescription: scene.visualDetails
        }
      }))
    };

    console.log('Calling Kling API with enhanced request:', {
      promptLength: prompt.length,
      charactersCount: promptData.characters.length,
      scenesCount: promptData.scenes.length,
      duration: promptData.technicalSpecs.duration
    });

    const response = await provider.generateVideo(videoRequest);
    
    return {
      taskId: response.taskId,
      videoUrl: response.videoUrl,
      thumbnailUrl: response.thumbnailUrl
    };
  }

  /**
   * Poll video generation status until complete
   */
  private static async pollVideoStatus(taskId: string, storyId: number, userId: string): Promise<void> {
    const maxAttempts = 60; // 5 minutes
    let attempts = 0;

    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        const provider = videoProviderManager.getProvider('kling');
        if (!provider) {
          clearInterval(pollInterval);
          return;
        }

        // Check status (this would need to be implemented in the provider)
        const status = await this.checkVideoStatus(taskId);
        
        if (status.completed) {
          clearInterval(pollInterval);
          
          // Update database with final video
          await storage.updateVideoGeneration(storyId, {
            status: 'draft', // Keep as draft until user accepts
            videoUrl: status.videoUrl,
            thumbnailUrl: status.thumbnailUrl
          });
          
          console.log('Video generation completed:', { taskId, videoUrl: status.videoUrl });
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          
          // Mark as failed if timeout
          await storage.updateVideoGeneration(storyId, {
            status: 'failed'
          });
          
          console.error('Video generation timeout:', { taskId });
        }
        
      } catch (error) {
        console.error('Error polling video status:', error);
      }
    }, 5000); // Poll every 5 seconds
  }

  /**
   * Check video generation status
   */
  private static async checkVideoStatus(taskId: string): Promise<{
    completed: boolean;
    videoUrl?: string;
    thumbnailUrl?: string;
  }> {
    // This would call the Kling status endpoint
    // For now, return placeholder until API is working
    return {
      completed: false
    };
  }

  /**
   * Accept/finalize video (user confirms video is good)
   */
  static async acceptVideo(storyId: number, userId: string): Promise<void> {
    console.log('Accepting video for story:', storyId);
    
    await storage.updateVideoGeneration(storyId, {
      status: 'complete'
    });
    
    console.log('Video marked as complete and can now be shared');
  }

  /**
   * Regenerate video (creates new version)
   */
  static async regenerateVideo(storyId: number, userId: string): Promise<VideoGenerationResult> {
    console.log('Regenerating video for story:', storyId);
    
    // Get original story and roleplay analysis
    const story = await storage.getStory(storyId);
    if (!story) {
      throw new Error('Story not found');
    }

    const roleplayAnalysis = await storage.getRoleplayAnalysis(storyId);
    if (!roleplayAnalysis) {
      throw new Error('Roleplay analysis not found');
    }

    // Clear existing video cache and database entry
    await storage.deleteVideoGeneration(storyId);
    
    // Generate new video
    return this.generateVideoFromRoleplay({
      storyId,
      userId,
      roleplayAnalysis,
      storyContent: story.content,
      regenerate: true
    });
  }

  /**
   * Check video access permissions
   */
  static async checkVideoAccess(storyId: number, userId: string): Promise<{
    canView: boolean;
    canShare: boolean;
    reason?: string;
  }> {
    const video = await storage.getVideoByStoryId(storyId);
    if (!video) {
      return { canView: false, canShare: false, reason: 'Video not found' };
    }

    const story = await storage.getStory(storyId);
    if (!story) {
      return { canView: false, canShare: false, reason: 'Story not found' };
    }

    // Complete videos can be shared with anyone
    if (video.status === 'complete') {
      return { canView: true, canShare: true };
    }

    // Draft/processing videos only viewable by owner and roleplay participants
    const isOwner = story.userId === userId;
    const isParticipant = await storage.isRoleplayParticipant(storyId, userId);

    if (isOwner || isParticipant) {
      return { 
        canView: true, 
        canShare: false, 
        reason: 'Video is still in draft/processing status' 
      };
    }

    return { 
      canView: false, 
      canShare: false, 
      reason: 'Access denied - not owner or participant' 
    };
  }

  /**
   * Generate unique video ID
   */
  private static generateVideoId(): string {
    return `video_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}