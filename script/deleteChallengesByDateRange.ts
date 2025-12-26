import { db } from '../server/db';
import { dailyChallenges, attempts } from '../shared/schema';
import { and, gte, lte, eq, sql } from 'drizzle-orm';

async function deleteChallengesInDateRange() {
  const startDate = '2025-12-09';
  const endDate = '2025-12-16';

  console.log(`Finding challenges between ${startDate} and ${endDate}...`);

  // Get all challenges in the date range
  const challenges = await db
    .select()
    .from(dailyChallenges)
    .where(
      and(
        gte(dailyChallenges.dateKey, startDate),
        lte(dailyChallenges.dateKey, endDate)
      )
    )
    .orderBy(dailyChallenges.dateKey, dailyChallenges.createdAt);

  console.log(`Found ${challenges.length} challenges in date range:\n`);

  // Show all challenges with their attempt counts
  const challengesWithInfo = await Promise.all(
    challenges.map(async (challenge) => {
      const attemptCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(attempts)
        .where(eq(attempts.challengeId, challenge.id));

      return {
        ...challenge,
        attemptCount: Number(attemptCount[0]?.count || 0),
      };
    })
  );

  for (const challenge of challengesWithInfo) {
    console.log(`  ${challenge.dateKey}: ${challenge.id}`);
    console.log(`    Title: ${challenge.title}`);
    console.log(`    Created: ${challenge.createdAt}`);
    console.log(`    Attempts: ${challenge.attemptCount}`);
    console.log('');
  }

  // Check if any have attempts
  const withAttempts = challengesWithInfo.filter(c => c.attemptCount > 0);
  
  if (withAttempts.length > 0) {
    console.log(`⚠️  WARNING: ${withAttempts.length} challenges have attempts and cannot be safely deleted:`);
    for (const challenge of withAttempts) {
      console.log(`  - ${challenge.dateKey} (${challenge.id}): ${challenge.attemptCount} attempts`);
    }
    console.log('\nThese challenges have user attempts associated with them.');
    console.log('Deleting them would lose user data. Please confirm if you want to proceed.');
    console.log('\nTo delete ALL challenges in this range (including those with attempts),');
    console.log('you would need to first delete or migrate the attempts.');
    return;
  }

  // All safe to delete
  console.log(`\n✓ All ${challenges.length} challenges have no attempts. Safe to delete.`);
  console.log('\nDeleting challenges...\n');

  for (const challenge of challenges) {
    await db.delete(dailyChallenges).where(eq(dailyChallenges.id, challenge.id));
    console.log(`  ✓ Deleted ${challenge.dateKey} (${challenge.id})`);
  }

  console.log(`\n✅ Successfully deleted ${challenges.length} challenges!`);
}

// Run the script
deleteChallengesInDateRange()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

