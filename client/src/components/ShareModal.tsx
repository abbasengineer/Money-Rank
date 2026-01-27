import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Twitter, Linkedin, Facebook, Copy, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { ShareCard } from '@/components/ShareCard';
import html2canvas from 'html2canvas-pro';
import { useToast } from '@/hooks/use-toast';
import { dateKeyToLocalDate } from '@/lib/utils';
import type { Challenge, Attempt } from '@/lib/types';

interface ResultsStats {
  percentile: number;
  exactMatchPercent: number;
  topPickPercent: number;
  totalAttempts: number;
}

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge;
  attempt: Attempt;
  stats: ResultsStats;
  onContinue: () => void;
}

export function ShareModal({ 
  open, 
  onOpenChange, 
  challenge, 
  attempt, 
  stats,
  onContinue 
}: ShareModalProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const challengeDate = dateKeyToLocalDate(challenge.dateKey);

  const getScoreColor = () => {
    if (attempt.score >= 90) return 'text-emerald-600';
    if (attempt.score >= 60) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getGradeStyles = (grade: string) => {
    switch (grade) {
      case 'Great': 
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Good': 
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Risky': 
        return 'text-rose-600 bg-rose-50 border-rose-200';
      default: 
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const handleShare = async (platform?: 'x' | 'linkedin' | 'facebook' | 'instagram' | 'copy') => {
    const shareUrl = `${window.location.origin}/challenge/${challenge.dateKey}`;
    const shareText = `💰 MoneyRank Challenge - ${format(challengeDate, 'MMMM d, yyyy')}\n\n${challenge.title}\n\nMy Score: ${attempt.score}% | Top ${100 - stats.percentile}% | ${stats.exactMatchPercent}% matched my ranking\n\nTry it yourself! 👇`;

    // For platforms that don't need image generation, handle them directly
    if (platform && platform !== 'instagram' && platform !== undefined) {
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedText = encodeURIComponent(shareText);
      
      switch (platform) {
        case 'x':
          window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`, '_blank');
          return;
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, '_blank');
          return;
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
          return;
        case 'copy':
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({
              title: "Copied!",
              description: "Share text copied to clipboard.",
            });
          }
          return;
      }
    }

    // For Instagram and general share (image generation needed)
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
      // Wait for fonts to load
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Position element for capture
      const originalStyle = shareCardRef.current.style.cssText;
      shareCardRef.current.style.cssText = 'position: fixed; left: 0; top: 0; width: 1200px; height: 630px; z-index: 99999; visibility: visible; opacity: 1; pointer-events: none; transform: translateX(-2000px);';
      
      void shareCardRef.current.offsetHeight;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate image
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Restore original style
      shareCardRef.current.style.cssText = originalStyle;

      // Convert to blob
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

        // Handle Instagram specifically
        if (platform === 'instagram') {
          const instagramUrl = URL.createObjectURL(blob);
          const instagramA = document.createElement('a');
          instagramA.href = instagramUrl;
          instagramA.download = 'moneyrank-share.png';
          document.body.appendChild(instagramA);
          instagramA.click();
          document.body.removeChild(instagramA);
          URL.revokeObjectURL(instagramUrl);
          
          await navigator.clipboard.writeText(shareText);
          toast({
            title: "Image downloaded!",
            description: "Image saved and text copied. Upload to Instagram Stories or Feed!",
          });
          setIsSharing(false);
          return;
        }

        // Otherwise, try Web Share API
        try {
          const file = new File([blob], 'moneyrank-share.png', { type: 'image/png' });
          
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
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
            // Fallback: download image and copy text
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'moneyrank-share.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
            toast({
              title: "Image saved!",
              description: "Image downloaded and link copied to clipboard.",
            });
          }
        } catch (shareError: any) {
          if (shareError.name !== 'AbortError') {
            // Fallback: download image and copy text
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'moneyrank-share.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
            toast({
              title: "Image saved!",
              description: "Image downloaded and link copied to clipboard.",
            });
          }
        }
        
        setIsSharing(false);
      }, 'image/png');
    } catch (error) {
      console.error('Error generating share image:', error);
      setIsSharing(false);
      toast({
        title: "Share failed",
        description: "Unable to generate share image.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Hidden share card for image generation */}
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

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold text-center">
              🎉 Great job!
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Share your score and challenge others!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Challenge Question (no answers) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border border-slate-200">
                  {challenge.category}
                </span>
                <span className="text-slate-400 text-sm font-medium">
                  {format(challengeDate, 'MMM d, yyyy')}
                </span>
              </div>
              
              <h2 className="text-xl font-display font-bold text-slate-900 mb-3 leading-tight">
                {challenge.title}
              </h2>
              
              <p className="text-base text-slate-700 leading-relaxed">
                {challenge.scenario}
              </p>
            </div>

            {/* Score Display */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border-2 border-emerald-200 text-center">
              <p className="text-slate-500 font-medium text-sm uppercase tracking-widest mb-2">
                Your Score
              </p>
              
              <div className="flex flex-col items-center justify-center mb-4">
                <span className={`text-6xl font-display font-bold mb-2 ${getScoreColor()}`}>
                  {attempt.score}
                  <span className="text-3xl">%</span>
                </span>
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${getGradeStyles(attempt.grade)}`}>
                  {attempt.grade} Choice
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-emerald-200 pt-4 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-display font-bold text-slate-900">
                    Top {100 - stats.percentile}%
                  </div>
                  <div className="text-xs text-slate-500 uppercase font-medium mt-1">
                    Percentile
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-display font-bold text-slate-900">
                    {stats.exactMatchPercent}%
                  </div>
                  <div className="text-xs text-slate-500 uppercase font-medium mt-1">
                    Matched Me
                  </div>
                </div>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-600 text-center">
                Share on social media
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleShare('x')}
                  disabled={isSharing}
                  variant="outline"
                  className="w-full"
                >
                  <Twitter className="mr-2 h-4 w-4" />
                  X (Twitter)
                </Button>
                <Button
                  onClick={() => handleShare('linkedin')}
                  disabled={isSharing}
                  variant="outline"
                  className="w-full"
                >
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </Button>
                <Button
                  onClick={() => handleShare('facebook')}
                  disabled={isSharing}
                  variant="outline"
                  className="w-full"
                >
                  <Facebook className="mr-2 h-4 w-4" />
                  Facebook
                </Button>
                <Button
                  onClick={() => handleShare('instagram')}
                  disabled={isSharing}
                  variant="outline"
                  className="w-full"
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Instagram
                </Button>
                <Button
                  onClick={() => handleShare('copy')}
                  disabled={isSharing}
                  variant="outline"
                  className="w-full col-span-2"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
              
              <Button
                onClick={() => handleShare()}
                disabled={isSharing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Image
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                onContinue();
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              View Full Results
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

