/**
 * Subscription Routes
 * Handles payment provider checkout sessions and webhooks
 */

import type { Express, Request, Response } from 'express';
import { paymentProviderRegistry } from './external-providers/payment/payment-provider-registry';
import { requireAuth } from './auth';
import { storage } from './storage';
import { z } from 'zod';

// Request validation schemas
const createCheckoutSessionSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
});

export function registerSubscriptionRoutes(app: Express) {
  // Get payment provider configuration for frontend
  app.get('/api/payment/config', (req: Request, res: Response) => {
    const config = paymentProviderRegistry.getPublicConfig();
    res.json(config);
  });

  // Get payment providers status
  app.get('/api/payment/status', requireAuth, async (req: Request, res: Response) => {
    try {
      const statuses = await paymentProviderRegistry.getProvidersStatus();
      res.json(statuses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create checkout session
  app.post('/api/create-checkout-session', requireAuth, async (req: Request, res: Response) => {
    try {
      const provider = paymentProviderRegistry.getActiveProvider();
      if (!provider) {
        return res.status(503).json({ 
          message: 'No payment provider available. Please configure Stripe, PayPal, or Paddle.' 
        });
      }

      // Validate request body
      const validatedData = createCheckoutSessionSchema.parse(req.body);
      
      // Get user from session
      const user = req.user as any;
      if (!user || !user.email) {
        return res.status(400).json({ message: 'User email not found' });
      }

      // Get full user data from storage
      const fullUser = await storage.getUser(user.id);
      if (!fullUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prepare checkout session data
      const origin = `${req.protocol}://${req.get('host')}`;
      const checkoutData = {
        priceId: validatedData.priceId,
        customerId: fullUser.stripeCustomerId,
        customerEmail: fullUser.email!,
        successUrl: validatedData.successUrl || `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: validatedData.cancelUrl || `${origin}/subscription/cancel`,
        metadata: {
          userId: user.id,
        },
      };

      // Create checkout session
      const session = await provider.createCheckoutSession(checkoutData);
      
      res.json(session);
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe webhook handler
  app.post('/api/webhook/stripe', async (req: Request, res: Response) => {
    const provider = paymentProviderRegistry.getProvider('stripe');
    if (!provider) {
      return res.status(404).json({ message: 'Stripe provider not configured' });
    }

    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      return res.status(400).json({ message: 'Missing stripe signature' });
    }

    try {
      // Verify webhook signature
      const rawBody = req.body.toString();
      if (!provider.verifyWebhookSignature(rawBody, signature)) {
        return res.status(400).json({ message: 'Invalid signature' });
      }

      // Parse the event
      const event = JSON.parse(rawBody);
      
      // Handle the webhook
      const result = await provider.handleWebhook({ 
        type: event.type, 
        data: event,
        signature,
        rawBody 
      });

      // Process the result based on event type
      switch (result.type) {
        case 'subscription.created':
          console.log('[Webhook] Subscription created:', {
            customerId: result.customerId,
            customerEmail: result.customerEmail,
            subscriptionId: result.subscriptionId,
          });
          
          // Update user with stripe customer ID and subscription ID
          if (result.customerEmail) {
            const user = await storage.getUserByEmail(result.customerEmail);
            if (user) {
              await storage.updateUser(user.id, {
                stripeCustomerId: result.customerId,
                stripeSubscriptionId: result.subscriptionId,
                subscriptionStatus: result.status,
              });
            }
          }
          break;

        case 'subscription.updated':
        case 'subscription.cancelled':
          console.log(`[Webhook] Subscription ${result.type}:`, {
            customerId: result.customerId,
            subscriptionId: result.subscriptionId,
            status: result.status,
          });
          
          // Update subscription status
          if (result.customerId) {
            const user = await storage.getUserByStripeCustomerId(result.customerId);
            if (user) {
              await storage.updateUser(user.id, {
                subscriptionStatus: result.status,
              });
            }
          }
          break;
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('[Webhook] Error processing webhook:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Generic webhook handler for other providers (future)
  app.post('/api/webhook/:provider', async (req: Request, res: Response) => {
    const providerName = req.params.provider;
    const provider = paymentProviderRegistry.getProvider(providerName);
    
    if (!provider) {
      return res.status(404).json({ message: `${providerName} provider not configured` });
    }

    // Provider-specific webhook handling would go here
    res.json({ received: true });
  });
}