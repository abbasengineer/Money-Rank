import { storage } from '../storage';
import { subDays, format, parse, differenceInDays } from 'date-fns';
import { getActiveDateKey } from './dateService';

export async function updateStreakForCompletion(userId: string, dateKey: string): Promise<void> {
  const streak = await storage.getStreak(userId);

  if (!streak) {
    await storage.upsertStreak({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedDateKey: dateKey,
    });
    return;
  }

  if (streak.lastCompletedDateKey === dateKey) {
    return;
  }

  const lastDate = parse(streak.lastCompletedDateKey || '2000-01-01', 'yyyy-MM-dd', new Date());
  const currentDate = parse(dateKey, 'yyyy-MM-dd', new Date());
  const daysDiff = differenceInDays(currentDate, lastDate);

  let newStreak = streak.currentStreak;
  
  if (daysDiff === 1) {
    newStreak = streak.currentStreak + 1;
  } else if (daysDiff > 1) {
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, streak.longestStreak);

  await storage.upsertStreak({
    userId,
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastCompletedDateKey: dateKey,
  });
}

export async function getUserStreak(userId: string) {
  return await storage.getStreak(userId);
}
