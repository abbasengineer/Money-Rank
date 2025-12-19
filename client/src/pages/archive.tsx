import React from 'react';
import { Layout } from '@/components/layout';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { CheckCircle, Lock, Loader2 } from 'lucide-react';
import { cn, dateKeyToLocalDate } from '@/lib/utils';
import { getArchiveChallenges } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export default function Archive() {
  const { data: archiveData, isLoading } = useQuery({
    queryKey: ['archive'],
    queryFn: getArchiveChallenges,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  const days = archiveData || [];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-slate-900">Archive</h1>
          <p className="text-slate-500 mt-2">Revisit past challenges or catch up on what you missed.</p>
        </div>

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
      </div>
    </Layout>
  );
}
