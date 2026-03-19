import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "customer.events" });

/**
 * Inngest function that handles customer pipeline stage transitions.
 * Logs the transition for auditing; can be extended to trigger notifications or workflows.
 */
const onStageChanged = inngest.createFunction(
  { id: "customer-stage-changed", retries: 3 },
  { event: "customer/stage.changed" },
  async ({ event }) => {
    const { customerId, tenantId, fromStage, toStage, dealValue } = event.data;

    log.info(
      { customerId, tenantId, fromStage, toStage, dealValue },
      "Customer pipeline stage changed"
    );
  }
);

/** All customer Inngest functions - register in src/app/api/inngest/route.ts */
export const customerFunctions = [onStageChanged];
