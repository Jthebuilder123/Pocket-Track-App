import { Request, Response, NextFunction } from "express";
import { verifySessionToken } from "./auth";
import logger from "./logger";

export interface AuthRequest extends Request {
  user?: {
    email: string;
  };
}

/**
 * Middleware to protect routes - requires authentication
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.session;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const payload = verifySessionToken(token);
  
  if (!payload) {
    res.clearCookie("session");
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = { email: payload.email };
  next();
}

/**
 * Middleware to optionally load user if authenticated
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.session;

  if (token) {
    const payload = verifySessionToken(token);
    if (payload) {
      req.user = { email: payload.email };
    }
  }

  next();
}
