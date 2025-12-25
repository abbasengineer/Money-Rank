import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { findFinancialTerms } from '@/lib/financialTerms';
import { Info } from 'lucide-react';

interface FinancialTermTooltipProps {
  text: string;
  className?: string;
}

export function FinancialTermTooltip({ text, className }: FinancialTermTooltipProps) {
  const terms = findFinancialTerms(text);
  
  // If no terms found, just return the text
  if (terms.length === 0) {
    return <span className={className}>{text}</span>;
  }
  
  // Build array of text segments and tooltip components
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  terms.forEach(({ term, match, index, length }, termIndex) => {
    // Add text before the term
    if (index > lastIndex) {
      parts.push(
        <React.Fragment key={`text-${termIndex}`}>
          {text.substring(lastIndex, index)}
        </React.Fragment>
      );
    }
    
    // Add the term with tooltip
    parts.push(
      <Tooltip key={`tooltip-${termIndex}`}>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 underline decoration-dotted underline-offset-2 cursor-help font-medium">
            {match}
            <Info className="w-3 h-3 inline" />
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs p-3 bg-slate-900 text-slate-50 text-sm leading-relaxed z-50"
        >
          <p className="mb-1 font-semibold">{match}</p>
          <p>{term.definition}</p>
          {term.source && (
            <p className="mt-2 text-xs text-slate-400 italic">Source: {term.source}</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
    
    lastIndex = index + length;
  });
  
  // Add remaining text after last term
  if (lastIndex < text.length) {
    parts.push(
      <React.Fragment key="text-end">
        {text.substring(lastIndex)}
      </React.Fragment>
    );
  }
  
  return (
    <TooltipProvider delayDuration={200}>
      <span className={className}>
        {parts}
      </span>
    </TooltipProvider>
  );
}

