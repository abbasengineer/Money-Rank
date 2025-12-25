import React, { useState } from 'react';
import { Reorder } from 'framer-motion';
import { Challenge, ChallengeOption } from '@/lib/types';
import { OptionCard } from './OptionCard';
import { Button } from '@/components/ui/button';
import { submitAttempt } from '@/lib/api';
import { useLocation } from 'wouter';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FinancialTermTooltip } from '@/components/FinancialTermTooltip';

interface ChallengeInterfaceProps {
  challenge: Challenge;
}

export function ChallengeInterface({ challenge }: ChallengeInterfaceProps) {
  const [items, setItems] = useState<ChallengeOption[]>(() => 
    [...challenge.options].sort(() => Math.random() - 0.5)
  );
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async (ranking: string[]) => {
      return await submitAttempt(challenge.id, ranking);
    },
    onSuccess: async () => {
      // Invalidate all related queries to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['today-challenge'] }),
        queryClient.invalidateQueries({ queryKey: ['challenge', challenge.dateKey] }),
        queryClient.invalidateQueries({ queryKey: ['results'] }),
        queryClient.invalidateQueries({ queryKey: ['user-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['archive'] }),
      ]);
      // Small delay to ensure server has processed the attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      // Redirect to results page
      setLocation(`/results/${challenge.dateKey}`);
    },
    onError: (error) => {
      toast({
        title: "Error submitting",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    },
  });

  const handleSubmit = () => {
    const rankingIds = items.map(item => item.id);
    submitMutation.mutate(rankingIds);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border border-slate-200">
            {challenge.category}
          </span>
          <span className="text-slate-400 text-xs font-medium">
            {challenge.dateKey}
          </span>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 mb-4 leading-tight">
          {challenge.title}
        </h1>
        
        <p className="text-lg text-slate-700 leading-relaxed mb-6">
          <FinancialTermTooltip text={challenge.scenario} />
        </p>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2">
            Assumptions
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            <FinancialTermTooltip text={challenge.assumptions} />
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-sm font-medium text-slate-500">
          Drag to rank from <span className="text-emerald-600 font-bold">Best</span> (1) to <span className="text-rose-500 font-bold">Worst</span> (4)
        </p>
      </div>

      <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-0">
        {items.map((item, index) => (
          <OptionCard key={item.id} option={item} index={index} />
        ))}
      </Reorder.Group>

      <div className="pt-4">
        <Button 
          onClick={handleSubmit} 
          disabled={submitMutation.isPending}
          className="w-full h-14 text-lg font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200/50 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
          data-testid="button-submit"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Calculating Score...
            </>
          ) : (
            <>
              Submit Ranking
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
