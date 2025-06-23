import type { Express } from "express";
import { videoProviderManager } from './video-generation-service';
import { requireAuth } from './auth';

export function registerVideoProviderRoutes(app: Express): void {
  // Get available video providers
  app.get('/api/video/providers', requireAuth, async (req, res) => {
    try {
      const providers = videoProviderManager.getAvailableProviders();
      const capabilities = {};
      
      for (const provider of providers) {
        capabilities[provider] = videoProviderManager.getProviderCapabilities(provider);
      }
      
      res.json({
        providers,
        capabilities,
        activeProvider: videoProviderManager.getConfiguration().activeProvider
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Switch active video provider
  app.post('/api/video/providers/switch', requireAuth, async (req, res) => {
    try {
      const { provider } = req.body;
      
      if (!provider) {
        return res.status(400).json({ message: 'Provider name is required' });
      }
      
      const success = videoProviderManager.switchProvider(provider);
      
      if (!success) {
        return res.status(400).json({ message: `Provider ${provider} not available` });
      }
      
      res.json({ 
        message: `Switched to ${provider} provider`,
        activeProvider: provider
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get provider configuration
  app.get('/api/video/providers/config', requireAuth, async (req, res) => {
    try {
      const config = videoProviderManager.getConfiguration();
      
      // Remove sensitive information (API keys)
      const safeConfig = {
        ...config,
        providers: Object.keys(config.providers).reduce((acc, key) => {
          acc[key] = {
            enabled: config.providers[key].enabled,
            priority: config.providers[key].priority,
            hasApiKey: !!config.providers[key].config.apiKey
          };
          return acc;
        }, {} as any)
      };
      
      res.json(safeConfig);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Validate provider configurations
  app.get('/api/video/providers/validate', requireAuth, async (req, res) => {
    try {
      const validationResults = await videoProviderManager.validateAllProviders();
      res.json(validationResults);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Estimate costs for video generation
  app.post('/api/video/providers/estimate', requireAuth, async (req, res) => {
    try {
      const { storyId, duration, quality } = req.body;
      
      // Create a sample request for cost estimation
      const sampleRequest = {
        storyId: storyId || 1,
        title: 'Sample Story',
        content: 'Sample content for cost estimation',
        characters: [
          { name: 'Character 1', description: 'Main character' }
        ],
        scenes: [
          { 
            title: 'Scene 1', 
            description: 'Main scene',
            dialogues: [{ character: 'Character 1', text: 'Sample dialogue' }]
          }
        ],
        duration: duration || 10,
        quality: quality || 'standard'
      };
      
      const costs = await videoProviderManager.estimateCosts(sampleRequest);
      res.json(costs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check video generation status
  app.get('/api/video/providers/status/:jobId', requireAuth, async (req, res) => {
    try {
      const { jobId } = req.params;
      const { provider } = req.query;
      
      const result = await videoProviderManager.checkStatus(jobId, provider as string);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cancel video generation
  app.delete('/api/video/providers/cancel/:jobId', requireAuth, async (req, res) => {
    try {
      const { jobId } = req.params;
      const { provider } = req.query;
      
      const success = await videoProviderManager.cancelGeneration(jobId, provider as string);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}