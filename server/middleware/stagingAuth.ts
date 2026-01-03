import { Request, Response, NextFunction } from 'express';
import basicAuth from 'express-basic-auth';

/**
 * Staging authentication middleware
 * ONLY activates if STAGING_ACCESS_PASSWORD is set
 * Safe to deploy to production - will be a no-op if env var is not set
 */
export function stagingAuth() {
  const stagingPassword = process.env.STAGING_ACCESS_PASSWORD;
  const stagingUser = process.env.STAGING_ACCESS_USER || 'staging';
  
  // If no password is set, don't protect (safe for production)
  if (!stagingPassword) {
    return (req: Request, res: Response, next: NextFunction) => {
      // No-op middleware - just passes through
      next();
    };
  }
  
  // Only protect if password is configured (staging only)
  return basicAuth({
    users: { [stagingUser]: stagingPassword },
    challenge: true,
    realm: 'Staging Environment - Authentication Required',
    unauthorizedResponse: (req: Request) => {
      return 'Unauthorized - This staging environment requires authentication';
    }
  });
}

