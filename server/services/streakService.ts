import { storage } from '../storage';
import { subDays, format, parse, differenceInDays } from 'date-fns';
import { getActiveDateKey } from './dateService';

/**
 * Recalculate streak from all completed challenges
 * This ensures accuracy even if challenges are completed out of order
 */
export async function recalculateStreak(userId: string): Promise<void> {
  const attempts = await storage.getUserAttempts(userId);
  const bestAttempts = attempts.filter(a => a.isBestAttempt);
  
  // Get all challenges for these attempts to get their dateKeys
  const completedDateKeys = new Set<string>();
  for (const attempt of bestAttempts) {
    const challenge = await storage.getChallengeById(attempt.challengeId);
    if (challenge) {
      completedDateKeys.add(challenge.dateKey);
    }
  }
  
  // Sort dateKeys chronologically
  const sortedDateKeys = Array.from(completedDateKeys)
    .map(dk => parse(dk, 'yyyy-MM-dd', new Date()))
    .sort((a, b) => a.getTime() - b.getTime())
    .map(d => format(d, 'yyyy-MM-dd'));
  
  if (sortedDateKeys.length === 0) {
    await storage.upsertStreak({
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDateKey: null,
    });
    return;
  }
  
  // Calculate current streak (consecutive days ending with most recent)
  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;
  
  for (let i = sortedDateKeys.length - 1; i > 0; i--) {
    const current = parse(sortedDateKeys[i], 'yyyy-MM-dd', new Date());
    const previous = parse(sortedDateKeys[i - 1], 'yyyy-MM-dd', new Date());
    const daysDiff = differenceInDays(current, previous);
    
    if (daysDiff === 1) {
      tempStreak++;
      if (i === sortedDateKeys.length - 1) {
        currentStreak = tempStreak;
      }
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
      if (i === sortedDateKeys.length - 1) {
        currentStreak = 1;
      }
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak);
  
  await storage.upsertStreak({
    userId,
    currentStreak,
    longestStreak,
    lastCompletedDateKey: sortedDateKeys[sortedDateKeys.length - 1],
  });
}

export async function updateStreakForCompletion(userId: string, dateKey: string): Promise<void> {
  // Recalculate streak from all completed challenges to handle out-of-order completions
  // This ensures accuracy even if challenges are completed in non-sequential order
  await recalculateStreak(userId);
}

export async function getUserStreak(userId: string) {
  return await storage.getStreak(userId);
}
