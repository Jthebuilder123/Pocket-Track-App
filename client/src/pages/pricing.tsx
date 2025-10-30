import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X as XIcon, Loader2, ArrowRight, Sparkles, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PlanFeatures {
  maxSubscriptions: number | null;
  maxBankConnections: number | null;
  exportData: boolean;
  importData: boolean;
  analytics: boolean;
  webhooks: boolean;
  cancelHelper: boolean;
  emailNotifications: boolean;
}

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyMonthlyEquivalent: number;
  description: string;
  features: PlanFeatures;
  popular?: boolean;
}

// FIX: Add type for user plan limits response from API
interface UserPlanLimits {
  plan: string;
  subscriptions: {
    current: number;
    limit: number | null;
  };
  bankConnections: {
    current: number;
    limit: number | null;
  };
  features: PlanFeatures;
}

export default function Pricing() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/pricing"],
  });

  // FIX: Add type to currentPlan query to resolve TypeScript error
  const { data: currentPlan } = useQuery<UserPlanLimits>({
    queryKey: ["/api/user/plan"],
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async ({ planId, billingInterval }: { planId: string; billingInterval: string }) => {
      const res = await apiRequest("POST", "/api/create-checkout-session", { planId, billingInterval });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle success/cancel from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setShowSuccessBanner(true);
      queryClient.invalidateQueries({ queryKey: ["/api/user/plan"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Clean up URL without reloading
      window.history.replaceState({}, '', '/pricing');
    } else if (params.get("canceled") === "true") {
      toast({
        title: "Checkout Canceled",
        description: "Your checkout was canceled. No charges were made.",
      });
      // Clean up URL without reloading
      window.history.replaceState({}, '', '/pricing');
    }
  }, [toast]);

  const getFeatureDisplay = (feature: keyof PlanFeatures, value: any, planName: string) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-4 w-4 text-primary" data-testid={`icon-check-${planName.toLowerCase()}`} />
      ) : (
        <XIcon className="h-4 w-4 text-muted-foreground" data-testid={`icon-x-${planName.toLowerCase()}`} />
      );
    }
    if (value === null) {
      return <span className="text-sm font-medium">Unlimited</span>;
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  const allFeatures: { key: keyof PlanFeatures; label: string }[] = [
    { key: "maxSubscriptions", label: "Active Subscriptions" },
    { key: "maxBankConnections", label: "Bank Connections" },
    { key: "analytics", label: "Analytics Dashboard" },
    { key: "cancelHelper", label: "Cancellation Helper" },
    { key: "exportData", label: "Export Data (CSV/JSON)" },
    { key: "importData", label: "Import Data (CSV/Excel)" },
    { key: "emailNotifications", label: "Email Notifications" },
    { key: "webhooks", label: "Webhook Integrations" },
  ];

  if (plansLoading || !plans) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 relative">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 z-50"
        onClick={() => navigate("/")}
        data-testid="button-close-pricing"
      >
        <XIcon className="h-4 w-4" />
      </Button>
      {/* Success Banner */}
      {showSuccessBanner && currentPlan && (
        <Alert className="mb-8 border-primary bg-primary/5" data-testid="alert-purchase-success">
          <Sparkles className="h-5 w-5 text-primary" data-testid="icon-sparkles" />
          <AlertTitle className="text-lg font-semibold" data-testid="text-success-title">Welcome to {currentPlan.plan}!</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4" data-testid="text-success-message">
              Your subscription is now active! You now have access to all {currentPlan.plan} features including:
            </p>
            <ul className="list-disc list-inside space-y-1 mb-4 text-sm" data-testid="list-unlocked-features">
              {currentPlan.features.analytics && <li data-testid="feature-analytics">Advanced Analytics Dashboard</li>}
              {currentPlan.features.exportData && <li data-testid="feature-export">Export Data (CSV/JSON)</li>}
              {currentPlan.features.importData && <li data-testid="feature-import">Import Data (CSV/Excel)</li>}
              {currentPlan.features.webhooks && <li data-testid="feature-webhooks">Webhook Integrations</li>}
              {currentPlan.features.emailNotifications && <li data-testid="feature-email">Email Notifications</li>}
              {(currentPlan.subscriptions.limit === null || currentPlan.subscriptions.limit > 10) && (
                <li data-testid="feature-unlimited-subs">Unlimited Subscriptions</li>
              )}
              {(currentPlan.bankConnections.limit === null || currentPlan.bankConnections.limit > 1) && (
                <li data-testid="feature-bank-connections">Multiple Bank Connections</li>
              )}
            </ul>
            <Button
              onClick={() => navigate("/")}
              className="gap-2"
              data-testid="button-go-to-dashboard"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-3" data-testid="text-pricing-title">
          Simple, Transparent Pricing
        </h1>
        <p className="text-muted-foreground text-lg mb-6">
          Choose the plan that works best for you
        </p>

        <div className="flex items-center justify-center gap-3 mb-2">
          <Label htmlFor="billing-toggle" className={billingInterval === "monthly" ? "font-semibold" : ""}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingInterval === "yearly"}
            onCheckedChange={(checked) => setBillingInterval(checked ? "yearly" : "monthly")}
            data-testid="switch-billing-interval"
          />
          <Label htmlFor="billing-toggle" className={billingInterval === "yearly" ? "font-semibold" : ""}>
            Yearly
          </Label>
        </div>
        {billingInterval === "yearly" && (
          <p className="text-sm text-primary font-medium">
            Save up to 38% with yearly billing
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
        {plans.map((plan) => {
          const price = billingInterval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
          const displayPrice = billingInterval === "yearly" ? plan.yearlyMonthlyEquivalent : plan.monthlyPrice;
          const isCurrentPlan = currentPlan?.plan === plan.id;
          const isFree = plan.monthlyPrice === 0;

          return (
            <Card
              key={plan.id}
              className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}
              data-testid={`card-plan-${plan.id}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" data-testid="badge-popular">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle data-testid={`text-plan-name-${plan.id}`}>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold" data-testid={`text-price-${plan.id}`}>
                    ${displayPrice}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                  {billingInterval === "yearly" && !isFree && (
                    <div className="text-sm text-muted-foreground mt-1">
                      ${price} billed yearly
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {allFeatures.map((feature) => (
                    <li key={feature.key} className="flex items-center gap-3">
                      {getFeatureDisplay(feature.key, plan.features[feature.key], plan.name)}
                      <span className="text-sm flex items-center gap-1">
                        {feature.label}
                        {feature.key === "webhooks" && plan.features[feature.key] && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs" data-testid="tooltip-webhook-help">
                              <p className="text-sm">
                                <strong>Webhooks</strong> automatically notify your other apps when something happens in PocketTrack.
                              </p>
                              <p className="text-sm mt-2">
                                <strong>Example:</strong> When you add or cancel a subscription, PocketTrack can send a notification to your spreadsheet, budgeting app, or custom automation tool.
                              </p>
                              <p className="text-sm mt-2 text-muted-foreground">
                                Perfect for developers and power users who want to integrate PocketTrack with other services.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isFree ? (
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "secondary" : "default"}
                    disabled={isCurrentPlan}
                    data-testid={`button-plan-${plan.id}`}
                  >
                    {isCurrentPlan ? "Current Plan" : "Free Forever"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    disabled={isCurrentPlan || createCheckoutMutation.isPending}
                    onClick={() =>
                      createCheckoutMutation.mutate({
                        planId: plan.id,
                        billingInterval,
                      })
                    }
                    data-testid={`button-plan-${plan.id}`}
                  >
                    {createCheckoutMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : (
                      "Upgrade"
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Can I upgrade or downgrade my plan?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately,
                and billing is prorated.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards (Visa, Mastercard, American Express) through our secure
                payment processor, Stripe.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I cancel my subscription?</h3>
              <p className="text-sm text-muted-foreground">
                Absolutely. You can cancel your subscription at any time. You'll continue to have access
                until the end of your billing period, then you'll be downgraded to the free plan.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-sm text-muted-foreground">
                We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact
                us for a full refund.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
