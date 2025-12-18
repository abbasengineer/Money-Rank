import React from 'react';
import { Reorder, useDragControls, motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { ChallengeOption } from '@/lib/types';
import { cn } from '@/lib/utils';

interface OptionCardProps {
  option: ChallengeOption;
  index: number;
  isResultMode?: boolean;
}

export const OptionCard = ({ option, index, isResultMode = false }: OptionCardProps) => {
  const controls = useDragControls();

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Optimal': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Reasonable': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Risky': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <Reorder.Item
      value={option}
      id={option.id}
      dragListener={!isResultMode}
      dragControls={controls}
      className="relative mb-3"
      whileDrag={{ scale: 1.02, zIndex: 10 }}
    >
      <div className={cn(
        "relative flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm transition-all select-none",
        !isResultMode && "hover:border-emerald-200 hover:shadow-md cursor-grab active:cursor-grabbing",
        isResultMode && "border-slate-100"
      )}>
        {/* Rank Number */}
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 font-display font-bold text-lg border border-slate-100">
          {index + 1}
        </div>

        {/* Content */}
        <div className="flex-grow min-w-0">
          <p className="text-slate-900 font-medium leading-tight">{option.text}</p>
          
          {isResultMode && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 text-sm"
            >
              <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 border", getTierColor(option.tier))}>
                {option.tier}
              </span>
              <span className="text-slate-500">{option.explanation}</span>
            </motion.div>
          )}
        </div>

        {/* Drag Handle */}
        {!isResultMode && (
          <div 
            className="flex-shrink-0 text-slate-300 hover:text-slate-500 cursor-grab touch-none p-2 -mr-2"
            onPointerDown={(e) => controls.start(e)}
          >
            <GripVertical className="w-5 h-5" />
          </div>
        )}
      </div>
    </Reorder.Item>
  );
};
