import { storage } from '../storage';
import { type Attempt, type DailyChallenge, type ChallengeOption } from '@shared/schema';

export interface UserRiskProfile {
  userId: string;
  overallRiskScore: number; // 0-100, higher = more risky choices
  categoryRiskScores: Record<string, number>;
  riskTrend: 'improving' | 'stable' | 'declining';
  conversionSignals: {
    needsInsurance: boolean;
    needsInvestmentAdvice: boolean;
    needsDebtHelp: boolean;
    needsRetirementPlanning: boolean;
    needsTaxAdvice: boolean;
  };
  totalAttempts: number;
  averageScore: number;
  demographics?: {
    age?: number | null;
    incomeBracket?: string | null;
  };
}

export async function calculateUserRiskProfile(userId: string): Promise<UserRiskProfile> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const attempts = await storage.getUserAttempts(userId);
  const bestAttempts = attempts.filter(a => a.isBestAttempt);
  
  if (bestAttempts.length === 0) {
    return {
      userId,
      overallRiskScore: 0,
      categoryRiskScores: {},
      riskTrend: 'stable',
      conversionSignals: {
        needsInsurance: false,
        needsInvestmentAdvice: false,
        needsDebtHelp: false,
        needsRetirementPlanning: false,
        needsTaxAdvice: false,
      },
      totalAttempts: 0,
      averageScore: 0,
      demographics: {
        age: user.birthday ? calculateAge(user.birthday) : null,
        incomeBracket: user.incomeBracket || null,
      },
    };
  }

  // OPTIMIZATION: Batch fetch all challenges in parallel (O(1) queries instead of O(n))
  const challengeIds = [...new Set(bestAttempts.map(a => a.challengeId))];
  const challenges = await Promise.all(
    challengeIds.map(id => storage.getChallengeById(id))
  );
  const challengeMap = new Map(
    challenges.filter(Boolean).map(c => [c!.id, c!])
  );

  // OPTIMIZATION: Pre-compute ideal rankings once per challenge (O(n log n) once vs O(n² log n))
  const idealRankingMap = new Map<string, string[]>();
  for (const challenge of challengeMap.values()) {
    idealRankingMap.set(
      challenge.id,
      [...challenge.options]
        .sort((a, b) => a.orderingIndex - b.orderingIndex)
        .map(opt => opt.id)
    );
  }

  const categoryRiskCounts: Record<string, { risky: number; total: number }> = {};
  const categoryScores: Record<string, number[]> = {};
  const recentScores: number[] = [];
  const olderScores: number[] = [];
  const now = Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;

  // Single pass through attempts (O(n) time, O(1) space per attempt)
  for (const attempt of bestAttempts) {
    const challenge = challengeMap.get(attempt.challengeId);
    if (!challenge) continue;

    const category = challenge.category;
    if (!categoryRiskCounts[category]) {
      categoryRiskCounts[category] = { risky: 0, total: 0 };
      categoryScores[category] = [];
    }

    categoryRiskCounts[category].total++;
    categoryScores[category].push(attempt.scoreNumeric);

    // Use pre-computed ideal ranking (O(1) lookup instead of O(n log n) sort per iteration)
    const idealRanking = idealRankingMap.get(challenge.id)!;
    const ranking = attempt.rankingJson as string[];
    
    // OPTIMIZATION: Use Map for O(1) lookup instead of indexOf (O(n))
    const idealRankingSet = new Map(idealRanking.map((id, idx) => [id, idx]));
    const firstChoicePos = idealRankingSet.get(ranking[0]) ?? -1;
    const secondChoicePos = idealRankingSet.get(ranking[1]) ?? -1;

    if (firstChoicePos >= 2 || secondChoicePos >= 2) {
      categoryRiskCounts[category].risky++;
    }

    // OPTIMIZATION: Calculate daysAgo once, reuse
    const daysAgo = (now - new Date(attempt.submittedAt).getTime()) / msPerDay;
    if (daysAgo <= 30) {
      recentScores.push(attempt.scoreNumeric);
    } else if (daysAgo <= 60) {
      olderScores.push(attempt.scoreNumeric);
    }
  }

  // Calculate category risk scores (percentage of risky choices)
  const categoryRiskScores: Record<string, number> = {};
  for (const [category, counts] of Object.entries(categoryRiskCounts)) {
    const riskRate = counts.total > 0 ? (counts.risky / counts.total) * 100 : 0;
    categoryRiskScores[category] = Math.round(riskRate);
  }

  // Calculate overall risk score (weighted average of category risk scores)
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [category, riskScore] of Object.entries(categoryRiskScores)) {
    const weight = categoryRiskCounts[category].total;
    weightedSum += riskScore * weight;
    totalWeight += weight;
  }
  
  const overallRiskScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // Determine risk trend
  let riskTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recentScores.length > 0 && olderScores.length > 0) {
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
    
    if (recentAvg > olderAvg + 5) {
      riskTrend = 'improving';
    } else if (recentAvg < olderAvg - 5) {
      riskTrend = 'declining';
    }
  }

  // Calculate average score
  const totalScore = bestAttempts.reduce((sum, a) => sum + a.scoreNumeric, 0);
  const averageScore = bestAttempts.length > 0 ? Math.round(totalScore / bestAttempts.length) : 0;

  // Determine conversion signals based on category risk scores
  const needsInsurance = (categoryRiskScores['Insurance'] || 0) > 30;
  const needsInvestmentAdvice = (categoryRiskScores['Investing'] || 0) > 30;
  const needsDebtHelp = (categoryRiskScores['Debt'] || 0) > 30;
  const needsRetirementPlanning = (categoryRiskScores['Retirement'] || 0) > 30;
  const needsTaxAdvice = (categoryRiskScores['Taxes'] || 0) > 30;

  return {
    userId,
    overallRiskScore,
    categoryRiskScores,
    riskTrend,
    conversionSignals: {
      needsInsurance,
      needsInvestmentAdvice,
      needsDebtHelp,
      needsRetirementPlanning,
      needsTaxAdvice,
    },
    totalAttempts: bestAttempts.length,
    averageScore,
    demographics: {
      age: user.birthday ? calculateAge(user.birthday) : null,
      incomeBracket: user.incomeBracket || null,
    },
  };
}

function calculateAge(birthday: Date | string | null): number | null {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

