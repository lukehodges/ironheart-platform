import { inngest } from "@/shared/inngest";
import { subscriptionService } from "./subscription.service";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "subscription.events" });

export const handleCheckoutCompleted = inngest.createFunction(
  { id: "subscription-checkout-completed" },
  { event: "subscription/checkout.completed" },
  async ({ event, step }) => {
    await step.run("provision-tenant", async () => {
      await subscriptionService.handleCheckoutCompleted(event.data);
    });
    log.info({ email: event.data.email }, "Checkout completed handler finished");
  }
);

export const handlePaymentFailed = inngest.createFunction(
  { id: "subscription-payment-failed" },
  { event: "subscription/payment.failed" },
  async ({ event, step }) => {
    await step.run("handle-failed-payment", async () => {
      await subscriptionService.handlePaymentFailed(event.data);
    });
  }
);

export const handleSubscriptionCancelled = inngest.createFunction(
  { id: "subscription-cancelled" },
  { event: "subscription/cancelled" },
  async ({ event, step }) => {
    await step.run("suspend-tenant", async () => {
      await subscriptionService.handleSubscriptionCancelled(event.data);
    });
  }
);

export const subscriptionFunctions = [
  handleCheckoutCompleted,
  handlePaymentFailed,
  handleSubscriptionCancelled,
];
