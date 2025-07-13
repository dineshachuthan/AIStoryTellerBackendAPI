/**
 * ElevenLabs Provider - Compatibility Bridge
 * Provides compatibility for imports expecting ElevenLabsProvider class
 */

import { ElevenLabsModule } from './elevenlabs-module';
import { getVoiceProviderConfig } from '../voice-config';

/**
 * ElevenLabsProvider class that wraps ElevenLabsModule with default configuration
 */
export class ElevenLabsProvider {
  private module: ElevenLabsModule;

  constructor() {
    try {
      // Get ElevenLabs configuration from voice-config
      const config = getVoiceProviderConfig('elevenlabs');
      this.module = new ElevenLabsModule(config);
    } catch (error) {
      // If configuration is not available, create a minimal config
      console.warn('[ElevenLabsProvider] Using default configuration due to:', error);
      const defaultConfig = {
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        baseUrl: 'https://api.elevenlabs.io/v1',
        modelName: 'eleven_monolingual_v1',
        maxSamplesPerClone: 25,
        maxSampleDurationMs: 300000,
        maxClonesPerUser: 10,
        timeout: 120000,
        retryCount: 3
      };
      this.module = new ElevenLabsModule(defaultConfig);
    }
  }

  // Delegate all methods to the underlying module
  async trainVoice(request: any) {
    return this.module.trainVoice(request);
  }

  async generateSpeech(text: string, voiceId: string, emotion?: string) {
    return this.module.generateSpeech(text, voiceId, emotion);
  }

  async getVoiceStatus(voiceId: string) {
    return this.module.getVoiceStatus(voiceId);
  }
}

// Also export the original module class for flexibility
export { ElevenLabsModule };