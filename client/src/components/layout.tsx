import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Zap, User, Menu, X, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getUserStats, getCurrentUser } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { UserAuth } from '@/components/UserAuth';
import { ProfileOnboardingDialog } from './ProfileOnboardingDialog';

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const { data: authData } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
  });

  const isAuthenticated = authData?.isAuthenticated;
  const user = authData?.user;

  // Check if profile needs completion after login (OAuth or email)
  useEffect(() => {
    if (isAuthenticated && user) {
      const isProfileIncomplete = !user.birthday || !user.incomeBracket;
      const skippedTimestamp = localStorage.getItem('profile_onboarding_skipped');
      const hasSeenOnboarding = sessionStorage.getItem('onboarding_shown');
      
      if (isProfileIncomplete && !hasSeenOnboarding) {
        // Check if user skipped recently (within 7 days)
        const shouldShow = !skippedTimestamp || 
          (Date.now() - parseInt(skippedTimestamp)) > 7 * 24 * 60 * 60 * 1000;
        
        if (shouldShow) {
          // Small delay to let the UI settle after redirect
          const timer = setTimeout(() => {
            setShowOnboarding(true);
            sessionStorage.setItem('onboarding_shown', 'true');
          }, 500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isAuthenticated, user]);
  
  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: getUserStats,
    enabled: !!isAuthenticated, // Only fetch stats if user is authenticated
    retry: false,
  });

  const navLinks = [
    { href: '/', label: 'Today' },
    { href: '/archive', label: 'Archive' },
    { href: '/profile', label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-2xl">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-display font-bold text-xl shadow-emerald-200 shadow-lg group-hover:scale-105 transition-transform">
              $
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-slate-900">
              MoneyRank
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated && stats && stats.streak > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full text-amber-700 text-sm font-medium">
                <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>{stats.streak}</span>
              </div>
            )}

            {/* Help/Instructions Button */}
            <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                  aria-label="Help & Instructions"
                >
                  <HelpCircle className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display font-bold text-slate-900">
                    How to Play MoneyRank
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <section>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">📋 The Challenge</h3>
                    <p className="text-slate-700 leading-relaxed">
                      Each day, you'll see a financial scenario with 4 options. Your goal is to rank them from <strong>best to worst</strong> financial decision.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">🎯 How to Rank</h3>
                    <ol className="list-decimal list-inside space-y-2 text-slate-700">
                      <li>Read the scenario and assumptions carefully</li>
                      <li>Drag and drop the options to rank them 1-4 (best to worst)</li>
                      <li>Click "Submit Ranking" when you're ready</li>
                    </ol>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">⭐ Scoring</h3>
                    <p className="text-slate-700 leading-relaxed mb-3">
                      Your score is based on how close your ranking matches the optimal financial decision:
                    </p>
                    <ul className="space-y-2 text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">Great (90-100):</span>
                        <span>Excellent financial decision-making</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">Good (60-89):</span>
                        <span>Solid understanding with room for improvement</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-600 font-bold">Risky (0-59):</span>
                        <span>May need to review financial fundamentals</span>
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">🏆 Badges & Achievements</h3>
                    <p className="text-slate-700 leading-relaxed mb-3">
                      Earn badges by:
                    </p>
                    <ul className="space-y-2 text-slate-700 list-disc list-inside">
                      <li>Completing challenges consistently</li>
                      <li>Maintaining daily streaks</li>
                      <li>Achieving high scores</li>
                      <li>Ranking in top percentiles</li>
                    </ul>
                    <p className="text-slate-600 text-sm mt-3 italic">
                      Rare, Epic, and Legendary badges require maintaining streaks and consistent performance.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">💡 Tips</h3>
                    <ul className="space-y-2 text-slate-700 list-disc list-inside">
                      <li>Consider high-interest debt as a priority (it's guaranteed return)</li>
                      <li>Emergency funds should typically come before aggressive investing</li>
                      <li>Take advantage of employer 401k matches (free money!)</li>
                      <li>Read the assumptions carefully - they provide important context</li>
                    </ul>
                  </section>

                  <section className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">⚠️ Important</h3>
                    <p className="text-slate-700 leading-relaxed">
                      MoneyRank is an educational tool and does not constitute financial advice. 
                      Always consult with a qualified financial advisor for personal financial decisions.
                    </p>
                  </section>
                </div>
              </DialogContent>
            </Dialog>

            <nav className="hidden sm:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-emerald-600 ${
                    location === link.href ? 'text-emerald-600' : 'text-slate-600'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden sm:block">
              <UserAuth />
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden -mr-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <nav className="flex flex-col gap-4 mt-8">
                   {isAuthenticated && stats && stats.streak > 0 && (
                     <div className="flex items-center gap-2 px-2 py-3 mb-4 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-medium">
                      <Zap className="w-5 h-5 fill-amber-500 text-amber-500" />
                      <span>{stats.streak} Day Streak</span>
                    </div>
                   )}
                   
                   {/* Help button in mobile menu */}
                   <Button
                     variant="ghost"
                     onClick={() => setHelpOpen(true)}
                     className="text-lg font-medium px-2 py-2 rounded-md text-slate-600 hover:bg-slate-50 justify-start"
                   >
                     <HelpCircle className="w-5 h-5 mr-2" />
                     Help & Instructions
                   </Button>
                   
                  {navLinks.map((link) => (
                    <Link 
                      key={link.href} 
                      href={link.href}
                      className={`text-lg font-medium px-2 py-2 rounded-md transition-colors ${
                        location === link.href ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <UserAuth />
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      <footer className="border-t border-slate-200 py-8 bg-white">
        <div className="container mx-auto px-4 max-w-2xl text-center text-slate-500 text-sm">
          <p>© 2024 MoneyRank. Not financial advice.</p>
        </div>
      </footer>

      <ProfileOnboardingDialog
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onSkip={() => setShowOnboarding(false)}
      />
    </div>
  );
}
