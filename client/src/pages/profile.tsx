import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { getUserStats, getCurrentUser, getUserBadges, updateDisplayName, updateProfile, calculateAge, getUserRiskProfile, getUserScoreHistory, getUserCategoryPerformance, type AuthUser } from '@/lib/api';
import { Trophy, Flame, Target, Calendar, Loader2, Edit2, Save, X, BarChart3, TrendingUp, AlertCircle, PieChart, Download, Plus, CheckCircle2, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAuth } from '@/components/UserAuth';
import { SEO } from '@/components/SEO';
import { PremiumFeature } from '@/components/PremiumFeature';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

// Custom Tooltip component for score trend chart
const ScoreTrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const challengeDate = data.challengeDateKey 
      ? format(new Date(data.challengeDateKey + 'T00:00:00'), 'MMM d')
      : format(new Date(data.submittedDate), 'MMM d');
    
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-slate-900 mb-1">Challenge: {challengeDate}</p>
        <p className="text-emerald-600 font-medium">Score: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function Profile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [incomeBracket, setIncomeBracket] = useState('');
  type Goal = {
    id: string;
    title: string;
    target: number;
    current: number;
    completed: boolean;
    isSuggested?: boolean;
  };
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');

  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
  });

  const user = authData?.user;
  const isAuthenticated = authData?.isAuthenticated;

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: getUserStats,
    enabled: !!isAuthenticated, // Only fetch stats if user is authenticated
    retry: false,
  });

  const { data: badgesData, isLoading: badgesLoading, error: badgesError } = useQuery({
    queryKey: ['user-badges'],
    queryFn: getUserBadges,
    enabled: !!isAuthenticated,
    retry: false,
  });

  const { data: riskProfile, isLoading: riskProfileLoading } = useQuery({
    queryKey: ['user-risk-profile'],
    queryFn: getUserRiskProfile,
    enabled: !!isAuthenticated && (stats?.totalAttempts || 0) > 0,
    retry: false,
  });

  const { data: scoreHistory, isLoading: scoreHistoryLoading } = useQuery({
    queryKey: ['user-score-history'],
    queryFn: getUserScoreHistory,
    enabled: !!isAuthenticated && (stats?.totalAttempts || 0) > 0,
    retry: false,
  });

  const { data: categoryPerformance, isLoading: categoryPerformanceLoading } = useQuery({
    queryKey: ['user-category-performance'],
    queryFn: getUserCategoryPerformance,
    enabled: !!isAuthenticated && (stats?.totalAttempts || 0) > 0,
    retry: false,
  });
  // #endregion

  // Generate suggested goals based on user analytics
  const generateSuggestedGoals = React.useCallback((): Goal[] => {
    if (!stats || stats.totalAttempts === 0) {
      return [];
    }

    const suggested: Goal[] = [];
    const currentAvg = stats.averageScore;
    const currentStreak = stats.streak;
    const currentPercentile = stats.bestPercentile;
    const totalAttempts = stats.totalAttempts;

    // 1. Average Score Goal - suggest next milestone
    if (currentAvg < 100) {
      const milestones = [60, 70, 75, 80, 85, 90, 95, 100];
      const nextMilestone = milestones.find(m => m > currentAvg);
      if (nextMilestone) {
        suggested.push({
          id: `suggested-avg-score-${nextMilestone}`,
          title: `Reach ${nextMilestone} average score`,
          target: nextMilestone,
          current: currentAvg,
          completed: false,
          isSuggested: true,
        });
      }
    }

    // 2. Streak Goal - suggest maintaining or improving
    if (currentStreak > 0) {
      const nextStreakTarget = currentStreak < 7 
        ? 7 // First week
        : currentStreak < 30 
        ? 30 // First month
        : currentStreak + 10; // Increment by 10
      
      suggested.push({
        id: `suggested-streak-${nextStreakTarget}`,
        title: `Maintain a ${nextStreakTarget}-day streak`,
        target: nextStreakTarget,
        current: currentStreak,
        completed: false,
        isSuggested: true,
      });
    } else if (totalAttempts > 0) {
      // If they have attempts but no streak, suggest starting one
      suggested.push({
        id: 'suggested-streak-start',
        title: 'Start a 3-day streak',
        target: 3,
        current: 0,
        completed: false,
        isSuggested: true,
      });
    }

    // 3. Percentile Goal - suggest improving percentile
    if (currentPercentile < 90) {
      const nextPercentileTarget = currentPercentile < 50 
        ? 50 // Top 50%
        : currentPercentile < 75 
        ? 75 // Top 25%
        : currentPercentile < 90 
        ? 90 // Top 10%
        : 95; // Top 5%
      
      suggested.push({
        id: `suggested-percentile-${nextPercentileTarget}`,
        title: `Reach top ${100 - nextPercentileTarget}% (${nextPercentileTarget}th percentile)`,
        target: nextPercentileTarget,
        current: currentPercentile,
        completed: false,
        isSuggested: true,
      });
    }

    // 4. Total Attempts Goal - suggest completing more challenges
    if (totalAttempts < 50) {
      const nextAttemptTarget = totalAttempts < 10 
        ? 10 // First 10
        : totalAttempts < 25 
        ? 25 // First 25
        : 50; // First 50
      
      suggested.push({
        id: `suggested-attempts-${nextAttemptTarget}`,
        title: `Complete ${nextAttemptTarget} challenges`,
        target: nextAttemptTarget,
        current: totalAttempts,
        completed: false,
        isSuggested: true,
      });
    }

    // 5. Category Performance Goal (if categoryPerformance is available)
    if (categoryPerformance && categoryPerformance.categories.length > 0) {
      // Find the category with the lowest average score
      const weakestCategory = categoryPerformance.categories.reduce((min, cat) => 
        cat.averageScore < min.averageScore ? cat : min
      );
      
      if (weakestCategory.averageScore < 80 && weakestCategory.attempts >= 3) {
        const targetScore = Math.min(80, weakestCategory.averageScore + 10);
        suggested.push({
          id: `suggested-category-${weakestCategory.category}`,
          title: `Improve ${weakestCategory.category} to ${targetScore} average`,
          target: targetScore,
          current: Math.round(weakestCategory.averageScore),
          completed: false,
          isSuggested: true,
        });
      }
    }

    return suggested;
  }, [stats, categoryPerformance]);

  // Auto-generate and update suggested goals when stats change
  React.useEffect(() => {
    if (stats && stats.totalAttempts > 0) {
      const suggested = generateSuggestedGoals();
      
      setGoals(prevGoals => {
        // Get existing user-created goals (not suggested)
        const userGoals = prevGoals.filter(g => !g.isSuggested);
        
        // Update current values for existing suggested goals and add new ones
        const updatedSuggested = suggested.map(suggestedGoal => {
          // Find if this suggested goal already exists
          const existing = prevGoals.find(g => g.id === suggestedGoal.id);
          if (existing) {
            // Update current value but keep completion status
            return {
              ...existing,
              current: suggestedGoal.current,
              // Re-check completion
              completed: suggestedGoal.current >= suggestedGoal.target,
            };
          }
          return suggestedGoal;
        });

        // Combine user goals with updated/new suggested goals
        return [...userGoals, ...updatedSuggested];
      });
    }
  }, [stats, categoryPerformance, generateSuggestedGoals]);

  // Update current values for all goals when stats change
  React.useEffect(() => {
    if (stats) {
      setGoals(prevGoals => prevGoals.map(goal => {
        let newCurrent = goal.current;
        
        // Update current value based on goal type
        if (goal.title.includes('average score')) {
          newCurrent = stats.averageScore;
        } else if (goal.title.includes('streak')) {
          newCurrent = stats.streak;
        } else if (goal.title.includes('percentile')) {
          newCurrent = stats.bestPercentile;
        } else if (goal.title.includes('challenges') || goal.title.includes('Complete')) {
          newCurrent = stats.totalAttempts;
        }
        
        return {
          ...goal,
          current: newCurrent,
          completed: newCurrent >= goal.target,
        };
      }));
    }
  }, [stats]);

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

  // Generate personalized insights
  const generateInsights = (): string => {
    if (!riskProfile || !categoryPerformance || !scoreHistory) {
      return 'Complete more challenges to get personalized insights!';
    }

    const insights: string[] = [];
    
    // Risk level insight
    if (riskProfile.overallRiskScore < 20) {
      insights.push("You're a conservative decision-maker, prioritizing safety and stability.");
    } else if (riskProfile.overallRiskScore < 40) {
      insights.push("You balance risk and reward well, making thoughtful financial choices.");
    } else if (riskProfile.overallRiskScore < 60) {
      insights.push("You're comfortable with moderate risk, seeking growth opportunities.");
    } else {
      insights.push("You tend to make riskier financial decisions - consider reviewing your approach.");
    }
    
    // Category strengths
    const bestCategory = categoryPerformance?.categories?.[0];
    if (bestCategory && bestCategory.averageScore >= 85) {
      insights.push(`You excel at ${bestCategory.category} decisions, with an average score of ${bestCategory.averageScore}%.`);
    }
    
    // Category weaknesses
    const worstCategory = categoryPerformance?.categories?.[categoryPerformance.categories.length - 1];
    if (worstCategory && worstCategory.averageScore < 70 && worstCategory.attempts > 0) {
      insights.push(`Consider learning more about ${worstCategory.category} - your average score is ${worstCategory.averageScore}%.`);
    }
    
    // Trend insight
    if (scoreHistory?.trend === 'improving') {
      insights.push(`Great progress! Your scores have improved ${Math.abs(scoreHistory.trendPercent)}% recently.`);
    } else if (scoreHistory?.trend === 'declining') {
      insights.push(`Your recent scores are ${Math.abs(scoreHistory.trendPercent)}% lower - try reviewing past challenges to learn.`);
    }
    
    // Consistency insight
    if (scoreHistory?.scoreDistribution) {
      const { perfect, great, good, risky } = scoreHistory.scoreDistribution;
      const total = perfect + great + good + risky;
      if (total > 0) {
        const consistency = ((perfect + great) / total) * 100;
        if (consistency >= 70) {
          insights.push("You're very consistent - most of your decisions are high-quality!");
        } else if (consistency < 50) {
          insights.push("Your performance varies - focus on understanding the reasoning behind optimal choices.");
        }
      }
    }
    
    return insights.join(' ') || 'Keep playing to unlock more insights!';
  };

  // Calculate Financial Health Score
  const calculateFinancialHealthScore = (): {
    score: number;
    components: {
      averageScore: number;
      riskScore: number;
      consistency: number;
      categoryBalance: number;
    };
    trend?: 'improving' | 'stable' | 'declining';
    trendChange?: number;
  } | null => {
    if (!riskProfile || !scoreHistory || !categoryPerformance) {
      return null;
    }

    // Component 1: Average Score (40% weight)
    const averageScoreComponent = riskProfile.averageScore; // 0-100

    // Component 2: Risk Profile (30% weight) - inverted (lower risk = higher score)
    const riskScoreComponent = Math.max(0, 100 - riskProfile.overallRiskScore); // 0-100

    // Component 3: Consistency (20% weight) - % of perfect + great scores
    const { perfect, great, good, risky } = scoreHistory.scoreDistribution;
    const total = perfect + great + good + risky;
    const consistencyComponent = total > 0 
      ? Math.round(((perfect + great) / total) * 100)
      : 0; // 0-100

    // Component 4: Category Balance (10% weight)
    // Calculate how evenly distributed attempts are across categories
    const categories = categoryPerformance.categories || [];
    if (categories.length === 0) {
      return null;
    }
    
    const categoryAttempts = categories.map(c => c.attempts);
    const totalAttempts = categoryAttempts.reduce((sum, a) => sum + a, 0);
    if (totalAttempts === 0) return null;
    
    // Ideal distribution: each category gets equal attempts
    const idealPerCategory = totalAttempts / categories.length;
    const variance = categoryAttempts.reduce((sum, attempts) => {
      const diff = Math.abs(attempts - idealPerCategory);
      return sum + (diff / idealPerCategory);
    }, 0);
    
    // Balance score: lower variance = higher balance (max 100)
    const categoryBalanceComponent = Math.max(0, Math.round(100 - (variance / categories.length) * 50));

    // Calculate weighted total
    const totalScore = Math.round(
      (averageScoreComponent * 0.40) +
      (riskScoreComponent * 0.30) +
      (consistencyComponent * 0.20) +
      (categoryBalanceComponent * 0.10)
    );

    // Calculate trend (compare last 7 days vs previous period)
    let trend: 'improving' | 'stable' | 'declining' | undefined;
    let trendChange: number | undefined;
    
    if (scoreHistory.averages.last7Days > 0 && scoreHistory.averages.last30Days > 0) {
      const recentAvg = scoreHistory.averages.last7Days;
      const previousPeriod = scoreHistory.averages.last30Days;
      // Calculate previous period average (last 30 days excluding last 7)
      const previousAvg = previousPeriod > recentAvg 
        ? Math.round((previousPeriod * 30 - recentAvg * 7) / 23)
        : scoreHistory.averages.allTime;
      const change = recentAvg - previousAvg;
      
      if (Math.abs(change) < 2) {
        trend = 'stable';
        trendChange = 0;
      } else if (change > 0) {
        trend = 'improving';
        trendChange = Math.round(change);
      } else {
        trend = 'declining';
        trendChange = Math.round(Math.abs(change));
      }
    }

    return {
      score: Math.min(100, Math.max(0, totalScore)),
      components: {
        averageScore: averageScoreComponent,
        riskScore: riskScoreComponent,
        consistency: consistencyComponent,
        categoryBalance: categoryBalanceComponent,
      },
      trend,
      trendChange,
    };
  };

  // Prepare chart data - include challenge dateKey for tooltip
  const scoreChartData = scoreHistory?.scoreHistory?.slice(-30).map(item => ({
    date: format(new Date(item.date), 'MMM d'),
    score: item.score,
    challengeDateKey: item.challengeDateKey,
    submittedDate: item.date,
  })) || [];

  const categoryChartData = categoryPerformance?.categories || [];

  const scoreDistributionData = scoreHistory?.scoreDistribution ? [
    { name: 'Perfect (100)', value: scoreHistory.scoreDistribution.perfect, color: '#10b981' },
    { name: 'Great (90-99)', value: scoreHistory.scoreDistribution.great, color: '#34d399' },
    { name: 'Good (60-89)', value: scoreHistory.scoreDistribution.good, color: '#fbbf24' },
    { name: 'Risky (<60)', value: scoreHistory.scoreDistribution.risky, color: '#f87171' },
  ].filter(item => item.value > 0) : [];

  return (
    <Layout>
      <SEO
        title="My Profile"
        description="View your MoneyRank profile: track your streaks, scores, badges, and financial decision-making progress. See how you rank against other players."
        ogTitle="My MoneyRank Profile"
        ogDescription="Track your financial decision-making skills with streaks, scores, and badges."
        canonical="/profile"
      />
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
          
          {/* Financial Health Score - Pro Feature */}
          {isAuthenticated && (stats?.totalAttempts || 0) > 0 && (
            <PremiumFeature
              featureName="Financial Health Score"
              description="Your overall financial decision-making ability, calculated from your scores, risk profile, consistency, and category balance."
              tier="pro"
            >
              {(() => {
                const financialHealthScore = calculateFinancialHealthScore();
                if (!financialHealthScore) return null;
                
                return (
                  <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white mt-6">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-display font-bold text-slate-900 mb-1">
                            Financial Health Score
                          </h2>
                          <p className="text-sm text-slate-600">
                            Your overall financial decision-making ability
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-display font-bold text-emerald-600">
                            {financialHealthScore.score}
                          </div>
                          <div className="text-xs text-slate-500">/ 100</div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
                        <div 
                          className={`h-3 rounded-full transition-all ${
                            financialHealthScore.score >= 80 ? 'bg-emerald-500' :
                            financialHealthScore.score >= 60 ? 'bg-amber-500' :
                            financialHealthScore.score >= 40 ? 'bg-orange-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${financialHealthScore.score}%` }}
                        />
                      </div>
                      
                      {/* Trend Indicator */}
                      {financialHealthScore.trend && (
                        <div className="flex items-center gap-2 text-sm mb-4">
                          {financialHealthScore.trend === 'improving' && (
                            <>
                              <TrendingUp className="w-4 h-4 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">
                                ↑ {financialHealthScore.trendChange} points this week
                              </span>
                            </>
                          )}
                          {financialHealthScore.trend === 'declining' && (
                            <>
                              <TrendingUp className="w-4 h-4 text-rose-600 rotate-180" />
                              <span className="text-rose-600 font-medium">
                                ↓ {financialHealthScore.trendChange} points this week
                              </span>
                            </>
                          )}
                          {financialHealthScore.trend === 'stable' && (
                            <>
                              <Target className="w-4 h-4 text-slate-600" />
                              <span className="text-slate-600 font-medium">Stable this week</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      {/* Component Breakdown (Collapsible) */}
                      <details className="mt-4">
                        <summary className="text-sm text-slate-600 cursor-pointer hover:text-slate-900 font-medium">
                          View score breakdown
                        </summary>
                        <div className="mt-3 space-y-2 text-xs bg-white/60 rounded-lg p-3">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Average Score (40%):</span>
                            <span className="font-medium">{financialHealthScore.components.averageScore}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Risk Management (30%):</span>
                            <span className="font-medium">{financialHealthScore.components.riskScore}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Consistency (20%):</span>
                            <span className="font-medium">{financialHealthScore.components.consistency}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Category Balance (10%):</span>
                            <span className="font-medium">{financialHealthScore.components.categoryBalance}%</span>
                          </div>
                        </div>
                      </details>
                    </CardContent>
                  </Card>
                );
              })()}
            </PremiumFeature>
          )}

          {/* Level Progress */}
          {isAuthenticated && stats && (
            <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Level {Math.floor((stats.totalAttempts || 0) / 5) + 1} Progress
                </span>
                <span className="text-sm font-bold text-emerald-600">
                  {(stats.totalAttempts || 0) % 5}/5 challenges
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${((stats.totalAttempts || 0) % 5 / 5) * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                {5 - ((stats.totalAttempts || 0) % 5)} more {5 - ((stats.totalAttempts || 0) % 5) === 1 ? 'challenge' : 'challenges'} to reach Level {Math.floor((stats.totalAttempts || 0) / 5) + 2}
              </p>
            </div>
          )}
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
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-8 mt-6">
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
                <h3 className="text-lg font-bold text-slate-900 mb-4">Your Badges</h3>
                {badgesLoading ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                  </div>
                ) : badgesError ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                    <p className="text-sm">Unable to load badges</p>
                  </div>
                ) : badgesData?.badges && badgesData.badges.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {badgesData.badges.map((userBadge) => (
                      <div
                        key={userBadge.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 text-center hover:shadow-md transition-shadow"
                      >
                        <div className="text-4xl mb-2">{userBadge.badge.icon}</div>
                        <div className="font-semibold text-slate-900 text-sm mb-1">{userBadge.badge.name}</div>
                        <div className="text-xs text-slate-500 mb-2">{userBadge.badge.description}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(userBadge.earnedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                    <p className="text-sm">Keep playing to unlock badges!</p>
                    <p className="text-xs text-slate-400 mt-2">Complete challenges and maintain streaks to earn achievements</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 mt-6">
              <PremiumFeature
                featureName="Advanced Analytics"
                description="Detailed charts, trends, and performance insights to track your financial decision-making progress."
                tier="pro"
              >
                {scoreHistoryLoading || categoryPerformanceLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  </div>
                ) : (stats?.totalAttempts || 0) === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-slate-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p className="text-sm">Complete challenges to see your analytics!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                  {/* Score Trend Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Score Trend
                      </CardTitle>
                      <CardDescription>Your scores over the last 30 challenges</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {scoreChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={scoreChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#64748b"
                              style={{ fontSize: '12px' }}
                            />
                            <YAxis 
                              domain={[0, 100]} 
                              stroke="#64748b"
                              style={{ fontSize: '12px' }}
                            />
                            <Tooltip content={<ScoreTrendTooltip />} />
                            <Line 
                              type="monotone" 
                              dataKey="score" 
                              stroke="#10b981" 
                              strokeWidth={2}
                              dot={{ fill: '#10b981', r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">Not enough data yet</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Period Comparison */}
                  {scoreHistory && (
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-slate-600">Last 7 Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-slate-900">{scoreHistory.averages.last7Days}</div>
                          <div className="text-xs text-slate-500 mt-1">Average Score</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-slate-600">Last 30 Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-slate-900">{scoreHistory.averages.last30Days}</div>
                          <div className="text-xs text-slate-500 mt-1">Average Score</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-slate-600">All Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-slate-900">{scoreHistory.averages.allTime}</div>
                          <div className="text-xs text-slate-500 mt-1">Average Score</div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Category Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Category Performance
                      </CardTitle>
                      <CardDescription>Your average score by category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {categoryChartData.length > 0 ? (
                        <div className="overflow-x-auto -mx-6 px-6">
                          <div style={{ minWidth: `${Math.max(600, categoryChartData.length * 100)}px` }}>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={categoryChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis 
                                  dataKey="category" 
                                  stroke="#64748b"
                                  style={{ fontSize: '12px' }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={60}
                                />
                                <YAxis 
                                  domain={[0, 100]} 
                                  stroke="#64748b"
                                  style={{ fontSize: '12px' }}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#fff', 
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px'
                                  }}
                                />
                                <Bar dataKey="averageScore" fill="#10b981" radius={[8, 8, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">Not enough data yet</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Score Distribution */}
                  {scoreDistributionData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChart className="w-5 h-5" />
                          Score Distribution
                        </CardTitle>
                        <CardDescription>Breakdown of your scores</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <RechartsPieChart>
                            <Pie
                              data={scoreDistributionData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {scoreDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Best/Worst Scores */}
                  {scoreHistory && (
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-slate-600">Best Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-emerald-600">{scoreHistory.bestScore}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-slate-600">Worst Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-rose-500">{scoreHistory.worstScore}</div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  </>
                )}
              </PremiumFeature>
            </TabsContent>

            <TabsContent value="insights" className="space-y-6 mt-6">
              <PremiumFeature
                featureName="Personalized Insights"
                description="Get detailed insights about your financial decision-making patterns, risk profile, and personalized recommendations."
                tier="pro"
              >
                {riskProfileLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  </div>
                ) : (stats?.totalAttempts || 0) === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-slate-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p className="text-sm">Complete challenges to get personalized insights!</p>
                    </CardContent>
                  </Card>
                ) : riskProfile ? (
                  <>
                  {/* Personalized Insights */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Financial Profile</CardTitle>
                      <CardDescription>Personalized insights based on your decisions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {generateInsights()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk Score */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Overall Risk Score</CardTitle>
                      <CardDescription>Lower is better - indicates more conservative choices</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="w-full bg-slate-200 rounded-full h-4 mb-2">
                            <div 
                              className={`h-4 rounded-full transition-all ${
                                riskProfile.overallRiskScore < 20 ? 'bg-emerald-500' :
                                riskProfile.overallRiskScore < 40 ? 'bg-amber-500' :
                                riskProfile.overallRiskScore < 60 ? 'bg-orange-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${riskProfile.overallRiskScore}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Conservative</span>
                            <span>Risky</span>
                          </div>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">
                          {riskProfile.overallRiskScore}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        {riskProfile.riskTrend === 'improving' && (
                          <>
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm text-emerald-600 font-medium">Your scores are improving</span>
                          </>
                        )}
                        {riskProfile.riskTrend === 'declining' && (
                          <>
                            <TrendingUp className="w-4 h-4 text-rose-600 rotate-180" />
                            <span className="text-sm text-rose-600 font-medium">Your scores are declining</span>
                          </>
                        )}
                        {riskProfile.riskTrend === 'stable' && (
                          <>
                            <Target className="w-4 h-4 text-slate-600" />
                            <span className="text-sm text-slate-600 font-medium">Your scores are stable</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Risk Scores */}
                  {Object.keys(riskProfile.categoryRiskScores).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Category Risk Scores</CardTitle>
                        <CardDescription>Risk level by financial category</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {Object.entries(riskProfile.categoryRiskScores)
                          .sort(([, a], [, b]) => a - b)
                          .map(([category, score]) => (
                            <div key={category}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-700">{category}</span>
                                <span className="text-sm font-bold text-slate-900">{score}</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    score < 20 ? 'bg-emerald-500' :
                                    score < 40 ? 'bg-amber-500' :
                                    score < 60 ? 'bg-orange-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  {Object.values(riskProfile.conversionSignals).some(v => v) && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Recommendations</CardTitle>
                        <CardDescription>Areas where you might benefit from learning more</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {riskProfile.conversionSignals.needsInsurance && (
                            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-blue-900">Insurance Planning</p>
                                <p className="text-xs text-blue-700">Consider learning more about insurance options</p>
                              </div>
                            </div>
                          )}
                          {riskProfile.conversionSignals.needsInvestmentAdvice && (
                            <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-purple-900">Investment Strategy</p>
                                <p className="text-xs text-purple-700">You might benefit from investment education</p>
                              </div>
                            </div>
                          )}
                          {riskProfile.conversionSignals.needsDebtHelp && (
                            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-rose-900">Debt Management</p>
                                <p className="text-xs text-rose-700">Consider learning about debt reduction strategies</p>
                              </div>
                            </div>
                          )}
                          {riskProfile.conversionSignals.needsRetirementPlanning && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-amber-900">Retirement Planning</p>
                                <p className="text-xs text-amber-700">Explore retirement savings strategies</p>
                              </div>
                            </div>
                          )}
                          {riskProfile.conversionSignals.needsTaxAdvice && (
                            <div className="flex items-start gap-2 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                              <AlertCircle className="w-5 h-5 text-teal-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-teal-900">Tax Planning</p>
                                <p className="text-xs text-teal-700">Consider learning about tax optimization</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-slate-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p className="text-sm">Complete more challenges to see insights!</p>
                    </CardContent>
                  </Card>
                )}
              </PremiumFeature>
            </TabsContent>

            <TabsContent value="goals" className="space-y-6 mt-6">
              <PremiumFeature
                featureName="Goal Tracking"
                description="Set and track financial goals to improve your decision-making skills over time."
                tier="pro"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Your Goals</CardTitle>
                        <CardDescription>Track your progress toward financial milestones</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newGoalTitle && newGoalTarget) {
                            const targetNum = parseInt(newGoalTarget);
                            if (!isNaN(targetNum) && targetNum > 0) {
                              const newGoal = {
                                id: Date.now().toString(),
                                title: newGoalTitle,
                                target: targetNum,
                                current: 0,
                                completed: false
                              };
                              setGoals([...goals, newGoal]);
                              setNewGoalTitle('');
                              setNewGoalTarget('');
                              toast({
                                title: 'Goal added',
                                description: 'Your new goal has been created.',
                              });
                            }
                          }
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Goal
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add Goal Form */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <Input
                        placeholder="Goal name (e.g., Reach 80 average score)"
                        value={newGoalTitle}
                        onChange={(e) => setNewGoalTitle(e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Target value"
                        value={newGoalTarget}
                        onChange={(e) => setNewGoalTarget(e.target.value)}
                      />
                      <Button
                        onClick={() => {
                          if (newGoalTitle && newGoalTarget) {
                            const targetNum = parseInt(newGoalTarget);
                            if (!isNaN(targetNum) && targetNum > 0) {
                              const newGoal = {
                                id: Date.now().toString(),
                                title: newGoalTitle,
                                target: targetNum,
                                current: stats?.averageScore || 0,
                                completed: false
                              };
                              setGoals([...goals, newGoal]);
                              setNewGoalTitle('');
                              setNewGoalTarget('');
                              toast({
                                title: 'Goal added',
                                description: 'Your new goal has been created.',
                              });
                            }
                          }
                        }}
                        disabled={!newGoalTitle || !newGoalTarget}
                      >
                        Create
                      </Button>
                    </div>

                    {/* Goals List */}
                    {goals.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <Target className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-sm">No goals yet. Complete some challenges to get suggested goals!</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Suggested Goals Section */}
                        {goals.some(g => g.isSuggested) && (
                          <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-emerald-600" />
                              Suggested Goals
                              <span className="text-xs font-normal text-slate-500 ml-2">
                                (Based on your performance)
                              </span>
                            </h3>
                            <div className="space-y-4">
                              {goals
                                .filter(g => g.isSuggested)
                                .map((goal) => {
                                  const progress = Math.min(100, (goal.current / goal.target) * 100);
                                  const isCompleted = goal.current >= goal.target;
                                  
                                  return (
                                    <Card key={goal.id} className={isCompleted ? 'border-emerald-200 bg-emerald-50/50' : 'border-blue-200 bg-blue-50/30'}>
                                      <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                              <h4 className="font-semibold text-slate-900">{goal.title}</h4>
                                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                Suggested
                                              </span>
                                              {isCompleted && (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                              <span className="font-medium">{goal.current}</span>
                                              <span>/</span>
                                              <span>{goal.target}</span>
                                              <span className="text-emerald-600 font-semibold">
                                                ({Math.round(progress)}%)
                                              </span>
                                            </div>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setGoals(goals.filter(g => g.id !== goal.id));
                                              toast({
                                                title: 'Goal removed',
                                                description: 'You can always create your own goals.',
                                              });
                                            }}
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                          <div
                                            className={`h-2 rounded-full transition-all ${
                                              isCompleted ? 'bg-emerald-500' :
                                              progress >= 75 ? 'bg-emerald-400' :
                                              progress >= 50 ? 'bg-amber-400' :
                                              progress >= 25 ? 'bg-orange-400' : 'bg-rose-400'
                                            }`}
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* User-Created Goals Section */}
                        {goals.some(g => !g.isSuggested) && (
                          <div>
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                              <Target className="w-4 h-4 text-slate-600" />
                              Your Goals
                            </h3>
                            <div className="space-y-4">
                              {goals
                                .filter(g => !g.isSuggested)
                                .map((goal) => {
                                  const progress = Math.min(100, (goal.current / goal.target) * 100);
                                  const isCompleted = goal.current >= goal.target;
                                  
                                  return (
                                    <Card key={goal.id} className={isCompleted ? 'border-emerald-200 bg-emerald-50/50' : ''}>
                                      <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                              <h4 className="font-semibold text-slate-900">{goal.title}</h4>
                                              {isCompleted && (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                              <span className="font-medium">{goal.current}</span>
                                              <span>/</span>
                                              <span>{goal.target}</span>
                                              <span className="text-emerald-600 font-semibold">
                                                ({Math.round(progress)}%)
                                              </span>
                                            </div>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setGoals(goals.filter(g => g.id !== goal.id));
                                            }}
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                          <div
                                            className={`h-2 rounded-full transition-all ${
                                              isCompleted ? 'bg-emerald-500' :
                                              progress >= 75 ? 'bg-emerald-400' :
                                              progress >= 50 ? 'bg-amber-400' :
                                              progress >= 25 ? 'bg-orange-400' : 'bg-rose-400'
                                            }`}
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </PremiumFeature>
            </TabsContent>
          </Tabs>
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
