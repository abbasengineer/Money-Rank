import { storage } from '../storage';
import { db } from '../db';
import { attempts, dailyChallenges, challengeOptions } from '@shared/schema';
import { type ChallengeOption, type InsertAttempt } from '@shared/schema';
import { calculateRankingScore, getGradeTier } from './scoringService';
import { updateAggregatesForNewAttempt } from './aggregateService';
import { updateStreakForCompletion } from './streakService';
import { checkAndAwardBadges, getUserBadgeContext } from './badgeService';
import { eq, and } from 'drizzle-orm';

export async function submitAttempt(
  userId: string,
  challengeId: string,
  dateKey: string,
  ranking: string[]
): Promise<{ attemptId: string; score: number; grade: string }> {
  // Use transaction to ensure atomicity and prevent race conditions
  return await db.transaction(async (tx) => {
    // Get challenge within transaction
    const [challenge] = await tx
      .select()
      .from(dailyChallenges)
      .where(eq(dailyChallenges.id, challengeId))
      .limit(1);
    
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    // Get challenge options
    const challengeOpts = await tx
      .select()
      .from(challengeOptions)
      .where(eq(challengeOptions.challengeId, challengeId));

    const idealRanking = [...challengeOpts]
      .sort((a, b) => a.orderingIndex - b.orderingIndex)
      .map(opt => opt.id);

    const score = calculateRankingScore(ranking, idealRanking, challengeOpts);
    const grade = getGradeTier(score);

    // Get existing best attempt within transaction to prevent race conditions
    const [existingBest] = await tx
      .select()
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, userId),
          eq(attempts.challengeId, challengeId),
          eq(attempts.isBestAttempt, true)
        )
      )
      .limit(1);

    const isBest = !existingBest || score > existingBest.scoreNumeric;

    const attemptData: InsertAttempt = {
      userId,
      challengeId,
      // Only include dateKey if column exists (will be null if column doesn't exist yet)
      ...(dateKey ? { dateKey } : {}),
      rankingJson: ranking,
      scoreNumeric: score,
      gradeTier: grade,
      isBestAttempt: isBest,
    };

    // Create attempt within transaction
    // Wrap in try-catch to handle missing column gracefully
    let newAttempt;
    try {
      [newAttempt] = await tx.insert(attempts).values(attemptData).returning();
    } catch (error: any) {
      // If dateKey column doesn't exist, retry without it
      if (error?.message?.includes('date_key') || error?.code === '42703') {
        const attemptDataWithoutDateKey = { ...attemptData };
        delete (attemptDataWithoutDateKey as any).dateKey;
        [newAttempt] = await tx.insert(attempts).values(attemptDataWithoutDateKey).returning();
      } else {
        throw error;
      }
    }

    if (isBest) {
      if (existingBest) {
        // Update old best attempt within transaction
        await tx
          .update(attempts)
          .set({ isBestAttempt: false })
          .where(eq(attempts.id, existingBest.id));
      }
      
      // Update aggregates (this should also use transaction, but for now keep as is)
      // Note: updateAggregatesForNewAttempt uses db directly, not tx
      // This is acceptable as aggregates are eventually consistent
      await updateAggregatesForNewAttempt(
        challengeId,
        ranking,
        score,
        existingBest ? existingBest.scoreNumeric : null
      );
      
      // Update streak (also uses db directly, acceptable for eventual consistency)
      await updateStreakForCompletion(userId, dateKey);
    }

    // Check and award badges (only for best attempts to avoid spam)
    // Do this outside transaction to avoid long-running operations in transaction
    if (isBest) {
      // Use setImmediate to run badge checking after transaction commits
      setImmediate(async () => {
        try {
          const context = await getUserBadgeContext(
            userId,
            score,
            challengeId,
            existingBest ? existingBest.scoreNumeric : null
          );
          const awardedBadges = await checkAndAwardBadges(context);
        } catch (error) {
          // Don't fail the attempt if badge checking fails
          console.error('Error checking badges:', error);
        }
      });
    }

    return {
      attemptId: newAttempt.id,
      score: newAttempt.scoreNumeric,
      grade: newAttempt.gradeTier,
    };
  });
}
