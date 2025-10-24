import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown, Plus, X, Ban } from "lucide-react";
import { type SubscriptionHistory } from "@shared/schema";

interface SubscriptionHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  subscriptionId: string;
  subscriptionName: string;
}

export function SubscriptionHistoryDialog({
  open,
  onClose,
  subscriptionId,
  subscriptionName,
}: SubscriptionHistoryDialogProps) {
  const { data: history = [], isLoading } = useQuery<SubscriptionHistory[]>({
    queryKey: ["/api/subscriptions", subscriptionId, "history"],
    enabled: open,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <Plus className="w-4 h-4" />;
      case "updated":
        return <TrendingUp className="w-4 h-4" />;
      case "cancelled":
        return <Ban className="w-4 h-4" />;
      case "deleted":
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "created":
        return "default";
      case "updated":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "deleted":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl" data-testid="dialog-history">
        <DialogHeader>
          <DialogTitle>History: {subscriptionName}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/30 animate-pulse">
                  <div className="w-8 h-8 rounded bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => {
                let metadata;
                try {
                  metadata = entry.metadata ? JSON.parse(entry.metadata) : {};
                } catch {
                  metadata = {};
                }

                return (
                  <div
                    key={entry.id}
                    className="flex gap-3 p-3 rounded-lg border"
                    data-testid={`history-entry-${entry.id}`}
                  >
                    <div className="flex-shrink-0">
                      <Badge variant={getActionColor(entry.action) as any}>
                        {getActionIcon(entry.action)}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium capitalize">{entry.action}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleDateString()}{" "}
                          {new Date(entry.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.action === "created" && (
                          <p>Subscription created with cost ${entry.newCost}</p>
                        )}
                        {entry.action === "updated" && (
                          <div>
                            {entry.previousCost && entry.newCost && entry.previousCost !== entry.newCost && (
                              <p>
                                Cost changed from ${entry.previousCost} to ${entry.newCost}
                                {parseFloat(entry.newCost) > parseFloat(entry.previousCost) ? (
                                  <TrendingUp className="inline w-3 h-3 ml-1 text-destructive" />
                                ) : (
                                  <TrendingDown className="inline w-3 h-3 ml-1 text-green-600" />
                                )}
                              </p>
                            )}
                            {metadata.changes && (
                              <div className="text-xs mt-1 space-y-1">
                                {metadata.changes.name && (
                                  <p>Name: "{metadata.changes.name.from}" → "{metadata.changes.name.to}"</p>
                                )}
                                {metadata.changes.billingCycle && (
                                  <p>Billing: {metadata.changes.billingCycle.from} → {metadata.changes.billingCycle.to}</p>
                                )}
                                {metadata.changes.category && (
                                  <p>Category: {metadata.changes.category.from} → {metadata.changes.category.to}</p>
                                )}
                                {metadata.changes.notes && (
                                  <p>Notes updated</p>
                                )}
                              </div>
                            )}
                            {!entry.previousCost && !metadata.changes && (
                              <p>Subscription details updated</p>
                            )}
                          </div>
                        )}
                        {entry.action === "cancelled" && (
                          <p>
                            Subscription cancelled
                            {metadata.reason && ` - ${metadata.reason}`}
                          </p>
                        )}
                        {entry.action === "deleted" && (
                          <p>Subscription permanently deleted</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
