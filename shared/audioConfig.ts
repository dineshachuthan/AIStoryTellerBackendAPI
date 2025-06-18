// Shared audio configuration types and constants
export interface AudioFormatConfig {
  mimeType: string;
  extension: string;
  priority: number;
  bitRate?: number;
  sampleRate?: number;
  codec?: string;
}

export interface AudioConstraintsConfig {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate: number;
  channelCount: number;
}

export interface PlatformAudioConfig {
  formats: AudioFormatConfig[];
  constraints: AudioConstraintsConfig;
  recording: {
    chunkInterval: number;
    maxDuration: number;
    minDuration: number;
  };
  playback: {
    preload: 'auto' | 'metadata' | 'none';
    crossOrigin: 'anonymous' | 'use-credentials' | null;
  };
  compatibility: {
    ios: AudioFormatConfig[];
    android: AudioFormatConfig[];
    safari: AudioFormatConfig[];
    chrome: AudioFormatConfig[];
    firefox: AudioFormatConfig[];
    edge: AudioFormatConfig[];
  };
}

// Server-side audio processing configuration
export interface ServerAudioConfig {
  uploadPath: string;
  allowedFormats: string[];
  maxFileSize: number;
  conversion: {
    targetFormat: string;
    targetBitRate: number;
    targetSampleRate: number;
  };
  storage: {
    cacheDirectory: string;
    retentionDays: number;
  };
}

// Environment-based configuration
export interface EnvironmentAudioConfig {
  development: Partial<PlatformAudioConfig>;
  production: Partial<PlatformAudioConfig>;
  testing: Partial<PlatformAudioConfig>;
}

// Default configurations that can be overridden
export const DEFAULT_PLATFORM_CONFIG: PlatformAudioConfig = {
  formats: [
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm', priority: 1, bitRate: 128000, codec: 'opus' },
    { mimeType: 'audio/webm', extension: 'webm', priority: 2, bitRate: 128000 },
    { mimeType: 'audio/mp4', extension: 'mp4', priority: 3, bitRate: 128000 },
    { mimeType: 'audio/wav', extension: 'wav', priority: 4, sampleRate: 44100 },
    { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg', priority: 5, bitRate: 128000, codec: 'opus' },
    { mimeType: 'audio/mpeg', extension: 'mp3', priority: 6, bitRate: 128000 }
  ],
  constraints: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
    channelCount: 1
  },
  recording: {
    chunkInterval: 1000,
    maxDuration: 300000,
    minDuration: 1000
  },
  playback: {
    preload: 'metadata',
    crossOrigin: null
  },
  compatibility: {
    ios: [
      { mimeType: 'audio/mp4', extension: 'mp4', priority: 1, bitRate: 128000 },
      { mimeType: 'audio/wav', extension: 'wav', priority: 2 }
    ],
    android: [
      { mimeType: 'audio/webm;codecs=opus', extension: 'webm', priority: 1, bitRate: 128000 },
      { mimeType: 'audio/mp4', extension: 'mp4', priority: 2, bitRate: 128000 }
    ],
    safari: [
      { mimeType: 'audio/mp4', extension: 'mp4', priority: 1, bitRate: 128000 },
      { mimeType: 'audio/wav', extension: 'wav', priority: 2 }
    ],
    chrome: [
      { mimeType: 'audio/webm;codecs=opus', extension: 'webm', priority: 1, bitRate: 128000 },
      { mimeType: 'audio/mp4', extension: 'mp4', priority: 2, bitRate: 128000 }
    ],
    firefox: [
      { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg', priority: 1, bitRate: 128000 },
      { mimeType: 'audio/webm', extension: 'webm', priority: 2, bitRate: 128000 }
    ],
    edge: [
      { mimeType: 'audio/webm;codecs=opus', extension: 'webm', priority: 1, bitRate: 128000 },
      { mimeType: 'audio/mp4', extension: 'mp4', priority: 2, bitRate: 128000 }
    ]
  }
};

export const DEFAULT_SERVER_CONFIG: ServerAudioConfig = {
  uploadPath: 'persistent-cache/user-voice-samples',
  allowedFormats: ['webm', 'mp4', 'wav', 'ogg', 'mp3'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  conversion: {
    targetFormat: 'mp3',
    targetBitRate: 128000,
    targetSampleRate: 44100
  },
  storage: {
    cacheDirectory: 'persistent-cache',
    retentionDays: 30
  }
};