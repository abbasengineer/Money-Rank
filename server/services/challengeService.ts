import { storage } from '../storage';
import { getActiveDateKey } from './dateService';
import { subDays, format } from 'date-fns';

export async function getTodayChallenge() {
  const dateKey = getActiveDateKey();
  return await storage.getChallengeByDateKey(dateKey);
}

export async function getYesterdayChallenge() {
  const yesterday = subDays(new Date(), 1);
  const dateKey = format(yesterday, 'yyyy-MM-dd');
  return await storage.getChallengeByDateKey(dateKey);
}

export async function canAccessChallenge(dateKey: string, userId: string): Promise<boolean> {
  const todayKey = getActiveDateKey();
  const yesterday = subDays(new Date(), 1);
  const yesterdayKey = format(yesterday, 'yyyy-MM-dd');

  if (dateKey === todayKey || dateKey === yesterdayKey) {
    return true;
  }

  const archiveFlag = await storage.getFeatureFlag('ARCHIVE_OLDER_THAN_YESTERDAY');
  if (archiveFlag?.enabled) {
    return true;
  }

  const userAttempt = await storage.getUserAttemptForChallenge(userId, dateKey);
  return !!userAttempt;
}
