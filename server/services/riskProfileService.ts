import { storage } from '../storage';
import { type DailyChallenge, type ChallengeOption } from '@shared/schema';

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
  /** Mean scenario score (0–100) per category—smoother than categoryRiskScores for single attempts. */
  categoryScenarioScores?: Record<string, number>;
  demographics?: {
    age?: number | null;
    incomeBracket?: string | null;
    annualSalaryApprox?: number | null;
  };
}

/** Minimal attempt shape for risk math (used by user profile and one-off assessments) */
export type BestAttemptLike = {
  challengeId: string;
  scoreNumeric: number;
  rankingJson: unknown;
  submittedAt: Date | string;
};

export function buildRiskProfileFromBestAttempts(params: {
  userId: string;
  bestAttempts: BestAttemptLike[];
  challengeMap: Map<string, DailyChallenge & { options: ChallengeOption[] }>;
  demographics?: {
    age?: number | null;
    incomeBracket?: string | null;
    annualSalaryApprox?: number | null;
  };
}): UserRiskProfile {
  const { userId, bestAttempts, challengeMap, demographics } = params;

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
      categoryScenarioScores: {},
      demographics,
    };
  }

  const idealRankingMap = new Map<string, string[]>();
  for (const challenge of Array.from(challengeMap.values())) {
    try {
      if (!challenge.options || challenge.options.length === 0) {
        console.warn(`Challenge ${challenge.id} has no options, skipping ideal ranking`);
        continue;
      }
      idealRankingMap.set(
        challenge.id,
        [...challenge.options]
          .sort((a, b) => a.orderingIndex - b.orderingIndex)
          .map(opt => opt.id)
      );
    } catch (error) {
      console.warn(`Failed to compute ideal ranking for challenge ${challenge.id}:`, error);
    }
  }

  const categoryRiskCounts: Record<string, { risky: number; total: number }> = {};
  const categoryScenarioAgg: Record<string, { sum: number; count: number }> = {};
  const recentScores: number[] = [];
  const olderScores: number[] = [];
  const now = Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;

  for (const attempt of bestAttempts) {
    try {
      const challenge = challengeMap.get(attempt.challengeId);
      if (!challenge) continue;

      const category = challenge.category;
      if (!category) continue;

      if (!categoryRiskCounts[category]) {
        categoryRiskCounts[category] = { risky: 0, total: 0 };
      }

      categoryRiskCounts[category].total++;

      if (!categoryScenarioAgg[category]) {
        categoryScenarioAgg[category] = { sum: 0, count: 0 };
      }
      categoryScenarioAgg[category].sum += attempt.scoreNumeric;
      categoryScenarioAgg[category].count += 1;

      const idealRanking = idealRankingMap.get(challenge.id);
      if (!idealRanking || idealRanking.length === 0) {
        const daysAgo = (now - new Date(attempt.submittedAt).getTime()) / msPerDay;
        if (daysAgo <= 30) {
          recentScores.push(attempt.scoreNumeric);
        } else if (daysAgo <= 60) {
          olderScores.push(attempt.scoreNumeric);
        }
        continue;
      }

      const ranking = attempt.rankingJson as string[] | null;
      if (!ranking || !Array.isArray(ranking) || ranking.length < 2) {
        const daysAgo = (now - new Date(attempt.submittedAt).getTime()) / msPerDay;
        if (daysAgo <= 30) {
          recentScores.push(attempt.scoreNumeric);
        } else if (daysAgo <= 60) {
          olderScores.push(attempt.scoreNumeric);
        }
        continue;
      }

      const idealRankingSet = new Map(idealRanking.map((id, idx) => [id, idx]));
      const firstChoicePos = idealRankingSet.get(ranking[0]) ?? -1;
      const secondChoicePos = idealRankingSet.get(ranking[1]) ?? -1;

      if (firstChoicePos >= 2 || secondChoicePos >= 2) {
        categoryRiskCounts[category].risky++;
      }

      const daysAgo = (now - new Date(attempt.submittedAt).getTime()) / msPerDay;
      if (daysAgo <= 30) {
        recentScores.push(attempt.scoreNumeric);
      } else if (daysAgo <= 60) {
        olderScores.push(attempt.scoreNumeric);
      }
    } catch (error) {
      console.warn(`Error processing attempt for risk profile:`, error);
      continue;
    }
  }

  const categoryRiskScores: Record<string, number> = {};
  for (const [category, counts] of Object.entries(categoryRiskCounts)) {
    const riskRate = counts.total > 0 ? (counts.risky / counts.total) * 100 : 0;
    categoryRiskScores[category] = Math.round(riskRate);
  }

  const categoryScenarioScores: Record<string, number> = {};
  for (const [category, agg] of Object.entries(categoryScenarioAgg)) {
    categoryScenarioScores[category] =
      agg.count > 0 ? Math.round(agg.sum / agg.count) : 0;
  }

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [category, riskScore] of Object.entries(categoryRiskScores)) {
    const weight = categoryRiskCounts[category].total;
    weightedSum += riskScore * weight;
    totalWeight += weight;
  }

  const overallRiskScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

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

  const totalScore = bestAttempts.reduce((sum, a) => sum + a.scoreNumeric, 0);
  const averageScore = bestAttempts.length > 0 ? Math.round(totalScore / bestAttempts.length) : 0;

  const taxRisk = Math.max(
    categoryRiskScores['Tax Planning'] ?? 0,
    categoryRiskScores['Taxes'] ?? 0
  );
  const retirementRisk = Math.max(
    categoryRiskScores['Retirement'] ?? 0,
    categoryRiskScores['Estate Planning'] ?? 0
  );

  const needsInsurance = (categoryRiskScores['Insurance'] || 0) > 30;
  const needsInvestmentAdvice = (categoryRiskScores['Investing'] || 0) > 30;
  const needsDebtHelp = (categoryRiskScores['Debt'] || 0) > 30;
  const needsRetirementPlanning = retirementRisk > 30;
  const needsTaxAdvice = taxRisk > 30;

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
    categoryScenarioScores,
    demographics,
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
      categoryScenarioScores: {},
      demographics: {
        age: user.birthday ? calculateAge(user.birthday) : null,
        incomeBracket: user.incomeBracket || null,
      },
    };
  }

  const challengeIds = Array.from(new Set(bestAttempts.map(a => a.challengeId)));
  const challenges = await Promise.all(
    challengeIds.map(async (id) => {
      try {
        return await storage.getChallengeById(id);
      } catch (error) {
        console.warn(`Failed to fetch challenge ${id} for risk profile:`, error);
        return null;
      }
    })
  );
  const challengeMap = new Map(
    challenges.filter(Boolean).map(c => [c!.id, c!])
  );

  const bestLike: BestAttemptLike[] = bestAttempts.map(a => ({
    challengeId: a.challengeId,
    scoreNumeric: a.scoreNumeric,
    rankingJson: a.rankingJson,
    submittedAt: a.submittedAt,
  }));

  return buildRiskProfileFromBestAttempts({
    userId,
    bestAttempts: bestLike,
    challengeMap,
    demographics: {
      age: user.birthday ? calculateAge(user.birthday) : null,
      incomeBracket: user.incomeBracket || null,
    },
  });
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
