import crypto from "node:crypto";
import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";
import { clientPortalRepository } from "./client-portal.repository";

const log = logger.child({ module: "client-portal.events" });

const onProposalSent = inngest.createFunction(
  { id: "portal-proposal-sent", retries: 3 },
  { event: "portal/proposal:sent" },
  async ({ event, step }) => {
    const { proposalId, customerId, tenantId } = event.data;
    log.info({ proposalId, customerId, tenantId }, "Handling proposal sent - send email to client");
    // TODO: Send proposal email with magic link via notification module
  }
);

const onProposalApproved = inngest.createFunction(
  { id: "portal-proposal-approved", retries: 3 },
  { event: "portal/proposal:approved" },
  async ({ event, step }) => {
    const { proposalId, customerId, tenantId } = event.data;
    log.info({ proposalId, customerId, tenantId }, "Handling proposal approved - notify admin, send confirmation");
    // TODO: Send confirmation email to client + notify Luke
  }
);

const onProposalDeclined = inngest.createFunction(
  { id: "portal-proposal-declined", retries: 3 },
  { event: "portal/proposal:declined" },
  async ({ event, step }) => {
    const { proposalId, tenantId, feedback } = event.data;
    log.info({ proposalId, tenantId, feedback }, "Handling proposal declined - notify admin");
    // TODO: Notify Luke with optional feedback
  }
);

const onDeliverableShared = inngest.createFunction(
  { id: "portal-deliverable-shared", retries: 3 },
  { event: "portal/deliverable:shared" },
  async ({ event, step }) => {
    const { deliverableId, customerId, tenantId } = event.data;
    log.info({ deliverableId, customerId, tenantId }, "Handling deliverable shared - email client");
    // TODO: Send deliverable notification email with portal link
  }
);

const onApprovalRequested = inngest.createFunction(
  { id: "portal-approval-requested", retries: 3 },
  { event: "portal/approval:requested" },
  async ({ event, step }) => {
    const { approvalId, customerId, tenantId } = event.data;
    log.info({ approvalId, customerId, tenantId }, "Handling approval requested - email client");
    // TODO: Send approval request email with approve/reject links
  }
);

const onApprovalResponded = inngest.createFunction(
  { id: "portal-approval-responded", retries: 3 },
  { event: "portal/approval:responded" },
  async ({ event, step }) => {
    const { approvalId, tenantId, approved } = event.data;
    log.info({ approvalId, tenantId, approved }, "Handling approval response - notify admin");
    // TODO: Notify Luke of client response
  }
);

const onInvoiceSent = inngest.createFunction(
  { id: "portal-invoice-sent", retries: 3 },
  { event: "portal/invoice:sent" },
  async ({ event, step }) => {
    const { invoiceId, customerId, tenantId } = event.data;
    log.info({ invoiceId, customerId, tenantId }, "Handling invoice sent - email client");
    // TODO: Send invoice email with pay link
  }
);

const onInvoicePaid = inngest.createFunction(
  { id: "portal-invoice-paid", retries: 3 },
  { event: "portal/invoice:paid" },
  async ({ event, step }) => {
    const { invoiceId, tenantId } = event.data;
    log.info({ invoiceId, tenantId }, "Handling invoice paid - notify admin");
    // TODO: Notify Luke of payment
  }
);

const onInvoiceOverdue = inngest.createFunction(
  { id: "portal-invoice-overdue", retries: 3 },
  { event: "portal/invoice:overdue" },
  async ({ event, step }) => {
    const { invoiceId, customerId, tenantId } = event.data;
    log.info({ invoiceId, customerId, tenantId }, "Handling invoice overdue - send reminder");
    // TODO: Send overdue reminder email to client
  }
);

const dailyInvoiceCheck = inngest.createFunction(
  { id: "portal-daily-invoice-check", retries: 3 },
  { cron: "0 9 * * *" },
  async ({ step, logger }) => {
    // 1. Generate recurring invoices
    await step.run("generate-recurring-invoices", async () => {
      const rules = await clientPortalRepository.findActiveRecurringRules();

      for (const rule of rules) {
        const lastInvoice = await clientPortalRepository.findLastInvoiceForRule(rule.id);
        const now = new Date();
        let isDue = false;

        if (!lastInvoice) {
          isDue = true;
        } else {
          const daysSinceLastInvoice = Math.floor(
            (now.getTime() - lastInvoice.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (rule.recurringInterval === "MONTHLY" && daysSinceLastInvoice >= 30) isDue = true;
          if (rule.recurringInterval === "QUARTERLY" && daysSinceLastInvoice >= 90) isDue = true;
        }

        if (isDue) {
          const invoiceNumber = await clientPortalRepository.getNextInvoiceNumber(rule.tenantId);
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 14);

          await clientPortalRepository.createInvoiceBulk([{
            engagementId: rule.engagementId,
            amount: rule.amount,
            description: rule.label,
            dueDate,
            token: crypto.randomUUID(),
            sourcePaymentRuleId: rule.id,
            invoiceNumber,
          }]);

          logger.info({ ruleId: rule.id, engagementId: rule.engagementId }, "Recurring invoice generated");
        }
      }
    });

    // 2. Detect and mark overdue invoices
    await step.run("detect-overdue-invoices", async () => {
      const overdueInvoices = await clientPortalRepository.findOverdueInvoices();

      for (const invoice of overdueInvoices) {
        await clientPortalRepository.updateInvoice(invoice.id, { status: "OVERDUE" });

        await inngest.send({
          name: "portal/invoice:overdue",
          data: {
            invoiceId: invoice.id,
            engagementId: invoice.engagementId,
            customerId: invoice.customerId,
            tenantId: invoice.tenantId,
          },
        });

        logger.info({ invoiceId: invoice.id }, "Invoice marked overdue");
      }
    });
  }
);

/** All client-portal Inngest functions - register in src/app/api/inngest/route.ts */
export const clientPortalFunctions = [
  onProposalSent,
  onProposalApproved,
  onProposalDeclined,
  onDeliverableShared,
  onApprovalRequested,
  onApprovalResponded,
  onInvoiceSent,
  onInvoicePaid,
  onInvoiceOverdue,
  dailyInvoiceCheck,
];
