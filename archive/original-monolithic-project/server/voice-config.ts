/**
 * Voice Provider Configuration - Follows Video Provider Pattern
 * All configuration constants and provider setup
 */

export interface VoiceProviderConfig {
  apiKey: string;
  secretKey?: string;
  baseUrl: string;
  modelName: string;
  maxSamplesPerClone: number;
  maxSampleDurationMs: number;
  maxClonesPerUser: number;
  timeout: number;
  retryCount: number;
}

export interface VoiceProviderInfo {
  enabled: boolean;
  config: VoiceProviderConfig;
  priority: number;
}

export interface VoiceProviderConfiguration {
  activeProvider: string;
  providers: Record<string, VoiceProviderInfo>;
}

export const defaultVoiceConfig: VoiceProviderConfiguration = {
  activeProvider: '', // Will be determined by priority and availability
  providers: {
    'elevenlabs': {
      enabled: !!(process.env.ELEVENLABS_API_KEY),
      config: {
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        baseUrl: 'https://api.elevenlabs.io/v1',
        modelName: 'eleven_monolingual_v1',
        maxSamplesPerClone: 25,
        maxSampleDurationMs: 60000, // 60 seconds
        maxClonesPerUser: 10,
        timeout: 120000, // 2 minutes timeout for voice cloning
        retryCount: 3 // Retry up to 3 times for network errors only
      },
      priority: 1
    },
    'kling-voice': {
      enabled: !!(process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY),
      config: {
        apiKey: process.env.KLING_ACCESS_KEY || '',
        secretKey: process.env.KLING_SECRET_KEY || '',
        baseUrl: 'https://api.klingai.com/v1/voice',
        modelName: 'kling-voice-v1',
        maxSamplesPerClone: 20,
        maxSampleDurationMs: 30000, // 30 seconds
        maxClonesPerUser: 5,
        timeout: 120000, // 2 minutes timeout
        retryCount: 3 // Retry up to 3 times for network errors only
      },
      priority: 2
    }
  }
};

export function getVoiceConfig(): VoiceProviderConfiguration {
  return defaultVoiceConfig;
}

export function getActiveVoiceProvider(): string {
  const config = getVoiceConfig();
  
  // Find highest priority enabled provider
  const enabledProviders = Object.entries(config.providers)
    .filter(([_, providerConfig]) => providerConfig.enabled)
    .sort((a, b) => a[1].priority - b[1].priority);
  
  if (enabledProviders.length === 0) {
    throw new Error('No voice providers are enabled');
  }
  
  return enabledProviders[0][0];
}

export function getVoiceProviderConfig(provider: string) {
  const config = getVoiceConfig();
  const providerConfig = config.providers[provider];
  
  if (!providerConfig) {
    throw new Error(`Unknown voice provider: ${provider}`);
  }
  
  if (!providerConfig.enabled) {
    throw new Error(`Voice provider ${provider} is disabled`);
  }
  
  return providerConfig.config;
}