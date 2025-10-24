import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSubscriptionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

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

  const httpServer = createServer(app);
  return httpServer;
}
