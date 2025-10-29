import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  billingCycle: text("billing_cycle").notNull(),
  category: text("category").notNull(),
  nextRenewalDate: timestamp("next_renewal_date").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  // Cancel Helper fields
  cancellationUrl: text("cancellation_url"),
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  cancellationSteps: text("cancellation_steps"),
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

// Backend schema - includes userId (added by server)
export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
  userId: z.string(),
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
  cancellationUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  supportEmail: z.string().email("Must be a valid email").optional().or(z.literal("")),
  supportPhone: z.string().optional(),
  cancellationSteps: z.string().optional(),
}).omit({
  id: true,
  status: true,
  cancelledAt: true,
  cancellationReason: true,
  createdAt: true,
});

// Client schema - excludes userId (added by backend automatically)
export const insertSubscriptionSchemaClient = insertSubscriptionSchema.omit({
  userId: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type InsertSubscriptionClient = z.infer<typeof insertSubscriptionSchemaClient>;
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
  userId: varchar("user_id").notNull(),
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
  userId: varchar("user_id").notNull(),
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

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User table for authentication (updated for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UpsertUser = typeof users.$inferInsert;

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

// Webhook configurations
export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  events: text("events").array().notNull(), // ['subscription.created', 'subscription.cancelled', etc.]
  secret: text("secret"),
  enabled: text("enabled").notNull().default("true"),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertWebhookSchema = createInsertSchema(webhooks, {
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.string()).min(1, "Select at least one event"),
}).omit({
  id: true,
  lastTriggeredAt: true,
  createdAt: true,
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;

// Notification preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  emailRenewalReminders: text("email_renewal_reminders").notNull().default("true"),
  reminderDaysBefore: text("reminder_days_before").notNull().default("7"),
  weeklyDigest: text("weekly_digest").notNull().default("false"),
  cancelConfirmations: text("cancel_confirmations").notNull().default("true"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;

// Webhook events enum
export const WEBHOOK_EVENTS = [
  "subscription.created",
  "subscription.updated",
  "subscription.cancelled",
  "subscription.renewed",
  "bank.connected",
  "bank.synced",
] as const;

// Subscription templates table
export const subscriptionTemplates = pgTable("subscription_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  suggestedPrice: decimal("suggested_price", { precision: 10, scale: 2 }).notNull(),
  billingCycle: text("billing_cycle").notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
  popularity: text("popularity").notNull().default("0"), // For sorting popular services
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertSubscriptionTemplateSchema = createInsertSchema(subscriptionTemplates).omit({
  id: true,
  createdAt: true,
});

export type SubscriptionTemplate = typeof subscriptionTemplates.$inferSelect;
export type InsertSubscriptionTemplate = z.infer<typeof insertSubscriptionTemplateSchema>;
