import { z } from "zod"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const nodeTypeEnum = z.enum(["DEPARTMENT", "ROLE", "PERSON"])
export const interviewModeEnum = z.enum(["ALL", "SAMPLE", "OWNER_ONLY", "SKIP"])

// ── Chart depth (Phase 1.0) ──────────────────────────────────────────────────
export const nodeKindEnum = z.enum([
  "PERSON",
  "VACANCY",
  "CONTRACTOR",
  "ADVISOR",
  "EXTERNAL",
  "BUNDLE",
])
export const auditFlagEnum = z.enum([
  "DECISION_MAKER",
  "FINANCE_OWNER",
  "DATA_OWNER",
  "DPO",
  "SECURITY",
  "PROCESS_OWNER",
  "FOUNDER",
])
export const nodeInterviewStatusEnum = z.enum([
  "NONE",
  "TARGET",
  "INVITED",
  "SCHEDULED",
  "COMPLETED",
])
export const nodeFormStatusEnum = z.enum([
  "NONE",
  "PENDING",
  "SENT",
  "IN_PROGRESS",
  "COMPLETED",
])
export const edgeStyleEnum = z.enum(["SOLID", "DOTTED", "MATRIX"])

// Optional fields layered onto create/update for the new depth columns.
const chartDepthFields = {
  kind: nodeKindEnum.optional(),
  auditFlags: z.array(auditFlagEnum).optional(),
  interviewStatus: nodeInterviewStatusEnum.optional(),
  formStatus: nodeFormStatusEnum.optional(),
  tenureYears: z.number().int().nonnegative().nullable().optional(),
  email: z.string().email().nullable().optional(),
  isFounder: z.boolean().optional(),
  isFractional: z.boolean().optional(),
  avatarColor: z.string().max(64).nullable().optional(),
  edgeStyle: edgeStyleEnum.optional(),
  notes: z.string().max(10_000).nullable().optional(),
}

// ---------------------------------------------------------------------------
// Shared field definitions
// ---------------------------------------------------------------------------

const baseContactFields = {
  contactUserId: z.string().uuid().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactName: z.string().max(200).nullable().optional(),
  contactRole: z.string().max(200).nullable().optional(),
}

// ---------------------------------------------------------------------------
// Consultant schemas (full access)
// ---------------------------------------------------------------------------

export const createNodeSchema = z.object({
  engagementId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  label: z.string().min(1).max(200),
  type: nodeTypeEnum,
  headcount: z.number().int().nonnegative().nullable().optional(),
  ...baseContactFields,
  interviewMode: interviewModeEnum.optional(),
  sampleSize: z.number().int().positive().nullable().optional(),
  templateSlugOverride: z.string().max(200).nullable().optional(),
  sortOrder: z.number().int().optional(),
  ...chartDepthFields,
})

export const updateNodeSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  patch: z.object({
    label: z.string().min(1).max(200).optional(),
    type: nodeTypeEnum.optional(),
    headcount: z.number().int().nonnegative().nullable().optional(),
    ...baseContactFields,
    interviewMode: interviewModeEnum.optional(),
    sampleSize: z.number().int().positive().nullable().optional(),
    templateSlugOverride: z.string().max(200).nullable().optional(),
    sortOrder: z.number().int().optional(),
    ...chartDepthFields,
  }),
})

// ---------------------------------------------------------------------------
// Client schemas (restricted — no interviewMode / templateSlugOverride / sampleSize)
// ---------------------------------------------------------------------------

export const clientCreateNodeSchema = z.object({
  engagementId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  label: z.string().min(1).max(200),
  type: nodeTypeEnum,
  headcount: z.number().int().nonnegative().nullable().optional(),
  ...baseContactFields,
  sortOrder: z.number().int().optional(),
})

/**
 * .strict() means unknown keys throw at validation time — defense in depth
 * for D-06 perm gate so Zod rejects the request before it reaches service.validateClientEditPatch.
 */
export const clientUpdateNodeSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  patch: z
    .object({
      label: z.string().min(1).max(200).optional(),
      type: nodeTypeEnum.optional(),
      headcount: z.number().int().nonnegative().nullable().optional(),
      ...baseContactFields,
      sortOrder: z.number().int().optional(),
    })
    .strict(),
})

// ---------------------------------------------------------------------------
// Shared CRUD schemas
// ---------------------------------------------------------------------------

export const deleteNodeSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
})

export const reparentNodeSchema = z.object({
  id: z.string().uuid(),
  newParentId: z.string().uuid().nullable(),
  newSortOrder: z.number().int(),
  version: z.number().int().positive(),
})

// ---------------------------------------------------------------------------
// Query schemas
// ---------------------------------------------------------------------------

export const getActivitySchema = z.object({
  engagementId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
})

export const engagementIdSchema = z.object({
  engagementId: z.string().uuid(),
})

// ── Chart depth procedures (Phase 1.0) ───────────────────────────────────────

export const setNodeKindSchema = z.object({
  nodeId: z.string().uuid(),
  kind: nodeKindEnum,
})

export const setAuditFlagsSchema = z.object({
  nodeId: z.string().uuid(),
  // Caller passes the full final array (replace semantics).
  flags: z.array(auditFlagEnum),
})

export const setInterviewStatusSchema = z.object({
  nodeId: z.string().uuid(),
  status: nodeInterviewStatusEnum,
})

export const setFormStatusSchema = z.object({
  nodeId: z.string().uuid(),
  status: nodeFormStatusEnum,
})

export const setEdgeStyleSchema = z.object({
  nodeId: z.string().uuid(),
  style: edgeStyleEnum,
})

export const updateNodeMetaSchema = z.object({
  nodeId: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  tenureYears: z.number().int().nonnegative().nullable().optional(),
  isFounder: z.boolean().optional(),
  isFractional: z.boolean().optional(),
  avatarColor: z.string().max(64).nullable().optional(),
  notes: z.string().max(10_000).nullable().optional(),
})

// Client-side limited meta editor — only contact + tenure + notes are self-editable.
export const clientUpdateNodeMetaSchema = z.object({
  nodeId: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  tenureYears: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(10_000).nullable().optional(),
})
