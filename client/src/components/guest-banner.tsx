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
      <Sparkles className="h-5 w-5 md:h-4 md:w-4 text-primary" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <p className="font-medium text-base md:text-sm">
            You're using PocketTrack as a guest
          </p>
          <p className="text-sm md:text-sm text-muted-foreground mt-1.5 md:mt-1">
            {subscriptionCount > 0 ? (
              <>
                {subscriptionCount} subscription{subscriptionCount !== 1 ? "s" : ""} saved locally. 
                Sign up to sync across devices and unlock premium features.
              </>
            ) : (
              <>
                Create a free account to sync subscriptions, access Plaid, and unlock features.
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto sm:flex-shrink-0">
          <Button 
            size="default"
            className="flex-1 sm:flex-none min-h-11 md:min-h-9"
            variant="outline"
            onClick={() => setDismissed(true)}
            data-testid="button-dismiss-banner"
          >
            Dismiss
          </Button>
          <Button 
            size="default"
            className="flex-1 sm:flex-none min-h-11 md:min-h-9"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-sign-up"
          >
            <UserPlus className="w-5 h-5 md:w-4 md:h-4 mr-2" />
            Sign Up Free
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
