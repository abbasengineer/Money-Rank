import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, jsonb, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
});

export const dailyChallenges = pgTable("daily_challenges", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  dateKey: varchar("date_key", { length: 10 }).notNull().unique(),
  title: text("title").notNull(),
  scenarioText: text("scenario_text").notNull(),
  assumptions: text("assumptions").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  difficulty: integer("difficulty").notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  source: varchar("source", { length: 20 }).notNull().default('manual'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const challengeOptions = pgTable("challenge_options", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id", { length: 255 }).notNull().references(() => dailyChallenges.id, { onDelete: 'cascade' }),
  optionText: text("option_text").notNull(),
  tierLabel: varchar("tier_label", { length: 20 }).notNull(),
  explanationShort: text("explanation_short").notNull(),
  orderingIndex: integer("ordering_index").notNull(),
}, (table) => ({
  uniqueChallengeOrdering: unique().on(table.challengeId, table.orderingIndex),
}));

export const attempts = pgTable("attempts", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  challengeId: varchar("challenge_id", { length: 255 }).notNull().references(() => dailyChallenges.id),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  rankingJson: jsonb("ranking_json").notNull(),
  scoreNumeric: integer("score_numeric").notNull(),
  gradeTier: varchar("grade_tier", { length: 20 }).notNull(),
  isBestAttempt: boolean("is_best_attempt").default(false).notNull(),
}, (table) => ({
  userChallengeIdx: index("user_challenge_idx").on(table.userId, table.challengeId),
}));

export const aggregates = pgTable("aggregates", {
  challengeId: varchar("challenge_id", { length: 255 }).primaryKey().references(() => dailyChallenges.id),
  bestAttemptCount: integer("best_attempt_count").default(0).notNull(),
  topPickCountsJson: jsonb("top_pick_counts_json").default('{}').notNull(),
  exactRankingCountsJson: jsonb("exact_ranking_counts_json").default('{}').notNull(),
  scoreHistogramJson: jsonb("score_histogram_json").default('{}').notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const streaks = pgTable("streaks", {
  userId: varchar("user_id", { length: 255 }).primaryKey().references(() => users.id),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastCompletedDateKey: varchar("last_completed_date_key", { length: 10 }),
});

export const retryWallets = pgTable("retry_wallets", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  weekKey: varchar("week_key", { length: 10 }).notNull(),
  retriesRemaining: integer("retries_remaining").default(1).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserWeek: unique().on(table.userId, table.weekKey),
}));

export const featureFlags = pgTable("feature_flags", {
  key: varchar("key", { length: 100 }).primaryKey(),
  enabled: boolean("enabled").default(false).notNull(),
  configJson: jsonb("config_json").default('{}').notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  attempts: many(attempts),
  streak: many(streaks),
  retryWallets: many(retryWallets),
}));

export const dailyChallengesRelations = relations(dailyChallenges, ({ many, one }) => ({
  options: many(challengeOptions),
  attempts: many(attempts),
  aggregate: one(aggregates, {
    fields: [dailyChallenges.id],
    references: [aggregates.challengeId],
  }),
}));

export const challengeOptionsRelations = relations(challengeOptions, ({ one }) => ({
  challenge: one(dailyChallenges, {
    fields: [challengeOptions.challengeId],
    references: [dailyChallenges.id],
  }),
}));

export const attemptsRelations = relations(attempts, ({ one }) => ({
  user: one(users, {
    fields: [attempts.userId],
    references: [users.id],
  }),
  challenge: one(dailyChallenges, {
    fields: [attempts.challengeId],
    references: [dailyChallenges.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges).omit({ id: true, createdAt: true });
export const insertChallengeOptionSchema = createInsertSchema(challengeOptions).omit({ id: true });
export const insertAttemptSchema = createInsertSchema(attempts).omit({ id: true, submittedAt: true });
export const insertAggregateSchema = createInsertSchema(aggregates);
export const insertStreakSchema = createInsertSchema(streaks);
export const insertRetryWalletSchema = createInsertSchema(retryWallets).omit({ id: true });
export const insertFeatureFlagSchema = createInsertSchema(featureFlags);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type InsertDailyChallenge = z.infer<typeof insertDailyChallengeSchema>;
export type ChallengeOption = typeof challengeOptions.$inferSelect;
export type InsertChallengeOption = z.infer<typeof insertChallengeOptionSchema>;
export type Attempt = typeof attempts.$inferSelect;
export type InsertAttempt = z.infer<typeof insertAttemptSchema>;
export type Aggregate = typeof aggregates.$inferSelect;
export type InsertAggregate = z.infer<typeof insertAggregateSchema>;
export type Streak = typeof streaks.$inferSelect;
export type InsertStreak = z.infer<typeof insertStreakSchema>;
export type RetryWallet = typeof retryWallets.$inferSelect;
export type InsertRetryWallet = z.infer<typeof insertRetryWalletSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
