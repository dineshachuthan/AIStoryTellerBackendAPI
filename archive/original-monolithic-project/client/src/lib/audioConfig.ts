// Audio recording configuration system
export interface AudioFormat {
  mimeType: string;
  extension: string;
  priority: number;
  bitRate?: number;
  sampleRate?: number;
}

export interface AudioConstraints {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate: number;
  channelCount: number;
}

export interface AudioRecorderConfig {
  formats: AudioFormat[];
  constraints: AudioConstraints;
  chunkInterval: number;
  maxDuration: number;
  fallbackFormat: AudioFormat;
}

// Default configuration - can be overridden
export const DEFAULT_AUDIO_CONFIG: AudioRecorderConfig = {
  formats: [
    { mimeType: 'audio/webm;codecs=opus', extension: 'webm', priority: 1, bitRate: 128000 },
    { mimeType: 'audio/webm', extension: 'webm', priority: 2, bitRate: 128000 },
    { mimeType: 'audio/mp4', extension: 'mp4', priority: 3, bitRate: 128000 },
    { mimeType: 'audio/wav', extension: 'wav', priority: 4 },
    { mimeType: 'audio/ogg', extension: 'ogg', priority: 5, bitRate: 128000 },
    { mimeType: 'audio/mpeg', extension: 'mp3', priority: 6, bitRate: 128000 }
  ],
  constraints: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
    channelCount: 1
  },
  chunkInterval: 1000,
  maxDuration: 300000, // 5 minutes
  fallbackFormat: { mimeType: 'audio/webm', extension: 'webm', priority: 999 }
};

export class AudioConfigManager {
  private config: AudioRecorderConfig;

  constructor(config?: Partial<AudioRecorderConfig>) {
    this.config = { ...DEFAULT_AUDIO_CONFIG, ...config };
  }

  updateConfig(updates: Partial<AudioRecorderConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getSupportedFormats(): AudioFormat[] {
    return this.config.formats
      .filter(format => this.isFormatSupported(format.mimeType))
      .sort((a, b) => a.priority - b.priority);
  }

  getBestFormat(): AudioFormat {
    const supported = this.getSupportedFormats();
    return supported.length > 0 ? supported[0] : this.config.fallbackFormat;
  }

  getConstraints(): MediaTrackConstraints {
    return {
      echoCancellation: this.config.constraints.echoCancellation,
      noiseSuppression: this.config.constraints.noiseSuppression,
      autoGainControl: this.config.constraints.autoGainControl,
      sampleRate: this.config.constraints.sampleRate,
      channelCount: this.config.constraints.channelCount
    };
  }

  getRecorderOptions(format: AudioFormat): MediaRecorderOptions {
    const options: MediaRecorderOptions = {
      mimeType: format.mimeType
    };

    if (format.bitRate) {
      options.audioBitsPerSecond = format.bitRate;
    }

    return options;
  }

  getChunkInterval(): number {
    return this.config.chunkInterval;
  }

  getMaxDuration(): number {
    return this.config.maxDuration;
  }

  private isFormatSupported(mimeType: string): boolean {
    try {
      return MediaRecorder.isTypeSupported(mimeType);
    } catch {
      return false;
    }
  }

  // Get current configuration for debugging
  getConfig(): AudioRecorderConfig {
    return { ...this.config };
  }

  // Create file with proper naming based on format
  createFileName(baseName: string, format: AudioFormat): string {
    const cleanName = baseName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    return `${cleanName}.${format.extension}`;
  }
}