import { Challenge, ChallengeOption, Attempt, UserStats } from './types';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

// Mock Data Store

// 1. Initial Challenges (Seed Data)
const MOCK_CHALLENGES: Challenge[] = [
  {
    id: 'c-today',
    dateKey: format(new Date(), 'yyyy-MM-dd'),
    title: 'Windfall: $10,000 Bonus',
    scenario: 'You just received a $10,000 unexpected bonus at work. You have some financial goals in progress.',
    assumptions: 'Assume you have $2k in credit card debt at 22% APR. You have a 1-month emergency fund. You are matching your employer 401k. You want to buy a house in 3 years.',
    category: 'Windfall',
    difficulty: 1,
    isPublished: true,
    options: [
      {
        id: 'opt-1',
        text: 'Pay off the $2k credit card debt completely',
        tier: 'Optimal',
        explanation: 'Guaranteed 22% return on investment. Always kill high-interest debt first.',
        idealRank: 1
      },
      {
        id: 'opt-2',
        text: 'Boost emergency fund by $5,000',
        tier: 'Optimal',
        explanation: 'Getting to 3-6 months of expenses is crucial for stability before aggressive investing.',
        idealRank: 2
      },
      {
        id: 'opt-3',
        text: 'Put $3,000 into a High Yield Savings Account for the house',
        tier: 'Reasonable',
        explanation: 'Saving for the house is good, but high-interest debt and safety net take priority.',
        idealRank: 3
      },
      {
        id: 'opt-4',
        text: 'Invest all $10,000 in a tech stock ETF',
        tier: 'Risky',
        explanation: 'Market returns (~10%) usually won\'t beat the 22% debt interest, and you lack a safety net.',
        idealRank: 4
      }
    ]
  },
  {
    id: 'c-yesterday',
    dateKey: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    title: 'Subscription Audit',
    scenario: 'You are trying to cut $100/mo from your budget. Which cut makes the most sense?',
    assumptions: 'You use the gym 2x/week. You watch Netflix daily. You haven\'t used Audible in 3 months. You order takeout 4x/week.',
    category: 'Budgeting',
    difficulty: 1,
    isPublished: true,
    options: [
      {
        id: 'opt-y1',
        text: 'Cancel Audible ($15/mo) and unexpected takeout (save ~$80/mo)',
        tier: 'Optimal',
        explanation: 'Cut what you don\'t use and reduce high-cost conveniences.',
        idealRank: 1
      },
      {
        id: 'opt-y2',
        text: 'Cancel Gym Membership ($50/mo)',
        tier: 'Risky',
        explanation: 'Health is wealth. If you use it 2x/week, it\'s high value.',
        idealRank: 4
      },
      {
        id: 'opt-y3',
        text: 'Cancel Netflix ($20/mo)',
        tier: 'Reasonable',
        explanation: 'A luxury, but if you use it daily, the cost-per-hour is low.',
        idealRank: 3
      },
      {
        id: 'opt-y4',
        text: 'Switch to cheaper phone plan (save $30/mo) + cancel Audible',
        tier: 'Optimal',
        explanation: 'Reducing fixed costs without lifestyle impact is the gold standard.',
        idealRank: 2
      }
    ]
  }
];

// 2. User State (in-memory for now, resets on reload but good for MVP session)
let userAttempts: Attempt[] = [];
const userStats: UserStats = {
  streak: 2,
  longestStreak: 5,
  lastCompletedDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
  totalAttempts: 12,
  averageScore: 85,
  bestPercentile: 92
};

// 3. Service Functions

export const getChallengeByDate = (dateKey: string): Challenge | undefined => {
  return MOCK_CHALLENGES.find(c => c.dateKey === dateKey);
};

export const getTodayChallenge = () => getChallengeByDate(format(new Date(), 'yyyy-MM-dd'));

export const submitAttempt = (challengeId: string, ranking: string[]): Attempt => {
  const challenge = MOCK_CHALLENGES.find(c => c.id === challengeId);
  if (!challenge) throw new Error('Challenge not found');

  // Simple scoring logic: Kendall Tau-ish distance
  // Ideally, ranking should match challenge.options sorted by idealRank
  const idealOrder = [...challenge.options].sort((a, b) => a.idealRank - b.idealRank).map(o => o.id);
  
  let distance = 0;
  // Calculate displacement for each item
  ranking.forEach((id, index) => {
    const idealIndex = idealOrder.indexOf(id);
    distance += Math.abs(index - idealIndex);
  });
  
  // Max distance for 4 items is 8 (swapping 1st and 4th, 2nd and 3rd pairs)
  // Score: 100 - (distance * 12.5) -> Perfect=100, Worst=0
  const score = Math.max(0, 100 - (distance * 12.5));
  
  let grade: 'Great' | 'Good' | 'Risky' = 'Risky';
  if (score >= 90) grade = 'Great';
  else if (score >= 60) grade = 'Good';

  const attempt: Attempt = {
    id: `att-${Date.now()}`,
    challengeId,
    userId: 'user-1',
    submittedAt: new Date().toISOString(),
    ranking,
    score,
    grade,
    isBest: true // Simplification
  };

  userAttempts.push(attempt);
  return attempt;
};

export const getUserAttemptForChallenge = (challengeId: string) => {
  return userAttempts.find(a => a.challengeId === challengeId);
};

export const getUserStats = () => userStats;

export const getAggregates = (challengeId: string) => {
  // Mock aggregates
  return {
    percentile: 82, // Top 18%
    matchPercent: 12, // Only 12% got exact match
    topPickPercent: 45 // 45% chose the same #1
  };
};
