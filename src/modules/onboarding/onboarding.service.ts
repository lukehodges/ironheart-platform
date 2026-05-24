import { onboardingRepository } from "./onboarding.repository"
import type {
  AuditTier,
  OnboardingPlan,
  OnboardingStatus,
  OrgChartNodeRecord,
  PlannedFormSend,
  InterviewMode,
  OrgChartNodeType,
} from "./onboarding.types"
import { db } from "@/shared/db"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { customers } from "@/shared/db/schemas/customer.schema"
import { eq } from "drizzle-orm"
import { inngest } from "@/shared/inngest"
import { logger } from "@/shared/logger"
import { NotFoundError, ValidationError } from "@/shared/errors"

const log = logger.child({ module: "onboarding.service" })

// ============================================================
// TIER RESOLVER (D-04 — suggests defaults, doesn't auto-fire)
// ============================================================

export function resolveTier(teamSize: number | null): AuditTier {
  if (teamSize == null || teamSize < 5) return "MICRO"
  if (teamSize <= 15) return "SMALL"
  if (teamSize <= 50) return "MID"
  return "LARGE"
}

// ============================================================
// KEYWORD-BASED TEMPLATE MAPPING (moved from consulting module)
// ============================================================

interface QuestionnaireMapping {
  roleKeywords: string[]
  templateSlug: string
}

export const DEFAULT_QUESTIONNAIRE_MAPPINGS: QuestionnaireMapping[] = [
  { roleKeywords: ["owner", "director", "ceo", "founder", "managing"], templateSlug: "questionnaire-owner-director" },
  { roleKeywords: ["finance", "admin", "accounts", "bookkeeper", "accountant"], templateSlug: "questionnaire-finance-admin" },
  { roleKeywords: ["sales", "marketing", "bd", "business dev", "growth"], templateSlug: "questionnaire-sales-marketing" },
  { roleKeywords: ["operations", "ops", "delivery", "manager"], templateSlug: "questionnaire-operations" },
]

export const TEAM_MEMBER_TEMPLATE_SLUG = "questionnaire-team-member"
export const QUICK_PULSE_TEMPLATE_SLUG = "questionnaire-quick-pulse"
export const OWNER_TEMPLATE_SLUG = "questionnaire-owner-director"

export function matchQuestionnaireTemplate(role: string): string {
  const roleLower = role.toLowerCase()
  for (const mapping of DEFAULT_QUESTIONNAIRE_MAPPINGS) {
    if (mapping.roleKeywords.some((kw) => roleLower.includes(kw))) {
      return mapping.templateSlug
    }
  }
  return TEAM_MEMBER_TEMPLATE_SLUG
}

export function mapNodeToTemplate(node: {
  templateSlugOverride: string | null
  contactRole: string | null
  label: string
}): string {
  if (node.templateSlugOverride) return node.templateSlugOverride
  if (node.contactRole) return matchQuestionnaireTemplate(node.contactRole)
  return matchQuestionnaireTemplate(node.label)
}

// ============================================================
// CHART SEEDING — idempotent
// ============================================================

interface SeedNode {
  label: string
  type: OrgChartNodeType
  interviewMode: InterviewMode
  headcount?: number
  sampleSize?: number
  children?: SeedNode[]
}

function seedTemplateForTier(tier: AuditTier, companyLabel: string, teamSize: number | null): SeedNode {
  const root: SeedNode = {
    label: companyLabel,
    type: "DEPARTMENT",
    interviewMode: "OWNER_ONLY",
    headcount: teamSize ?? undefined,
    children: [],
  }

  if (tier === "MICRO") {
    root.children = [
      { label: "Owner / Founder", type: "PERSON", interviewMode: "ALL" },
      { label: "Other team", type: "DEPARTMENT", interviewMode: "OWNER_ONLY" },
    ]
  } else if (tier === "SMALL") {
    root.children = [
      { label: "Owner / Founder", type: "PERSON", interviewMode: "ALL" },
      { label: "Operations", type: "DEPARTMENT", interviewMode: "ALL" },
      { label: "Finance", type: "DEPARTMENT", interviewMode: "ALL" },
      { label: "Sales / Marketing", type: "DEPARTMENT", interviewMode: "ALL" },
      { label: "Other staff", type: "DEPARTMENT", interviewMode: "SAMPLE", sampleSize: 2 },
    ]
  } else if (tier === "MID") {
    root.children = [
      { label: "Owner / Founder", type: "PERSON", interviewMode: "ALL" },
      { label: "Operations", type: "DEPARTMENT", interviewMode: "ALL" },
      { label: "Finance", type: "DEPARTMENT", interviewMode: "ALL" },
      { label: "Sales / Marketing", type: "DEPARTMENT", interviewMode: "ALL" },
      { label: "Other staff", type: "DEPARTMENT", interviewMode: "SAMPLE", sampleSize: 3 },
    ]
  } else {
    root.children = [
      { label: "Owner / Founder", type: "PERSON", interviewMode: "ALL" },
      { label: "Operations head", type: "ROLE", interviewMode: "ALL" },
      { label: "Finance head", type: "ROLE", interviewMode: "ALL" },
      { label: "Sales head", type: "ROLE", interviewMode: "ALL" },
      { label: "Marketing head", type: "ROLE", interviewMode: "ALL" },
      { label: "Tech head", type: "ROLE", interviewMode: "ALL" },
      { label: "Operations team", type: "DEPARTMENT", interviewMode: "SAMPLE", sampleSize: 1 },
      { label: "Finance team", type: "DEPARTMENT", interviewMode: "SAMPLE", sampleSize: 1 },
      { label: "Sales team", type: "DEPARTMENT", interviewMode: "SAMPLE", sampleSize: 1 },
    ]
  }
  return root
}

export const onboardingService = {

  /**
   * Seed an org chart for an engagement based on tier defaults.
   * IDEMPOTENT — if chart already has nodes, returns existing without modification.
   * Per D-04, this just SUGGESTS — consultant approves before any forms send.
   */
  async seedChartFromTier(params: {
    tenantId: string
    engagementId: string
    actorId?: string
    actorName?: string
  }): Promise<{ created: number; tier: AuditTier; alreadySeeded: boolean }> {
    const { tenantId, engagementId, actorId, actorName } = params
    log.info({ engagementId }, "Seed chart from tier")

    // Idempotency check — if any nodes already exist, no-op
    const existing = await onboardingRepository.getChartByEngagement(tenantId, engagementId)
    if (existing.length > 0) {
      log.info({ engagementId, count: existing.length }, "Chart already seeded; no-op")
      return { created: 0, tier: "MICRO" as AuditTier, alreadySeeded: true }
    }

    // Read engagement + customer for tier + company label
    const eng = await db.query.engagements.findFirst({ where: eq(engagements.id, engagementId) })
    if (!eng) throw new NotFoundError("Engagement", engagementId)

    const customer = await db.query.customers.findFirst({ where: eq(customers.id, eng.customerId) })
    // companyName lives in customer.notes per Task 2 tech debt (HANDOFF gotcha h)
    const fullName = `${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim()
    const companyLabel = customer?.notes ?? (fullName || "Company")

    const teamSize = (eng.qualificationData as { teamSize?: number } | null)?.teamSize ?? null
    const tier = resolveTier(teamSize)

    const seedRoot = seedTemplateForTier(tier, companyLabel, teamSize)

    let sortCursor = 0
    const createdIds: string[] = []
    const insertRecursive = async (node: SeedNode, parentId: string | null) => {
      const order = sortCursor++
      const inserted = await onboardingRepository.createNode({
        tenantId,
        engagementId,
        parentId,
        label: node.label,
        type: node.type,
        headcount: node.headcount ?? null,
        contactUserId: null,
        contactEmail: null,
        contactName: null,
        contactRole: null,
        interviewMode: node.interviewMode,
        sampleSize: node.sampleSize ?? null,
        templateSlugOverride: null,
        sortOrder: order,
        editedBy: "CONSULTANT",
      })
      createdIds.push(inserted.id)
      for (const child of node.children ?? []) {
        await insertRecursive(child, inserted.id)
      }
    }
    await insertRecursive(seedRoot, null)

    // Log activity
    await onboardingRepository.logActivity({
      engagementId,
      nodeId: null,
      actorType: "SYSTEM",
      actorId: actorId ?? null,
      actorName: actorName ?? "System",
      action: "chart.seeded",
      fromValue: null,
      toValue: { tier, nodeCount: createdIds.length },
      message: `Chart seeded from ${tier} tier (${createdIds.length} nodes)`,
    })

    // Emit Inngest event (will be wired in Task 5)
    await inngest
      .send({
        name: "engagement/chart-seeded",
        data: { engagementId, tenantId, tier, nodeCount: createdIds.length },
      })
      .catch((err) => {
        log.warn({ err }, "Inngest emit failed — non-blocking")
      })

    return { created: createdIds.length, tier, alreadySeeded: false }
  },

  /**
   * Walk the chart and produce a preview of which forms would be sent.
   * NO actual sends — Phase 0.2 wires that.
   * Returns plan + unfilled sample slot warnings.
   */
  async planOnboardingForms(params: {
    tenantId: string
    engagementId: string
  }): Promise<OnboardingPlan> {
    const { tenantId, engagementId } = params
    const flat = await onboardingRepository.getChartByEngagement(tenantId, engagementId)

    const eng = await db.query.engagements.findFirst({ where: eq(engagements.id, engagementId) })
    const tier = resolveTier(
      (eng?.qualificationData as { teamSize?: number } | null)?.teamSize ?? null
    )

    const childrenByParent = new Map<string | null, OrgChartNodeRecord[]>()
    for (const n of flat) {
      const key = n.parentId
      if (!childrenByParent.has(key)) childrenByParent.set(key, [])
      childrenByParent.get(key)!.push(n)
    }

    const sends: PlannedFormSend[] = []
    const unfilledSampleSlots: { nodeId: string; deptLabel: string; needed: number }[] = []

    const walk = (node: OrgChartNodeRecord) => {
      const children = childrenByParent.get(node.id) ?? []

      switch (node.interviewMode) {
        case "SKIP":
          break // ignore entirely
        case "OWNER_ONLY":
          // Walk children but don't add this node itself
          for (const c of children) walk(c)
          break
        case "ALL":
          if (node.type === "PERSON" && node.contactEmail) {
            sends.push({
              nodeId: node.id,
              contactEmail: node.contactEmail,
              contactName: node.contactName ?? node.label,
              templateSlug: mapNodeToTemplate(node),
              reason: `${node.type} marked ALL`,
            })
          } else {
            // ROLE or DEPARTMENT marked ALL — add each PERSON child w/ contactEmail, recurse rest
            for (const c of children) {
              if (c.type === "PERSON" && c.contactEmail) {
                sends.push({
                  nodeId: c.id,
                  contactEmail: c.contactEmail,
                  contactName: c.contactName ?? c.label,
                  templateSlug: mapNodeToTemplate(c),
                  reason: `Under ${node.label} (ALL)`,
                })
              } else {
                walk(c)
              }
            }
          }
          break
        case "SAMPLE": {
          const targetN = node.sampleSize ?? 0
          const namedPersons = children.filter((c) => c.type === "PERSON" && c.contactEmail)
          for (const p of namedPersons) {
            sends.push({
              nodeId: p.id,
              contactEmail: p.contactEmail!,
              contactName: p.contactName ?? p.label,
              templateSlug: mapNodeToTemplate(p),
              reason: `Sample under ${node.label}`,
            })
          }
          if (namedPersons.length < targetN) {
            unfilledSampleSlots.push({
              nodeId: node.id,
              deptLabel: node.label,
              needed: targetN - namedPersons.length,
            })
          }
          break
        }
      }
    }

    const roots = childrenByParent.get(null) ?? []
    for (const r of roots) walk(r)

    return {
      engagementId,
      tier,
      totalSends: sends.length,
      sends,
      unfilledSampleSlots,
    }
  },

  /**
   * Phase 0.1.C: returns plan + logs activity + emits event but DOES NOT actually send forms.
   * Phase 0.2 will wire formsService.sendForm in the event handler.
   */
  async approvePlan(params: {
    tenantId: string
    engagementId: string
    actorId?: string
    actorName?: string
  }): Promise<OnboardingPlan> {
    const plan = await this.planOnboardingForms(params)

    await onboardingRepository.logActivity({
      engagementId: params.engagementId,
      nodeId: null,
      actorType: "CONSULTANT",
      actorId: params.actorId ?? null,
      actorName: params.actorName ?? "Consultant",
      action: "plan.approved",
      fromValue: null,
      toValue: {
        totalSends: plan.totalSends,
        unfilledSampleSlots: plan.unfilledSampleSlots.length,
      },
      message: `Form plan approved — ${plan.totalSends} sends planned${
        plan.unfilledSampleSlots.length > 0
          ? `, ${plan.unfilledSampleSlots.length} unfilled sample slots`
          : ""
      }`,
    })

    await inngest
      .send({
        name: "engagement/onboarding-plan-approved",
        data: { engagementId: params.engagementId, tenantId: params.tenantId, plan },
      })
      .catch((err) => {
        log.warn({ err }, "Inngest emit failed — non-blocking")
      })

    return plan
  },

  /**
   * Stub for 0.1.C — returns zeros. Phase 0.2 wires real form-completion tracking.
   */
  async getOnboardingStatus(params: {
    tenantId: string
    engagementId: string
  }): Promise<OnboardingStatus> {
    return {
      totalRecipients: 0,
      sent: 0,
      completed: 0,
      pending: 0,
      byContact: [],
    }
  },

  /**
   * Perm gate helper — service-layer enforcement. Used by router + UI.
   * Client (mode="client") cannot edit interviewMode / templateSlugOverride.
   * D-06: collaborative two-way + perm gate.
   */
  validateClientEditPatch(patch: Record<string, unknown>): void {
    const restricted = ["interviewMode", "templateSlugOverride", "sampleSize"]
    for (const k of restricted) {
      if (k in patch) {
        throw new ValidationError(`Clients cannot modify '${k}' — consultant-only field`)
      }
    }
  },
}
