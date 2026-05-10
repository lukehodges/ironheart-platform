import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenant.schema";
import { engagements } from "./client-portal.schema";
import { auditSessions } from "./audit-workspace.schema";

export const auditReportStatus = pgEnum("AuditReportStatus", [
  "GENERATING",
  "DRAFT",
  "IN_REVIEW",
  "PUBLISHED",
]);

export const auditReports = pgTable(
  "audit_reports",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    tenantId: uuid().notNull(),
    engagementId: uuid().notNull(),
    auditSessionId: uuid().notNull(),
    status: auditReportStatus().default("GENERATING").notNull(),
    contentHtml: text().default("").notNull(),
    contentJson: jsonb().default(sql`'{}'::jsonb`).notNull(),
    executiveSummary: text().default("").notNull(),
    totalEstimatedWaste: integer().default(0).notNull(),
    driveFileId: text(),
    publishedAt: timestamp({ precision: 3, mode: "date" }),
    generatedBy: text().default("manual").notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("audit_reports_tenantId_idx").on(table.tenantId),
    index("audit_reports_engagementId_idx").on(table.engagementId),
    index("audit_reports_sessionId_idx").on(table.auditSessionId),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: "audit_reports_tenantId_fkey",
    }).onUpdate("cascade").onDelete("cascade"),
    foreignKey({
      columns: [table.engagementId],
      foreignColumns: [engagements.id],
      name: "audit_reports_engagementId_fkey",
    }).onUpdate("cascade").onDelete("cascade"),
    foreignKey({
      columns: [table.auditSessionId],
      foreignColumns: [auditSessions.id],
      name: "audit_reports_sessionId_fkey",
    }).onUpdate("cascade").onDelete("cascade"),
  ]
);
