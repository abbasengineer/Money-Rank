import React, { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Layout } from '@/components/layout';
import { ChallengeInterface } from '@/components/challenge/ChallengeInterface';
import { getTodayChallenge, getChallengeByDateKey } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Calendar } from 'lucide-react';

export default function Home() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/challenge/:dateKey');
  
  // If we're on /challenge/:dateKey route, use that dateKey, otherwise get today's challenge
  const dateKey = params?.dateKey;
  const isSpecificChallenge = !!dateKey;
  
  const { data, isLoading, error } = useQuery({
    queryKey: isSpecificChallenge ? ['challenge', dateKey] : ['today-challenge'],
    queryFn: async () => {
      if (isSpecificChallenge && dateKey) {
        return await getChallengeByDateKey(dateKey);
      }
      return await getTodayChallenge();
    },
    enabled: !isSpecificChallenge || !!dateKey,
  });

  useEffect(() => {
    // Only auto-redirect to results if it's today's challenge and user has attempted
    // For specific date challenges, let the user see the challenge even if they've attempted
    if (!isSpecificChallenge && data?.hasAttempted && data?.attempt && data?.challenge) {
      setLocation(`/results/${data.challenge.dateKey}`);
    }
  }, [data, setLocation, isSpecificChallenge]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-slate-900">Error loading challenge</h1>
          <p className="text-slate-500 mt-2">Please try again later.</p>
        </div>
      </Layout>
    );
  }

  if (!data || !data.challenge) {
    return (
      <Layout>
        <div className="text-center py-20">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">
            {isSpecificChallenge ? 'Challenge Not Found' : 'No challenge for today yet'}
          </h1>
          <p className="text-slate-500 mt-2">
            {isSpecificChallenge 
              ? 'The challenge for this date could not be found.'
              : 'Check back soon for today\'s money decision!'}
          </p>
          {isSpecificChallenge && (
            <button
              onClick={() => setLocation('/archive')}
              className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View Archive →
            </button>
          )}
        </div>
      </Layout>
    );
  }

  // For specific date challenges, show the challenge even if already attempted
  // (user might want to see it again or check their ranking)
  if (!isSpecificChallenge && data.hasAttempted && data.attempt) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <ChallengeInterface challenge={data.challenge} />
      </div>
    </Layout>
  );
}
