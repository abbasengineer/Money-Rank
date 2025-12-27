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
  
  // Debug logging to verify env var is being read
  console.log('[Staging Auth] Checking environment variables...');
  console.log('[Staging Auth] STAGING_ACCESS_PASSWORD set:', !!stagingPassword);
  console.log('[Staging Auth] STAGING_ACCESS_USER:', stagingUser);
  
  // If no password is set, don't protect (safe for production)
  if (!stagingPassword) {
    console.log('[Staging Auth] No password configured - skipping protection');
    return (req: Request, res: Response, next: NextFunction) => {
      // No-op middleware - just passes through
      next();
    };
  }
  
  console.log('[Staging Auth] Protection ENABLED - Basic Auth will be required');
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

