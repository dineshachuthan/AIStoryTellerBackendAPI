/**
 * SMS Provider Registry
 * Manages multiple SMS providers with automatic failover
 */

import { ISMSProvider, SMSMessage, SMSSendResult, SMSProviderConfig } from './sms-provider-interface';
import { TwilioSMSProvider } from './twilio-sms-provider';

export class SMSProviderRegistry {
  private providers: Map<string, ISMSProvider> = new Map();
  private providerOrder: string[] = [];
  private initialized = false;

  /**
   * Register a provider
   */
  registerProvider(name: string, provider: ISMSProvider): void {
    this.providers.set(name, provider);
    // Add to order if not already present
    if (!this.providerOrder.includes(name)) {
      this.providerOrder.push(name);
    }
  }

  /**
   * Initialize all registered providers
   */
  async initialize(): Promise<void> {
    // Auto-register Twilio if credentials are available
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      const twilioProvider = new TwilioSMSProvider({
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_PHONE_NUMBER,
        priority: 1
      });
      
      try {
        await twilioProvider.initialize({});
        this.registerProvider('twilio', twilioProvider);
        console.log('[SMSRegistry] Twilio provider registered');
      } catch (error) {
        console.error('[SMSRegistry] Failed to initialize Twilio provider:', error);
      }
    }

    // Sort providers by priority (lower number = higher priority)
    this.providerOrder.sort((a, b) => {
      const providerA = this.providers.get(a);
      const providerB = this.providers.get(b);
      const priorityA = (providerA as any).config?.priority || 100;
      const priorityB = (providerB as any).config?.priority || 100;
      return priorityA - priorityB;
    });

    this.initialized = true;
    console.log(`[SMSRegistry] Initialized with ${this.providers.size} provider(s)`);
  }

  /**
   * Get a specific provider
   */
  getProvider(name: string): ISMSProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all providers
   */
  getAllProviders(): ISMSProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get active (healthy) providers
   */
  async getActiveProviders(): Promise<ISMSProvider[]> {
    const activeProviders: ISMSProvider[] = [];
    
    for (const name of this.providerOrder) {
      const provider = this.providers.get(name);
      if (provider && await provider.isHealthy()) {
        activeProviders.push(provider);
      }
    }
    
    return activeProviders;
  }

  /**
   * Send SMS using the first available provider
   */
  async sendSMS(message: SMSMessage, preferredProvider?: string): Promise<SMSSendResult> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'SMS provider registry not initialized'
      };
    }

    // Try preferred provider first if specified
    if (preferredProvider) {
      const provider = this.providers.get(preferredProvider);
      if (provider && await provider.isHealthy()) {
        const result = await provider.sendSMS(message);
        if (result.success) {
          return result;
        }
      }
    }

    // Try all providers in order
    const errors: string[] = [];
    
    for (const name of this.providerOrder) {
      const provider = this.providers.get(name);
      if (!provider) continue;

      try {
        const isHealthy = await provider.isHealthy();
        if (!isHealthy) {
          errors.push(`${name}: Provider not healthy`);
          continue;
        }

        const result = await provider.sendSMS(message);
        if (result.success) {
          return result;
        } else {
          errors.push(`${name}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // All providers failed
    return {
      success: false,
      error: errors.length > 0 ? errors.join('; ') : 'No SMS providers configured'
    };
  }

  /**
   * Get the configured providers status
   */
  async getStatus(): Promise<{
    initialized: boolean;
    providers: Array<{
      name: string;
      status: any;
    }>;
  }> {
    const providerStatuses = [];
    
    for (const [name, provider] of this.providers) {
      try {
        const status = await provider.getStatus();
        providerStatuses.push({ name, status });
      } catch (error) {
        providerStatuses.push({
          name,
          status: {
            configured: false,
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }

    return {
      initialized: this.initialized,
      providers: providerStatuses
    };
  }
}

// Singleton instance
export const smsProviderRegistry = new SMSProviderRegistry();