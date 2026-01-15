-- Migration: Add birthday and income_bracket fields to users table
-- Run this SQL script against your database to add the new profile fields

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS birthday TIMESTAMP,
ADD COLUMN IF NOT EXISTS income_bracket VARCHAR(20);

-- Add index for income bracket queries (useful for future analytics)
CREATE INDEX IF NOT EXISTS income_bracket_idx ON users(income_bracket) WHERE income_bracket IS NOT NULL;

-- Note: Both fields are nullable, so existing users won't be affected
-- Anonymous users will have NULL values, logged-in users can optionally set these


