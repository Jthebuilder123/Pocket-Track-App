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
  console.log("[BANK-CONNECT] === BankConnect component rendering ===");
  
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check authentication status
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isGuest = !isAuthenticated;
  
  console.log("[BANK-CONNECT] Component state:", { 
    isAuthenticated, 
    authLoading, 
    isGuest,
    linkToken: !!linkToken 
  });

  const { data: connections = [], isLoading } = useQuery<BankConnection[]>({
    queryKey: ["/api/bank-connections"],
    enabled: !isGuest, // Only fetch if authenticated
  });
  
  console.log("[BANK-CONNECT] Connections query:", { 
    connectionsCount: connections.length, 
    isLoading 
  });

  // Component mount logging
  useEffect(() => {
    console.log("[BANK-CONNECT] *** Component MOUNTED ***");
    return () => {
      console.log("[BANK-CONNECT] *** Component UNMOUNTED ***");
    };
  }, []);

  // Track linkToken changes
  useEffect(() => {
    console.log("[BANK-CONNECT] linkToken changed:", linkToken ? "Token exists" : "No token");
  }, [linkToken]);

  // Create link token mutation
  const createLinkTokenMutation = useMutation({
    mutationFn: async () => {
      console.log("[BANK-CONNECT] API call: Creating Plaid link token...");
      try {
        const response = await apiRequest("POST", "/api/plaid/create-link-token");
        const data = await response.json();
        console.log("[BANK-CONNECT] Link token created successfully");
        return data;
      } catch (error) {
        console.error("[BANK-CONNECT] API error creating link token:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("[BANK-CONNECT] Mutation success: Link token received");
      setLinkToken(data.link_token);
    },
    onError: (error) => {
      console.error("[BANK-CONNECT] Mutation error: Link token creation failed", error);
      const { message, isLimitError } = getErrorMessage(error);
      console.log("[BANK-CONNECT] Parsed error:", { message, isLimitError });
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

  console.log("[BANK-CONNECT] Plaid config created:", { hasToken: !!linkToken });

  let plaidLinkResult;
  try {
    plaidLinkResult = usePlaidLink(config);
    console.log("[BANK-CONNECT] usePlaidLink successful:", { 
      ready: plaidLinkResult.ready,
      hasOpen: !!plaidLinkResult.open 
    });
  } catch (error) {
    console.error("[BANK-CONNECT] ERROR in usePlaidLink:", error);
    throw error;
  }

  const { open, ready } = plaidLinkResult;

  const handleConnect = () => {
    console.log("[BANK-CONNECT] ====== BUTTON CLICKED ======");
    try {
      // Always log button clicks for debugging
      console.log("[BANK-CONNECT] Handler executing...");
      console.log("[BANK-CONNECT] isGuest:", isGuest);
      console.log("[BANK-CONNECT] linkToken exists:", !!linkToken);
      console.log("[BANK-CONNECT] Plaid Link ready:", ready);
      console.log("[BANK-CONNECT] createLinkToken pending:", createLinkTokenMutation.isPending);
      console.log("[BANK-CONNECT] exchangeToken pending:", exchangeTokenMutation.isPending);
      
      if (DEBUG_BANK_CONNECT) {
        console.log("[DEBUG] Full linkToken:", linkToken);
        console.log("[DEBUG] Plaid config:", config);
      }
      
      if (linkToken && ready) {
        console.log("[BANK-CONNECT] Opening Plaid Link modal...");
        open();
      } else {
        console.log("[BANK-CONNECT] Creating link token...");
        createLinkTokenMutation.mutate();
      }
    } catch (error) {
      console.error("[BANK-CONNECT] ERROR in handleConnect:", error);
      toast({
        title: "Connection Error",
        description: "An unexpected error occurred. Please check the console for details.",
        variant: "destructive",
      });
    }
  };

  // Auto-open Plaid Link when token is ready
  if (linkToken && ready && !createLinkTokenMutation.isPending) {
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
  console.log("[BANK-CONNECT] Rendering authenticated UI with Connect Bank button");
  console.log("[BANK-CONNECT] Button will be disabled:", createLinkTokenMutation.isPending || exchangeTokenMutation.isPending);
  
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
          onClick={() => {
            console.log("[BANK-CONNECT] >>>>>> onClick wrapper fired <<<<<<");
            handleConnect();
          }}
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
