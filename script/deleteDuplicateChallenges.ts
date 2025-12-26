import { db } from '../server/db';
import { dailyChallenges, attempts, aggregates } from '../shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

async function deleteDuplicateChallenges() {
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

  console.log(`Found ${challenges.length} challenges in date range`);

  // Group by date_key to find duplicates
  const challengesByDate = new Map<string, typeof challenges>();
  for (const challenge of challenges) {
    if (!challengesByDate.has(challenge.dateKey)) {
      challengesByDate.set(challenge.dateKey, []);
    }
    challengesByDate.get(challenge.dateKey)!.push(challenge);
  }

  // Find duplicates and determine which to keep
  const toDelete: string[] = [];
  const toKeep: string[] = [];

  for (const [dateKey, dateChallenges] of challengesByDate.entries()) {
    if (dateChallenges.length === 1) {
      console.log(`✓ ${dateKey}: Only one challenge, keeping it (${dateChallenges[0].id})`);
      toKeep.push(dateChallenges[0].id);
      continue;
    }

    console.log(`\n⚠ ${dateKey}: Found ${dateChallenges.length} challenges (duplicates)`);

    // For each challenge, count attempts
    const challengesWithAttempts = await Promise.all(
      dateChallenges.map(async (challenge) => {
        const attemptCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(attempts)
          .where(eq(attempts.challengeId, challenge.id));

        return {
          challenge,
          attemptCount: Number(attemptCount[0]?.count || 0),
        };
      })
    );

    // Sort by attempt count (desc), then by created_at (desc) to get newest
    challengesWithAttempts.sort((a, b) => {
      if (a.attemptCount !== b.attemptCount) {
        return b.attemptCount - a.attemptCount;
      }
      return new Date(b.challenge.createdAt).getTime() - new Date(a.challenge.createdAt).getTime();
    });

    // Keep the first one (most attempts or newest)
    const keeper = challengesWithAttempts[0];
    toKeep.push(keeper.challenge.id);

    console.log(`  Keeping: ${keeper.challenge.id} (${keeper.attemptCount} attempts, created: ${keeper.challenge.createdAt})`);

    // Mark others for deletion
    for (let i = 1; i < challengesWithAttempts.length; i++) {
      const duplicate = challengesWithAttempts[i];
      toDelete.push(duplicate.challenge.id);
      console.log(`  Deleting: ${duplicate.challenge.id} (${duplicate.attemptCount} attempts, created: ${duplicate.challenge.createdAt})`);
    }
  }

  if (toDelete.length === 0) {
    console.log('\n✓ No duplicates found. Nothing to delete.');
    return;
  }

  console.log(`\n📋 Summary:`);
  console.log(`  Keeping: ${toKeep.length} challenges`);
  console.log(`  Deleting: ${toDelete.length} challenges`);

  // Confirm deletion
  console.log(`\n⚠️  About to delete ${toDelete.length} duplicate challenges...`);
  console.log('This will also cascade delete:');
  console.log('  - challenge_options (cascade)');
  console.log('  - aggregates (cascade)');
  console.log('  - attempts (will fail if they exist - we\'ll handle this)');

  // Check if any challenges to delete have attempts
  const challengesWithAttempts = await Promise.all(
    toDelete.map(async (challengeId) => {
      const attemptCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(attempts)
        .where(eq(attempts.challengeId, challengeId));

      return {
        challengeId,
        attemptCount: Number(attemptCount[0]?.count || 0),
      };
    })
  );

  const withAttempts = challengesWithAttempts.filter(c => c.attemptCount > 0);
  if (withAttempts.length > 0) {
    console.log(`\n⚠️  WARNING: ${withAttempts.length} challenges to delete have attempts:`);
    for (const item of withAttempts) {
      console.log(`  - ${item.challengeId}: ${item.attemptCount} attempts`);
    }
    console.log('\nThese will need to be handled manually or migrated first.');
    console.log('Skipping deletion of challenges with attempts for safety.');
    
    // Only delete challenges without attempts
    const safeToDelete = toDelete.filter(id => 
      !withAttempts.some(w => w.challengeId === id)
    );

    if (safeToDelete.length === 0) {
      console.log('\n❌ No challenges safe to delete (all have attempts).');
      return;
    }

    console.log(`\nDeleting ${safeToDelete.length} challenges without attempts...`);
    for (const challengeId of safeToDelete) {
      await db.delete(dailyChallenges).where(eq(dailyChallenges.id, challengeId));
      console.log(`  ✓ Deleted ${challengeId}`);
    }
  } else {
    // Safe to delete all
    console.log('\n✓ All challenges to delete have no attempts. Proceeding with deletion...');
    for (const challengeId of toDelete) {
      await db.delete(dailyChallenges).where(eq(dailyChallenges.id, challengeId));
      console.log(`  ✓ Deleted ${challengeId}`);
    }
  }

  console.log('\n✅ Deletion complete!');
}

// Run if called directly
deleteDuplicateChallenges()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

