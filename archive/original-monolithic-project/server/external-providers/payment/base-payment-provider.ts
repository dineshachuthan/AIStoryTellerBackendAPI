/**
 * Base Payment Provider Abstract Class
 * Defines the interface for all payment providers (Stripe, PayPal, Paddle, etc.)
 */

export interface CheckoutSessionData {
  priceId: string;
  customerId?: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  id: string;
  url: string;
  provider: string;
}

export interface WebhookEvent {
  type: string;
  data: any;
  signature?: string;
  rawBody?: string | Buffer;
}

export interface PaymentProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;
  apiKey: string;
  webhookSecret?: string;
  publicKey?: string;
}

export abstract class BasePaymentProvider {
  protected config: PaymentProviderConfig;

  constructor(config: PaymentProviderConfig) {
    this.config = config;
  }

  abstract get name(): string;
  
  /**
   * Create a checkout session for subscription
   */
  abstract createCheckoutSession(data: CheckoutSessionData): Promise<CheckoutSession>;
  
  /**
   * Handle webhook events from the payment provider
   */
  abstract handleWebhook(event: WebhookEvent): Promise<{
    type: string;
    customerId?: string;
    customerEmail?: string;
    subscriptionId?: string;
    status?: string;
  }>;
  
  /**
   * Verify webhook signature
   */
  abstract verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
  
  /**
   * Get provider status
   */
  abstract getStatus(): Promise<{
    name: string;
    available: boolean;
    message?: string;
  }>;
}