/**
 * Email Provider Registry
 * Manages all email providers with plug-and-play architecture
 */

import { BaseProviderFactory } from '../providers/base-provider';
import { BaseEmailProvider } from './base-email-provider';
import { IEmailProvider, EmailProviderConfig, EmailProviderConfiguration } from './email-provider-interface';
import { MailgunProvider } from './mailgun-provider';
import { SendGridProvider } from './sendgrid-provider';

export interface EmailProviderInfo {
  name: string;
  provider: string;
  enabled: boolean;
  priority: number;
  config: EmailProviderConfig;
}

/**
 * Get enabled email providers from environment configuration
 */
function getEnabledEmailProviders(): EmailProviderInfo[] {
  const providers: EmailProviderInfo[] = [];

  // SendGrid configuration
  if (process.env.SENDGRID_API_KEY) {
    providers.push({
      name: 'sendgrid',
      provider: 'sendgrid',
      enabled: true,
      priority: 1,
      config: {
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@storytelling.app',
        fromName: process.env.SENDGRID_FROM_NAME || 'Storytelling Platform',
        timeout: parseInt(process.env.SENDGRID_TIMEOUT || '30000'),
        retryCount: parseInt(process.env.SENDGRID_RETRY_COUNT || '3'),
      }
    });
  }

  // Mailgun configuration
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    providers.push({
      name: 'mailgun',
      provider: 'mailgun',
      enabled: true,
      priority: process.env.MAILGUN_PRIORITY ? parseInt(process.env.MAILGUN_PRIORITY) : 2,
      config: {
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
        baseUrl: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net/v3',
        region: process.env.MAILGUN_REGION || 'us',
        fromEmail: process.env.MAILGUN_FROM_EMAIL || 'noreply@storytelling.app',
        fromName: process.env.MAILGUN_FROM_NAME || 'Storytelling Platform',
        timeout: parseInt(process.env.MAILGUN_TIMEOUT || '30000'),
        retryCount: parseInt(process.env.MAILGUN_RETRY_COUNT || '3'),
      }
    });
  }

  // Sort by priority (lower number = higher priority)
  providers.sort((a, b) => a.priority - b.priority);

  return providers;
}

export class EmailProviderRegistry extends BaseProviderFactory<BaseEmailProvider, EmailProviderConfig> {
  private static instance: EmailProviderRegistry;
  private smsProvider?: BaseEmailProvider;

  private constructor() {
    super();
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EmailProviderRegistry {
    if (!EmailProviderRegistry.instance) {
      EmailProviderRegistry.instance = new EmailProviderRegistry();
    }
    return EmailProviderRegistry.instance;
  }

  /**
   * Initialize all configured providers
   */
  initialize(): void {
    const enabledProviders = getEnabledEmailProviders();
    
    for (const providerInfo of enabledProviders) {
      try {
        let provider: BaseEmailProvider;
        
        switch (providerInfo.name.toLowerCase()) {
          case 'sendgrid':
            provider = new SendGridProvider(providerInfo.config);
            break;
          case 'mailgun':
            provider = new MailgunProvider(providerInfo.config);
            break;
          default:
            console.warn(`Unknown email provider: ${providerInfo.name}`);
            continue;
        }
        
        // Initialize the provider
        provider.initialize(providerInfo.config).then(() => {
          console.log(`Email provider ${providerInfo.name} initialized successfully`);
          
          // Check if provider supports SMS and set as SMS provider if none set
          if (provider.capabilities.supportsSMS && !this.smsProvider) {
            this.smsProvider = provider;
            console.log(`SMS provider set to: ${providerInfo.name}`);
          }
        }).catch(error => {
          console.error(`Failed to initialize email provider ${providerInfo.name}:`, error);
        });
        
        this.providers.set(providerInfo.name.toLowerCase(), provider);
      } catch (error) {
        console.error(`Failed to create email provider ${providerInfo.name}:`, error);
      }
    }

    // Select active provider after all are registered
    this.selectActiveProvider();
  }

  /**
   * Get the SMS provider (if available)
   */
  getSMSProvider(): BaseEmailProvider | null {
    return this.smsProvider || null;
  }

  /**
   * Get provider for specific capability
   */
  async getProviderWithCapability(capability: keyof IEmailProvider['capabilities']): Promise<BaseEmailProvider | null> {
    // First check active provider
    const activeProvider = this.getActiveProvider();
    if (activeProvider && activeProvider.capabilities[capability]) {
      const status = await activeProvider.getStatus();
      if (status.healthy) {
        return activeProvider;
      }
    }

    // Check other providers
    for (const provider of this.providers.values()) {
      if (provider.capabilities[capability]) {
        const status = await provider.getStatus();
        if (status.healthy) {
          return provider;
        }
      }
    }

    return null;
  }

  /**
   * Get configuration for all providers
   */
  getConfiguration(): EmailProviderConfiguration {
    const providers: Record<string, any> = {};
    
    for (const [name, provider] of this.providers) {
      providers[name] = {
        enabled: true,
        priority: 0, // TODO: Get from provider config
        capabilities: provider.capabilities,
      };
    }

    return {
      activeProvider: this.activeProviderName || '',
      providers,
    };
  }

  /**
   * Set active provider by name
   */
  async setActiveProvider(name: string): Promise<boolean> {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      console.error(`Email provider ${name} not found`);
      return false;
    }

    const status = await provider.getStatus();
    if (!status.healthy) {
      console.error(`Email provider ${name} is not healthy`);
      return false;
    }

    this.activeProviderName = name.toLowerCase();
    console.log(`Active email provider set to: ${name}`);
    return true;
  }

  /**
   * Get provider health status
   */
  async getProviderHealth(): Promise<Record<string, any>> {
    const health: Record<string, any> = {};
    
    for (const [name, provider] of this.providers) {
      try {
        const status = await provider.getStatus();
        health[name] = {
          healthy: status.healthy,
          available: status.available,
          message: status.message,
          lastChecked: status.lastChecked,
          metrics: status.metrics,
        };
      } catch (error) {
        health[name] = {
          healthy: false,
          available: false,
          message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }

    return health;
  }
}

// Export singleton instance
export const emailProviderRegistry = EmailProviderRegistry.getInstance();