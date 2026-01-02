import React from 'react';
import { Layout } from '@/components/layout';
import { getUserStats } from '@/lib/api';
import { Trophy, Flame, Target, Calendar, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function Profile() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: getUserStats,
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

  const statCards = [
    { label: 'Current Streak', value: stats?.streak || 0, icon: Flame, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Avg Score', value: stats?.averageScore || 0, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Best Percentile', value: stats?.bestPercentile ? `Top ${100 - stats.bestPercentile}%` : 'N/A', icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Total Plays', value: stats?.totalAttempts || 0, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center py-8">
          <div className="w-24 h-24 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">
            🧙‍♂️
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Anonymous Saver</h1>
          <p className="text-slate-500">Level {Math.floor((stats?.totalAttempts || 0) / 5) + 1} • Money Master</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
              <div className={`p-3 rounded-full mb-3 ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="text-2xl font-display font-bold text-slate-900">{stat.value}</div>
              <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Achievement Progress</h3>
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            <p className="text-sm">Keep playing to unlock more achievements!</p>
            <p className="text-xs text-slate-400 mt-2">Coming soon: Badges, leaderboards, and more</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
