import { Request, Response, NextFunction } from 'express';
import basicAuth from 'express-basic-auth';

/**
 * Staging authentication middleware
 * ONLY activates if STAGING_ACCESS_PASSWORD is set
 * Safe to deploy to production - will be a no-op if env var is not set
 * Excludes /admin routes which have their own authentication
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
  
  // Create the basic auth middleware
  const basicAuthMiddleware = basicAuth({
    users: { [stagingUser]: stagingPassword },
    challenge: true,
    realm: 'Staging Environment - Authentication Required',
    unauthorizedResponse: (req: Request) => {
      return 'Unauthorized - This staging environment requires authentication';
    }
  });
  
  // Return middleware that skips basic auth for admin routes
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip staging auth for admin routes - they have their own authentication
    if (req.path.startsWith('/admin') || req.path.startsWith('/api/admin')) {
      return next();
    }
    // Apply basic auth for all other routes
    basicAuthMiddleware(req, res, next);
  };
}

