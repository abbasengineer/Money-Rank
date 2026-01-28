-- Migration: Add Stripe fields to users table
-- Run this migration to add Stripe customer and subscription tracking

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

