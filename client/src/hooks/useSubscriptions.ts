import { useQuery, useMutation, type UseMutationResult } from "@tanstack/react-query";
import { apiRequest, queryClient, ApiError } from "@/lib/queryClient";
import { guestStorage, type GuestSubscription } from "@/lib/guestStorage";
import type { Subscription, InsertSubscriptionClient } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

type SubscriptionData = Subscription | GuestSubscription;

export function useSubscriptions() {
  const { user, isLoading: authLoading } = useAuth();
  const isGuest = !user && !authLoading;

  // Fetch subscriptions - either from API or localStorage
  const { data: subscriptions = [], isLoading, refetch } = useQuery<SubscriptionData[]>({
    queryKey: isGuest ? ["guest-subscriptions"] : ["/api/subscriptions"],
    queryFn: async () => {
      if (isGuest) {
        return guestStorage.getAllSubscriptions();
      }
      // Use default queryFn for authenticated users
      const res = await fetch("/api/subscriptions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      return res.json();
    },
    enabled: !authLoading, // Only run when auth state is determined
  });

  return {
    subscriptions,
    isLoading: authLoading || isLoading,
    isGuest,
    refetch,
  };
}

export function useCreateSubscription(): UseMutationResult<SubscriptionData, Error, InsertSubscriptionClient> {
  const { user, isLoading: authLoading } = useAuth();
  const isGuest = !user && !authLoading;

  return useMutation({
    mutationFn: async (data: InsertSubscriptionClient) => {
      if (isGuest) {
        return guestStorage.createSubscription(data);
      }
      const response = await apiRequest("POST", "/api/subscriptions", data);
      return response.json();
    },
    onSuccess: () => {
      if (isGuest) {
        queryClient.invalidateQueries({ queryKey: ["guest-subscriptions"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      }
    },
  });
}

export function useUpdateSubscription(): UseMutationResult<
  SubscriptionData,
  Error,
  { id: string; data: InsertSubscriptionClient }
> {
  const { user, isLoading: authLoading } = useAuth();
  const isGuest = !user && !authLoading;

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertSubscriptionClient }) => {
      if (isGuest) {
        const updated = guestStorage.updateSubscription(id, data);
        if (!updated) throw new Error("Subscription not found");
        return updated;
      }
      const response = await apiRequest("PUT", `/api/subscriptions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      if (isGuest) {
        queryClient.invalidateQueries({ queryKey: ["guest-subscriptions"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      }
    },
  });
}

export function useDeleteSubscription(): UseMutationResult<void, Error, string> {
  const { user, isLoading: authLoading } = useAuth();
  const isGuest = !user && !authLoading;

  return useMutation({
    mutationFn: async (id: string) => {
      // If clearly a guest, use localStorage
      if (isGuest) {
        const success = guestStorage.deleteSubscription(id);
        if (!success) throw new Error("Subscription not found");
        return;
      }
      
      // Try API delete, but fall back to localStorage if 401 (auth race condition)
      try {
        await apiRequest("DELETE", `/api/subscriptions/${id}`);
      } catch (error: any) {
        if (error instanceof ApiError && error.status === 401) {
          // User might be a guest (auth query race condition)
          const success = guestStorage.deleteSubscription(id);
          if (!success) throw new Error("Subscription not found");
          return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate both to be safe
      queryClient.invalidateQueries({ queryKey: ["guest-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
    },
  });
}

export function useCancelSubscription(): UseMutationResult<SubscriptionData, Error, { id: string; reason?: string }> {
  const { user, isLoading: authLoading } = useAuth();
  const isGuest = !user && !authLoading;

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (isGuest) {
        const cancelled = guestStorage.cancelSubscription(id, reason);
        if (!cancelled) throw new Error("Subscription not found");
        return cancelled;
      }
      const response = await apiRequest("POST", `/api/subscriptions/${id}/cancel`, { reason });
      return response.json();
    },
    onSuccess: () => {
      if (isGuest) {
        queryClient.invalidateQueries({ queryKey: ["guest-subscriptions"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      }
    },
  });
}
