import { z } from "zod";

export const stageTransitionSchema = z.object({
  engagementId: z.string(),
  targetStage: z.enum([
    "DISCOVERY", "PROPOSAL", "CONTRACTED", "ONBOARDING",
    "AUDITING", "REPORTING", "IMPLEMENTING", "RETAINER",
    "CLOSED_WON", "CLOSED_LOST",
  ]),
  notes: z.string().optional(),
});

export const setAuditWindowSchema = z.object({
  engagementId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  "Audit window start must be before end"
);

export const provisionClientTenantSchema = z.object({
  engagementId: z.string(),
  companyName: z.string().min(1),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(1),
});

export const addTeamContactSchema = z.object({
  engagementId: z.string(),
  contacts: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.string().min(1),
  })).min(1),
});

export const assignQuestionnaireSchema = z.object({
  engagementId: z.string(),
  contactUserId: z.string(),
  formTemplateId: z.string(),
});

export const updateDiscoveryNotesSchema = z.object({
  engagementId: z.string(),
  notes: z.string(),
  qualificationData: z.object({
    revenue: z.string().nullable(),
    teamSize: z.number().nullable(),
    painPoints: z.array(z.string()),
    industry: z.string().nullable(),
    decisionMaker: z.boolean(),
  }).optional(),
});

export const listEngagementsByStageSchema = z.object({
  stage: z.enum([
    "DISCOVERY", "PROPOSAL", "CONTRACTED", "ONBOARDING",
    "AUDITING", "REPORTING", "IMPLEMENTING", "RETAINER",
    "CLOSED_WON", "CLOSED_LOST",
  ]).optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
