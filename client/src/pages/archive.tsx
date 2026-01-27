import React, { useState, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { Link, useLocation } from 'wouter';
import { format, subDays, addDays, parse } from 'date-fns';
import { CheckCircle, Lock, Loader2, AlertCircle, RefreshCw, LogIn, Crown } from 'lucide-react';
import { cn, dateKeyToLocalDate, getLocalTodayDateKey } from '@/lib/utils';
import { getArchiveChallenges, getCurrentUser, isFeatureEnabled } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import { UserAuth } from '@/components/UserAuth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
    refetchOnMount: true, // Always fetch fresh data when component mounts
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
  const user = authData?.user;
  
  // Check feature flag for Pro restrictions
  const { data: proRestrictionsEnabled } = useQuery({
    queryKey: ['feature-flag', 'ENABLE_PRO_RESTRICTIONS'],
    queryFn: () => isFeatureEnabled('ENABLE_PRO_RESTRICTIONS'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isPro = user?.subscriptionTier === 'pro';
  const subscriptionExpiresAt = user?.subscriptionExpiresAt 
    ? new Date(user.subscriptionExpiresAt) 
    : null;
  // If restrictions disabled, grant access to all; otherwise check subscription
  const hasProAccess = proRestrictionsEnabled === false 
    ? true 
    : (isPro && (subscriptionExpiresAt === null || subscriptionExpiresAt > new Date()));

  // Get data and process it - ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const days = archiveData || [];
  const isPreview = days.length > 0 && days[0]?.isPreview;

  // Get today's dateKey in user's timezone
  const todayDateKey = getLocalTodayDateKey();
  const threeDaysAgoKey = format(subDays(parse(todayDateKey, 'yyyy-MM-dd', new Date()), 3), 'yyyy-MM-dd');
  const sevenDaysFromNowKey = format(addDays(parse(todayDateKey, 'yyyy-MM-dd', new Date()), 7), 'yyyy-MM-dd');

  // Split challenges into upcoming/recent vs past
  const { upcomingRecent, pastByDifficulty } = useMemo(() => {
    const upcomingRecent: any[] = [];
    const pastByDifficulty: { [key: number]: any[] } = { 1: [], 2: [], 3: [] };

    days.forEach((day: any) => {
      const challengeDateKey = day.challenge.dateKey;
      
      // Upcoming/Recent: next 7 days OR last 3 days (today, yesterday, 2 days ago)
      const isUpcoming = challengeDateKey > todayDateKey && challengeDateKey <= sevenDaysFromNowKey;
      const isRecent = challengeDateKey <= todayDateKey && challengeDateKey >= threeDaysAgoKey;
      
      if (isUpcoming || isRecent) {
        upcomingRecent.push(day);
      } else if (challengeDateKey < threeDaysAgoKey) {
        // Past challenges (older than 3 days) - group by difficulty
        const difficulty = day.challenge.difficulty || 1;
        if (difficulty >= 1 && difficulty <= 3) {
          pastByDifficulty[difficulty].push(day);
        }
      }
    });

    // Sort upcoming/recent by date (newest first for past, oldest first for future)
    upcomingRecent.sort((a, b) => {
      const aKey = a.challenge.dateKey;
      const bKey = b.challenge.dateKey;
      // Future dates first (ascending), then past dates (descending)
      if (aKey > todayDateKey && bKey > todayDateKey) {
        return aKey.localeCompare(bKey);
      }
      if (aKey <= todayDateKey && bKey <= todayDateKey) {
        return bKey.localeCompare(aKey);
      }
      return aKey > todayDateKey ? -1 : 1;
    });

    // Sort past challenges by date (newest first) within each difficulty
    Object.keys(pastByDifficulty).forEach(diff => {
      pastByDifficulty[parseInt(diff)].sort((a, b) => 
        b.challenge.dateKey.localeCompare(a.challenge.dateKey)
      );
    });

    return { upcomingRecent, pastByDifficulty };
  }, [days, todayDateKey, threeDaysAgoKey, sevenDaysFromNowKey]);

  // NOW we can do early returns after all hooks are called
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

  // Challenge card component (reusable)
  const ChallengeCard = ({ day }: { day: any }) => {
    const date = dateKeyToLocalDate(day.challenge.dateKey);
    const isPreviewMode = day.isPreview === true || (!isAuthenticated);
    const requiresPro = proRestrictionsEnabled !== false && (day.requiresPro || false);
    const isLockedByPro = requiresPro && !hasProAccess;
    const href = isPreviewMode || isLockedByPro ? '#' : (day.isLocked ? '#' : (day.hasAttempted ? `/results/${day.challenge.dateKey}` : `/challenge/${day.challenge.dateKey}`));
    
    return (
      <div
        key={day.challenge.dateKey}
        className={cn(
          "block p-4 rounded-xl border transition-all relative",
          isPreviewMode 
            ? "bg-slate-50 border-slate-200 opacity-75 cursor-not-allowed" 
            : isLockedByPro
            ? "bg-white border-amber-200 opacity-90 cursor-not-allowed"
            : day.isLocked 
            ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed" 
            : "bg-white border-slate-200 hover:border-emerald-200 hover:shadow-md cursor-pointer"
        )}
        onClick={isPreviewMode || isLockedByPro ? undefined : () => {
          if (!day.isLocked && !isLockedByPro) {
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
                {day.completedAt && (() => {
                  const completedDate = new Date(day.completedAt);
                  const completedDateKey = format(completedDate, 'yyyy-MM-dd');
                  const isOnTime = completedDateKey === day.challenge.dateKey;
                  
                  return (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs text-slate-400 italic">
                        Completed {format(completedDate, 'MMM d')}
                      </span>
                      {isOnTime && (
                        <span className="text-xs text-emerald-600 font-medium">
                          ✓ On time
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            {isLockedByPro && !isPreviewMode && (
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  Pro Required
                </span>
              </div>
            )}
            {day.isLocked && !isPreviewMode && !isLockedByPro && (
              <Lock className="w-5 h-5 text-slate-400" />
            )}
            {!day.isLocked && !isLockedByPro && !day.hasAttempted && !isPreviewMode && (
              <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Play
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

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

        {/* Pro Info Box - Show once at top if user doesn't have Pro and there are Pro-locked challenges (only if restrictions enabled) */}
        {proRestrictionsEnabled !== false && isAuthenticated && !hasProAccess && days.some((day: any) => day.requiresPro) && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Crown className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">Pro Feature</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Access challenges older than 3 days requires Pro. Free users can access today and the last 2 days.
                </p>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => {
                    window.location.href = '/upgrade';
                  }}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
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
          <div className="space-y-6">
            {/* Upcoming/Recent Section */}
            {upcomingRecent.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Upcoming & Recent</h2>
                <div className="space-y-4">
                  {upcomingRecent.map((day: any) => (
                    <ChallengeCard key={day.challenge.dateKey} day={day} />
                  ))}
                </div>
              </div>
            )}

            {/* Past Challenges by Difficulty */}
            {(pastByDifficulty[1].length > 0 || pastByDifficulty[2].length > 0 || pastByDifficulty[3].length > 0) && (
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Past Challenges</h2>
                <Accordion type="multiple" className="w-full">
                  {pastByDifficulty[1].length > 0 && (
                    <AccordionItem value="easy" className="border border-slate-200 rounded-xl px-4 mb-4">
                      <AccordionTrigger className="text-lg font-semibold text-slate-900 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600">Easy</span>
                          <span className="text-sm font-normal text-slate-500">
                            ({pastByDifficulty[1].length} challenge{pastByDifficulty[1].length !== 1 ? 's' : ''})
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {pastByDifficulty[1].map((day: any) => (
                            <ChallengeCard key={day.challenge.dateKey} day={day} />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {pastByDifficulty[2].length > 0 && (
                    <AccordionItem value="medium" className="border border-slate-200 rounded-xl px-4 mb-4">
                      <AccordionTrigger className="text-lg font-semibold text-slate-900 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-600">Medium</span>
                          <span className="text-sm font-normal text-slate-500">
                            ({pastByDifficulty[2].length} challenge{pastByDifficulty[2].length !== 1 ? 's' : ''})
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {pastByDifficulty[2].map((day: any) => (
                            <ChallengeCard key={day.challenge.dateKey} day={day} />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {pastByDifficulty[3].length > 0 && (
                    <AccordionItem value="hard" className="border border-slate-200 rounded-xl px-4 mb-4">
                      <AccordionTrigger className="text-lg font-semibold text-slate-900 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className="text-rose-600">Hard</span>
                          <span className="text-sm font-normal text-slate-500">
                            ({pastByDifficulty[3].length} challenge{pastByDifficulty[3].length !== 1 ? 's' : ''})
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {pastByDifficulty[3].map((day: any) => (
                            <ChallengeCard key={day.challenge.dateKey} day={day} />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
