import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "./authMiddleware";
import { storage } from "./storage";
import { hasFeature, isLimitReached, getLimit, type PricingTier } from "@shared/pricing";
import logger from "./logger";

export interface FeatureGateRequest extends AuthRequest {
  userPlan?: PricingTier;
}

// Middleware to check if user has access to a specific feature
export function requireFeature(featureName: string) {
  return async (req: FeatureGateRequest, res: Response, next: NextFunction) => {
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      req.userPlan = user.plan as PricingTier;

      // Check if the feature is available for the user's plan
      const featureKey = featureName as keyof import("@shared/pricing").PlanFeatures;
      if (!hasFeature(user.plan as PricingTier, featureKey)) {
        logger.warn("Feature gate blocked access", {
          userId: user.id,
          email: user.email,
          plan: user.plan,
          feature: featureName,
        });
        
        return res.status(403).json({
          error: "Upgrade required",
          message: `This feature is not available on your current plan. Please upgrade to access ${featureName}.`,
          feature: featureName,
          currentPlan: user.plan,
        });
      }

      next();
    } catch (error) {
      logger.error("Feature gate error", { error, feature: featureName });
      res.status(500).json({ error: "Failed to verify feature access" });
    }
  };
}

// Middleware to check subscription limit
export async function checkSubscriptionLimit(
  req: FeatureGateRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.claims?.sub) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const userPlan = user.plan as PricingTier;
    const userSubscriptions = await storage.getSubscriptionsByUserId(user.id);
    const activeCount = userSubscriptions.filter((s) => s.status === "active").length;

    if (isLimitReached(userPlan, "maxSubscriptions", activeCount)) {
      const limit = getLimit(userPlan, "maxSubscriptions");
      
      logger.warn("Subscription limit reached", {
        userId: user.id,
        email: user.email,
        plan: userPlan,
        currentCount: activeCount,
        limit,
      });

      return res.status(403).json({
        error: "Subscription limit reached",
        message: `You've reached the maximum of ${limit} active subscriptions on your ${userPlan} plan. Please upgrade to add more subscriptions.`,
        currentPlan: userPlan,
        currentCount: activeCount,
        limit,
      });
    }

    req.userPlan = userPlan;
    next();
  } catch (error) {
    logger.error("Subscription limit check error", { error });
    res.status(500).json({ error: "Failed to verify subscription limit" });
  }
}

// Middleware to check bank connection limit
export async function checkBankConnectionLimit(
  req: FeatureGateRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.claims?.sub) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const userPlan = user.plan as PricingTier;
    const userConnections = await storage.getBankConnectionsByUserId(user.id);

    if (isLimitReached(userPlan, "maxBankConnections", userConnections.length)) {
      const limit = getLimit(userPlan, "maxBankConnections");
      
      logger.warn("Bank connection limit reached", {
        userId: user.id,
        email: user.email,
        plan: userPlan,
        currentCount: userConnections.length,
        limit,
      });

      return res.status(403).json({
        error: "Bank connection limit reached",
        message: limit === 0 
          ? `Bank connections are not available on the ${userPlan} plan. Please upgrade to connect your bank accounts.`
          : `You've reached the maximum of ${limit} bank connection(s) on your ${userPlan} plan. Please upgrade to connect more accounts.`,
        currentPlan: userPlan,
        currentCount: userConnections.length,
        limit,
      });
    }

    req.userPlan = userPlan;
    next();
  } catch (error) {
    logger.error("Bank connection limit check error", { error });
    res.status(500).json({ error: "Failed to verify bank connection limit" });
  }
}

// Helper function to get user's current plan limits (for client-side display)
export async function getUserPlanLimits(userId: string) {
  const user = await storage.getUser(userId);
  if (!user) {
    return null;
  }

  const plan = user.plan as PricingTier;
  const userSubscriptions = await storage.getSubscriptionsByUserId(user.id);
  const userBankConnections = await storage.getBankConnectionsByUserId(user.id);
  
  const activeSubscriptions = userSubscriptions.filter((s) => s.status === "active").length;
  const maxSubscriptions = getLimit(plan, "maxSubscriptions");
  const maxBankConnections = getLimit(plan, "maxBankConnections");

  return {
    plan,
    subscriptions: {
      current: activeSubscriptions,
      max: maxSubscriptions,
      canAdd: maxSubscriptions === null || activeSubscriptions < maxSubscriptions,
    },
    bankConnections: {
      current: userBankConnections.length,
      max: maxBankConnections,
      canAdd: maxBankConnections === null || userBankConnections.length < maxBankConnections,
    },
    features: {
      exportData: hasFeature(plan, "exportData"),
      importData: hasFeature(plan, "importData"),
      webhooks: hasFeature(plan, "webhooks"),
      emailNotifications: hasFeature(plan, "emailNotifications"),
    },
  };
}
