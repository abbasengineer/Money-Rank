import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, logout, getGoogleAuthUrl, getFacebookAuthUrl, register, login, type AuthUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, User as UserIcon, Facebook } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function UserAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const { data: authData, isLoading } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      window.location.href = '/';
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      setLoginDialogOpen(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
      toast({ title: 'Success', description: 'Account created successfully!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Registration failed', 
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
      setLoginDialogOpen(false);
      setEmail('');
      setPassword('');
      toast({ title: 'Success', description: 'Logged in successfully!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Login failed', 
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        Loading...
      </Button>
    );
  }

  const user = authData?.user;
  const isAuthenticated = authData?.isAuthenticated;

  if (isAuthenticated && user) {
    const initials = user.displayName
      ? user.displayName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : user.email?.[0].toUpperCase() || 'U';

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <Avatar className="w-7 h-7">
              <AvatarImage src={user.avatar || undefined} alt={user.displayName || 'User'} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium text-slate-700">
              {user.displayName || user.email || 'User'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user.displayName || 'User'}</p>
            {user.email && (
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/profile" className="flex items-center gap-2 cursor-pointer">
              <UserIcon className="w-4 h-4" />
              Profile
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="text-rose-600 focus:text-rose-600"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const handleEmailSubmit = async (e: React.FormEvent, isLogin: boolean) => {
    e.preventDefault();
    if (isLogin) {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ email, password, displayName: displayName || undefined });
    }
  };

  return (
    <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <span className="hidden sm:inline">Sign in</span>
          <span className="sm:hidden">Sign in</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to MoneyRank</DialogTitle>
          <DialogDescription>
            Choose your preferred sign-in method
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="options" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="options">Quick Sign In</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>
          
          <TabsContent value="options" className="space-y-3 mt-4">
            <Button
              variant="outline"
              className="w-full flex items-center gap-3"
              onClick={() => {
                window.location.href = getGoogleAuthUrl();
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
            
            <Button
              variant="outline"
              className="w-full flex items-center gap-3"
              onClick={() => {
                window.location.href = getFacebookAuthUrl();
              }}
            >
              <Facebook className="w-5 h-5 text-blue-600" />
              Continue with Facebook
            </Button>
          </TabsContent>
          
          <TabsContent value="email" className="space-y-4 mt-4">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={(e) => handleEmailSubmit(e, true)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={(e) => handleEmailSubmit(e, false)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Display Name (optional)</Label>
                    <Input
                      id="register-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                    <p className="text-xs text-slate-500">Must be at least 8 characters</p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? 'Creating account...' : 'Create account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
