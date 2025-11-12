import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import multer from "multer";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertSubscriptionSchema, cancelSubscriptionSchema, insertEmailSignupSchema, notificationPreferences, webhooks, subscriptionHistory } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
// APPSTORE: Import DB utilities for account deletion (Guideline 5.1.1 v)
import { db } from "./db";
import { eq } from "drizzle-orm";
import { createLinkToken, exchangePublicToken, getTransactions, getAccounts, getInstitution, plaidClient } from "./plaid";
import { z } from "zod";
import logger from "./logger";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireAuth, optionalAuth } from "./authMiddleware";
import { checkSubscriptionLimit, checkBankConnectionLimit, requireFeature, getUserPlanLimits } from "./feature-gates";
import { PLANS, PRICING_TIERS, type PricingTier, isLimitReached, getLimit } from "@shared/pricing";
import { sendEmail } from "./auth";


// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required Stripe secret: STRIPE_SECRET_KEY");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
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

  // Smoke test page for manual testing of critical features
  app.get("/debug/smoke", async (req: any, res) => {
    // Properly check authentication using Passport's method
    const isLoggedIn = req.isAuthenticated() && !!req.user;
    const userEmail = isLoggedIn ? req.user.claims?.email : null;
    
    // Log authentication state for debugging
    logger.info("[SMOKE TEST] Page loaded", {
      isLoggedIn,
      hasReqUser: !!req.user,
      isAuthenticated: req.isAuthenticated?.() || false,
      userEmail,
      sessionID: req.sessionID,
      hasSession: !!req.session
    });
    
    // Add cache-busting headers
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>PocketTrack - Smoke Tests</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #0f172a; margin-bottom: 10px; }
    .subtitle { color: #64748b; margin-bottom: 30px; font-size: 14px; }
    .status { 
      padding: 12px 20px; 
      border-radius: 6px; 
      margin-bottom: 20px;
      font-weight: 500;
    }
    .status.info { background: #dbeafe; color: #1e40af; }
    .status.success { background: #dcfce7; color: #166534; }
    .status.error { background: #fee2e2; color: #991b1b; }
    .test-section {
      background: #f8fafc;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 20px;
      border: 1px solid #e2e8f0;
    }
    .test-section h2 {
      font-size: 16px;
      margin-bottom: 10px;
      color: #1e293b;
    }
    .test-section p {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 15px;
    }
    button {
      background: #0f172a;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      margin-right: 10px;
      margin-bottom: 10px;
      transition: all 0.2s ease;
    }
    button:hover:not(:disabled) { 
      background: #1e293b;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    button:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    button:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
      opacity: 0.6;
    }
    button.secondary {
      background: #64748b;
    }
    button.secondary:hover:not(:disabled) {
      background: #475569;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .result {
      margin-top: 15px;
      padding: 12px;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .result.pass { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .result.fail { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 PocketTrack Smoke Tests</h1>
    <p class="subtitle">Manual testing interface for critical features</p>
    
    <div class="status ${isLoggedIn ? 'success' : 'info'}">
      ${isLoggedIn 
        ? `✓ Logged in as: <strong>${userEmail}</strong>`
        : '⚠ Not logged in - some tests will be unavailable'}
    </div>

    <!-- Test 1: Connect Bank (Plaid Link) -->
    <div class="test-section">
      <h2>1. Connect Bank (Plaid Link)</h2>
      <p>Tests the complete Plaid Link flow: create link token → open modal → exchange public token → save connection</p>
      <button 
        id="btn-connect-bank" 
        data-testid="btn-connect-bank"
        data-action="connect-bank"
        ${!isLoggedIn ? 'disabled title="Login required"' : ''}
      >
        ${isLoggedIn ? 'Connect Bank Account' : 'Login Required'}
      </button>
      <div id="result-bank" class="result" style="display:none"></div>
    </div>

    <!-- Test 2: Upgrade to Pro (Stripe Checkout) -->
    <div class="test-section">
      <h2>2. Upgrade to Pro Plan (Monthly)</h2>
      <p>Tests Stripe checkout flow for Pro plan monthly subscription ($19.99/month)</p>
      <button 
        id="btn-upgrade-pro" 
        data-testid="btn-upgrade-pro"
        ${!isLoggedIn ? 'disabled title="Login required"' : ''}
      >
        ${isLoggedIn ? 'Upgrade to Pro (Monthly)' : 'Login Required'}
      </button>
      <div id="result-upgrade" class="result" style="display:none"></div>
    </div>

    <!-- Test 3: Logout -->
    <div class="test-section">
      <h2>3. Logout</h2>
      <p>Tests the logout flow and session termination</p>
      <button 
        id="btn-logout" 
        data-testid="btn-logout"
        class="secondary"
        ${!isLoggedIn ? 'disabled title="Already logged out"' : ''}
      >
        ${isLoggedIn ? 'Logout' : 'Already Logged Out'}
      </button>
      <div id="result-logout" class="result" style="display:none"></div>
    </div>

    <!-- Test 4: Login -->
    ${!isLoggedIn ? `
    <div class="test-section">
      <h2>4. Login</h2>
      <p>Click to start the login flow (required for other tests)</p>
      <button id="btn-login" data-testid="btn-login">Go to Login</button>
    </div>
    ` : ''}
  </div>

  <!-- Visible status indicator for debugging -->
  <div id="debug-status" style="position: fixed; bottom: 10px; right: 10px; background: #1e293b; color: white; padding: 8px 12px; border-radius: 4px; font-size: 11px; font-family: monospace; z-index: 10000;">
    <div>JS: <span id="js-status" style="color: #fbbf24;">Loading...</span></div>
    <div>Auth: <span id="auth-status" style="color: #fbbf24;">${isLoggedIn ? 'Logged In' : 'Guest'}</span></div>
    <div>Handlers: <span id="handlers-status" style="color: #fbbf24;">Pending...</span></div>
  </div>

  <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
  <script>
    // Immediate execution - no DOMContentLoaded
    console.log('[SMOKE TEST] Script executing immediately...');
    
    // Update status indicator
    document.getElementById('js-status').textContent = 'Executing';
    document.getElementById('js-status').style.color = '#34d399';
    
    // Utility functions
    function showResult(elementId, message, isPass) {
      const el = document.getElementById(elementId);
      if (!el) {
        console.error('[SMOKE TEST] Result element not found:', elementId);
        return;
      }
      el.textContent = (isPass ? 'PASS: ' : 'FAIL: ') + message;
      el.className = 'result ' + (isPass ? 'pass' : 'fail');
      el.style.display = 'block';
      console.log('[SMOKE TEST] Result displayed:', { elementId, message, isPass });
    }

    // Global function for Plaid Link results (called from index.html handler)
    window.showPlaidResult = function(message, isPass) {
      showResult('result-bank', message, isPass);
    };
    
    // Attach handlers immediately (no DOMContentLoaded needed since script is at bottom)
    function attachHandlers() {
      console.log('[SMOKE TEST] Attaching event handlers...');

      // Test 1: Connect Bank - Plaid Link flow
      const btnConnectBank = document.getElementById('btn-connect-bank');
      if (btnConnectBank) {
        console.log('[SMOKE TEST] Attaching handler to Connect Bank button');
        btnConnectBank.addEventListener('click', async (e) => {
          console.log('[SMOKE TEST] Connect Bank clicked');
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = 'Connecting...';
          
          try {
            console.log('[SMOKE TEST] Fetching link token...');
            // Fetch link token
            const linkTokenResponse = await fetch('/api/create_link_token', {
              credentials: 'include'
            });
            
            if (!linkTokenResponse.ok) {
              throw new Error('Failed to create link token: ' + linkTokenResponse.statusText);
            }
            
            const { link_token } = await linkTokenResponse.json();
            console.log('[SMOKE TEST] Link token received, opening Plaid Link...');
            
            // Check if Plaid SDK is loaded
            if (typeof window.Plaid === 'undefined') {
              throw new Error('Plaid SDK not loaded. Please refresh the page.');
            }
            
            // Create and open Plaid Link
            const handler = window.Plaid.create({
              token: link_token,
              onSuccess: async (public_token, metadata) => {
                console.log('[SMOKE TEST] Plaid Link success, exchanging token...');
                try {
                  const exchangeResponse = await fetch('/api/exchange_public_token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ public_token })
                  });
                  
                  if (!exchangeResponse.ok) {
                    throw new Error('Failed to exchange token: ' + exchangeResponse.statusText);
                  }
                  
                  const result = await exchangeResponse.json();
                  showResult('result-bank', 'Bank connected successfully! Connection ID: ' + result.connection.id, true);
                  btn.disabled = false;
                  btn.textContent = 'Connect Bank Account';
                } catch (error) {
                  console.error('[SMOKE TEST] Exchange error:', error);
                  showResult('result-bank', error.message, false);
                  btn.disabled = false;
                  btn.textContent = 'Connect Bank Account';
                }
              },
              onExit: (err, metadata) => {
                console.log('[SMOKE TEST] Plaid Link exited', { err, metadata });
                btn.disabled = false;
                btn.textContent = 'Connect Bank Account';
                
                if (err) {
                  showResult('result-bank', 'Bank connection cancelled or failed: ' + (err.error_message || err.error_code), false);
                }
              }
            });
            
            handler.open();
            
          } catch (error) {
            console.error('[SMOKE TEST] Connect Bank error:', error);
            showResult('result-bank', error.message, false);
            btn.disabled = false;
            btn.textContent = 'Connect Bank Account';
          }
        });
      } else {
        console.error('[SMOKE TEST] Connect Bank button not found!');
      }

      // Test 2: Upgrade to Pro
      const btnUpgradePro = document.getElementById('btn-upgrade-pro');
      if (btnUpgradePro) {
        console.log('[SMOKE TEST] Attaching handler to Upgrade Pro button');
        btnUpgradePro.addEventListener('click', async () => {
          console.log('[SMOKE TEST] Upgrade Pro clicked');
          const btn = document.getElementById('btn-upgrade-pro');
          btn.disabled = true;
          btn.textContent = 'Processing...';
          
          try {
            console.log('[SMOKE TEST] Creating Stripe checkout session...');
            const response = await fetch('/api/create-checkout-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ 
                planId: 'pro',
                billingInterval: 'monthly'
              })
            });
            
            if (!response.ok) {
              throw new Error('Failed to create checkout session: ' + response.statusText);
            }
            
            const { url } = await response.json();
            console.log('[SMOKE TEST] Checkout session created, redirecting...');
            showResult('result-upgrade', 'Redirecting to Stripe checkout...', true);
            setTimeout(() => window.location.href = url, 1000);
          } catch (error) {
            console.error('[SMOKE TEST] Upgrade error:', error);
            showResult('result-upgrade', error.message, false);
            btn.disabled = false;
            btn.textContent = 'Upgrade to Pro (Monthly)';
          }
        });
      } else {
        console.error('[SMOKE TEST] Upgrade Pro button not found!');
      }

      // Test 3: Logout
      const btnLogout = document.getElementById('btn-logout');
      if (btnLogout) {
        console.log('[SMOKE TEST] Attaching handler to Logout button');
        btnLogout.addEventListener('click', async () => {
          console.log('[SMOKE TEST] Logout clicked');
          const btn = document.getElementById('btn-logout');
          btn.disabled = true;
          btn.textContent = 'Logging out...';
          
          try {
            showResult('result-logout', 'Redirecting to logout...', true);
            setTimeout(() => window.location.href = '/api/logout', 500);
          } catch (error) {
            console.error('[SMOKE TEST] Logout error:', error);
            showResult('result-logout', error.message, false);
            btn.disabled = false;
            btn.textContent = 'Logout';
          }
        });
      } else {
        console.error('[SMOKE TEST] Logout button not found!');
      }

      // Test 4: Login
      const btnLogin = document.getElementById('btn-login');
      if (btnLogin) {
        console.log('[SMOKE TEST] Attaching handler to Login button');
        btnLogin.addEventListener('click', () => {
          console.log('[SMOKE TEST] Login clicked');
          window.location.href = '/api/login';
        });
      } else {
        console.log('[SMOKE TEST] Login button not found (user may already be logged in)');
      }

      console.log('[SMOKE TEST] All event handlers attached successfully');
      
      // Update status indicator
      document.getElementById('handlers-status').textContent = 'Attached ✓';
      document.getElementById('handlers-status').style.color = '#34d399';
    }
    
    // Call immediately - script is at bottom so DOM is ready
    attachHandlers();
    console.log('[SMOKE TEST] Initialization complete');
  </script>
</body>
</html>
    `);
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

  // APPSTORE: DELETE /api/account - Delete user account and all data (Guideline 5.1.1 v)
  app.delete('/api/account', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      logger.info("Account deletion requested", { userId });

      // Get user info before deletion
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // 1. Delete all subscriptions and their history
      const subscriptions = await storage.getSubscriptionsByUserId(userId);
      
      // 1a. Delete subscription history first (referencing subscription IDs)
      let historyCount = 0;
      for (const sub of subscriptions) {
        const deleted = await db.delete(subscriptionHistory).where(eq(subscriptionHistory.subscriptionId, sub.id));
        historyCount += deleted.rowCount || 0;
      }
      logger.info("Deleted subscription history", { userId, count: historyCount });

      // 1b. Delete subscriptions
      for (const sub of subscriptions) {
        await storage.deleteSubscription(sub.id);
      }
      logger.info("Deleted subscriptions", { userId, count: subscriptions.length });

      // 2. Delete all bank connections
      const bankConnections = await storage.getBankConnectionsByUserId(userId);
      for (const conn of bankConnections) {
        await storage.deleteBankConnection(conn.id);
      }
      logger.info("Deleted bank connections", { userId, count: bankConnections.length });

      // 3. Delete all detected subscriptions
      const detectedSubs = await storage.getDetectedSubscriptionsByUserId(userId);
      for (const detected of detectedSubs) {
        await storage.deleteDetectedSubscription(detected.id, userId);
      }
      logger.info("Deleted detected subscriptions", { userId, count: detectedSubs.length });

      // 4. Delete notification preferences
      await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, userId));
      logger.info("Deleted notification preferences", { userId });

      // 5. Cancel Stripe subscription if exists
      if (user.stripeSubscriptionId) {
        try {
          const stripe = (await import('stripe')).default;
          const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY!);
          await stripeClient.subscriptions.cancel(user.stripeSubscriptionId);
          logger.info("Cancelled Stripe subscription", { userId, subscriptionId: user.stripeSubscriptionId });
        } catch (error) {
          logger.error("Failed to cancel Stripe subscription", { userId, error });
          // Continue with deletion even if Stripe cancellation fails
        }
      }

      // 6. Delete user record (MUST BE LAST - removes user ID)
      const userDeleted = await storage.deleteUser(userId);
      if (!userDeleted) {
        throw new Error("Failed to delete user record");
      }
      logger.info("Deleted user record", { userId });

      // 9. Logout and destroy session
      req.logout(() => {
        req.session?.destroy((err: any) => {
          if (err) {
            logger.error("Error destroying session", { error: err });
          }
        });
      });

      res.json({ 
        message: "Account and all associated data have been permanently deleted",
        deleted: {
          subscriptions: subscriptions.length,
          subscriptionHistory: historyCount,
          bankConnections: bankConnections.length,
          detectedSubscriptions: detectedSubs.length,
          notificationPreferences: true,
          user: true,
        }
      });
    } catch (error) {
      logger.error("Error deleting account:", { error });
      res.status(500).json({ message: "Failed to delete account. Please contact support." });
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
  app.get("/api/subscriptions", requireAuth, async (req: any, res: any) => {
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
  app.get("/api/subscriptions/:id", requireAuth, async (req: any, res: any) => {
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
  app.post("/api/subscriptions", requireAuth, checkSubscriptionLimit, async (req: any, res: any) => {
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
  app.put("/api/subscriptions/:id", requireAuth, async (req: any, res: any) => {
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
  app.delete("/api/subscriptions/:id", requireAuth, async (req: any, res: any) => {
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
  app.post("/api/subscriptions/:id/cancel", requireAuth, async (req: any, res: any) => {
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

      // Check if already cancelled
      if (existing.status === "cancelled") {
        return res.status(400).json({ 
          error: "Subscription already cancelled",
          message: "This subscription has already been cancelled"
        });
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
  app.get("/api/subscriptions/:id/history", requireAuth, async (req: any, res: any) => {
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
  app.post("/api/subscriptions/import/upload", requireAuth, requireFeature("importData"), upload.single('file'), async (req: any, res: any) => {
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
  app.post("/api/subscriptions/import/confirm", requireAuth, requireFeature("importData"), async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;

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

      // Check subscription limit before importing
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const userPlan = user.plan as PricingTier;
      const userSubscriptions = await storage.getSubscriptionsByUserId(user.id);
      const activeCount = userSubscriptions.filter((s) => s.status === "active").length;
      const totalAfterImport = activeCount + subscriptionsToImport.length;

      if (isLimitReached(userPlan, "maxSubscriptions", totalAfterImport - 1)) {
        const limit = getLimit(userPlan, "maxSubscriptions");
        
        logger.warn("Import would exceed subscription limit", {
          userId: user.id,
          email: user.email,
          plan: userPlan,
          currentCount: activeCount,
          importCount: subscriptionsToImport.length,
          totalAfterImport,
          limit,
        });

        return res.status(403).json({
          error: "Subscription limit exceeded",
          message: `Importing ${subscriptionsToImport.length} subscription${subscriptionsToImport.length > 1 ? 's' : ''} would exceed your ${userPlan} plan limit of ${limit}. You currently have ${activeCount} active subscription${activeCount !== 1 ? 's' : ''}. Please upgrade your plan or reduce the number of subscriptions to import.`,
          currentPlan: userPlan,
          currentCount: activeCount,
          importCount: subscriptionsToImport.length,
          limit,
        });
      }

      // Insert all subscriptions with userId
      const createdSubscriptions = [];
      for (const subData of subscriptionsToImport) {
        const created = await storage.createSubscription({ ...subData, userId });
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

  // ===== Bank Statement Import Routes =====

  // Configure multer for bank statement uploads (larger limit for PDFs)
  const statementUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit for bank statements
    },
    fileFilter: (_req, file, cb) => {
      const allowedMimeTypes = [
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, CSV, and Excel files are allowed.'));
      }
    },
  });

  // POST /api/bank-statements/upload - Parse bank statement and detect subscriptions
  app.post("/api/bank-statements/upload", requireAuth, statementUpload.single('file'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileBuffer = req.file.buffer;
      const fileType = req.file.mimetype;
      let transactions: Array<{ date: string; merchant: string; amount: number }> = [];

      // Parse PDF
      if (fileType === 'application/pdf') {
        try {
          // Dynamic import for pdf-parse (CommonJS module)
          const pdfParseModule: any = await import('pdf-parse');
          const pdfParse = pdfParseModule.default || pdfParseModule;
          const pdfData = await pdfParse(fileBuffer);
          const text = pdfData.text;
          
          // Simple transaction pattern matching (this is a basic implementation)
          // In production, you'd want more sophisticated parsing based on bank formats
          const lines = text.split('\n');
          const transactionPattern = /(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+[\$\-]?([\d,]+\.\d{2})/;
          
          for (const line of lines) {
            const match = line.match(transactionPattern);
            if (match) {
              transactions.push({
                date: match[1],
                merchant: match[2].trim(),
                amount: Math.abs(parseFloat(match[3].replace(/,/g, ''))),
              });
            }
          }
        } catch (pdfError) {
          logger.error("Error parsing PDF", { error: pdfError });
          return res.status(400).json({ error: "Failed to parse PDF. Please try converting it to CSV format." });
        }
      }
      // Parse CSV
      else if (fileType === 'text/csv') {
        const csvText = fileBuffer.toString('utf-8');
        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase(),
        });
        
        for (const row of parsed.data as any[]) {
          const date = row.date || row.transaction_date || row['posting date'] || '';
          const merchant = row.description || row.merchant || row.name || row.payee || '';
          const amount = row.amount || row.debit || row['transaction amount'] || '0';
          
          if (date && merchant && amount) {
            transactions.push({
              date,
              merchant: merchant.trim(),
              amount: Math.abs(parseFloat(amount.toString().replace(/[\$,]/g, ''))),
            });
          }
        }
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
        
        for (const row of jsonData as any[]) {
          const normalizedRow: any = {};
          for (const key in row) {
            normalizedRow[key.trim().toLowerCase()] = row[key];
          }
          
          const date = normalizedRow.date || normalizedRow.transaction_date || normalizedRow['posting date'] || '';
          const merchant = normalizedRow.description || normalizedRow.merchant || normalizedRow.name || normalizedRow.payee || '';
          const amount = normalizedRow.amount || normalizedRow.debit || normalizedRow['transaction amount'] || '0';
          
          if (date && merchant && amount) {
            transactions.push({
              date,
              merchant: merchant.trim(),
              amount: Math.abs(parseFloat(amount.toString().replace(/[\$,]/g, ''))),
            });
          }
        }
      }

      if (transactions.length === 0) {
        return res.status(400).json({ error: "No transactions found in the statement" });
      }

      const userId = req.user!.claims.sub;
      // Detect recurring subscriptions from transactions
      const detectedSubs = await storage.detectSubscriptionsFromTransactions(userId, transactions as any);
      
      res.json({
        totalTransactions: transactions.length,
        detectedSubscriptions: detectedSubs,
      });
    } catch (error) {
      logger.error("Error parsing bank statement", { error });
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to parse bank statement" });
    }
  });

  // POST /api/bank-statements/confirm - Create subscriptions from selected detected ones
  app.post("/api/bank-statements/confirm", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;

      const schema = z.object({
        subscriptionIds: z.array(z.string()),
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      const { subscriptionIds } = result.data;

      if (subscriptionIds.length === 0) {
        return res.status(400).json({ error: "No subscriptions selected" });
      }

      // Create subscriptions from detected ones
      const createdSubscriptions = [];
      for (const detectedId of subscriptionIds) {
        const detected = await storage.getDetectedSubscription(detectedId, userId);
        if (!detected) continue;

        const nextRenewal = new Date();
        if (detected.detectedBillingCycle === "Monthly") {
          nextRenewal.setMonth(nextRenewal.getMonth() + 1);
        } else if (detected.detectedBillingCycle === "Quarterly") {
          nextRenewal.setMonth(nextRenewal.getMonth() + 3);
        } else {
          nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
        }

        const subscription = await storage.createSubscription({
          userId,
          name: detected.merchantName,
          cost: detected.estimatedCost.toString(),
          billingCycle: detected.detectedBillingCycle as "Monthly" | "Quarterly" | "Yearly",
          category: detected.category || "Other",
          nextRenewalDate: nextRenewal,
          notes: `Imported from bank statement (${detected.confidence}% confidence)`,
        });

        await storage.markDetectedSubscriptionAsConfirmed(detectedId, userId);
        createdSubscriptions.push(subscription);
      }

      res.status(201).json({
        success: true,
        created: createdSubscriptions.length,
        subscriptions: createdSubscriptions,
      });
    } catch (error) {
      logger.error("Error confirming bank statement subscriptions", { error });
      res.status(500).json({ error: "Failed to create subscriptions" });
    }
  });

  // ===== Plaid Bank Integration Routes =====

  // GET /api/create_link_token - Simplified route for vanilla JS frontend (no CSRF needed for GET)
  app.get("/api/create_link_token", requireAuth, checkBankConnectionLimit, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub || "demo-user-123"; // Fallback for testing
      const redirectUri = req.query.redirect_uri as string | undefined;
      const isMobileWebView = req.query.is_mobile_webview === 'true';
      const completionRedirectUri = req.query.completion_redirect_uri as string | undefined;
      
      // FIX: PLAID - Support native mobile app (React Native SDK)
      // Check if this is a native app request (from React Native)
      const isNativeApp = redirectUri === 'pockettrack://plaid-redirect' || 
                          req.get('User-Agent')?.includes('ReactNativeWebView');
      
      logger.info("[PLAID] Creating link token", { 
        userId: userId.substring(0, 8) + "...",
        hasRedirectUri: !!redirectUri,
        isMobileWebView,
        hasCompletionRedirectUri: !!completionRedirectUri,
        isNativeApp
      });
      
      // For native apps, use the native redirect URI directly
      const finalRedirectUri = isNativeApp ? 'pockettrack://plaid-redirect' : redirectUri;
      
      const linkToken = await createLinkToken(userId, {
        redirectUri: finalRedirectUri,
        isMobileWebView: isMobileWebView && !isNativeApp, // Only use WebView hosted link for browser WebViews
        completionRedirectUri: isMobileWebView && !isNativeApp ? completionRedirectUri : undefined
      });
      logger.info("[PLAID] Link token created successfully");
      res.json({ link_token: linkToken });
    } catch (error: any) {
      logger.error("[PLAID] Error creating link token", { 
        error: error.message,
        stack: error.stack?.split('\n')[0] 
      });
      if (error.message && error.message.includes('Plaid is not configured')) {
        return res.status(503).json({ 
          error: "Bank connections are not configured. Please add PLAID_CLIENT_ID and PLAID_SECRET to your deployment environment variables." 
        });
      }
      res.status(500).json({ error: "Failed to create link token" });
    }
  });

  // POST /api/exchange_public_token - Simplified route for vanilla JS frontend
  app.post("/api/exchange_public_token", requireAuth, checkBankConnectionLimit, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;
      const { public_token } = req.body;
      
      if (!public_token) {
        logger.warn("[PLAID] Missing public_token in request");
        return res.status(400).json({ error: "Missing public_token" });
      }

      logger.info("[PLAID] Exchanging public token", { userId: userId.substring(0, 8) + "..." });
      
      // Exchange public token for access token
      const { accessToken, itemId } = await exchangePublicToken(public_token);
      logger.info("[PLAID] Public token exchanged successfully", { itemId });
      
      // Fetch institution and account details from Plaid API
      const accountsData = await getAccounts(accessToken);
      const accounts = accountsData.map(acc => ({ id: acc.account_id, name: acc.name }));
      
      // Get institution details
      let institutionId = 'unknown';
      let institutionName = 'Unknown Bank';
      
      if (accountsData.length > 0) {
        const itemResponse = await plaidClient.itemGet({ access_token: accessToken });
        institutionId = itemResponse.data.item.institution_id || 'unknown';
        
        if (institutionId && institutionId !== 'unknown') {
          const institutionData = await getInstitution(institutionId);
          institutionName = institutionData.name;
        }
      }
      
      logger.info("[PLAID] Saving bank connection", { institutionName, accountCount: accounts.length });
      
      // Save bank connection (access token is encrypted in storage)
      const connection = await storage.createBankConnection({
        userId,
        institutionId,
        institutionName,
        accessToken,
        itemId,
        accountIds: accounts.map(a => a.id),
        lastSyncedAt: null,
      });
      
      logger.info("[PLAID] Bank connection saved successfully", { connectionId: connection.id });
      res.json({ status: "ok", connection });
    } catch (error: any) {
      logger.error("[PLAID] Error exchanging token", { 
        error: error.message,
        stack: error.stack?.split('\n')[0]
      });
      res.status(500).json({ error: "Failed to exchange token" });
    }
  });

  // POST /api/plaid/webhook - Plaid webhook handler
  app.post("/api/plaid/webhook", async (req, res) => {
    try {
      const webhookType = req.body.webhook_type;
      const webhookCode = req.body.webhook_code;
      const itemId = req.body.item_id;
      
      logger.info("[PLAID WEBHOOK] Received", { 
        type: webhookType, 
        code: webhookCode,
        itemId 
      });
      
      // Handle different webhook types
      if (webhookType === 'TRANSACTIONS') {
        logger.info("[PLAID WEBHOOK] Transaction webhook - sync required", { itemId });
        // Future: trigger background sync for this item
      } else if (webhookType === 'ITEM') {
        if (webhookCode === 'ERROR') {
          logger.error("[PLAID WEBHOOK] Item error", { 
            error: req.body.error,
            itemId 
          });
        } else {
          logger.info("[PLAID WEBHOOK] Item update", { code: webhookCode, itemId });
        }
      }
      
      // Always return 200 to acknowledge receipt
      res.status(200).json({ status: "received" });
    } catch (error: any) {
      logger.error("[PLAID WEBHOOK] Error processing webhook", { 
        error: error.message 
      });
      // Still return 200 to prevent Plaid from retrying
      res.status(200).json({ status: "error" });
    }
  });

  // Create Plaid Link token (existing route - keep for backwards compatibility)
  app.post("/api/plaid/create-link-token", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;
      const { redirect_uri, is_mobile_webview, completion_redirect_uri } = req.body;
      
      const linkToken = await createLinkToken(userId, {
        redirectUri: redirect_uri,
        isMobileWebView: is_mobile_webview,
        completionRedirectUri: completion_redirect_uri
      });
      res.json({ link_token: linkToken });
    } catch (error: any) {
      logger.error("Error creating link token", { error });
      // FIX: Provide clear error message when Plaid credentials are missing
      if (error.message && error.message.includes('Plaid is not configured')) {
        return res.status(503).json({ 
          error: "Bank connections are not configured. Please add PLAID_CLIENT_ID and PLAID_SECRET to your deployment environment variables." 
        });
      }
      res.status(500).json({ error: "Failed to create link token" });
    }
  });

  // Temporary storage for Hosted Link callbacks (keyed by user ID)
  // Cleared after WebView retrieves the result
  const hostedLinkCallbacks = new Map<string, any>();

  // Plaid Hosted Link completion callback
  // This endpoint handles the redirect from Plaid's Hosted Link
  app.get("/plaid/callback", requireAuth, (req: any, res: any) => {
    const userId = req.user?.claims?.sub;
    
    logger.info("[PLAID] Hosted Link callback received", { 
      userId: userId?.substring(0, 8) + "...",
      hasPublicToken: !!req.query.public_token,
      hasError: !!req.query.error,
      query: Object.keys(req.query)
    });
    
    // Extract parameters from query string
    const publicToken = req.query.public_token as string | undefined;
    const linkSessionId = req.query.link_session_id as string | undefined;
    const error = req.query.error as string | undefined;
    const errorMessage = req.query.error_message as string | undefined;
    
    // Store callback result server-side (keyed by user ID)
    // This survives the native browser → WebView boundary
    if (userId) {
      hostedLinkCallbacks.set(userId, {
        publicToken,
        error,
        errorMessage,
        linkSessionId,
        timestamp: Date.now()
      });
      logger.info("[PLAID] Stored callback result for user", { userId: userId.substring(0, 8) + "..." });
    }
    
    // Serve an HTML page that will communicate with the WebView
    // and close the native browser
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Plaid Link Complete</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            text-align: center;
            padding: 2rem;
          }
          .success-icon, .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 {
            margin: 0 0 0.5rem 0;
            font-size: 1.5rem;
            font-weight: 600;
          }
          p {
            margin: 0;
            opacity: 0.9;
          }
          .spinner {
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 1rem auto 0;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${publicToken ? `
            <div class="success-icon">✓</div>
            <h1>Bank Connected!</h1>
            <p>Returning to app...</p>
          ` : error ? `
            <div class="error-icon">✕</div>
            <h1>Connection ${error === 'user_exited' ? 'Cancelled' : 'Failed'}</h1>
            <p>${errorMessage || 'Please try again'}</p>
            <div class="spinner"></div>
          ` : `
            <h1>Processing...</h1>
            <div class="spinner"></div>
          `}
        </div>
        
        <script>
          // Try to communicate with React Native WebView
          if (window.ReactNativeWebView) {
            const data = {
              type: 'plaid_callback',
              publicToken: '${publicToken || ''}',
              error: '${error || ''}',
              errorMessage: '${errorMessage || ''}',
              linkSessionId: '${linkSessionId || ''}'
            };
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
          }
          
          // Try to communicate with Cordova/Capacitor
          if (window.cordova || window.Capacitor) {
            window.location.href = 'pockettrack://plaid-callback?public_token=${publicToken || ''}&error=${error || ''}';
          }
          
          // Auto-close after 2 seconds
          // Result is stored server-side and WebView will poll for it
          ${publicToken ? `
            setTimeout(() => {
              window.close();
              // If close doesn't work, try to navigate back
              if (!window.closed) {
                window.location.href = '/';
              }
            }, 2000);
          ` : error ? `
            // On error, close after 3 seconds
            setTimeout(() => {
              window.close();
              if (!window.closed) {
                window.location.href = '/';
              }
            }, 3000);
          ` : ''}
        </script>
      </body>
      </html>
    `);
  });

  // Check for pending Hosted Link callback (WebView polls this after returning from native browser)
  app.get("/api/plaid/callback-result", requireAuth, (req: any, res: any) => {
    const userId = req.user!.claims.sub;
    
    // Check if there's a pending callback for this user
    const callbackResult = hostedLinkCallbacks.get(userId);
    
    if (callbackResult) {
      // Clear the result after retrieving it (one-time use)
      hostedLinkCallbacks.delete(userId);
      
      logger.info("[PLAID] Callback result retrieved by WebView", { 
        userId: userId.substring(0, 8) + "...",
        hasPublicToken: !!callbackResult.publicToken 
      });
      
      return res.json({
        found: true,
        publicToken: callbackResult.publicToken,
        error: callbackResult.error,
        errorMessage: callbackResult.errorMessage,
        linkSessionId: callbackResult.linkSessionId
      });
    }
    
    // No callback pending
    res.json({ found: false });
  });

  // Exchange public token for access token and save bank connection
  app.post("/api/plaid/exchange-token", requireAuth, checkBankConnectionLimit, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;

      // Make institution/account details optional - backend fetches if not provided
      const schema = z.object({
        public_token: z.string(),
        institution_id: z.string().optional(),
        institution_name: z.string().optional(),
        accounts: z.array(z.object({
          id: z.string(),
          name: z.string(),
        })).optional(),
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      const { public_token, institution_id, institution_name, accounts } = result.data;
      
      // Exchange public token for access token
      const { accessToken, itemId } = await exchangePublicToken(public_token);
      
      // If institution details not provided, fetch from Plaid API
      let finalInstitutionId = institution_id;
      let finalInstitutionName = institution_name;
      let finalAccounts = accounts;
      
      if (!finalInstitutionId || !finalInstitutionName || !finalAccounts) {
        logger.info("Fetching institution and account details from Plaid API");
        
        // Fetch accounts to get institution_id
        const accountsData = await getAccounts(accessToken);
        finalAccounts = accountsData.map(acc => ({ id: acc.account_id, name: acc.name }));
        
        // Get institution details from first account's institution
        if (accountsData.length > 0 && accountsData[0].type) {
          // Get item to find institution_id
          const itemResponse = await plaidClient.itemGet({ access_token: accessToken });
          finalInstitutionId = itemResponse.data.item.institution_id || 'unknown';
          
          // Fetch institution name
          if (finalInstitutionId && finalInstitutionId !== 'unknown') {
            const institutionData = await getInstitution(finalInstitutionId);
            finalInstitutionName = institutionData.name;
          } else {
            finalInstitutionName = 'Unknown Bank';
          }
        }
      }
      
      const connection = await storage.createBankConnection({
        userId,
        institutionId: finalInstitutionId || 'unknown',
        institutionName: finalInstitutionName || 'Unknown Bank',
        accessToken,
        itemId,
        accountIds: finalAccounts ? finalAccounts.map(a => a.id) : [],
        lastSyncedAt: null,
      });
      
      res.json(connection);
    } catch (error) {
      logger.error("Error exchanging token", { error });
      res.status(500).json({ error: "Failed to exchange token" });
    }
  });

  // Get all bank connections
  app.get("/api/bank-connections", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;

      const connections = await storage.getBankConnectionsByUserId(userId);
      res.json(connections);
    } catch (error) {
      logger.error("Error fetching bank connections", { error });
      res.status(500).json({ error: "Failed to fetch bank connections" });
    }
  });

  // Sync transactions and detect subscriptions
  app.post("/api/bank-connections/:id/sync", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;

      const connection = await storage.getBankConnection(req.params.id);
      if (!connection) {
        return res.status(404).json({ error: "Bank connection not found" });
      }
      if (connection.userId !== userId) {
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

      const detectedSubs = await storage.detectSubscriptionsFromTransactions(userId, txnData.transactions);
      
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
  app.get("/api/detected-subscriptions", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;
      const detected = await storage.getDetectedSubscriptionsByUserId(userId);
      res.json(detected);
    } catch (error) {
      logger.error("Error fetching detected subscriptions", { error });
      res.status(500).json({ error: "Failed to fetch detected subscriptions" });
    }
  });

  // Confirm detected subscription (convert to real subscription)
  app.post("/api/detected-subscriptions/:id/confirm", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;
      const detected = await storage.getDetectedSubscription(req.params.id, userId);
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
        userId,
        name: detected.merchantName,
        cost: detected.estimatedCost.toString(),
        billingCycle: detected.detectedBillingCycle as "Monthly" | "Quarterly" | "Yearly",
        category: detected.category || "Other",
        nextRenewalDate: nextRenewal,
        notes: `Auto-detected from bank transactions (${detected.confidence}% confidence)`,
      });

      await storage.markDetectedSubscriptionAsConfirmed(req.params.id, userId);
      
      res.json(subscription);
    } catch (error) {
      logger.error("Error confirming detected subscription", { error, detectedId: req.params.id });
      res.status(500).json({ error: "Failed to confirm subscription" });
    }
  });

  // Dismiss detected subscription
  app.delete("/api/detected-subscriptions/:id", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;
      const deleted = await storage.deleteDetectedSubscription(req.params.id, userId);
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
  app.delete("/api/bank-connections/:id", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;

      // Verify ownership
      const existing = await storage.getBankConnection(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Bank connection not found" });
      }
      if (existing.userId !== userId) {
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
  app.get("/api/webhooks", requireAuth, requireFeature("webhooks"), async (req: any, res: any) => {
    try {
      const webhooks = await storage.getAllWebhooks();
      res.json(webhooks);
    } catch (error) {
      logger.error("Error fetching webhooks", { error });
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  // Create webhook
  app.post("/api/webhooks", requireAuth, requireFeature("webhooks"), async (req: any, res: any) => {
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
  app.put("/api/webhooks/:id", requireAuth, requireFeature("webhooks"), async (req: any, res: any) => {
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
  app.delete("/api/webhooks/:id", requireAuth, requireFeature("webhooks"), async (req: any, res: any) => {
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
  app.get("/api/notification-preferences", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;
      const prefs = await storage.getNotificationPreferences(userId);
      res.json(prefs || { userId, emailRenewalReminders: "true", reminderDaysBefore: "7", weeklyDigest: "false", cancelConfirmations: "true" });
    } catch (error) {
      logger.error("Error fetching notification preferences", { error });
      res.status(500).json({ error: "Failed to fetch notification preferences" });
    }
  });

  // Update notification preferences
  app.put("/api/notification-preferences", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;
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
  app.get("/api/user/plan", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;
      const limits = await getUserPlanLimits(userId);
      if (!limits) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(limits);
    } catch (error) {
      logger.error("Error fetching user plan limits", { error });
      res.status(500).json({ error: "Failed to fetch plan limits" });
    }
  });

  // POST /api/user/sync-plan - Manually sync user's plan from Stripe
  app.post("/api/user/sync-plan", requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.user!.claims.sub;
      logger.info("Manual plan sync requested", { userId });

      const user = await storage.getUser(userId);
      if (!user) {
        logger.error("User not found for plan sync", { userId });
        return res.status(404).json({ error: "User not found" });
      }

      // If user has no Stripe customer ID, they haven't made any purchases
      if (!user.stripeCustomerId) {
        logger.info("User has no Stripe customer ID, keeping free plan", { userId });
        return res.json({
          plan: user.plan,
          synced: false,
          message: "No payment history found. You are on the free plan.",
        });
      }

      logger.info("Fetching Stripe subscriptions for customer", {
        userId,
        customerId: user.stripeCustomerId,
      });

      // Fetch active subscriptions from Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
        limit: 10,
      });

      logger.info("Stripe subscriptions fetched", {
        userId,
        customerId: user.stripeCustomerId,
        count: subscriptions.data.length,
      });

      // Find the highest tier active subscription
      let newPlan = "free";
      let subscriptionId = null;

      for (const subscription of subscriptions.data) {
        // Check metadata for plan information
        const planId = subscription.metadata.planId;
        logger.info("Checking subscription", {
          userId,
          subscriptionId: subscription.id,
          planId,
          metadata: subscription.metadata,
        });

        if (planId === PRICING_TIERS.PRO) {
          newPlan = PRICING_TIERS.PRO;
          subscriptionId = subscription.id;
          break; // Pro is the highest, no need to check further
        } else if (planId === PRICING_TIERS.ESSENTIALS && newPlan === "free") {
          newPlan = PRICING_TIERS.ESSENTIALS;
          subscriptionId = subscription.id;
        }
      }

      logger.info("Determined plan from Stripe subscriptions", {
        userId,
        currentPlan: user.plan,
        newPlan,
        subscriptionId,
      });

      // Update user's plan if it changed
      if (newPlan !== user.plan || subscriptionId !== user.stripeSubscriptionId) {
        logger.info("Updating user plan", {
          userId,
          oldPlan: user.plan,
          newPlan,
          subscriptionId,
        });

        await storage.updateUserPlan(userId, newPlan);
        if (subscriptionId) {
          await storage.updateUserStripeInfo(
            userId,
            user.stripeCustomerId,
            subscriptionId
          );
        }

        logger.info("User plan synced successfully", {
          userId,
          plan: newPlan,
        });

        return res.json({
          plan: newPlan,
          synced: true,
          message: `Plan updated to ${newPlan}`,
          previousPlan: user.plan,
        });
      } else {
        logger.info("User plan already up to date", {
          userId,
          plan: newPlan,
        });

        return res.json({
          plan: newPlan,
          synced: false,
          message: "Plan already up to date",
        });
      }
    } catch (error) {
      logger.error("Error syncing user plan from Stripe", { error, userId: req.user?.claims?.sub });
      res.status(500).json({
        error: "Failed to sync plan",
        message: "An error occurred while syncing your plan. Please try again or contact support.",
      });
    }
  });

  // POST /api/create-checkout-session - Create Stripe Checkout session
  app.post("/api/create-checkout-session", requireAuth, async (req: any, res: any) => {
    try {
      logger.info("[STRIPE CHECKOUT] Creating checkout session", { 
        body: req.body,
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7)
      });

      const schema = z.object({
        planId: z.enum([PRICING_TIERS.ESSENTIALS, PRICING_TIERS.PRO]),
        billingInterval: z.enum(["monthly", "yearly"]),
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        logger.error("[STRIPE CHECKOUT] Validation failed", { error: fromZodError(result.error).toString() });
        return res.status(400).json({ error: fromZodError(result.error).toString() });
      }

      const { planId, billingInterval } = result.data;
      const userId = req.user!.claims.sub;
      const userEmail = req.user!.claims.email;
      
      logger.info("[STRIPE CHECKOUT] Validated request", { planId, billingInterval, userId });
      
      const user = await storage.getUser(userId);
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
          email: userEmail,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(userId, customerId);
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
              unit_amount: Math.round(amount * 100), // Convert to cents
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

      logger.info("[STRIPE WEBHOOK] Received webhook request", {
        hasSignature: !!sig,
        hasSecret: !!webhookSecret,
        headers: Object.keys(req.headers),
      });

      if (!sig) {
        logger.warn("[STRIPE WEBHOOK] Missing Stripe signature header");
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

        logger.info("[STRIPE WEBHOOK] Raw body received", {
          bodyLength: rawBody.length,
        });

        if (webhookSecret) {
          event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
          logger.info("[STRIPE WEBHOOK] Signature verified successfully");
        } else {
          // For development without webhook secret
          event = JSON.parse(rawBody.toString());
          logger.warn("[STRIPE WEBHOOK] Processing webhook without signature verification (development mode)");
        }

        logger.info("[STRIPE WEBHOOK] Event parsed", {
          type: event.type,
          id: event.id,
          created: event.created,
        });
      } catch (err: any) {
        logger.error("[STRIPE WEBHOOK] Signature verification failed", {
          error: err.message,
          stack: err.stack,
        });
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      try {
        logger.info("[STRIPE WEBHOOK] Processing event", {
          eventType: event.type,
          eventId: event.id,
        });

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.userId;
            const planId = session.metadata?.planId;

            logger.info("[STRIPE WEBHOOK] checkout.session.completed received", {
              userId,
              planId,
              customerId: session.customer,
              subscriptionId: session.subscription,
              sessionId: session.id,
              allMetadata: session.metadata,
              paymentStatus: session.payment_status,
              mode: session.mode,
            });

            if (!userId || !planId) {
              logger.error("Missing required metadata in checkout session", {
                hasUserId: !!userId,
                hasPlanId: !!planId,
                metadata: session.metadata,
              });
              break;
            }

            if (!session.customer) {
              logger.error("Missing customer in checkout session", {
                userId,
                planId,
                sessionId: session.id,
              });
              break;
            }

            try {
              // Update user's plan and Stripe info using userId from metadata
              logger.info("Updating user plan", { userId, planId });
              const updatedUser = await storage.updateUserPlan(userId, planId);
              
              if (!updatedUser) {
                logger.error("Failed to update user plan - user not found", {
                  userId,
                  planId,
                });
                break;
              }

              logger.info("User plan updated successfully", {
                userId,
                newPlan: updatedUser.plan,
                planId,
              });

              logger.info("Updating user Stripe info", {
                userId,
                customerId: session.customer,
                subscriptionId: session.subscription,
              });
              
              await storage.updateUserStripeInfo(
                userId,
                session.customer as string,
                session.subscription as string
              );
              
              logger.info("User plan activated successfully", {
                userId,
                plan: updatedUser.plan,
                subscriptionId: session.subscription,
              });

              // Auto-add PocketTrack subscription to user's account (idempotent)
              try {
                const plan = PLANS.find((p) => p.id === planId);
                const planName = plan?.name || planId;
                const subscriptionName = `PocketTrack ${planName}`;
                
                // Check if user already has a PocketTrack subscription (idempotency check)
                // Check ALL PocketTrack subscriptions (including cancelled ones) to prevent duplicates on resubscription
                const existingSubscriptions = await storage.getSubscriptionsByUserId(userId);
                const hasPocketTrackSub = existingSubscriptions.some(
                  (sub) => sub.name.startsWith("PocketTrack ")
                );
                
                if (!hasPocketTrackSub) {
                  // Get plan price for the subscription
                  const monthlyPrice = plan?.monthlyPrice || 0;
                  
                  // Calculate next renewal date (1 month from now)
                  const nextRenewalDate = new Date();
                  nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
                  
                  await storage.createSubscription({
                    userId,
                    name: subscriptionName,
                    cost: monthlyPrice.toString(),
                    billingCycle: "Monthly",
                    category: "Software",
                    nextRenewalDate,
                    notes: "Your PocketTrack subscription",
                  });
                  
                  logger.info("Auto-added PocketTrack subscription", {
                    userId,
                    subscriptionName,
                    cost: monthlyPrice,
                  });
                } else {
                  logger.info("PocketTrack subscription already exists, skipping auto-add", {
                    userId,
                    planName,
                  });
                }
              } catch (error) {
                // Non-critical error - log but don't fail the webhook
                logger.error("Failed to auto-add PocketTrack subscription", {
                  error,
                  userId,
                  planId,
                });
              }

              // Send payment confirmation email (non-blocking)
              const user = await storage.getUser(userId);
              if (user?.email) {
                const plan = PLANS.find((p) => p.id === planId);
                const planName = plan?.name || planId;
                
                const emailSent = await sendEmail({
                  to: user.email,
                  subject: `Welcome to PocketTrack ${planName}!`,
                  text: `Thank you for subscribing to PocketTrack ${planName}!\n\nYour subscription is now active and you have access to all ${planName} features.\n\nSubscription Details:\n- Plan: ${planName}\n- Subscription ID: ${session.subscription}\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\nThe PocketTrack Team`,
                  html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2>Welcome to PocketTrack ${planName}!</h2>
                      <p>Thank you for subscribing to PocketTrack ${planName}!</p>
                      <p>Your subscription is now active and you have access to all ${planName} features.</p>
                      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Subscription Details</h3>
                        <ul style="list-style: none; padding: 0;">
                          <li><strong>Plan:</strong> ${planName}</li>
                          <li><strong>Subscription ID:</strong> ${session.subscription}</li>
                        </ul>
                      </div>
                      <p>If you have any questions, please don't hesitate to reach out.</p>
                      <p>Best regards,<br>The PocketTrack Team</p>
                    </div>
                  `,
                });
                
                if (emailSent) {
                  logger.info("Payment confirmation email sent", {
                    userId,
                    email: user.email,
                    plan: planId,
                  });
                } else {
                  logger.warn("Payment confirmation email failed", {
                    userId,
                    email: user.email,
                    plan: planId,
                  });
                }
              }
            } catch (error) {
              logger.error("Error updating user plan or Stripe info", {
                error,
                userId,
                planId,
                customerId: session.customer,
              });
              break;
            }
            break;
          }

          case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            // Find user by Stripe customer ID
            const user = await storage.getUserByStripeCustomerId(customerId);
            if (user) {
              // Handle subscription status changes
              if (subscription.status === "active") {
                // Reactivate plan if it was paused
                logger.info("Subscription reactivated", {
                  customerId,
                  userId: user.id,
                  subscriptionId: subscription.id,
                });
              } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
                // Downgrade to free plan
                await storage.updateUserPlan(user.id, PRICING_TIERS.FREE);
                logger.info("Subscription canceled, downgraded to free", {
                  customerId,
                  userId: user.id,
                });
              }
            }
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            // Find user and downgrade to free plan
            const user = await storage.getUserByStripeCustomerId(customerId);
            if (user) {
              await storage.updateUserPlan(user.id, PRICING_TIERS.FREE);
              logger.info("Subscription deleted, downgraded to free", {
                customerId,
                userId: user.id,
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

  // ===== Subscription Templates Routes (Public - no auth required) =====
  
  // GET /api/templates - Get all subscription templates
  app.get("/api/templates", async (_req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      logger.error("Error fetching templates", { error });
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // GET /api/templates/search - Search templates
  app.get("/api/templates/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const templates = await storage.searchTemplates(query);
      res.json(templates);
    } catch (error) {
      logger.error("Error searching templates", { error, query: req.query.q });
      res.status(500).json({ error: "Failed to search templates" });
    }
  });

  // GET /api/templates/category/:category - Get templates by category
  app.get("/api/templates/category/:category", async (req, res) => {
    try {
      const templates = await storage.getTemplatesByCategory(req.params.category);
      res.json(templates);
    } catch (error) {
      logger.error("Error fetching templates by category", { error, category: req.params.category });
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // GET /api/templates/:id - Get single template
  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      logger.error("Error fetching template", { error, templateId: req.params.id });
      res.status(500).json({ error: "Failed to fetch template" });
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
