import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { UserPlus, Sparkles } from "lucide-react";
import { guestStorage } from "@/lib/guestStorage";
import { useState } from "react";

export function GuestBanner() {
  const [dismissed, setDismissed] = useState(false);
  const subscriptionCount = guestStorage.getSubscriptionCount();

  if (dismissed) return null;

  return (
    <Alert className="border-primary/50 bg-primary/5" data-testid="alert-guest-banner">
      <Sparkles className="h-4 w-4 text-primary" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium text-sm">
            You're using PocketTrack as a guest
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {subscriptionCount > 0 ? (
              <>
                You have {subscriptionCount} subscription{subscriptionCount !== 1 ? "s" : ""} saved locally. 
                Create an account to sync across devices, unlock premium features, and never lose your data.
              </>
            ) : (
              <>
                Create a free account to sync your subscriptions across devices, 
                access Plaid bank integration, and unlock premium features.
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setDismissed(true)}
            data-testid="button-dismiss-banner"
          >
            Dismiss
          </Button>
          <Button 
            size="sm"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-sign-up"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Sign Up Free
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
