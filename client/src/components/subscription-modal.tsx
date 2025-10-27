import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, ChevronDown, ChevronRight } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useCreateSubscription, useUpdateSubscription } from "@/hooks/useSubscriptions";
import {
  type Subscription,
  type SubscriptionTemplate,
  type InsertSubscriptionClient,
  insertSubscriptionSchemaClient,
  SUBSCRIPTION_CATEGORIES,
  BILLING_CYCLES,
} from "@shared/schema";

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  subscription?: Subscription;
  template?: SubscriptionTemplate;
}

export function SubscriptionModal({ open, onClose, subscription, template }: SubscriptionModalProps) {
  const { toast } = useToast();
  const isEditing = !!subscription;
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();
  const [showCancellationHelp, setShowCancellationHelp] = useState(false);

  const form = useForm<InsertSubscriptionClient>({
    resolver: zodResolver(insertSubscriptionSchemaClient),
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
        cancellationUrl: subscription.cancellationUrl || "",
        supportEmail: subscription.supportEmail || "",
        supportPhone: subscription.supportPhone || "",
        cancellationSteps: subscription.cancellationSteps || "",
      });
      // Show cancellation help section if any cancellation data exists
      setShowCancellationHelp(!!(subscription.cancellationUrl || subscription.supportEmail || subscription.supportPhone || subscription.cancellationSteps));
    } else if (template) {
      // Pre-fill form with template data
      form.reset({
        name: template.name,
        cost: template.suggestedPrice,
        billingCycle: template.billingCycle as "Monthly" | "Quarterly" | "Yearly",
        category: template.category,
        nextRenewalDate: new Date(),
        notes: template.description || "",
        cancellationUrl: "",
        supportEmail: "",
        supportPhone: "",
        cancellationSteps: "",
      });
      setShowCancellationHelp(false);
    } else {
      form.reset({
        name: "",
        cost: "",
        billingCycle: "Monthly",
        category: "Other",
        nextRenewalDate: new Date(),
        notes: "",
        cancellationUrl: "",
        supportEmail: "",
        supportPhone: "",
        cancellationSteps: "",
      });
      setShowCancellationHelp(false);
    }
  }, [subscription, template, open]);

  const onSubmit = async (data: InsertSubscriptionClient) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: subscription.id,
          data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      
      toast({
        title: isEditing ? "Subscription updated" : "Subscription added",
        description: isEditing
          ? "Your subscription has been updated successfully."
          : "Your subscription has been added successfully.",
      });
      onClose();
      form.reset();
    } catch (error: any) {
      // Better error handling with specific messages
      let errorMessage = "Failed to save subscription. Please try again.";
      
      if (error?.message?.includes("Authentication") || error?.message?.includes("401")) {
        errorMessage = "You must be logged in to add subscriptions. Please log in first.";
      } else if (error?.message?.includes("limit reached") || error?.message?.includes("403")) {
        errorMessage = "Subscription limit reached for your plan. Please upgrade to add more subscriptions.";
      } else if (error?.message?.includes("Access denied")) {
        errorMessage = "You don't have permission to edit this subscription.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg" data-testid="modal-subscription">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Subscription" : template ? `Add ${template.name}` : "Add New Subscription"}
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
                      value={field.value || ""}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cancellation Assistance Section */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowCancellationHelp(!showCancellationHelp)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                data-testid="button-toggle-cancellation"
              >
                {showCancellationHelp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Cancellation Help (Optional)
              </button>

              {showCancellationHelp && (
                <div className="space-y-4 mt-4" data-testid="section-cancellation-help">
                  <p className="text-sm text-muted-foreground">
                    Add cancellation information to make it easier to cancel this subscription later.
                  </p>

                  <FormField
                    control={form.control}
                    name="cancellationUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cancellation URL</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://example.com/cancel"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-cancellation-url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="supportEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Support Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="support@example.com"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-support-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="supportPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Support Phone</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="1-800-555-0100"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-support-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="cancellationSteps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cancellation Steps</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="1. Log in to account&#10;2. Go to settings&#10;3. Click 'Cancel Subscription'..."
                            className="resize-none"
                            rows={4}
                            {...field}
                            value={field.value || ""}
                            data-testid="input-cancellation-steps"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

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
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save"
              >
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : isEditing ? "Update" : "Add Subscription"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
