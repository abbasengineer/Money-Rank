import React from 'react';
import { format } from 'date-fns';
import { dateKeyToLocalDate } from '@/lib/utils';
import type { Challenge, Attempt } from '@/lib/types';

interface ResultsStats {
  percentile: number;
  exactMatchPercent: number;
  topPickPercent: number;
  totalAttempts: number;
}

interface ShareCardProps {
  challenge: Challenge;
  attempt: Attempt;
  stats: ResultsStats;
  className?: string;
}

export function ShareCard({ challenge, attempt, stats, className = '' }: ShareCardProps) {
  const challengeDate = dateKeyToLocalDate(challenge.dateKey);
  
  // Use inline styles for colors to avoid oklch issues with html2canvas
  const getScoreColor = () => {
    if (attempt.score >= 90) return '#059669'; // emerald-600
    if (attempt.score >= 60) return '#f59e0b'; // amber-500
    return '#ef4444'; // rose-500
  };
  
  const getGradeStyles = (grade: string) => {
    switch (grade) {
      case 'Great': 
        return { color: '#059669', backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }; // emerald-600, emerald-50, emerald-200
      case 'Good': 
        return { color: '#d97706', backgroundColor: '#fffbeb', borderColor: '#fde68a' }; // amber-600, amber-50, amber-200
      case 'Risky': 
        return { color: '#dc2626', backgroundColor: '#fef2f2', borderColor: '#fecaca' }; // rose-600, rose-50, rose-200
      default: 
        return { color: '#475569', backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }; // slate-600, slate-50, slate-200
    }
  };

  return (
    <div 
      data-share-card
      className={`p-10 rounded-3xl border-4 shadow-2xl ${className}`}
      style={{ 
        width: '1200px', 
        height: '630px', 
        position: 'relative', 
        overflow: 'hidden',
        background: 'linear-gradient(to bottom right, #ecfdf5, #ffffff, #f0fdfa)', // emerald-50, white, teal-50
        borderColor: '#a7f3d0', // emerald-200
      }}
    >
      {/* Decorative gradient overlay - simplified for html2canvas compatibility */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 rounded-full -mr-48 -mt-48" 
        style={{ backgroundColor: 'rgba(167, 243, 208, 0.2)' }} // emerald-200/20
      />
      <div 
        className="absolute bottom-0 left-0 w-96 h-96 rounded-full -ml-48 -mb-48" 
        style={{ backgroundColor: 'rgba(253, 230, 138, 0.15)' }} // amber-200/15
      />
      
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-display font-bold text-3xl shadow-xl"
              style={{ background: 'linear-gradient(to bottom right, #059669, #0d9488)' }} // emerald-600 to teal-600
            >
              $
            </div>
            <div>
              <h2 className="text-3xl font-display font-bold" style={{ color: '#0f172a' }}>MoneyRank</h2>
              <p className="text-base font-medium" style={{ color: '#475569' }}>Daily Money Decision Challenge</p>
            </div>
          </div>
          <div 
            className="text-right px-4 py-2 rounded-xl border shadow-sm"
            style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
          >
            <p className="text-xl font-bold" style={{ color: '#0f172a' }}>{format(challengeDate, 'MMM d, yyyy')}</p>
            <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#475569' }}>{challenge.category}</p>
          </div>
        </div>

        {/* Question */}
        <div className="mb-6 flex-1">
          <h1 className="text-5xl font-display font-bold mb-4 leading-tight" style={{ color: '#0f172a' }}>
            {challenge.title}
          </h1>
          <p className="text-2xl leading-relaxed line-clamp-2 font-medium" style={{ color: '#334155' }}>
            {challenge.scenario}
          </p>
        </div>

        {/* Score Section */}
        <div 
          className="rounded-2xl p-8 border-4 shadow-xl"
          style={{ backgroundColor: '#ffffff', borderColor: '#a7f3d0' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-base uppercase tracking-widest mb-3 font-bold" style={{ color: '#64748b' }}>My Score</p>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-8xl font-display font-bold drop-shadow-lg" style={{ color: getScoreColor() }}>
                  {attempt.score}
                </span>
                <span className="text-4xl font-bold" style={{ color: '#94a3b8' }}>%</span>
              </div>
              <span 
                className="inline-block px-5 py-2.5 rounded-full text-xl font-bold border-2"
                style={getGradeStyles(attempt.grade)}
              >
                {attempt.grade} Choice
              </span>
            </div>
            
            <div className="flex gap-12">
              <div className="text-center">
                <p className="text-5xl font-display font-bold mb-2" style={{ color: '#0f172a' }}>
                  Top {100 - stats.percentile}%
                </p>
                <p className="text-base uppercase tracking-wider font-semibold" style={{ color: '#64748b' }}>Percentile</p>
              </div>
              <div className="text-center border-l-2 pl-12" style={{ borderColor: '#cbd5e1' }}>
                <p className="text-5xl font-display font-bold mb-2" style={{ color: '#0f172a' }}>
                  {stats.exactMatchPercent}%
                </p>
                <p className="text-base uppercase tracking-wider font-semibold" style={{ color: '#64748b' }}>Matched Me</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6" style={{ color: '#475569' }}>
          <p className="text-xl font-semibold">Try it yourself and see how you rank! 👇</p>
          <p className="text-base font-bold" style={{ color: '#334155' }}>moneyrank.com</p>
        </div>
      </div>
    </div>
  );
}

