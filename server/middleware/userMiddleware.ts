import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function ensureUser(req: Request, res: Response, next: NextFunction) {
  let userId = req.cookies?.mr_uid;

  if (!userId) {
    const newUser = await storage.createUser({});
    userId = newUser.id;
    
    res.cookie('mr_uid', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 365 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });
  } else {
    const user = await storage.getUser(userId);
    if (!user) {
      const newUser = await storage.createUser({});
      userId = newUser.id;
      
      res.cookie('mr_uid', userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 365 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });
    }
  }

  req.userId = userId;
  next();
}
