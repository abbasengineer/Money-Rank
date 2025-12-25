import { Server } from "http";
import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { ensureUser } from "./middleware/userMiddleware";
import { 
  getTodayChallenge, 
  getYesterdayChallenge,
  canAccessChallenge 
} from "./services/challengeService";
import { submitAttempt } from "./services/attemptService";
import { calculatePercentile } from "./services/aggregateService";
import { getUserStreak } from "./services/streakService";
import { getActiveDateKey } from "./services/dateService";
import { initializeDefaultFlags } from "./services/featureFlagService";
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import passport from "./auth/passport";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";


const submitAttemptSchema = z.object({
  challengeId: z.string(),
  ranking: z.array(z.string()).length(4),
});

const challengeOptionInputSchema = z.object({
  optionText: z.string().min(1),
  tierLabel: z.string().min(1),
  explanationShort: z.string().min(1),
  orderingIndex: z.number().int().min(1).max(4),
});

const createChallengeSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1),
  scenarioText: z.string().min(1),
  assumptions: z.string().min(1),
  category: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  isPublished: z.boolean().default(false),
  options: z.array(challengeOptionInputSchema).length(4),
});

const updateChallengeSchema = createChallengeSchema.partial().extend({
  options: z.array(challengeOptionInputSchema).length(4).optional(),
});

import crypto from 'crypto';

const adminSessions = new Map<string, { expiresAt: number }>();
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;
const SESSION_DURATION = 24 * 60 * 60 * 1000;

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function cleanupExpiredSessions() {
  const now = Date.now();
  const entries = Array.from(adminSessions.entries());
  for (const [token, session] of entries) {
    if (session.expiresAt < now) {
      adminSessions.delete(token);
    }
  }
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  
  if (attempt) {
    if (now - attempt.lastAttempt > LOCKOUT_DURATION) {
      loginAttempts.delete(ip);
    } else if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
      const retryAfter = Math.ceil((LOCKOUT_DURATION - (now - attempt.lastAttempt)) / 1000);
      return { allowed: false, retryAfter };
    }
  }
  return { allowed: true };
}

function recordLoginAttempt(ip: string, success: boolean) {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (attempt) {
    attempt.count++;
    attempt.lastAttempt = now;
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  }
}

function requireAdmin(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  
  const token = authHeader.slice(7);
  cleanupExpiredSessions();
  
  const session = adminSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    adminSessions.delete(token);
    return res.status(403).json({ error: 'Invalid or expired session' });
  }
  
  next();
}

export async function registerRoutes(server: Server, app: Express): Promise<Server> {
  app.use(cookieParser());
  
  await initializeDefaultFlags();

  // Auth Routes
  app.get('/api/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    // Don't specify 'prompt' - Google will only show consent when needed (first time or if revoked)
    // If you want to force account selection: prompt: 'select_account'
    // If you want to skip consent if already granted: don't include prompt at all
  }));
  
  app.get(
    '/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?auth_error=google_failed' }),
    (req: Request, res: Response) => {
      // Successful authentication, redirect to home
      res.redirect('/');
    }
  );

  app.get('/api/auth/user', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      let user = req.user ? await storage.getUser((req.user as any).id) : await storage.getUser(userId);
      
      if (!user) {
        return res.json({ user: null, isAuthenticated: false });
      }
      
      // Generate and store name for anonymous users if not set
      if (user.authProvider === 'anonymous' && !user.displayName) {
        const { generateRandomName } = await import('./utils/nameGenerator');
        const randomName = generateRandomName(user.id);
        
        await db
          .update(users)
          .set({ displayName: randomName })
          .where(eq(users.id, user.id));
        
        const updatedUser = await storage.getUser(user.id);
        if (!updatedUser) {
          return res.status(500).json({ error: 'Failed to update user' });
        }
        user = updatedUser;
      }
      
      // Return user info (excluding sensitive data)
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatar,
          authProvider: user.authProvider,
        },
        isAuthenticated: user.authProvider !== 'anonymous',
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/auth/user/display-name', ensureUser, async (req: Request, res: Response) => {
    console.log('PUT /api/auth/user/display-name route hit');
    try {
      const { displayName } = req.body;
      console.log('Request body:', { displayName });
      // Get userId from either Passport session or cookie
      const userId = req.user ? (req.user as any).id : req.userId!;
      
      console.log('User ID:', userId);
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Only allow editing if user is authenticated (not anonymous)
      if (user.authProvider === 'anonymous') {
        return res.status(403).json({ error: 'Cannot edit name for anonymous users' });
      }
      
      // Validate display name
      if (!displayName || typeof displayName !== 'string') {
        return res.status(400).json({ error: 'Display name is required' });
      }
      
      const trimmedName = displayName.trim();
      if (trimmedName.length < 1 || trimmedName.length > 50) {
        return res.status(400).json({ error: 'Display name must be between 1 and 50 characters' });
      }
      
      // Update display name
      await db
        .update(users)
        .set({ displayName: trimmedName })
        .where(eq(users.id, userId));
      
      console.log('Database update completed for userId:', userId, 'new name:', trimmedName);
      
      // Fetch updated user to ensure we have latest data
      const updatedUser = await storage.getUser(userId);
      
      if (!updatedUser) {
        console.error('User not found after update, userId:', userId);
        return res.status(404).json({ error: 'User not found after update' });
      }
      
      console.log('Updated user displayName:', updatedUser.displayName);
      
      return res.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          avatar: updatedUser.avatar,
          authProvider: updatedUser.authProvider,
        },
        isAuthenticated: updatedUser.authProvider !== 'anonymous',
      });
    } catch (error) {
      console.error('Error updating display name:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.clearCookie('mr_uid');
      res.json({ success: true });
    });
  });

  app.get('/api/challenge/today', ensureUser, async (req: Request, res: Response) => {
    try {
      const challenge = await getTodayChallenge();
      
      if (!challenge) {
        return res.status(404).json({ error: 'No challenge available for today' });
      }

      const userAttempt = await storage.getBestAttemptForChallenge(req.userId!, challenge.id);
      
      return res.json({
        challenge,
        hasAttempted: !!userAttempt,
        attempt: userAttempt || null,
      });
    } catch (error) {
      console.error('Error fetching today challenge:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/challenge/:dateKey', ensureUser, async (req: Request, res: Response) => {
    try {
      const { dateKey } = req.params;
      
      const canAccess = await canAccessChallenge(dateKey, req.userId!);
      if (!canAccess) {
        return res.status(403).json({ error: 'This challenge is locked' });
      }

      const challenge = await storage.getChallengeByDateKey(dateKey);
      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      const userAttempt = await storage.getBestAttemptForChallenge(req.userId!, challenge.id);
      
      return res.json({
        challenge,
        hasAttempted: !!userAttempt,
        attempt: userAttempt || null,
      });
    } catch (error) {
      console.error('Error fetching challenge:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/attempts', ensureUser, async (req: Request, res: Response) => {
    try {
      const parsed = submitAttemptSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request body', details: parsed.error });
      }

      const { challengeId, ranking } = parsed.data;
      const challenge = await storage.getChallengeById(challengeId);
      
      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      const result = await submitAttempt(req.userId!, challengeId, challenge.dateKey, ranking);
      
      return res.json(result);
    } catch (error) {
      console.error('Error submitting attempt:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/results/:challengeId', ensureUser, async (req: Request, res: Response) => {
    try {
      const { challengeId } = req.params;
      
      const challenge = await storage.getChallengeById(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      const attempt = await storage.getBestAttemptForChallenge(req.userId!, challengeId);
      if (!attempt) {
        return res.status(404).json({ error: 'No attempt found for this challenge' });
      }

      const aggregate = await storage.getAggregate(challengeId);
      const percentile = await calculatePercentile(challengeId, attempt.scoreNumeric);
      
      const exactRankingCounts = (aggregate?.exactRankingCountsJson as Record<string, number>) || {};
      const userRankingKey = (attempt.rankingJson as string[]).join(',');
      const exactMatchCount = exactRankingCounts[userRankingKey] || 0;
      const exactMatchPercent = aggregate && aggregate.bestAttemptCount > 0 
        ? Math.round((exactMatchCount / aggregate.bestAttemptCount) * 100) 
        : 0;

      const topPickCounts = (aggregate?.topPickCountsJson as Record<string, number>) || {};
      const userTopPick = (attempt.rankingJson as string[])[0];
      const topPickMatchCount = topPickCounts[userTopPick] || 0;
      const topPickPercent = aggregate && aggregate.bestAttemptCount > 0
        ? Math.round((topPickMatchCount / aggregate.bestAttemptCount) * 100)
        : 0;

      return res.json({
        attempt,
        challenge,
        stats: {
          percentile,
          exactMatchPercent,
          topPickPercent,
          totalAttempts: aggregate?.bestAttemptCount || 0,
        },
      });
    } catch (error) {
      console.error('Error fetching results:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/user/badges', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const userBadges = await storage.getUserBadges(userId);
      return res.json({ badges: userBadges });
    } catch (error) {
      console.error('Error fetching user badges:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/user/stats', ensureUser, async (req: Request, res: Response) => {
    try {
      const streak = await getUserStreak(req.userId!);
      const attempts = await storage.getUserAttempts(req.userId!);
      
      const bestAttempts = attempts.filter(a => a.isBestAttempt);
      const totalScore = bestAttempts.reduce((sum, a) => sum + a.scoreNumeric, 0);
      const avgScore = bestAttempts.length > 0 ? Math.round(totalScore / bestAttempts.length) : 0;

      let bestPercentile = 0;
      for (const attempt of bestAttempts) {
        const percentile = await calculatePercentile(attempt.challengeId, attempt.scoreNumeric);
        bestPercentile = Math.max(bestPercentile, percentile);
      }

      return res.json({
        currentStreak: streak?.currentStreak || 0,
        longestStreak: streak?.longestStreak || 0,
        totalAttempts: bestAttempts.length,
        averageScore: avgScore,
        bestPercentile,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/archive', ensureUser, async (req: Request, res: Response) => {
    try {
      const allChallenges = await storage.getAllChallenges();
      const todayKey = getActiveDateKey();
      
      const challengesWithStatus = await Promise.all(
        allChallenges.map(async (challenge) => {
          const attempt = await storage.getBestAttemptForChallenge(req.userId!, challenge.id);
          const canAccess = await canAccessChallenge(challenge.dateKey, req.userId!);
          
          return {
            ...challenge,
            hasAttempted: !!attempt,
            attempt: attempt || null,
            isLocked: !canAccess,
          };
        })
      );

      return res.json(challengesWithStatus);
    } catch (error) {
      console.error('Error fetching archive:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin Routes
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    const rateCheck = checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        error: 'Too many login attempts', 
        retryAfter: rateCheck.retryAfter 
      });
    }
    
    if (password === adminPassword) {
      recordLoginAttempt(clientIp, true);
      cleanupExpiredSessions();
      
      const token = generateSessionToken();
      adminSessions.set(token, { expiresAt: Date.now() + SESSION_DURATION });
      
      return res.json({ success: true, token });
    }
    
    recordLoginAttempt(clientIp, false);
    return res.status(401).json({ error: 'Invalid password' });
  });

  app.get('/api/admin/analytics', requireAdmin, async (req: Request, res: Response) => {
    try {
      const analytics = await storage.getAnalytics();
      return res.json(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/challenges', requireAdmin, async (req: Request, res: Response) => {
    try {
      const challenges = await storage.getAllChallengesWithOptions();
      return res.json(challenges);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/challenges/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const challenge = await storage.getChallengeById(req.params.id);
      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }
      return res.json(challenge);
    } catch (error) {
      console.error('Error fetching challenge:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/admin/challenges', requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = createChallengeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request body', details: parsed.error });
      }

      const { options, ...challengeData } = parsed.data;
      const challenge = await storage.createChallenge(challengeData, options);
      
      return res.json(challenge);
    } catch (error) {
      console.error('Error creating challenge:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/admin/challenges/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = updateChallengeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request body', details: parsed.error });
      }

      const { options, ...challengeData } = parsed.data;
      
      let challenge;
      if (options) {
        challenge = await storage.updateChallengeWithOptions(req.params.id, challengeData, options);
      } else {
        challenge = await storage.updateChallenge(req.params.id, challengeData);
      }
      
      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }
      
      return res.json(challenge);
    } catch (error) {
      console.error('Error updating challenge:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/admin/challenges/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteChallenge(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Challenge not found' });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error('Error deleting challenge:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return server;
}
