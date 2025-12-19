import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
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
  let userId = req.cookies?.mr_uid;

  if (!userId) {
    userId = generateUserId();
    await storage.createUser({ id: userId });
    
    res.cookie('mr_uid', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 365 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });
  } else {
    const user = await storage.getUser(userId);
    if (!user) {
      await storage.createUser({ id: userId });
    }
  }

  req.userId = userId;
  next();
}
