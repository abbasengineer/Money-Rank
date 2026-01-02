import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, updateProfile, type AuthUser } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface ProfileOnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function ProfileOnboardingDialog({ open, onComplete, onSkip }: ProfileOnboardingDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [birthday, setBirthday] = useState('');
  const [incomeBracket, setIncomeBracket] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: authData } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
  });

  const user = authData?.user;
  const isAuthenticated = authData?.isAuthenticated;

  // Initialize form with existing values if any
  useEffect(() => {
    if (user) {
      setBirthday(user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : '');
      setIncomeBracket(user.incomeBracket || '');
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      sessionStorage.setItem('onboarding_shown', 'true');
      toast({ title: 'Success', description: 'Profile updated!' });
      onComplete();
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error', 
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfileMutation.mutateAsync({
        birthday: birthday || null,
        incomeBracket: incomeBracket || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    // Store in localStorage that user skipped onboarding
    localStorage.setItem('profile_onboarding_skipped', Date.now().toString());
    sessionStorage.setItem('onboarding_shown', 'true');
    onSkip();
  };

  if (!isAuthenticated || !user) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Help us personalize your experience by sharing a bit about yourself
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="onboarding-birthday">Birthday (optional)</Label>
            <Input
              id="onboarding-birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-slate-500">We use this to provide age-appropriate insights</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboarding-income">Income Bracket (optional)</Label>
            <Select value={incomeBracket} onValueChange={setIncomeBracket}>
              <SelectTrigger id="onboarding-income">
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
            <p className="text-xs text-slate-500">Helps us provide relevant financial guidance</p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleSkip}
              className="flex-1"
            >
              Skip for now
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save & Continue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

