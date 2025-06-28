/**
 * Base Voice Provider Interface
 * Abstract interface for all voice generation providers
 */

export interface VoiceSample {
  id?: number;
  userId: string;
  emotion: string;
  audioData: Buffer;
  filename: string;
  duration: number;
  quality?: number;
  createdAt?: Date;
}

export interface VoiceCloneRequest {
  userId: string;
  name: string;
  description?: string;
  samples: VoiceSample[];
  labels?: Record<string, string>;
}

export interface VoiceGenerationRequest {
  text: string;
  voiceId: string;
  emotion?: string;
  settings?: Record<string, any>;
  userId?: string;
}

export interface AudioResult {
  audioBuffer: Buffer;
  audioUrl?: string;
  duration?: number;
  format: string;
  size: number;
}

export interface VoiceCloneResult {
  voiceId: string;
  status: 'processing' | 'completed' | 'failed';
  metadata?: any;
  estimatedReadyTime?: Date;
}

export interface VoiceProviderCapabilities {
  voiceCloning: boolean;
  emotionModulation: boolean;
  realTimeGeneration: boolean;
  batchProcessing: boolean;
  maxSamples: number;
  maxSampleSize: number;
  supportedFormats: string[];
}

export interface VoiceProviderStatus {
  isAvailable: boolean;
  isHealthy: boolean;
  lastCheck: Date;
  error?: string;
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
}

/**
 * Abstract base class for voice providers
 */
export abstract class BaseVoiceProvider {
  protected config: any;
  protected capabilities: VoiceProviderCapabilities;

  constructor(config: any) {
    this.config = config;
    this.capabilities = this.getCapabilities();
  }

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(): VoiceProviderCapabilities;

  /**
   * Check if provider is available and healthy
   */
  abstract checkHealth(): Promise<VoiceProviderStatus>;

  /**
   * Clone voice from samples
   */
  abstract cloneVoice(request: VoiceCloneRequest): Promise<VoiceCloneResult>;

  /**
   * Generate speech from text
   */
  abstract generateSpeech(request: VoiceGenerationRequest): Promise<AudioResult>;

  /**
   * Get available voices for user
   */
  abstract getUserVoices(userId: string): Promise<any[]>;

  /**
   * Delete a cloned voice
   */
  abstract deleteVoice(voiceId: string): Promise<void>;

  /**
   * Get voice generation status
   */
  abstract getVoiceStatus(voiceId: string): Promise<any>;

  /**
   * Validate voice samples
   */
  validateSamples(samples: VoiceSample[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (samples.length === 0) {
      errors.push('No samples provided');
      return { valid: false, errors };
    }

    if (samples.length > this.capabilities.maxSamples) {
      errors.push(`Too many samples. Maximum: ${this.capabilities.maxSamples}`);
    }

    for (const sample of samples) {
      if (!sample.audioData || sample.audioData.length === 0) {
        errors.push(`Sample ${sample.filename} has no audio data`);
      }

      if (sample.audioData.length > this.capabilities.maxSampleSize) {
        errors.push(`Sample ${sample.filename} too large. Maximum: ${this.capabilities.maxSampleSize} bytes`);
      }

      if (sample.duration < 3) {
        errors.push(`Sample ${sample.filename} too short. Minimum: 3 seconds`);
      }

      if (sample.duration > 60) {
        errors.push(`Sample ${sample.filename} too long. Maximum: 60 seconds`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Format audio data for provider
   */
  protected formatAudioData(audioData: Buffer, targetFormat: string): Buffer {
    // Base implementation - providers can override for specific formatting
    return audioData;
  }

  /**
   * Generate cache key for voice generation
   */
  protected generateCacheKey(request: VoiceGenerationRequest): string {
    const hash = require('crypto').createHash('md5');
    hash.update(request.text);
    hash.update(request.voiceId);
    hash.update(request.emotion || '');
    hash.update(JSON.stringify(request.settings || {}));
    return hash.digest('hex');
  }

  /**
   * Estimate audio duration from text
   */
  protected estimateAudioDuration(text: string, wordsPerMinute: number = 150): number {
    const wordCount = text.split(/\s+/).length;
    const durationInMinutes = wordCount / wordsPerMinute;
    return Math.round(durationInMinutes * 60 * 1000); // Convert to milliseconds
  }
}