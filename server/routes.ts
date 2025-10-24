import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubscriptionSchema, cancelSubscriptionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { createLinkToken, exchangePublicToken, getTransactions, getAccounts, getInstitution } from "./plaid";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all subscriptions
  app.get("/api/subscriptions", async (_req, res) => {
    try {
      const subscriptions = await storage.getAllSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
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
      console.error("Error fetching subscription:", error);
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
      console.error("Error creating subscription:", error);
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
      console.error("Error updating subscription:", error);
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
      console.error("Error deleting subscription:", error);
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
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Get subscription history
  app.get("/api/subscriptions/:id/history", async (req, res) => {
    try {
      const history = await storage.getSubscriptionHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching subscription history:", error);
      res.status(500).json({ error: "Failed to fetch subscription history" });
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
      console.error("Error creating link token:", error);
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
      console.error("Error exchanging token:", error);
      res.status(500).json({ error: "Failed to exchange token" });
    }
  });

  // Get all bank connections
  app.get("/api/bank-connections", async (_req, res) => {
    try {
      const connections = await storage.getAllBankConnections();
      res.json(connections);
    } catch (error) {
      console.error("Error fetching bank connections:", error);
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
      console.error("Error syncing transactions:", error);
      res.status(500).json({ error: "Failed to sync transactions" });
    }
  });

  // Get detected subscriptions
  app.get("/api/detected-subscriptions", async (_req, res) => {
    try {
      const detected = await storage.getDetectedSubscriptions();
      res.json(detected);
    } catch (error) {
      console.error("Error fetching detected subscriptions:", error);
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
      console.error("Error confirming detected subscription:", error);
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
      console.error("Error dismissing detected subscription:", error);
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
      console.error("Error deleting bank connection:", error);
      res.status(500).json({ error: "Failed to delete bank connection" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
