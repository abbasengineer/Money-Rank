import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { Link, useLocation } from 'wouter';
import { format } from 'date-fns';
import { CheckCircle, Lock, Loader2, AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import { cn, dateKeyToLocalDate } from '@/lib/utils';
import { getArchiveChallenges, getCurrentUser } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import { UserAuth } from '@/components/UserAuth';

export default function Archive() {
  const [, setLocation] = useLocation();
  const [showLogin, setShowLogin] = useState(false);
  
  const { data: authData } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
  });

  const { data: archiveData, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['archive'],
    queryFn: getArchiveChallenges,
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (authentication required)
      if (error?.status === 401 || error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // Check if error is authentication-related
  const isAuthError = error && (
    (error as any)?.status === 401 || 
    (error as any)?.message?.includes('401') ||
    (error as any)?.message?.includes('Authentication required')
  );

  const isAuthenticated = authData?.isAuthenticated || false;

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
    // Show login prompt for authentication errors
    if (isAuthError) {
      return (
        <Layout>
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-display font-bold text-slate-900">Play More Challenges</h1>
              <p className="text-slate-500 mt-2">Sign in to access past challenges and play unlimited games.</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
              <LogIn className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-emerald-900 mb-2">Sign In Required</h3>
              <p className="text-emerald-700 mb-6 text-lg">
                Create an account or sign in to access the challenge archive and play more games!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <UserAuth />
              </div>
            </div>
          </div>
        </Layout>
      );
    }

    // Other errors
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-slate-900">Play More Challenges</h1>
            <p className="text-slate-500 mt-2">Revisit past challenges or try new ones. Build your financial decision skills!</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-rose-900 mb-2">Failed to load archive</h3>
            <p className="text-rose-700 mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <Button 
              onClick={() => refetch()} 
              disabled={isRefetching}
              variant="outline"
              className="bg-white"
            >
              {isRefetching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const days = archiveData || [];

  return (
    <Layout>
      <SEO
        title="Play More Challenges"
        description="Browse past and upcoming MoneyRank challenges. Revisit your favorite financial decision games or try challenges you missed."
        ogTitle="MoneyRank - Play More Challenges"
        ogDescription="Browse past and upcoming MoneyRank challenges. Revisit your favorite financial decision games."
        canonical="/archive"
      />
      <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-slate-900">Play More Challenges</h1>
            <p className="text-slate-500 mt-2">Revisit past challenges or try new ones. Build your financial decision skills!</p>
          </div>

        {days.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-500 text-lg">No challenges found in archive.</p>
            <p className="text-slate-400 text-sm mt-2">Challenges will appear here once they're published.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {days.map((day: any) => {
            const date = dateKeyToLocalDate(day.challenge.dateKey);
            const href = day.isLocked ? '#' : (day.hasAttempted ? `/results/${day.challenge.dateKey}` : `/challenge/${day.challenge.dateKey}`);
            
            return (
              <Link 
                key={day.challenge.dateKey} 
                href={href}
                className={cn(
                  "block p-4 rounded-xl border transition-all",
                  day.isLocked ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed" : "bg-white border-slate-200 hover:border-emerald-200 hover:shadow-md"
                )}
                data-testid={`archive-item-${day.challenge.dateKey}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex flex-col items-center justify-center text-slate-500 border border-slate-200">
                      <span className="text-xs font-semibold uppercase">{format(date, 'MMM')}</span>
                      <span className="text-lg font-bold font-display leading-none">{format(date, 'd')}</span>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-slate-900" data-testid={`archive-title-${day.challenge.dateKey}`}>
                        {day.challenge.title}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {day.challenge.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {day.hasAttempted && day.attempt && (
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-bold", 
                          day.attempt.grade === 'Great' ? "text-emerald-600" : 
                          day.attempt.grade === 'Good' ? "text-amber-500" : "text-rose-500"
                        )}>
                          {day.attempt.score}
                        </span>
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                    )}
                    {day.isLocked && (
                      <Lock className="w-5 h-5 text-slate-400" />
                    )}
                    {!day.isLocked && !day.hasAttempted && (
                      <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        Play
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
          </div>
        )}
      </div>
    </Layout>
  );
}
