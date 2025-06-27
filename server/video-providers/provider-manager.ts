import { BaseVideoProvider, VideoGenerationRequest, VideoGenerationResult, ProviderConfig } from './base-provider';
import { RunwayMLProvider } from './runwayml-provider-new';
import { PikaLabsProvider } from './pika-labs-provider';
import { LumaAIProvider } from './luma-ai-provider';
import { KlingVideoProvider } from './kling-video-provider';

export interface VideoProviderConfiguration {
  activeProvider: string;
  providers: {
    [key: string]: {
      enabled: boolean;
      config: ProviderConfig;
      priority: number;
    };
  };
  fallbackOrder: string[];
  compatibility: {
    enforceMP4: boolean;
    enforceH264: boolean;
    maxFileSize: number; // in MB
  };
  duration: {
    default: number; // Default video duration in seconds
    minimum: number; // Minimum allowed duration
    maximum: number; // Maximum allowed duration per story
    allowUserOverride: boolean; // Allow users to specify custom duration within limits
  };
  roleplay?: {
    targetDurationSeconds: number; // Target duration for roleplay content generation
    maxDurationSeconds: number; // Maximum roleplay duration allowed
    videoGenerationSeconds: number; // Actual video generation duration (separate from roleplay content)
  };
}

export class VideoProviderManager {
  private providers: Map<string, BaseVideoProvider> = new Map();
  private configuration: VideoProviderConfiguration;

  constructor(config: VideoProviderConfiguration) {
    this.configuration = config;
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize only enabled providers
    Object.entries(this.configuration.providers).forEach(([name, providerConfig]) => {
      if (!providerConfig.enabled) {
        console.log(`Video provider ${name} disabled in configuration`);
        return;
      }

      let provider: BaseVideoProvider;
      
      switch (name) {
        case 'kling':
          try {
            provider = new KlingVideoProvider();
            this.providers.set(name, provider);
            console.log(`Kling provider initialized successfully`);
          } catch (error) {
            console.error(`Failed to initialize Kling provider:`, error);
          }
          break;
        case 'runwayml':
          console.log(`RunwayML provider skipped - disabled per configuration`);
          break;
        case 'pika-labs':
          console.log(`Pika Labs provider skipped - disabled per configuration`);
          break;
        case 'luma-ai':
          console.log(`Luma AI provider skipped - disabled per configuration`);
          break;
        default:
          console.warn(`Unknown video provider: ${name}`);
          return;
      }
    });

    console.log(`Initialized providers: ${Array.from(this.providers.keys()).join(', ')}`);
    console.log(`Active provider: ${this.configuration.activeProvider}`);
  }

  /**
   * Generate video using the active provider with fallback support
   */
  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const activeProvider = this.getActiveProvider();
    
    if (!activeProvider) {
      throw new Error('No active video provider configured');
    }

    // Enforce duration limits before generation
    const validatedRequest = this.validateDurationLimits(request);

    try {
      console.log(`Generating video using ${this.configuration.activeProvider} provider`);
      const result = await activeProvider.generateVideo(validatedRequest);
      
      // Ensure compatibility standards
      return this.ensureCompatibility(result);
      
    } catch (error) {
      console.error(`Primary provider ${this.configuration.activeProvider} failed:`, error);
      
      // Try fallback providers
      return this.tryFallbackProviders(validatedRequest, error as Error);
    }
  }

  /**
   * Try fallback providers in order of preference
   */
  private async tryFallbackProviders(request: VideoGenerationRequest, originalError: Error): Promise<VideoGenerationResult> {
    for (const providerName of this.configuration.fallbackOrder) {
      if (providerName === this.configuration.activeProvider) continue; // Skip the failed provider
      
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        console.log(`Attempting fallback with ${providerName} provider`);
        const result = await provider.generateVideo(request);
        return this.ensureCompatibility(result);
      } catch (error) {
        console.error(`Fallback provider ${providerName} also failed:`, error);
        continue;
      }
    }

    // All providers failed
    throw new Error(`All video providers failed. Original error: ${originalError.message}`);
  }

  /**
   * Check status of video generation
   */
  async checkStatus(jobId: string, providerName?: string): Promise<VideoGenerationResult> {
    const provider = providerName ? this.providers.get(providerName) : this.getActiveProvider();
    
    if (!provider) {
      throw new Error(`Provider ${providerName || this.configuration.activeProvider} not found`);
    }

    const result = await provider.checkStatus(jobId);
    return this.ensureCompatibility(result);
  }

  /**
   * Cancel video generation
   */
  async cancelGeneration(jobId: string, providerName?: string): Promise<boolean> {
    const provider = providerName ? this.providers.get(providerName) : this.getActiveProvider();
    
    if (!provider) {
      return false;
    }

    return await provider.cancelGeneration(jobId);
  }

  /**
   * Switch active provider
   */
  switchProvider(providerName: string): boolean {
    if (!this.providers.has(providerName)) {
      console.error(`Provider ${providerName} not available`);
      return false;
    }

    this.configuration.activeProvider = providerName;
    console.log(`Switched to video provider: ${providerName}`);
    return true;
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities(providerName?: string): any {
    const provider = providerName ? this.providers.get(providerName) : this.getActiveProvider();
    
    if (!provider) {
      return null;
    }

    return provider.getCapabilities();
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Estimate cost across providers
   */
  async estimateCosts(request: VideoGenerationRequest): Promise<{[provider: string]: number}> {
    const costs: {[provider: string]: number} = {};
    
    for (const [name, provider] of this.providers) {
      try {
        costs[name] = await provider.estimateCost(request);
      } catch (error) {
        costs[name] = -1; // Indicates estimation failed
      }
    }
    
    return costs;
  }

  /**
   * Validate all provider configurations
   */
  async validateAllProviders(): Promise<{[provider: string]: boolean}> {
    const results: {[provider: string]: boolean} = {};
    
    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.validateConfig();
      } catch (error) {
        results[name] = false;
      }
    }
    
    return results;
  }

  /**
   * Update provider configuration
   */
  updateConfiguration(newConfig: Partial<VideoProviderConfiguration>): void {
    this.configuration = { ...this.configuration, ...newConfig };
    
    // Re-initialize providers with new configuration
    this.providers.clear();
    this.initializeProviders();
  }

  /**
   * Get current configuration
   */
  getConfiguration(): VideoProviderConfiguration {
    return { ...this.configuration };
  }

  /**
   * Ensure video compatibility across all providers
   */
  private ensureCompatibility(result: VideoGenerationResult): VideoGenerationResult {
    // Enforce MP4 format for universal compatibility
    if (this.configuration.compatibility.enforceMP4 && result.metadata.format !== 'mp4') {
      console.warn(`Video format ${result.metadata.format} may not be compatible. Consider converting to MP4.`);
    }

    // Enforce H.264 codec for universal playback
    if (this.configuration.compatibility.enforceH264 && result.metadata.codec !== 'h264') {
      console.warn(`Video codec ${result.metadata.codec} may not be compatible. Consider converting to H.264.`);
    }

    // Check file size limits
    if (result.metadata.fileSize && result.metadata.fileSize > this.configuration.compatibility.maxFileSize * 1024 * 1024) {
      console.warn(`Video file size exceeds limit: ${result.metadata.fileSize} bytes`);
    }

    return result;
  }

  /**
   * Validate and enforce duration limits from configuration
   */
  private validateDurationLimits(request: VideoGenerationRequest): VideoGenerationRequest {
    const durationConfig = this.configuration.duration;
    let duration = request.duration || durationConfig.default;

    // Enforce minimum duration
    if (duration < durationConfig.minimum) {
      console.log(`Duration ${duration}s below minimum, setting to ${durationConfig.minimum}s`);
      duration = durationConfig.minimum;
    }

    // Enforce maximum duration
    if (duration > durationConfig.maximum) {
      console.log(`Duration ${duration}s exceeds maximum, capping at ${durationConfig.maximum}s`);
      duration = durationConfig.maximum;
    }

    return {
      ...request,
      duration: duration
    };
  }

  /**
   * Get duration configuration
   */
  getDurationLimits() {
    return this.configuration.duration;
  }

  private getActiveProvider(): BaseVideoProvider | undefined {
    return this.providers.get(this.configuration.activeProvider);
  }
}