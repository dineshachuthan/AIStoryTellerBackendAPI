/**
 * Payment Provider Registry
 * Manages payment provider selection and health checks
 */

import { BasePaymentProvider, PaymentProviderConfig } from './base-payment-provider';
import { StripePaymentProvider } from './stripe-payment-provider';

export class PaymentProviderRegistry {
  private providers: Map<string, BasePaymentProvider> = new Map();
  private activeProvider: string | null = null;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Stripe if configured
    if (process.env.STRIPE_SECRET_KEY) {
      const stripeConfig: PaymentProviderConfig = {
        name: 'stripe',
        enabled: true,
        priority: 1,
        apiKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        publicKey: process.env.VITE_STRIPE_PUBLIC_KEY,
      };

      try {
        const stripeProvider = new StripePaymentProvider(stripeConfig);
        this.providers.set('stripe', stripeProvider);
        console.log('[PaymentRegistry] Initialized stripe provider');
      } catch (error) {
        console.error('[PaymentRegistry] Failed to initialize stripe provider:', error);
      }
    }

    // Future: Initialize PayPal provider
    // if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    //   const paypalConfig: PaymentProviderConfig = {
    //     name: 'paypal',
    //     enabled: true,
    //     priority: 2,
    //     apiKey: process.env.PAYPAL_CLIENT_SECRET,
    //     publicKey: process.env.PAYPAL_CLIENT_ID,
    //   };
    //   const paypalProvider = new PayPalPaymentProvider(paypalConfig);
    //   this.providers.set('paypal', paypalProvider);
    // }

    // Future: Initialize Paddle provider
    // if (process.env.PADDLE_VENDOR_ID && process.env.PADDLE_API_KEY) {
    //   const paddleConfig: PaymentProviderConfig = {
    //     name: 'paddle',
    //     enabled: true,
    //     priority: 3,
    //     apiKey: process.env.PADDLE_API_KEY,
    //     publicKey: process.env.PADDLE_VENDOR_ID,
    //   };
    //   const paddleProvider = new PaddlePaymentProvider(paddleConfig);
    //   this.providers.set('paddle', paddleProvider);
    // }

    // Select active provider based on priority
    this.selectActiveProvider();
  }

  private selectActiveProvider(): void {
    const enabledProviders = Array.from(this.providers.entries())
      .sort((a, b) => {
        const configA = a[1]['config'] as PaymentProviderConfig;
        const configB = b[1]['config'] as PaymentProviderConfig;
        return configA.priority - configB.priority;
      });

    if (enabledProviders.length > 0) {
      this.activeProvider = enabledProviders[0][0];
      console.log(`[PaymentRegistry] Active provider: ${this.activeProvider}`);
    } else {
      console.warn('[PaymentRegistry] No payment providers configured');
    }
  }

  getActiveProvider(): BasePaymentProvider | null {
    if (!this.activeProvider) {
      return null;
    }
    return this.providers.get(this.activeProvider) || null;
  }

  getProvider(name: string): BasePaymentProvider | null {
    return this.providers.get(name) || null;
  }

  getAllProviders(): BasePaymentProvider[] {
    return Array.from(this.providers.values());
  }

  async getProvidersStatus(): Promise<Array<{
    name: string;
    available: boolean;
    active: boolean;
    message?: string;
  }>> {
    const statuses = await Promise.all(
      Array.from(this.providers.entries()).map(async ([name, provider]) => {
        const status = await provider.getStatus();
        return {
          ...status,
          active: name === this.activeProvider,
        };
      })
    );

    return statuses;
  }

  getPublicConfig(): Record<string, any> {
    const config: Record<string, any> = {};
    
    this.providers.forEach((provider, name) => {
      const providerConfig = provider['config'] as PaymentProviderConfig;
      if (providerConfig.publicKey) {
        config[name] = {
          publicKey: providerConfig.publicKey,
          active: name === this.activeProvider,
        };
      }
    });

    return config;
  }
}

export const paymentProviderRegistry = new PaymentProviderRegistry();