import React, { useEffect, useState, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Layout } from '@/components/layout';
import { getResults, getChallengeByDateKey, getCurrentUser } from '@/lib/api';
import { OptionCard } from '@/components/challenge/OptionCard';
import { Button } from '@/components/ui/button';
import { Share2, ArrowRight, Loader2, AlertCircle, Calendar, Check, Info, ArrowUp, ArrowDown } from 'lucide-react';
import { cn, dateKeyToLocalDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FinancialTermTooltip } from '@/components/FinancialTermTooltip';
import { useToast } from '@/hooks/use-toast';
import { ShareCard } from '@/components/ShareCard';
import html2canvas from 'html2canvas-pro';
import { SEO } from '@/components/SEO';
import { PremiumFeature } from '@/components/PremiumFeature';

export default function Results() {
  const [match, params] = useRoute('/results/:dateKey');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // First, fetch the challenge to get the challenge ID
  const { data: challengeData, isLoading: challengeLoading, error: challengeError } = useQuery({
    queryKey: ['challenge', params?.dateKey],
    queryFn: async () => {
      if (!params?.dateKey) throw new Error('No date key');
      return await getChallengeByDateKey(params.dateKey);
    },
    enabled: !!params?.dateKey,
    // Refetch on mount to ensure we have the latest data after submission
    refetchOnMount: true,
  });

  // Try to fetch results directly - if it fails with 404, user hasn't attempted
  // This is more reliable than checking hasAttempted which might be stale
  const { data, isLoading: resultsLoading, error: resultsError } = useQuery({
    queryKey: ['results', challengeData?.challenge?.id],
    queryFn: async () => {
      if (!challengeData?.challenge?.id) throw new Error('Challenge not found');
      return await getResults(challengeData.challenge.id);
    },
    enabled: !!challengeData?.challenge?.id,
    // Retry once in case we just submitted and server needs a moment
    retry: (failureCount, error) => {
      // Don't retry on 404 (no attempt found) - that's a valid state
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 1;
    },
  });

  // Check Pro status for explanation feature
  const { data: authData } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
  });

  useEffect(() => {
    if (!match || !params?.dateKey) {
      setLocation('/');
    }
  }, [match, params?.dateKey, setLocation]);

  if (!match || !params?.dateKey) {
    return null;
  }

  const isLoading = challengeLoading || resultsLoading;
  const error = challengeError || resultsError;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  // Handle challenge errors (locked, not found, etc.)
  if (challengeError) {
    const errorMessage = challengeError instanceof Error ? challengeError.message : 'Failed to load challenge';
    const isLocked = errorMessage.includes('locked');
    const isNotFound = errorMessage.includes('not found') || !challengeData;

    return (
      <Layout>
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-slate-900 mb-2">
              {isLocked ? 'Challenge Locked' : isNotFound ? 'Challenge Not Found' : 'Error'}
            </h2>
            <p className="text-slate-600 mb-6">
              {isLocked 
                ? 'This challenge is not available yet or has been locked.'
                : isNotFound
                ? 'The challenge for this date could not be found.'
                : errorMessage}
            </p>
            <Button onClick={() => setLocation('/archive')} className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold">
              Play More Challenges <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Handle case where challenge exists but results query failed (likely no attempt)
  // Check if it's a 404 error which means no attempt found
  const isNoAttemptError = resultsError instanceof Error && 
    ((resultsError as any).status === 404 || 
     resultsError.message.includes('404') || 
     resultsError.message.includes('No attempt found'));

  if (challengeData && !resultsLoading && (isNoAttemptError || (!data && !resultsError))) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-slate-900 mb-2">No Attempt Found</h2>
            <p className="text-slate-600 mb-6">
              You haven't completed this challenge yet. Complete it first to see your results!
            </p>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setLocation(`/challenge/${params.dateKey}`)}
                className="flex-1"
              >
                Try Challenge
              </Button>
              <Button 
                onClick={() => setLocation('/archive')}
                className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
              >
                Play More Challenges <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Handle other results errors (not 404)
  if (resultsError && !isNoAttemptError) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-slate-900 mb-2">Error Loading Results</h2>
            <p className="text-slate-600 mb-6">
              {resultsError instanceof Error ? resultsError.message : 'Failed to load your results for this challenge.'}
            </p>
            <Button onClick={() => setLocation('/archive')} className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold">
              Play More Challenges <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const { attempt, challenge, stats } = data;
  
  // Map ranking IDs to options, filtering out any undefined (in case options were updated)
  let userOrderedOptions = attempt.ranking
    .map(id => challenge.options.find(opt => opt.id === id))
    .filter((opt): opt is NonNullable<typeof opt> => opt !== undefined);
  
  // If we couldn't match any options, this means the challenge was significantly updated
  // Fallback to showing options in their current order
  if (userOrderedOptions.length === 0) {
    console.warn('No options from attempt ranking could be matched. Challenge options were likely updated. Using current option order.');
    // Fallback: use current challenge options in their ordering index
    userOrderedOptions = [...challenge.options.sort((a, b) => a.orderingIndex - b.orderingIndex)];
  } else if (userOrderedOptions.length !== attempt.ranking.length) {
    console.warn('Some options from attempt ranking could not be found. Challenge options may have been updated.');
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Great': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Good': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Risky': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const challengeDate = dateKeyToLocalDate(challenge.dateKey);

  const handleShare = async () => {
    if (!shareCardRef.current) {
      toast({
        title: "Share failed",
        description: "Unable to generate share image.",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);

    try {
      let elementToCapture: HTMLElement = shareCardRef.current!;
      if (!elementToCapture) {
        throw new Error('Share card element not found');
      }
      
      // Wait for fonts to load
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if element has content
      if (!elementToCapture.firstChild) {
        throw new Error('Share card element is empty');
      }
      
      // Temporarily position element for capture
      const originalStyle = elementToCapture.style.cssText;
      
      // Make element visible but off-screen for capture
      // Move it to viewport but keep it off-screen
      elementToCapture.style.cssText = 'position: fixed; left: 0; top: 0; width: 1200px; height: 630px; z-index: 99999; visibility: visible; opacity: 1; pointer-events: none; transform: translateX(-2000px);';
      
      // Force a reflow to ensure styles are applied
      void elementToCapture.offsetHeight;
      
      // Wait for styles to apply and ensure element is rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify element is ready - check both offset and bounding rect
      const offsetWidth = elementToCapture.offsetWidth;
      const offsetHeight = elementToCapture.offsetHeight;
      const rect = elementToCapture.getBoundingClientRect();
      
      console.log('Element dimensions check:', {
        offsetWidth,
        offsetHeight,
        rectWidth: rect.width,
        rectHeight: rect.height,
        hasChildren: elementToCapture.children.length > 0,
        firstChild: elementToCapture.firstElementChild?.tagName,
      });
      
      // If outer element has no dimensions, try the inner ShareCard
      if ((offsetWidth === 0 || offsetHeight === 0) && (rect.width === 0 || rect.height === 0)) {
        const innerCard = elementToCapture.querySelector('[data-share-card]') as HTMLElement;
        if (innerCard && innerCard.offsetWidth > 0) {
          console.log('Using inner card element instead');
          elementToCapture = innerCard;
          // Also update the inner card's position
          innerCard.style.cssText = 'position: fixed; left: 0; top: 0; width: 1200px; height: 630px; z-index: 99999; visibility: visible; opacity: 1; pointer-events: none; transform: translateX(-2000px);';
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          throw new Error(`Share card element has no dimensions. Width: ${offsetWidth}, Height: ${offsetHeight}`);
        }
      }
      
      // Generate image from share card
      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(elementToCapture, {
          backgroundColor: '#f1f5f9',
          scale: 1,
          logging: true,
          useCORS: false,
          allowTaint: true,
          width: 1200,
          height: 630,
        });
        
        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          throw new Error('Generated canvas is empty');
        }
      } catch (canvasError: any) {
        console.error('html2canvas error:', canvasError);
        console.error('Element info:', {
          width: elementToCapture.offsetWidth,
          height: elementToCapture.offsetHeight,
          hasContent: elementToCapture.children.length > 0,
          computedStyle: window.getComputedStyle(elementToCapture).display,
        });
        
        // Try with absolute minimum options
        try {
          canvas = await html2canvas(elementToCapture.firstElementChild as HTMLElement || elementToCapture, {
            backgroundColor: '#ffffff',
            scale: 1,
            logging: true,
          });
        } catch (retryError: any) {
          console.error('html2canvas retry also failed:', retryError);
          throw new Error(`Failed to generate image: ${retryError?.message || canvasError?.message || 'Unknown error'}`);
        }
      }
      
      // Restore element (use the original element, not innerCard if we switched)
      if (shareCardRef.current) {
        shareCardRef.current.style.cssText = originalStyle;
      }

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast({
            title: "Share failed",
            description: "Unable to generate image.",
            variant: "destructive",
          });
          setIsSharing(false);
          return;
        }

        const shareUrl = `${window.location.origin}/challenge/${challenge.dateKey}`;
        const shareText = `💰 MoneyRank Challenge - ${format(challengeDate, 'MMMM d, yyyy')}\n\n${challenge.title}\n\nMy Score: ${attempt.score}% | Top ${100 - stats.percentile}% | ${stats.exactMatchPercent}% matched my ranking\n\nTry it yourself! 👇`;

        try {
          // Try Web Share API with image (mobile/native)
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'moneyrank-share.png', { type: 'image/png' })] })) {
            const file = new File([blob], 'moneyrank-share.png', { type: 'image/png' });
            await navigator.share({
              title: `MoneyRank - ${challenge.title}`,
              text: shareText,
              url: shareUrl,
              files: [file],
            });
            toast({
              title: "Shared!",
              description: "Thanks for sharing your results!",
            });
          } else if (navigator.share) {
            // Web Share API without file support
            await navigator.share({
              title: `MoneyRank - ${challenge.title}`,
              text: shareText,
              url: shareUrl,
            });
            toast({
              title: "Shared!",
              description: "Thanks for sharing your results!",
            });
          } else {
            // Fallback: Download image and copy link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `moneyrank-${challenge.dateKey}-${attempt.score}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Also copy text to clipboard
            await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
            toast({
              title: "Image downloaded!",
              description: "Image saved and link copied to clipboard. Share it on social media!",
            });
          }
        } catch (error: any) {
          // User cancelled share
          if (error.name !== 'AbortError') {
            // Fallback: Download image
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `moneyrank-${challenge.dateKey}-${attempt.score}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
              title: "Image downloaded!",
              description: "Share the image on social media!",
            });
          }
        } finally {
          setIsSharing(false);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error generating share image:', error);
      
      // Restore element style if it was changed
      if (shareCardRef.current) {
        shareCardRef.current.style.cssText = 'position: fixed; left: -2000px; top: 0px; width: 1200px; height: 630px; visibility: hidden; pointer-events: none; z-index: -1;';
      }
      
      // Fallback: Share text only
      const shareUrl = `${window.location.origin}/challenge/${challenge.dateKey}`;
      const shareText = `💰 MoneyRank Challenge - ${format(challengeDate, 'MMMM d, yyyy')}\n\n${challenge.title}\n\n${challenge.scenario}\n\nMy Score: ${attempt.score}% | Top ${100 - stats.percentile}% | ${stats.exactMatchPercent}% matched my ranking\n\nTry it yourself! 👇\n\n${shareUrl}`;
      
      try {
        if (navigator.share) {
          await navigator.share({
            title: `MoneyRank - ${challenge.title}`,
            text: shareText,
            url: shareUrl,
          });
          toast({
            title: "Shared!",
            description: "Thanks for sharing your results!",
          });
        } else {
          await navigator.clipboard.writeText(shareText);
          toast({
            title: "Copied to clipboard!",
            description: "Share text copied (image generation failed). Share it with friends!",
          });
        }
      } catch (shareError: any) {
        if (shareError.name !== 'AbortError') {
          toast({
            title: "Share failed",
            description: error instanceof Error ? `Image: ${error.message}. Text share also failed.` : "Unable to generate share image or share text.",
            variant: "destructive",
          });
        }
      } finally {
        setIsSharing(false);
      }
    }
  };

  const resultsTitle = `Results: ${challenge.title} - ${format(challengeDate, 'MMMM d, yyyy')}`;
  const resultsDescription = `My MoneyRank score: ${attempt.score}% | Top ${100 - stats.percentile}% | ${stats.exactMatchPercent}% matched my ranking. See how you compare on this financial decision challenge!`;

  return (
    <Layout>
      <SEO
        title={resultsTitle}
        description={resultsDescription}
        ogTitle={resultsTitle}
        ogDescription={resultsDescription}
        canonical={`/results/${challenge.dateKey}`}
      />
      {/* Hidden share card for image generation - positioned off-screen but visible to layout */}
      <div 
        ref={shareCardRef}
        style={{ 
          position: 'fixed', 
          left: '-2000px', 
          top: '0px', 
          width: '1200px',
          height: '630px',
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <ShareCard challenge={challenge} attempt={attempt} stats={stats} />
      </div>

      <div className="max-w-xl mx-auto space-y-8">
        {/* Challenge Question Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm font-medium">
              {format(challengeDate, 'EEEE, MMMM d, yyyy')}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border border-slate-200 ml-auto">
              {challenge.category}
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
        </motion.div>
        
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

        {/* Why This Is Not Optimal - Pro Feature */}
        {data?.explanation && attempt.score < 100 && (
          <PremiumFeature
            featureName="Why This Is Not Optimal"
            description="Get detailed explanations of why your ranking differs from the optimal financial decision order."
            tier="pro"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
            >
              <div className="flex items-start gap-3 mb-4">
                <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-display font-bold text-slate-900 mb-1">
                    Why This Is Not Optimal
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    {data.explanation.summary}
                  </p>
                </div>
              </div>

              {data.explanation.misplacedOptions.length > 0 && (
                <div className="space-y-4">
                  {/* Optimal Ranking Preview */}
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <h4 className="text-sm font-semibold text-emerald-900 mb-2">
                      Optimal Ranking:
                    </h4>
                    <div className="space-y-2">
                      {data.explanation.optimalRanking.map((opt, idx) => {
                        // Find where user ranked this option
                        const userRankedPosition = attempt.ranking.indexOf(opt.id) + 1;
                        const isCorrectlyPlaced = userRankedPosition === idx + 1;
                        
                        return (
                          <div key={opt.id} className="flex items-start gap-3 text-sm">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-700 font-medium mb-1">{opt.text}</p>
                              <div className="flex items-center gap-2 text-xs flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  opt.tier === 'Optimal' ? 'bg-emerald-100 text-emerald-700' :
                                  opt.tier === 'Reasonable' ? 'bg-amber-100 text-amber-700' :
                                  'bg-rose-100 text-rose-700'
                                }`}>
                                  {opt.tier}
                                </span>
                                {!isCorrectlyPlaced && (
                                  <span className="text-slate-500">
                                    • You ranked this as <span className="font-semibold text-rose-600">#{userRankedPosition}</span>
                                  </span>
                                )}
                                {isCorrectlyPlaced && (
                                  <span className="text-emerald-600 font-medium">✓ Correct</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Misplaced Options Details */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">
                      What You Got Wrong:
                    </h4>
                    <div className="space-y-3">
                      {data.explanation.misplacedOptions.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900 mb-1">
                                {item.option.text}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <span>You ranked it:</span>
                                <span className="font-semibold text-rose-600">#{item.userPosition}</span>
                                {item.userPosition < item.optimalPosition ? (
                                  <ArrowDown className="w-3 h-3 text-rose-600" />
                                ) : (
                                  <ArrowUp className="w-3 h-3 text-amber-600" />
                                )}
                                <span>Should be:</span>
                                <span className="font-semibold text-emerald-600">#{item.optimalPosition}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-slate-700 mt-2 pl-4 border-l-2 border-slate-300 whitespace-pre-wrap">
                            {(item as any).detailedExplanation || item.explanation || 'No explanation available.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {data.explanation.isPerfect && (
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
                  <p className="text-emerald-800 font-medium">
                    🎉 Perfect ranking! You've identified the optimal financial decision order.
                  </p>
                </div>
              )}
            </motion.div>
          </PremiumFeature>
        )}

        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1 h-12 text-slate-700 border-slate-300 hover:bg-slate-50" 
            onClick={handleShare}
            disabled={isSharing}
            data-testid="button-share"
          >
            {isSharing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sharing...
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" /> Share
              </>
            )}
          </Button>
          <Button 
            className="flex-1 h-12 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold" 
            onClick={() => setLocation('/archive')}
            data-testid="button-archive"
          >
            Play More Challenges <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
