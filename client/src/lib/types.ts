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
