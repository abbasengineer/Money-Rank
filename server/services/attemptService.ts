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

  const score = calculateRankingScore(ranking, idealRanking, challenge.options);
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92028c41-09c4-4e46-867f-680fefcd7f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attemptService.ts:56',message:'Checking badges for attempt',data:{userId,score,challengeId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      const context = await getUserBadgeContext(
        userId,
        score,
        challengeId,
        existingBest ? existingBest.scoreNumeric : null
      );
      const awardedBadges = await checkAndAwardBadges(context);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92028c41-09c4-4e46-867f-680fefcd7f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attemptService.ts:64',message:'Badges checked',data:{awardedCount:awardedBadges.length,awardedIds:awardedBadges.map(b=>b.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // Don't fail the attempt if badge checking fails
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/92028c41-09c4-4e46-867f-680fefcd7f99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'attemptService.ts:68',message:'Badge check error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error('Error checking badges:', error);
    }
  }

  return {
    attemptId: newAttempt.id,
    score: newAttempt.scoreNumeric,
    grade: newAttempt.gradeTier,
  };
}
