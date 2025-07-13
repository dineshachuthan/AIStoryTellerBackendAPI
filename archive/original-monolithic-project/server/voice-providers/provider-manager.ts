/**
 * Voice Provider Manager - Follows Video Provider Pattern
 * Manages voice provider registry and configuration
 */

export interface VoiceProviderConfig {
  apiKey: string;
  secretKey?: string;
  baseUrl: string;
  modelName: string;
  maxSamplesPerClone: number;
  maxSampleDurationMs: number;
  maxClonesPerUser: number;
  timeout: number;
  retryCount: number;
}

export interface VoiceProviderInfo {
  enabled: boolean;
  config: VoiceProviderConfig;
  priority: number;
}

export interface VoiceProviderConfiguration {
  activeProvider: string;
  providers: Record<string, VoiceProviderInfo>;
}

export interface VoiceTrainingRequest {
  userId: string;
  voiceProfileId: number;
  samples: Array<{
    emotion: string;
    audioUrl: string;
    isLocked: boolean;
  }>;
}

export interface VoiceTrainingResult {
  success: boolean;
  voiceId?: string;
  error?: string;
  samplesProcessed: number;
  metadata?: any;
}

export interface VoiceModule {
  trainVoice(request: VoiceTrainingRequest): Promise<VoiceTrainingResult>;
  generateSpeech(text: string, voiceId: string, emotion?: string): Promise<ArrayBuffer>;
  getVoiceStatus(voiceId: string): Promise<{ status: string; ready: boolean }>;
}

export class VoiceProviderRegistry {
  private static modules: Record<string, VoiceModule> = {};
  private static configuration: VoiceProviderConfiguration | null = null;

  static async initialize(config: VoiceProviderConfiguration) {
    this.configuration = config;
    
    // Initialize enabled providers only
    for (const [name, info] of Object.entries(config.providers)) {
      if (info.enabled) {
        try {
          const module = await this.createModule(name, info.config);
          this.modules[name] = module;
          console.log(`[VoiceRegistry] Initialized ${name} provider`);
        } catch (error) {
          console.error(`[VoiceRegistry] Failed to initialize ${name}:`, error);
        }
      } else {
        console.log(`[VoiceRegistry] ${name} provider disabled in configuration`);
      }
    }

    // Log active providers
    const activeProviders = Object.keys(this.modules);
    console.log(`[VoiceRegistry] Active providers: ${activeProviders.join(', ')}`);
  }

  private static async createModule(name: string, config: VoiceProviderConfig): Promise<VoiceModule> {
    switch (name) {
      case 'elevenlabs':
        const { ElevenLabsModule } = await import('./elevenlabs-module');
        return new ElevenLabsModule(config);
      
      case 'kling-voice':
        const { KlingVoiceModule } = await import('./kling-voice-module');
        return new KlingVoiceModule(config);
      
      default:
        throw new Error(`Unknown voice provider: ${name}`);
    }
  }

  static getModule(provider?: string): VoiceModule {
    const activeProvider = provider || this.getActiveProvider();
    const module = this.modules[activeProvider];
    
    if (!module) {
      throw new Error(`Voice provider ${activeProvider} is not available`);
    }
    
    return module;
  }

  static getActiveProvider(): string {
    if (!this.configuration) {
      throw new Error('Voice provider registry not initialized');
    }

    // Find highest priority enabled provider
    const enabledProviders = Object.entries(this.configuration.providers)
      .filter(([_, info]) => info.enabled && this.modules[_])
      .sort((a, b) => a[1].priority - b[1].priority);

    if (enabledProviders.length === 0) {
      throw new Error('No voice providers are available');
    }

    return enabledProviders[0][0];
  }

  static getAvailableProviders(): string[] {
    return Object.keys(this.modules);
  }

  static getProviderConfig(provider: string): VoiceProviderConfig {
    if (!this.configuration) {
      throw new Error('Voice provider registry not initialized');
    }

    const providerInfo = this.configuration.providers[provider];
    if (!providerInfo) {
      throw new Error(`Unknown voice provider: ${provider}`);
    }

    if (!providerInfo.enabled) {
      throw new Error(`Voice provider ${provider} is disabled`);
    }

    return providerInfo.config;
  }

  static isProviderAvailable(provider: string): boolean {
    return !!this.modules[provider];
  }
}