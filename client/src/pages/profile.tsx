import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { getUserStats, getCurrentUser, updateDisplayName, getUserBadges, type UserBadge } from '@/lib/api';
import { Trophy, Flame, Target, Calendar, Loader2, Pencil, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function Profile() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: getUserStats,
  });

  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
  });

  const { data: badgesData } = useQuery({
    queryKey: ['user-badges'],
    queryFn: getUserBadges,
  });

  const updateNameMutation = useMutation({
    mutationFn: updateDisplayName,
    onSuccess: (data) => {
      console.log('Name update successful:', data);
      // Update the query cache immediately with the new data
      queryClient.setQueryData(['auth-user'], data);
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      // Close editing mode after successful update
      setIsEditing(false);
      setEditName('');
    },
    onError: (error) => {
      console.error('Error updating display name:', error);
      // Keep editing mode open so user can try again
    },
  });

  // Watch for mutation completion
  useEffect(() => {
    if (updateNameMutation.isSuccess && !updateNameMutation.isPending) {
      console.log('Mutation completed successfully, closing edit mode');
      setIsEditing(false);
      setEditName('');
    }
  }, [updateNameMutation.isSuccess, updateNameMutation.isPending]);

  const handleStartEdit = () => {
    setEditName(authData?.user?.displayName || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmedName = editName.trim();
    if (trimmedName && !updateNameMutation.isPending) {
      updateNameMutation.mutate(trimmedName);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName('');
  };

  if (statsLoading || authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  const isAuthenticated = authData?.isAuthenticated;
  const displayName = authData?.user?.displayName || 'Anonymous Saver';

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
          
          {/* Editable Name Section */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-3xl font-display font-bold text-center max-w-xs"
                  maxLength={50}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSave}
                  disabled={updateNameMutation.isPending || !editName.trim()}
                  className="h-8 w-8 p-0"
                >
                  {updateNameMutation.isPending ? (
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-600" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={updateNameMutation.isPending}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-display font-bold text-slate-900">
                  {displayName}
                </h1>
                {isAuthenticated && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleStartEdit}
                    className="h-8 w-8 p-0 hover:bg-slate-100"
                  >
                    <Pencil className="w-4 h-4 text-slate-400 hover:text-emerald-600" />
                  </Button>
                )}
              </div>
            )}
          </div>
          
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
          <h3 className="text-lg font-bold text-slate-900 mb-4">Badges</h3>
          {badgesData && badgesData.badges.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                {badgesData.badges.map((userBadge: UserBadge) => (
                  <TooltipProvider key={userBadge.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center cursor-help">
                          <div className="text-4xl mb-1">{userBadge.badge.icon}</div>
                          <div className={`text-[10px] px-1.5 py-0.5 rounded ${
                            userBadge.badge.rarity === 'legendary' ? 'bg-purple-100 text-purple-700' :
                            userBadge.badge.rarity === 'epic' ? 'bg-blue-100 text-blue-700' :
                            userBadge.badge.rarity === 'rare' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {userBadge.badge.rarity}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-bold mb-1">{userBadge.badge.name}</p>
                        <p className="text-xs">{userBadge.badge.description}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Earned {new Date(userBadge.earnedAt).toLocaleDateString()}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              <p className="text-sm">No badges yet. Keep playing to unlock achievements!</p>
              <p className="text-xs text-slate-400 mt-2">Complete challenges, build streaks, and improve your scores</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
