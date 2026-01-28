import Stripe from 'stripe';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia', // Use latest stable version
});

/**
 * Get or create Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(userId: string, email?: string, displayName?: string): Promise<string> {
  // First, check if user already has a Stripe customer ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // If user already has a Stripe customer ID, return it
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: email || user.email || undefined,
    name: displayName || user.displayName || undefined,
    metadata: {
      userId: userId,
    },
  });

  // Update user with Stripe customer ID
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, userId));

  return customer.id;
}

/**
 * Update user subscription status from Stripe subscription
 */
export async function updateUserSubscriptionFromStripe(
  stripeCustomerId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  // Find user by Stripe customer ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, stripeCustomerId))
    .limit(1);

  if (!user) {
    console.error(`User not found for Stripe customer: ${stripeCustomerId}`);
    return;
  }

  // Determine subscription tier from Stripe subscription
  // You'll need to map your Stripe price IDs to tiers
  // For now, we'll use metadata or price lookup
  let tier: 'free' | 'premium' | 'pro' = 'free';
  
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    // Check subscription items to determine tier
    // This assumes you have price IDs set up in Stripe
    // You'll need to configure these based on your Stripe products
    const priceId = subscription.items.data[0]?.price.id;
    
      // Map price IDs to tiers
      // Configure these in your .env file: STRIPE_PRICE_ID_PREMIUM and STRIPE_PRICE_ID_PRO
      const premiumPriceId = process.env.STRIPE_PRICE_ID_PREMIUM;
      const proPriceId = process.env.STRIPE_PRICE_ID_PRO;
      
      if (priceId === proPriceId) {
        tier = 'pro';
      } else if (priceId === premiumPriceId) {
        tier = 'premium';
      } else {
        // Fallback: check price metadata or default to pro
        const price = subscription.items.data[0]?.price;
        const tierFromMetadata = price?.metadata?.tier;
        if (tierFromMetadata === 'premium' || tierFromMetadata === 'pro') {
          tier = tierFromMetadata;
        } else {
          tier = 'pro'; // Default to pro if we can't determine
        }
      }
  }

  // Calculate expiration date
  let expiresAt: Date | null = null;
  if (subscription.current_period_end) {
    expiresAt = new Date(subscription.current_period_end * 1000);
  }

  // Update user subscription
  await db
    .update(users)
    .set({
      subscriptionTier: tier,
      subscriptionExpiresAt: expiresAt,
      stripeSubscriptionId: subscription.id,
    })
    .where(eq(users.id, user.id));
}

/**
 * Cancel user subscription (set to free)
 */
export async function cancelUserSubscription(stripeCustomerId: string): Promise<void> {
  // Find user by Stripe customer ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, stripeCustomerId))
    .limit(1);

  if (!user) {
    console.error(`User not found for Stripe customer: ${stripeCustomerId}`);
    return;
  }

  // Update user to free tier
  await db
    .update(users)
    .set({
      subscriptionTier: 'free',
      subscriptionExpiresAt: null,
      stripeSubscriptionId: null,
    })
    .where(eq(users.id, user.id));
}

/**
 * Find user by Stripe customer ID
 */
export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return user || null;
}

/**
 * Find user by Stripe subscription ID
 */
export async function getUserByStripeSubscriptionId(stripeSubscriptionId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  return user || null;
}

