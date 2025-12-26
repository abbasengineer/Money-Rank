import React, { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { findFinancialTerms } from '@/lib/financialTerms';
import { Info } from 'lucide-react';

interface FinancialTermTooltipProps {
  text: string;
  className?: string;
}

// Detect if device is mobile
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export function FinancialTermTooltip({ text, className }: FinancialTermTooltipProps) {
  const terms = findFinancialTerms(text);
  const isMobile = useIsMobile();
  
  // If no terms found, just return the text
  if (terms.length === 0) {
    return <span className={className}>{text}</span>;
  }
  
  // Build array of text segments and tooltip/popover components
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  const renderTermContent = (match: string, definition: string, source?: string) => (
    <>
      <p className="mb-1 font-semibold">{match}</p>
      <p>{definition}</p>
      {source && (
        <p className="mt-2 text-xs text-slate-400 italic">Source: {source}</p>
      )}
    </>
  );
  
  terms.forEach(({ term, match, index, length }, termIndex) => {
    // Add text before the term
    if (index > lastIndex) {
      parts.push(
        <React.Fragment key={`text-${termIndex}`}>
          {text.substring(lastIndex, index)}
        </React.Fragment>
      );
    }
    
    // Use Popover for mobile, Tooltip for desktop
    if (isMobile) {
      parts.push(
        <Popover key={`popover-${termIndex}`}>
          <PopoverTrigger asChild>
            <span className="inline-flex items-center gap-1 text-emerald-600 active:text-emerald-700 underline decoration-dotted underline-offset-2 cursor-pointer font-medium touch-manipulation">
              {match}
              <Info className="w-3 h-3 inline" />
            </span>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            className="max-w-xs p-3 bg-slate-900 text-slate-50 text-sm leading-relaxed z-50 border-slate-700"
          >
            {renderTermContent(match, term.definition, term.source)}
          </PopoverContent>
        </Popover>
      );
    } else {
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
            {renderTermContent(match, term.definition, term.source)}
          </TooltipContent>
        </Tooltip>
      );
    }
    
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
    <>
      {isMobile ? (
        <span className={className}>{parts}</span>
      ) : (
        <TooltipProvider delayDuration={200}>
          <span className={className}>{parts}</span>
        </TooltipProvider>
      )}
    </>
  );
}

