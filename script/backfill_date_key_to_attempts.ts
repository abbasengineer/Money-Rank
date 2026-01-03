// Backfill script to populate dateKey for existing attempts
// This matches attempts to challenges by challengeId and copies the challenge's dateKey

import { db, pool } from '../server/db';
import { attempts, dailyChallenges } from '../shared/schema';
import { eq, sql, isNull } from 'drizzle-orm';

async function backfill() {
  console.log('🔄 Starting backfill: Populate dateKey for existing attempts...\n');

  try {
    // Get count of attempts without dateKey
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attempts)
      .where(isNull(attempts.dateKey));

    const totalToBackfill = Number(countResult?.count || 0);

    if (totalToBackfill === 0) {
      console.log('✅ All attempts already have dateKey, nothing to backfill');
      return;
    }

    console.log(`Found ${totalToBackfill} attempts without dateKey\n`);

    // Update attempts with dateKey from their challenge
    // Use a single UPDATE with JOIN for efficiency
    console.log('Updating attempts with dateKey from challenges...');
    const result = await db.execute(sql`
      UPDATE attempts
      SET date_key = daily_challenges.date_key
      FROM daily_challenges
      WHERE attempts.challenge_id = daily_challenges.id
      AND attempts.date_key IS NULL
    `);

    const updatedCount = result.rowCount || 0;
    console.log(`✅ Updated ${updatedCount} attempts with dateKey\n`);

    // Check for orphaned attempts (attempts whose challenge no longer exists)
    const [orphanedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attempts)
      .where(isNull(attempts.dateKey));

    const orphaned = Number(orphanedCount?.count || 0);
    if (orphaned > 0) {
      console.warn(`⚠️  Warning: ${orphaned} attempts are orphaned (their challenge no longer exists)`);
      console.warn('   These attempts will not appear in archive until their challenge is restored');
      console.warn('   Consider investigating these attempts manually\n');
    }

    console.log('✅ Backfill completed successfully!\n');
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});

