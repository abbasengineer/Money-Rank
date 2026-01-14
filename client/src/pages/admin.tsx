import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { dateKeyToLocalDate } from '@/lib/utils';
import { Plus, Pencil, Trash2, Users, Target, Calendar, Activity, LogOut, Loader2, Eye, EyeOff, BarChart3, TrendingUp, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  adminLogin, 
  getAdminAnalytics, 
  getAdminChallenges, 
  createAdminChallenge, 
  updateAdminChallenge, 
  deleteAdminChallenge,
  getAdminChallengeStats,
  getCategoryAnalytics,
  getUserByEmail,
  getAdminUserRiskProfile
} from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search } from 'lucide-react';

const TIER_OPTIONS = ['Optimal', 'Reasonable', 'Risky'];
const CATEGORIES = ['Budgeting', 'Investing', 'Debt', 'Car Deals', 'Insurance', 'Retirement', 'Taxes', 'Real Estate'];

interface ChallengeOption {
  optionText: string;
  tierLabel: string;
  explanationShort: string;
  orderingIndex: number;
}

interface Challenge {
  id: string;
  dateKey: string;
  title: string;
  scenarioText: string;
  assumptions: string;
  category: string;
  difficulty: number;
  isPublished: boolean;
  options: ChallengeOption[];
}

const defaultOption = (): ChallengeOption => ({
  optionText: '',
  tierLabel: 'Optimal',
  explanationShort: '',
  orderingIndex: 1,
});

const defaultChallenge = (): Omit<Challenge, 'id'> => ({
  dateKey: format(new Date(), 'yyyy-MM-dd'),
  title: '',
  scenarioText: '',
  assumptions: '',
  category: 'Budgeting',
  difficulty: 1,
  isPublished: false,
  options: [
    { ...defaultOption(), orderingIndex: 1 },
    { ...defaultOption(), orderingIndex: 2, tierLabel: 'Optimal' },
    { ...defaultOption(), orderingIndex: 3, tierLabel: 'Reasonable' },
    { ...defaultOption(), orderingIndex: 4, tierLabel: 'Risky' },
  ],
});

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await adminLogin(password);
      onLogin(result.token);
      localStorage.setItem('admin_token', result.token);
    } catch (error) {
      toast({ title: 'Login failed', description: 'Invalid password', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-xl mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">$</div>
          <h1 className="text-2xl font-bold text-slate-900">MoneyRank Admin</h1>
          <p className="text-slate-500 mt-2">Enter password to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="pr-10"
              data-testid="input-admin-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-admin-login">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}

function ChallengeForm({ 
  challenge, 
  onSave, 
  onCancel,
  isEditing = false,
  token
}: { 
  challenge: Omit<Challenge, 'id'> | Challenge; 
  onSave: (data: any) => void; 
  onCancel: () => void;
  isEditing?: boolean;
  token: string | null;
}) {
  const [formData, setFormData] = useState(challenge);
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isDuplicate: boolean;
    message?: string;
    existingChallenge?: any;
  } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Check for duplicates when dateKey or title changes
  React.useEffect(() => {
    if (!token || !formData.dateKey || !formData.title) {
      setDuplicateWarning(null);
      return;
    }

    // Debounce the check
    const timeoutId = setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const { checkDuplicateChallenge } = await import('@/lib/api');
        const challengeId = 'id' in challenge ? challenge.id : undefined;
        const result = await checkDuplicateChallenge(token, formData.dateKey, formData.title, challengeId);
        setDuplicateWarning(result);
      } catch (error) {
        console.error('Error checking for duplicates:', error);
        setDuplicateWarning(null);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [formData.dateKey, formData.title, token, challenge]);

  const updateOption = (index: number, field: keyof ChallengeOption, value: any) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if duplicate detected
    if (duplicateWarning?.isDuplicate) {
      return;
    }
    
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto p-1">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date Key</Label>
          <Input
            type="date"
            value={formData.dateKey}
            onChange={(e) => setFormData({ ...formData, dateKey: e.target.value })}
            data-testid="input-datekey"
          />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger data-testid="select-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Title</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Subscription Audit"
          data-testid="input-title"
          className={duplicateWarning?.isDuplicate ? 'border-rose-500' : ''}
        />
        {checkingDuplicate && (
          <p className="text-xs text-slate-500 mt-1">Checking for duplicates...</p>
        )}
        {duplicateWarning?.isDuplicate && (
          <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-sm font-semibold text-rose-800 mb-1">⚠️ Duplicate Detected</p>
            <p className="text-xs text-rose-700">{duplicateWarning.message}</p>
            {duplicateWarning.existingChallenge && (
              <p className="text-xs text-rose-600 mt-1">
                Existing challenge: {duplicateWarning.existingChallenge.dateKey} - {duplicateWarning.existingChallenge.title}
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <Label>Scenario</Label>
        <Textarea
          value={formData.scenarioText}
          onChange={(e) => setFormData({ ...formData, scenarioText: e.target.value })}
          placeholder="Describe the financial scenario..."
          rows={3}
          data-testid="input-scenario"
        />
      </div>

      <div>
        <Label>Assumptions</Label>
        <Textarea
          value={formData.assumptions}
          onChange={(e) => setFormData({ ...formData, assumptions: e.target.value })}
          placeholder="List any assumptions..."
          rows={2}
          data-testid="input-assumptions"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Difficulty (1-5)</Label>
          <Input
            type="number"
            min={1}
            max={5}
            value={formData.difficulty}
            onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) || 1 })}
            data-testid="input-difficulty"
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch
            checked={formData.isPublished}
            onCheckedChange={(v) => setFormData({ ...formData, isPublished: v })}
            data-testid="switch-published"
          />
          <Label>Published</Label>
        </div>
      </div>

      <div className="border-t pt-4">
        <Label className="text-lg font-semibold">Options (4 required)</Label>
        <div className="space-y-4 mt-3">
          {formData.options.map((option, index) => (
            <div key={index} className="bg-slate-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <Select 
                  value={option.tierLabel} 
                  onValueChange={(v) => updateOption(index, 'tierLabel', v)}
                >
                  <SelectTrigger className="w-32" data-testid={`select-tier-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_OPTIONS.map(tier => (
                      <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={option.optionText}
                onChange={(e) => updateOption(index, 'optionText', e.target.value)}
                placeholder="Option text..."
                className="mb-2"
                data-testid={`input-option-text-${index}`}
              />
              <Input
                value={option.explanationShort}
                onChange={(e) => updateOption(index, 'explanationShort', e.target.value)}
                placeholder="Short explanation..."
                data-testid={`input-option-explanation-${index}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={saving || duplicateWarning?.isDuplicate || checkingDuplicate} 
          className="flex-1" 
          data-testid="button-save-challenge"
        >
          {saving || checkingDuplicate ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {saving ? 'Saving...' : checkingDuplicate ? 'Checking...' : (isEditing ? 'Update' : 'Create')} Challenge
        </Button>
      </div>
    </form>
  );
}

function exportCategoryAnalyticsToCSV(categoryAnalytics: any) {
  if (!categoryAnalytics?.categories) return;

  // Create CSV header
  const headers = [
    'Category',
    'Average Score',
    'Total Attempts',
    'Risk Rate (%)',
    'Income Bracket',
    'Age Group',
    'Average Age',
    'Demographic Avg Score',
    'Demographic Risk Rate (%)',
    'User Count'
  ];

  // Create rows
  const rows: string[][] = [];
  
  categoryAnalytics.categories.forEach((cat: any) => {
    const hasDemographics = Object.keys(cat.demographicBreakdown).length > 0;
    
    if (hasDemographics) {
      // One row per income bracket and age group combination
      Object.entries(cat.demographicBreakdown).forEach(([income, data]: [string, any]) => {
        if (data.ageGroups) {
          // New format with age groups
          Object.entries(data.ageGroups).forEach(([ageGroup, ageData]: [string, any]) => {
            rows.push([
              cat.category,
              cat.avgScore.toString(),
              cat.totalAttempts.toString(),
              (Math.round(cat.riskChoiceRate * 100)).toString(),
              income === 'unknown' ? 'Unknown' : income,
              ageGroup,
              ageData.avgAge ? ageData.avgAge.toString() : 'N/A',
              ageData.avgScore.toString(),
              (Math.round(ageData.riskRate * 100)).toString(),
              ageData.count.toString()
            ]);
          });
        } else {
          // Legacy format (backward compatibility)
          rows.push([
            cat.category,
            cat.avgScore.toString(),
            cat.totalAttempts.toString(),
            (Math.round(cat.riskChoiceRate * 100)).toString(),
            income === 'unknown' ? 'Unknown' : income,
            'N/A',
            'N/A',
            data.avgScore?.toString() || 'N/A',
            data.riskRate ? (Math.round(data.riskRate * 100)).toString() : 'N/A',
            data.count?.toString() || '0'
          ]);
        }
      });
    } else {
      // No demographics, just category summary
      rows.push([
        cat.category,
        cat.avgScore.toString(),
        cat.totalAttempts.toString(),
        (Math.round(cat.riskChoiceRate * 100)).toString(),
        'N/A',
        'N/A',
        'N/A',
        'N/A',
        'N/A',
        '0'
      ]);
    }
  });

  // Convert to CSV format
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `category-analytics-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function Admin() {
  const [token, setToken] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [categoryAnalytics, setCategoryAnalytics] = useState<any>(null);
  const [selectedChallengeStats, setSelectedChallengeStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [userSearchEmail, setUserSearchEmail] = useState('');
  const [userRiskProfile, setUserRiskProfile] = useState<any>(null);
  const [loadingUserProfile, setLoadingUserProfile] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsData, challengesData, categoryData] = await Promise.all([
        getAdminAnalytics(token!),
        getAdminChallenges(token!),
        getCategoryAnalytics(token!),
      ]);
      setAnalytics(analyticsData);
      setChallenges(challengesData);
      setCategoryAnalytics(categoryData);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
      handleLogout();
    }
    setLoading(false);
  };

  const loadChallengeStats = async (challengeId: string) => {
    setLoadingStats(true);
    try {
      const stats = await getAdminChallengeStats(token!, challengeId);
      setSelectedChallengeStats(stats);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load challenge statistics', variant: 'destructive' });
    }
    setLoadingStats(false);
  };

  const handleUserSearch = async () => {
    if (!userSearchEmail || !token) return;
    setLoadingUserProfile(true);
    setUserRiskProfile(null);
    try {
      const user = await getUserByEmail(token, userSearchEmail);
      if (user) {
        const riskProfile = await getAdminUserRiskProfile(token, user.id);
        setUserRiskProfile(riskProfile);
      } else {
        toast({ title: 'Not Found', description: 'No user found with that email address', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to load user profile', 
        variant: 'destructive' 
      });
    }
    setLoadingUserProfile(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  const handleCreateChallenge = async (data: any) => {
    try {
      await createAdminChallenge(token!, data);
      toast({ title: 'Success', description: 'Challenge created' });
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create challenge';
      toast({ 
        title: 'Error', 
        description: errorMessage,
        variant: 'destructive' 
      });
    }
  };

  const handleUpdateChallenge = async (data: any) => {
    try {
      await updateAdminChallenge(token!, editingChallenge!.id, data);
      toast({ title: 'Success', description: 'Challenge updated' });
      setEditingChallenge(null);
      loadData();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update challenge';
      toast({ 
        title: 'Error', 
        description: errorMessage,
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteChallenge = async (id: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;
    try {
      await deleteAdminChallenge(token!, id);
      toast({ title: 'Success', description: 'Challenge deleted' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete challenge', variant: 'destructive' });
    }
  };

  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">$</div>
            <div>
              <h1 className="font-bold text-xl text-slate-900">MoneyRank Admin</h1>
              <p className="text-sm text-slate-500">Manage challenges and view analytics</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-slate-500">Total Users</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{analytics?.totalUsers || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-slate-500">Total Attempts</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{analytics?.totalAttempts || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-slate-500">Challenges</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{analytics?.totalChallenges || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-slate-500">Avg Score</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{analytics?.avgScore || 0}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-lg text-slate-900">Challenges</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-challenge">
                  <Plus className="w-4 h-4 mr-2" />
                  New Challenge
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Challenge</DialogTitle>
                </DialogHeader>
                <ChallengeForm 
                  challenge={defaultChallenge()} 
                  onSave={handleCreateChallenge} 
                  onCancel={() => setDialogOpen(false)}
                  token={token}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="divide-y divide-slate-100">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex flex-col items-center justify-center text-slate-500 border">
                    <span className="text-xs font-semibold">{format(dateKeyToLocalDate(challenge.dateKey), 'MMM')}</span>
                    <span className="text-lg font-bold leading-none">{format(dateKeyToLocalDate(challenge.dateKey), 'd')}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{challenge.title}</span>
                      {challenge.isPublished ? (
                        <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">Published</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded-full">Draft</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500">{challenge.category} • Difficulty {challenge.difficulty}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => loadChallengeStats(challenge.id)}
                    title="View Statistics"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setEditingChallenge(challenge)}
                    data-testid={`button-edit-${challenge.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteChallenge(challenge.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    data-testid={`button-delete-${challenge.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Section */}
        <div className="bg-white rounded-xl border border-slate-200 mt-8">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-bold text-lg text-slate-900">Analytics</h2>
          </div>
          <Tabs defaultValue="categories" className="p-4">
            <TabsList>
              <TabsTrigger value="categories">Category Analytics</TabsTrigger>
              <TabsTrigger value="challenges">Challenge Stats</TabsTrigger>
              <TabsTrigger value="users">User Lookup</TabsTrigger>
            </TabsList>
            
            <TabsContent value="categories" className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">Category performance by income bracket and age group</p>
                <Button
                  onClick={() => exportCategoryAnalyticsToCSV(categoryAnalytics)}
                  variant="outline"
                  size="sm"
                  disabled={!categoryAnalytics?.categories || categoryAnalytics.categories.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
              </div>
              {categoryAnalytics?.categories && categoryAnalytics.categories.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {categoryAnalytics.categories.map((cat: any) => (
                    <AccordionItem key={cat.category} value={cat.category} className="border border-slate-200 rounded-lg mb-2 px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <h3 className="font-semibold text-lg">{cat.category}</h3>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-600">Avg Score: <span className="font-bold">{cat.avgScore}</span></span>
                            <span className="text-slate-600">Attempts: <span className="font-bold">{cat.totalAttempts}</span></span>
                            <span className={`font-bold ${cat.riskChoiceRate > 0.3 ? 'text-red-600' : cat.riskChoiceRate > 0.2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              Risk Rate: {Math.round(cat.riskChoiceRate * 100)}%
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {Object.keys(cat.demographicBreakdown).length > 0 && (
                          <div className="pt-3">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Demographic Breakdown</h4>
                            {Object.entries(cat.demographicBreakdown).map(([income, data]: [string, any]) => (
                              <div key={income} className="mb-4">
                                <h5 className="text-xs font-bold text-slate-800 mb-2">
                                  {income === 'unknown' ? 'Unknown Income' : `Income: ${income}`}
                                </h5>
                                {data.ageGroups ? (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {Object.entries(data.ageGroups).map(([ageGroup, ageData]: [string, any]) => (
                                      <div key={ageGroup} className="bg-white p-2 rounded text-xs border border-slate-200">
                                        <div className="font-semibold text-slate-900">Age: {ageGroup}</div>
                                        {ageData.avgAge && <div className="text-slate-500 text-[10px]">Avg: {ageData.avgAge} yrs</div>}
                                        <div className="text-slate-600">Score: {ageData.avgScore}</div>
                                        <div className={`font-bold ${ageData.riskRate > 0.3 ? 'text-red-600' : 'text-slate-600'}`}>
                                          Risk: {Math.round(ageData.riskRate * 100)}%
                                        </div>
                                        <div className="text-slate-500">({ageData.count} users)</div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  // Legacy format (backward compatibility)
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-white p-2 rounded text-xs">
                                      <div className="text-slate-600">Score: {data.avgScore}</div>
                                      <div className={`font-bold ${data.riskRate > 0.3 ? 'text-red-600' : 'text-slate-600'}`}>
                                        Risk: {Math.round(data.riskRate * 100)}%
                                      </div>
                                      <div className="text-slate-500">({data.count} users)</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-slate-500 text-center py-8">No category data available</p>
              )}
            </TabsContent>

            <TabsContent value="challenges" className="mt-4">
              <p className="text-sm text-slate-600 mb-4">Click the chart icon on any challenge to view detailed statistics</p>
              {selectedChallengeStats && (
                <div className="bg-slate-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2">{selectedChallengeStats.challengeTitle}</h3>
                  <p className="text-sm text-slate-600 mb-4">Total Attempts: {selectedChallengeStats.totalAttempts}</p>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Top Choice (Position 1) Distribution
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(selectedChallengeStats.topPickStats).map(([optionId, stats]: [string, any]) => (
                          <div key={optionId} className="bg-white p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{stats.optionText}</span>
                              <span className="text-sm font-bold">{stats.percentage}% ({stats.count})</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className="bg-emerald-600 h-2 rounded-full transition-all"
                                style={{ width: `${stats.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="users" className="mt-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter user email address"
                    value={userSearchEmail}
                    onChange={(e) => setUserSearchEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUserSearch();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleUserSearch}
                    disabled={loadingUserProfile || !userSearchEmail}
                  >
                    {loadingUserProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Search
                  </Button>
                </div>

                {userRiskProfile && (
                  <div className="bg-slate-50 p-6 rounded-lg border space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">Risk Profile</h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                        userRiskProfile.overallRiskScore >= 50 ? 'bg-red-100 text-red-700' :
                        userRiskProfile.overallRiskScore >= 30 ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        Overall Risk: {userRiskProfile.overallRiskScore}%
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-sm text-slate-600">Total Attempts</div>
                        <div className="text-2xl font-bold text-slate-900">{userRiskProfile.totalAttempts}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-sm text-slate-600">Average Score</div>
                        <div className="text-2xl font-bold text-slate-900">{userRiskProfile.averageScore}</div>
                      </div>
                      {userRiskProfile.demographics && (
                        <>
                          {userRiskProfile.demographics.age && (
                            <div className="bg-white p-3 rounded-lg">
                              <div className="text-sm text-slate-600">Age</div>
                              <div className="text-2xl font-bold text-slate-900">{userRiskProfile.demographics.age}</div>
                            </div>
                          )}
                          {userRiskProfile.demographics.incomeBracket && (
                            <div className="bg-white p-3 rounded-lg">
                              <div className="text-sm text-slate-600">Income Bracket</div>
                              <div className="text-lg font-bold text-slate-900">
                                {userRiskProfile.demographics.incomeBracket
                                  .replace('<50k', '< $50k')
                                  .replace('50-100k', '$50k-$100k')
                                  .replace('100-150k', '$100k-$150k')
                                  .replace('150-200k', '$150k-$200k')
                                  .replace('200-300k', '$200k-$300k')
                                  .replace('300k+', '$300k+')}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Risk by Category</h4>
                      <div className="space-y-2">
                        {Object.entries(userRiskProfile.categoryRiskScores || {}).map(([category, riskScore]: [string, any]) => (
                          <div key={category} className="bg-white p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-slate-900">{category}</span>
                              <span className={`text-sm font-bold ${
                                riskScore >= 50 ? 'text-red-600' :
                                riskScore >= 30 ? 'text-amber-600' :
                                'text-emerald-600'
                              }`}>
                                {riskScore}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  riskScore >= 50 ? 'bg-red-600' :
                                  riskScore >= 30 ? 'bg-amber-600' :
                                  'bg-emerald-600'
                                }`}
                                style={{ width: `${riskScore}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {Object.values(userRiskProfile.conversionSignals || {}).some((signal: any) => signal) && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Conversion Signals
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {userRiskProfile.conversionSignals.needsInsurance && (
                            <div className="bg-amber-50 border border-amber-200 p-2 rounded text-sm text-amber-800">
                              Needs Insurance Advice
                            </div>
                          )}
                          {userRiskProfile.conversionSignals.needsInvestmentAdvice && (
                            <div className="bg-amber-50 border border-amber-200 p-2 rounded text-sm text-amber-800">
                              Needs Investment Advice
                            </div>
                          )}
                          {userRiskProfile.conversionSignals.needsDebtHelp && (
                            <div className="bg-amber-50 border border-amber-200 p-2 rounded text-sm text-amber-800">
                              Needs Debt Help
                            </div>
                          )}
                          {userRiskProfile.conversionSignals.needsRetirementPlanning && (
                            <div className="bg-amber-50 border border-amber-200 p-2 rounded text-sm text-amber-800">
                              Needs Retirement Planning
                            </div>
                          )}
                          {userRiskProfile.conversionSignals.needsTaxAdvice && (
                            <div className="bg-amber-50 border border-amber-200 p-2 rounded text-sm text-amber-800">
                              Needs Tax Advice
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={!!editingChallenge} onOpenChange={(open) => !open && setEditingChallenge(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Challenge</DialogTitle>
            </DialogHeader>
            {editingChallenge && (
              <ChallengeForm 
                challenge={editingChallenge} 
                onSave={handleUpdateChallenge} 
                onCancel={() => setEditingChallenge(null)}
                isEditing 
                token={token}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
