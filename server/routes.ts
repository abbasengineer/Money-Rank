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

function requireAdmin(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  
  const token = authHeader.slice(7);
  if (token !== adminPassword) {
    return res.status(403).json({ error: 'Invalid admin password' });
  }
  
  next();
}

export async function registerRoutes(server: Server, app: Express): Promise<Server> {
  app.use(cookieParser());
  
  await initializeDefaultFlags();

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
    
    if (password === adminPassword) {
      return res.json({ success: true, token: adminPassword });
    }
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
