import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";
import { render } from "@react-email/render";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { engagements } from "@/shared/db/schemas/client-portal.schema";
import { customers } from "@/shared/db/schemas/customer.schema";
import { users } from "@/shared/db/schemas/auth.schema";
import { tenants } from "@/shared/db/schemas/tenant.schema";
import { ReportPublishedEmail } from "@/modules/notification/templates/email/report-published";
import { ProposalRequestedEmail } from "@/modules/notification/templates/email/proposal-requested";
import { reportGeneratorService } from "./report-generator.service";

const log = logger.child({ module: "report-generator.events" });

export const onReportPublished = inngest.createFunction(
  { id: "report-generator/on-report-published", name: "Handle report published" },
  { event: "report-generator/report-published" },
  async ({ event, step }) => {
    const { reportId, engagementId } = event.data;
    log.info({ reportId, engagementId }, "report published — client notification will be sent");
    // Future: send notification to client, update engagement stage to REPORTING
    return { processed: true };
  }
);

/**
 * Async AI draft generator.
 * Triggered by report/generate event — runs Claude claude-opus-4-7 with
 * cached system prompt, produces executive summary + lens narratives.
 * retries: 1 — Claude calls are expensive; one retry on transient failure is enough.
 */
export const handleReportGenerate = inngest.createFunction(
  {
    id: "report-generator/handle-report-generate",
    name: "Generate AI report draft",
    retries: 1,
  },
  { event: "report/generate" },
  async ({ event, step }) => {
    const { engagementId, tenantId, generatedBy } = event.data;

    const report = await step.run("generate-ai-draft", async () => {
      return reportGeneratorService.generateDraft({ engagementId, tenantId, generatedBy });
    });

    log.info({ reportId: report.id, engagementId }, "AI report draft complete");
    return { reportId: report.id, status: report.status };
  }
);

/**
 * When a consultant publishes a report, send a branded email to the
 * engagement's primary contact linking to their client portal report page.
 *
 * Emitted by: reportGeneratorService.transitionStatus (Phase 0.4)
 * Event: "report/published"
 */
export const handleReportPublished = inngest.createFunction(
  {
    id: "report-generator/handle-report-published",
    name: "Notify client when report is published",
    retries: 2,
  },
  { event: "report/published" },
  async ({ event, step }) => {
    const { engagementId, tenantId } = event.data;

    const eng = await step.run("load-engagement", () =>
      db.query.engagements.findFirst({ where: eq(engagements.id, engagementId) })
    );
    if (!eng) throw new Error(`Engagement ${engagementId} not found`);

    const customer = await step.run("load-customer", () =>
      db.query.customers.findFirst({ where: eq(customers.id, eng.customerId) })
    );
    if (!customer?.email) {
      log.warn({ engagementId }, "report-published: customer has no email — skipping notification");
      return { skipped: true, reason: "no_email" };
    }

    const tenant = await step.run("load-tenant", () =>
      db.query.tenants.findFirst({
        where: eq(tenants.id, eng.clientTenantId ?? tenantId),
      })
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const reportUrl = tenant?.slug
      ? `${appUrl}/${tenant.slug}/dashboard/report`
      : `${appUrl}/dashboard/report`;

    const props = {
      recipientFirstName: customer.firstName,
      engagementTitle: eng.title,
      reportUrl,
      companyName: tenant?.name ?? customer.firstName,
    };

    const html = await step.run("render-email", () =>
      render(ReportPublishedEmail(props))
    );
    const text = await step.run("render-email-text", () =>
      render(ReportPublishedEmail(props), { plainText: true })
    );

    await step.run("send-email", () =>
      inngest.send({
        name: "notification/send.email",
        data: {
          to: customer.email!,
          subject: `Your audit report is ready — ${eng.title}`,
          html,
          text,
          tenantId,
          trigger: "REPORT_PUBLISHED",
        },
      })
    );

    log.info({ engagementId, to: customer.email }, "report-published: email event emitted");
    return { sent: true, to: customer.email };
  }
);

/**
 * When a client clicks "Request implementation proposal" on their report view,
 * notify the platform admin (Luke) so they can respond within 2 business days.
 *
 * Emitted by: clientRequestProposal tRPC mutation (Phase 0.5 Task 2)
 * Event: "engagement/proposal-requested"
 */
export const handleProposalRequested = inngest.createFunction(
  {
    id: "report-generator/handle-proposal-requested",
    name: "Notify consultant when client requests proposal",
    retries: 2,
  },
  { event: "engagement/proposal-requested" },
  async ({ event, step }) => {
    const { engagementId, requestedByEmail, notes } = event.data;

    const adminUser = await step.run("load-platform-admin", () =>
      db.query.users.findFirst({ where: eq(users.isPlatformAdmin, true) })
    );

    if (!adminUser?.email) {
      log.warn({ engagementId }, "proposal-requested: no platform admin with email — skipping notification");
      return { skipped: true, reason: "no_admin_email" };
    }

    const eng = await step.run("load-engagement", () =>
      db.query.engagements.findFirst({ where: eq(engagements.id, engagementId) })
    );
    if (!eng) throw new Error(`Engagement ${engagementId} not found`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const engagementDetailUrl = `${appUrl}/platform/clients/${engagementId}`;

    const props = {
      recipientFirstName: adminUser.firstName,
      engagementTitle: eng.title,
      clientEmail: requestedByEmail ?? "unknown",
      clientNotes: notes,
      engagementDetailUrl,
    };

    const html = await step.run("render-email", () =>
      render(ProposalRequestedEmail(props))
    );
    const text = await step.run("render-email-text", () =>
      render(ProposalRequestedEmail(props), { plainText: true })
    );

    await step.run("send-email", () =>
      inngest.send({
        name: "notification/send.email",
        data: {
          to: adminUser.email!,
          subject: `Client requested implementation proposal — ${eng.title}`,
          html,
          text,
          tenantId: eng.tenantId,
          trigger: "PROPOSAL_REQUESTED",
        },
      })
    );

    log.info({ engagementId, to: adminUser.email }, "proposal-requested: email event emitted");
    return { sent: true, to: adminUser.email };
  }
);

export const reportGeneratorFunctions = [
  onReportPublished,
  handleReportGenerate,
  handleReportPublished,
  handleProposalRequested,
];
