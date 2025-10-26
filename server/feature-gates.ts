import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";
import { storage } from "./storage";
import { hasFeature, isLimitReached, getLimit, type PricingTier } from "@shared/pricing";
import logger from "./logger";

export interface FeatureGateRequest extends AuthRequest {
  userPlan?: PricingTier;
}

// Middleware to check if user has access to a specific feature
export function requireFeature(featureName: string) {
  return async (req: FeatureGateRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const user = await storage.getUserByEmail(req.user.email);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      req.userPlan = user.plan as PricingTier;

      // Check if the feature is available for the user's plan
      const featureKey = featureName as keyof import("@shared/pricing").PlanFeatures;
      if (!hasFeature(user.plan as PricingTier, featureKey)) {
        logger.warn("Feature gate blocked access", {
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
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const user = await storage.getUserByEmail(req.user.email);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const userPlan = user.plan as PricingTier;
    const currentSubscriptions = await storage.getAllSubscriptions();
    const activeCount = currentSubscriptions.filter((s) => s.status === "active").length;

    if (isLimitReached(userPlan, "maxSubscriptions", activeCount)) {
      const limit = getLimit(userPlan, "maxSubscriptions");
      
      logger.warn("Subscription limit reached", {
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
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const user = await storage.getUserByEmail(req.user.email);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const userPlan = user.plan as PricingTier;
    const currentConnections = await storage.getAllBankConnections();

    if (isLimitReached(userPlan, "maxBankConnections", currentConnections.length)) {
      const limit = getLimit(userPlan, "maxBankConnections");
      
      logger.warn("Bank connection limit reached", {
        email: user.email,
        plan: userPlan,
        currentCount: currentConnections.length,
        limit,
      });

      return res.status(403).json({
        error: "Bank connection limit reached",
        message: limit === 0 
          ? `Bank connections are not available on the ${userPlan} plan. Please upgrade to connect your bank accounts.`
          : `You've reached the maximum of ${limit} bank connection(s) on your ${userPlan} plan. Please upgrade to connect more accounts.`,
        currentPlan: userPlan,
        currentCount: currentConnections.length,
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
export async function getUserPlanLimits(email: string) {
  const user = await storage.getUserByEmail(email);
  if (!user) {
    return null;
  }

  const plan = user.plan as PricingTier;
  const subscriptions = await storage.getAllSubscriptions();
  const bankConnections = await storage.getAllBankConnections();
  
  const activeSubscriptions = subscriptions.filter((s) => s.status === "active").length;
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
      current: bankConnections.length,
      max: maxBankConnections,
      canAdd: maxBankConnections === null || bankConnections.length < maxBankConnections,
    },
    features: {
      exportData: hasFeature(plan, "exportData"),
      importData: hasFeature(plan, "importData"),
      webhooks: hasFeature(plan, "webhooks"),
      emailNotifications: hasFeature(plan, "emailNotifications"),
    },
  };
}
