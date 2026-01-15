import { Challenge, Attempt, UserStats, UserRiskProfile, ScoreHistory, CategoryPerformance } from './types';

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
    options: (apiChallenge.options || []).map(opt => ({
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
  // Get today's dateKey in user's local timezone
  const { getLocalTodayDateKey } = await import('./utils');
  const todayDateKey = getLocalTodayDateKey();
  
  // Request the challenge for today's dateKey (in user's timezone)
  return await getChallengeByDateKey(todayDateKey);
}

export async function getChallengeByDateKey(dateKey: string) {
  // Get user's local "today" to pass to server for timezone-aware lock checking
  const { getLocalTodayDateKey } = await import('./utils');
  const userTodayKey = getLocalTodayDateKey();
  
  const response = await fetch(`/api/challenge/${dateKey}?userToday=${userTodayKey}`, { credentials: 'include' });
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
    credentials: 'include',
    body: JSON.stringify({ challengeId, ranking }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit attempt');
  }
  
  return await response.json();
}

export async function getResults(challengeId: string) {
  const response = await fetch(`/api/results/${challengeId}`, { credentials: 'include' });
  if (!response.ok) {
    if (response.status === 404) {
      const error = new Error('No attempt found');
      (error as any).status = 404;
      throw error;
    }
    throw new Error(`Failed to fetch results: ${response.status}`);
  }
  const data = await response.json();
  return {
    attempt: transformAttempt(data.attempt),
    challenge: transformChallenge(data.challenge),
    stats: data.stats,
    explanation: data.explanation as OptimalityExplanation | null, // Add explanation
  };
}

export interface OptimalityExplanation {
  isPerfect: boolean;
  optimalRanking: ChallengeOption[];
  misplacedOptions: Array<{
    option: ChallengeOption;
    userPosition: number;
    optimalPosition: number;
    explanation: string;
  }>;
  summary: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
  metadata: Record<string, any>;
  badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
  };
}

export async function getUserBadges(): Promise<{ badges: UserBadge[] }> {
  const response = await fetch('/api/user/badges', { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Failed to fetch badges');
  }
  const data = await response.json();
  return data;
}

export async function getUserStats(): Promise<UserStats> {
  const response = await fetch('/api/user/stats', { credentials: 'include' });
  if (!response.ok) {
    // If user is not authenticated, return empty stats instead of throwing
    if (response.status === 401 || response.status === 403) {
      return {
        streak: 0,
        longestStreak: 0,
        lastCompletedDate: null,
        totalAttempts: 0,
        averageScore: 0,
        bestPercentile: 0,
      };
    }
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
  // Get user's local "today" to pass to server for timezone-aware filtering
  const { getLocalTodayDateKey } = await import('./utils');
  const userTodayKey = getLocalTodayDateKey();
  
  const response = await fetch(`/api/archive?userToday=${userTodayKey}`, { credentials: 'include' });
  if (!response.ok) {
    const error: any = new Error('Failed to fetch archive');
    error.status = response.status;
    if (response.status === 401) {
      error.message = 'Authentication required';
    }
    throw error;
  }
  const data = await response.json();
  return data.map((item: any) => ({
    challenge: transformChallenge(item),
    hasAttempted: item.hasAttempted,
    attempt: item.attempt ? transformAttempt(item.attempt) : null,
    isLocked: item.isLocked,
    requiresPro: item.requiresPro || false, // Flag indicating challenge requires Pro access
    completedAt: item.completedAt || null, // Raw timestamp for client-side timezone handling
  }));
}

export async function getUserRiskProfile(): Promise<UserRiskProfile> {
  const response = await fetch('/api/user/risk-profile', { credentials: 'include' });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    throw new Error('Failed to fetch risk profile');
  }
  return await response.json();
}

export async function getUserScoreHistory(): Promise<ScoreHistory> {
  const response = await fetch('/api/user/score-history', { credentials: 'include' });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    throw new Error('Failed to fetch score history');
  }
  return await response.json();
}

export async function getUserCategoryPerformance(): Promise<CategoryPerformance> {
  const response = await fetch('/api/user/category-performance', { credentials: 'include' });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required');
    }
    throw new Error('Failed to fetch category performance');
  }
  return await response.json();
}

// Admin API functions
export async function adminLogin(password: string) {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    throw new Error('Invalid password');
  }
  return await response.json();
}

export async function getAdminAnalytics(token: string) {
  const response = await fetch('/api/admin/analytics', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return await response.json();
}

export async function getAdminChallenges(token: string) {
  const response = await fetch('/api/admin/challenges', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch challenges');
  return await response.json();
}

export async function checkDuplicateChallenge(token: string, dateKey: string, title: string, challengeId?: string) {
  const response = await fetch('/api/admin/challenges/check-duplicate', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({ dateKey, title, challengeId }),
  });
  if (!response.ok) throw new Error('Failed to check for duplicates');
  return await response.json();
}

export async function createAdminChallenge(token: string, data: any) {
  const response = await fetch('/api/admin/challenges', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to create challenge');
  }
  return await response.json();
}

export async function updateAdminChallenge(token: string, id: string, data: any) {
  const response = await fetch(`/api/admin/challenges/${id}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update challenge');
  return await response.json();
}

export async function deleteAdminChallenge(token: string, id: string) {
  const response = await fetch(`/api/admin/challenges/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to delete challenge');
  return await response.json();
}

export async function getAdminChallengeStats(token: string, challengeId: string) {
  const response = await fetch(`/api/admin/challenges/${challengeId}/stats`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch challenge stats');
  return await response.json();
}

export async function getAdminUserRiskProfile(token: string, userId: string) {
  const response = await fetch(`/api/admin/users/${userId}/risk-profile`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch user risk profile');
  return await response.json();
}

export async function getCategoryAnalytics(token: string) {
  const response = await fetch('/api/admin/analytics/categories', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch category analytics');
  return await response.json();
}

export async function getUserByEmail(token: string, email: string) {
  const response = await fetch(`/api/admin/users/by-email?email=${encodeURIComponent(email)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to find user');
  }
  return await response.json();
}

// Auth API functions
export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatar: string | null;
  authProvider: string;
  birthday?: string | null;
  incomeBracket?: string | null;
  subscriptionTier?: 'free' | 'premium' | 'pro';
  subscriptionExpiresAt?: string | null;
}

export interface AuthResponse {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

export async function getCurrentUser(): Promise<AuthResponse> {
  const response = await fetch('/api/auth/user', { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return await response.json();
}

export async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to logout');
  }
}

export function getGoogleAuthUrl(): string {
  return '/api/auth/google';
}

export function getFacebookAuthUrl(): string {
  return '/api/auth/facebook';
}

export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(error.error || 'Registration failed');
  }
  
  return await response.json();
}

export interface LoginData {
  email: string;
  password: string;
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    try {
      const errorData = await response.json();
      // Extract user-friendly error message
      const errorMessage = errorData?.error || 'Invalid email or password';
      throw new Error(errorMessage);
    } catch (err) {
      // If JSON parsing fails, use default message
      if (err instanceof Error && err.message.includes('error')) {
        throw err;
      }
      throw new Error('Invalid email or password');
    }
  }
  
  return await response.json();
}

export async function updateDisplayName(displayName: string): Promise<AuthResponse> {
  const response = await fetch('/api/auth/user/display-name', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ displayName }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update display name' }));
    throw new Error(error.error || 'Failed to update display name');
  }
  
  return await response.json();
}

export interface UpdateProfileData {
  birthday?: string | null; // ISO date string (YYYY-MM-DD)
  incomeBracket?: string | null;
}

export async function updateProfile(data: UpdateProfileData): Promise<AuthResponse> {
  const response = await fetch('/api/auth/user/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update profile' }));
    throw new Error(error.error || 'Failed to update profile');
  }
  
  return await response.json();
}

export async function setEmail(email: string): Promise<AuthResponse> {
  const response = await fetch('/api/auth/set-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to set email' }));
    throw new Error(error.error || 'Failed to set email');
  }
  
  return await response.json();
}

// Helper function to calculate age from birthday
export function calculateAge(birthday: string | Date | null | undefined): number | null {
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
