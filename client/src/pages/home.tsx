import React, { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Layout } from '@/components/layout';
import { ChallengeInterface } from '@/components/challenge/ChallengeInterface';
import { getTodayChallenge, getUserAttemptForChallenge } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [challenge, setChallenge] = useState(getTodayChallenge());
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user already submitted today's challenge
    if (challenge) {
      const attempt = getUserAttemptForChallenge(challenge.id);
      if (attempt) {
        setLocation(`/results/${challenge.dateKey}`);
      }
    }
    setLoading(false);
  }, [challenge, setLocation]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  if (!challenge) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-slate-900">No challenge for today yet.</h1>
          <p className="text-slate-500 mt-2">Please check back later.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <ChallengeInterface challenge={challenge} />
      </div>
    </Layout>
  );
}
