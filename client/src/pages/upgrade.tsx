import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/layout';
import { SEO } from '@/components/SEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Loader2, ArrowRight } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCurrentUser, createCheckoutSession, type AuthUser } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export default function Upgrade() {
  const [, setLocation] = useLocation();
  const [selectedTier, setSelectedTier] = useState<'pro'>('pro');

  const { data: authData } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
  });

  const user = authData?.user;
  const isAuthenticated = user && user.authProvider !== 'anonymous';
  const currentTier = user?.subscriptionTier || 'free';
  const subscriptionExpiresAt = user?.subscriptionExpiresAt 
    ? new Date(user.subscriptionExpiresAt) 
    : null;
  const isActive = (currentTier === 'premium' || currentTier === 'pro') && 
                   (subscriptionExpiresAt === null || subscriptionExpiresAt > new Date());
  const hasUsedTrial = (user as any)?.hasUsedFreeTrial || false;

  const checkoutMutation = useMutation({
    mutationFn: ({ tier, useTrial }: { tier: 'pro'; useTrial: boolean }) => 
      createCheckoutSession(tier, useTrial),
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create checkout session',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start checkout',
        variant: 'destructive',
      });
    },
  });

  const handleUpgrade = (tier: 'pro', useTrial: boolean) => {
    if (!isAuthenticated) {
      toast({
        title: 'Quick signin/signup required',
        description: 'Please quick signin/signup to upgrade your subscription',
        variant: 'destructive',
      });
      setLocation('/profile');
      return;
    }

    if (isActive && currentTier === tier) {
      toast({
        title: 'Already subscribed',
        description: `You already have an active ${tier} subscription`,
      });
      return;
    }

    checkoutMutation.mutate({ tier, useTrial });
  };

  const pricingTiers = [
    {
      name: 'Free',
      tier: 'free' as const,
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out MoneyRank',
      features: [
        'Play today\'s challenge',
        'Access to yesterday\'s challenge',
        'View your scores and streaks',
        'Basic profile stats',
      ],
      cta: 'Current Plan',
      disabled: true,
    },
    {
      name: 'Pro',
      tier: 'pro' as const,
      price: '$6.99',
      period: 'month',
      description: 'Full access to all features and community',
      popular: true,
      features: [
        'Everything in Free',
        'Unlimited archive access',
        'Full forum access & comments',
        'Detailed optimality explanations',
        'Financial health score',
        'Risk profile insights',
        'Category performance analytics',
        'Goal tracking',
        'All Pro features unlocked',
      ],
      cta: currentTier === 'pro' && isActive ? 'Current Plan' : 'Upgrade to Pro',
      disabled: currentTier === 'pro' && isActive,
    },
  ];

  return (
    <>
      <SEO
        title="Upgrade to Pro | MoneyRank"
        description="Unlock premium features with MoneyRank Pro. Get unlimited archive access, detailed insights, and join the community."
        ogTitle="Upgrade to MoneyRank Pro"
        canonical="/upgrade"
      />
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 py-12 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4">
                Choose Your Plan
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Unlock premium features and take your financial decision-making to the next level
              </p>
            </div>

            {/* Current Subscription Status */}
            {isAuthenticated && isActive && (
              <div className="mb-8 max-w-2xl mx-auto">
                <Card className="border-2 border-emerald-200 bg-emerald-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="w-5 h-5 text-emerald-600" />
                          <span className="font-semibold text-slate-900">
                            Active {currentTier === 'pro' ? 'Pro' : 'Premium'} Subscription
                          </span>
                        </div>
                        {subscriptionExpiresAt && (
                          <p className="text-sm text-slate-600">
                            Renews on {subscriptionExpiresAt.toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setLocation('/profile')}
                      >
                        Manage Subscription
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
              {pricingTiers.map((tier) => (
                <Card
                  key={tier.tier}
                  className={`relative ${
                    tier.popular
                      ? 'border-2 border-amber-400 shadow-lg scale-105'
                      : 'border border-slate-200'
                  } ${tier.disabled ? 'opacity-75' : ''}`}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-amber-500 text-white px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-slate-900">{tier.price}</span>
                      {tier.period !== 'forever' && (
                        <span className="text-slate-600 ml-2">/{tier.period}</span>
                      )}
                    </div>
                    <CardDescription className="mt-2">{tier.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {tier.tier === 'pro' && !tier.disabled ? (
                      <div className="space-y-2">
                        {!hasUsedTrial && (
                          <Button
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                            disabled={checkoutMutation.isPending}
                            onClick={() => {
                              setSelectedTier('pro');
                              handleUpgrade('pro', true); // true = use trial
                            }}
                          >
                            {checkoutMutation.isPending && selectedTier === 'pro' ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                Start 7-Day Free Trial
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant={hasUsedTrial ? "default" : "outline"}
                          className={`w-full ${
                            hasUsedTrial 
                              ? 'bg-slate-900 hover:bg-slate-800 text-white' 
                              : 'border-amber-600 text-amber-600 hover:bg-amber-50'
                          }`}
                          disabled={checkoutMutation.isPending}
                          onClick={() => {
                            setSelectedTier('pro');
                            handleUpgrade('pro', false); // false = no trial
                          }}
                        >
                          {checkoutMutation.isPending && selectedTier === 'pro' ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              {hasUsedTrial ? 'Upgrade to Pro' : 'Upgrade Now (Skip Trial)'}
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                        {!hasUsedTrial && (
                          <p className="text-xs text-center text-slate-500 mt-2">
                            Try free for 7 days, then ${tier.price.replace('$', '')}/{tier.period}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Button
                        className={`w-full ${
                          tier.popular
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                        disabled={tier.disabled || checkoutMutation.isPending}
                        onClick={() => !tier.disabled && handleUpgrade(tier.tier, false)}
                      >
                        {checkoutMutation.isPending && selectedTier === tier.tier ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : tier.disabled ? (
                          tier.cta
                        ) : (
                          <>
                            {tier.cta}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* FAQ Section */}
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 text-center">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">
                      Yes! You can cancel your subscription at any time from your profile page. 
                      You'll continue to have access until the end of your billing period.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">
                      We accept all major credit cards through Stripe's secure payment processing.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Will my data be safe?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">
                      Absolutely. We use industry-standard encryption and never store your payment information. 
                      All payments are processed securely through Stripe.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

