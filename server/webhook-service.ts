import logger from "./logger";
import type { Subscription, Webhook } from "@shared/schema";

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    subscription?: Subscription;
    [key: string]: any;
  };
}

export async function triggerWebhooks(event: string, data: any, webhooks: Webhook[]): Promise<void> {
  try {
    const relevantWebhooks = webhooks.filter(
      (webhook) => webhook.enabled === "true" && webhook.events.includes(event)
    );

    if (relevantWebhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const webhookPromises = relevantWebhooks.map(async (webhook) => {
      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(webhook.secret && { "X-Webhook-Secret": webhook.secret }),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          logger.warn(`Webhook ${webhook.id} failed with status ${response.status}`, {
            webhookId: webhook.id,
            url: webhook.url,
            event,
            status: response.status,
          });
        } else {
          logger.info(`Webhook ${webhook.id} triggered successfully`, {
            webhookId: webhook.id,
            event,
          });
          await storage.updateWebhookLastTriggered(webhook.id);
        }
      } catch (error) {
        logger.error(`Error triggering webhook ${webhook.id}`, {
          webhookId: webhook.id,
          url: webhook.url,
          event,
          error,
        });
      }
    });

    await Promise.allSettled(webhookPromises);
  } catch (error) {
    logger.error("Error in triggerWebhooks", { event, error });
  }
}
