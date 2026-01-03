// Script to clean up duplicate best attempts
// Ensures only one best attempt exists per user per challenge
// Keeps the attempt with the highest score, or most recent if scores are equal

import { db, pool } from '../server/db';
import { attempts } from '../shared/schema';
import { eq, sql, and } from 'drizzle-orm';

async function cleanup() {
  console.log('🔄 Starting cleanup: Remove duplicate best attempts...\n');

  try {
    // Find all user-challenge pairs with multiple best attempts
    const duplicates = await db.execute(sql`
      SELECT 
        user_id,
        challenge_id,
        COUNT(*) as count
      FROM attempts
      WHERE is_best_attempt = true
      GROUP BY user_id, challenge_id
      HAVING COUNT(*) > 1
    `);

    const duplicateCount = duplicates.rows.length;
    if (duplicateCount === 0) {
      console.log('✅ No duplicate best attempts found');
      return;
    }

    console.log(`Found ${duplicateCount} user-challenge pairs with duplicate best attempts\n`);

    let totalFixed = 0;

    // For each duplicate pair, keep only the best one
    for (const dup of duplicates.rows) {
      const userId = dup.user_id;
      const challengeId = dup.challenge_id;

      // Find all best attempts for this user-challenge pair
      const bestAttempts = await db
        .select()
        .from(attempts)
        .where(
          and(
            eq(attempts.userId, userId as string),
            eq(attempts.challengeId, challengeId as string),
            eq(attempts.isBestAttempt, true)
          )
        )
        .orderBy(sql`score_numeric DESC, submitted_at DESC`);

      if (bestAttempts.length <= 1) continue;

      // Keep the first one (highest score, or most recent if tied)
      const toKeep = bestAttempts[0];
      const toRemove = bestAttempts.slice(1);

      // Mark the others as not best
      for (const attempt of toRemove) {
        await db
          .update(attempts)
          .set({ isBestAttempt: false })
          .where(eq(attempts.id, attempt.id));
      }

      totalFixed += toRemove.length;
      console.log(
        `  Fixed user ${userId.substring(0, 8)}... challenge ${challengeId.substring(0, 8)}... ` +
        `(kept score ${toKeep.scoreNumeric}, removed ${toRemove.length} duplicates)`
      );
    }

    console.log(`\n✅ Cleanup completed: Fixed ${totalFixed} duplicate best attempts\n`);
    console.log('📝 Next step: Add unique constraint to prevent future duplicates');
    console.log('   Run: tsx script/migrate_add_best_attempt_constraint.ts\n');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

cleanup().catch((err) => {
  console.error(err);
  process.exit(1);
});

