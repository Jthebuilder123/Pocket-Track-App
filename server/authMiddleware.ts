import { Request, Response, NextFunction } from "express";
import logger from "./logger";

// Replit Auth user structure (via Passport.js)
export interface ReplitAuthUser {
  claims: {
    sub: string;
    email: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
    exp?: number;
  };
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface AuthRequest extends Request {
  user?: ReplitAuthUser;
}

/**
 * Middleware to protect routes - requires Replit Auth authentication
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.claims || !req.user.claims.sub) {
    logger.warn("Unauthorized access attempt", { 
      hasUser: !!req.user, 
      hasClaims: !!(req.user?.claims),
      hasSub: !!(req.user?.claims?.sub)
    });
    return res.status(401).json({ error: "Authentication required" });
  }

  // User is authenticated via Replit Auth
  next();
}

/**
 * Middleware to optionally load user if authenticated
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  // User will be loaded by Passport if session exists
  // No action needed, just pass through
  next();
}
