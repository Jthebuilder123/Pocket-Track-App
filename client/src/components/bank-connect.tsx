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
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check authentication status
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isGuest = !isAuthenticated;

  const { data: connections = [], isLoading } = useQuery<BankConnection[]>({
    queryKey: ["/api/bank-connections"],
    enabled: !isGuest, // Only fetch if authenticated
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

  // Authenticated user UI - Bank connection handled by vanilla JS in index.html
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
          data-testid="button-connect-bank"
          data-action="connect-bank"
        >
          <Building2 className="w-4 h-4 mr-2" />
          <span>Connect Bank</span>
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
