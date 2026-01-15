-- Migration: Add top_two_counts_json field to aggregates table
-- Run this SQL script against your database to add the new field for tracking top 2 choices

ALTER TABLE aggregates 
ADD COLUMN IF NOT EXISTS top_two_counts_json JSONB DEFAULT '{}' NOT NULL;

-- Update existing aggregates to have empty top_two_counts_json if they don't have it
UPDATE aggregates 
SET top_two_counts_json = '{}' 
WHERE top_two_counts_json IS NULL;

-- Note: This field tracks how many times each option was chosen in positions 1 or 2
-- Format: { "optionId": count }


