/**
 * Voice Provider Configuration
 * Centralized configuration for all voice generation providers
 */

export interface VoiceProviderConfig {
  name: string;
  enabled: boolean;
  priority: number; // Lower number = higher priority
  apiConfig: {
    baseUrl: string;
    apiKey: string;
    model?: string;
    version?: string;
  };
  capabilities: {
    voiceCloning: boolean;
    emotionModulation: boolean;
    realTimeGeneration: boolean;
    batchProcessing: boolean;
  };
  limits: {
    maxSampleSize: number; // bytes
    maxSamples: number;
    maxDuration: number; // seconds
    rateLimit: number; // requests per minute
  };
  qualitySettings: {
    sampleRate: number;
    bitRate: number;
    format: string;
  };
}

export interface VoiceGenerationSettings {
  stability: number; // 0.0 - 1.0
  similarityBoost: number; // 0.0 - 1.0
  style: number; // 0.0 - 1.0
  useSpeakerBoost: boolean;
  optimizeStreamingLatency: boolean;
}

export interface VoiceCloningConfig {
  sampleThreshold: number; // Number of samples required to trigger voice cloning
  categories: {
    emotions: { enabled: boolean; threshold: number };
    sounds: { enabled: boolean; threshold: number };
    modulations: { enabled: boolean; threshold: number };
  };
  training: {
    maxRetries: number;
    timeoutMinutes: number;
    backgroundProcessing: boolean;
  };
  timeouts: {
    mainThreadSeconds: number; // 60 seconds for main thread operations
    workerThreadSeconds: number; // 300 seconds for worker thread operations
    retryDelayMs: number[]; // Exponential backoff delays [1000, 2000, 4000]
  };
}

export interface EmotionVoiceConfig {
  emotion: string;
  displayName: string;
  description: string;
  sampleText: string;
  targetDuration: number; // seconds
  voiceSettings: VoiceGenerationSettings;
  category: 'basic' | 'advanced' | 'specialized';
  aliases: string[]; // Alternative emotion names that map to this
}

// Voice Provider Configurations
export const VOICE_PROVIDERS: Record<string, VoiceProviderConfig> = {
  elevenlabs: {
    name: 'ElevenLabs',
    enabled: true,
    priority: 1,
    apiConfig: {
      baseUrl: 'https://api.elevenlabs.io/v1',
      apiKey: process.env.ELEVENLABS_API_KEY || '',
      model: 'eleven_monolingual_v1',
      version: 'v1'
    },
    capabilities: {
      voiceCloning: true,
      emotionModulation: true,
      realTimeGeneration: true,
      batchProcessing: true
    },
    limits: {
      maxSampleSize: 25 * 1024 * 1024, // 25MB
      maxSamples: 25,
      maxDuration: 300, // 5 minutes
      rateLimit: 20 // requests per minute
    },
    qualitySettings: {
      sampleRate: 44100,
      bitRate: 128,
      format: 'mp3'
    }
  },
  openai: {
    name: 'OpenAI',
    enabled: true,
    priority: 2,
    apiConfig: {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'tts-1'
    },
    capabilities: {
      voiceCloning: false,
      emotionModulation: false,
      realTimeGeneration: true,
      batchProcessing: false
    },
    limits: {
      maxSampleSize: 0,
      maxSamples: 0,
      maxDuration: 0,
      rateLimit: 50
    },
    qualitySettings: {
      sampleRate: 24000,
      bitRate: 64,
      format: 'mp3'
    }
  }
};

// Voice Cloning Configuration
export const VOICE_CLONING_CONFIG: VoiceCloningConfig = {
  sampleThreshold: 6, // Global default threshold
  categories: {
    emotions: { enabled: true, threshold: 6 },
    sounds: { enabled: true, threshold: 6 },
    modulations: { enabled: true, threshold: 6 }
  },
  training: {
    maxRetries: 3, // Exactly 3 retry attempts before throwing exception
    timeoutMinutes: 5, // 300 seconds for worker thread operations  
    backgroundProcessing: true
  },
  timeouts: {
    mainThreadSeconds: 60, // 60 seconds for main thread operations
    workerThreadSeconds: 300, // 300 seconds for worker thread operations
    retryDelayMs: [1000, 2000, 4000] // Exponential backoff delays
  }
};

// Voice configuration is now completely data-driven
// No hardcoded emotion templates - users create their own through recording
export const EMOTION_VOICE_CONFIGS: EmotionVoiceConfig[] = [];

// Utility functions for configuration access
export function getEnabledVoiceProviders(): VoiceProviderConfig[] {
  return Object.values(VOICE_PROVIDERS)
    .filter(provider => provider.enabled)
    .sort((a, b) => a.priority - b.priority);
}

export function getPrimaryVoiceProvider(): VoiceProviderConfig | null {
  const enabled = getEnabledVoiceProviders();
  return enabled.length > 0 ? enabled[0] : null;
}

// Data-driven functions - emotions come from user recordings, not hardcoded configs
export function getEmotionConfig(emotion: string): EmotionVoiceConfig | null {
  // No hardcoded configurations - emotions are user-defined through recording
  return null;
}

export function getAllEmotionConfigs(): EmotionVoiceConfig[] {
  // No hardcoded configurations - system is completely data-driven
  // Voice samples now come from story analysis results via async function
  return [];
}

export function getEmotionsByCategory(category: 'basic' | 'advanced' | 'specialized'): EmotionVoiceConfig[] {
  // No hardcoded categories - users create their own emotion categories through recording
  return [];
}

// Compatibility exports for services that expect these constants
export const VOICE_EMOTIONS: string[] = [];
export const EMOTION_CATEGORIES: Record<string, string[]> = {};
export const DEFAULT_VOICE_MAPPINGS: Record<string, string> = {};