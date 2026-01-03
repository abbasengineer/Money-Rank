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

  if (error && !isAuthError) {
    // Only show error UI for non-auth errors

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
  const isPreview = days.length > 0 && days[0]?.isPreview;

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
            <p className="text-slate-500 mt-2">
              {isAuthenticated 
                ? "Revisit past challenges or try new ones. Build your financial decision skills!"
                : "Sign in to unlock access to all challenges and track your progress!"}
            </p>
          </div>

          {/* Login prompt for unauthenticated users */}
          {!isAuthenticated && (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <LogIn className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-emerald-900 mb-1">Sign In to Play</h3>
                  <p className="text-sm text-emerald-700 mb-3">
                    Create an account or sign in to access all challenges and track your progress!
                  </p>
                  <UserAuth />
                </div>
              </div>
            </div>
          )}

        {days.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-500 text-lg">No challenges found in archive.</p>
            <p className="text-slate-400 text-sm mt-2">Challenges will appear here once they're published.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {days.map((day: any) => {
            const date = dateKeyToLocalDate(day.challenge.dateKey);
            // Show preview mode if explicitly marked as preview OR if user is not authenticated
            const isPreviewMode = day.isPreview === true || (!isAuthenticated);
            const href = isPreviewMode ? '#' : (day.isLocked ? '#' : (day.hasAttempted ? `/results/${day.challenge.dateKey}` : `/challenge/${day.challenge.dateKey}`));
            
            return (
              <div
                key={day.challenge.dateKey}
                className={cn(
                  "block p-4 rounded-xl border transition-all relative",
                  isPreviewMode 
                    ? "bg-slate-50 border-slate-200 opacity-75 cursor-not-allowed" 
                    : day.isLocked 
                    ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed" 
                    : "bg-white border-slate-200 hover:border-emerald-200 hover:shadow-md cursor-pointer"
                )}
                onClick={isPreviewMode ? undefined : () => {
                  if (!day.isLocked) {
                    setLocation(href);
                  }
                }}
                data-testid={`archive-item-${day.challenge.dateKey}`}
              >
                {/* Overlay for preview mode */}
                {isPreviewMode && (
                  <div className="absolute inset-0 bg-white/50 rounded-xl flex items-center justify-center z-10">
                    <div className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Sign In to Play
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex flex-col items-center justify-center border border-slate-200",
                      isPreviewMode ? "bg-slate-200 text-slate-400" : "bg-slate-100 text-slate-500"
                    )}>
                      <span className="text-xs font-semibold uppercase">{format(date, 'MMM')}</span>
                      <span className="text-lg font-bold font-display leading-none">{format(date, 'd')}</span>
                    </div>
                    
                    <div>
                      <h3 className={cn(
                        "font-semibold",
                        isPreviewMode ? "text-slate-500" : "text-slate-900"
                      )} data-testid={`archive-title-${day.challenge.dateKey}`}>
                        {day.challenge.title}
                      </h3>
                      <p className={cn(
                        "text-sm",
                        isPreviewMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        {day.challenge.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isPreviewMode && day.hasAttempted && day.attempt && (
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-bold", 
                            day.attempt.grade === 'Great' ? "text-emerald-600" : 
                            day.attempt.grade === 'Good' ? "text-amber-500" : "text-rose-500"
                          )}>
                            {day.attempt.score}
                          </span>
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                        {day.completedDateKey && (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-slate-400 italic">
                              Completed {format(dateKeyToLocalDate(day.completedDateKey), 'MMM d')}
                            </span>
                            {day.completedOnTime && (
                              <span className="text-xs text-emerald-600 font-medium">
                                ✓ On time
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {day.isLocked && !isPreviewMode && (
                      <Lock className="w-5 h-5 text-slate-400" />
                    )}
                    {!day.isLocked && !day.hasAttempted && !isPreviewMode && (
                      <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        Play
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </Layout>
  );
}
