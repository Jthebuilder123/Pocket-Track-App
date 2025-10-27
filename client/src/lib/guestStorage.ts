import type { Subscription, InsertSubscriptionClient } from "@shared/schema";
import { nanoid } from "nanoid";

const STORAGE_KEY = "pockettrack_guest_subscriptions";

export interface GuestSubscription extends Omit<Subscription, "userId"> {
  id: string;
}

class GuestStorageService {
  private getSubscriptions(): GuestSubscription[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load guest subscriptions:", error);
      return [];
    }
  }

  private saveSubscriptions(subscriptions: GuestSubscription[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    } catch (error) {
      console.error("Failed to save guest subscriptions:", error);
    }
  }

  getAllSubscriptions(): GuestSubscription[] {
    return this.getSubscriptions();
  }

  getSubscriptionById(id: string): GuestSubscription | undefined {
    return this.getSubscriptions().find((sub) => sub.id === id);
  }

  createSubscription(data: InsertSubscriptionClient): GuestSubscription {
    const subscriptions = this.getSubscriptions();
    const newSubscription: GuestSubscription = {
      id: nanoid(),
      ...data,
      notes: data.notes || null,
      cancellationUrl: data.cancellationUrl || null,
      supportEmail: data.supportEmail || null,
      supportPhone: data.supportPhone || null,
      cancellationSteps: data.cancellationSteps || null,
      status: "active",
      cancelledAt: null,
      cancellationReason: null,
      createdAt: new Date(),
    };
    subscriptions.push(newSubscription);
    this.saveSubscriptions(subscriptions);
    return newSubscription;
  }

  updateSubscription(id: string, data: Partial<InsertSubscriptionClient>): GuestSubscription | null {
    const subscriptions = this.getSubscriptions();
    const index = subscriptions.findIndex((sub) => sub.id === id);
    
    if (index === -1) return null;

    subscriptions[index] = {
      ...subscriptions[index],
      ...data,
    };
    this.saveSubscriptions(subscriptions);
    return subscriptions[index];
  }

  deleteSubscription(id: string): boolean {
    const subscriptions = this.getSubscriptions();
    const filtered = subscriptions.filter((sub) => sub.id !== id);
    
    if (filtered.length === subscriptions.length) return false;

    this.saveSubscriptions(filtered);
    return true;
  }

  cancelSubscription(id: string, reason?: string): GuestSubscription | null {
    const subscriptions = this.getSubscriptions();
    const index = subscriptions.findIndex((sub) => sub.id === id);
    
    if (index === -1) return null;

    subscriptions[index] = {
      ...subscriptions[index],
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationReason: reason || null,
    };
    this.saveSubscriptions(subscriptions);
    return subscriptions[index];
  }

  clearAllSubscriptions(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  exportSubscriptions(): GuestSubscription[] {
    return this.getSubscriptions();
  }

  importSubscriptions(subscriptions: GuestSubscription[]): void {
    this.saveSubscriptions(subscriptions);
  }

  getSubscriptionCount(): number {
    return this.getSubscriptions().length;
  }
}

export const guestStorage = new GuestStorageService();
