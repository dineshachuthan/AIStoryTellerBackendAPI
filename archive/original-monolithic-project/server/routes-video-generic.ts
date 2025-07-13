import type { Express } from 'express';
import { GenericVideoService } from './generic-video-service';
import { requireAuth } from './auth';

/**
 * Generic video routes that work with any configured provider
 * Routes remain constant regardless of which providers are enabled
 */
export function registerGenericVideoRoutes(app: Express): void {
  
  // Generate video using active provider
  app.post('/api/videos/generate', requireAuth, async (req, res) => {
    try {
      const { storyId, duration, quality, regenerate } = req.body;
      const userId = req.user!.id;

      const videoService = GenericVideoService.getInstance();
      await videoService.initialize();

      // Get story and roleplay analysis
      const { storage } = await import('./storage');
      const story = await storage.getStory(storyId);
      const roleplayAnalysis = await storage.getRoleplayAnalysis(storyId);

      if (!story) {
        return res.status(404).json({ error: 'Story not found' });
      }

      if (!roleplayAnalysis) {
        return res.status(400).json({ error: 'Roleplay analysis required' });
      }

      const result = await videoService.generateVideo({
        storyId,
        userId,
        roleplayAnalysis,
        storyContent: story.content,
        duration: duration || 20,
        quality: quality || 'std',
        regenerate: regenerate || false
      });

      res.json(result);
    } catch (error: any) {
      console.error('Video generation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check video status
  app.get('/api/videos/status/:taskId', requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { provider } = req.query;

      const videoService = GenericVideoService.getInstance();
      const status = await videoService.checkVideoStatus(taskId, provider as string);

      res.json(status);
    } catch (error: any) {
      console.error('Status check error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel video generation
  app.delete('/api/videos/cancel/:taskId', requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { provider } = req.query;

      const videoService = GenericVideoService.getInstance();
      const success = await videoService.cancelVideo(taskId, provider as string);

      res.json({ success });
    } catch (error: any) {
      console.error('Cancel error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Accept video (finalize)
  app.post('/api/videos/:storyId/accept', requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = req.user!.id;

      const videoService = GenericVideoService.getInstance();
      await videoService.acceptVideo(storyId, userId);

      res.json({ success: true, message: 'Video accepted and finalized' });
    } catch (error: any) {
      console.error('Accept video error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Regenerate video
  app.post('/api/videos/:storyId/regenerate', requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = req.user!.id;

      const videoService = GenericVideoService.getInstance();
      const result = await videoService.regenerateVideo(storyId, userId);

      res.json(result);
    } catch (error: any) {
      console.error('Regenerate video error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check video access
  app.get('/api/videos/:storyId/access', requireAuth, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const userId = req.user!.id;

      const videoService = GenericVideoService.getInstance();
      const access = await videoService.checkVideoAccess(storyId, userId);

      res.json(access);
    } catch (error: any) {
      console.error('Access check error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get providers status
  app.get('/api/videos/providers', requireAuth, async (req, res) => {
    try {
      const videoService = GenericVideoService.getInstance();
      const status = await videoService.getProvidersStatus();

      res.json(status);
    } catch (error: any) {
      console.error('Providers status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Switch active provider
  app.post('/api/videos/providers/switch', requireAuth, async (req, res) => {
    try {
      const { provider } = req.body;

      if (!provider) {
        return res.status(400).json({ error: 'Provider name required' });
      }

      const videoService = GenericVideoService.getInstance();
      const success = videoService.switchProvider(provider);

      if (!success) {
        return res.status(400).json({ error: `Provider ${provider} not available` });
      }

      res.json({ 
        success: true, 
        message: `Switched to ${provider} provider`,
        activeProvider: provider
      });
    } catch (error: any) {
      console.error('Provider switch error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}