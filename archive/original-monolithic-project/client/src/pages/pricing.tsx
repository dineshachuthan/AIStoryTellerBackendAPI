import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { SubscriptionButton } from '@/components/subscription-button';
import { getMessage } from '@shared/utils/i18n-hierarchical';

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Get started with basic features',
    features: [
      '5 stories per month',
      'Basic voice narration',
      'Standard quality',
      'Community support'
    ],
    priceId: null
  },
  {
    name: 'Silver',
    price: '$9.99',
    description: 'Perfect for content creators',
    features: [
      '50 stories per month',
      'Advanced voice cloning',
      'HD quality narration',
      'Priority support',
      'Custom voice profiles'
    ],
    priceId: 'price_silver',
    recommended: true
  },
  {
    name: 'Gold',
    price: '$19.99',
    description: 'For professional storytellers',
    features: [
      'Unlimited stories',
      'Premium voice cloning',
      '4K quality narration',
      'API access',
      'Dedicated support',
      'Team collaboration'
    ],
    priceId: 'price_gold'
  }
];

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Unlock the full potential of AI-powered storytelling
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card 
            key={plan.name} 
            className={`relative ${plan.recommended ? 'border-primary shadow-lg' : ''}`}
          >
            {plan.recommended && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                  Recommended
                </span>
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-primary mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter>
              {plan.priceId ? (
                <SubscriptionButton 
                  priceId={plan.priceId}
                  buttonText={`Choose ${plan.name}`}
                  className="w-full"
                />
              ) : (
                <button 
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-md transition-colors"
                  disabled
                >
                  Current Plan
                </button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center text-muted-foreground">
        <p>All plans include SSL security, automatic backups, and 24/7 monitoring</p>
        <p className="mt-2">Cancel anytime. No hidden fees.</p>
      </div>
    </div>
  );
}