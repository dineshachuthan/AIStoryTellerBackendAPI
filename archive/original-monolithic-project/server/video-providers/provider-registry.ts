import { IVideoProvider, VideoProviderConfig } from './video-provider-interface';
import { KlingVideoProvider } from './kling-video-provider';
import { RunwayMLVideoProvider } from './runwayml-video-provider';

/**
 * Registry for all available video providers
 * Handles provider registration, configuration, and lifecycle
 */
export class VideoProviderRegistry {
  private static instance: VideoProviderRegistry;
  private providers: Map<string, IVideoProvider> = new Map();
  private configurations: Map<string, VideoProviderConfig> = new Map();
  private enabledProviders: Set<string> = new Set();
  private activeProvider: string | null = null;

  private constructor() {
    this.registerBuiltInProviders();
  }

  static getInstance(): VideoProviderRegistry {
    if (!VideoProviderRegistry.instance) {
      VideoProviderRegistry.instance = new VideoProviderRegistry();
    }
    return VideoProviderRegistry.instance;
  }

  /**
   * Register built-in providers
   */
  private registerBuiltInProviders(): void {
    this.registerProvider('kling', KlingVideoProvider);
    this.registerProvider('runwayml', RunwayMLVideoProvider);
  }

  /**
   * Register a video provider
   */
  registerProvider(name: string, ProviderClass: new () => IVideoProvider): void {
    try {
      const provider = new ProviderClass();
      this.providers.set(name, provider);
      console.log(`Registered video provider: ${name}`);
    } catch (error) {
      console.error(`Failed to register provider ${name}:`, error);
    }
  }

  /**
   * Configure and enable a provider
   */
  async configureProvider(name: string, config: VideoProviderConfig): Promise<boolean> {
    const provider = this.providers.get(name);
    if (!provider) {
      console.error(`Provider ${name} not found`);
      return false;
    }

    try {
      await provider.initialize(config);
      
      // Test provider health
      const isHealthy = await provider.isHealthy();
      if (!isHealthy) {
        console.warn(`Provider ${name} failed health check`);
        return false;
      }

      this.configurations.set(name, config);
      this.enabledProviders.add(name);
      
      // Set as active if no active provider
      if (!this.activeProvider) {
        this.activeProvider = name;
      }

      console.log(`Provider ${name} configured and enabled successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to configure provider ${name}:`, error);
      return false;
    }
  }

  /**
   * Disable a provider
   */
  disableProvider(name: string): void {
    this.enabledProviders.delete(name);
    
    // Switch active provider if this was active
    if (this.activeProvider === name) {
      this.activeProvider = this.getNextAvailableProvider();
    }
    
    console.log(`Provider ${name} disabled`);
  }

  /**
   * Set active provider
   */
  setActiveProvider(name: string): boolean {
    if (!this.enabledProviders.has(name)) {
      console.error(`Cannot set ${name} as active - provider not enabled`);
      return false;
    }

    this.activeProvider = name;
    console.log(`Active provider set to: ${name}`);
    return true;
  }

  /**
   * Get active provider instance
   */
  getActiveProvider(): IVideoProvider | null {
    if (!this.activeProvider) {
      return null;
    }
    return this.providers.get(this.activeProvider) || null;
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): IVideoProvider | null {
    if (!this.enabledProviders.has(name)) {
      return null;
    }
    return this.providers.get(name) || null;
  }

  /**
   * Get all enabled providers
   */
  getEnabledProviders(): string[] {
    return Array.from(this.enabledProviders);
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities(name: string): any {
    const provider = this.providers.get(name);
    return provider?.capabilities || null;
  }

  /**
   * Get provider status
   */
  async getProviderStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const [name, provider] of this.providers) {
      const isEnabled = this.enabledProviders.has(name);
      const isActive = this.activeProvider === name;
      const hasConfig = this.configurations.has(name);
      
      let isHealthy = false;
      if (isEnabled) {
        try {
          isHealthy = await provider.isHealthy();
        } catch (error) {
          isHealthy = false;
        }
      }

      status[name] = {
        enabled: isEnabled,
        active: isActive,
        configured: hasConfig,
        healthy: isHealthy,
        capabilities: provider.capabilities
      };
    }

    return status;
  }

  /**
   * Auto-configure providers from environment
   */
  async autoConfigureFromEnvironment(): Promise<void> {
    console.log('Auto-configuring video providers from environment...');

    // Kling configuration
    if (process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY) {
      console.log('=== CONFIGURING KLING PROVIDER FROM ENVIRONMENT ===');
      console.log('KLING_ACCESS_KEY present:', !!process.env.KLING_ACCESS_KEY);
      console.log('KLING_SECRET_KEY present:', !!process.env.KLING_SECRET_KEY);
      console.log('KLING_ACCESS_KEY preview:', process.env.KLING_ACCESS_KEY?.substring(0, 8) + '...');
      
      await this.configureProvider('kling', {
        apiKey: process.env.KLING_ACCESS_KEY,
        secretKey: process.env.KLING_SECRET_KEY,
        baseUrl: 'https://api-singapore.klingai.com',
        timeout: 120000,
        retryCount: 2,
        maxDuration: 20,
        defaultQuality: 'std'
      });
      
      console.log('Kling provider configuration completed');
    } else {
      console.log('Kling environment variables missing:', {
        hasAccessKey: !!process.env.KLING_ACCESS_KEY,
        hasSecretKey: !!process.env.KLING_SECRET_KEY
      });
    }

    // RunwayML configuration
    if (process.env.RUNWAYML_API_KEY) {
      await this.configureProvider('runwayml', {
        apiKey: process.env.RUNWAYML_API_KEY,
        baseUrl: 'https://api.runway.team/v1',
        timeout: 60000,
        retryCount: 2,
        maxDuration: 20,
        defaultQuality: 'standard'
      });
    }

    // Set active provider from environment
    if (process.env.ACTIVE_VIDEO_PROVIDER) {
      this.setActiveProvider(process.env.ACTIVE_VIDEO_PROVIDER);
    }

    const enabledCount = this.enabledProviders.size;
    console.log(`Auto-configuration complete. ${enabledCount} providers enabled.`);
    
    if (enabledCount === 0) {
      console.warn('No video providers are configured. Please set up API keys.');
    }
  }

  /**
   * Get next available provider for fallback
   */
  private getNextAvailableProvider(): string | null {
    const providers = Array.from(this.enabledProviders);
    return providers.length > 0 ? providers[0] : null;
  }

  /**
   * Get configuration for environment-based setup
   */
  static getEnvironmentConfig(): Record<string, any> {
    return {
      kling: {
        enabled: !!(process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY),
        hasApiKey: !!process.env.KLING_ACCESS_KEY,
        hasSecretKey: !!process.env.KLING_SECRET_KEY
      },
      runwayml: {
        enabled: !!process.env.RUNWAYML_API_KEY,
        hasApiKey: !!process.env.RUNWAYML_API_KEY
      },
      activeProvider: process.env.ACTIVE_VIDEO_PROVIDER || 'auto'
    };
  }
}