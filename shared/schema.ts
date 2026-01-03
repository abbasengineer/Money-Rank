import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, jsonb, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  
  // Authentication fields (all nullable for backward compatibility with anonymous users)
  email: varchar("email", { length: 255 }),
  emailVerified: boolean("email_verified").default(false).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  avatar: text("avatar"), // URL to profile picture
  
  // Auth provider info
  authProvider: varchar("auth_provider", { length: 50 }).default('anonymous').notNull(),
  authProviderId: varchar("auth_provider_id", { length: 255 }), // OAuth provider's user ID (e.g., Google sub, Facebook id)
  
  // Email/password auth fields
  passwordHash: text("password_hash"), // Hashed password for email auth
  resetPasswordToken: varchar("reset_password_token", { length: 255 }),
  resetPasswordExpires: timestamp("reset_password_expires"),
  
  // Financial profile fields (nullable - only for logged-in users)
  birthday: timestamp("birthday"), // Date of birth for age calculation
  incomeBracket: varchar("income_bracket", { length: 20 }), // e.g., '<50k', '50-100k', '100-150k', '150-200k', '200-300k', '300k+'
}, (table) => ({
  emailIdx: index("email_idx").on(table.email), // For email lookups
  authProviderIdx: index("auth_provider_idx").on(table.authProvider, table.authProviderId), // For OAuth lookups
}));

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
  dateKey: varchar("date_key", { length: 10 }), // Nullable for backward compatibility, will be backfilled
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  rankingJson: jsonb("ranking_json").notNull(),
  scoreNumeric: integer("score_numeric").notNull(),
  gradeTier: varchar("grade_tier", { length: 20 }).notNull(),
  isBestAttempt: boolean("is_best_attempt").default(false).notNull(),
}, (table) => ({
  userChallengeIdx: index("user_challenge_idx").on(table.userId, table.challengeId),
  // Index on dateKey will be added by migration script to avoid errors if column doesn't exist yet
  // userDateKeyIdx: index("user_date_key_idx").on(table.userId, table.dateKey),
}));

export const aggregates = pgTable("aggregates", {
  challengeId: varchar("challenge_id", { length: 255 }).primaryKey().references(() => dailyChallenges.id, { onDelete: 'cascade' }),
  bestAttemptCount: integer("best_attempt_count").default(0).notNull(),
  topPickCountsJson: jsonb("top_pick_counts_json").default('{}').notNull(),
  topTwoCountsJson: jsonb("top_two_counts_json").default('{}').notNull(),
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

// Badge definitions table - defines all available badges
export const badges = pgTable("badges", {
  id: varchar("id", { length: 50 }).primaryKey(), // e.g., 'first_complete', 'streak_7'
  name: varchar("name", { length: 100 }).notNull(), // e.g., 'First Steps', 'Week Warrior'
  description: text("description").notNull(), // e.g., 'Complete your first challenge'
  icon: varchar("icon", { length: 50 }).notNull(), // emoji or icon identifier, e.g., '🎯', '🔥'
  category: varchar("category", { length: 50 }).notNull(), // 'completion', 'streak', 'score', 'milestone', 'achievement'
  rarity: varchar("rarity", { length: 20 }).default('common').notNull(), // 'common', 'rare', 'epic', 'legendary'
  criteriaType: varchar("criteria_type", { length: 50 }).notNull(), // 'total_attempts', 'streak', 'score', 'percentile', etc.
  criteriaValue: integer("criteria_value").notNull(), // threshold value for the badge
  criteriaConfig: jsonb("criteria_config").default('{}').notNull(), // additional config like min_score, exact_match, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("badge_category_idx").on(table.category),
  criteriaTypeIdx: index("badge_criteria_type_idx").on(table.criteriaType),
}));

// User badges - tracks which badges each user has earned
export const userBadges = pgTable("user_badges", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: varchar("badge_id", { length: 50 }).notNull().references(() => badges.id, { onDelete: 'cascade' }),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  metadata: jsonb("metadata").default('{}').notNull(), // e.g., score when earned, attempt ID, etc.
}, (table) => ({
  userBadgeIdx: index("user_badge_idx").on(table.userId, table.badgeId),
  userIdx: index("user_badge_user_idx").on(table.userId),
  badgeIdx: index("user_badge_badge_idx").on(table.badgeId),
  uniqueUserBadge: unique().on(table.userId, table.badgeId), // Prevent duplicate badges
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  attempts: many(attempts),
  streak: many(streaks),
  retryWallets: many(retryWallets),
  badges: many(userBadges),
}));

export const badgesRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
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
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true }).extend({
  id: z.string().optional(),
  email: z.string().email().optional().nullable(),
  emailVerified: z.boolean().optional(),
  displayName: z.string().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  authProvider: z.enum(['anonymous', 'email', 'google', 'facebook']).optional(),
  authProviderId: z.string().optional().nullable(),
  passwordHash: z.string().optional().nullable(),
  resetPasswordToken: z.string().optional().nullable(),
  resetPasswordExpires: z.date().optional().nullable(),
  birthday: z.date().optional().nullable(),
  incomeBracket: z.enum(['<50k', '50-100k', '100-150k', '150-200k', '200-300k', '300k+']).optional().nullable(),
});
export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges).omit({ id: true, createdAt: true });
export const insertChallengeOptionSchema = createInsertSchema(challengeOptions).omit({ id: true });
export const insertAttemptSchema = createInsertSchema(attempts).omit({ id: true, submittedAt: true });
export const insertAggregateSchema = createInsertSchema(aggregates);
export const insertStreakSchema = createInsertSchema(streaks);
export const insertRetryWalletSchema = createInsertSchema(retryWallets).omit({ id: true });
export const insertFeatureFlagSchema = createInsertSchema(featureFlags);
export const insertBadgeSchema = createInsertSchema(badges).omit({ createdAt: true });
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({ id: true, earnedAt: true });

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
export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
