-- Migration: Add subscription fields to users table
-- Run this migration to add subscription support

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

