import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ChallengeOption } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FinancialTermTooltip } from '@/components/FinancialTermTooltip';

interface OptionCardProps {
  option: ChallengeOption;
  index: number;
  isResultMode?: boolean;
  isSelected?: boolean;
  isSelectable?: boolean;
  onRemove?: () => void;
}

export const OptionCard = ({ 
  option, 
  index, 
  isResultMode = false,
  isSelected = false,
  isSelectable = false,
  onRemove
}: OptionCardProps) => {

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Optimal': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Reasonable': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Risky': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const cardContent = (
    <div className={cn(
      "relative flex items-center gap-4 p-4 bg-white rounded-xl border shadow-sm transition-all select-none",
      isResultMode && "border-slate-100",
      isSelected && "border-emerald-300 bg-emerald-50/30",
      isSelectable && "border-slate-200 hover:border-emerald-300 hover:shadow-md cursor-pointer active:scale-[0.98]",
      !isResultMode && !isSelected && !isSelectable && "border-slate-200"
    )}>
      {/* Rank Number */}
      {index >= 0 && (
        <div className={cn(
          "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-display font-bold text-lg border",
          isSelected ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-slate-50 text-slate-500 border-slate-100"
        )}>
          {index + 1}
        </div>
      )}

      {/* Content */}
      <div className="flex-grow min-w-0">
        <p className="text-slate-900 font-medium leading-tight">
          <FinancialTermTooltip text={option.text} />
        </p>
        
        {isResultMode && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 text-sm"
          >
            <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 border", getTierColor(option.tier))}>
              {option.tier}
            </span>
            <span className="text-slate-500">
              <FinancialTermTooltip text={option.explanation} />
            </span>
          </motion.div>
        )}
      </div>

      {/* Remove Button (for selected items in ranking slots) */}
      {isSelected && onRemove && !isResultMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex-shrink-0 text-slate-400 hover:text-rose-500 p-2 -mr-2 transition-colors"
          aria-label="Remove from ranking"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  if (isResultMode) {
    return (
      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="relative mb-3"
      >
        {cardContent}
      </motion.div>
    );
  }

  return (
    <div className="relative">
      {cardContent}
    </div>
  );
};
