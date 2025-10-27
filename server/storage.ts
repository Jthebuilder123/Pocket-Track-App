import { type Subscription, type InsertSubscription, type InsertHistory, type SubscriptionHistory, type BankConnection, type DetectedSubscription, type InsertDetectedSubscription, type User, type EmailSignup, type InsertEmailSignup, type Webhook, type InsertWebhook, type NotificationPreferences, type InsertNotificationPreferences, type SubscriptionTemplate, subscriptions, subscriptionHistory, bankConnections, detectedSubscriptions, users, emailSignups, webhooks, notificationPreferences, subscriptionTemplates } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql as drizzleSql } from "drizzle-orm";
import type { Transaction } from "plaid";
import { triggerWebhooks } from "./webhook-service";

export interface IStorage {
  // Subscription operations
  getAllSubscriptions(): Promise<Subscription[]>;
  getSubscriptionsByUserId(userId: string): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: InsertSubscription): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;
  cancelSubscription(id: string, reason?: string): Promise<Subscription | undefined>;
  
  // History operations
  getSubscriptionHistory(subscriptionId: string): Promise<SubscriptionHistory[]>;
  addHistoryEntry(entry: InsertHistory): Promise<SubscriptionHistory>;
  
  // Bank connection operations
  getAllBankConnections(): Promise<BankConnection[]>;
  getBankConnectionsByUserId(userId: string): Promise<BankConnection[]>;
  getBankConnection(id: string): Promise<BankConnection | undefined>;
  createBankConnection(connection: Omit<BankConnection, "id" | "createdAt">): Promise<BankConnection>;
  deleteBankConnection(id: string): Promise<boolean>;
  updateBankConnectionSyncTime(id: string): Promise<void>;
  
  // Detected subscriptions operations
  getDetectedSubscriptions(): Promise<DetectedSubscription[]>;
  getDetectedSubscription(id: string): Promise<DetectedSubscription | undefined>;
  detectSubscriptionsFromTransactions(transactions: Transaction[]): Promise<DetectedSubscription[]>;
  markDetectedSubscriptionAsConfirmed(id: string): Promise<void>;
  deleteDetectedSubscription(id: string): Promise<boolean>;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  upsertUser(userData: { id: string; email?: string | null; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null }): Promise<User>;
  updateUserPlan(userId: string, plan: string): Promise<User | undefined>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User | undefined>;
  
  // Email signup operations
  createEmailSignup(signup: InsertEmailSignup): Promise<EmailSignup>;
  getEmailSignups(): Promise<EmailSignup[]>;
  
  // Webhook operations
  getAllWebhooks(): Promise<Webhook[]>;
  getWebhook(id: string): Promise<Webhook | undefined>;
  createWebhook(webhook: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: string, webhook: InsertWebhook): Promise<Webhook | undefined>;
  deleteWebhook(id: string): Promise<boolean>;
  updateWebhookLastTriggered(id: string): Promise<void>;
  
  // Notification preferences operations
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  upsertNotificationPreferences(prefs: InsertNotificationPreferences): Promise<NotificationPreferences>;
  
  // Subscription template operations
  getAllTemplates(): Promise<SubscriptionTemplate[]>;
  getTemplate(id: string): Promise<SubscriptionTemplate | undefined>;
  searchTemplates(query: string): Promise<SubscriptionTemplate[]>;
  getTemplatesByCategory(category: string): Promise<SubscriptionTemplate[]>;
}

export class DatabaseStorage implements IStorage {
  async getAllSubscriptions(): Promise<Subscription[]> {
    return await db.select().from(subscriptions);
  }

  async getSubscriptionsByUserId(userId: string): Promise<Subscription[]> {
    return await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
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
    
    // Trigger webhooks (fire and forget)
    this.getAllWebhooks().then((webhooks) => {
      triggerWebhooks("subscription.created", { subscription }, webhooks).catch(() => {});
    }).catch(() => {});
    
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
      
      // Trigger webhooks (fire and forget)
      this.getAllWebhooks().then((webhooks) => {
        triggerWebhooks("subscription.updated", { subscription }, webhooks).catch(() => {});
      }).catch(() => {});
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
      
      // Trigger webhooks (fire and forget)
      this.getAllWebhooks().then((webhooks) => {
        triggerWebhooks("subscription.cancelled", { subscription: cancelled }, webhooks).catch(() => {});
      }).catch(() => {});
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

  // Bank connection methods
  async getAllBankConnections(): Promise<BankConnection[]> {
    return await db.select().from(bankConnections);
  }

  async getBankConnectionsByUserId(userId: string): Promise<BankConnection[]> {
    return await db.select().from(bankConnections).where(eq(bankConnections.userId, userId));
  }

  async getBankConnection(id: string): Promise<BankConnection | undefined> {
    const [connection] = await db.select().from(bankConnections).where(eq(bankConnections.id, id));
    return connection || undefined;
  }

  async createBankConnection(connection: Omit<BankConnection, "id" | "createdAt">): Promise<BankConnection> {
    const [newConnection] = await db
      .insert(bankConnections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async deleteBankConnection(id: string): Promise<boolean> {
    const result = await db.delete(bankConnections).where(eq(bankConnections.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async updateBankConnectionSyncTime(id: string): Promise<void> {
    await db
      .update(bankConnections)
      .set({ lastSyncedAt: new Date() })
      .where(eq(bankConnections.id, id));
  }

  // Detected subscriptions methods
  async getDetectedSubscriptions(): Promise<DetectedSubscription[]> {
    return await db.select().from(detectedSubscriptions).where(eq(detectedSubscriptions.status, "pending"));
  }

  async getDetectedSubscription(id: string): Promise<DetectedSubscription | undefined> {
    const [detected] = await db.select().from(detectedSubscriptions).where(eq(detectedSubscriptions.id, id));
    return detected || undefined;
  }

  async detectSubscriptionsFromTransactions(transactions: Transaction[]): Promise<DetectedSubscription[]> {
    const merchantGroups = new Map<string, Transaction[]>();
    
    for (const txn of transactions) {
      if (txn.amount <= 0) continue;
      
      const merchantName = txn.merchant_name || txn.name || "Unknown";
      if (!merchantGroups.has(merchantName)) {
        merchantGroups.set(merchantName, []);
      }
      merchantGroups.get(merchantName)!.push(txn);
    }

    const detected: DetectedSubscription[] = [];

    for (const [merchantName, txns] of Array.from(merchantGroups.entries())) {
      if (txns.length < 2) continue;

      txns.sort((a: Transaction, b: Transaction) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const intervals: number[] = [];
      for (let i = 1; i < txns.length; i++) {
        const daysBetween = Math.round(
          (new Date(txns[i].date).getTime() - new Date(txns[i - 1].date).getTime()) / (1000 * 60 * 60 * 24)
        );
        intervals.push(daysBetween);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev / avgInterval > 0.3) continue;

      let billingCycle: "Monthly" | "Quarterly" | "Yearly" = "Monthly";
      if (avgInterval >= 80 && avgInterval <= 100) {
        billingCycle = "Quarterly";
      } else if (avgInterval >= 350 && avgInterval <= 380) {
        billingCycle = "Yearly";
      }

      const avgCost = txns.reduce((sum: number, t: Transaction) => sum + t.amount, 0) / txns.length;
      const costVariance = txns.reduce((sum: number, t: Transaction) => sum + Math.pow(t.amount - avgCost, 2), 0) / txns.length;
      const costStdDev = Math.sqrt(costVariance);

      const confidence = Math.max(50, Math.min(99, 100 - (stdDev / avgInterval * 100) - (costStdDev / avgCost * 50)));

      const category = this.categorizeTransaction(merchantName);

      const [detectedSub] = await db
        .insert(detectedSubscriptions)
        .values({
          merchantName,
          estimatedCost: avgCost.toFixed(2),
          detectedBillingCycle: billingCycle,
          category,
          transactionIds: txns.map((t: Transaction) => t.transaction_id),
          confidence: confidence.toFixed(0),
          status: "pending",
        })
        .returning();

      detected.push(detectedSub);
    }

    return detected;
  }

  private categorizeTransaction(merchantName: string): string {
    const name = merchantName.toLowerCase();
    
    if (name.includes("netflix") || name.includes("hulu") || name.includes("disney") || name.includes("hbo") || name.includes("prime video") || name.includes("youtube")) {
      return "Streaming";
    }
    if (name.includes("spotify") || name.includes("apple music") || name.includes("pandora")) {
      return "Music";
    }
    if (name.includes("github") || name.includes("adobe") || name.includes("microsoft") || name.includes("google workspace")) {
      return "Software";
    }
    if (name.includes("dropbox") || name.includes("icloud") || name.includes("google one")) {
      return "Cloud Storage";
    }
    if (name.includes("gym") || name.includes("fitness") || name.includes("peloton")) {
      return "Fitness";
    }
    if (name.includes("news") || name.includes("times") || name.includes("post")) {
      return "News & Media";
    }
    
    return "Other";
  }

  async markDetectedSubscriptionAsConfirmed(id: string): Promise<void> {
    await db
      .update(detectedSubscriptions)
      .set({ status: "confirmed" })
      .where(eq(detectedSubscriptions.id, id));
  }

  async deleteDetectedSubscription(id: string): Promise<boolean> {
    const result = await db.delete(detectedSubscriptions).where(eq(detectedSubscriptions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user || undefined;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    if (!stripeCustomerId) return undefined;
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user || undefined;
  }

  async upsertUser(userData: { id: string; email?: string | null; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null }): Promise<User> {
    // Check if user exists by ID or email first
    const existingById = await this.getUser(userData.id);
    const existingByEmail = userData.email ? await this.getUserByEmail(userData.email) : undefined;
    
    // If user exists by either ID or email, update them
    if (existingById || existingByEmail) {
      const userId = existingById?.id || existingByEmail!.id;
      const [user] = await db
        .update(users)
        .set({
          // Update ID if it doesn't match (email match case)
          id: userData.id,
          email: userData.email?.toLowerCase() || null,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          profileImageUrl: userData.profileImageUrl || null,
          updatedAt: drizzleSql`now()`,
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    }
    
    // Insert new user if doesn't exist
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id,
        email: userData.email?.toLowerCase() || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        plan: "free",
      })
      .returning();
    
    return user;
  }

  async updateUserPlan(userId: string, plan: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ plan, updatedAt: drizzleSql`now()` })
      .where(eq(users.id, userId))
      .returning();
    
    return user || undefined;
  }

  async updateUserStripeInfo(
    userId: string,
    stripeCustomerId: string,
    stripeSubscriptionId?: string
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        ...(stripeSubscriptionId && { stripeSubscriptionId }),
        updatedAt: drizzleSql`now()`,
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user || undefined;
  }

  // Email signup operations
  async createEmailSignup(signup: InsertEmailSignup): Promise<EmailSignup> {
    const [emailSignup] = await db
      .insert(emailSignups)
      .values({
        email: signup.email.toLowerCase(),
        tag: signup.tag || "waitlist",
      })
      .returning();
    
    return emailSignup;
  }

  async getEmailSignups(): Promise<EmailSignup[]> {
    return await db.select().from(emailSignups).orderBy(desc(emailSignups.createdAt));
  }

  // Webhook operations
  async getAllWebhooks(): Promise<Webhook[]> {
    return await db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
  }

  async getWebhook(id: string): Promise<Webhook | undefined> {
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id));
    return webhook || undefined;
  }

  async createWebhook(insertWebhook: InsertWebhook): Promise<Webhook> {
    const [webhook] = await db.insert(webhooks).values(insertWebhook).returning();
    return webhook;
  }

  async updateWebhook(id: string, insertWebhook: InsertWebhook): Promise<Webhook | undefined> {
    const [webhook] = await db
      .update(webhooks)
      .set(insertWebhook)
      .where(eq(webhooks.id, id))
      .returning();
    return webhook || undefined;
  }

  async deleteWebhook(id: string): Promise<boolean> {
    const result = await db.delete(webhooks).where(eq(webhooks.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async updateWebhookLastTriggered(id: string): Promise<void> {
    await db
      .update(webhooks)
      .set({ lastTriggeredAt: drizzleSql`now()` })
      .where(eq(webhooks.id, id));
  }

  // Notification preferences operations
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return prefs || undefined;
  }

  async upsertNotificationPreferences(insertPrefs: InsertNotificationPreferences): Promise<NotificationPreferences> {
    const [prefs] = await db
      .insert(notificationPreferences)
      .values(insertPrefs)
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          ...insertPrefs,
          updatedAt: drizzleSql`now()`,
        },
      })
      .returning();
    return prefs;
  }

  // Subscription template operations
  async getAllTemplates(): Promise<SubscriptionTemplate[]> {
    return await db
      .select()
      .from(subscriptionTemplates)
      .orderBy(desc(subscriptionTemplates.popularity), subscriptionTemplates.name);
  }

  async getTemplate(id: string): Promise<SubscriptionTemplate | undefined> {
    const [template] = await db
      .select()
      .from(subscriptionTemplates)
      .where(eq(subscriptionTemplates.id, id));
    return template || undefined;
  }

  async searchTemplates(query: string): Promise<SubscriptionTemplate[]> {
    const lowerQuery = query.toLowerCase();
    const allTemplates = await db.select().from(subscriptionTemplates);
    return allTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.category.toLowerCase().includes(lowerQuery) ||
        t.description?.toLowerCase().includes(lowerQuery)
    ).sort((a, b) => {
      // Sort by popularity (descending)
      return parseInt(b.popularity) - parseInt(a.popularity);
    });
  }

  async getTemplatesByCategory(category: string): Promise<SubscriptionTemplate[]> {
    return await db
      .select()
      .from(subscriptionTemplates)
      .where(eq(subscriptionTemplates.category, category))
      .orderBy(desc(subscriptionTemplates.popularity), subscriptionTemplates.name);
  }
}

export const storage = new DatabaseStorage();
