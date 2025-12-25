import { storage } from '../storage';
import { type ChallengeOption, type InsertAttempt } from '@shared/schema';
import { calculateRankingScore, getGradeTier } from './scoringService';
import { updateAggregatesForNewAttempt } from './aggregateService';
import { updateStreakForCompletion } from './streakService';
import { checkAndAwardBadges, getUserBadgeContext } from './badgeService';

export async function submitAttempt(
  userId: string,
  challengeId: string,
  dateKey: string,
  ranking: string[]
): Promise<{ attemptId: string; score: number; grade: string }> {
  const challenge = await storage.getChallengeById(challengeId);
  if (!challenge) {
    throw new Error('Challenge not found');
  }

  const idealRanking = [...challenge.options]
    .sort((a, b) => a.orderingIndex - b.orderingIndex)
    .map(opt => opt.id);

  const score = calculateRankingScore(ranking, idealRanking);
  const grade = getGradeTier(score);

  const existingBest = await storage.getBestAttemptForChallenge(userId, challengeId);
  const isBest = !existingBest || score > existingBest.scoreNumeric;

  const attemptData: InsertAttempt = {
    userId,
    challengeId,
    rankingJson: ranking,
    scoreNumeric: score,
    gradeTier: grade,
    isBestAttempt: isBest,
  };

  const newAttempt = await storage.createAttempt(attemptData);

  if (isBest) {
    if (existingBest) {
      await storage.updateAttemptBestStatus(existingBest.id, false);
    }
    
    await updateAggregatesForNewAttempt(
      challengeId,
      ranking,
      score,
      existingBest ? existingBest.scoreNumeric : null
    );
    
    await updateStreakForCompletion(userId, dateKey);
  }

  // Check and award badges (only for best attempts to avoid spam)
  if (isBest) {
    try {
      const context = await getUserBadgeContext(
        userId,
        score,
        challengeId,
        existingBest ? existingBest.scoreNumeric : null
      );
      await checkAndAwardBadges(context);
    } catch (error) {
      // Don't fail the attempt if badge checking fails
      console.error('Error checking badges:', error);
    }
  }

  return {
    attemptId: newAttempt.id,
    score: newAttempt.scoreNumeric,
    grade: newAttempt.gradeTier,
  };
}
