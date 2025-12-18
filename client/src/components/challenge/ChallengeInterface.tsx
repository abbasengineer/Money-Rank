import React, { useState } from 'react';
import { Reorder } from 'framer-motion';
import { Challenge, ChallengeOption } from '@/lib/types';
import { OptionCard } from './OptionCard';
import { Button } from '@/components/ui/button';
import { submitAttempt } from '@/lib/mockData';
import { useLocation } from 'wouter';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChallengeInterfaceProps {
  challenge: Challenge;
}

export const ChallengeInterface = ({ challenge }: ChallengeInterfaceProps) => {
  // Randomize initial order so it's not pre-solved
  const [items, setItems] = useState<ChallengeOption[]>(() => 
    [...challenge.options].sort(() => Math.random() - 0.5)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const rankingIds = items.map(item => item.id);
      submitAttempt(challenge.id, rankingIds);
      
      setLocation(`/results/${challenge.dateKey}`);
    } catch (error) {
      toast({
        title: "Error submitting",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scenario Header */}
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
          {challenge.scenario}
        </p>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2">
            Assumptions
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {challenge.assumptions}
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm font-medium text-slate-500">
          Drag to rank from <span className="text-emerald-600 font-bold">Best</span> (1) to <span className="text-rose-500 font-bold">Worst</span> (4)
        </p>
      </div>

      {/* Drag List */}
      <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-0">
        {items.map((item, index) => (
          <OptionCard key={item.id} option={item} index={index} />
        ))}
      </Reorder.Group>

      {/* Submit Action */}
      <div className="pt-4">
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="w-full h-14 text-lg font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200/50 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          {isSubmitting ? (
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
};
