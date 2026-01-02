import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { getUserStats, getCurrentUser, updateDisplayName, updateProfile, calculateAge, type AuthUser } from '@/lib/api';
import { Trophy, Flame, Target, Calendar, Loader2, Edit2, Save, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAuth } from '@/components/UserAuth';

export default function Profile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [incomeBracket, setIncomeBracket] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: getUserStats,
    enabled: !!isAuthenticated, // Only fetch stats if user is authenticated
    retry: false,
  });

  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
  });

  const user = authData?.user;
  const isAuthenticated = authData?.isAuthenticated;

  // Initialize form values when user data loads
  React.useEffect(() => {
    if (user && !isEditing) {
      setDisplayName(user.displayName || '');
      setBirthday(user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : '');
      setIncomeBracket(user.incomeBracket || '');
    }
  }, [user, isEditing]);

  const updateDisplayNameMutation = useMutation({
    mutationFn: updateDisplayName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      toast({ title: 'Success', description: 'Display name updated successfully!' });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      toast({ title: 'Success', description: 'Profile updated successfully!' });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSave = async () => {
    if (!isAuthenticated || !user) return;

    try {
      // Update display name if changed
      if (displayName !== user.displayName) {
        await updateDisplayNameMutation.mutateAsync(displayName);
      }

      // Update profile (birthday and income bracket)
      const profileData: { birthday?: string | null; incomeBracket?: string | null } = {};
      if (birthday !== (user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : '')) {
        profileData.birthday = birthday || null;
      }
      if (incomeBracket !== (user.incomeBracket || '')) {
        profileData.incomeBracket = incomeBracket || null;
      }

      if (Object.keys(profileData).length > 0) {
        await updateProfileMutation.mutateAsync(profileData);
      }

      if (displayName === user.displayName && Object.keys(profileData).length === 0) {
        setIsEditing(false);
      }
    } catch (error) {
      // Error handling is done in mutations
    }
  };

  const handleCancel = () => {
    // Reset form values
    if (user) {
      setDisplayName(user.displayName || '');
      setBirthday(user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : '');
      setIncomeBracket(user.incomeBracket || '');
    }
    setIsEditing(false);
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

  const statCards = [
    { label: 'Current Streak', value: stats?.streak || 0, icon: Flame, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Avg Score', value: stats?.averageScore || 0, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Best Percentile', value: stats?.bestPercentile ? `Top ${100 - stats.bestPercentile}%` : 'N/A', icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Total Plays', value: stats?.totalAttempts || 0, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  const age = user?.birthday ? calculateAge(user.birthday) : null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="text-center py-8">
          <div className="w-24 h-24 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.displayName || 'User'} className="w-24 h-24 rounded-full object-cover" />
            ) : (
              '🧙‍♂️'
            )}
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900">
            {user?.displayName || user?.email || 'Anonymous Saver'}
          </h1>
          <p className="text-slate-500">
            Level {Math.floor((stats?.totalAttempts || 0) / 5) + 1} • Money Master
            {age && ` • Age ${age}`}
          </p>
        </div>

        {/* Profile Editing Section - Only show for authenticated users */}
        {isAuthenticated && user && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    {isEditing ? 'Edit your profile details' : 'Your personal information'}
                  </CardDescription>
                </div>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancel}
                      disabled={updateDisplayNameMutation.isPending || updateProfileMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleSave}
                      disabled={updateDisplayNameMutation.isPending || updateProfileMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateDisplayNameMutation.isPending || updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                {isEditing ? (
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                ) : (
                  <p className="text-sm text-slate-700 py-2">{user.displayName || 'Not set'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <p className="text-sm text-slate-700 py-2">{user.email || 'Not set'}</p>
                <p className="text-xs text-slate-500">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday</Label>
                {isEditing ? (
                  <Input
                    id="birthday"
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                ) : (
                  <p className="text-sm text-slate-700 py-2">
                    {user.birthday 
                      ? new Date(user.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      : 'Not set'}
                    {age && ` (Age ${age})`}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="incomeBracket">Income Bracket</Label>
                {isEditing ? (
                  <Select value={incomeBracket} onValueChange={setIncomeBracket}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select income bracket" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<50k">Less than $50,000</SelectItem>
                      <SelectItem value="50-100k">$50,000 - $100,000</SelectItem>
                      <SelectItem value="100-150k">$100,000 - $150,000</SelectItem>
                      <SelectItem value="150-200k">$150,000 - $200,000</SelectItem>
                      <SelectItem value="200-300k">$200,000 - $300,000</SelectItem>
                      <SelectItem value="300k+">$300,000+</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-slate-700 py-2">
                    {user.incomeBracket 
                      ? user.incomeBracket
                          .replace('<50k', 'Less than $50,000')
                          .replace('50-100k', '$50,000 - $100,000')
                          .replace('100-150k', '$100,000 - $150,000')
                          .replace('150-200k', '$150,000 - $200,000')
                          .replace('200-300k', '$200,000 - $300,000')
                          .replace('300k+', '$300,000+')
                      : 'Not set'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Section - Only show for authenticated users */}
        {isAuthenticated ? (
          <>
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
          </>
        ) : (
          <Card className="border-2 border-dashed border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-2">
                Unlock Your Stats & Achievements
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Sign in to track your progress, view your streak, see your average score, and unlock achievements!
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/60 rounded-lg p-3 border border-emerald-100">
                    <Flame className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="font-medium text-slate-700">Track Streaks</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-emerald-100">
                    <Target className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <p className="font-medium text-slate-700">View Scores</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-emerald-100">
                    <Trophy className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                    <p className="font-medium text-slate-700">See Rankings</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-emerald-100">
                    <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <p className="font-medium text-slate-700">Track Progress</p>
                  </div>
                </div>
                <div className="pt-4">
                  <UserAuth />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
