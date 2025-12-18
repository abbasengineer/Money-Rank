import React from 'react';
import { Link, useLocation } from 'wouter';
import { Zap, User, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { getUserStats } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  
  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: getUserStats,
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
            {stats && stats.streak > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full text-amber-700 text-sm font-medium">
                <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>{stats.streak}</span>
              </div>
            )}

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

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden -mr-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <nav className="flex flex-col gap-4 mt-8">
                   {stats && stats.streak > 0 && (
                     <div className="flex items-center gap-2 px-2 py-3 mb-4 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 font-medium">
                      <Zap className="w-5 h-5 fill-amber-500 text-amber-500" />
                      <span>{stats.streak} Day Streak</span>
                    </div>
                   )}
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
    </div>
  );
}
