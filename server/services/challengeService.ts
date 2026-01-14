import { storage } from '../storage';
import { getActiveDateKey } from './dateService';
import { subDays, format, parse } from 'date-fns';
import { db } from '../db';
import { attempts, dailyChallenges } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export async function getTodayChallenge() {
  const dateKey = getActiveDateKey();
  return await storage.getChallengeByDateKey(dateKey);
}

export async function getYesterdayChallenge(userTodayKey?: string) {
  // Use user's local "today" if provided, otherwise use server timezone
  const todayKey = userTodayKey || getActiveDateKey();
  const today = parse(todayKey + 'T00:00:00', 'yyyy-MM-dd\'T\'HH:mm:ss', new Date());
  const yesterday = subDays(today, 1);
  const dateKey = format(yesterday, 'yyyy-MM-dd');
  return await storage.getChallengeByDateKey(dateKey);
}

export async function canAccessChallenge(dateKey: string, userId: string, userTodayKey?: string): Promise<boolean> {
  // Use user's local "today" if provided, otherwise fall back to server timezone
  const todayKey = userTodayKey || getActiveDateKey();
  const today = parse(todayKey + 'T00:00:00', 'yyyy-MM-dd\'T\'HH:mm:ss', new Date());
  const yesterday = subDays(today, 1);
  const yesterdayKey = format(yesterday, 'yyyy-MM-dd');
  const dayBeforeYesterday = subDays(today, 2);
  const dayBeforeYesterdayKey = format(dayBeforeYesterday, 'yyyy-MM-dd');

  // Always allow today and 2 days prior (3 total days free)
  if (dateKey === todayKey || dateKey === yesterdayKey || dateKey === dayBeforeYesterdayKey) {
    return true;
  }

  // Check if the date is in the past (today or earlier)
  const isPastDate = dateKey <= todayKey;
  
  // Calculate if challenge is older than 3 days
  const challengeDate = parse(dateKey, 'yyyy-MM-dd', new Date());
  const daysAgo = Math.floor((today.getTime() - challengeDate.getTime()) / (1000 * 60 * 60 * 24));
  const isOlderThan3Days = daysAgo > 2;
  
  // If older than 3 days, check Pro access
  if (isOlderThan3Days && isPastDate) {
    const user = await storage.getUser(userId);
    const isPro = (user as any)?.subscriptionTier === 'pro';
    const subscriptionExpiresAt = (user as any)?.subscriptionExpiresAt 
      ? new Date((user as any).subscriptionExpiresAt) 
      : null;
    const hasProAccess = isPro && (subscriptionExpiresAt === null || subscriptionExpiresAt > new Date());
    
    if (!hasProAccess) {
      return false; // Locked for non-Pro users
    }
  }

  // If the archive flag is enabled, allow all PAST dates (but not future)
  const archiveFlag = await storage.getFeatureFlag('ARCHIVE_OLDER_THAN_YESTERDAY');
  if (archiveFlag?.enabled && isPastDate) {
    return true;
  }

  // Future dates are always locked unless user has already attempted
  // Use JOIN query by dateKey to handle re-seeded challenges (same approach as archive route)
  try {
    const attemptsWithDateKey = await db
      .select({
        attempt: attempts,
      })
      .from(attempts)
      .innerJoin(dailyChallenges, eq(attempts.challengeId, dailyChallenges.id))
      .where(
        and(
          eq(attempts.userId, userId),
          eq(dailyChallenges.dateKey, dateKey)
        )
      )
      .limit(1);
    
    return attemptsWithDateKey.length > 0;
  } catch (error) {
    // Fallback: if JOIN fails, try the old method (for backward compatibility)
    console.warn('canAccessChallenge: Using fallback method', error);
    const challenge = await storage.getChallengeByDateKey(dateKey);
    if (!challenge) {
      return false;
    }
    const userAttempt = await storage.getUserAttemptForChallenge(userId, challenge.id);
    return !!userAttempt;
  }
}
