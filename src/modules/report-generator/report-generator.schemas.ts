import { z } from "zod";

export const generateReportSchema = z.object({
  auditSessionId: z.string(),
  engagementId: z.string(),
});

export const getReportSchema = z.object({
  reportId: z.string(),
});

export const getReportByEngagementSchema = z.object({
  engagementId: z.string(),
});

export const updateReportContentSchema = z.object({
  reportId: z.string(),
  contentHtml: z.string().optional(),
  executiveSummary: z.string().optional(),
  contentJson: z.record(z.string(), z.unknown()).optional(),
});

export const transitionReportStatusSchema = z.object({
  reportId: z.string(),
  targetStatus: z.enum(["DRAFT", "IN_REVIEW", "PUBLISHED"]),
});
