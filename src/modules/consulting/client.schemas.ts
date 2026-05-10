import { z } from "zod";

export const getOnboardingStatusSchema = z.object({
  engagementId: z.string(),
});

export const getClientReportSchema = z.object({
  engagementId: z.string(),
});

export const getClientProgressSchema = z.object({
  engagementId: z.string(),
});

export const approveDeliverableSchema = z.object({
  deliverableId: z.string(),
  comment: z.string().optional(),
});

export const requestChangesSchema = z.object({
  deliverableId: z.string(),
  comment: z.string().min(1),
});
