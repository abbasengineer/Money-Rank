import React, { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Layout } from '@/components/layout';
import { getResults } from '@/lib/api';
import { OptionCard } from '@/components/challenge/OptionCard';
import { Button } from '@/components/ui/button';
import { Share2, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

export default function Results() {
  const [match, params] = useRoute('/results/:dateKey');
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ['results', params?.dateKey],
    queryFn: async () => {
      if (!params?.dateKey) throw new Error('No date key');
      const challenge = await import('@/lib/api').then(m => m.getChallengeByDateKey(params.dateKey));
      if (!challenge || !challenge.challenge) throw new Error('Challenge not found');
      return await getResults(challenge.challenge.id);
    },
    enabled: !!params?.dateKey,
  });

  useEffect(() => {
    if (!match || !params?.dateKey) {
      setLocation('/');
    }
  }, [match, params?.dateKey, setLocation]);

  useEffect(() => {
    if (!isLoading && (error || !data)) {
      setLocation('/');
    }
  }, [isLoading, error, data, setLocation]);

  if (!match || !params?.dateKey) {
    return null;
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return null;
  }

  const { attempt, challenge, stats } = data;
  
  const userOrderedOptions = attempt.ranking.map(id => 
    challenge.options.find(opt => opt.id === id)!
  );

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Great': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Good': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Risky': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-8">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
          
          <h2 className="text-slate-500 font-medium text-sm uppercase tracking-widest mb-2">Daily Score</h2>
          
          <div className="flex flex-col items-center justify-center">
            <span className={cn("text-5xl sm:text-6xl font-display font-bold mb-2 tracking-tighter", 
              attempt.score >= 90 ? "text-emerald-600" : 
              attempt.score >= 60 ? "text-amber-500" : "text-rose-500"
            )} data-testid="text-score">
              {attempt.score}
            </span>
            <span className={cn("px-4 py-1.5 rounded-full text-sm font-bold border mb-6", getGradeColor(attempt.grade))} data-testid="text-grade">
              {attempt.grade} Choice
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
            <div className="text-center">
              <div className="text-2xl font-display font-bold text-slate-900" data-testid="text-percentile">
                Top {100 - stats.percentile}%
              </div>
              <div className="text-xs text-slate-500 uppercase font-medium mt-1">Percentile</div>
            </div>
            <div className="text-center border-l border-slate-100">
              <div className="text-2xl font-display font-bold text-slate-900" data-testid="text-match">
                {stats.exactMatchPercent}%
              </div>
              <div className="text-xs text-slate-500 uppercase font-medium mt-1">Matched You</div>
            </div>
          </div>
        </motion.div>

        <div>
          <h3 className="text-xl font-display font-bold text-slate-900 mb-4 px-2">Your Ranking Breakdown</h3>
          <div className="space-y-0">
            {userOrderedOptions.map((opt, idx) => (
              <OptionCard key={opt.id} option={opt} index={idx} isResultMode={true} />
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" className="flex-1 h-12 text-slate-700 border-slate-300 hover:bg-slate-50" data-testid="button-share">
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button 
            className="flex-1 h-12 bg-slate-900 text-white hover:bg-slate-800" 
            onClick={() => setLocation('/archive')}
            data-testid="button-archive"
          >
            Past Challenges <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
