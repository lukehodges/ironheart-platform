import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import { auditReports } from "@/shared/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { AuditReportRecord, ReportContentJson } from "./report-generator.types";

const log = logger.child({ module: "report-generator.repository" });

export const reportGeneratorRepository = {
  async create(data: {
    tenantId: string;
    engagementId: string;
    auditSessionId: string;
    status?: string;
    contentHtml?: string;
    contentJson?: ReportContentJson;
    executiveSummary?: string;
    totalEstimatedWaste?: number;
    generatedBy?: string;
  }): Promise<AuditReportRecord> {
    const rows = await db
      .insert(auditReports)
      .values({
        ...data,
        status: (data.status ?? "GENERATING") as any,
        contentJson: data.contentJson ?? {},
        updatedAt: new Date(),
      })
      .returning();
    log.info({ engagementId: data.engagementId }, "audit report created");
    return rows[0] as unknown as AuditReportRecord;
  },

  async findById(reportId: string): Promise<AuditReportRecord | null> {
    const rows = await db
      .select()
      .from(auditReports)
      .where(eq(auditReports.id, reportId))
      .limit(1);
    return (rows[0] as unknown as AuditReportRecord) ?? null;
  },

  async findByEngagement(tenantId: string, engagementId: string): Promise<AuditReportRecord | null> {
    const rows = await db
      .select()
      .from(auditReports)
      .where(and(eq(auditReports.tenantId, tenantId), eq(auditReports.engagementId, engagementId)))
      .orderBy(desc(auditReports.createdAt))
      .limit(1);
    return (rows[0] as unknown as AuditReportRecord) ?? null;
  },

  async updateContent(reportId: string, data: {
    contentHtml?: string;
    contentJson?: ReportContentJson;
    executiveSummary?: string;
    totalEstimatedWaste?: number;
  }): Promise<AuditReportRecord> {
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (data.contentHtml !== undefined) set.contentHtml = data.contentHtml;
    if (data.contentJson !== undefined) set.contentJson = data.contentJson;
    if (data.executiveSummary !== undefined) set.executiveSummary = data.executiveSummary;
    if (data.totalEstimatedWaste !== undefined) set.totalEstimatedWaste = data.totalEstimatedWaste;

    const rows = await db
      .update(auditReports)
      .set(set)
      .where(eq(auditReports.id, reportId))
      .returning();
    if (rows.length === 0) throw new NotFoundError("AuditReport", reportId);
    return rows[0] as unknown as AuditReportRecord;
  },

  async updateStatus(reportId: string, status: string, publishedAt?: Date): Promise<AuditReportRecord> {
    const set: Record<string, unknown> = { status: status as any, updatedAt: new Date() };
    if (publishedAt) set.publishedAt = publishedAt;

    const rows = await db
      .update(auditReports)
      .set(set)
      .where(eq(auditReports.id, reportId))
      .returning();
    if (rows.length === 0) throw new NotFoundError("AuditReport", reportId);
    return rows[0] as unknown as AuditReportRecord;
  },

  async setDriveFileId(reportId: string, driveFileId: string): Promise<AuditReportRecord> {
    const rows = await db
      .update(auditReports)
      .set({ driveFileId, updatedAt: new Date() })
      .where(eq(auditReports.id, reportId))
      .returning();
    if (rows.length === 0) throw new NotFoundError("AuditReport", reportId);
    return rows[0] as unknown as AuditReportRecord;
  },
};
