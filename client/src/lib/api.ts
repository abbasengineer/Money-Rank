import { Challenge, Attempt, UserStats } from './types';

interface ApiChallenge {
  id: string;
  dateKey: string;
  title: string;
  scenarioText: string;
  assumptions: string;
  category: string;
  difficulty: number;
  isPublished: boolean;
  options: Array<{
    id: string;
    optionText: string;
    tierLabel: string;
    explanationShort: string;
    orderingIndex: number;
  }>;
}

interface ApiAttempt {
  id: string;
  userId: string;
  challengeId: string;
  submittedAt: string;
  rankingJson: string[];
  scoreNumeric: number;
  gradeTier: string;
  isBestAttempt: boolean;
}

function transformChallenge(apiChallenge: ApiChallenge): Challenge {
  return {
    id: apiChallenge.id,
    dateKey: apiChallenge.dateKey,
    title: apiChallenge.title,
    scenario: apiChallenge.scenarioText,
    assumptions: apiChallenge.assumptions,
    category: apiChallenge.category,
    difficulty: apiChallenge.difficulty,
    isPublished: apiChallenge.isPublished,
    options: apiChallenge.options.map(opt => ({
      id: opt.id,
      text: opt.optionText,
      tier: opt.tierLabel as 'Optimal' | 'Reasonable' | 'Risky',
      explanation: opt.explanationShort,
      idealRank: opt.orderingIndex,
    })),
  };
}

function transformAttempt(apiAttempt: ApiAttempt): Attempt {
  return {
    id: apiAttempt.id,
    challengeId: apiAttempt.challengeId,
    userId: apiAttempt.userId,
    submittedAt: apiAttempt.submittedAt,
    ranking: apiAttempt.rankingJson,
    score: apiAttempt.scoreNumeric,
    grade: apiAttempt.gradeTier as 'Great' | 'Good' | 'Risky',
    isBest: apiAttempt.isBestAttempt,
  };
}

export async function getTodayChallenge() {
  const response = await fetch('/api/challenge/today');
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch today\'s challenge');
  }
  const data = await response.json();
  return {
    challenge: transformChallenge(data.challenge),
    hasAttempted: data.hasAttempted,
    attempt: data.attempt ? transformAttempt(data.attempt) : null,
  };
}

export async function getChallengeByDateKey(dateKey: string) {
  const response = await fetch(`/api/challenge/${dateKey}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    if (response.status === 403) throw new Error('Challenge is locked');
    throw new Error('Failed to fetch challenge');
  }
  const data = await response.json();
  return {
    challenge: transformChallenge(data.challenge),
    hasAttempted: data.hasAttempted,
    attempt: data.attempt ? transformAttempt(data.attempt) : null,
  };
}

export async function submitAttempt(challengeId: string, ranking: string[]) {
  const response = await fetch('/api/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, ranking }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit attempt');
  }
  
  return await response.json();
}

export async function getResults(challengeId: string) {
  const response = await fetch(`/api/results/${challengeId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch results');
  }
  const data = await response.json();
  return {
    attempt: transformAttempt(data.attempt),
    challenge: transformChallenge(data.challenge),
    stats: data.stats,
  };
}

export async function getUserStats(): Promise<UserStats> {
  const response = await fetch('/api/user/stats');
  if (!response.ok) {
    throw new Error('Failed to fetch user stats');
  }
  const data = await response.json();
  return {
    streak: data.currentStreak,
    longestStreak: data.longestStreak,
    lastCompletedDate: null,
    totalAttempts: data.totalAttempts,
    averageScore: data.averageScore,
    bestPercentile: data.bestPercentile,
  };
}

export async function getArchiveChallenges() {
  const response = await fetch('/api/archive');
  if (!response.ok) {
    throw new Error('Failed to fetch archive');
  }
  const data = await response.json();
  return data.map((item: any) => ({
    challenge: transformChallenge(item),
    hasAttempted: item.hasAttempted,
    attempt: item.attempt ? transformAttempt(item.attempt) : null,
    isLocked: item.isLocked,
  }));
}
