-- Migration: Add free trial tracking to users table
-- Run this migration to track if users have used their free trial

-- Add has_used_free_trial column (defaults to false)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_used_free_trial BOOLEAN DEFAULT false NOT NULL;

-- Update existing users to have false if not set
UPDATE users 
SET has_used_free_trial = false 
WHERE has_used_free_trial IS NULL;

