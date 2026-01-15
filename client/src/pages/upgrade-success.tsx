import React, { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Layout } from '@/components/layout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Crown, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function UpgradeSuccess() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    // Sync subscription status immediately from Stripe
    const syncSubscription = async () => {
      try {
        const response = await fetch('/api/stripe/sync-subscription', {
          method: 'POST',
          credentials: 'include',
        });
        
        if (response.ok) {
          // Invalidate user query to refresh subscription status
          await queryClient.invalidateQueries({ queryKey: ['auth-user'] });
        }
      } catch (error) {
        console.error('Error syncing subscription:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    syncSubscription();
  }, [queryClient]);

  return (
    <>
      <SEO
        title="Subscription Successful | MoneyRank"
        description="Your MoneyRank subscription is now active!"
        canonical="/upgrade/success"
      />
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center px-4">
          <Card className="max-w-md w-full border-2 border-emerald-200">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                {isSyncing ? (
                  <>
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                    </div>
                    <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">
                      Activating Your Subscription...
                    </h1>
                    <p className="text-slate-600">
                      Please wait while we activate your Pro subscription.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">
                      Welcome to Pro!
                    </h1>
                    <p className="text-slate-600">
                      Your subscription is now active. You have full access to all Pro features.
                    </p>
                  </>
                )}
              </div>

              {!isSyncing && (
                <div className="space-y-4">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setLocation('/profile')}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Go to Profile
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setLocation('/')}
                  >
                    Back to Home
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
}

