import { db } from '../server/db';
import { dailyChallenges, attempts, aggregates } from '../shared/schema';
import { and, gte, lte, eq, sql } from 'drizzle-orm';

async function deleteChallengesSafely() {
  const startDate = '2025-12-09';
  const endDate = '2025-12-16';

  console.log(`Deleting challenges between ${startDate} and ${endDate}...\n`);

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
    .orderBy(dailyChallenges.dateKey);

  console.log(`Found ${challenges.length} challenges\n`);

  // Check attempt counts for each
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

  // Separate into safe to delete and those with attempts
  const safeToDelete = challengesWithInfo.filter(c => c.attemptCount === 0);
  const withAttempts = challengesWithInfo.filter(c => c.attemptCount > 0);

  // Step 1: Delete safe ones (no attempts)
  if (safeToDelete.length > 0) {
    console.log(`Step 1: Deleting ${safeToDelete.length} challenges with no attempts...\n`);
    for (const challenge of safeToDelete) {
      await db.delete(dailyChallenges).where(eq(dailyChallenges.id, challenge.id));
      console.log(`  ✓ Deleted ${challenge.dateKey} (${challenge.id})`);
    }
    console.log(`\n✅ Deleted ${safeToDelete.length} challenges\n`);
  }

  // Step 2: Handle challenges with attempts
  if (withAttempts.length > 0) {
    console.log(`Step 2: ${withAttempts.length} challenges have attempts:`);
    for (const challenge of withAttempts) {
      console.log(`  - ${challenge.dateKey}: ${challenge.attemptCount} attempts`);
    }
    
    console.log('\n⚠️  These challenges have user attempts. To delete them:');
    console.log('   1. First delete the attempts (this will lose user data)');
    console.log('   2. Then delete the challenges');
    console.log('\nProceeding to delete attempts and then challenges...\n');

    for (const challenge of withAttempts) {
      // Delete attempts first
      const deletedAttempts = await db
        .delete(attempts)
        .where(eq(attempts.challengeId, challenge.id))
        .returning();
      
      console.log(`  ✓ Deleted ${deletedAttempts.length} attempts for ${challenge.dateKey}`);
      
      // Now delete the challenge (aggregates will cascade delete)
      await db.delete(dailyChallenges).where(eq(dailyChallenges.id, challenge.id));
      console.log(`  ✓ Deleted challenge ${challenge.dateKey} (${challenge.id})\n`);
    }

    console.log(`✅ Deleted ${withAttempts.length} challenges with attempts\n`);
  }

  const totalDeleted = safeToDelete.length + withAttempts.length;
  console.log(`\n🎉 Complete! Deleted ${totalDeleted} challenges total:`);
  console.log(`   - ${safeToDelete.length} without attempts`);
  console.log(`   - ${withAttempts.length} with attempts (attempts also deleted)`);
}

// Run the script
deleteChallengesSafely()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  });


