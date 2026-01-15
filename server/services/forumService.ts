import { db } from '../db';
import { forumPosts, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { storage } from '../storage';
import { getActiveDateKey } from './dateService';

/**
 * Auto-generate a daily discussion thread for a challenge
 * Called when a new challenge is published
 */
export async function createDailyThread(dateKey: string, challengeId?: string): Promise<void> {
  try {
    // Check if thread already exists
    const [existing] = await db
      .select()
      .from(forumPosts)
      .where(and(
        eq(forumPosts.postType, 'daily_thread'),
        eq(forumPosts.challengeDateKey, dateKey)
      ))
      .limit(1);

    if (existing) {
      return; // Thread already exists
    }

    // Get challenge details
    const challenge = await storage.getChallengeByDateKey(dateKey);
    if (!challenge) {
      console.warn(`Cannot create daily thread: Challenge not found for dateKey ${dateKey}`);
      return;
    }

    // Get first admin user as author, or use a system placeholder
    // In production, you might want a dedicated system user
    let systemUserId = process.env.SYSTEM_USER_ID;
    if (!systemUserId) {
      // Try to find an admin user
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const adminUsers = await db
          .select()
          .from(users)
          .where(eq(users.email, adminEmail))
          .limit(1);
        if (adminUsers.length > 0) {
          systemUserId = adminUsers[0].id;
        }
      }
    }
    // Fallback to first user if no admin found (shouldn't happen in production)
    if (!systemUserId) {
      const firstUser = await db.select().from(users).limit(1);
      systemUserId = firstUser[0]?.id || 'system';
    }
    
    // Create the daily thread
    await db.insert(forumPosts).values({
      title: `Daily Discussion: ${challenge.title} (${dateKey})`,
      content: `Discuss today's challenge: **${challenge.title}**\n\n**Scenario:**\n${challenge.scenarioText}\n\n**Assumptions:**\n${challenge.assumptions}\n\nShare your thoughts, reasoning, and discuss the options with the community!`,
      authorId: systemUserId,
      postType: 'daily_thread',
      challengeDateKey: dateKey,
    });

    console.log(`✅ Created daily thread for challenge ${dateKey}`);
  } catch (error) {
    console.error(`Error creating daily thread for ${dateKey}:`, error);
    // Don't throw - this is a background operation
  }
}

/**
 * Ensure daily thread exists for a dateKey
 * Can be called when user accesses the forum
 */
export async function ensureDailyThread(dateKey: string): Promise<string | null> {
  try {
    const [existing] = await db
      .select()
      .from(forumPosts)
      .where(and(
        eq(forumPosts.postType, 'daily_thread'),
        eq(forumPosts.challengeDateKey, dateKey)
      ))
      .limit(1);

    if (existing) {
      return existing.id;
    }

    // Create if doesn't exist
    await createDailyThread(dateKey);
    
    // Return the newly created thread ID
    const [newThread] = await db
      .select()
      .from(forumPosts)
      .where(and(
        eq(forumPosts.postType, 'daily_thread'),
        eq(forumPosts.challengeDateKey, dateKey)
      ))
      .limit(1);

    return newThread?.id || null;
  } catch (error) {
    console.error(`Error ensuring daily thread for ${dateKey}:`, error);
    return null;
  }
}

