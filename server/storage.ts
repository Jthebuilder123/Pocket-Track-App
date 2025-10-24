import { type Subscription, type InsertSubscription, type InsertHistory, type SubscriptionHistory, subscriptions, subscriptionHistory } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Subscription operations
  getAllSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: InsertSubscription): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;
  cancelSubscription(id: string, reason?: string): Promise<Subscription | undefined>;
  
  // History operations
  getSubscriptionHistory(subscriptionId: string): Promise<SubscriptionHistory[]>;
  addHistoryEntry(entry: InsertHistory): Promise<SubscriptionHistory>;
}

export class DatabaseStorage implements IStorage {
  async getAllSubscriptions(): Promise<Subscription[]> {
    return await db.select().from(subscriptions);
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription || undefined;
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        ...insertSubscription,
        cost: insertSubscription.cost.toString(),
        nextRenewalDate: insertSubscription.nextRenewalDate instanceof Date 
          ? insertSubscription.nextRenewalDate 
          : new Date(insertSubscription.nextRenewalDate),
        notes: insertSubscription.notes || null,
      })
      .returning();
    
    // Log creation in history
    await this.addHistoryEntry({
      subscriptionId: subscription.id,
      action: "created",
      previousStatus: null,
      newStatus: "active",
      newCost: subscription.cost,
      metadata: JSON.stringify({ name: subscription.name }),
    });
    
    return subscription;
  }

  async updateSubscription(id: string, insertSubscription: InsertSubscription): Promise<Subscription | undefined> {
    const existing = await this.getSubscription(id);
    if (!existing) return undefined;

    const [subscription] = await db
      .update(subscriptions)
      .set({
        ...insertSubscription,
        cost: insertSubscription.cost.toString(),
        nextRenewalDate: insertSubscription.nextRenewalDate instanceof Date 
          ? insertSubscription.nextRenewalDate 
          : new Date(insertSubscription.nextRenewalDate),
        notes: insertSubscription.notes || null,
      })
      .where(eq(subscriptions.id, id))
      .returning();
    
    // Log update in history - track all changes
    if (subscription) {
      const changes: Record<string, any> = {};
      
      if (existing.name !== subscription.name) changes.name = { from: existing.name, to: subscription.name };
      if (existing.cost !== subscription.cost) changes.cost = { from: existing.cost, to: subscription.cost };
      if (existing.billingCycle !== subscription.billingCycle) changes.billingCycle = { from: existing.billingCycle, to: subscription.billingCycle };
      if (existing.category !== subscription.category) changes.category = { from: existing.category, to: subscription.category };
      if (existing.notes !== subscription.notes) changes.notes = { from: existing.notes || "", to: subscription.notes || "" };
      
      // Always log updates, even if only renewal date changed
      await this.addHistoryEntry({
        subscriptionId: id,
        action: "updated",
        previousCost: existing.cost !== subscription.cost ? existing.cost : null,
        newCost: existing.cost !== subscription.cost ? subscription.cost : null,
        metadata: JSON.stringify({ changes }),
      });
    }
    
    return subscription || undefined;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    // First get the subscription to log history
    const subscription = await this.getSubscription(id);
    if (!subscription) return false;

    // Log deletion in history
    await this.addHistoryEntry({
      subscriptionId: id,
      action: "deleted",
      previousStatus: subscription.status,
      newStatus: null,
      metadata: JSON.stringify({ name: subscription.name }),
    });

    const result = await db.delete(subscriptions).where(eq(subscriptions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async cancelSubscription(id: string, reason?: string): Promise<Subscription | undefined> {
    const existing = await this.getSubscription(id);
    if (!existing) return undefined;

    // Update status to cancelled
    const [cancelled] = await db
      .update(subscriptions)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: reason || null,
      })
      .where(eq(subscriptions.id, id))
      .returning();

    // Log cancellation in history
    if (cancelled) {
      await this.addHistoryEntry({
        subscriptionId: id,
        action: "cancelled",
        previousStatus: existing.status,
        newStatus: "cancelled",
        metadata: reason ? JSON.stringify({ reason }) : null,
      });
    }

    return cancelled || undefined;
  }

  async getSubscriptionHistory(subscriptionId: string): Promise<SubscriptionHistory[]> {
    return await db
      .select()
      .from(subscriptionHistory)
      .where(eq(subscriptionHistory.subscriptionId, subscriptionId))
      .orderBy(desc(subscriptionHistory.createdAt));
  }

  async addHistoryEntry(entry: InsertHistory): Promise<SubscriptionHistory> {
    const [historyEntry] = await db
      .insert(subscriptionHistory)
      .values(entry)
      .returning();
    return historyEntry;
  }
}

export const storage = new DatabaseStorage();
