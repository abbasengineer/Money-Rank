import { storage } from '../storage';
import { db } from '../db';
import { dailyChallenges } from '@shared/schema';
import { eq, or, ilike } from 'drizzle-orm';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType: 'exact_date' | 'similar_title' | null;
  existingChallenge?: {
    id: string;
    dateKey: string;
    title: string;
    createdAt: Date;
  };
  message?: string;
}

/**
 * Check if a challenge is a duplicate before creation
 * @param dateKey - The date key to check
 * @param title - The title to check for similarity
 * @returns Duplicate check result with details
 */
export async function checkForDuplicateChallenge(
  dateKey: string,
  title: string
): Promise<DuplicateCheckResult> {
  // Check 1: Exact date_key match (most critical)
  const existingByDate = await storage.getChallengeByDateKey(dateKey);
  
  if (existingByDate) {
    return {
      isDuplicate: true,
      duplicateType: 'exact_date',
      existingChallenge: {
        id: existingByDate.id,
        dateKey: existingByDate.dateKey,
        title: existingByDate.title,
        createdAt: existingByDate.createdAt,
      },
      message: `A challenge already exists for date ${dateKey}: "${existingByDate.title}"`,
    };
  }

  // Check 2: Similar title (case-insensitive, fuzzy match)
  // Normalize title for comparison (lowercase, trim, remove extra spaces)
  const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Get all challenges to check for similar titles
  const allChallenges = await storage.getAllChallenges();
  
  // Check for exact title match (case-insensitive)
  const exactTitleMatch = allChallenges.find(
    c => c.title.toLowerCase().trim() === normalizedTitle
  );
  
  if (exactTitleMatch) {
    return {
      isDuplicate: true,
      duplicateType: 'similar_title',
      existingChallenge: {
        id: exactTitleMatch.id,
        dateKey: exactTitleMatch.dateKey,
        title: exactTitleMatch.title,
        createdAt: exactTitleMatch.createdAt,
      },
      message: `A challenge with the same title already exists for date ${exactTitleMatch.dateKey}: "${exactTitleMatch.title}"`,
    };
  }

  // Check for very similar titles (fuzzy match - words overlap)
  const titleWords = normalizedTitle.split(/\s+/);
  const similarChallenge = allChallenges.find(challenge => {
    const challengeWords = challenge.title.toLowerCase().trim().split(/\s+/);
    
    // If titles share 70%+ of words, consider them similar
    const commonWords = titleWords.filter(word => 
      challengeWords.includes(word) && word.length > 3 // Ignore short words like "the", "a", etc.
    );
    const similarity = commonWords.length / Math.max(titleWords.length, challengeWords.length);
    
    return similarity >= 0.7;
  });

  if (similarChallenge) {
    return {
      isDuplicate: true,
      duplicateType: 'similar_title',
      existingChallenge: {
        id: similarChallenge.id,
        dateKey: similarChallenge.dateKey,
        title: similarChallenge.title,
        createdAt: similarChallenge.createdAt,
      },
      message: `A similar challenge already exists for date ${similarChallenge.dateKey}: "${similarChallenge.title}" (title similarity detected)`,
    };
  }

  return {
    isDuplicate: false,
    duplicateType: null,
  };
}

/**
 * Check for duplicates when updating a challenge (exclude the current challenge)
 */
export async function checkForDuplicateChallengeOnUpdate(
  challengeId: string,
  dateKey: string,
  title: string
): Promise<DuplicateCheckResult> {
  // Check for exact date_key match (excluding current challenge)
  const existingByDate = await db
    .select()
    .from(dailyChallenges)
    .where(eq(dailyChallenges.dateKey, dateKey))
    .limit(1);

  if (existingByDate.length > 0 && existingByDate[0].id !== challengeId) {
    return {
      isDuplicate: true,
      duplicateType: 'exact_date',
      existingChallenge: {
        id: existingByDate[0].id,
        dateKey: existingByDate[0].dateKey,
        title: existingByDate[0].title,
        createdAt: existingByDate[0].createdAt,
      },
      message: `Another challenge already exists for date ${dateKey}: "${existingByDate[0].title}"`,
    };
  }

  // Check for similar title (excluding current challenge)
  const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
  const allChallenges = await storage.getAllChallenges();
  
  const exactTitleMatch = allChallenges.find(
    c => c.id !== challengeId && c.title.toLowerCase().trim() === normalizedTitle
  );
  
  if (exactTitleMatch) {
    return {
      isDuplicate: true,
      duplicateType: 'similar_title',
      existingChallenge: {
        id: exactTitleMatch.id,
        dateKey: exactTitleMatch.dateKey,
        title: exactTitleMatch.title,
        createdAt: exactTitleMatch.createdAt,
      },
      message: `Another challenge with the same title exists for date ${exactTitleMatch.dateKey}: "${exactTitleMatch.title}"`,
    };
  }

  return {
    isDuplicate: false,
    duplicateType: null,
  };
}

