import React from 'react';
import { Challenge, ChallengeOption } from '@/lib/types';
import { CommunityStats } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CommunityComparisonGraphProps {
  challenge: Challenge;
  userAttempt: { ranking: string[] };
  communityStats: CommunityStats;
}

export function CommunityComparisonGraph({ 
  challenge, 
  userAttempt, 
  communityStats 
}: CommunityComparisonGraphProps) {
  const { positionDistribution, averageScore } = communityStats;
  
  // Calculate percentages for each option at each position
  const totalAttempts = communityStats.totalAttempts || 1;
  
  // Get user's ranking positions for each option
  const userPositions: Record<string, number> = {};
  userAttempt.ranking.forEach((optionId, index) => {
    userPositions[optionId] = index + 1;
  });

  // Prepare data for graph
  const graphData = challenge.options.map(option => {
    const distribution = positionDistribution[option.id] || { 1: 0, 2: 0, 3: 0, 4: 0 };
    const userPosition = userPositions[option.id];
    
    // Calculate percentages
    const position1 = totalAttempts > 0 ? Math.round((distribution[1] / totalAttempts) * 100) : 0;
    const position2 = totalAttempts > 0 ? Math.round((distribution[2] / totalAttempts) * 100) : 0;
    const position3 = totalAttempts > 0 ? Math.round((distribution[3] / totalAttempts) * 100) : 0;
    const position4 = totalAttempts > 0 ? Math.round((distribution[4] / totalAttempts) * 100) : 0;
    
    return {
      option,
      position1,
      position2,
      position3,
      position4,
      position1Count: distribution[1] || 0,
      position2Count: distribution[2] || 0,
      position3Count: distribution[3] || 0,
      position4Count: distribution[4] || 0,
      userPosition,
    };
  });

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'bg-emerald-500';
      case 2: return 'bg-amber-500';
      case 3: return 'bg-orange-500';
      case 4: return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <h3 className="text-xl font-display font-bold text-slate-900 mb-4">
        Community Comparison
      </h3>
      
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 pb-3 border-b border-slate-200 text-xs">
        <span className="font-semibold text-slate-700">Position:</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-500"></span>
          <span>1st</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500"></span>
          <span>2nd</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-500"></span>
          <span>3rd</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-rose-500"></span>
          <span>4th</span>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {graphData.map((item) => (
          <div key={item.option.id} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium flex-shrink-0",
                  item.option.tier === 'Optimal' ? 'bg-emerald-100 text-emerald-700' :
                  item.option.tier === 'Reasonable' ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
                )}>
                  {item.option.tier}
                </span>
                <span className="text-slate-700 font-medium truncate">{item.option.text}</span>
                {item.userPosition && (
                  <span className="text-xs text-emerald-600 font-semibold flex-shrink-0">
                    (You: #{item.userPosition})
                  </span>
                )}
              </div>
            </div>
            
            {/* Stacked bar - always shows all 4 positions */}
            <div className="relative h-12 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
              {/* Position 1 - Always visible, even if 0% */}
              <div 
                className={cn(
                  "absolute left-0 h-full flex items-center justify-center text-white text-xs font-semibold border-r-2 border-white/30 transition-all",
                  getPositionColor(1),
                  item.position1 === 0 && "opacity-20",
                  item.userPosition === 1 && "ring-2 ring-offset-1 ring-slate-900 z-10"
                )}
                style={{ width: `${Math.max(item.position1, 2)}%` }}
                title={`${item.position1Count} users (${item.position1}%) ranked this 1st`}
              >
                {item.position1 >= 8 && (
                  <span className="px-1">{item.position1}%</span>
                )}
              </div>
              
              {/* Position 2 - Always visible */}
              <div 
                className={cn(
                  "absolute h-full flex items-center justify-center text-white text-xs font-semibold border-r-2 border-white/30 transition-all",
                  getPositionColor(2),
                  item.position2 === 0 && "opacity-20",
                  item.userPosition === 2 && "ring-2 ring-offset-1 ring-slate-900 z-10"
                )}
                style={{ left: `${Math.max(item.position1, 2)}%`, width: `${Math.max(item.position2, 2)}%` }}
                title={`${item.position2Count} users (${item.position2}%) ranked this 2nd`}
              >
                {item.position2 >= 8 && (
                  <span className="px-1">{item.position2}%</span>
                )}
              </div>
              
              {/* Position 3 - Always visible */}
              <div 
                className={cn(
                  "absolute h-full flex items-center justify-center text-white text-xs font-semibold border-r-2 border-white/30 transition-all",
                  getPositionColor(3),
                  item.position3 === 0 && "opacity-20",
                  item.userPosition === 3 && "ring-2 ring-offset-1 ring-slate-900 z-10"
                )}
                style={{ 
                  left: `${Math.max(item.position1, 2) + Math.max(item.position2, 2)}%`, 
                  width: `${Math.max(item.position3, 2)}%` 
                }}
                title={`${item.position3Count} users (${item.position3}%) ranked this 3rd`}
              >
                {item.position3 >= 8 && (
                  <span className="px-1">{item.position3}%</span>
                )}
              </div>
              
              {/* Position 4 - Always visible */}
              <div 
                className={cn(
                  "absolute h-full flex items-center justify-center text-white text-xs font-semibold transition-all",
                  getPositionColor(4),
                  item.position4 === 0 && "opacity-20",
                  item.userPosition === 4 && "ring-2 ring-offset-1 ring-slate-900 z-10"
                )}
                style={{ 
                  left: `${Math.max(item.position1, 2) + Math.max(item.position2, 2) + Math.max(item.position3, 2)}%`, 
                  width: `${Math.max(item.position4, 2)}%` 
                }}
                title={`${item.position4Count} users (${item.position4}%) ranked this 4th`}
              >
                {item.position4 >= 8 && (
                  <span className="px-1">{item.position4}%</span>
                )}
              </div>
            </div>
            
            {/* Position labels below bar - always show all 4 */}
            <div className="flex justify-between text-xs text-slate-500 px-1 mt-1">
              <span className={cn(
                "flex items-center gap-1",
                item.position1 === 0 && "opacity-50"
              )}>
                <span className={cn("w-2 h-2 rounded-full", getPositionColor(1))}></span>
                1st: {item.position1Count} ({item.position1}%)
              </span>
              <span className={cn(
                "flex items-center gap-1",
                item.position2 === 0 && "opacity-50"
              )}>
                <span className={cn("w-2 h-2 rounded-full", getPositionColor(2))}></span>
                2nd: {item.position2Count} ({item.position2}%)
              </span>
              <span className={cn(
                "flex items-center gap-1",
                item.position3 === 0 && "opacity-50"
              )}>
                <span className={cn("w-2 h-2 rounded-full", getPositionColor(3))}></span>
                3rd: {item.position3Count} ({item.position3}%)
              </span>
              <span className={cn(
                "flex items-center gap-1",
                item.position4 === 0 && "opacity-50"
              )}>
                <span className={cn("w-2 h-2 rounded-full", getPositionColor(4))}></span>
                4th: {item.position4Count} ({item.position4}%)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Average score */}
      {averageScore > 0 && (
        <div className="pt-4 border-t border-slate-200">
          <div className="text-center">
            <div className="text-sm text-slate-600 mb-1">Average Score</div>
            <div className="text-2xl font-display font-bold text-slate-900">
              {averageScore}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
