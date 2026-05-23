import { z } from "zod";

const lensEnum = z.enum(["REVENUE", "OPERATIONS", "FINANCE", "TECHNOLOGY", "TEAM"]);
const ragEnum = z.enum(["RED", "AMBER", "GREEN"]);
const impactEnum = z.enum(["HIGH", "MEDIUM", "LOW"]);

export const createAuditSessionSchema = z.object({
  engagementId: z.string(),
});

export const updateCallNotesSchema = z.object({
  auditSessionId: z.string(),
  contactUserId: z.string(),
  rawNotes: z.string(),
  callDate: z.date().optional().nullable(),
  callDuration: z.number().int().positive().optional().nullable(),
});

export const upsertLensAnalysisSchema = z.object({
  auditSessionId: z.string(),
  lens: lensEnum,
  ragScore: ragEnum.optional().nullable(),
  ragJustification: z.string().optional().nullable(),
  currentState: z.string().optional().nullable(),
});

export const createFindingSchema = z.object({
  lensAnalysisId: z.string(),
  finding: z.string().min(1),
  impact: impactEnum,
  evidence: z.string().optional().nullable(),
  priority: z.number().int(),
  estimatedAnnualWaste: z.number().int().optional().nullable(),
});

export const updateFindingSchema = z.object({
  id: z.string(),
  finding: z.string().min(1).optional(),
  impact: impactEnum.optional(),
  evidence: z.string().optional().nullable(),
  priority: z.number().int().optional(),
  estimatedAnnualWaste: z.number().int().optional().nullable(),
});

export const createRecommendationSchema = z.object({
  lensAnalysisId: z.string(),
  action: z.string().min(1),
  estimatedEffort: z.string().optional().nullable(),
  estimatedCost: z.number().int().optional().nullable(),
  priority: z.number().int(),
});

export const updateRecommendationSchema = z.object({
  id: z.string(),
  action: z.string().min(1).optional(),
  estimatedEffort: z.string().optional().nullable(),
  estimatedCost: z.number().int().optional().nullable(),
  priority: z.number().int().optional(),
});

export const getAuditSessionSchema = z.object({
  auditSessionId: z.string(),
});

export const getByEngagementSchema = z.object({
  engagementId: z.string(),
});

export const deleteFindingSchema = z.object({
  id: z.string(),
});

export const deleteRecommendationSchema = z.object({
  id: z.string(),
});

// ── Consultant-facing schemas (platformAdminProcedure) ─────────────────────

export const getOrCreateSessionSchema = z.object({
  engagementId: z.string(),
});

export const upsertCallNoteByEngagementSchema = z.object({
  engagementId: z.string(),
  contactUserId: z.string(),
  rawNotes: z.string(),
  callDate: z.date().optional().nullable(),
  callDuration: z.number().int().positive().optional().nullable(),
});

export const upsertLensAnalysisByEngagementSchema = z.object({
  engagementId: z.string(),
  lens: lensEnum,
  ragScore: ragEnum.optional().nullable(),
  ragJustification: z.string().optional().nullable(),
  currentState: z.string().optional().nullable(),
});

export const reorderFindingsSchema = z.object({
  lensAnalysisId: z.string(),
  order: z.array(z.string()).min(1),
});

export const reorderRecommendationsSchema = z.object({
  lensAnalysisId: z.string(),
  order: z.array(z.string()).min(1),
});

export const validateSessionByEngagementSchema = z.object({
  engagementId: z.string(),
});

export const markReadyByEngagementSchema = z.object({
  engagementId: z.string(),
});
