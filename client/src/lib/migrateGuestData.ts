import { guestStorage } from "./guestStorage";
import { apiRequest } from "./queryClient";
import type { InsertSubscriptionClient } from "@shared/schema";

export interface MigrationResult {
  success: boolean;
  migrated: number;
  failed: number;
  errors?: string[];
}

export async function migrateGuestSubscriptions(): Promise<MigrationResult> {
  const guestSubscriptions = guestStorage.getAllSubscriptions();
  
  if (guestSubscriptions.length === 0) {
    return { success: true, migrated: 0, failed: 0 };
  }

  const errors: string[] = [];
  let migrated = 0;
  let failed = 0;
  const successfulIds: string[] = [];

  // Migrate each subscription
  for (const sub of guestSubscriptions) {
    try {
      const subscriptionData: InsertSubscriptionClient = {
        name: sub.name,
        cost: sub.cost,
        billingCycle: sub.billingCycle as "Monthly" | "Quarterly" | "Yearly",
        category: sub.category,
        nextRenewalDate: sub.nextRenewalDate,
        notes: sub.notes ?? undefined,
        cancellationUrl: sub.cancellationUrl ?? undefined,
        supportEmail: sub.supportEmail ?? undefined,
        supportPhone: sub.supportPhone ?? undefined,
        cancellationSteps: sub.cancellationSteps ?? undefined,
      };

      await apiRequest("POST", "/api/subscriptions", subscriptionData);
      migrated++;
      successfulIds.push(sub.id);
    } catch (error) {
      failed++;
      errors.push(`Failed to migrate ${sub.name}: ${error}`);
      console.error(`Failed to migrate subscription ${sub.name}:`, error);
    }
  }

  // Only clear successfully migrated subscriptions from guest storage
  // Keep failed ones so user can retry or manually migrate
  for (const id of successfulIds) {
    guestStorage.deleteSubscription(id);
  }

  return {
    success: failed === 0,
    migrated,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export function hasGuestData(): boolean {
  return guestStorage.getSubscriptionCount() > 0;
}
