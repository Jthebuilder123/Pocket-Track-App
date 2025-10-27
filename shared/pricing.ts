// Pricing tier definitions for PocketTrack

export const PRICING_TIERS = {
  FREE: "free",
  ESSENTIALS: "essentials",
  PRO: "pro",
} as const;

export type PricingTier = typeof PRICING_TIERS[keyof typeof PRICING_TIERS];

export interface PlanFeatures {
  maxSubscriptions: number | null; // null = unlimited
  maxBankConnections: number | null;
  exportData: boolean;
  importData: boolean;
  analytics: boolean;
  webhooks: boolean;
  cancelHelper: boolean;
  emailNotifications: boolean;
  autoSyncEnabled: boolean; // Auto-sync bank transactions to create subscriptions
}

export interface PlanDetails {
  id: PricingTier;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyMonthlyEquivalent: number;
  description: string;
  features: PlanFeatures;
  popular?: boolean;
}

export const PLAN_FEATURES: Record<PricingTier, PlanFeatures> = {
  free: {
    maxSubscriptions: 10,
    maxBankConnections: 1,
    exportData: false,
    importData: true,
    analytics: true,
    webhooks: false,
    cancelHelper: true,
    emailNotifications: false,
    autoSyncEnabled: false,
  },
  essentials: {
    maxSubscriptions: 25,
    maxBankConnections: 3,
    exportData: true,
    importData: true,
    analytics: true,
    webhooks: false,
    cancelHelper: true,
    emailNotifications: true,
    autoSyncEnabled: false,
  },
  pro: {
    maxSubscriptions: null, // unlimited
    maxBankConnections: null, // unlimited
    exportData: true,
    importData: true,
    analytics: true,
    webhooks: true,
    cancelHelper: true,
    emailNotifications: true,
    autoSyncEnabled: true, // Premium feature for Pro plan
  },
};

export const PLANS: PlanDetails[] = [
  {
    id: PRICING_TIERS.FREE,
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyMonthlyEquivalent: 0,
    description: "Perfect for getting started with subscription tracking",
    features: PLAN_FEATURES.free,
  },
  {
    id: PRICING_TIERS.ESSENTIALS,
    name: "Essentials",
    monthlyPrice: 4.99,
    yearlyPrice: 39, // $3.25/mo when paid yearly (35% discount)
    yearlyMonthlyEquivalent: 3.25,
    description: "For individuals managing multiple subscriptions",
    features: PLAN_FEATURES.essentials,
    popular: true,
  },
  {
    id: PRICING_TIERS.PRO,
    name: "Pro",
    monthlyPrice: 7.99,
    yearlyPrice: 59, // $4.92/mo when paid yearly (38% discount)
    yearlyMonthlyEquivalent: 4.92,
    description: "For power users who need unlimited tracking and integrations",
    features: PLAN_FEATURES.pro,
  },
];

// Helper function to check if a feature is available for a plan
export function hasFeature(plan: PricingTier, feature: keyof PlanFeatures): boolean {
  return PLAN_FEATURES[plan][feature] === true;
}

// Helper function to check if a limit is reached
export function isLimitReached(
  plan: PricingTier,
  limitType: "maxSubscriptions" | "maxBankConnections",
  currentCount: number
): boolean {
  const limit = PLAN_FEATURES[plan][limitType];
  if (limit === null) return false; // unlimited
  return currentCount >= limit;
}

// Helper function to get limit value
export function getLimit(
  plan: PricingTier,
  limitType: "maxSubscriptions" | "maxBankConnections"
): number | null {
  return PLAN_FEATURES[plan][limitType];
}
