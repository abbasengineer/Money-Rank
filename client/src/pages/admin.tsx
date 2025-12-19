import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { dateKeyToLocalDate } from '@/lib/utils';
import { Plus, Pencil, Trash2, Users, Target, Calendar, Activity, LogOut, Loader2, Eye, EyeOff } from 'lucide-react';
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
  deleteAdminChallenge 
} from '@/lib/api';

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
  isEditing = false 
}: { 
  challenge: Omit<Challenge, 'id'> | Challenge; 
  onSave: (data: any) => void; 
  onCancel: () => void;
  isEditing?: boolean;
}) {
  const [formData, setFormData] = useState(challenge);
  const [saving, setSaving] = useState(false);

  const updateOption = (index: number, field: keyof ChallengeOption, value: any) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        />
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
        <Button type="submit" disabled={saving} className="flex-1" data-testid="button-save-challenge">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {isEditing ? 'Update' : 'Create'} Challenge
        </Button>
      </div>
    </form>
  );
}

export default function Admin() {
  const [token, setToken] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
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
      const [analyticsData, challengesData] = await Promise.all([
        getAdminAnalytics(token!),
        getAdminChallenges(token!),
      ]);
      setAnalytics(analyticsData);
      setChallenges(challengesData);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
      handleLogout();
    }
    setLoading(false);
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
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create challenge', variant: 'destructive' });
    }
  };

  const handleUpdateChallenge = async (data: any) => {
    try {
      await updateAdminChallenge(token!, editingChallenge!.id, data);
      toast({ title: 'Success', description: 'Challenge updated' });
      setEditingChallenge(null);
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update challenge', variant: 'destructive' });
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
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
