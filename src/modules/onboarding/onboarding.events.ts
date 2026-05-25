import { inngest } from "@/shared/inngest"
import { logger } from "@/shared/logger"
import { db } from "@/shared/db"
import { eq, and, inArray } from "drizzle-orm"
import { engagementOrgChart, engagementOrgChartActivity } from "@/shared/db/schemas/onboarding-chart.schema"
import { formTemplates } from "@/shared/db/schema"
import { customers } from "@/shared/db/schemas/customer.schema"
import { formsRepository } from "@/modules/forms/forms.repository"
import type { OnboardingPlan } from "./onboarding.types"

const log = logger.child({ module: "onboarding.events" })

// ---------------------------------------------------------------------------
// handleOnboardingPlanApproved
//
// Listens for engagement/onboarding-plan-approved and dispatches a form
// invitation for each PlannedFormSend in the plan.
//
// Strategy:
//   1. Batch-resolve all template IDs from Ironheart tenant by slug (single query)
//   2. For each send — skip if node already has formSendId (idempotency)
//   3. Look-up-or-create Customer row on CLIENT tenant (by email)
//   4. Call formsRepository.createInstance directly (bypasses service ctx requirement)
//   5. Set formSendId on the chart node
//   6. Log a batch-summary activity entry
// ---------------------------------------------------------------------------

export const handleOnboardingPlanApproved = inngest.createFunction(
  {
    id: "onboarding-plan-approved-send-forms",
    name: "Send form invitations when onboarding plan is approved",
    retries: 3,
  },
  { event: "engagement/onboarding-plan-approved" },
  async ({ event, step }) => {
    const { engagementId, tenantId } = event.data
    const plan = event.data.plan as OnboardingPlan

    if (!plan?.sends || plan.sends.length === 0) {
      log.info({ engagementId }, "Empty plan; no form sends required")
      return { sent: 0, skipped: 0, errors: 0 }
    }

    const ironheartTenantId = process.env.IRONHEART_TENANT_ID
    if (!ironheartTenantId) {
      throw new Error("IRONHEART_TENANT_ID not set — cannot resolve form templates")
    }

    // ── Step 1: batch-fetch all templates by slug ─────────────────────────
    // Returns BOTH master library templates (engagementId IS NULL) and any
    // engagement-scoped clones for THIS engagement. We then prefer the
    // engagement-scoped clone per slug if one exists.
    const templateRows = await step.run("fetch-templates", async () => {
      const slugs = [...new Set(plan.sends.map((s) => s.templateSlug))]
      return await db
        .select({ id: formTemplates.id, slug: formTemplates.slug, engagementId: formTemplates.engagementId })
        .from(formTemplates)
        .where(
          and(
            eq(formTemplates.tenantId, ironheartTenantId),
            inArray(formTemplates.slug, slugs as [string, ...string[]])
          )
        )
    })

    const templateBySlug = new Map<string, string>()
    for (const row of templateRows as Array<{ id: string; slug: string | null; engagementId: string | null }>) {
      if (!row.slug) continue
      const isScoped = row.engagementId === engagementId
      const existing = templateBySlug.get(row.slug)
      // Prefer engagement-scoped clone. If no scoped one yet OR the existing entry
      // is the master (we can detect indirectly by re-checking the source), overwrite.
      // Simpler rule: scoped row always wins. Master row only writes if no entry yet.
      if (isScoped) {
        templateBySlug.set(row.slug, row.id)
      } else if (!existing) {
        templateBySlug.set(row.slug, row.id)
      }
    }

    let sent = 0
    let skipped = 0
    let errors = 0

    // ── Step 2–5: process each PlannedFormSend ────────────────────────────
    for (const send of plan.sends) {
      // ── idempotency check ──────────────────────────────────────────────
      const existingNode = await step.run(`check-node-${send.nodeId}`, async () => {
        const rows = await db
          .select({ formSendId: engagementOrgChart.formSendId })
          .from(engagementOrgChart)
          .where(eq(engagementOrgChart.id, send.nodeId))
          .limit(1)
        return rows[0] ?? null
      })

      if (existingNode?.formSendId) {
        log.info({ nodeId: send.nodeId }, "Form already sent for node; skipping")
        skipped++
        continue
      }

      // ── template lookup ────────────────────────────────────────────────
      const templateId = templateBySlug.get(send.templateSlug)
      if (!templateId) {
        log.error({ slug: send.templateSlug, nodeId: send.nodeId }, "Template slug not found in Ironheart tenant")
        errors++
        continue
      }

      try {
        // ── customer look-up or create on client tenant ────────────────
        const customerId = await step.run(`resolve-customer-${send.nodeId}`, async () => {
          const existing = await db
            .select({ id: customers.id })
            .from(customers)
            .where(
              and(
                eq(customers.tenantId, tenantId),
                eq(customers.email, send.contactEmail)
              )
            )
            .limit(1)

          if (existing[0]) return existing[0].id

          const nameParts = send.contactName.trim().split(/\s+/)
          const firstName = nameParts[0] ?? send.contactName
          const lastName = nameParts.slice(1).join(" ") || ""
          const now = new Date()

          const [created] = await db
            .insert(customers)
            .values({
              id: crypto.randomUUID(),
              tenantId,
              firstName,
              lastName,
              email: send.contactEmail,
              country: "GB",
              marketingOptIn: false,
              status: "ACTIVE",
              createdAt: now,
              updatedAt: now,
              version: 1,
            })
            .returning({ id: customers.id })

          log.info(
            { tenantId, email: send.contactEmail },
            "Created customer for form send"
          )
          return created.id
        })

        // ── create form instance (bypass service — no ctx in Inngest) ──
        const formInstance = await step.run(`send-form-${send.nodeId}`, async () => {
          const sessionKey = crypto.randomUUID()
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

          return await formsRepository.createInstance({
            tenantId: ironheartTenantId,
            templateId,
            bookingId: null,
            customerId,
            sessionKey,
            status: "PENDING",
            responses: null,
            signature: null,
            completedAt: null,
            expiresAt,
          })
        })

        // ── link formSendId back to chart node ─────────────────────────
        await step.run(`link-form-send-${send.nodeId}`, async () => {
          await db
            .update(engagementOrgChart)
            .set({ formSendId: (formInstance as { id: string }).id })
            .where(eq(engagementOrgChart.id, send.nodeId))
        })

        log.info(
          { nodeId: send.nodeId, formInstanceId: (formInstance as { id: string }).id, email: send.contactEmail },
          "Form invitation sent"
        )
        sent++
      } catch (err) {
        log.error({ err, nodeId: send.nodeId, email: send.contactEmail }, "Form send failed")
        errors++
      }
    }

    // ── Step 6: log batch-summary activity ───────────────────────────────
    await step.run("log-activity", async () => {
      const message =
        `Sent ${sent} form invitation${sent === 1 ? "" : "s"}` +
        (skipped > 0 ? `, skipped ${skipped} already-sent` : "") +
        (errors > 0 ? `, ${errors} failed` : "")

      await db.insert(engagementOrgChartActivity).values({
        engagementId,
        nodeId: null,
        actorType: "SYSTEM",
        actorId: null,
        actorName: "Onboarding bot",
        action: "forms.sent",
        fromValue: null,
        toValue: { sent, skipped, errors, total: plan.sends.length },
        message,
      })
    })

    log.info({ engagementId, sent, skipped, errors }, "Plan approval send batch complete")
    return { sent, skipped, errors }
  }
)

export const onboardingFunctions = [handleOnboardingPlanApproved]
