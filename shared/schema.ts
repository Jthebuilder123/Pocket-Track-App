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
