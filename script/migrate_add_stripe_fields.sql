-- Migration: Add Stripe, subscription, and trial tracking fields to users table
-- Run this migration to add all subscription-related fields
-- This combines: subscription fields, trial tracking, and Stripe fields

-- ==================== SUBSCRIPTION FIELDS ====================
-- Add subscription_tier column (defaults to 'free')
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free' NOT NULL;

-- Add subscription_expires_at column (nullable)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

-- Add index on subscription_tier for faster queries
CREATE INDEX IF NOT EXISTS users_subscription_tier_idx ON users(subscription_tier);

-- Update existing users to have 'free' tier if not set
UPDATE users 
SET subscription_tier = 'free' 
WHERE subscription_tier IS NULL;

-- ==================== TRIAL TRACKING ====================
-- Add has_used_free_trial column (defaults to false)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_used_free_trial BOOLEAN DEFAULT false NOT NULL;

-- Update existing users to have false if not set
UPDATE users 
SET has_used_free_trial = false 
WHERE has_used_free_trial IS NULL;

-- ==================== STRIPE FIELDS ====================
-- Add stripe_customer_id column (nullable - only set when user creates Stripe customer)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Add stripe_subscription_id column (nullable - only set when user has active subscription)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Add index on stripe_customer_id for faster lookups
CREATE INDEX IF NOT EXISTS users_stripe_customer_id_idx ON users(stripe_customer_id);

-- Add index on stripe_subscription_id for faster lookups
CREATE INDEX IF NOT EXISTS users_stripe_subscription_id_idx ON users(stripe_subscription_id);

