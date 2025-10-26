import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import multer from "multer";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertSubscriptionSchema, cancelSubscriptionSchema, insertEmailSignupSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { createLinkToken, exchangePublicToken, getTransactions, getAccounts, getInstitution } from "./plaid";
import { z } from "zod";
import logger from "./logger";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireAuth, optionalAuth, type AuthRequest } from "./authMiddleware";
import { checkSubscriptionLimit, checkBankConnectionLimit, requireFeature, getUserPlanLimits } from "./feature-gates";
import { PLANS, PRICING_TIERS } from "@shared/pricing";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required Stripe secret: STRIPE_SECRET_KEY");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth (Google OAuth + Email/Password)
  await setupAuth(app);

  // Health check endpoint
  app.get("/healthz", async (_req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Diagnostics endpoint
  app.get("/diagnostics", async (_req, res) => {
    try {
      // Check database connection
      const subscriptions = await storage.getAllSubscriptions();
      const dbStatus = "connected";
      
      // Check environment variables
      const envOk = Boolean(process.env.JWT_SECRET && process.env.DATABASE_URL);
      
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        env_ok: envOk,
        db_ok: true,
        database: {
          status: dbStatus,
          subscriptionCount: subscriptions.length
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: "MB"
        }
      });
    } catch (error) {
      logger.error("Diagnostics check failed", { error });
      res.status(503).json({
        status: "degraded",
        timestamp: new Date().toISOString(),
        error: "Database connection failed",
        env_ok: Boolean(process.env.JWT_SECRET && process.env.DATABASE_URL),
        db_ok: false,
      });
    }
  });

  // ===== Authentication Routes =====
  // Auth routes are now handled by setupAuth() (Google OAuth + Email/Password via Replit Auth)
  // Available routes:
  // - GET /api/login - Initiates OAuth flow
  // - GET /api/callback - OAuth callback
  // - GET /api/logout - Logs out and redirects

  // GET /api/auth/user - Get authenticated user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      logger.error("Error fetching user:", { error });
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Legacy magic link endpoints - redirect to new auth
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    // Redirect to new OAuth login
    res.status(301).json({ 
      error: "Authentication method changed. Please use the login button.",
      redirect: "/api/login"
    });
  });

  app.get("/api/auth/magic", authLimiter, async (req, res) => {
    // Redirect to new OAuth login
    res.redirect("/api/login");
  });

  // GET /api/auth/me - Get current user (for backwards compatibility)
  app.get("/api/auth/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        plan: user.plan,
      });
    } catch (error) {
      logger.error("Error fetching current user", { error });
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // POST /api/signup - Collect email for waitlist
  app.post("/api/signup", authLimiter, async (req, res) => {
    try {
      const result = insertEmailSignupSchema.safeParse({
        email: req.body.email?.toLowerCase(),
        tag: "waitlist",
      });

      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      await storage.createEmailSignup(result.data);
      res.json({ ok: true, message: "Thank you for signing up!" });
    } catch (error) {
      logger.error("Error creating email signup", { error });
      res.status(500).json({ error: "Failed to save email" });
    }
  });

  // Get all subscriptions
  app.get("/api/subscriptions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const subscriptions = await storage.getSubscriptionsByUserId(userId);
      res.json(subscriptions);
    } catch (error) {
      logger.error("Error fetching subscriptions", { error });
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  // Get single subscription
  app.get("/api/subscriptions/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      if (subscription.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(subscription);
    } catch (error) {
      logger.error("Error fetching subscription", { error, subscriptionId: req.params.id });
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Create new subscription
  app.post("/api/subscriptions", requireAuth, checkSubscriptionLimit, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;
      const result = insertSubscriptionSchema.safeParse({ ...req.body, userId });
      if (!result.success) {
        const errorMessage = fromZodError(result.error).toString();
        return res.status(400).json({ error: errorMessage });
      }

      const subscription = await storage.createSubscription(result.data);
      res.status(201).json(subscription);
    } catch (error) {
      logger.error("Error creating subscription", { error });
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  // Update subscription
  app.put("/api/subscriptions/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;

      // Verify ownership
      const existing = await storage.getSubscription(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = insertSubscriptionSchema.safeParse({ ...req.body, userId });
      if (!result.success) {
        const errorMessage = fromZodError(result.error).toString();
        return res.status(400).json({ error: errorMessage });
      }

      const subscription = await storage.updateSubscription(req.params.id, result.data);
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      res.json(subscription);
    } catch (error) {
      logger.error("Error updating subscription", { error, subscriptionId: req.params.id });
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  // Delete subscription
  app.delete("/api/subscriptions/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;

      // Verify ownership
      const existing = await storage.getSubscription(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const deleted = await storage.deleteSubscription(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      res.status(204).send();
    } catch (error) {
      logger.error("Error deleting subscription", { error, subscriptionId: req.params.id });
      res.status(500).json({ error: "Failed to delete subscription" });
    }
  });

  // Cancel subscription
  app.post("/api/subscriptions/:id/cancel", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;

      // Verify ownership
      const existing = await storage.getSubscription(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = cancelSubscriptionSchema.safeParse(req.body);
      if (!result.success) {
        const errorMessage = fromZodError(result.error).toString();
        return res.status(400).json({ error: errorMessage });
      }

      const subscription = await storage.cancelSubscription(req.params.id, result.data.reason);
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      res.json(subscription);
    } catch (error) {
      logger.error("Error cancelling subscription", { error, subscriptionId: req.params.id });
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Get subscription history
  app.get("/api/subscriptions/:id/history", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.claims.sub;

      // Verify ownership
      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      if (subscription.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const history = await storage.getSubscriptionHistory(req.params.id);
      res.json(history);
    } catch (error) {
      logger.error("Error fetching subscription history", { error, subscriptionId: req.params.id });
      res.status(500).json({ error: "Failed to fetch subscription history" });
    }
  });

  // ===== CSV/Excel Import Routes =====

  // Configure multer for file uploads (in-memory storage)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (_req, file, cb) => {
      const allowedMimeTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
      }
    },
  });

  // POST /api/subscriptions/import/upload - Parse and preview CSV/Excel
  app.post("/api/subscriptions/import/upload", requireAuth, requireFeature("importData"), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileBuffer = req.file.buffer;
      const fileType = req.file.mimetype;
      let rows: any[] = [];

      // Parse CSV
      if (fileType === 'text/csv') {
        const csvText = fileBuffer.toString('utf-8');
        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase(),
        });
        rows = parsed.data;
      }
      // Parse Excel
      else if (
        fileType === 'application/vnd.ms-excel' ||
        fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        // Normalize headers to lowercase
        rows = jsonData.map((row: any) => {
          const normalizedRow: any = {};
          for (const key in row) {
            normalizedRow[key.trim().toLowerCase()] = row[key];
          }
          return normalizedRow;
        });
      }

      if (rows.length === 0) {
        return res.status(400).json({ error: "File contains no valid data" });
      }

      // Validate and transform rows
      const validRows: any[] = [];
      const errors: Array<{ row: number; errors: string[] }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 1;

        // Map CSV headers to schema fields (case-insensitive)
        const mappedRow = {
          name: row.name || row.service || row.subscription,
          cost: row.cost || row.price || row.amount,
          billingCycle: row.billingcycle || row.billing_cycle || row.cycle || row.frequency,
          category: row.category || row.type,
          nextRenewalDate: row.nextrenewaldate || row.next_renewal_date || row.renewal_date || row.renewaldate || row.renewal,
          notes: row.notes || row.description || '',
        };

        // Validate against schema
        const result = insertSubscriptionSchema.safeParse(mappedRow);
        
        if (result.success) {
          validRows.push({
            rowNumber,
            data: result.data,
          });
        } else {
          const rowErrors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
          errors.push({
            row: rowNumber,
            errors: rowErrors,
          });
        }
      }

      res.json({
        totalRows: rows.length,
        validRows: validRows.length,
        invalidRows: errors.length,
        preview: validRows,
        errors: errors,
      });
    } catch (error) {
      logger.error("Error parsing import file", { error });
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to parse file" });
    }
  });

  // POST /api/subscriptions/import/confirm - Bulk insert validated subscriptions
  app.post("/api/subscriptions/import/confirm", requireAuth, requireFeature("importData"), async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUserByEmail(req.user!.email);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const schema = z.object({
        subscriptions: z.array(insertSubscriptionSchema),
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      const { subscriptions: subscriptionsToImport } = result.data;

      if (subscriptionsToImport.length === 0) {
        return res.status(400).json({ error: "No subscriptions to import" });
      }

      // Insert all subscriptions with userId
      const createdSubscriptions = [];
      for (const subData of subscriptionsToImport) {
        const created = await storage.createSubscription({ ...subData, userId: user.id });
        createdSubscriptions.push(created);
      }

      res.status(201).json({
        success: true,
        imported: createdSubscriptions.length,
        subscriptions: createdSubscriptions,
      });
    } catch (error) {
      logger.error("Error importing subscriptions", { error });
      res.status(500).json({ error: "Failed to import subscriptions" });
    }
  });

  // ===== Plaid Bank Integration Routes =====

  // Create Plaid Link token
  app.post("/api/plaid/create-link-token", async (_req, res) => {
    try {
      const userId = "user-default";
      const linkToken = await createLinkToken(userId);
      res.json({ link_token: linkToken });
    } catch (error) {
      logger.error("Error creating link token", { error });
      res.status(500).json({ error: "Failed to create link token" });
    }
  });

  // Exchange public token for access token and save bank connection
  app.post("/api/plaid/exchange-token", requireAuth, checkBankConnectionLimit, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUserByEmail(req.user!.email);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const schema = z.object({
        public_token: z.string(),
        institution_id: z.string(),
        institution_name: z.string(),
        accounts: z.array(z.object({
          id: z.string(),
          name: z.string(),
        })),
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      const { public_token, institution_id, institution_name, accounts } = result.data;
      
      const { accessToken, itemId } = await exchangePublicToken(public_token);
      
      const connection = await storage.createBankConnection({
        userId: user.id,
        institutionId: institution_id,
        institutionName: institution_name,
        accessToken,
        itemId,
        accountIds: accounts.map(a => a.id),
        lastSyncedAt: null,
      });
      
      res.json(connection);
    } catch (error) {
      logger.error("Error exchanging token", { error });
      res.status(500).json({ error: "Failed to exchange token" });
    }
  });

  // Get all bank connections
  app.get("/api/bank-connections", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUserByEmail(req.user!.email);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const connections = await storage.getBankConnectionsByUserId(user.id);
      res.json(connections);
    } catch (error) {
      logger.error("Error fetching bank connections", { error });
      res.status(500).json({ error: "Failed to fetch bank connections" });
    }
  });

  // Sync transactions and detect subscriptions
  app.post("/api/bank-connections/:id/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUserByEmail(req.user!.email);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const connection = await storage.getBankConnection(req.params.id);
      if (!connection) {
        return res.status(404).json({ error: "Bank connection not found" });
      }
      if (connection.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);

      const txnData = await getTransactions(
        connection.accessToken,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const detectedSubs = await storage.detectSubscriptionsFromTransactions(txnData.transactions);
      
      await storage.updateBankConnectionSyncTime(req.params.id);
      
      res.json({ 
        success: true, 
        transactionCount: txnData.transactions.length,
        detectedSubscriptions: detectedSubs.length 
      });
    } catch (error) {
      logger.error("Error syncing transactions", { error, connectionId: req.params.id });
      res.status(500).json({ error: "Failed to sync transactions" });
    }
  });

  // Get detected subscriptions
  app.get("/api/detected-subscriptions", async (_req, res) => {
    try {
      const detected = await storage.getDetectedSubscriptions();
      res.json(detected);
    } catch (error) {
      logger.error("Error fetching detected subscriptions", { error });
      res.status(500).json({ error: "Failed to fetch detected subscriptions" });
    }
  });

  // Confirm detected subscription (convert to real subscription)
  app.post("/api/detected-subscriptions/:id/confirm", async (req, res) => {
    try {
      const detected = await storage.getDetectedSubscription(req.params.id);
      if (!detected) {
        return res.status(404).json({ error: "Detected subscription not found" });
      }

      const nextRenewal = new Date();
      if (detected.detectedBillingCycle === "Monthly") {
        nextRenewal.setMonth(nextRenewal.getMonth() + 1);
      } else if (detected.detectedBillingCycle === "Quarterly") {
        nextRenewal.setMonth(nextRenewal.getMonth() + 3);
      } else {
        nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
      }

      const subscription = await storage.createSubscription({
        name: detected.merchantName,
        cost: detected.estimatedCost.toString(),
        billingCycle: detected.detectedBillingCycle as "Monthly" | "Quarterly" | "Yearly",
        category: detected.category || "Other",
        nextRenewalDate: nextRenewal,
        notes: `Auto-detected from bank transactions (${detected.confidence}% confidence)`,
      });

      await storage.markDetectedSubscriptionAsConfirmed(req.params.id);
      
      res.json(subscription);
    } catch (error) {
      logger.error("Error confirming detected subscription", { error, detectedId: req.params.id });
      res.status(500).json({ error: "Failed to confirm subscription" });
    }
  });

  // Dismiss detected subscription
  app.delete("/api/detected-subscriptions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDetectedSubscription(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Detected subscription not found" });
      }
      res.status(204).send();
    } catch (error) {
      logger.error("Error dismissing detected subscription", { error, detectedId: req.params.id });
      res.status(500).json({ error: "Failed to dismiss subscription" });
    }
  });

  // Delete bank connection
  app.delete("/api/bank-connections/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUserByEmail(req.user!.email);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Verify ownership
      const existing = await storage.getBankConnection(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Bank connection not found" });
      }
      if (existing.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const deleted = await storage.deleteBankConnection(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Bank connection not found" });
      }
      res.status(204).send();
    } catch (error) {
      logger.error("Error deleting bank connection", { error, connectionId: req.params.id });
      res.status(500).json({ error: "Failed to delete bank connection" });
    }
  });

  // ===== Webhook Routes =====

  // Get all webhooks
  app.get("/api/webhooks", async (_req, res) => {
    try {
      const webhooks = await storage.getAllWebhooks();
      res.json(webhooks);
    } catch (error) {
      logger.error("Error fetching webhooks", { error });
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  // Create webhook
  app.post("/api/webhooks", requireAuth, requireFeature("webhooks"), async (req, res) => {
    try {
      const { insertWebhookSchema } = await import("@shared/schema");
      const result = insertWebhookSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      const webhook = await storage.createWebhook(result.data);
      res.status(201).json(webhook);
    } catch (error) {
      logger.error("Error creating webhook", { error });
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  // Update webhook
  app.put("/api/webhooks/:id", async (req, res) => {
    try {
      const { insertWebhookSchema } = await import("@shared/schema");
      const result = insertWebhookSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      const webhook = await storage.updateWebhook(req.params.id, result.data);
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }
      res.json(webhook);
    } catch (error) {
      logger.error("Error updating webhook", { error, webhookId: req.params.id });
      res.status(500).json({ error: "Failed to update webhook" });
    }
  });

  // Delete webhook
  app.delete("/api/webhooks/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteWebhook(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Webhook not found" });
      }
      res.status(204).send();
    } catch (error) {
      logger.error("Error deleting webhook", { error, webhookId: req.params.id });
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  });

  // ===== Notification Preferences Routes =====

  // Get notification preferences
  app.get("/api/notification-preferences", async (_req, res) => {
    try {
      const userId = "user-default"; // TODO: Get from auth context
      const prefs = await storage.getNotificationPreferences(userId);
      res.json(prefs || { userId, emailRenewalReminders: "true", reminderDaysBefore: "7", weeklyDigest: "false", cancelConfirmations: "true" });
    } catch (error) {
      logger.error("Error fetching notification preferences", { error });
      res.status(500).json({ error: "Failed to fetch notification preferences" });
    }
  });

  // Update notification preferences
  app.put("/api/notification-preferences", async (req, res) => {
    try {
      const userId = "user-default"; // TODO: Get from auth context
      const { insertNotificationPreferencesSchema } = await import("@shared/schema");
      const result = insertNotificationPreferencesSchema.safeParse({ ...req.body, userId });
      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      const prefs = await storage.upsertNotificationPreferences(result.data);
      res.json(prefs);
    } catch (error) {
      logger.error("Error updating notification preferences", { error });
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });

  // ===== Stripe Checkout & Billing Routes =====

  // GET /api/pricing - Get pricing plans
  app.get("/api/pricing", (_req, res) => {
    res.json(PLANS);
  });

  // GET /api/user/plan - Get current user's plan and limits
  app.get("/api/user/plan", requireAuth, async (req: AuthRequest, res) => {
    try {
      const limits = await getUserPlanLimits(req.user!.email);
      if (!limits) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(limits);
    } catch (error) {
      logger.error("Error fetching user plan limits", { error });
      res.status(500).json({ error: "Failed to fetch plan limits" });
    }
  });

  // POST /api/create-checkout-session - Create Stripe Checkout session
  app.post("/api/create-checkout-session", requireAuth, async (req: AuthRequest, res) => {
    try {
      const schema = z.object({
        planId: z.enum([PRICING_TIERS.ESSENTIALS, PRICING_TIERS.PRO]),
        billingInterval: z.enum(["monthly", "yearly"]),
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      const { planId, billingInterval } = result.data;
      const user = await storage.getUserByEmail(req.user!.email);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get plan details
      const plan = PLANS.find((p) => p.id === planId);
      if (!plan) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const amount = billingInterval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;

      // Create or retrieve Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(user.email, customerId);
      }

      // Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${plan.name} Plan`,
                description: plan.description,
              },
              unit_amount: amount * 100, // Convert to cents
              recurring: {
                interval: billingInterval === "monthly" ? "month" : "year",
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${process.env.APP_BASE_URL || req.headers.origin}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_BASE_URL || req.headers.origin}/pricing?canceled=true`,
        metadata: {
          userId: user.id,
          planId,
          billingInterval,
        },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      logger.error("Error creating checkout session", { error });
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // POST /api/webhooks/stripe - Stripe webhook endpoint (must use raw body)
  app.post(
    "/api/webhooks/stripe",
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig) {
        logger.warn("Missing Stripe signature header");
        return res.status(400).send("Missing signature");
      }

      let event: Stripe.Event;

      try {
        // Construct event with raw body for signature verification
        const rawBody = await new Promise<Buffer>((resolve) => {
          const chunks: Buffer[] = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", () => resolve(Buffer.concat(chunks)));
        });

        if (webhookSecret) {
          event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        } else {
          // For development without webhook secret
          event = JSON.parse(rawBody.toString());
          logger.warn("Processing Stripe webhook without signature verification");
        }
      } catch (err: any) {
        logger.error("Webhook signature verification failed", { error: err.message });
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.userId;
            const planId = session.metadata?.planId;

            if (userId && planId && session.customer) {
              // Update user's plan and Stripe info
              const user = await storage.getUserByEmail(session.customer_email || "");
              if (user) {
                await storage.updateUserPlan(user.email, planId);
                await storage.updateUserStripeInfo(
                  user.email,
                  session.customer as string,
                  session.subscription as string
                );
                
                logger.info("User plan activated", {
                  email: user.email,
                  plan: planId,
                  subscriptionId: session.subscription,
                });
              }
            }
            break;
          }

          case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            // Find user by Stripe customer ID
            const user = await storage.getUserByEmail(""); // Need to add query by customerId
            if (user) {
              // Handle subscription status changes
              if (subscription.status === "active") {
                // Reactivate plan if it was paused
                logger.info("Subscription reactivated", {
                  customerId,
                  subscriptionId: subscription.id,
                });
              } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
                // Downgrade to free plan
                await storage.updateUserPlan(user.email, PRICING_TIERS.FREE);
                logger.info("Subscription canceled, downgraded to free", {
                  customerId,
                  email: user.email,
                });
              }
            }
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            // Find user and downgrade to free plan
            const user = await storage.getUserByEmail(""); // Need to add query by customerId
            if (user) {
              await storage.updateUserPlan(user.email, PRICING_TIERS.FREE);
              logger.info("Subscription deleted, downgraded to free", {
                customerId,
                email: user.email,
              });
            }
            break;
          }

          default:
            logger.info("Unhandled Stripe webhook event", { type: event.type });
        }

        res.json({ received: true });
      } catch (error) {
        logger.error("Error processing Stripe webhook", { error, eventType: event.type });
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );

  // 404 handler for API routes
  app.use("/api/*", (_req, res) => {
    res.status(404).json({ 
      error: "Not Found",
      message: "The requested API endpoint does not exist"
    });
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    logger.error("Unhandled error", { 
      error: err,
      path: req.path,
      method: req.method,
      stack: err.stack
    });

    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV !== "production";
    const statusCode = err.statusCode || err.status || 500;

    res.status(statusCode).json({
      error: err.message || "Internal Server Error",
      ...(isDevelopment && { stack: err.stack, details: err })
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
