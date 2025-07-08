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
        const { getVoiceProviderConfig } = await import('../voice-config');
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
   * Get active provider from configuration
   */
  static async getActiveProvider(): Promise<string> {
    try {
      const { getActiveVoiceProvider } = await import('../voice-config');
      return getActiveVoiceProvider();
    } catch (error) {
      console.error('[VoiceFactory] Failed to get active provider:', error);
      throw new Error('No voice providers available - check configuration and API keys');
    }
  }

  /**
   * Train voice using active or specified provider
   */
  static async trainVoice(
    request: VoiceTrainingRequest,
    provider?: string
  ): Promise<VoiceTrainingResult> {
    const activeProvider = provider || await this.getActiveProvider();
    const module = await this.getModule(activeProvider);
    
    return await module.trainVoice(request);
  }

  /**
   * Generate speech using active provider
   */
  static async generateSpeech(
    text: string, 
    voiceId: string, 
    emotion?: string,
    provider?: string,
    narratorProfile?: any
  ): Promise<ArrayBuffer> {
    const activeProvider = provider || await this.getActiveProvider();
    const module = await this.getModule(activeProvider);
    
    return await module.generateSpeech(text, voiceId, emotion, narratorProfile);
  }

  /**
   * Get voice status using active provider
   */
  static async getVoiceStatus(
    voiceId: string,
    provider?: string
  ): Promise<{ status: string; ready: boolean }> {
    const activeProvider = provider || await this.getActiveProvider();
    const module = await this.getModule(activeProvider);
    
    return await module.getVoiceStatus(voiceId);
  }

  /**
   * Get available providers
   */
  static async getAvailableProviders(): Promise<string[]> {
    const { getVoiceConfig } = await import('../voice-config');
    const config = getVoiceConfig();
    
    return Object.entries(config.providers)
      .filter(([_, providerInfo]) => (providerInfo as any).enabled)
      .map(([name, _]) => name);
  }

  /**
   * Check if provider is available
   */
  static async isProviderAvailable(provider: string): Promise<boolean> {
    try {
      await this.getModule(provider);
      return true;
    } catch {
      return false;
    }
  }
}