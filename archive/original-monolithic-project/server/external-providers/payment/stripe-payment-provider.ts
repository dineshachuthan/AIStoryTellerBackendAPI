/**
 * Stripe Payment Provider Implementation
 */

import Stripe from 'stripe';
import { 
  BasePaymentProvider, 
  CheckoutSessionData, 
  CheckoutSession,
  WebhookEvent,
  PaymentProviderConfig 
} from './base-payment-provider';

export class StripePaymentProvider extends BasePaymentProvider {
  private stripe: Stripe;

  constructor(config: PaymentProviderConfig) {
    super(config);
    
    if (!config.apiKey) {
      throw new Error('Stripe API key is required');
    }
    
    this.stripe = new Stripe(config.apiKey, {
      apiVersion: '2023-10-16',
    });
  }

  get name(): string {
    return 'stripe';
  }

  async createCheckoutSession(data: CheckoutSessionData): Promise<CheckoutSession> {
    try {
      const sessionData: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: data.priceId,
            quantity: 1,
          },
        ],
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        customer_email: data.customerEmail,
        metadata: data.metadata,
        subscription_data: {
          metadata: data.metadata,
        },
      };

      // If customer already exists, use their ID
      if (data.customerId) {
        sessionData.customer = data.customerId;
        delete sessionData.customer_email;
      }

      const session = await this.stripe.checkout.sessions.create(sessionData);

      return {
        id: session.id,
        url: session.url!,
        provider: this.name,
      };
    } catch (error: any) {
      console.error('[Stripe] Error creating checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  async handleWebhook(event: WebhookEvent): Promise<{
    type: string;
    customerId?: string;
    customerEmail?: string;
    subscriptionId?: string;
    status?: string;
  }> {
    const stripeEvent = event.data;

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        
        return {
          type: 'subscription.created',
          customerId: session.customer as string,
          customerEmail: session.customer_email || undefined,
          subscriptionId: session.subscription as string,
          status: 'active',
        };
      }

      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        
        return {
          type: 'subscription.updated',
          customerId: subscription.customer as string,
          subscriptionId: subscription.id,
          status: subscription.status,
        };
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        
        return {
          type: 'subscription.cancelled',
          customerId: subscription.customer as string,
          subscriptionId: subscription.id,
          status: 'cancelled',
        };
      }

      default:
        return {
          type: stripeEvent.type,
        };
    }
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.config.webhookSecret) {
      console.warn('[Stripe] Webhook secret not configured, skipping signature verification');
      return true;
    }

    try {
      this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );
      return true;
    } catch (error) {
      console.error('[Stripe] Webhook signature verification failed:', error);
      return false;
    }
  }

  async getStatus(): Promise<{
    name: string;
    available: boolean;
    message?: string;
  }> {
    try {
      // Try to list prices to verify API key is valid
      await this.stripe.prices.list({ limit: 1 });
      
      return {
        name: this.name,
        available: true,
      };
    } catch (error: any) {
      return {
        name: this.name,
        available: false,
        message: `Stripe connection failed: ${error.message}`,
      };
    }
  }
}