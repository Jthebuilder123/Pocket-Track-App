import { type Subscription, type InsertSubscription, subscriptions } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Subscription operations
  getAllSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: InsertSubscription): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;
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
    return subscription;
  }

  async updateSubscription(id: string, insertSubscription: InsertSubscription): Promise<Subscription | undefined> {
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
    return subscription || undefined;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    const result = await db.delete(subscriptions).where(eq(subscriptions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();
