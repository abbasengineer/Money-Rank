import React, { useState, useMemo } from 'react';
import { Challenge, ChallengeOption } from '@/lib/types';
import { OptionCard } from './OptionCard';
import { Button } from '@/components/ui/button';
import { submitAttempt } from '@/lib/api';
import { useLocation } from 'wouter';
import { ArrowRight, Loader2, Undo2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FinancialTermTooltip } from '@/components/FinancialTermTooltip';

interface ChallengeInterfaceProps {
  challenge: Challenge;
}

export function ChallengeInterface({ challenge }: ChallengeInterfaceProps) {
  // Selected ranking: array of 4 slots, each containing an option ID or null
  const [selectedRanking, setSelectedRanking] = useState<(string | null)[]>([null, null, null, null]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Calculate available options (not yet selected)
  const availableOptions = useMemo(() => {
    const selectedIds = new Set(selectedRanking.filter(id => id !== null));
    return challenge.options.filter(opt => !selectedIds.has(opt.id));
  }, [challenge.options, selectedRanking]);
  
  // Find current step (first null slot index, or 4 if all filled)
  const currentStep = useMemo(() => {
    const firstNullIndex = selectedRanking.findIndex(id => id === null);
    return firstNullIndex === -1 ? 4 : firstNullIndex + 1;
  }, [selectedRanking]);
  
  // Check if ranking is complete
  const isComplete = useMemo(() => {
    return selectedRanking.every(id => id !== null);
  }, [selectedRanking]);

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

  const handleOptionSelect = (optionId: string) => {
    if (isComplete) return; // Don't allow selection if already complete
    
    const newRanking = [...selectedRanking];
    const nextSlotIndex = newRanking.findIndex(id => id === null);
    
    if (nextSlotIndex !== -1) {
      newRanking[nextSlotIndex] = optionId;
      
      // Auto-fill 4th slot if 3 are selected
      if (nextSlotIndex === 2 && newRanking[3] === null) {
        const remainingOption = challenge.options.find(opt => 
          !newRanking.includes(opt.id)
        );
        if (remainingOption) {
          newRanking[3] = remainingOption.id;
        }
      }
      
      setSelectedRanking(newRanking);
    }
  };
  
  const handleUndo = () => {
    const newRanking = [...selectedRanking];
    // Find last non-null slot
    for (let i = newRanking.length - 1; i >= 0; i--) {
      if (newRanking[i] !== null) {
        newRanking[i] = null;
        setSelectedRanking(newRanking);
        break;
      }
    }
  };
  
  const handleReset = () => {
    setSelectedRanking([null, null, null, null]);
  };
  
  const handleSubmit = () => {
    if (!isComplete) return;
    
    // Convert selected ranking to array of option IDs
    const rankingIds = selectedRanking.filter(id => id !== null) as string[];
    submitMutation.mutate(rankingIds);
  };
  
  // Get option by ID helper
  const getOptionById = (id: string | null): ChallengeOption | null => {
    if (!id) return null;
    return challenge.options.find(opt => opt.id === id) || null;
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

      {/* Available Options - Show First */}
      {currentStep <= 3 && availableOptions.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-500 mb-3 px-2">
            {currentStep <= 3 ? `Select your #${currentStep} choice:` : 'All slots filled'}
          </p>
          <div className="space-y-3">
            {availableOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => handleOptionSelect(option.id)}
                className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <OptionCard 
                  option={option} 
                  index={-1} 
                  isSelectable={true}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking Slots - Show Below Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <p className="text-sm font-medium text-slate-500">
            Your ranking from <span className="text-emerald-600 font-bold">Best</span> (1) to <span className="text-rose-500 font-bold">Worst</span> (4)
          </p>
        </div>
        
        {/* Selected Ranking Slots */}
        <div className="space-y-3">
          {[0, 1, 2, 3].map((slotIndex) => {
            const optionId = selectedRanking[slotIndex];
            const option = getOptionById(optionId);
            const isCurrentSlot = currentStep === slotIndex + 1;
            
            return (
              <div key={slotIndex} className="relative">
                <div className={`
                  bg-white rounded-xl border-2 transition-all
                  ${isCurrentSlot ? 'border-emerald-400 shadow-md' : 'border-slate-200'}
                  ${option ? 'p-0' : 'p-4 min-h-[80px] flex items-center justify-center'}
                `}>
                  {option ? (
                    <OptionCard 
                      option={option} 
                      index={slotIndex} 
                      isSelected={true}
                      onRemove={() => {
                        const newRanking = [...selectedRanking];
                        newRanking[slotIndex] = null;
                        setSelectedRanking(newRanking);
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl font-display font-bold text-slate-300 mb-1">
                        #{slotIndex + 1}
                      </div>
                      <div className="text-sm text-slate-400 font-medium">
                        {isCurrentSlot 
                          ? `Pick your #${slotIndex + 1}${slotIndex === 0 ? ' (what would you do FIRST?)' : ''}`
                          : 'Waiting...'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Auto-fill message for last slot */}
        {currentStep === 3 && availableOptions.length === 1 && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-sm text-emerald-700 font-medium text-center">
              Last option will automatically be placed in slot #4
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleUndo}
            disabled={selectedRanking.every(id => id === null) || submitMutation.isPending}
            variant="outline"
            className="flex-1"
          >
            <Undo2 className="mr-2 h-4 w-4" />
            Undo Last Pick
          </Button>
          <Button
            onClick={handleReset}
            disabled={selectedRanking.every(id => id === null) || submitMutation.isPending}
            variant="outline"
            className="flex-1"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      <div className="pt-4">
        <Button 
          onClick={handleSubmit} 
          disabled={!isComplete || submitMutation.isPending}
          className="w-full h-14 text-lg font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200/50 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
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
