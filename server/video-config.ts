import { VideoProviderConfiguration } from './video-providers/provider-manager';

export const defaultVideoConfig: VideoProviderConfiguration = {
  activeProvider: 'runwayml', // Default to RunwayML for cinematic quality
  providers: {
    'runwayml': {
      enabled: true,
      config: {
        apiKey: process.env.RUNWAYML_API_KEY || process.env.RUNWAY_API_KEY || '',
        baseUrl: 'https://api.runway.team/v1',

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
  },
  duration: {
    default: 10, // Default video duration in seconds
    minimum: 3,  // Minimum allowed duration
    maximum: 20, // Maximum allowed duration per story - keep low for cost protection
    allowUserOverride: true // Allow users to specify custom duration within limits
  },
  roleplay: {
    targetDurationSeconds: 60, // Target duration for roleplay content generation (can be 60, 120, 240)
    maxDurationSeconds: 240, // Maximum roleplay duration allowed
    videoGenerationSeconds: 20 // Actual video generation duration (separate from roleplay content)
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

/**
 * Get status of all video providers
 */
export function getVideoProviderStatus(): { [key: string]: { enabled: boolean; hasApiKey: boolean; reason?: string } } {
  return {
    'runwayml': {
      enabled: !!(process.env.RUNWAYML_API_KEY || process.env.RUNWAY_API_KEY),
      hasApiKey: !!(process.env.RUNWAYML_API_KEY || process.env.RUNWAY_API_KEY),
      reason: !(process.env.RUNWAYML_API_KEY || process.env.RUNWAY_API_KEY) ? 'Missing API key' : undefined
    },
    'pika-labs': {
      enabled: !!process.env.PIKA_LABS_API_KEY,
      hasApiKey: !!process.env.PIKA_LABS_API_KEY,
      reason: !process.env.PIKA_LABS_API_KEY ? 'Missing API key' : undefined
    },
    'luma-ai': {
      enabled: !!process.env.LUMA_AI_API_KEY,
      hasApiKey: !!process.env.LUMA_AI_API_KEY,
      reason: !process.env.LUMA_AI_API_KEY ? 'Missing API key' : undefined
    }
  };
}