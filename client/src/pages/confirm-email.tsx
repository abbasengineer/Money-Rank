import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/api';

export default function ConfirmEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if user is logged in and already has email
  useEffect(() => {
    const checkUser = async () => {
      try {
        const authData = await getCurrentUser();
        if (authData?.user?.email) {
          // User already has email, redirect to home
          setLocation('/');
          return;
        }
        if (!authData?.isAuthenticated) {
          // Not logged in, redirect to home
          setLocation('/');
          return;
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setChecking(false);
      }
    };
    
    checkUser();
  }, [setLocation]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    // Client-side email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/auth/set-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set email');
      }
      
      toast({
        title: 'Email set successfully!',
        description: 'Your email has been saved.',
      });
      
      // Redirect to home after a brief delay
      setTimeout(() => {
        setLocation('/');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to set email');
      toast({
        title: 'Error',
        description: err.message || 'Failed to set email',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Account</CardTitle>
          <CardDescription>
            Facebook didn't provide your email address. Please enter it below to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="your@email.com"
                required
                disabled={loading}
                className={error ? 'border-red-500' : ''}
              />
              <p className="text-xs text-slate-500">
                This email will be associated with your account and cannot be changed later.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Setting Email...' : 'Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

