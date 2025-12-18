import { 
  type User, type InsertUser,
  type DailyChallenge, type InsertDailyChallenge,
  type ChallengeOption, type InsertChallengeOption,
  type Attempt, type InsertAttempt,
  type Aggregate, type InsertAggregate,
  type Streak, type InsertStreak,
  type RetryWallet, type InsertRetryWallet,
  type FeatureFlag, type InsertFeatureFlag,
  users, dailyChallenges, challengeOptions, attempts, aggregates, streaks, retryWallets, featureFlags
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getChallengeByDateKey(dateKey: string): Promise<(DailyChallenge & { options: ChallengeOption[] }) | undefined>;
  getChallengeById(id: string): Promise<(DailyChallenge & { options: ChallengeOption[] }) | undefined>;
  getAllChallenges(): Promise<DailyChallenge[]>;
  createChallenge(challenge: InsertDailyChallenge, options: InsertChallengeOption[]): Promise<DailyChallenge>;
  updateChallenge(id: string, challenge: Partial<InsertDailyChallenge>): Promise<DailyChallenge | undefined>;
  
  createAttempt(attempt: InsertAttempt): Promise<Attempt>;
  getUserAttemptForChallenge(userId: string, challengeId: string): Promise<Attempt | undefined>;
  getBestAttemptForChallenge(userId: string, challengeId: string): Promise<Attempt | undefined>;
  getUserAttempts(userId: string): Promise<Attempt[]>;
  updateAttemptBestStatus(attemptId: string, isBest: boolean): Promise<void>;
  
  getAggregate(challengeId: string): Promise<Aggregate | undefined>;
  upsertAggregate(aggregate: InsertAggregate): Promise<Aggregate>;
  
  getStreak(userId: string): Promise<Streak | undefined>;
  upsertStreak(streak: InsertStreak): Promise<Streak>;
  
  getRetryWallet(userId: string, weekKey: string): Promise<RetryWallet | undefined>;
  upsertRetryWallet(wallet: InsertRetryWallet): Promise<RetryWallet>;
  
  getFeatureFlag(key: string): Promise<FeatureFlag | undefined>;
  getAllFeatureFlags(): Promise<FeatureFlag[]>;
  upsertFeatureFlag(flag: InsertFeatureFlag): Promise<FeatureFlag>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getChallengeByDateKey(dateKey: string): Promise<(DailyChallenge & { options: ChallengeOption[] }) | undefined> {
    const [challenge] = await db.select().from(dailyChallenges).where(eq(dailyChallenges.dateKey, dateKey));
    if (!challenge) return undefined;
    
    const opts = await db.select().from(challengeOptions).where(eq(challengeOptions.challengeId, challenge.id));
    return { ...challenge, options: opts };
  }

  async getChallengeById(id: string): Promise<(DailyChallenge & { options: ChallengeOption[] }) | undefined> {
    const [challenge] = await db.select().from(dailyChallenges).where(eq(dailyChallenges.id, id));
    if (!challenge) return undefined;
    
    const opts = await db.select().from(challengeOptions).where(eq(challengeOptions.challengeId, challenge.id));
    return { ...challenge, options: opts };
  }

  async getAllChallenges(): Promise<DailyChallenge[]> {
    return await db.select().from(dailyChallenges).orderBy(desc(dailyChallenges.dateKey));
  }

  async createChallenge(challenge: InsertDailyChallenge, options: InsertChallengeOption[]): Promise<DailyChallenge> {
    return await db.transaction(async (tx) => {
      const [newChallenge] = await tx.insert(dailyChallenges).values(challenge).returning();
      
      const optionsWithChallengeId = options.map(opt => ({
        ...opt,
        challengeId: newChallenge.id
      }));
      
      await tx.insert(challengeOptions).values(optionsWithChallengeId);
      
      await tx.insert(aggregates).values({
        challengeId: newChallenge.id,
        bestAttemptCount: 0,
        topPickCountsJson: {},
        exactRankingCountsJson: {},
        scoreHistogramJson: {},
      });
      
      return newChallenge;
    });
  }

  async updateChallenge(id: string, challenge: Partial<InsertDailyChallenge>): Promise<DailyChallenge | undefined> {
    const [updated] = await db.update(dailyChallenges).set(challenge).where(eq(dailyChallenges.id, id)).returning();
    return updated || undefined;
  }

  async createAttempt(attempt: InsertAttempt): Promise<Attempt> {
    const [newAttempt] = await db.insert(attempts).values(attempt).returning();
    return newAttempt;
  }

  async getUserAttemptForChallenge(userId: string, challengeId: string): Promise<Attempt | undefined> {
    const [attempt] = await db.select().from(attempts)
      .where(and(eq(attempts.userId, userId), eq(attempts.challengeId, challengeId)))
      .orderBy(desc(attempts.submittedAt))
      .limit(1);
    return attempt || undefined;
  }

  async getBestAttemptForChallenge(userId: string, challengeId: string): Promise<Attempt | undefined> {
    const [attempt] = await db.select().from(attempts)
      .where(and(
        eq(attempts.userId, userId), 
        eq(attempts.challengeId, challengeId),
        eq(attempts.isBestAttempt, true)
      ));
    return attempt || undefined;
  }

  async getUserAttempts(userId: string): Promise<Attempt[]> {
    return await db.select().from(attempts)
      .where(eq(attempts.userId, userId))
      .orderBy(desc(attempts.submittedAt));
  }

  async updateAttemptBestStatus(attemptId: string, isBest: boolean): Promise<void> {
    await db.update(attempts).set({ isBestAttempt: isBest }).where(eq(attempts.id, attemptId));
  }

  async getAggregate(challengeId: string): Promise<Aggregate | undefined> {
    const [aggregate] = await db.select().from(aggregates).where(eq(aggregates.challengeId, challengeId));
    return aggregate || undefined;
  }

  async upsertAggregate(aggregate: InsertAggregate): Promise<Aggregate> {
    const [result] = await db
      .insert(aggregates)
      .values(aggregate)
      .onConflictDoUpdate({
        target: aggregates.challengeId,
        set: {
          bestAttemptCount: aggregate.bestAttemptCount,
          topPickCountsJson: aggregate.topPickCountsJson,
          exactRankingCountsJson: aggregate.exactRankingCountsJson,
          scoreHistogramJson: aggregate.scoreHistogramJson,
          updatedAt: sql`NOW()`,
        }
      })
      .returning();
    return result;
  }

  async getStreak(userId: string): Promise<Streak | undefined> {
    const [streak] = await db.select().from(streaks).where(eq(streaks.userId, userId));
    return streak || undefined;
  }

  async upsertStreak(streak: InsertStreak): Promise<Streak> {
    const [result] = await db
      .insert(streaks)
      .values(streak)
      .onConflictDoUpdate({
        target: streaks.userId,
        set: {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastCompletedDateKey: streak.lastCompletedDateKey,
        }
      })
      .returning();
    return result;
  }

  async getRetryWallet(userId: string, weekKey: string): Promise<RetryWallet | undefined> {
    const [wallet] = await db.select().from(retryWallets)
      .where(and(eq(retryWallets.userId, userId), eq(retryWallets.weekKey, weekKey)));
    return wallet || undefined;
  }

  async upsertRetryWallet(wallet: InsertRetryWallet): Promise<RetryWallet> {
    const [result] = await db
      .insert(retryWallets)
      .values(wallet)
      .onConflictDoUpdate({
        target: [retryWallets.userId, retryWallets.weekKey],
        set: {
          retriesRemaining: wallet.retriesRemaining,
          updatedAt: sql`NOW()`,
        }
      })
      .returning();
    return result;
  }

  async getFeatureFlag(key: string): Promise<FeatureFlag | undefined> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, key));
    return flag || undefined;
  }

  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    return await db.select().from(featureFlags);
  }

  async upsertFeatureFlag(flag: InsertFeatureFlag): Promise<FeatureFlag> {
    const [result] = await db
      .insert(featureFlags)
      .values(flag)
      .onConflictDoUpdate({
        target: featureFlags.key,
        set: {
          enabled: flag.enabled,
          configJson: flag.configJson,
        }
      })
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
