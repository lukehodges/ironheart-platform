import { z } from "zod"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const nodeTypeEnum = z.enum(["DEPARTMENT", "ROLE", "PERSON"])
export const interviewModeEnum = z.enum(["ALL", "SAMPLE", "OWNER_ONLY", "SKIP"])

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
