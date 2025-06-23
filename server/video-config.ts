import { VideoProviderConfiguration } from './video-providers/provider-manager';

export const defaultVideoConfig: VideoProviderConfiguration = {
  activeProvider: 'runwayml', // Default to RunwayML for cinematic quality
  providers: {
    'runwayml': {
      enabled: true,
      config: {
        apiKey: process.env.RUNWAYML_API_KEY || '',
        baseUrl: 'https://api.runwayml.com',
        timeout: 60000,
        retryCount: 2
      },
      priority: 1
    },
    'pika-labs': {
      enabled: true,
      config: {
        apiKey: process.env.PIKA_LABS_API_KEY || '',
        baseUrl: 'https://api.pika.art',
        timeout: 45000,
        retryCount: 2
      },
      priority: 2
    },
    'luma-ai': {
      enabled: true,
      config: {
        apiKey: process.env.LUMA_AI_API_KEY || '',
        baseUrl: 'https://api.lumalabs.ai',
        timeout: 90000,
        retryCount: 1
      },
      priority: 3
    }
  },
  fallbackOrder: ['runwayml', 'pika-labs', 'luma-ai'],
  compatibility: {
    enforceMP4: true,
    enforceH264: true,
    maxFileSize: 100 // 100MB max file size
  }
};

/**
 * Get video provider configuration with environment overrides
 */
export function getVideoProviderConfig(): VideoProviderConfiguration {
  const config = { ...defaultVideoConfig };
  
  // Override active provider from environment
  if (process.env.VIDEO_PROVIDER) {
    config.activeProvider = process.env.VIDEO_PROVIDER;
  }
  
  // Disable providers that don't have API keys
  Object.keys(config.providers).forEach(providerName => {
    const provider = config.providers[providerName];
    if (!provider.config.apiKey) {
      provider.enabled = false;
      console.log(`Video provider ${providerName} disabled: missing API key`);
    }
  });
  
  return config;
}