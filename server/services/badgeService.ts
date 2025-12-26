import { storage } from '../storage';
import { type Badge, type InsertUserBadge } from '@shared/schema';
import { calculatePercentile } from './aggregateService';

interface BadgeCheckContext {
  userId: string;
  totalAttempts: number;
  currentStreak: number;
  longestStreak: number;
  averageScore: number;
  bestPercentile: number | null;
  currentScore?: number;
  challengeId?: string;
  isAuthenticated: boolean;
  accountAgeDays?: number;
  previousBestScore?: number | null;
}

export async function checkAndAwardBadges(context: BadgeCheckContext): Promise<Badge[]> {
  const allBadges = await storage.getAllBadges();
  const newlyAwarded: Badge[] = [];

  for (const badge of allBadges) {
    // Skip if user already has this badge
    const hasBadge = await storage.hasBadge(context.userId, badge.id);
    if (hasBadge) continue;

    // Check if badge criteria is met
    const meetsCriteria = await checkBadgeCriteria(badge, context);
    
    if (meetsCriteria) {
      // Award the badge
      const metadata: Record<string, any> = {};
      if (context.currentScore !== undefined) {
        metadata.score = context.currentScore;
      }
      if (context.challengeId) {
        metadata.challengeId = context.challengeId;
      }
      
      await storage.awardBadge({
        userId: context.userId,
        badgeId: badge.id,
        metadata,
      });
      
      newlyAwarded.push(badge);
    }
  }

  return newlyAwarded;
}

async function checkBadgeCriteria(badge: Badge, context: BadgeCheckContext): Promise<boolean> {
  const config = badge.criteriaConfig as Record<string, any>;
  
  // Check minimum streak requirement if specified (for rare/epic/legendary badges)
  const minStreak = config.minStreak;
  if (minStreak !== undefined && context.currentStreak < minStreak) {
    return false;
  }

  switch (badge.criteriaType) {
    case 'total_attempts':
      return context.totalAttempts >= badge.criteriaValue;

    case 'current_streak':
      return context.currentStreak >= badge.criteriaValue;

    case 'longest_streak':
      return context.longestStreak >= badge.criteriaValue;

    case 'perfect_score':
      if (context.currentScore === undefined) return false;
      const minScore = config.minScore || 100;
      if (context.currentScore < minScore) return false;
      // minStreak already checked above
      return true;

    case 'single_score':
      if (context.currentScore === undefined) return false;
      const singleMinScore = config.minScore || 0;
      return context.currentScore >= singleMinScore;

    case 'high_scores':
      // Count how many best attempts meet the score threshold
      // We need to get the user's attempts to count high scores
      const highScoreMin = config.minScore || 0;
      const requiredCount = badge.criteriaValue;
      
      // Get user's best attempts to count high scores
      const attempts = await storage.getUserAttempts(context.userId);
      const bestAttempts = attempts.filter(a => a.isBestAttempt);
      const highScoreCount = bestAttempts.filter(a => a.scoreNumeric >= highScoreMin).length;
      
      // minStreak already checked above
      return highScoreCount >= requiredCount;

    case 'average_score':
      const minAttempts = config.minAttempts || 1;
      if (context.totalAttempts < minAttempts) return false;
      // minStreak already checked above
      return context.averageScore >= badge.criteriaValue;

    case 'percentile':
      if (context.bestPercentile === null) return false;
      const maxPercentile = config.maxPercentile || badge.criteriaValue;
      // minStreak already checked above
      return context.bestPercentile <= maxPercentile;

    case 'consistent_scores':
      // This requires checking multiple attempts
      // Simplified: check if current score meets threshold
      if (context.currentScore === undefined) return false;
      const consistentMin = config.minScore || 0;
      return context.currentScore >= consistentMin;

    case 'score_improvement':
      if (context.currentScore === undefined || context.previousBestScore === null || context.previousBestScore === undefined) {
        return false;
      }
      return context.currentScore > context.previousBestScore;

    case 'authenticated':
      return context.isAuthenticated;

    case 'account_age':
      if (context.accountAgeDays === undefined) return false;
      const maxAge = config.daysSinceCreation || badge.criteriaValue;
      return context.accountAgeDays <= maxAge;

    default:
      return false;
  }
}

// Helper function to get user stats for badge checking
export async function getUserBadgeContext(
  userId: string,
  currentScore?: number,
  challengeId?: string,
  previousBestScore?: number | null
): Promise<BadgeCheckContext> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const attempts = await storage.getUserAttempts(userId);
  const streak = await storage.getStreak(userId);
  
  // Calculate average score from best attempts only
  const bestAttempts = attempts.filter(a => a.isBestAttempt);
  const totalScore = bestAttempts.reduce((sum, a) => sum + a.scoreNumeric, 0);
  const averageScore = bestAttempts.length > 0 ? totalScore / bestAttempts.length : 0;

  // Calculate best percentile (simplified - would need to check all challenges)
  let bestPercentile: number | null = null;
  if (challengeId && currentScore !== undefined) {
    try {
      const percentile = await calculatePercentile(challengeId, currentScore);
      bestPercentile = percentile;
    } catch (error) {
      // Challenge might not have enough data yet
    }
  }

  // Calculate account age
  const accountAgeDays = user.createdAt
    ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : undefined;

  return {
    userId,
    totalAttempts: bestAttempts.length, // Use best attempts count, not all attempts
    currentStreak: streak?.currentStreak || 0,
    longestStreak: streak?.longestStreak || 0,
    averageScore,
    bestPercentile,
    currentScore,
    challengeId,
    isAuthenticated: user.authProvider !== 'anonymous',
    accountAgeDays,
    previousBestScore,
  };
}

