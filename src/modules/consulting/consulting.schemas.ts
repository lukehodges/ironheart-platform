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

// Note: companyName, ownerEmail, ownerName have been removed — the provisioning
// service reads all required fields from the DB (customer.notes, customer.email)
// so callers only need to supply the engagementId.
export const provisionClientTenantSchema = z.object({
  engagementId: z.string().uuid(),
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

export const createPlaneProjectSchema = z.object({
  engagementId: z.string(),
  auditSessionId: z.string(),
  projectName: z.string().min(1),
});

export const createDriveFolderSchema = z.object({
  engagementId: z.string(),
  companyName: z.string().min(1),
});

export const getIntegrationStatusSchema = z.object({
  engagementId: z.string(),
});

export const createClientEngagementSchema = z.object({
  // Note: tenantId is no longer accepted as input — the service resolves the
  // Ironheart tenant server-side via IRONHEART_TENANT_ID env var or slug lookup.
  // D-01: Luke is flat in /platform/* with no tenant switching.

  // Company
  companyName: z.string().min(1, "Company name is required"),

  // Primary contact
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),

  // Classification
  industry: z.enum([
    "Manufacturing",
    "Professional Services",
    "Tech / Software",
    "Retail / Ecommerce",
    "Hospitality",
    "Construction",
    "Healthcare",
    "Other",
  ]),
  source: z.enum(["Referral", "Outreach", "Inbound", "Network", "Other"]),

  // Engagement
  engagementType: z.enum(["PROJECT", "RETAINER", "HYBRID"]),
  engagementTitle: z.string().min(1, "Engagement title is required"),

  // Qualification data
  teamSize: z.number().int().positive("Team size must be a positive integer"),
  revenue: z.string().optional(),
  painPoints: z.array(z.string()).min(1, "At least one pain point is required"),
  decisionMaker: z.boolean(),
});
