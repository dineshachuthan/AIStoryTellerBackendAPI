import express from 'express';
import { videoConfig } from './video-config';

const router = express.Router();

// Get current video provider configuration
router.get('/config', (req, res) => {
  try {
    // Return configuration without sensitive API keys
    const safeConfig = {
      activeProvider: videoConfig.activeProvider,
      providers: Object.fromEntries(
        Object.entries(videoConfig.providers).map(([name, config]) => [
          name,
          {
            enabled: config.enabled,
            priority: config.priority,
            maxDuration: config.config.maxDuration,
            supportedFormats: config.config.supportedFormats,
            hasApiKey: !!config.config.apiKey
          }
        ])
      ),
      fallbackOrder: videoConfig.fallbackOrder,
      compatibility: videoConfig.compatibility,
      duration: videoConfig.duration
    };

    res.json(safeConfig);
  } catch (error: any) {
    console.error('Error getting video config:', error);
    res.status(500).json({ message: 'Failed to get video configuration' });
  }
});

// Update active provider
router.post('/config/provider', (req, res) => {
  try {
    const { provider } = req.body;
    
    if (!provider || typeof provider !== 'string') {
      return res.status(400).json({ message: 'Provider name is required' });
    }

    if (!videoConfig.providers[provider]) {
      return res.status(400).json({ message: `Provider '${provider}' not found` });
    }

    if (!videoConfig.providers[provider].enabled) {
      return res.status(400).json({ message: `Provider '${provider}' is not enabled (missing API key)` });
    }

    videoConfig.activeProvider = provider;
    console.log(`Video provider switched to: ${provider}`);

    res.json({ 
      message: `Active provider switched to ${provider}`,
      activeProvider: videoConfig.activeProvider
    });
  } catch (error: any) {
    console.error('Error updating video provider:', error);
    res.status(500).json({ message: 'Failed to update video provider' });
  }
});

// Get provider status and health
router.get('/providers/status', async (req, res) => {
  try {
    const status = {};
    
    for (const [name, config] of Object.entries(videoConfig.providers)) {
      status[name] = {
        enabled: config.enabled,
        priority: config.priority,
        maxDuration: config.config.maxDuration,
        hasApiKey: !!config.config.apiKey,
        isActive: name === videoConfig.activeProvider
      };
    }

    res.json(status);
  } catch (error: any) {
    console.error('Error getting provider status:', error);
    res.status(500).json({ message: 'Failed to get provider status' });
  }
});

export default router;