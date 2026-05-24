import { router, platformAdminProcedure, protectedProcedure } from "@/shared/trpc"
import { onboardingRepository } from "./onboarding.repository"
import { onboardingService } from "./onboarding.service"
import { inngest } from "@/shared/inngest"
import { db } from "@/shared/db"
import { engagements } from "@/shared/db/schemas/client-portal.schema"
import { tenants } from "@/shared/db/schemas/tenant.schema"
import { engagementOrgChart } from "@/shared/db/schemas/onboarding-chart.schema"
import { completedForms } from "@/shared/db/schemas/shared.schema"
import { eq, asc } from "drizzle-orm"
import { isMemberOfOrg } from "@/lib/auth/tenant-resolver"
import { NotFoundError, ForbiddenError } from "@/shared/errors"
import {
  engagementIdSchema,
  getActivitySchema,
  createNodeSchema,
  updateNodeSchema,
  deleteNodeSchema,
  reparentNodeSchema,
  clientUpdateNodeSchema,
  setNodeKindSchema,
  setAuditFlagsSchema,
  setInterviewStatusSchema,
  setFormStatusSchema,
  setEdgeStyleSchema,
  updateNodeMetaSchema,
  clientUpdateNodeMetaSchema,
} from "./onboarding.schemas"

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the clientTenantId that owns the org chart for the given engagement.
 * Throws NotFoundError if engagement or tenant provisioning is missing.
 */
async function resolveChartTenantId(engagementId: string): Promise<string> {
  const eng = await db.query.engagements.findFirst({ where: eq(engagements.id, engagementId) })
  if (!eng) throw new NotFoundError("Engagement", engagementId)
  if (!eng.clientTenantId) {
    throw new NotFoundError("Engagement.clientTenantId", engagementId)
  }
  return eng.clientTenantId
}

/**
 * Resolves both the node row and its engagement's tenantId in one go.
 * Used by the Phase 1.0 depth-mutation procs that key off nodeId.
 */
async function resolveNodeAndTenant(nodeId: string): Promise<{
  node: { id: string; engagementId: string; label: string }
  tenantId: string
}> {
  const nodeRow = await db.query.engagementOrgChart.findFirst({
    where: eq(engagementOrgChart.id, nodeId),
  })
  if (!nodeRow) throw new NotFoundError("OrgChartNode", nodeId)
  const tenantId = await resolveChartTenantId(nodeRow.engagementId)
  return { node: nodeRow, tenantId }
}

/**
 * For client routes — verify the session user is a member of the engagement's
 * client tenant WorkOS org. Returns tenantId on success, throws ForbiddenError if not a member.
 */
async function assertClientMembership(
  engagementId: string,
  workosUserId: string
): Promise<{ tenantId: string }> {
  const eng = await db.query.engagements.findFirst({ where: eq(engagements.id, engagementId) })
  if (!eng?.clientTenantId) throw new NotFoundError("Engagement", engagementId)
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, eng.clientTenantId),
  })
  if (!tenant?.workosOrgId) throw new NotFoundError("Tenant", eng.clientTenantId)
  const isMember = await isMemberOfOrg(workosUserId, tenant.workosOrgId)
  if (!isMember) {
    throw new ForbiddenError("Not a member of this engagement's tenant")
  }
  return { tenantId: eng.clientTenantId }
}

/**
 * Builds a human-readable action + message for a node update log entry.
 * If the only patch field is interviewMode, we call it a mode change.
 * Exported for unit-testing.
 */
export function describeUpdate(
  patch: Record<string, unknown>,
  label: string,
  actor: string
): { action: string; message: string } {
  const keys = Object.keys(patch)
  if (keys.length === 1 && keys[0] === "interviewMode") {
    return {
      action: "mode.changed",
      message: `${actor} set '${label}' to ${patch.interviewMode}`,
    }
  }
  return {
    action: "node.updated",
    message: `${actor} updated '${label}' (${keys.join(", ")})`,
  }
}

/** Exported for unit-testing. */
export function actorDisplayName(user: {
  firstName?: string | null
  lastName?: string | null
  email: string
}): string {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
}

// ---------------------------------------------------------------------------
// Consultant router (platformAdminProcedure)
// ---------------------------------------------------------------------------

export const onboardingRouter = router({
  // ---- reads ----------------------------------------------------------------

  getChart: platformAdminProcedure
    .input(engagementIdSchema)
    .query(async ({ input }) => {
      const tenantId = await resolveChartTenantId(input.engagementId)
      return onboardingRepository.getChartTree(tenantId, input.engagementId)
    }),

  getActivity: platformAdminProcedure
    .input(getActivitySchema)
    .query(async ({ input }) => {
      const tenantId = await resolveChartTenantId(input.engagementId)
      return onboardingRepository.getActivity(tenantId, input.engagementId, {
        limit: input.limit,
        cursor: input.cursor,
      })
    }),

  // ---- mutations ------------------------------------------------------------

  seedChart: platformAdminProcedure
    .input(engagementIdSchema)
    .mutation(async ({ ctx, input }) => {
      const tenantId = await resolveChartTenantId(input.engagementId)
      const user = ctx.session.user
      return onboardingService.seedChartFromTier({
        tenantId,
        engagementId: input.engagementId,
        actorId: user.id,
        actorName: actorDisplayName(user),
      })
    }),

  createNode: platformAdminProcedure
    .input(createNodeSchema)
    .mutation(async ({ ctx, input }) => {
      const tenantId = await resolveChartTenantId(input.engagementId)
      const user = ctx.session.user
      const node = await onboardingRepository.createNode({
        tenantId,
        engagementId: input.engagementId,
        parentId: input.parentId,
        label: input.label,
        type: input.type,
        headcount: input.headcount ?? null,
        contactUserId: input.contactUserId ?? null,
        contactEmail: input.contactEmail ?? null,
        contactName: input.contactName ?? null,
        contactRole: input.contactRole ?? null,
        interviewMode: input.interviewMode,
        sampleSize: input.sampleSize ?? null,
        templateSlugOverride: input.templateSlugOverride ?? null,
        sortOrder: input.sortOrder,
        editedBy: "CONSULTANT",
      })
      await onboardingRepository.logActivity({
        engagementId: input.engagementId,
        nodeId: node.id,
        actorType: "CONSULTANT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.created",
        fromValue: null,
        toValue: { label: node.label, type: node.type },
        message: `${actorDisplayName(user)} created '${node.label}'`,
      })
      return node
    }),

  updateNode: platformAdminProcedure
    .input(updateNodeSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      // Resolve tenantId: query the node to get its engagementId, then look up the engagement
      const nodeRow = await db.query.engagementOrgChart.findFirst({
        where: eq(engagementOrgChart.id, input.id),
      })
      if (!nodeRow) throw new NotFoundError("OrgChartNode", input.id)
      const tenantId = await resolveChartTenantId(nodeRow.engagementId)
      const updated = await onboardingRepository.updateNode({
        id: input.id,
        tenantId,
        expectedVersion: input.version,
        patch: input.patch,
        editedBy: "CONSULTANT",
      })
      const { action, message } = describeUpdate(
        input.patch as Record<string, unknown>,
        updated.label,
        actorDisplayName(user)
      )
      await onboardingRepository.logActivity({
        engagementId: nodeRow.engagementId,
        nodeId: updated.id,
        actorType: "CONSULTANT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action,
        fromValue: null,
        toValue: input.patch as Record<string, unknown>,
        message,
      })
      return updated
    }),

  deleteNode: platformAdminProcedure
    .input(deleteNodeSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      // engagementOrgChart imported at module top
      const nodeRow = await db.query.engagementOrgChart.findFirst({
        where: eq(engagementOrgChart.id, input.id),
      })
      if (!nodeRow) throw new NotFoundError("OrgChartNode", input.id)
      const tenantId = await resolveChartTenantId(nodeRow.engagementId)
      const result = await onboardingRepository.deleteNode({
        id: input.id,
        tenantId,
        expectedVersion: input.version,
      })
      await onboardingRepository.logActivity({
        engagementId: nodeRow.engagementId,
        nodeId: input.id,
        actorType: "CONSULTANT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.deleted",
        fromValue: { label: nodeRow.label },
        toValue: { subtreeCount: result.deletedCount },
        message: `${actorDisplayName(user)} deleted '${nodeRow.label}' (${result.deletedCount} nodes removed)`,
      })
      return result
    }),

  reparentNode: platformAdminProcedure
    .input(reparentNodeSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      // engagementOrgChart imported at module top
      const nodeRow = await db.query.engagementOrgChart.findFirst({
        where: eq(engagementOrgChart.id, input.id),
      })
      if (!nodeRow) throw new NotFoundError("OrgChartNode", input.id)
      const tenantId = await resolveChartTenantId(nodeRow.engagementId)
      const updated = await onboardingRepository.reparentNode({
        id: input.id,
        tenantId,
        newParentId: input.newParentId,
        newSortOrder: input.newSortOrder,
        expectedVersion: input.version,
        editedBy: "CONSULTANT",
      })
      await onboardingRepository.logActivity({
        engagementId: nodeRow.engagementId,
        nodeId: updated.id,
        actorType: "CONSULTANT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.reparented",
        fromValue: { parentId: nodeRow.parentId },
        toValue: { parentId: input.newParentId, sortOrder: input.newSortOrder },
        message: `${actorDisplayName(user)} moved '${updated.label}'`,
      })
      return updated
    }),

  planForms: platformAdminProcedure
    .input(engagementIdSchema)
    .mutation(async ({ input }) => {
      const tenantId = await resolveChartTenantId(input.engagementId)
      return onboardingService.planOnboardingForms({
        tenantId,
        engagementId: input.engagementId,
      })
    }),

  approvePlan: platformAdminProcedure
    .input(engagementIdSchema)
    .mutation(async ({ ctx, input }) => {
      const tenantId = await resolveChartTenantId(input.engagementId)
      const user = ctx.session.user
      return onboardingService.approvePlan({
        tenantId,
        engagementId: input.engagementId,
        actorId: user.id,
        actorName: actorDisplayName(user),
      })
    }),

  // ---------------------------------------------------------------------------
  // Chart depth procs (Phase 1.0) — consultant-only unless mirrored below.
  // ---------------------------------------------------------------------------

  setNodeKind: platformAdminProcedure
    .input(setNodeKindSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      const { node, tenantId } = await resolveNodeAndTenant(input.nodeId)
      const updated = await onboardingRepository.updateNode({
        id: node.id,
        tenantId,
        // updateNode wants expectedVersion; depth procs don't take a version
        // (they're idempotent, last-write-wins). Read current version inline.
        expectedVersion: (
          await db.query.engagementOrgChart.findFirst({
            where: eq(engagementOrgChart.id, node.id),
            columns: { version: true },
          })
        )!.version,
        patch: { kind: input.kind },
        editedBy: "CONSULTANT",
      })
      await onboardingRepository.logActivity({
        engagementId: node.engagementId,
        nodeId: node.id,
        actorType: "CONSULTANT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.kind.set",
        fromValue: null,
        toValue: { kind: input.kind },
        message: `${actorDisplayName(user)} set kind of '${node.label}' to ${input.kind}`,
      })
      return updated
    }),

  setAuditFlags: platformAdminProcedure
    .input(setAuditFlagsSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      const { node, tenantId } = await resolveNodeAndTenant(input.nodeId)
      const updated = await onboardingRepository.updateNodeAuditFlags({
        id: node.id,
        tenantId,
        flags: input.flags,
        editedBy: "CONSULTANT",
      })
      await onboardingRepository.logActivity({
        engagementId: node.engagementId,
        nodeId: node.id,
        actorType: "CONSULTANT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.auditFlags.set",
        fromValue: null,
        toValue: { flags: input.flags },
        message: `${actorDisplayName(user)} set audit flags on '${node.label}' (${input.flags.length} flag${input.flags.length === 1 ? "" : "s"})`,
      })
      return updated
    }),

  setInterviewStatus: platformAdminProcedure
    .input(setInterviewStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      const { node, tenantId } = await resolveNodeAndTenant(input.nodeId)
      const updated = await onboardingRepository.updateNodeInterviewStatus({
        id: node.id,
        tenantId,
        status: input.status,
        editedBy: "CONSULTANT",
      })
      await onboardingRepository.logActivity({
        engagementId: node.engagementId,
        nodeId: node.id,
        actorType: "CONSULTANT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.interviewStatus.set",
        fromValue: null,
        toValue: { status: input.status },
        message: `${actorDisplayName(user)} set interview status of '${node.label}' to ${input.status}`,
      })
      return updated
    }),

  setFormStatus: platformAdminProcedure
    .input(setFormStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      const { node, tenantId } = await resolveNodeAndTenant(input.nodeId)
      const updated = await onboardingRepository.updateNodeFormStatus({
        id: node.id,
        tenantId,
        status: input.status,
        editedBy: "CONSULTANT",
      })
      await onboardingRepository.logActivity({
        engagementId: node.engagementId,
        nodeId: node.id,
        actorType: "CONSULTANT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.formStatus.set",
        fromValue: null,
        toValue: { status: input.status },
        message: `${actorDisplayName(user)} set form status of '${node.label}' to ${input.status}`,
      })
      return updated
    }),

  setEdgeStyle: platformAdminProcedure
    .input(setEdgeStyleSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      const { node, tenantId } = await resolveNodeAndTenant(input.nodeId)
      const fresh = await db.query.engagementOrgChart.findFirst({
        where: eq(engagementOrgChart.id, node.id),
        columns: { version: true },
      })
      const updated = await onboardingRepository.updateNode({
        id: node.id,
        tenantId,
        expectedVersion: fresh!.version,
        patch: { edgeStyle: input.style },
        editedBy: "CONSULTANT",
      })
      await onboardingRepository.logActivity({
        engagementId: node.engagementId,
        nodeId: node.id,
        actorType: "CONSULTANT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.edgeStyle.set",
        fromValue: null,
        toValue: { style: input.style },
        message: `${actorDisplayName(user)} set edge style of '${node.label}' to ${input.style}`,
      })
      return updated
    }),

  updateNodeMeta: platformAdminProcedure
    .input(updateNodeMetaSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      const { node, tenantId } = await resolveNodeAndTenant(input.nodeId)
      const fresh = await db.query.engagementOrgChart.findFirst({
        where: eq(engagementOrgChart.id, node.id),
        columns: { version: true },
      })
      const patch: Record<string, unknown> = {}
      if (input.email !== undefined) patch.email = input.email
      if (input.tenureYears !== undefined) patch.tenureYears = input.tenureYears
      if (input.isFounder !== undefined) patch.isFounder = input.isFounder
      if (input.isFractional !== undefined) patch.isFractional = input.isFractional
      if (input.avatarColor !== undefined) patch.avatarColor = input.avatarColor
      const updated = await onboardingRepository.updateNode({
        id: node.id,
        tenantId,
        expectedVersion: fresh!.version,
        patch,
        editedBy: "CONSULTANT",
      })
      await onboardingRepository.logActivity({
        engagementId: node.engagementId,
        nodeId: node.id,
        actorType: "CONSULTANT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.meta.updated",
        fromValue: null,
        toValue: patch,
        message: `${actorDisplayName(user)} updated meta on '${node.label}' (${Object.keys(patch).join(", ") || "no fields"})`,
      })
      return updated
    }),

  // ---------------------------------------------------------------------------
  // Client procedures (protectedProcedure + WorkOS org membership check)
  // ---------------------------------------------------------------------------

  clientGetChart: protectedProcedure
    .input(engagementIdSchema)
    .query(async ({ ctx, input }) => {
      const { tenantId } = await assertClientMembership(
        input.engagementId,
        ctx.session.user.id
      )
      return onboardingRepository.getChartTree(tenantId, input.engagementId)
    }),

  clientGetActivity: protectedProcedure
    .input(getActivitySchema)
    .query(async ({ ctx, input }) => {
      const { tenantId } = await assertClientMembership(
        input.engagementId,
        ctx.session.user.id
      )
      return onboardingRepository.getActivity(tenantId, input.engagementId, {
        limit: input.limit,
        cursor: input.cursor,
      })
    }),

  clientCreateNode: protectedProcedure
    .input(createNodeSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      const { tenantId } = await assertClientMembership(input.engagementId, user.id)
      const node = await onboardingRepository.createNode({
        tenantId,
        engagementId: input.engagementId,
        parentId: input.parentId,
        label: input.label,
        type: input.type,
        headcount: input.headcount ?? null,
        contactUserId: input.contactUserId ?? null,
        contactEmail: input.contactEmail ?? null,
        contactName: input.contactName ?? null,
        contactRole: input.contactRole ?? null,
        interviewMode: undefined, // clients cannot set — defaults to OWNER_ONLY in repo
        sampleSize: null,
        templateSlugOverride: null,
        sortOrder: input.sortOrder,
        editedBy: "CLIENT",
      })
      await onboardingRepository.logActivity({
        engagementId: input.engagementId,
        nodeId: node.id,
        actorType: "CLIENT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.created",
        fromValue: null,
        toValue: { label: node.label, type: node.type },
        message: `${actorDisplayName(user)} created '${node.label}'`,
      })
      return node
    }),

  clientUpdateNode: protectedProcedure
    .input(clientUpdateNodeSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      // Belt-and-braces: service validates no consultant-only fields snuck through
      onboardingService.validateClientEditPatch(input.patch as Record<string, unknown>)
      // engagementOrgChart imported at module top
      const nodeRow = await db.query.engagementOrgChart.findFirst({
        where: eq(engagementOrgChart.id, input.id),
      })
      if (!nodeRow) throw new NotFoundError("OrgChartNode", input.id)
      const { tenantId } = await assertClientMembership(nodeRow.engagementId, user.id)
      const updated = await onboardingRepository.updateNode({
        id: input.id,
        tenantId,
        expectedVersion: input.version,
        patch: input.patch,
        editedBy: "CLIENT",
      })
      const { action, message } = describeUpdate(
        input.patch as Record<string, unknown>,
        updated.label,
        actorDisplayName(user)
      )
      await onboardingRepository.logActivity({
        engagementId: nodeRow.engagementId,
        nodeId: updated.id,
        actorType: "CLIENT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action,
        fromValue: null,
        toValue: input.patch as Record<string, unknown>,
        message,
      })
      return updated
    }),

  clientDeleteNode: protectedProcedure
    .input(deleteNodeSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      // engagementOrgChart imported at module top
      const nodeRow = await db.query.engagementOrgChart.findFirst({
        where: eq(engagementOrgChart.id, input.id),
      })
      if (!nodeRow) throw new NotFoundError("OrgChartNode", input.id)
      const { tenantId } = await assertClientMembership(nodeRow.engagementId, user.id)
      const result = await onboardingRepository.deleteNode({
        id: input.id,
        tenantId,
        expectedVersion: input.version,
      })
      await onboardingRepository.logActivity({
        engagementId: nodeRow.engagementId,
        nodeId: input.id,
        actorType: "CLIENT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.deleted",
        fromValue: { label: nodeRow.label },
        toValue: { subtreeCount: result.deletedCount },
        message: `${actorDisplayName(user)} deleted '${nodeRow.label}' (${result.deletedCount} nodes removed)`,
      })
      return result
    }),

  clientReparentNode: protectedProcedure
    .input(reparentNodeSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      // engagementOrgChart imported at module top
      const nodeRow = await db.query.engagementOrgChart.findFirst({
        where: eq(engagementOrgChart.id, input.id),
      })
      if (!nodeRow) throw new NotFoundError("OrgChartNode", input.id)
      const { tenantId } = await assertClientMembership(nodeRow.engagementId, user.id)
      const updated = await onboardingRepository.reparentNode({
        id: input.id,
        tenantId,
        newParentId: input.newParentId,
        newSortOrder: input.newSortOrder,
        expectedVersion: input.version,
        editedBy: "CLIENT",
      })
      await onboardingRepository.logActivity({
        engagementId: nodeRow.engagementId,
        nodeId: updated.id,
        actorType: "CLIENT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.reparented",
        fromValue: { parentId: nodeRow.parentId },
        toValue: { parentId: input.newParentId, sortOrder: input.newSortOrder },
        message: `${actorDisplayName(user)} moved '${updated.label}'`,
      })
      return updated
    }),

  clientNotifyConsultantReady: protectedProcedure
    .input(engagementIdSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      const { tenantId } = await assertClientMembership(input.engagementId, user.id)
      await inngest
        .send({
          name: "engagement/chart-client-ready",
          data: { engagementId: input.engagementId, tenantId },
        })
        .catch((err) => {
          // Non-blocking — log but don't fail the request
          console.warn({ err }, "Inngest emit failed for chart-client-ready")
        })
      await onboardingRepository.logActivity({
        engagementId: input.engagementId,
        nodeId: null,
        actorType: "CLIENT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "chart.client-ready",
        fromValue: null,
        toValue: null,
        message: `${actorDisplayName(user)} marked the org chart as ready for consultant review`,
      })
      return { ok: true }
    }),

  /**
   * Aggregates chart node form-send status, upcoming sessions (stub), and
   * recent activity in a single round trip for the audit progress page (0.2.C).
   */
  clientGetAuditProgress: protectedProcedure
    .input(engagementIdSchema)
    .query(async ({ ctx, input }) => {
      await assertClientMembership(input.engagementId, ctx.session.user.id)

      // 1. Chart nodes joined with completed_forms status
      //    formSendId on the node references completed_forms.id
      const nodeRows = await db
        .select({
          nodeId: engagementOrgChart.id,
          label: engagementOrgChart.label,
          contactName: engagementOrgChart.contactName,
          contactEmail: engagementOrgChart.contactEmail,
          formSendId: engagementOrgChart.formSendId,
          formStatus: completedForms.status,
          // completed_forms has no completedAt; use submittedAt as the
          // completion timestamp (set when the form is submitted/completed).
          formCompletedAt: completedForms.submittedAt,
        })
        .from(engagementOrgChart)
        .leftJoin(
          completedForms,
          eq(completedForms.id, engagementOrgChart.formSendId)
        )
        .where(eq(engagementOrgChart.engagementId, input.engagementId))
        .orderBy(
          asc(engagementOrgChart.sortOrder),
          asc(engagementOrgChart.createdAt)
        )

      // 2. Upcoming sessions — bookings table has scheduledDate (date) +
      //    scheduledTime (text) but no title or engagement FK in 0.1.
      //    Returning empty until session-engagement linkage is wired.
      const upcomingSessions: Array<{ id: string; startsAt: Date; title: string }> = []

      // 3. Recent activity (last 20 entries)
      const { rows: activity } = await onboardingRepository.getActivity(
        // tenantId is not strictly needed here (activity is scoped by engagementId),
        // but the signature requires it — resolve from the engagement row.
        (await db.query.engagements.findFirst({
          where: eq(engagements.id, input.engagementId),
          columns: { clientTenantId: true },
        }))?.clientTenantId ?? "",
        input.engagementId,
        { limit: 20 }
      )

      return {
        chartNodes: nodeRows,
        upcomingSessions,
        activity,
      }
    }),

  // ---------------------------------------------------------------------------
  // Client-side chart depth mirrors (Phase 1.0).
  // Only interview status + limited meta (email + tenure) are self-editable.
  // Audit flags + form status + node kind + edge style stay consultant-only.
  // ---------------------------------------------------------------------------

  clientSetInterviewStatus: protectedProcedure
    .input(setInterviewStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      const nodeRow = await db.query.engagementOrgChart.findFirst({
        where: eq(engagementOrgChart.id, input.nodeId),
      })
      if (!nodeRow) throw new NotFoundError("OrgChartNode", input.nodeId)
      const { tenantId } = await assertClientMembership(nodeRow.engagementId, user.id)
      const updated = await onboardingRepository.updateNodeInterviewStatus({
        id: nodeRow.id,
        tenantId,
        status: input.status,
        editedBy: "CLIENT",
      })
      await onboardingRepository.logActivity({
        engagementId: nodeRow.engagementId,
        nodeId: nodeRow.id,
        actorType: "CLIENT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.interviewStatus.set",
        fromValue: null,
        toValue: { status: input.status },
        message: `${actorDisplayName(user)} set interview status of '${nodeRow.label}' to ${input.status}`,
      })
      return updated
    }),

  clientUpdateNodeMeta: protectedProcedure
    .input(clientUpdateNodeMetaSchema)
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      const nodeRow = await db.query.engagementOrgChart.findFirst({
        where: eq(engagementOrgChart.id, input.nodeId),
      })
      if (!nodeRow) throw new NotFoundError("OrgChartNode", input.nodeId)
      const { tenantId } = await assertClientMembership(nodeRow.engagementId, user.id)
      const patch: Record<string, unknown> = {}
      if (input.email !== undefined) patch.email = input.email
      if (input.tenureYears !== undefined) patch.tenureYears = input.tenureYears
      const updated = await onboardingRepository.updateNode({
        id: nodeRow.id,
        tenantId,
        expectedVersion: nodeRow.version,
        patch,
        editedBy: "CLIENT",
      })
      await onboardingRepository.logActivity({
        engagementId: nodeRow.engagementId,
        nodeId: nodeRow.id,
        actorType: "CLIENT",
        actorId: user.id,
        actorName: actorDisplayName(user),
        action: "node.meta.updated",
        fromValue: null,
        toValue: patch,
        message: `${actorDisplayName(user)} updated their details on '${nodeRow.label}' (${Object.keys(patch).join(", ") || "no fields"})`,
      })
      return updated
    }),
})
