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

// Emotion Voice Sample Configurations
export const EMOTION_VOICE_CONFIGS: EmotionVoiceConfig[] = [
  // Basic Emotions
  {
    emotion: 'happy',
    displayName: 'Happy',
    description: 'Joyful and upbeat tone',
    sampleText: 'What a wonderful day this is! I feel so alive and excited about all the amazing possibilities ahead.',
    targetDuration: 10,
    voiceSettings: {
      stability: 0.7,
      similarityBoost: 0.8,
      style: 0.4,
      useSpeakerBoost: true,
      optimizeStreamingLatency: false
    },
    category: 'basic',
    aliases: ['joyful', 'cheerful', 'elated', 'euphoric']
  },
  {
    emotion: 'sad',
    displayName: 'Sad',
    description: 'Melancholy and sorrowful tone',
    sampleText: 'Sometimes life feels heavy, and the weight of sadness settles in my chest like a gentle rain.',
    targetDuration: 10,
    voiceSettings: {
      stability: 0.3,
      similarityBoost: 0.9,
      style: 0.0,
      useSpeakerBoost: true,
      optimizeStreamingLatency: false
    },
    category: 'basic',
    aliases: ['melancholy', 'sorrowful', 'dejected', 'mournful']
  },
  {
    emotion: 'angry',
    displayName: 'Angry',
    description: 'Frustrated and intense tone',
    sampleText: 'This is absolutely unacceptable! The frustration builds inside me like a fire that cannot be contained.',
    targetDuration: 10,
    voiceSettings: {
      stability: 0.4,
      similarityBoost: 0.7,
      style: 0.8,
      useSpeakerBoost: true,
      optimizeStreamingLatency: false
    },
    category: 'basic',
    aliases: ['furious', 'irritated', 'enraged', 'frustrated']
  },
  {
    emotion: 'calm',
    displayName: 'Calm',
    description: 'Peaceful and serene tone',
    sampleText: 'In this moment of tranquility, I find peace within myself and embrace the gentle stillness around me.',
    targetDuration: 10,
    voiceSettings: {
      stability: 0.8,
      similarityBoost: 0.9,
      style: 0.1,
      useSpeakerBoost: true,
      optimizeStreamingLatency: false
    },
    category: 'basic',
    aliases: ['peaceful', 'serene', 'tranquil', 'composed']
  },
  {
    emotion: 'excited',
    displayName: 'Excited',
    description: 'Energetic and enthusiastic tone',
    sampleText: 'Oh my goodness, this is incredible! The energy is rushing through me and I can barely contain my enthusiasm!',
    targetDuration: 10,
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0.6,
      useSpeakerBoost: true,
      optimizeStreamingLatency: false
    },
    category: 'basic',
    aliases: ['enthusiastic', 'thrilled', 'energetic', 'animated']
  },
  {
    emotion: 'fearful',
    displayName: 'Fearful',
    description: 'Anxious and worried tone',
    sampleText: 'Something feels wrong here. My heart is racing and every shadow seems to hide unknown dangers.',
    targetDuration: 10,
    voiceSettings: {
      stability: 0.2,
      similarityBoost: 0.9,
      style: 0.2,
      useSpeakerBoost: true,
      optimizeStreamingLatency: false
    },
    category: 'basic',
    aliases: ['anxious', 'worried', 'scared', 'nervous']
  },
  {
    emotion: 'surprised',
    displayName: 'Surprised',
    description: 'Astonished and amazed tone',
    sampleText: 'Wait, what? I never expected this to happen! This is completely beyond anything I could have imagined.',
    targetDuration: 10,
    voiceSettings: {
      stability: 0.4,
      similarityBoost: 0.8,
      style: 0.5,
      useSpeakerBoost: true,
      optimizeStreamingLatency: false
    },
    category: 'basic',
    aliases: ['astonished', 'amazed', 'shocked', 'stunned']
  },
  // Advanced Emotions
  {
    emotion: 'nostalgic',
    displayName: 'Nostalgic',
    description: 'Wistful and reminiscent tone',
    sampleText: 'Those were simpler times, weren\'t they? I can almost feel the warmth of those golden memories washing over me.',
    targetDuration: 10,
    voiceSettings: {
      stability: 0.6,
      similarityBoost: 0.9,
      style: 0.2,
      useSpeakerBoost: true,
      optimizeStreamingLatency: false
    },
    category: 'advanced',
    aliases: ['wistful', 'reminiscent', 'sentimental', 'longing']
  },
  {
    emotion: 'confident',
    displayName: 'Confident',
    description: 'Assured and self-possessed tone',
    sampleText: 'I know exactly what needs to be done, and I have the strength and wisdom to see it through to the end.',
    targetDuration: 10,
    voiceSettings: {
      stability: 0.8,
      similarityBoost: 0.8,
      style: 0.3,
      useSpeakerBoost: true,
      optimizeStreamingLatency: false
    },
    category: 'advanced',
    aliases: ['assured', 'determined', 'resolute', 'self-assured']
  },
  {
    emotion: 'mysterious',
    displayName: 'Mysterious',
    description: 'Enigmatic and intriguing tone',
    sampleText: 'Not everything is as it appears to be. There are secrets hidden in the shadows, waiting to be discovered.',
    targetDuration: 10,
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.9,
      style: 0.4,
      useSpeakerBoost: true,
      optimizeStreamingLatency: false
    },
    category: 'advanced',
    aliases: ['enigmatic', 'secretive', 'cryptic', 'intriguing']
  }
];

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

export function getEmotionConfig(emotion: string): EmotionVoiceConfig | null {
  return EMOTION_VOICE_CONFIGS.find(config => 
    config.emotion === emotion || config.aliases.includes(emotion.toLowerCase())
  ) || null;
}

export function getAllEmotionConfigs(): EmotionVoiceConfig[] {
  return [...EMOTION_VOICE_CONFIGS];
}

export function getEmotionsByCategory(category: 'basic' | 'advanced' | 'specialized'): EmotionVoiceConfig[] {
  return EMOTION_VOICE_CONFIGS.filter(config => config.category === category);
}