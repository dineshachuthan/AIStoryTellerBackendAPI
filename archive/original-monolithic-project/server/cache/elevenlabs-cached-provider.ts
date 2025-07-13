/**
 * ElevenLabs Cached Provider - Content Hash Based Voice Cloning Cache
 * Extends BaseCachedProvider to enforce cache-first pattern for ElevenLabs API calls
 */

import { BaseCachedProvider, ExternalApiContext, CacheOptions } from './base-cached-provider';
import { createHash } from 'crypto';

export interface ElevenLabsVoiceTrainingRequest {
  userId: string;
  voiceSamples: Array<{
    emotion: string;
    audioBuffer: Buffer;
    fileName: string;
  }>;
  voiceProfileName: string;
}

export interface ElevenLabsSpeechRequest {
  text: string;
  voiceId: string;
  emotion?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface ElevenLabsVoiceCloneResult {
  voiceId: string;
  voiceName: string;
  success: boolean;
  samplesProcessed: number;
}

export interface ElevenLabsSpeechResult {
  audioBuffer: Buffer;
  voiceId: string;
  duration: number;
}

export class ElevenLabsCachedProvider extends BaseCachedProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retryCount?: number;
  }) {
    super({
      name: 'elevenlabs',
      timeout: config.timeout || 120000,
      retryCount: config.retryCount || 3
    });
    
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.elevenlabs.io/v1';
  }

  protected generateCacheKey(...args: any[]): string {
    const [operation, request] = args;
    
    switch (operation) {
      case 'voice-training':
        return this.generateVoiceTrainingCacheKey(request);
      case 'speech-generation':
        return this.generateSpeechCacheKey(request);
      default:
        throw new Error(`Unknown ElevenLabs operation: ${operation}`);
    }
  }

  private generateVoiceTrainingCacheKey(request: ElevenLabsVoiceTrainingRequest): string {
    // Create content hash from voice samples
    const samplesContent = request.voiceSamples
      .map(sample => ({
        emotion: sample.emotion,
        audioHash: this.generateContentHash(sample.audioBuffer),
        fileName: sample.fileName
      }))
      .sort((a, b) => a.emotion.localeCompare(b.emotion)); // Consistent ordering
    
    const contentString = JSON.stringify({
      userId: request.userId,
      voiceProfileName: request.voiceProfileName,
      samples: samplesContent
    });
    
    return `elevenlabs:voice-training:${this.generateContentHash(Buffer.from(contentString, 'utf8'))}`;
  }

  private generateSpeechCacheKey(request: ElevenLabsSpeechRequest): string {
    const contentString = JSON.stringify({
      text: request.text,
      voiceId: request.voiceId,
      emotion: request.emotion || 'neutral',
      stability: request.stability || 0.5,
      similarityBoost: request.similarityBoost || 0.75
    });
    
    return `elevenlabs:speech:${this.generateContentHash(Buffer.from(contentString, 'utf8'))}`;
  }

  private generateContentHash(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  protected async callExternalApi<T>(context: ExternalApiContext, ...args: any[]): Promise<T> {
    const [operation, request] = args;
    
    switch (operation) {
      case 'voice-training':
        return this.trainVoiceWithElevenLabs(request) as T;
      case 'speech-generation':
        return this.generateSpeechWithElevenLabs(request) as T;
      default:
        throw new Error(`Unknown ElevenLabs operation: ${operation}`);
    }
  }

  protected async writeToDatabaseFirst<T>(key: string, data: T, options: CacheOptions): Promise<void> {
    // Write to cache table first, then file cache
    await this.cacheService.set(key, data, options.ttl, options.tags);
  }

  protected async readFromDatabase<T>(key: string): Promise<T | null> {
    return await this.cacheService.get<T>(key);
  }

  protected validateResponse<T>(data: T): boolean {
    if (!data) return false;
    
    // Validate voice training response
    if (typeof data === 'object' && 'voiceId' in data) {
      const result = data as ElevenLabsVoiceCloneResult;
      return !!(result.voiceId && result.success);
    }
    
    // Validate speech generation response
    if (typeof data === 'object' && 'audioBuffer' in data) {
      const result = data as ElevenLabsSpeechResult;
      return !!(result.audioBuffer && result.voiceId);
    }
    
    return true;
  }

  async trainVoiceWithCache(request: ElevenLabsVoiceTrainingRequest): Promise<ElevenLabsVoiceCloneResult> {
    return this.executeWithCache(
      'voice-training',
      { ttl: null, tags: ['voice-training', `user:${request.userId}`] }, // Infinite - same samples = same voice clone forever
      'voice-training',
      request
    );
  }

  async generateSpeechWithCache(request: ElevenLabsSpeechRequest): Promise<ElevenLabsSpeechResult> {
    return this.executeWithCache(
      'speech-generation',
      { ttl: null, tags: ['speech-generation', `voice:${request.voiceId}`] }, // Infinite - same text + voice = same audio forever
      'speech-generation',
      request
    );
  }

  private async trainVoiceWithElevenLabs(request: ElevenLabsVoiceTrainingRequest): Promise<ElevenLabsVoiceCloneResult> {
    console.log(`[ElevenLabs] Training voice for user ${request.userId} with ${request.voiceSamples.length} samples`);
    
    try {
      // Create voice clone using ElevenLabs API
      const formData = new FormData();
      formData.append('name', request.voiceProfileName);
      formData.append('description', `Voice clone for user ${request.userId}`);
      
      // Add voice samples
      request.voiceSamples.forEach((sample, index) => {
        const blob = new Blob([sample.audioBuffer], { type: 'audio/mpeg' });
        formData.append('files', blob, sample.fileName);
      });
      
      const response = await fetch(`${this.baseUrl}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
        },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs voice training failed: ${response.status} ${error}`);
      }
      
      const result = await response.json();
      
      return {
        voiceId: result.voice_id,
        voiceName: result.name,
        success: true,
        samplesProcessed: request.voiceSamples.length
      };
    } catch (error: any) {
      console.error('[ElevenLabs] Voice training failed:', error);
      throw error;
    }
  }

  private async generateSpeechWithElevenLabs(request: ElevenLabsSpeechRequest): Promise<ElevenLabsSpeechResult> {
    console.log(`[ElevenLabs] Generating speech for voice ${request.voiceId}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech/${request.voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: request.text,
          voice_settings: {
            stability: request.stability || 0.5,
            similarity_boost: request.similarityBoost || 0.75,
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs speech generation failed: ${response.status} ${error}`);
      }
      
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      return {
        audioBuffer,
        voiceId: request.voiceId,
        duration: Math.ceil(audioBuffer.length / (44100 * 2)) // Estimate duration
      };
    } catch (error: any) {
      console.error('[ElevenLabs] Speech generation failed:', error);
      throw error;
    }
  }

  getStats() {
    const baseStats = super.getStats();
    return {
      hitRate: baseStats.hitRate,
      provider: 'elevenlabs',
      totalRequests: baseStats.totalRequests,
      cacheHits: baseStats.cacheHits,
      cacheMisses: baseStats.cacheMisses,
      errors: baseStats.errors,
      timeouts: baseStats.timeouts,
      retries: baseStats.retries
    };
  }
}

// Singleton instance
let elevenLabsCachedProviderInstance: ElevenLabsCachedProvider | null = null;

export function getElevenLabsCachedProvider(): ElevenLabsCachedProvider {
  if (!elevenLabsCachedProviderInstance) {
    const config = {
      apiKey: process.env.ELEVENLABS_API_KEY || '',
      baseUrl: process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io/v1',
      timeout: 120000,
      retryCount: 3
    };
    
    elevenLabsCachedProviderInstance = new ElevenLabsCachedProvider(config);
  }
  
  return elevenLabsCachedProviderInstance;
}