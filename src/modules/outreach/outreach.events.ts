import { inngest } from "@/shared/inngest"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "outreach.events" })

const onActivityLogged = inngest.createFunction(
  { id: "outreach-activity-logged", retries: 3 },
  { event: "outreach/activity.logged" },
  async ({ event }) => {
    const { contactId, sequenceId, customerId, activityType, sector, tenantId } = event.data
    log.info({ contactId, sequenceId, customerId, activityType, sector, tenantId }, "Outreach activity logged")
    // Future: fan-out to workflow engine via inngest.send("workflow/trigger", ...)
  }
)

const onContactConverted = inngest.createFunction(
  { id: "outreach-contact-converted", retries: 3 },
  { event: "outreach/contact.converted" },
  async ({ event }) => {
    const { contactId, customerId, sequenceId, pipelineMemberId, tenantId } = event.data
    log.info({ contactId, customerId, sequenceId, pipelineMemberId, tenantId }, "Outreach contact converted to pipeline deal")
  }
)

const checkSnoozedContacts = inngest.createFunction(
  { id: "outreach-check-snoozed", retries: 2 },
  { cron: "0 6 * * *" }, // Daily at 6am UTC (Inngest default timezone)
  async () => {
    const { outreachService } = await import("./outreach.service")
    const count = await outreachService.reactivateSnoozedContacts()
    log.info({ reactivatedCount: count }, "Checked snoozed outreach contacts")
    return { reactivatedCount: count }
  }
)

export const outreachFunctions = [onActivityLogged, onContactConverted, checkSnoozedContacts]
