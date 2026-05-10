import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "audit-workspace.events" });

export const onSessionCreated = inngest.createFunction(
  { id: "audit-workspace/on-session-created", name: "Handle audit session created" },
  { event: "audit-workspace/session-created" },
  async ({ event, step }) => {
    const { auditSessionId, engagementId } = event.data;
    log.info({ auditSessionId, engagementId }, "audit session created event received");
    return { processed: true };
  }
);

export const auditWorkspaceFunctions = [onSessionCreated];
