import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  type Subscription,
  type InsertSubscription,
  insertSubscriptionSchema,
  SUBSCRIPTION_CATEGORIES,
  BILLING_CYCLES,
} from "@shared/schema";

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  subscription?: Subscription;
}

export function SubscriptionModal({ open, onClose, subscription }: SubscriptionModalProps) {
  const { toast } = useToast();
  const isEditing = !!subscription;

  const form = useForm<InsertSubscription>({
    resolver: zodResolver(insertSubscriptionSchema),
    defaultValues: {
      name: "",
      cost: "",
      billingCycle: "Monthly",
      category: "Other",
      nextRenewalDate: new Date(),
      notes: "",
    },
  });

  useEffect(() => {
    if (subscription) {
      form.reset({
        name: subscription.name,
        cost: subscription.cost,
        billingCycle: subscription.billingCycle as "Monthly" | "Quarterly" | "Yearly",
        category: subscription.category,
        nextRenewalDate: new Date(subscription.nextRenewalDate),
        notes: subscription.notes || "",
      });
    } else {
      form.reset({
        name: "",
        cost: "",
        billingCycle: "Monthly",
        category: "Other",
        nextRenewalDate: new Date(),
        notes: "",
      });
    }
  }, [subscription, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: InsertSubscription) => {
      if (isEditing) {
        await apiRequest("PUT", `/api/subscriptions/${subscription.id}`, data);
      } else {
        await apiRequest("POST", "/api/subscriptions", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: isEditing ? "Subscription updated" : "Subscription added",
        description: isEditing
          ? "Your subscription has been updated successfully."
          : "Your subscription has been added successfully.",
      });
      onClose();
      form.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save subscription. Please try again.",
      });
    },
  });

  const onSubmit = (data: InsertSubscription) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg" data-testid="modal-subscription">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Subscription" : "Add New Subscription"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Netflix, Spotify, Adobe Creative Cloud"
                      {...field}
                      data-testid="input-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="9.99"
                          className="pl-7"
                          {...field}
                          data-testid="input-cost"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingCycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Cycle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-billing-cycle">
                          <SelectValue placeholder="Select cycle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BILLING_CYCLES.map((cycle) => (
                          <SelectItem key={cycle} value={cycle}>
                            {cycle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUBSCRIPTION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextRenewalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Renewal</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : new Date())}
                        data-testid="input-renewal-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this subscription..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                {saveMutation.isPending ? "Saving..." : isEditing ? "Update" : "Add Subscription"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
