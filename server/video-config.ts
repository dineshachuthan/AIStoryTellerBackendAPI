import { VideoProviderConfiguration } from './video-providers/provider-manager';

export const defaultVideoConfig: VideoProviderConfiguration = {
  activeProvider: 'kling', // Default to Kling for testing
  providers: {
    'kling': {
      enabled: !!(process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY),
      config: {
        apiKey: process.env.KLING_ACCESS_KEY || '',
        secretKey: process.env.KLING_SECRET_KEY || '',
        baseUrl: 'https://api-singapore.klingai.com',
        maxDuration: 20, // 20 seconds maximum as requested
        defaultDuration: 20, // Default 20 seconds
        resolution: 'low', // Use low resolution for testing
        timeout: 120000, // Kling may take longer
        retryCount: 2
      },
      priority: 1
    },
    'runwayml': {
      enabled: false, // Disabled per user request
      config: {
        apiKey: '',
        baseUrl: '',
        maxDuration: 0,
        defaultDuration: 0,
        resolution: 'disabled',
        timeout: 0,
        retryCount: 0
      },
      priority: 999 // Lowest priority, effectively disabled
    },
    'pika-labs': {
      enabled: false, // Disabled - only using Kling
      config: {
        apiKey: '',
        baseUrl: '',
        maxDuration: 0,
        defaultDuration: 0,
        resolution: 'disabled',
        timeout: 0,
        retryCount: 0
      },
      priority: 999
    },
    'luma-ai': {
      enabled: false, // Disabled - only using Kling
      config: {
        apiKey: '',
        baseUrl: '',
        maxDuration: 0,
        defaultDuration: 0,
        resolution: 'disabled',
        timeout: 0,
        retryCount: 0
      },
      priority: 999
    }
  },
  fallbackOrder: ['kling'], // Only Kling enabled
  compatibility: {
    enforceMP4: true,
    enforceH264: true,
    maxFileSize: 100 // 100MB max file size
  },
  duration: {
    default: 10, // Default video duration in seconds
    minimum: 3,  // Minimum allowed duration
    maximum: 20, // Maximum allowed duration - 20 seconds as requested
    allowUserOverride: true // Allow users to specify custom duration within limits
  }
};

// Extend with roleplay configuration
export const videoConfig = {
  ...defaultVideoConfig,
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
  
  // Only check Kling provider for API keys, others are disabled
  if (config.providers.kling && !config.providers.kling.config.apiKey) {
    config.providers.kling.enabled = false;
    console.log(`Kling provider disabled: missing API key`);
  }
  
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