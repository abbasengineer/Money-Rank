export type Tier = 'Optimal' | 'Reasonable' | 'Risky';
export type Grade = 'Great' | 'Good' | 'Risky';

export interface ChallengeOption {
  id: string;
  text: string;
  tier: Tier;
  explanation: string;
  idealRank: number; // 1-4
}

export interface Challenge {
  id: string;
  dateKey: string; // YYYY-MM-DD
  title: string;
  scenario: string;
  assumptions: string;
  category: string;
  difficulty: number;
  options: ChallengeOption[];
  isPublished: boolean;
}

export interface Attempt {
  id: string;
  challengeId: string;
  userId: string;
  submittedAt: string;
  ranking: string[]; // Array of option IDs
  score: number;
  grade: Grade;
  isBest: boolean;
}

export interface UserStats {
  streak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  totalAttempts: number;
  averageScore: number;
  bestPercentile: number;
}

export interface UserRiskProfile {
  userId: string;
  overallRiskScore: number;
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

export interface ScoreHistory {
  averages: {
    last7Days: number;
    last30Days: number;
    allTime: number;
  };
  scoreDistribution: {
    perfect: number;
    great: number;
    good: number;
    risky: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  trendPercent: number;
  totalAttempts: number;
  bestScore: number;
  worstScore: number;
  scoreHistory: Array<{
    date: string;
    score: number;
    challengeId: string;
  }>;
}

export interface CategoryPerformance {
  categories: Array<{
    category: string;
    averageScore: number;
    attempts: number;
    bestScore: number;
    worstScore: number;
  }>;
}
