import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser, isFeatureEnabled } from '@/lib/api';

interface PremiumFeatureProps {
  children: React.ReactNode;
  featureName: string;
  description?: string;
  tier?: 'premium' | 'pro';
  showUpgrade?: boolean;
}

/**
 * Wrapper component that gates premium features behind subscription
 * Shows upgrade prompt for non-premium users
 */
export function PremiumFeature({ 
  children, 
  featureName, 
  description,
  tier = 'premium',
  showUpgrade = true 
}: PremiumFeatureProps) {
  const { data: authData } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
  });

  const { data: proRestrictionsEnabled } = useQuery({
    queryKey: ['feature-flag', 'ENABLE_PRO_RESTRICTIONS'],
    queryFn: () => isFeatureEnabled('ENABLE_PRO_RESTRICTIONS'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const user = authData?.user;
  // Support both premium and pro in backend, but only show Pro in UI
  const isPremium = user?.subscriptionTier === 'premium' || user?.subscriptionTier === 'pro';
  const isPro = user?.subscriptionTier === 'pro';
  
  // Check if subscription is still active
  const subscriptionExpiresAt = user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null;
  const isActive = isPremium && (subscriptionExpiresAt === null || subscriptionExpiresAt > new Date());
  
  // If Pro restrictions are disabled via feature flag, grant access to all users
  // Otherwise, check tier requirements - treat premium as pro for access, but UI only shows Pro
  const hasAccess = proRestrictionsEnabled === false 
    ? true 
    : (tier === 'premium' ? isActive : (isActive && isPro));

  if (hasAccess) {
    return <>{children}</>;
  }

  if (!showUpgrade) {
    return null;
  }

  return (
    <div className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white rounded-lg w-full overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
            </div>
          </div>
          <div className="flex-grow min-w-0">
            <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 mb-1">
              {featureName}
            </h3>
            {description && (
              <p className="text-sm text-slate-600 mb-3 sm:mb-4">
                {description}
              </p>
            )}
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-600">
                Pro feature
              </span>
            </div>
            {/* Upgrade button removed - no paywall set up */}
          </div>
        </div>
      </div>
    </div>
  );
}

