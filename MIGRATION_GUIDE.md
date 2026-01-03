# Migration Guide: Bug-Proof Archive & Attempt Storage

This guide walks you through the migration steps to fix archive inconsistencies and make attempt storage bug-proof.

## What This Fixes

1. **Archive inconsistency** - Archive now shows consistent results after refresh
2. **Challenge re-seeding** - Attempts are matched by `dateKey` instead of `challengeId`, so they survive challenge updates
3. **Wrong answers getting 100 points** - Added defensive validation in scoring
4. **Dec 24th not storing** - Fixed attempt matching to use `dateKey` as primary key
5. **Race conditions** - Added transactions and unique constraint for best attempts

## Migration Steps (Run in Order)

### Step 1: Add dateKey Column
```bash
tsx script/migrate_add_date_key_to_attempts.ts
```
This adds the `date_key` column to the `attempts` table and creates an index.

### Step 2: Backfill Existing Data
```bash
tsx script/backfill_date_key_to_attempts.ts
```
This populates `dateKey` for all existing attempts by matching them to their challenges.

**Note:** If you see warnings about orphaned attempts (attempts whose challenges no longer exist), these are expected and won't break anything. They just won't appear in archive until their challenge is restored.

### Step 3: Clean Up Duplicate Best Attempts
```bash
tsx script/cleanup_duplicate_best_attempts.ts
```
This removes duplicate best attempts, keeping only the one with the highest score (or most recent if tied).

### Step 4: Add Unique Constraint
```bash
tsx script/migrate_add_best_attempt_constraint.ts
```
This adds a database-level constraint to prevent duplicate best attempts in the future.

## Verification

After running all migrations:

1. **Test archive page** - Should show consistent results after refresh
2. **Test challenge completion** - New attempts should store `dateKey` automatically
3. **Test challenge re-seeding** - Attempts should still appear in archive even if challenge is updated

## Rollback (If Needed)

If you need to rollback:

```sql
-- Remove unique constraint
DROP INDEX IF EXISTS attempts_one_best_per_user_challenge;

-- Remove dateKey column (WARNING: This will lose data)
ALTER TABLE attempts DROP COLUMN IF EXISTS date_key;
DROP INDEX IF EXISTS user_date_key_idx;
```

## What Changed in Code

### Schema Changes
- Added `dateKey` column to `attempts` table (nullable for backward compatibility)
- Added index on `(user_id, date_key)` for efficient queries

### Code Changes
- **Archive endpoint**: Now uses efficient JOIN query instead of async loop
- **Attempt submission**: Uses transactions and stores `dateKey`
- **Scoring service**: Added defensive validation to prevent malformed rankings from getting 100 points
- **Best attempt constraint**: Database enforces one best attempt per user per challenge

## Troubleshooting

### "Duplicate key value violates unique constraint"
- Run the cleanup script first: `tsx script/cleanup_duplicate_best_attempts.ts`

### "Column date_key does not exist"
- Run the migration script: `tsx script/migrate_add_date_key_to_attempts.ts`

### Archive still showing inconsistent results
- Make sure backfill completed successfully
- Check that new attempts are being created with `dateKey`
- Verify the archive query is using the JOIN (check server logs)

## Support

If you encounter issues, check:
1. Database connection is working
2. All migrations ran successfully
3. No errors in server logs
4. New attempts are being created (check database directly)

