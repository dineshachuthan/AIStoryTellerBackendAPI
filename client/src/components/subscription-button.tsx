import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/lib/toast-utils';
import { toastMessages } from '@/lib/toast-utils';
import { Loader2, CreditCard } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { getMessage } from '@shared/utils/i18n-hierarchical';

interface SubscriptionButtonProps {
  priceId: string;
  buttonText?: string;
  className?: string;
}

export function SubscriptionButton({ priceId, buttonText, className }: SubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Get payment provider configuration
  const { data: paymentConfig } = useQuery({
    queryKey: ['/api/payment/config'],
    queryFn: () => apiClient.payment.getConfig(),
  });

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: (data: { priceId: string }) => 
      apiClient.payment.createCheckoutSession(data),
    onSuccess: async (data) => {
      if (data.provider === 'stripe' && data.sessionId) {
        // Redirect to Stripe checkout
        const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
        if (!stripePublicKey) {
          toast.error(getMessage('subscription.stripe.not_configured'));
          return;
        }

        const stripe = await loadStripe(stripePublicKey);
        if (!stripe) {
          toast.error(getMessage('subscription.stripe.load_failed'));
          return;
        }

        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });

        if (error) {
          toast.error(getMessage('subscription.checkout.failed', { error: error.message }));
        }
      } else if (data.provider === 'paypal' && data.checkoutUrl) {
        // Redirect to PayPal checkout
        window.location.href = data.checkoutUrl;
      } else if (data.provider === 'paddle' && data.checkoutUrl) {
        // Redirect to Paddle checkout
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast.error(toastMessages.subscriptionFailed(error.message));
      setIsLoading(false);
    },
  });

  const handleSubscribe = async () => {
    if (!paymentConfig || !paymentConfig.activeProvider) {
      toast.error(getMessage('subscription.no_provider'));
      return;
    }

    setIsLoading(true);
    createCheckoutMutation.mutate({ priceId });
  };

  const isDisabled = isLoading || createCheckoutMutation.isPending || !paymentConfig?.activeProvider;

  return (
    <Button
      onClick={handleSubscribe}
      disabled={isDisabled}
      className={className}
    >
      {isLoading || createCheckoutMutation.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {getMessage('subscription.processing')}
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          {buttonText || getMessage('subscription.subscribe')}
        </>
      )}
    </Button>
  );
}