import { useState, useCallback, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, RefreshCw, Unplug, AlertCircle, LogIn, Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, ApiError } from "@/lib/queryClient";
import { type BankConnection } from "@shared/schema";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
// CAP: Import Capacitor utilities for native browser handling
import { isCapacitor, openInSystemBrowser, getReturnUrl, handlePlaidReturn } from "@/lib/capacitorUtils";

// Debug logging flag - set to false to disable verbose console logs in production
const DEBUG_BANK_CONNECT = import.meta.env.DEV;

// Helper to parse API error responses from apiRequest
function getErrorMessage(error: any): { message: string; isLimitError: boolean } {
  // Handle ApiError instances (new error format)
  if (error instanceof ApiError) {
    try {
      // Try to parse the error message as JSON
      const errorData = JSON.parse(error.message);
      const isLimitError = 
        errorData.error === "Bank connection limit reached" ||
        errorData.error === "Subscription limit reached" ||
        errorData.error === "Upgrade required";
      
      return {
        message: errorData.message || errorData.error || "An error occurred",
        isLimitError
      };
    } catch {
      // If JSON parsing fails, return the raw message
      return {
        message: error.message || "An unexpected error occurred",
        isLimitError: false
      };
    }
  }
  
  // Legacy error format (fallback for non-ApiError errors)
  try {
    const errorMessage = error?.message || "";
    
    // Try to extract JSON from error message (old format: "statusCode: jsonBody")
    const jsonMatch = errorMessage.match(/\d+:\s*(\{.+\})/);
    if (jsonMatch) {
      const errorData = JSON.parse(jsonMatch[1]);
      const isLimitError = 
        errorData.error === "Bank connection limit reached" ||
        errorData.error === "Subscription limit reached" ||
        errorData.error === "Upgrade required";
      
      return {
        message: errorData.message || errorData.error || "An error occurred",
        isLimitError
      };
    }
  } catch {
    // If parsing fails, continue to fallback
  }
  
  // Final fallback
  const rawMessage = error?.message || "An unexpected error occurred";
  return { 
    message: rawMessage.replace(/^\d+:\s*/, ""), // Remove status code prefix if present
    isLimitError: false 
  };
}

export function BankConnect() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check authentication status
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isGuest = !isAuthenticated;
  
  if (DEBUG_BANK_CONNECT) {
    console.log("[DEBUG] Auth status:", { isAuthenticated, authLoading, isGuest });
  }

  const { data: connections = [], isLoading } = useQuery<BankConnection[]>({
    queryKey: ["/api/bank-connections"],
    enabled: !isGuest, // Only fetch if authenticated
  });

  // Create link token mutation
  const createLinkTokenMutation = useMutation({
    mutationFn: async () => {
      if (DEBUG_BANK_CONNECT) console.log("[DEBUG] Creating link token via API...");
      const response = await apiRequest("POST", "/api/plaid/create-link-token");
      const data = await response.json();
      if (DEBUG_BANK_CONNECT) console.log("[DEBUG] Link token created successfully");
      return data;
    },
    onSuccess: (data) => {
      if (DEBUG_BANK_CONNECT) console.log("[DEBUG] onSuccess: Link token received, setting state");
      setLinkToken(data.link_token);
    },
    onError: (error) => {
      if (DEBUG_BANK_CONNECT) console.error("[DEBUG] onError: Link token creation failed", error);
      const { message, isLimitError } = getErrorMessage(error);
      if (DEBUG_BANK_CONNECT) console.log("[DEBUG] Parsed error:", { message, isLimitError });
      toast({
        title: isLimitError ? "Plan Limit Reached" : "Connection Failed",
        description: message,
        variant: "destructive",
        action: isLimitError ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation("/pricing")}
            data-testid="button-upgrade-toast"
          >
            <Crown className="w-4 h-4 mr-1" />
            Upgrade
          </Button>
        ) : undefined,
      });
    },
  });

  // Exchange public token mutation
  // CAP: Make institution/account fields optional for Capacitor OAuth flow
  const exchangeTokenMutation = useMutation({
    mutationFn: async (data: { 
      public_token: string; 
      institution_id?: string; 
      institution_name?: string; 
      accounts?: Array<{ id: string; name: string }> 
    }) => {
      const response = await apiRequest("POST", "/api/plaid/exchange-token", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/detected-subscriptions"] });
      setLinkToken(null);
      toast({
        title: "Bank Connected",
        description: "Successfully connected your bank account",
      });
    },
    onError: (error) => {
      const { message, isLimitError } = getErrorMessage(error);
      toast({
        title: isLimitError ? "Plan Limit Reached" : "Connection Failed",
        description: message,
        variant: "destructive",
        action: isLimitError ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation("/pricing")}
            data-testid="button-upgrade-toast"
          >
            <Crown className="w-4 h-4 mr-1" />
            Upgrade
          </Button>
        ) : undefined,
      });
    },
  });

  // Sync transactions mutation
  const syncTransactionsMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await apiRequest("POST", `/api/bank-connections/${connectionId}/sync`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/detected-subscriptions"] });
      toast({
        title: "Sync Complete",
        description: "Bank transactions synced successfully",
      });
    },
    onError: (error) => {
      const { message } = getErrorMessage(error);
      toast({
        title: "Sync Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      await apiRequest("DELETE", `/api/bank-connections/${connectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-connections"] });
      toast({
        title: "Bank Disconnected",
        description: "Bank account has been disconnected",
      });
    },
    onError: (error) => {
      const { message } = getErrorMessage(error);
      toast({
        title: "Disconnect Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const onSuccess = useCallback((publicToken: string, metadata: any) => {
    // CAP: Only include institution/account metadata if available from Plaid
    // CAP: If missing, backend will fetch from Plaid API
    const payload: {
      public_token: string;
      institution_id?: string;
      institution_name?: string;
      accounts?: Array<{ id: string; name: string }>;
    } = {
      public_token: publicToken,
    };

    // Add metadata only if available
    if (metadata?.institution?.institution_id) {
      payload.institution_id = metadata.institution.institution_id;
    }
    if (metadata?.institution?.name) {
      payload.institution_name = metadata.institution.name;
    }
    if (metadata?.accounts && metadata.accounts.length > 0) {
      payload.accounts = metadata.accounts;
    }

    exchangeTokenMutation.mutate(payload);
  }, [exchangeTokenMutation]);

  const config = {
    token: linkToken,
    onSuccess,
  };

  const { open, ready } = usePlaidLink(config);

  // CAP: Set up Plaid return handler for Capacitor
  useEffect(() => {
    if (isCapacitor()) {
      handlePlaidReturn((publicToken) => {
        // CAP: When returning from Plaid in Capacitor, exchange the token
        // CAP: Backend will fetch institution/account details from Plaid API
        if (publicToken) {
          if (DEBUG_BANK_CONNECT) console.log('CAP: Plaid OAuth successful, exchanging public_token...');
          exchangeTokenMutation.mutate({
            public_token: publicToken,
            // CAP: Don't pass institution/account details - backend will fetch them
          });
        } else {
          if (DEBUG_BANK_CONNECT) console.log('CAP: Plaid OAuth canceled or failed');
        }
      });
    }
  }, [exchangeTokenMutation]);

  const handleConnect = () => {
    try {
      if (DEBUG_BANK_CONNECT) {
        console.log("[DEBUG] Connect Bank button clicked");
        console.log("[DEBUG] isGuest:", isGuest);
        console.log("[DEBUG] linkToken:", linkToken ? "exists" : "null");
        console.log("[DEBUG] ready:", ready);
        console.log("[DEBUG] isPending:", createLinkTokenMutation.isPending);
      }
      
      // CAP: In Capacitor, open Plaid Link in system browser
      if (isCapacitor()) {
        if (DEBUG_BANK_CONNECT) console.log("[DEBUG] Running in Capacitor mode");
        if (!linkToken) {
          if (DEBUG_BANK_CONNECT) console.log("[DEBUG] No link token, creating one...");
          createLinkTokenMutation.mutate();
          return;
        }
        
        // CAP: Construct Plaid Link URL with return URL
        const returnUrl = getReturnUrl('plaid');
        const plaidUrl = `https://cdn.plaid.com/link/v2/stable/link.html?token=${linkToken}&redirect_uri=${encodeURIComponent(returnUrl)}`;
        
        if (DEBUG_BANK_CONNECT) console.log("[DEBUG] Opening Plaid in system browser");
        openInSystemBrowser(plaidUrl);
      } else {
        // CAP: Web environment - use normal Plaid Link SDK
        if (DEBUG_BANK_CONNECT) console.log("[DEBUG] Running in web mode");
        if (linkToken && ready) {
          if (DEBUG_BANK_CONNECT) console.log("[DEBUG] Link token ready, opening Plaid Link modal");
          open();
        } else {
          if (DEBUG_BANK_CONNECT) console.log("[DEBUG] Creating link token, ready status:", ready);
          createLinkTokenMutation.mutate();
        }
      }
    } catch (error) {
      if (DEBUG_BANK_CONNECT) console.error("[DEBUG] Error in handleConnect:", error);
      toast({
        title: "Connection Error",
        description: "An unexpected error occurred. Please check the console for details.",
        variant: "destructive",
      });
    }
  };

  // CAP: Auto-open Plaid Link when token is ready (web only)
  if (!isCapacitor() && linkToken && ready && !createLinkTokenMutation.isPending) {
    open();
  }

  // Show guest mode UI if not authenticated
  if (isGuest) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold" data-testid="text-bank-title">Bank Connections</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically detect subscriptions from your bank transactions
          </p>
        </div>

        <Card data-testid="card-guest-bank-prompt">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">Sign In Required</CardTitle>
                <CardDescription className="mt-2">
                  Bank connections require a secure account to protect your financial data. 
                  When you sign in, you'll be able to:
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Connect your bank account securely via Plaid</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Automatically detect recurring subscriptions from transactions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Keep your financial data encrypted and private</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Sync transactions to stay up-to-date</span>
              </li>
            </ul>
            <div className="pt-2">
              <Button 
                onClick={() => setLocation("/login")}
                className="w-full sm:w-auto"
                data-testid="button-signin-for-bank"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In to Connect Bank
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated user UI
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold" data-testid="text-bank-title">Connected Banks</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your bank to automatically detect subscriptions
          </p>
        </div>
        <Button
          onClick={handleConnect}
          disabled={createLinkTokenMutation.isPending || exchangeTokenMutation.isPending}
          data-testid="button-connect-bank"
        >
          <Building2 className="w-4 h-4 mr-2" />
          {createLinkTokenMutation.isPending 
            ? "Connecting..." 
            : exchangeTokenMutation.isPending 
            ? "Processing..."
            : "Connect Bank"}
        </Button>
      </div>

      {connections.length === 0 && !isLoading && (
        <Alert data-testid="alert-no-banks">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No banks connected yet. Connect your bank account to automatically detect recurring subscriptions.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {connections.map((connection) => (
          <Card key={connection.id} data-testid={`card-bank-${connection.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    {connection.institutionName}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Last synced: {connection.lastSyncedAt 
                      ? new Date(connection.lastSyncedAt).toLocaleString()
                      : "Never"}
                  </CardDescription>
                </div>
                <Badge variant="outline" data-testid={`badge-status-${connection.id}`}>
                  Connected
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncTransactionsMutation.mutate(connection.id)}
                  disabled={syncTransactionsMutation.isPending}
                  data-testid={`button-sync-${connection.id}`}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncTransactionsMutation.isPending ? "animate-spin" : ""}`} />
                  {syncTransactionsMutation.isPending ? "Syncing..." : "Sync Transactions"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectMutation.mutate(connection.id)}
                  disabled={disconnectMutation.isPending}
                  data-testid={`button-disconnect-${connection.id}`}
                >
                  <Unplug className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
