import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import multer from "multer";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { insertSubscriptionSchema, cancelSubscriptionSchema, insertEmailSignupSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { createLinkToken, exchangePublicToken, getTransactions, getAccounts, getInstitution } from "./plaid";
import { z } from "zod";
import logger from "./logger";
import { generateMagicToken, generateSessionToken, verifyMagicToken, sendMagicLink } from "./auth";
import { requireAuth, optionalAuth, type AuthRequest } from "./authMiddleware";

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
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

  // POST /api/auth/login - Request magic link
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        next: z.string().optional(),
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      const { email, next } = result.data;
      const normalizedEmail = email.toLowerCase();

      // Store email in EmailSignup table
      await storage.createEmailSignup({
        email: normalizedEmail,
        tag: "app_login",
      });

      // Generate magic link token
      const token = generateMagicToken(normalizedEmail);

      // Send magic link
      await sendMagicLink(normalizedEmail, token, next);

      res.json({ ok: true, message: "Magic link sent to your email" });
    } catch (error) {
      logger.error("Error sending magic link", { error });
      res.status(500).json({ error: "Failed to send magic link" });
    }
  });

  // GET /api/auth/magic - Verify magic link and log in
  app.get("/api/auth/magic", authLimiter, async (req, res) => {
    try {
      const token = req.query.token as string;
      let next = (req.query.next as string) || "/";

      if (!token) {
        return res.redirect(`/login?error=${encodeURIComponent("Missing token")}`);
      }

      // Validate next parameter to prevent open redirects
      // Only allow same-origin relative paths
      if (next && (!next.startsWith("/") || next.startsWith("//"))) {
        logger.warn("Invalid redirect attempt blocked", { next });
        next = "/";
      }

      const payload = verifyMagicToken(token);
      
      if (!payload) {
        return res.redirect(`/login?error=${encodeURIComponent("Invalid or expired link")}`);
      }

      // Upsert user
      await storage.upsertUser(payload.email);

      // Generate session token
      const sessionToken = generateSessionToken(payload.email);

      // Set httpOnly cookie
      res.cookie("session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      });

      logger.info("User logged in", { email: payload.email });
      res.redirect(next);
    } catch (error) {
      logger.error("Error verifying magic link", { error });
      res.redirect(`/login?error=${encodeURIComponent("Authentication failed")}`);
    }
  });

  // POST /api/auth/logout - Clear session
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("session");
    res.json({ ok: true });
  });

  // GET /api/auth/me - Get current user
  app.get("/api/auth/me", optionalAuth, async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = await storage.getUserByEmail(req.user.email);
      if (!user) {
        res.clearCookie("session");
        return res.status(401).json({ error: "User not found" });
      }

      res.json({
        email: user.email,
        plan: user.plan,
        name: user.name,
      });
    } catch (error) {
      logger.error("Error fetching user", { error });
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
  app.get("/api/subscriptions", async (_req, res) => {
    try {
      const subscriptions = await storage.getAllSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      logger.error("Error fetching subscriptions", { error });
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  // Get single subscription
  app.get("/api/subscriptions/:id", async (req, res) => {
    try {
      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      res.json(subscription);
    } catch (error) {
      logger.error("Error fetching subscription", { error, subscriptionId: req.params.id });
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Create new subscription
  app.post("/api/subscriptions", async (req, res) => {
    try {
      const result = insertSubscriptionSchema.safeParse(req.body);
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
  app.put("/api/subscriptions/:id", async (req, res) => {
    try {
      const result = insertSubscriptionSchema.safeParse(req.body);
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
  app.delete("/api/subscriptions/:id", async (req, res) => {
    try {
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
  app.post("/api/subscriptions/:id/cancel", async (req, res) => {
    try {
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
  app.get("/api/subscriptions/:id/history", async (req, res) => {
    try {
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
  app.post("/api/subscriptions/import/upload", upload.single('file'), async (req, res) => {
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
  app.post("/api/subscriptions/import/confirm", async (req, res) => {
    try {
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

      // Insert all subscriptions
      const createdSubscriptions = [];
      for (const subData of subscriptionsToImport) {
        const created = await storage.createSubscription(subData);
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
  app.post("/api/plaid/exchange-token", async (req, res) => {
    try {
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
  app.get("/api/bank-connections", async (_req, res) => {
    try {
      const connections = await storage.getAllBankConnections();
      res.json(connections);
    } catch (error) {
      logger.error("Error fetching bank connections", { error });
      res.status(500).json({ error: "Failed to fetch bank connections" });
    }
  });

  // Sync transactions and detect subscriptions
  app.post("/api/bank-connections/:id/sync", async (req, res) => {
    try {
      const connection = await storage.getBankConnection(req.params.id);
      if (!connection) {
        return res.status(404).json({ error: "Bank connection not found" });
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
  app.delete("/api/bank-connections/:id", async (req, res) => {
    try {
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
