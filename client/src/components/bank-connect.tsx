import { useState, useCallback, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, RefreshCw, Unplug, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type BankConnection } from "@shared/schema";
// CAP: Import Capacitor utilities for native browser handling
import { isCapacitor, openInSystemBrowser, getReturnUrl, handlePlaidReturn } from "@/lib/capacitorUtils";

export function BankConnect() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: connections = [], isLoading } = useQuery<BankConnection[]>({
    queryKey: ["/api/bank-connections"],
  });

  // Create link token mutation
  const createLinkTokenMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/plaid/create-link-token");
      return response.json();
    },
    onSuccess: (data) => {
      setLinkToken(data.link_token);
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Unable to initialize bank connection",
        variant: "destructive",
      });
    },
  });

  // Exchange public token mutation
  const exchangeTokenMutation = useMutation({
    mutationFn: async (data: { public_token: string; institution_id: string; institution_name: string; accounts: Array<{ id: string; name: string }> }) => {
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
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Unable to connect bank account",
        variant: "destructive",
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
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Unable to sync transactions",
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
    onError: () => {
      toast({
        title: "Disconnect Failed",
        description: "Unable to disconnect bank account",
        variant: "destructive",
      });
    },
  });

  const onSuccess = useCallback((publicToken: string, metadata: any) => {
    exchangeTokenMutation.mutate({
      public_token: publicToken,
      institution_id: metadata.institution?.institution_id || "",
      institution_name: metadata.institution?.name || "Unknown Bank",
      accounts: metadata.accounts || [],
    });
  }, [exchangeTokenMutation]);

  const config = {
    token: linkToken,
    onSuccess,
  };

  const { open, ready } = usePlaidLink(config);

  // CAP: Set up Plaid return handler for Capacitor
  useEffect(() => {
    if (isCapacitor()) {
      handlePlaidReturn(() => {
        // CAP: When returning from Plaid in Capacitor, refresh connections
        queryClient.invalidateQueries({ queryKey: ["/api/bank-connections"] });
        queryClient.invalidateQueries({ queryKey: ["/api/detected-subscriptions"] });
        toast({
          title: "Bank Connected",
          description: "Successfully connected your bank account",
        });
      });
    }
  }, [toast]);

  const handleConnect = () => {
    // CAP: In Capacitor, open Plaid Link in system browser
    if (isCapacitor()) {
      if (!linkToken) {
        createLinkTokenMutation.mutate();
        return;
      }
      
      // CAP: Construct Plaid Link URL with return URL
      const returnUrl = getReturnUrl('plaid');
      const plaidUrl = `https://cdn.plaid.com/link/v2/stable/link.html?token=${linkToken}&redirect_uri=${encodeURIComponent(returnUrl)}`;
      
      openInSystemBrowser(plaidUrl);
    } else {
      // CAP: Web environment - use normal Plaid Link SDK
      if (linkToken && ready) {
        open();
      } else {
        createLinkTokenMutation.mutate();
      }
    }
  };

  // CAP: Auto-open Plaid Link when token is ready (web only)
  if (!isCapacitor() && linkToken && ready && !createLinkTokenMutation.isPending) {
    open();
  }

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
          {createLinkTokenMutation.isPending ? "Connecting..." : "Connect Bank"}
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
