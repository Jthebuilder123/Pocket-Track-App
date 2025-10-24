import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  billingCycle: text("billing_cycle").notNull(),
  category: text("category").notNull(),
  nextRenewalDate: timestamp("next_renewal_date").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const subscriptionHistory = pgTable("subscription_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull(),
  action: text("action").notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  previousCost: decimal("previous_cost", { precision: 10, scale: 2 }),
  newCost: decimal("new_cost", { precision: 10, scale: 2 }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
  cost: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Cost must be a positive number",
  }),
  billingCycle: z.enum(["Monthly", "Quarterly", "Yearly"]),
  category: z.string().min(1, "Category is required"),
  nextRenewalDate: z.preprocess(
    (arg) => {
      if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
      return arg;
    },
    z.date()
  ),
}).omit({
  id: true,
  status: true,
  cancelledAt: true,
  cancellationReason: true,
  createdAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Categories for filtering
export const SUBSCRIPTION_CATEGORIES = [
  "Streaming",
  "Software",
  "Cloud Storage",
  "Gaming",
  "Music",
  "Fitness",
  "News & Media",
  "Productivity",
  "Other",
] as const;

export const BILLING_CYCLES = ["Monthly", "Quarterly", "Yearly"] as const;

export const SUBSCRIPTION_STATUSES = ["active", "cancelled"] as const;

// History schema
export const insertHistorySchema = createInsertSchema(subscriptionHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertHistory = z.infer<typeof insertHistorySchema>;
export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;

// Cancellation schema
export const cancelSubscriptionSchema = z.object({
  reason: z.string().optional(),
});

// Bank connections table
export const bankConnections = pgTable("bank_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionId: text("institution_id").notNull(),
  institutionName: text("institution_name").notNull(),
  accessToken: text("access_token").notNull(),
  itemId: text("item_id").notNull(),
  accountIds: text("account_ids").array().notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type BankConnection = typeof bankConnections.$inferSelect;

// Detected subscriptions (pending user confirmation)
export const detectedSubscriptions = pgTable("detected_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantName: text("merchant_name").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }).notNull(),
  detectedBillingCycle: text("detected_billing_cycle").notNull(),
  category: text("category"),
  transactionIds: text("transaction_ids").array().notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertDetectedSubscriptionSchema = createInsertSchema(detectedSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type DetectedSubscription = typeof detectedSubscriptions.$inferSelect;
export type InsertDetectedSubscription = z.infer<typeof insertDetectedSubscriptionSchema>;

// User table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Email signup table for waitlist and login tracking
export const emailSignups = pgTable("email_signups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  tag: text("tag").notNull().default("waitlist"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertEmailSignupSchema = createInsertSchema(emailSignups).omit({
  id: true,
  createdAt: true,
});

export type EmailSignup = typeof emailSignups.$inferSelect;
export type InsertEmailSignup = z.infer<typeof insertEmailSignupSchema>;
