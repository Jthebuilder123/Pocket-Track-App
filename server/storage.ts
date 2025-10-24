import { type Subscription, type InsertSubscription } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Subscription operations
  getAllSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: InsertSubscription): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private subscriptions: Map<string, Subscription>;

  constructor() {
    this.subscriptions = new Map();
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values());
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = randomUUID();
    const subscription: Subscription = {
      ...insertSubscription,
      id,
      cost: insertSubscription.cost.toString(),
      nextRenewalDate: insertSubscription.nextRenewalDate instanceof Date 
        ? insertSubscription.nextRenewalDate 
        : new Date(insertSubscription.nextRenewalDate),
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async updateSubscription(id: string, insertSubscription: InsertSubscription): Promise<Subscription | undefined> {
    const existing = this.subscriptions.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Subscription = {
      ...insertSubscription,
      id,
      cost: insertSubscription.cost.toString(),
      nextRenewalDate: insertSubscription.nextRenewalDate instanceof Date 
        ? insertSubscription.nextRenewalDate 
        : new Date(insertSubscription.nextRenewalDate),
    };
    this.subscriptions.set(id, updated);
    return updated;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    return this.subscriptions.delete(id);
  }
}

export const storage = new MemStorage();
