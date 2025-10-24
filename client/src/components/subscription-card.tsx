import { useState } from "react";
import { Pencil, Trash2, Calendar, Ban, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Subscription } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SubscriptionHistoryDialog } from "./subscription-history-dialog";

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
}

export function SubscriptionCard({ subscription, onEdit }: SubscriptionCardProps) {
  const { toast } = useToast();
  const [cancelReason, setCancelReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/subscriptions/${subscription.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: "Subscription deleted",
        description: `${subscription.name} has been removed from your subscriptions.`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete subscription. Please try again.",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason?: string) => {
      await apiRequest("POST", `/api/subscriptions/${subscription.id}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: "Subscription cancelled",
        description: `${subscription.name} has been cancelled.`,
      });
      setCancelReason("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
      });
    },
  });

  const renewalDate = new Date(subscription.nextRenewalDate);
  const daysUntilRenewal = Math.ceil(
    (renewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const isRenewalSoon = daysUntilRenewal <= 7 && daysUntilRenewal >= 0;

  // Generate initials for avatar
  const initials = subscription.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="hover-elevate transition-all" data-testid={`card-subscription-${subscription.id}`}>
      <CardContent className="p-6">
        <div className="flex gap-4 items-start">
          {/* Icon/Avatar */}
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary">{initials}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h4 className="text-lg font-medium mb-1" data-testid={`text-subscription-name-${subscription.id}`}>
                  {subscription.name}
                </h4>
                <Badge variant="secondary" className="rounded-full">
                  {subscription.category}
                </Badge>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xl font-semibold" data-testid={`text-subscription-cost-${subscription.id}`}>
                  ${parseFloat(subscription.cost).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {subscription.billingCycle}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Renews {renewalDate.toLocaleDateString()}</span>
              </div>
              {isRenewalSoon && (
                <Badge variant="destructive" className="text-xs">
                  Renewing in {daysUntilRenewal} {daysUntilRenewal === 1 ? "day" : "days"}
                </Badge>
              )}
            </div>

            {subscription.notes && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {subscription.notes}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(subscription)}
                data-testid={`button-edit-${subscription.id}`}
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(true)}
                data-testid={`button-history-${subscription.id}`}
              >
                <History className="w-3.5 h-3.5 mr-1.5" />
                History
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`button-cancel-${subscription.id}`}
                  >
                    <Ban className="w-3.5 h-3.5 mr-1.5" />
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel "{subscription.name}"? You can optionally provide a reason below.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Label htmlFor="cancel-reason" className="text-sm font-medium mb-2 block">
                      Reason (optional)
                    </Label>
                    <Input
                      id="cancel-reason"
                      placeholder="e.g., Too expensive, Not using it anymore"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      data-testid="input-cancel-reason"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-cancel">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => cancelMutation.mutate(cancelReason || undefined)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-cancel"
                    >
                      Cancel Subscription
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`button-delete-${subscription.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to permanently delete "{subscription.name}"? This action cannot be undone and will remove all history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-delete"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardContent>

      <SubscriptionHistoryDialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        subscriptionId={subscription.id}
        subscriptionName={subscription.name}
      />
    </Card>
  );
}
