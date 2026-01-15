import { Server } from "http";
import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { ensureUser, requireAuthenticated } from "./middleware/userMiddleware";
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
import { calculateUserRiskProfile } from "./services/riskProfileService";
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import passport from "./auth/passport";
import { db } from "./db";
import { users, attempts, userBadges, streaks, retryWallets, forumPosts, forumComments, forumVotes } from "@shared/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { hasProAccess } from "./services/subscriptionService";
import { parse, addDays, format } from 'date-fns';
import bcrypt from 'bcrypt';
import { generateOptimalityExplanation } from "./services/optimalityExplanationService";


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

// Add IP validation to prevent IP spoofing
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown'
  );
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

function checkAdminToken(req: Request): boolean {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.slice(7);
  cleanupExpiredSessions();
  
  const session = adminSessions.get(token);
  return !!(session && session.expiresAt > Date.now());
}

export async function registerRoutes(server: Server, app: Express): Promise<Server> {
  app.use(cookieParser());
  
  await initializeDefaultFlags();

  // Health check endpoint (for monitoring services)
  app.get('/health', async (req: Request, res: Response) => {
    try {
      // Quick database connectivity check
      await db.select().from(users).limit(1);
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'moneyrank'
      });
    } catch (error) {
      res.status(503).json({ 
        status: 'error', 
        message: 'Database unavailable',
        timestamp: new Date().toISOString()
      });
    }
  });

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
      // Ensure session is saved before redirect
      // This is critical - sessions may not persist across redirects without explicit save
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session after Google OAuth:', err);
          return res.redirect('/?auth_error=session_failed');
        }
        
        // Successful authentication, redirect to home
        res.redirect('/');
      });
    }
  );

  // Facebook OAuth Routes
  // Note: 'email' scope may show a developer warning, but it's valid and needed
  // The warning won't appear to end users, only developers
  app.get('/api/auth/facebook', passport.authenticate('facebook', { 
    scope: ['public_profile', 'email'],
  }));

  app.get(
    '/api/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/?auth_error=facebook_failed' }),
    (req: Request, res: Response) => {
      const user = req.user as any;
      
      // Check if user was created but email is missing
      if (user && !user.email) {
        req.session.save((err) => {
          if (err) {
            console.error('Error saving session after Facebook OAuth:', err);
            return res.redirect('/?auth_error=session_failed');
          }
          // Redirect to email confirmation page
          return res.redirect('/confirm-email');
        });
        return;
      }
      
      // Normal flow - email was provided
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session after Facebook OAuth:', err);
          return res.redirect('/?auth_error=session_failed');
        }
        res.redirect('/');
      });
    }
  );

  // Facebook Data Deletion Callback
  // Required by Facebook for apps using Facebook Login
  // Facebook POSTs to this URL when a user requests data deletion
  app.post('/api/auth/facebook/data-deletion', async (req: Request, res: Response) => {
    try {
      const { signed_request } = req.body;
      
      if (!signed_request) {
        return res.status(400).json({ error: 'Missing signed_request parameter' });
      }

      if (!process.env.FACEBOOK_APP_SECRET) {
        console.error('FACEBOOK_APP_SECRET not configured');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      // Parse signed_request: format is <signature>.<payload>
      const [signature, payload] = signed_request.split('.');
      
      if (!signature || !payload) {
        return res.status(400).json({ error: 'Invalid signed_request format' });
      }

      // Decode the payload (base64url to base64, then decode)
      const decodedPayload = Buffer.from(
        payload.replace(/-/g, '+').replace(/_/g, '/'), 
        'base64'
      ).toString('utf-8');
      const data = JSON.parse(decodedPayload);

      // Verify signature: recreate HMAC-SHA256 hash
      const expectedSignature = crypto
        .createHmac('sha256', process.env.FACEBOOK_APP_SECRET)
        .update(payload)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      if (signature !== expectedSignature) {
        console.error('Invalid Facebook signed_request signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Extract Facebook user ID
      const facebookUserId = data.user_id;
      
      if (!facebookUserId) {
        return res.status(400).json({ error: 'Missing user_id in request' });
      }

      console.log(`[Facebook Data Deletion] Processing deletion for Facebook user ID: ${facebookUserId}`);

      // Find user by Facebook auth provider ID
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.authProvider, 'facebook'),
            eq(users.authProviderId, facebookUserId)
          )
        )
        .limit(1);

      if (!user) {
        console.log(`[Facebook Data Deletion] No user found for Facebook ID: ${facebookUserId}`);
        // Facebook still expects confirmation even if user doesn't exist
        return res.json({
          url: `${process.env.BASE_URL || 'https://moneyrank.onrender.com'}/privacy`,
          confirmation_code: `deletion_${facebookUserId}_${Date.now()}`,
        });
      }

      const userId = user.id;
      console.log(`[Facebook Data Deletion] Found user ${userId}, deleting all associated data...`);

      // Delete all user-related data (in order to respect foreign key constraints)
      
      // Delete user badges
      await db
        .delete(userBadges)
        .where(eq(userBadges.userId, userId));
      console.log(`[Facebook Data Deletion] Deleted user badges`);

      // Delete streaks
      await db
        .delete(streaks)
        .where(eq(streaks.userId, userId));
      console.log(`[Facebook Data Deletion] Deleted streaks`);

      // Delete retry wallets
      await db
        .delete(retryWallets)
        .where(eq(retryWallets.userId, userId));
      console.log(`[Facebook Data Deletion] Deleted retry wallets`);

      // Delete attempts
      await db
        .delete(attempts)
        .where(eq(attempts.userId, userId));
      console.log(`[Facebook Data Deletion] Deleted attempts`);

      // Finally, delete the user record
      await db
        .delete(users)
        .where(eq(users.id, userId));
      console.log(`[Facebook Data Deletion] Deleted user record`);

      // Return confirmation to Facebook
      return res.json({
        url: `${process.env.BASE_URL || 'https://moneyrank.onrender.com'}/privacy`,
        confirmation_code: `deletion_${facebookUserId}_${Date.now()}`,
      });
    } catch (error) {
      console.error('[Facebook Data Deletion] Error processing deletion request:', error);
      return res.status(500).json({ error: 'Failed to process deletion request' });
    }
  });

  // Set email for Facebook user (one-time only)
  app.post('/api/auth/set-email', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const { email } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      
      // Get current user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Check if email is already set (can't change it)
      if (user.email) {
        return res.status(400).json({ error: 'Email has already been set and cannot be changed' });
      }
      
      // Check if email is already taken by another user
      const [existingEmailUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (existingEmailUser) {
        return res.status(409).json({ error: 'This email is already associated with another account' });
      }
      
      // Update user with email
      await db
        .update(users)
        .set({
          email: email,
          emailVerified: false, // Not verified, but that's okay for this use case
        })
        .where(eq(users.id, userId));
      
      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      return res.json({
        success: true,
        user: {
          id: updatedUser!.id,
          email: updatedUser!.email,
          displayName: updatedUser!.displayName,
          avatar: updatedUser!.avatar,
          authProvider: updatedUser!.authProvider,
        },
      });
    } catch (error) {
      console.error('Error setting email:', error);
      return res.status(500).json({ error: 'Failed to set email' });
    }
  });

  // Email/Password Registration
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, password, displayName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.createUser({
        email,
        emailVerified: false, // Could add email verification later
        displayName: displayName || email.split('@')[0],
        authProvider: 'email',
        passwordHash,
      });

      // Auto-login after registration
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ error: 'Registration failed' });
        }
        req.session.save(() => {
          res.json({ 
            success: true,
            user: {
              id: newUser.id,
              email: newUser.email,
              displayName: newUser.displayName,
              avatar: newUser.avatar,
              authProvider: newUser.authProvider,
            }
          });
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Email/Password Login
  app.post('/api/auth/login', 
    passport.authenticate('local', { 
      failureMessage: true,
      failWithError: true,
    }),
    (req: Request, res: Response) => {
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: 'Login failed' });
        }
        res.json({ 
          success: true,
          user: {
            id: (req.user as any).id,
            email: (req.user as any).email,
            displayName: (req.user as any).displayName,
            avatar: (req.user as any).avatar,
            authProvider: (req.user as any).authProvider,
          }
        });
      });
    },
    (err: any, req: Request, res: Response, next: any) => {
      // Error handler for failed authentication
      // Extract user-friendly error message
      let errorMessage = 'Invalid email or password';
      if (err && typeof err === 'object') {
        if (err.message && typeof err.message === 'string') {
          errorMessage = err.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
      }
      res.status(401).json({ error: errorMessage });
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
      // Safely access subscription fields (may not exist if migration not run yet)
      const subscriptionTier = (user as any).subscriptionTier || 'free';
      const subscriptionExpiresAt = (user as any).subscriptionExpiresAt 
        ? new Date((user as any).subscriptionExpiresAt).toISOString() 
        : null;
      
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatar,
          authProvider: user.authProvider,
          birthday: user.birthday,
          incomeBracket: user.incomeBracket,
          subscriptionTier,
          subscriptionExpiresAt,
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
          birthday: updatedUser.birthday,
          incomeBracket: updatedUser.incomeBracket,
        },
        isAuthenticated: updatedUser.authProvider !== 'anonymous',
      });
    } catch (error) {
      console.error('Error updating display name:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/auth/user/profile', ensureUser, async (req: Request, res: Response) => {
    try {
      const { birthday, incomeBracket } = req.body;
      const userId = req.user ? (req.user as any).id : req.userId!;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Only allow editing if user is authenticated (not anonymous)
      if (user.authProvider === 'anonymous') {
        return res.status(403).json({ error: 'Cannot edit profile for anonymous users' });
      }
      
      // Validate income bracket
      const validBrackets = ['<50k', '50-100k', '100-150k', '150-200k', '200-300k', '300k+'];
      if (incomeBracket !== undefined && incomeBracket !== null && incomeBracket !== '' && !validBrackets.includes(incomeBracket)) {
        return res.status(400).json({ error: 'Invalid income bracket' });
      }
      
      // Validate birthday (must be in the past and reasonable)
      let birthdayDate: Date | null = null;
      if (birthday) {
        birthdayDate = new Date(birthday);
        const today = new Date();
        const minDate = new Date(today.getFullYear() - 100, 0, 1); // 100 years ago
        
        if (isNaN(birthdayDate.getTime())) {
          return res.status(400).json({ error: 'Invalid birthday format' });
        }
        
        if (birthdayDate > today) {
          return res.status(400).json({ error: 'Birthday cannot be in the future' });
        }
        
        if (birthdayDate < minDate) {
          return res.status(400).json({ error: 'Birthday is too far in the past' });
        }
      }
      
      // Update user profile
      const updateData: any = {};
      if (birthday !== undefined) {
        updateData.birthday = birthday === '' || birthday === null ? null : birthdayDate;
      }
      if (incomeBracket !== undefined) {
        updateData.incomeBracket = incomeBracket === '' || incomeBracket === null ? null : incomeBracket;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId));
      
      const updatedUser = await storage.getUser(userId);
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found after update' });
      }
      
      return res.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          avatar: updatedUser.avatar,
          authProvider: updatedUser.authProvider,
          birthday: updatedUser.birthday,
          incomeBracket: updatedUser.incomeBracket,
        },
        isAuthenticated: updatedUser.authProvider !== 'anonymous',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
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
      // Get user's local "today" from query parameter (client calculates in their timezone)
      // Fall back to server timezone if not provided
      const userTodayKey = (req.query.userToday as string) || getActiveDateKey();
      const challenge = await storage.getChallengeByDateKey(userTodayKey);
      
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
      // Get user's local "today" from query parameter (client calculates in their timezone)
      const userTodayKey = req.query.userToday as string | undefined;
      
      const canAccess = await canAccessChallenge(dateKey, req.userId!, userTodayKey);
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

      // Check if user has Pro access for explanations
      const hasPro = await hasProAccess(req.userId!);

      // Generate optimality explanation (only if Pro or for preview when score < 100)
      let explanation = null;
      if (hasPro || attempt.scoreNumeric < 100) { // Generate for Pro users, or for preview (score < 100)
        const rawExplanation = generateOptimalityExplanation(
          attempt.rankingJson as string[],
          challenge.options
        );
        
        // Transform explanation to match client-side format
        explanation = {
          isPerfect: rawExplanation.isPerfect,
          optimalRanking: rawExplanation.optimalRanking.map(opt => ({
            id: opt.id,
            text: opt.optionText,
            tier: opt.tierLabel as 'Optimal' | 'Reasonable' | 'Risky',
            explanation: opt.explanationShort,
            idealRank: opt.orderingIndex,
          })),
          misplacedOptions: rawExplanation.misplacedOptions.map(item => ({
            option: {
              id: item.option.id,
              text: item.option.optionText,
              tier: item.option.tierLabel as 'Optimal' | 'Reasonable' | 'Risky',
              explanation: item.option.explanationShort,
              idealRank: item.option.orderingIndex,
            },
            userPosition: item.userPosition,
            optimalPosition: item.optimalPosition,
            explanation: item.explanation,
          })),
          summary: rawExplanation.summary,
        };
        
        // If not Pro, only show summary (preview)
        if (!hasPro) {
          explanation = {
            ...explanation,
            misplacedOptions: [], // Hide details for free users
            optimalRanking: [] // Hide optimal ranking for free users
          };
        }
      }

      return res.json({
        attempt,
        challenge,
        stats: {
          percentile,
          exactMatchPercent,
          topPickPercent,
          totalAttempts: aggregate?.bestAttemptCount || 0,
        },
        explanation: explanation || null, // Include explanation if available
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

  // Risk Profile endpoint
  app.get('/api/user/risk-profile', ensureUser, async (req: Request, res: Response) => {
    try {
      const { calculateUserRiskProfile } = await import('./services/riskProfileService');
      const profile = await calculateUserRiskProfile(req.userId!);
      return res.json(profile);
    } catch (error) {
      console.error('Error fetching risk profile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Score History endpoint
  app.get('/api/user/score-history', ensureUser, async (req: Request, res: Response) => {
    try {
      const attempts = await storage.getUserAttempts(req.userId!);
      const bestAttempts = attempts.filter(a => a.isBestAttempt);
      
      // Group by time periods
      const last7Days = bestAttempts.filter(a => {
        const daysAgo = (Date.now() - new Date(a.submittedAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 7;
      });
      
      const last30Days = bestAttempts.filter(a => {
        const daysAgo = (Date.now() - new Date(a.submittedAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 30;
      });
      
      // Calculate averages
      const avg7Days = last7Days.length > 0 
        ? Math.round(last7Days.reduce((sum, a) => sum + a.scoreNumeric, 0) / last7Days.length)
        : 0;
      
      const avg30Days = last30Days.length > 0
        ? Math.round(last30Days.reduce((sum, a) => sum + a.scoreNumeric, 0) / last30Days.length)
        : 0;
      
      const allTimeAvg = bestAttempts.length > 0
        ? Math.round(bestAttempts.reduce((sum, a) => sum + a.scoreNumeric, 0) / bestAttempts.length)
        : 0;
      
      // Score distribution
      const scoreRanges = {
        perfect: bestAttempts.filter(a => a.scoreNumeric === 100).length,
        great: bestAttempts.filter(a => a.scoreNumeric >= 90 && a.scoreNumeric < 100).length,
        good: bestAttempts.filter(a => a.scoreNumeric >= 60 && a.scoreNumeric < 90).length,
        risky: bestAttempts.filter(a => a.scoreNumeric < 60).length,
      };
      
      // Trend calculation
      const recentAvg = avg7Days;
      const previousAvg = last30Days.length > 7 
        ? Math.round(last30Days.slice(7).reduce((sum, a) => sum + a.scoreNumeric, 0) / (last30Days.length - 7))
        : allTimeAvg;
      
      const trend = recentAvg > previousAvg ? 'improving' : 
                    recentAvg < previousAvg ? 'declining' : 'stable';
      const trendPercent = previousAvg > 0 
        ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100)
        : 0;
      
      return res.json({
        averages: {
          last7Days: avg7Days,
          last30Days: avg30Days,
          allTime: allTimeAvg,
        },
        scoreDistribution: scoreRanges,
        trend,
        trendPercent,
        totalAttempts: bestAttempts.length,
        bestScore: bestAttempts.length > 0 ? Math.max(...bestAttempts.map(a => a.scoreNumeric)) : 0,
        worstScore: bestAttempts.length > 0 ? Math.min(...bestAttempts.map(a => a.scoreNumeric)) : 0,
        scoreHistory: bestAttempts.map((a) => {
          // Use dateKey from attempt if available (from migration), otherwise null
          // This is more efficient and handles missing challenges gracefully
          return {
            date: a.submittedAt,
            score: a.scoreNumeric,
            challengeId: a.challengeId,
            challengeDateKey: (a as any).dateKey || null,
          };
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      });
    } catch (error) {
      console.error('Error fetching score history:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Category Performance endpoint
  app.get('/api/user/category-performance', ensureUser, async (req: Request, res: Response) => {
    try {
      const attempts = await storage.getUserAttempts(req.userId!);
      const bestAttempts = attempts.filter(a => a.isBestAttempt);
      
      const categoryStats: Record<string, { scores: number[]; count: number }> = {};
      
      for (const attempt of bestAttempts) {
        const challenge = await storage.getChallengeById(attempt.challengeId);
        if (!challenge) continue;
        
        const category = challenge.category;
        if (!categoryStats[category]) {
          categoryStats[category] = { scores: [], count: 0 };
        }
        categoryStats[category].scores.push(attempt.scoreNumeric);
        categoryStats[category].count++;
      }
      
      const categoryAverages = Object.entries(categoryStats).map(([category, stats]) => ({
        category,
        averageScore: stats.scores.length > 0 
          ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
          : 0,
        attempts: stats.count,
        bestScore: stats.scores.length > 0 ? Math.max(...stats.scores) : 0,
        worstScore: stats.scores.length > 0 ? Math.min(...stats.scores) : 0,
      })).sort((a, b) => b.averageScore - a.averageScore);
      
      return res.json({ categories: categoryAverages });
    } catch (error) {
      console.error('Error fetching category performance:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/archive', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId || (req.user as any)?.id;
      if (!userId) {
        console.error('Archive: No userId found in request');
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user is authenticated (not anonymous)
      const user = await storage.getUser(userId);
      const isAuthenticated = user && user.authProvider !== 'anonymous';
      
      // Check if user has Pro access
      const isPro = (user as any)?.subscriptionTier === 'pro';
      const subscriptionExpiresAt = (user as any)?.subscriptionExpiresAt 
        ? new Date((user as any).subscriptionExpiresAt) 
        : null;
      const hasProAccess = isPro && (subscriptionExpiresAt === null || subscriptionExpiresAt > new Date());

      const allChallenges = await storage.getAllChallenges();
      console.log(`Archive: Found ${allChallenges.length} total challenges for user ${userId}`);
      
      // Get user's local "today" from query parameter (client calculates in their timezone)
      // Fall back to server timezone if not provided
      const userTodayKey = (req.query.userToday as string) || getActiveDateKey();
      const today = parse(userTodayKey, 'yyyy-MM-dd', new Date());
      
      // Show all historical challenges (today and past) + only next 7 days of future challenges
      const maxFutureDate = addDays(today, 6);
      const maxFutureDateKey = format(maxFutureDate, 'yyyy-MM-dd');
      
      // Filter challenges:
      // - Include all challenges that are today or in the past (historical, in user's timezone)
      // - Include future challenges only if they're within the next 7 days
      const visibleChallenges = allChallenges.filter(challenge => {
        // Historical: today or past (using user's timezone)
        if (challenge.dateKey <= userTodayKey) {
          return true;
        }
        // Future: only if within next 7 days
        return challenge.dateKey <= maxFutureDateKey;
      });
      
      console.log(`Archive: Filtered to ${visibleChallenges.length} challenges (all historical + ${userTodayKey} to ${maxFutureDateKey} for future)`);
      
      // Sort by dateKey descending (most recent first, then future days)
      visibleChallenges.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      
      // For authenticated users, use efficient JOIN query to get attempts by dateKey
      // This handles re-seeded challenges and prevents race conditions
      let attemptsByDateKey: Map<string, any> = new Map();
      if (isAuthenticated) {
        try {
          const { attempts: attemptsTable, dailyChallenges: challengesTable } = await import('@shared/schema');
          
          // Single efficient query: JOIN attempts with challenges to get dateKey
          // Match by dateKey (handles re-seeded challenges) and get best attempts only
          const attemptsWithDateKey = await db
            .select({
              attempt: attemptsTable,
              challengeDateKey: challengesTable.dateKey,
            })
            .from(attemptsTable)
            .innerJoin(challengesTable, eq(attemptsTable.challengeId, challengesTable.id))
            .where(
              and(
                eq(attemptsTable.userId, userId),
                eq(attemptsTable.isBestAttempt, true)
              )
            );
          
          // Build map of dateKey -> best attempt (keep highest score if multiple)
          for (const { attempt, challengeDateKey } of attemptsWithDateKey) {
            // Use dateKey from challenge (attempt.dateKey may not exist yet)
            const dateKey = challengeDateKey;
            const existing = attemptsByDateKey.get(dateKey);
            if (!existing || attempt.scoreNumeric > existing.scoreNumeric) {
              attemptsByDateKey.set(dateKey, attempt);
            }
          }
        } catch (error: any) {
          // Fallback to old method if JOIN fails (e.g., column doesn't exist)
          console.warn('Archive: Using fallback method (dateKey column may not exist yet)', error.message);
          const userAttempts = await storage.getUserAttempts(userId);
          const bestAttempts = userAttempts.filter(a => a.isBestAttempt);
          
          for (const attempt of bestAttempts) {
            try {
              const attemptChallenge = await storage.getChallengeById(attempt.challengeId);
              if (attemptChallenge) {
                const existing = attemptsByDateKey.get(attemptChallenge.dateKey);
                if (!existing || attempt.scoreNumeric > existing.scoreNumeric) {
                  attemptsByDateKey.set(attemptChallenge.dateKey, attempt);
                }
              }
            } catch (err) {
              console.warn(`Challenge ${attempt.challengeId} not found for attempt ${attempt.id}`);
            }
          }
        }
      }
      
      // Process challenges with their attempt status
      const challengesWithStatus = visibleChallenges.map((challenge) => {
        try {
          // For unauthenticated users, return preview data only (no attempt info)
          if (!isAuthenticated) {
            const isPastChallenge = challenge.dateKey <= userTodayKey;
            const isLocked = !isPastChallenge;
            
            return {
              ...challenge,
              hasAttempted: false,
              attempt: null,
              isLocked,
              isPreview: true, // Flag to indicate this is preview data
            };
          }

          // For authenticated users, find attempt by dateKey (handles re-seeded challenges)
          // This is the primary matching method now that we have dateKey
          const attempt = attemptsByDateKey.get(challenge.dateKey) || null;
          
          // Determine lock status directly (using user's timezone):
          // - All past challenges (dateKey <= userTodayKey): UNLOCKED
          // - All future challenges (dateKey > userTodayKey): LOCKED
          const isPastChallenge = challenge.dateKey <= userTodayKey;
          
          // Calculate if challenge is older than 3 days (today + 2 days prior = 3 total days free)
          const challengeDate = parse(challenge.dateKey, 'yyyy-MM-dd', new Date());
          const daysAgo = Math.floor((today.getTime() - challengeDate.getTime()) / (1000 * 60 * 60 * 24));
          const isOlderThan3Days = daysAgo > 2; // More than 2 days ago (so 3+ days old)
          
          // Lock logic: Future challenges are locked, OR past challenges older than 3 days if not Pro
          const requiresPro = isOlderThan3Days && isPastChallenge && !hasProAccess;
          const isLocked = !isPastChallenge || requiresPro; // Future = locked, or old past = locked if not Pro
          
          // Send raw timestamp for client-side timezone handling
          // Client will format date and check "on time" using user's browser timezone
          return {
            ...challenge,
            hasAttempted: !!attempt,
            attempt: attempt || null,
            isPreview: false,
            isLocked: isLocked,
            requiresPro: requiresPro, // Flag for frontend to show Pro upgrade prompt
            completedAt: attempt?.submittedAt || null,
          };
        } catch (err) {
          console.error(`Error processing challenge ${challenge.id}:`, err);
          // Return challenge with default locked state if processing fails
          // Determine based on date (using user's timezone)
          const isPastChallenge = challenge.dateKey <= userTodayKey;
          const challengeDate = parse(challenge.dateKey, 'yyyy-MM-dd', new Date());
          const daysAgo = Math.floor((today.getTime() - challengeDate.getTime()) / (1000 * 60 * 60 * 24));
          const isOlderThan3Days = daysAgo > 2;
          const requiresPro = isOlderThan3Days && isPastChallenge && !hasProAccess;
          const isLocked = !isPastChallenge || requiresPro;
          return {
            ...challenge,
            hasAttempted: false,
            attempt: null,
            isLocked,
            requiresPro: requiresPro,
            isPreview: !isAuthenticated,
            completedAt: null,
          };
        }
      });

      // TODO: Future enhancement - group by month for better organization
      // const groupedByMonth = groupChallengesByMonth(challengesWithStatus);

      console.log(`Archive: Returning ${challengesWithStatus.length} challenges with status`);
      return res.json(challengesWithStatus);
    } catch (error) {
      console.error('Error fetching archive:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin Routes
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const clientIp = getClientIp(req); // Use improved IP detection
    
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

  // Check for duplicates before creating/updating
  app.post('/api/admin/challenges/check-duplicate', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { dateKey, title, challengeId } = req.body;
      
      if (!dateKey || !title) {
        return res.status(400).json({ error: 'dateKey and title are required' });
      }

      const { checkForDuplicateChallenge, checkForDuplicateChallengeOnUpdate } = await import('./services/duplicateDetectionService');
      
      let duplicateCheck;
      if (challengeId) {
        duplicateCheck = await checkForDuplicateChallengeOnUpdate(challengeId, dateKey, title);
      } else {
        duplicateCheck = await checkForDuplicateChallenge(dateKey, title);
      }

      return res.json(duplicateCheck);
    } catch (error) {
      console.error('Error checking for duplicates:', error);
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
      
      // Check for duplicates before creating
      const { checkForDuplicateChallenge } = await import('./services/duplicateDetectionService');
      const duplicateCheck = await checkForDuplicateChallenge(
        challengeData.dateKey,
        challengeData.title
      );

      if (duplicateCheck.isDuplicate) {
        return res.status(409).json({
          error: 'Duplicate challenge detected',
          duplicateType: duplicateCheck.duplicateType,
          message: duplicateCheck.message,
          existingChallenge: duplicateCheck.existingChallenge,
        });
      }

      const challenge = await storage.createChallenge(challengeData, options);
      
      // Auto-create daily thread if challenge is published
      if (challengeData.isPublished) {
        const { createDailyThread } = await import('./services/forumService');
        await createDailyThread(challenge.dateKey);
      }
      
      return res.json(challenge);
    } catch (error: any) {
      // Handle unique constraint violations from database (date_key unique constraint)
      if (error?.code === '23505' || error?.message?.includes('unique constraint')) {
        return res.status(409).json({
          error: 'Duplicate challenge detected',
          duplicateType: 'exact_date',
          message: `A challenge already exists for date ${req.body.dateKey}`,
        });
      }
      
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
      
      // Check for duplicates if dateKey or title is being updated
      if (challengeData.dateKey || challengeData.title) {
        const currentChallenge = await storage.getChallengeById(req.params.id);
        if (currentChallenge) {
          const { checkForDuplicateChallengeOnUpdate } = await import('./services/duplicateDetectionService');
          const duplicateCheck = await checkForDuplicateChallengeOnUpdate(
            req.params.id,
            challengeData.dateKey || currentChallenge.dateKey,
            challengeData.title || currentChallenge.title
          );

          if (duplicateCheck.isDuplicate) {
            return res.status(409).json({
              error: 'Duplicate challenge detected',
              duplicateType: duplicateCheck.duplicateType,
              message: duplicateCheck.message,
              existingChallenge: duplicateCheck.existingChallenge,
            });
          }
        }
      }
      
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
    } catch (error: any) {
      // Handle unique constraint violations from database
      if (error?.code === '23505' || error?.message?.includes('unique constraint')) {
        return res.status(409).json({
          error: 'Duplicate challenge detected',
          duplicateType: 'exact_date',
          message: `A challenge already exists for date ${req.body.dateKey}`,
        });
      }
      
      console.error('Error updating challenge:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/admin/badges/update', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { seedBadges } = await import('./seedBadges');
      await seedBadges();
      return res.json({ success: true, message: 'Badges updated successfully' });
    } catch (error) {
      console.error('Error updating badges:', error);
      return res.status(500).json({ error: 'Failed to update badges' });
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

  // Find user by email endpoint
  app.get('/api/admin/users/by-email', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { email } = req.query;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email parameter is required' });
      }
      
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.json({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        birthday: user.birthday,
        incomeBracket: user.incomeBracket,
      });
    } catch (error) {
      console.error('Error finding user by email:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // User risk profiling endpoint
  app.get('/api/admin/users/:id/risk-profile', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const riskProfile = await calculateUserRiskProfile(id);
      return res.json(riskProfile);
    } catch (error) {
      console.error('Error calculating risk profile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Category analytics endpoint
  app.get('/api/admin/analytics/categories', requireAdmin, async (req: Request, res: Response) => {
    try {
      const challenges = await storage.getAllChallengesWithOptions();
      const allAttempts = await db.select().from(attempts).where(eq(attempts.isBestAttempt, true));
      
      const categoryData: Record<string, {
        category: string;
        avgScore: number;
        totalAttempts: number;
        riskChoiceRate: number;
        demographicBreakdown: Record<string, {
          ageGroups?: Record<string, { avgScore: number; riskRate: number; count: number; avgAge: number | null }>;
          // Legacy format for backward compatibility
          avgScore?: number;
          riskRate?: number;
          count?: number;
        }>;
      }> = {};

      // Initialize category data
      for (const challenge of challenges) {
        if (!categoryData[challenge.category]) {
          categoryData[challenge.category] = {
            category: challenge.category,
            avgScore: 0,
            totalAttempts: 0,
            riskChoiceRate: 0,
            demographicBreakdown: {},
          };
        }
      }

      // Process attempts by category
      const categoryAttempts: Record<string, Array<{ attempt: any; challenge: any; user: any }>> = {};
      let riskyCount = 0;
      let totalCount = 0;

      for (const attempt of allAttempts) {
        const challenge = challenges.find(c => c.id === attempt.challengeId);
        if (!challenge) continue;

        const user = await storage.getUser(attempt.userId);
        if (!user) continue;

        const category = challenge.category;
        if (!categoryAttempts[category]) {
          categoryAttempts[category] = [];
        }

        categoryAttempts[category].push({ attempt, challenge, user });

        // Check if risky choice (positions 3 or 4 in ideal ranking)
        const ranking = attempt.rankingJson as string[];
        const idealRanking = [...challenge.options]
          .sort((a, b) => a.orderingIndex - b.orderingIndex)
          .map(opt => opt.id);

        const firstChoicePos = idealRanking.indexOf(ranking[0]);
        const secondChoicePos = idealRanking.indexOf(ranking[1]);

        if (firstChoicePos >= 2 || secondChoicePos >= 2) {
          riskyCount++;
        }
        totalCount++;
      }

      // Calculate category statistics
      for (const [category, categoryAttemptsList] of Object.entries(categoryAttempts)) {
        if (categoryAttemptsList.length === 0) continue;

        const scores = categoryAttemptsList.map(item => item.attempt.scoreNumeric);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        // Calculate risk rate for this category
        let categoryRisky = 0;
        for (const { attempt, challenge } of categoryAttemptsList) {
          const ranking = attempt.rankingJson as string[];
          const idealRanking = [...challenge.options]
            .sort((a, b) => a.orderingIndex - b.orderingIndex)
            .map(opt => opt.id);
          const firstChoicePos = idealRanking.indexOf(ranking[0]);
          const secondChoicePos = idealRanking.indexOf(ranking[1]);
          if (firstChoicePos >= 2 || secondChoicePos >= 2) {
            categoryRisky++;
          }
        }

        const riskRate = categoryAttemptsList.length > 0 
          ? categoryRisky / categoryAttemptsList.length 
          : 0;

        categoryData[category].avgScore = Math.round(avgScore);
        categoryData[category].totalAttempts = categoryAttemptsList.length;
        categoryData[category].riskChoiceRate = Math.round(riskRate * 100) / 100;

        // Demographic breakdown by income AND age
        const demographicGroups: Record<string, { scores: number[]; risky: number; total: number; ages: number[] }> = {};
        
        for (const { attempt, user, challenge } of categoryAttemptsList) {
          const incomeBracket = user.incomeBracket || 'unknown';
          
          // Calculate age from birthday
          let age: number | null = null;
          let ageGroup = 'unknown';
          if (user.birthday) {
            const birthDate = new Date(user.birthday);
            const today = new Date();
            age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            if (age < 25) ageGroup = '<25';
            else if (age < 35) ageGroup = '25-34';
            else if (age < 45) ageGroup = '35-44';
            else if (age < 55) ageGroup = '45-54';
            else if (age < 65) ageGroup = '55-64';
            else ageGroup = '65+';
          }
          
          // Create composite key for income + age group
          const key = `${incomeBracket}|${ageGroup}`;
          if (!demographicGroups[key]) {
            demographicGroups[key] = { scores: [], risky: 0, total: 0, ages: [] };
          }

          demographicGroups[key].scores.push(attempt.scoreNumeric);
          demographicGroups[key].total++;
          if (age !== null) {
            demographicGroups[key].ages.push(age);
          }

          const ranking = attempt.rankingJson as string[];
          const idealRanking = [...challenge.options]
            .sort((a, b) => a.orderingIndex - b.orderingIndex)
            .map(opt => opt.id);
          const firstChoicePos = idealRanking.indexOf(ranking[0]);
          const secondChoicePos = idealRanking.indexOf(ranking[1]);
          
          if (firstChoicePos >= 2 || secondChoicePos >= 2) {
            demographicGroups[key].risky++;
          }
        }

        // Reorganize by income bracket, then age groups within each
        for (const [key, data] of Object.entries(demographicGroups)) {
          const [incomeBracket, ageGroup] = key.split('|');
          const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
          const riskRate = data.total > 0 ? data.risky / data.total : 0;
          const avgAge = data.ages.length > 0 ? Math.round(data.ages.reduce((a, b) => a + b, 0) / data.ages.length) : null;
          
          if (!categoryData[category].demographicBreakdown[incomeBracket]) {
            categoryData[category].demographicBreakdown[incomeBracket] = {
              ageGroups: {}
            };
          }
          
          categoryData[category].demographicBreakdown[incomeBracket].ageGroups[ageGroup] = {
            avgScore: Math.round(avgScore),
            riskRate: Math.round(riskRate * 100) / 100,
            count: data.total,
            avgAge: avgAge
          };
        }
      }

      return res.json({
        categories: Object.values(categoryData),
      });
    } catch (error) {
      console.error('Error fetching category analytics:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Challenge statistics with top 2 choices
  app.get('/api/admin/challenges/:id/stats', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const challenge = await storage.getChallengeById(id);
      
      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      const aggregate = await storage.getAggregate(id);
      if (!aggregate || aggregate.bestAttemptCount === 0) {
        return res.json({
          challengeId: id,
          challengeTitle: challenge.title,
          totalAttempts: 0,
          topPickStats: {},
          topTwoStats: {},
        });
      }

      const topPickCounts = aggregate.topPickCountsJson as Record<string, number>;
      const topTwoCounts = (aggregate.topTwoCountsJson || {}) as Record<string, number>;
      const totalAttempts = aggregate.bestAttemptCount;

      // Top pick stats (position 1)
      const topPickStats: Record<string, { count: number; percentage: number; optionText: string }> = {};
      challenge.options.forEach(option => {
        const count = topPickCounts[option.id] || 0;
        topPickStats[option.id] = {
          count,
          percentage: totalAttempts > 0 ? Math.round((count / totalAttempts) * 100) : 0,
          optionText: option.optionText,
        };
      });

      // Top 2 stats (position 1 or 2)
      const topTwoStats: Record<string, { count: number; percentage: number; optionText: string }> = {};
      challenge.options.forEach(option => {
        const count = topTwoCounts[option.id] || 0;
        topTwoStats[option.id] = {
          count,
          percentage: totalAttempts > 0 ? Math.round((count / totalAttempts) * 100) : 0,
          optionText: option.optionText,
        };
      });

      return res.json({
        challengeId: id,
        challengeTitle: challenge.title,
        totalAttempts,
        topPickStats,
        topTwoStats,
      });
    } catch (error) {
      console.error('Error fetching challenge stats:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==================== FORUM API ENDPOINTS ====================
  
  // Helper function to truncate content for free users
  function truncateContent(content: string, maxParagraphs: number = 2): string {
    const paragraphs = content.split('\n\n');
    if (paragraphs.length <= maxParagraphs) {
      return content;
    }
    return paragraphs.slice(0, maxParagraphs).join('\n\n') + '...';
  }

  // GET /api/forum/posts - List posts with filtering
  app.get('/api/forum/posts', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);
      const hasPro = await hasProAccess(userId);
      
      const postType = req.query.type as string | undefined; // 'blog', 'daily_thread', 'custom_thread'
      const sortBy = (req.query.sortBy as string) || 'newest'; // 'newest', 'oldest', 'most_upvoted', 'most_commented'
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      let query = db.select().from(forumPosts);
      const conditions = [];

      if (postType) {
        conditions.push(eq(forumPosts.postType, postType));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply sorting
      if (sortBy === 'most_upvoted') {
        query = query.orderBy(desc(forumPosts.upvoteCount), desc(forumPosts.createdAt));
      } else if (sortBy === 'most_commented') {
        query = query.orderBy(desc(forumPosts.commentCount), desc(forumPosts.createdAt));
      } else if (sortBy === 'oldest') {
        query = query.orderBy(forumPosts.createdAt);
      } else {
        query = query.orderBy(desc(forumPosts.createdAt)); // newest
      }

      const posts = await query.limit(limit).offset(offset);

      // Get author info and format response
      const postsWithAuthors = await Promise.all(posts.map(async (post) => {
        const author = await storage.getUser(post.authorId);
        const userVote = hasPro ? await db
          .select()
          .from(forumVotes)
          .where(and(
            eq(forumVotes.postId, post.id),
            eq(forumVotes.userId, userId)
          ))
          .limit(1) : null;

        // Truncate content for free users
        let content = post.content;
        if (!hasPro) {
          if (post.postType === 'blog') {
            content = truncateContent(post.content, 2);
          } else if (post.postType === 'daily_thread') {
            content = ''; // Only title for daily threads
          } else {
            content = truncateContent(post.content, 2);
          }
        }

        return {
          id: post.id,
          title: post.title,
          content: hasPro ? post.content : content,
          contentPreview: !hasPro ? content : null,
          author: {
            id: author?.id,
            displayName: author?.displayName || 'Anonymous',
            avatar: author?.avatar,
          },
          postType: post.postType,
          challengeDateKey: post.challengeDateKey,
          isPinned: post.isPinned,
          upvoteCount: post.upvoteCount,
          commentCount: post.commentCount,
          hasUserUpvoted: !!userVote?.[0],
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          canEdit: post.authorId === userId,
          canDelete: post.authorId === userId,
        };
      }));

      return res.json({ posts: postsWithAuthors, hasPro });
    } catch (error) {
      console.error('Error fetching forum posts:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/forum/posts/:id - Get single post
  app.get('/api/forum/posts/:id', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const hasPro = await hasProAccess(userId);
      const postId = req.params.id;

      const [post] = await db
        .select()
        .from(forumPosts)
        .where(eq(forumPosts.id, postId))
        .limit(1);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const author = await storage.getUser(post.authorId);
      const userVote = hasPro ? await db
        .select()
        .from(forumVotes)
        .where(and(
          eq(forumVotes.postId, post.id),
          eq(forumVotes.userId, userId)
        ))
        .limit(1) : null;

      // Truncate content for free users
      let content = post.content;
      if (!hasPro) {
        if (post.postType === 'blog') {
          content = truncateContent(post.content, 2);
        } else if (post.postType === 'daily_thread') {
          content = ''; // Only title for daily threads
        } else {
          content = truncateContent(post.content, 2);
        }
      }

      return res.json({
        id: post.id,
        title: post.title,
        content: hasPro ? post.content : content,
        contentPreview: !hasPro ? content : null,
        author: {
          id: author?.id,
          displayName: author?.displayName || 'Anonymous',
          avatar: author?.avatar,
        },
        postType: post.postType,
        challengeDateKey: post.challengeDateKey,
        isPinned: post.isPinned,
        upvoteCount: post.upvoteCount,
        commentCount: post.commentCount,
        hasUserUpvoted: !!userVote?.[0],
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        canEdit: post.authorId === userId,
        canDelete: post.authorId === userId,
        hasPro,
      });
    } catch (error) {
      console.error('Error fetching forum post:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/forum/posts - Create post (Pro only, or admin for blog posts)
  app.post('/api/forum/posts', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);
      const hasPro = await hasProAccess(userId);
      
      const { title, content, postType, challengeDateKey } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }

      // Check permissions
      if (postType === 'blog') {
        // Only admin can create blog posts - check admin token
        if (!checkAdminToken(req)) {
          return res.status(403).json({ error: 'Only admins can create blog posts' });
        }
      } else {
        // Pro required for daily_thread and custom_thread
        if (!hasPro) {
          return res.status(403).json({ error: 'Pro subscription required to create posts' });
        }
      }

      const [newPost] = await db
        .insert(forumPosts)
        .values({
          title,
          content,
          authorId: userId,
          postType: postType || 'custom_thread',
          challengeDateKey: challengeDateKey || null,
        })
        .returning();

      return res.status(201).json(newPost);
    } catch (error) {
      console.error('Error creating forum post:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/forum/posts/:id - Update post (author only)
  app.put('/api/forum/posts/:id', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const hasPro = await hasProAccess(userId);
      const postId = req.params.id;

      if (!hasPro) {
        return res.status(403).json({ error: 'Pro subscription required' });
      }

      const [post] = await db
        .select()
        .from(forumPosts)
        .where(eq(forumPosts.id, postId))
        .limit(1);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.authorId !== userId) {
        return res.status(403).json({ error: 'You can only edit your own posts' });
      }

      const { title, content } = req.body;
      const updateData: any = { updatedAt: new Date() };
      if (title) updateData.title = title;
      if (content) updateData.content = content;

      const [updatedPost] = await db
        .update(forumPosts)
        .set(updateData)
        .where(eq(forumPosts.id, postId))
        .returning();

      return res.json(updatedPost);
    } catch (error) {
      console.error('Error updating forum post:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/forum/posts/:id - Delete post (author only)
  app.delete('/api/forum/posts/:id', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const hasPro = await hasProAccess(userId);
      const postId = req.params.id;

      if (!hasPro) {
        return res.status(403).json({ error: 'Pro subscription required' });
      }

      const [post] = await db
        .select()
        .from(forumPosts)
        .where(eq(forumPosts.id, postId))
        .limit(1);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.authorId !== userId) {
        return res.status(403).json({ error: 'You can only delete your own posts' });
      }

      await db.delete(forumPosts).where(eq(forumPosts.id, postId));

      return res.json({ success: true });
    } catch (error) {
      console.error('Error deleting forum post:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/forum/posts/daily/:dateKey - Get or create daily thread
  app.get('/api/forum/posts/daily/:dateKey', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const hasPro = await hasProAccess(userId);
      const dateKey = req.params.dateKey;

      // Check if daily thread exists
      let [post] = await db
        .select()
        .from(forumPosts)
        .where(and(
          eq(forumPosts.postType, 'daily_thread'),
          eq(forumPosts.challengeDateKey, dateKey)
        ))
        .limit(1);

      // If doesn't exist, create it
      if (!post) {
        const challenge = await storage.getChallengeByDateKey(dateKey);
        if (!challenge) {
          return res.status(404).json({ error: 'Challenge not found' });
        }

        [post] = await db
          .insert(forumPosts)
          .values({
            title: `Daily Discussion: ${challenge.title} (${dateKey})`,
            content: `Discuss today's challenge: ${challenge.title}\n\n${challenge.scenarioText}\n\nShare your thoughts and reasoning!`,
            authorId: userId, // System user or first user
            postType: 'daily_thread',
            challengeDateKey: dateKey,
          })
          .returning();
      }

      const author = await storage.getUser(post.authorId);
      const userVote = hasPro ? await db
        .select()
        .from(forumVotes)
        .where(and(
          eq(forumVotes.postId, post.id),
          eq(forumVotes.userId, userId)
        ))
        .limit(1) : null;

      // Free users only see title for daily threads
      const content = hasPro ? post.content : '';

      return res.json({
        id: post.id,
        title: post.title,
        content: hasPro ? post.content : content,
        contentPreview: !hasPro ? null : null,
        author: {
          id: author?.id,
          displayName: author?.displayName || 'Anonymous',
          avatar: author?.avatar,
        },
        postType: post.postType,
        challengeDateKey: post.challengeDateKey,
        isPinned: post.isPinned,
        upvoteCount: post.upvoteCount,
        commentCount: post.commentCount,
        hasUserUpvoted: !!userVote?.[0],
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        canEdit: post.authorId === userId,
        canDelete: post.authorId === userId,
        hasPro,
      });
    } catch (error) {
      console.error('Error fetching daily thread:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/forum/comments/:postId - Get comments for a post
  app.get('/api/forum/comments/:postId', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const hasPro = await hasProAccess(userId);
      const postId = req.params.postId;

      if (!hasPro) {
        return res.status(403).json({ error: 'Pro subscription required to view comments' });
      }

      const comments = await db
        .select()
        .from(forumComments)
        .where(eq(forumComments.postId, postId))
        .orderBy(desc(forumComments.upvoteCount), desc(forumComments.createdAt));

      // Get user info and votes
      const commentsWithUsers = await Promise.all(comments.map(async (comment) => {
        const author = await storage.getUser(comment.userId);
        const [userVote] = await db
          .select()
          .from(forumVotes)
          .where(and(
            eq(forumVotes.commentId, comment.id),
            eq(forumVotes.userId, userId)
          ))
          .limit(1);

        return {
          id: comment.id,
          content: comment.content,
          author: {
            id: author?.id,
            displayName: author?.displayName || 'Anonymous',
            avatar: author?.avatar,
          },
          parentId: comment.parentId,
          upvoteCount: comment.upvoteCount,
          hasUserUpvoted: !!userVote,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          canEdit: comment.userId === userId,
          canDelete: comment.userId === userId,
        };
      }));

      return res.json({ comments: commentsWithUsers });
    } catch (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/forum/comments - Create comment (Pro only)
  app.post('/api/forum/comments', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const hasPro = await hasProAccess(userId);

      if (!hasPro) {
        return res.status(403).json({ error: 'Pro subscription required to comment' });
      }

      const { postId, content, parentId } = req.body;

      if (!postId || !content) {
        return res.status(400).json({ error: 'Post ID and content are required' });
      }

      const [newComment] = await db
        .insert(forumComments)
        .values({
          postId,
          userId,
          content,
          parentId: parentId || null,
        })
        .returning();

      // Update comment count on post
      await db
        .update(forumPosts)
        .set({ 
          commentCount: sql`${forumPosts.commentCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(forumPosts.id, postId));

      return res.status(201).json(newComment);
    } catch (error) {
      console.error('Error creating comment:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/forum/votes - Upvote post/comment (Pro only)
  app.post('/api/forum/votes', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const hasPro = await hasProAccess(userId);

      if (!hasPro) {
        return res.status(403).json({ error: 'Pro subscription required to upvote' });
      }

      const { postId, commentId } = req.body;

      if (!postId && !commentId) {
        return res.status(400).json({ error: 'Either postId or commentId is required' });
      }

      if (postId && commentId) {
        return res.status(400).json({ error: 'Cannot vote on both post and comment' });
      }

      // Check if already voted
      const existingVote = postId
        ? await db
            .select()
            .from(forumVotes)
            .where(and(
              eq(forumVotes.postId, postId),
              eq(forumVotes.userId, userId)
            ))
            .limit(1)
        : await db
            .select()
            .from(forumVotes)
            .where(and(
              eq(forumVotes.commentId, commentId),
              eq(forumVotes.userId, userId)
            ))
            .limit(1);

      if (existingVote.length > 0) {
        return res.status(400).json({ error: 'Already voted' });
      }

      // Create vote
      await db.insert(forumVotes).values({
        postId: postId || null,
        commentId: commentId || null,
        userId,
        voteType: 'upvote',
      });

      // Update upvote count
      if (postId) {
        await db
          .update(forumPosts)
          .set({ upvoteCount: sql`${forumPosts.upvoteCount} + 1` })
          .where(eq(forumPosts.id, postId));
      } else {
        await db
          .update(forumComments)
          .set({ upvoteCount: sql`${forumComments.upvoteCount} + 1` })
          .where(eq(forumComments.id, commentId!));
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Error creating vote:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /api/forum/votes/:id - Remove vote (Pro only)
  app.delete('/api/forum/votes', ensureUser, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const hasPro = await hasProAccess(userId);

      if (!hasPro) {
        return res.status(403).json({ error: 'Pro subscription required' });
      }

      const { postId, commentId } = req.body;

      if (!postId && !commentId) {
        return res.status(400).json({ error: 'Either postId or commentId is required' });
      }

      // Find and delete vote
      const voteCondition = postId
        ? and(eq(forumVotes.postId, postId), eq(forumVotes.userId, userId))
        : and(eq(forumVotes.commentId, commentId), eq(forumVotes.userId, userId));

      const [vote] = await db
        .select()
        .from(forumVotes)
        .where(voteCondition)
        .limit(1);

      if (!vote) {
        return res.status(404).json({ error: 'Vote not found' });
      }

      await db.delete(forumVotes).where(eq(forumVotes.id, vote.id));

      // Update upvote count
      if (postId) {
        await db
          .update(forumPosts)
          .set({ upvoteCount: sql`${forumPosts.upvoteCount} - 1` })
          .where(eq(forumPosts.id, postId));
      } else {
        await db
          .update(forumComments)
          .set({ upvoteCount: sql`${forumComments.upvoteCount} - 1` })
          .where(eq(forumComments.id, commentId!));
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Error removing vote:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return server;
}
