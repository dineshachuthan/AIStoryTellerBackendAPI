/**
 * Voice Provider Factory - Follows Video Provider Pattern
 * Factory to get the appropriate voice module based on provider
 */

import { VoiceModule, VoiceTrainingRequest, VoiceTrainingResult } from './provider-manager';
import { ElevenLabsModule } from './elevenlabs-module';

export class VoiceProviderFactory {
  /**
   * Get voice module for specified provider
   */
  static async getModule(provider: string): Promise<VoiceModule> {
    switch (provider.toLowerCase()) {
      case 'elevenlabs':
        const { getActiveVoiceProvider, getVoiceProviderConfig } = await import('../voice-config');
        const config = getVoiceProviderConfig('elevenlabs');
        return new ElevenLabsModule(config);
      
      case 'kling-voice':
        // Future implementation - will follow same pattern
        throw new Error('Kling voice provider not yet implemented');
      
      default:
        throw new Error(`Unsupported voice provider: ${provider}`);
    }
  }

  /**
   * Train voice using active or specified provider
   */
  static async trainVoice(
    request: VoiceTrainingRequest,
    provider?: string
  ): Promise<VoiceTrainingResult> {
    const activeProvider = provider || this.getActiveProvider();
    const module = this.getModule(activeProvider);
    
    return module.trainVoice(request);
  }

  /**
   * Generate speech using active provider
   */
  static async generateSpeech(
    text: string, 
    voiceId: string, 
    emotion?: string,
    provider?: string
  ): Promise<ArrayBuffer> {
    const activeProvider = provider || this.getActiveProvider();
    const module = this.getModule(activeProvider);
    
    return module.generateSpeech(text, voiceId, emotion);
  }

  /**
   * Get voice status using active provider
   */
  static async getVoiceStatus(
    voiceId: string,
    provider?: string
  ): Promise<{ status: string; ready: boolean }> {
    const activeProvider = provider || this.getActiveProvider();
    const module = this.getModule(activeProvider);
    
    return module.getVoiceStatus(voiceId);
  }

  /**
   * Get active provider from configuration
   */
  static async getActiveProvider(): Promise<string> {
    try {
      const { getActiveVoiceProvider } = await import('../voice-config');
      return getActiveVoiceProvider();
    } catch (error) {
      console.error('[VoiceFactory] Failed to get active provider:', error);
      return 'elevenlabs'; // Default fallback
    }
  }

  /**
   * Get primary/active provider (first enabled provider)
   */
  static async getPrimaryProvider(): Promise<VoiceModule> {
    const activeProvider = await this.getActiveProvider();
    return this.getModule(activeProvider);
  }

  /**
   * Get available providers
   */
  static getAvailableProviders(): string[] {
    const { getVoiceConfig } = require('../voice-config');
    const config = getVoiceConfig();
    
    return Object.entries(config.providers)
      .filter(([_, providerInfo]) => (providerInfo as any).enabled)
      .map(([name, _]) => name);
  }

  /**
   * Check if provider is available
   */
  static isProviderAvailable(provider: string): boolean {
    try {
      this.getModule(provider);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Train voice using active provider
   */
  static async trainVoice(request: VoiceTrainingRequest): Promise<VoiceTrainingResult> {
    const activeProvider = this.getActiveProvider();
    const module = this.getModule(activeProvider);
    return await module.trainVoice(request);
  }

  /**
   * Generate speech using active provider
   */
  static async generateSpeech(text: string, voiceId: string, emotion?: string): Promise<ArrayBuffer> {
    const activeProvider = this.getActiveProvider();
    const module = this.getModule(activeProvider);
    return await module.generateSpeech(text, voiceId, emotion);
  }

  /**
   * Get voice status using active provider
   */
  static async getVoiceStatus(voiceId: string): Promise<{ status: string; ready: boolean }> {
    const activeProvider = this.getActiveProvider();
    const module = this.getModule(activeProvider);
    return await module.getVoiceStatus(voiceId);
  }
}