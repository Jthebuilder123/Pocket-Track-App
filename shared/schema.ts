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
