import React from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/layout';
import { SEO } from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function UpgradeCancel() {
  const [, setLocation] = useLocation();

  return (
    <>
      <SEO
        title="Checkout Cancelled | MoneyRank"
        description="Your checkout was cancelled"
        canonical="/upgrade/cancel"
      />
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center px-4">
          <Card className="max-w-md w-full border-2 border-slate-200">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-slate-600" />
                </div>
                <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">
                  Checkout Cancelled
                </h1>
                <p className="text-slate-600">
                  Your checkout was cancelled. No charges were made.
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                  onClick={() => setLocation('/upgrade')}
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation('/')}
                >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  );
}

