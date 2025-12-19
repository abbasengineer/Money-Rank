import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Layout } from '@/components/layout';
import { ChallengeInterface } from '@/components/challenge/ChallengeInterface';
import { getTodayChallenge } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Calendar } from 'lucide-react';

export default function Home() {
  const [, setLocation] = useLocation();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['today-challenge'],
    queryFn: getTodayChallenge,
  });

  useEffect(() => {
    if (data?.hasAttempted && data?.attempt && data?.challenge) {
      setLocation(`/results/${data.challenge.dateKey}`);
    }
  }, [data, setLocation]);

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
          <h1 className="text-2xl font-bold text-slate-900">No challenge for today yet</h1>
          <p className="text-slate-500 mt-2">Check back soon for today's money decision!</p>
        </div>
      </Layout>
    );
  }

  if (data.hasAttempted && data.attempt) {
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
