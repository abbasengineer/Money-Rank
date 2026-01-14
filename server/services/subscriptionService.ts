import { storage } from '../storage';

export type SubscriptionTier = 'free' | 'premium' | 'pro';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt: Date | null;
}

/**
 * Check if a user has an active premium subscription
 */
export async function getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const user = await storage.getUser(userId);
  
  if (!user) {
    return {
      tier: 'free',
      isActive: false,
      expiresAt: null,
    };
  }

  // Safely access subscription fields (may not exist if migration not run yet)
  const tier = ((user as any).subscriptionTier || 'free') as SubscriptionTier;
  const expiresAt = (user as any).subscriptionExpiresAt 
    ? new Date((user as any).subscriptionExpiresAt) 
    : null;
  
  // Check if subscription is still active
  const isActive = tier !== 'free' && (expiresAt === null || expiresAt > new Date());

  return {
    tier: isActive ? tier : 'free',
    isActive,
    expiresAt,
  };
}

/**
 * Check if user has access to a premium feature
 */
export async function hasPremiumAccess(userId: string): Promise<boolean> {
  const status = await getUserSubscriptionStatus(userId);
  return status.isActive && (status.tier === 'premium' || status.tier === 'pro');
}

/**
 * Check if user has access to a pro feature
 */
export async function hasProAccess(userId: string): Promise<boolean> {
  const status = await getUserSubscriptionStatus(userId);
  return status.isActive && status.tier === 'pro';
}

