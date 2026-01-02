import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function generateUserId(): string {
  return crypto.randomUUID();
}

export async function ensureUser(req: Request, res: Response, next: NextFunction) {
  // Check if user is authenticated via Passport session
  if (req.user && (req.user as any).id) {
    req.userId = (req.user as any).id;
    // Continue to ensure user exists in database
    const user = await storage.getUser(req.userId);
    if (!user) {
      // This shouldn't happen, but handle it gracefully
      console.error('Passport user not found in database:', req.userId);
    }
    return next();
  }

  // Fall back to anonymous cookie-based auth
  let userId = req.cookies?.mr_uid;

  if (!userId) {
    userId = generateUserId();
    const { generateRandomName } = await import('../utils/nameGenerator');
    const randomName = generateRandomName(userId);
    
    await storage.createUser({ 
      id: userId,
      displayName: randomName,
    });
    
    res.cookie('mr_uid', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 365 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });
  } else {
    const user = await storage.getUser(userId);
    if (!user) {
      const { generateRandomName } = await import('../utils/nameGenerator');
      const randomName = generateRandomName(userId);
      await storage.createUser({ 
        id: userId,
        displayName: randomName,
      });
    } else if (user.authProvider === 'anonymous' && !user.displayName) {
      // Generate name for existing anonymous user without name
      const { generateRandomName } = await import('../utils/nameGenerator');
      const randomName = generateRandomName(userId);
      await db.update(users).set({ displayName: randomName }).where(eq(users.id, userId));
    }
  }

  req.userId = userId;
  next();
}

export async function requireAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Check if user is authenticated via Passport session (not anonymous)
  if (req.user && (req.user as any).id) {
    req.userId = (req.user as any).id;
    const user = await storage.getUser(req.userId);
    if (user && user.authProvider !== 'anonymous') {
      return next();
    }
  }

  // Not authenticated - return 401
  return res.status(401).json({ 
    error: 'Authentication required',
    requiresLogin: true 
  });
}
