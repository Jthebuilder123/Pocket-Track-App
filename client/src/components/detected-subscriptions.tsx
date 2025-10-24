import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle2, X, Edit, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubscriptionModal } from "@/components/subscription-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type DetectedSubscription, type Subscription } from "@shared/schema";

export function DetectedSubscriptions() {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [editingDetected, setEditingDetected] = useState<DetectedSubscription | undefined>();
  const { toast } = useToast();

  const { data: detected = [], isLoading } = useQuery<DetectedSubscription[]>({
    queryKey: ["/api/detected-subscriptions"],
  });

  // Confirm and add to subscriptions
  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/detected-subscriptions/${id}/confirm`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/detected-subscriptions"] });
      setConfirmingId(null);
      toast({
        title: "Subscription Added",
        description: "Detected subscription has been added to your list",
      });
    },
    onError: () => {
      setConfirmingId(null);
      toast({
        title: "Failed to Add",
        description: "Unable to add subscription",
        variant: "destructive",
      });
    },
  });

  // Dismiss detected subscription
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/detected-subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/detected-subscriptions"] });
      toast({
        title: "Dismissed",
        description: "Detected subscription has been dismissed",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Dismiss",
        description: "Unable to dismiss subscription",
        variant: "destructive",
      });
    },
  });

  const handleConfirm = (id: string) => {
    setConfirmingId(id);
    confirmMutation.mutate(id);
  };

  const handleEdit = (detectedSub: DetectedSubscription) => {
    setEditingDetected(detectedSub);
  };

  const handleCloseModal = () => {
    setEditingDetected(undefined);
  };

  // Convert detected subscription to Subscription format for editing
  const getEditingSubscription = (): Subscription | undefined => {
    if (!editingDetected) return undefined;
    
    const nextRenewal = new Date();
    if (editingDetected.detectedBillingCycle === "Monthly") {
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);
    } else if (editingDetected.detectedBillingCycle === "Quarterly") {
      nextRenewal.setMonth(nextRenewal.getMonth() + 3);
    } else {
      nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
    }

    return {
      id: editingDetected.id,
      name: editingDetected.merchantName,
      cost: editingDetected.estimatedCost,
      billingCycle: editingDetected.detectedBillingCycle,
      category: editingDetected.category,
      nextRenewalDate: nextRenewal,
      notes: null,
      status: "active",
      cancelledAt: null,
      cancellationReason: null,
      createdAt: new Date(),
    } as Subscription;
  };

  const getConfidenceColor = (confidence: string) => {
    const conf = parseInt(confidence);
    if (conf >= 85) return "text-green-600 dark:text-green-400";
    if (conf >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const getConfidenceVariant = (confidence: string) => {
    const conf = parseInt(confidence);
    if (conf >= 85) return "default";
    if (conf >= 70) return "secondary";
    return "outline";
  };

  if (isLoading) {
    return <div>Loading detected subscriptions...</div>;
  }

  if (detected.length === 0) {
    return (
      <Alert data-testid="alert-no-detected">
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          No recurring subscriptions detected yet. Connect a bank account and sync transactions to get started.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-semibold" data-testid="text-detected-title">
            Detected Subscriptions
          </h2>
          <Badge variant="secondary" data-testid="badge-detected-count">
            {detected.length}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          We found these recurring charges in your bank transactions. Review and confirm to add them to your subscriptions.
        </p>

        <div className="grid gap-4">
          {detected.map((sub) => (
            <Card key={sub.id} data-testid={`card-detected-${sub.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle data-testid={`text-name-${sub.id}`}>
                        {sub.merchantName}
                      </CardTitle>
                      <Badge variant={getConfidenceVariant(sub.confidence)} data-testid={`badge-confidence-${sub.id}`}>
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {sub.confidence}% confidence
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span data-testid={`text-cost-${sub.id}`}>
                          ${sub.estimatedCost} / {sub.detectedBillingCycle}
                        </span>
                        <Badge variant="outline" data-testid={`badge-category-${sub.id}`}>
                          {sub.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {sub.transactionIds.length} transactions found
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleConfirm(sub.id)}
                    disabled={confirmMutation.isPending && confirmingId === sub.id}
                    data-testid={`button-confirm-${sub.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {confirmMutation.isPending && confirmingId === sub.id ? "Adding..." : "Confirm & Add"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleEdit(sub)}
                    data-testid={`button-edit-${sub.id}`}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Before Adding
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => dismissMutation.mutate(sub.id)}
                    disabled={dismissMutation.isPending}
                    data-testid={`button-dismiss-${sub.id}`}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {editingDetected && (
        <SubscriptionModal
          open={true}
          onClose={handleCloseModal}
          subscription={getEditingSubscription()}
        />
      )}
    </>
  );
}
