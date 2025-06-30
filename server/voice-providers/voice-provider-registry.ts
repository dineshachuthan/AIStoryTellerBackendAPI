/**
 * Voice Provider Registry
 * Manages all voice providers with plug-and-play architecture
 */

import { BaseVoiceProvider, VoiceCloneRequest, VoiceGenerationRequest, AudioResult, VoiceCloneResult } from './base-voice-provider';
import { ElevenLabsProvider } from './elevenlabs-provider';
import { OpenAIProvider } from './openai-provider';
import { VOICE_PROVIDERS, getEnabledVoiceProviders, getPrimaryVoiceProvider } from '@shared/voice-config';

export interface VoiceProviderHealth {
  provider: string;
  isAvailable: boolean;
  isHealthy: boolean;
  error?: string;
}

export class VoiceProviderRegistry {
  private providers: Map<string, BaseVoiceProvider> = new Map();
  private healthStatus: Map<string, VoiceProviderHealth> = new Map();
  private lastHealthCheck: Date = new Date(0);
  private healthCheckInterval: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize all enabled providers from configuration
   */
  private initializeProviders(): void {
    const enabledProviders = getEnabledVoiceProviders();
    
    for (const config of enabledProviders) {
      try {
        let provider: BaseVoiceProvider;
        
        switch (config.name.toLowerCase()) {
          case 'elevenlabs':
            provider = new ElevenLabsProvider(config);
            break;
          case 'openai':
            provider = new OpenAIProvider(config);
            break;
          default:
            console.warn(`Unknown voice provider: ${config.name}`);
            continue;
        }
        
        this.providers.set(config.name.toLowerCase(), provider);
        console.log(`Voice provider ${config.name} initialized successfully`);
      } catch (error) {
        console.error(`Failed to initialize voice provider ${config.name}:`, error);
      }
    }
  }

  /**
   * Get the primary voice provider for voice cloning
   */
  async getPrimaryProvider(): Promise<BaseVoiceProvider | null> {
    await this.ensureHealthCheck();
    
    const primaryConfig = getPrimaryVoiceProvider();
    if (!primaryConfig) return null;
    
    const provider = this.providers.get(primaryConfig.name.toLowerCase());
    if (!provider) return null;
    
    const health = this.healthStatus.get(primaryConfig.name.toLowerCase());
    if (health && health.isAvailable && health.isHealthy) {
      return provider;
    }
    
    return null;
  }

  /**
   * Get the best available provider for voice generation
   */
  async getBestProviderForGeneration(requireVoiceCloning: boolean = false): Promise<BaseVoiceProvider | null> {
    await this.ensureHealthCheck();
    
    const enabledProviders = getEnabledVoiceProviders();
    
    for (const config of enabledProviders) {
      const provider = this.providers.get(config.name.toLowerCase());
      const health = this.healthStatus.get(config.name.toLowerCase());
      
      if (!provider || !health || !health.isAvailable || !health.isHealthy) {
        continue;
      }
      
      // If voice cloning is required, check capability
      if (requireVoiceCloning && !provider.getCapabilities().voiceCloning) {
        continue;
      }
      
      return provider;
    }
    
    return null;
  }



  /**
   * Clone voice using the best available provider
   */
  async cloneVoice(request: VoiceCloneRequest): Promise<VoiceCloneResult> {
    const provider = await this.getBestProviderForGeneration(true);
    
    if (!provider) {
      throw new Error('No voice cloning provider available');
    }
    
    if (!provider.getCapabilities().voiceCloning) {
      throw new Error('Selected provider does not support voice cloning');
    }
    
    try {
      return await provider.cloneVoice(request);
    } catch (error) {
      console.error('Voice cloning failed:', error);
      throw error;
    }
  }

  /**
   * Generate speech with configured provider only
   */
  async generateSpeech(request: VoiceGenerationRequest): Promise<AudioResult> {
    const provider = await this.getBestProviderForGeneration(false);
    if (!provider) {
      throw new Error('No voice generation provider available');
    }
    
    return await provider.generateSpeech(request);
  }

  /**
   * Get health status of all providers
   */
  async getProviderHealth(): Promise<VoiceProviderHealth[]> {
    await this.ensureHealthCheck();
    return Array.from(this.healthStatus.values());
  }

  /**
   * Force health check of all providers
   */
  async checkProvidersHealth(): Promise<void> {
    const healthPromises = Array.from(this.providers.entries()).map(async ([name, provider]) => {
      try {
        const status = await provider.checkHealth();
        this.healthStatus.set(name, {
          provider: name,
          isAvailable: status.isAvailable,
          isHealthy: status.isHealthy,
          error: status.error
        });
      } catch (error) {
        this.healthStatus.set(name, {
          provider: name,
          isAvailable: false,
          isHealthy: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    await Promise.all(healthPromises);
    this.lastHealthCheck = new Date();
  }

  /**
   * Ensure health check is recent
   */
  private async ensureHealthCheck(): Promise<void> {
    const now = new Date();
    if (now.getTime() - this.lastHealthCheck.getTime() > this.healthCheckInterval) {
      await this.checkProvidersHealth();
    }
  }

  /**
   * Check if voice ID is a standard OpenAI voice
   */
  private isStandardVoice(voiceId: string): boolean {
    const standardVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    return standardVoices.includes(voiceId.toLowerCase());
  }

  /**
   * Get available providers summary
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): BaseVoiceProvider | null {
    return this.providers.get(name.toLowerCase()) || null;
  }
}

// Singleton instance
export const voiceProviderRegistry = new VoiceProviderRegistry();