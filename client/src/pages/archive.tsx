import React from 'react';
import { Layout } from '@/components/layout';
import { Link } from 'wouter';
import { format, subDays, isSameWeek } from 'date-fns';
import { CheckCircle, Lock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getChallengeByDate, getUserAttemptForChallenge } from '@/lib/mockData';

export default function Archive() {
  // Generate last 14 days for the archive view
  const days = Array.from({ length: 14 }).map((_, i) => {
    const date = subDays(new Date(), i);
    const dateKey = format(date, 'yyyy-MM-dd');
    const challenge = getChallengeByDate(dateKey);
    const attempt = challenge ? getUserAttemptForChallenge(challenge.id) : null;
    
    // Mock logic for "Locked" - older than yesterday and not played
    const isToday = i === 0;
    const isYesterday = i === 1;
    const isLocked = !isToday && !isYesterday && !attempt;

    return {
      date,
      dateKey,
      challenge,
      attempt,
      isLocked,
      status: attempt ? 'completed' : isLocked ? 'locked' : 'available'
    };
  });

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-slate-900">Archive</h1>
          <p className="text-slate-500 mt-2">Revisit past challenges or catch up on what you missed.</p>
        </div>

        <div className="space-y-4">
          {days.map((day) => (
            <Link 
              key={day.dateKey} 
              href={day.status === 'locked' ? '#' : (day.status === 'completed' ? `/results/${day.dateKey}` : `/`)}
              className={cn(
                "block p-4 rounded-xl border transition-all",
                day.status === 'locked' ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed" : "bg-white border-slate-200 hover:border-emerald-200 hover:shadow-md"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex flex-col items-center justify-center text-slate-500 border border-slate-200">
                    <span className="text-xs font-semibold uppercase">{format(day.date, 'MMM')}</span>
                    <span className="text-lg font-bold font-display leading-none">{format(day.date, 'd')}</span>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {day.challenge ? day.challenge.title : 'Mystery Challenge'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {day.challenge ? day.challenge.category : 'Unknown Category'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {day.status === 'completed' && (
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-bold", 
                        day.attempt?.grade === 'Great' ? "text-emerald-600" : 
                        day.attempt?.grade === 'Good' ? "text-amber-500" : "text-rose-500"
                      )}>
                        {day.attempt?.score}
                      </span>
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                  )}
                  {day.status === 'locked' && (
                    <Lock className="w-5 h-5 text-slate-400" />
                  )}
                  {day.status === 'available' && (
                    <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      Play
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
