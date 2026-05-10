import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenant.schema";
import { engagements } from "./client-portal.schema";

// ── Enums ────────────────────────────────────────────────────────────────

export const auditSessionStatus = pgEnum("AuditSessionStatus", [
  "IN_PROGRESS",
  "PROCESSING",
  "READY_FOR_REPORT",
  "COMPLETE",
]);

export const auditLens = pgEnum("AuditLens", [
  "REVENUE",
  "OPERATIONS",
  "FINANCE",
  "TECHNOLOGY",
  "TEAM",
]);

export const ragScore = pgEnum("RagScore", [
  "RED",
  "AMBER",
  "GREEN",
]);

export const findingImpact = pgEnum("FindingImpact", [
  "HIGH",
  "MEDIUM",
  "LOW",
]);

// ── Tables ───────────────────────────────────────────────────────────────

export const auditSessions = pgTable(
  "audit_sessions",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    tenantId: uuid().notNull(),
    engagementId: uuid().notNull(),
    status: auditSessionStatus().default("IN_PROGRESS").notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("audit_sessions_tenantId_idx").on(table.tenantId),
    index("audit_sessions_engagementId_idx").on(table.engagementId),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: "audit_sessions_tenantId_fkey",
    }).onUpdate("cascade").onDelete("cascade"),
    foreignKey({
      columns: [table.engagementId],
      foreignColumns: [engagements.id],
      name: "audit_sessions_engagementId_fkey",
    }).onUpdate("cascade").onDelete("cascade"),
  ]
);

export const auditCallNotes = pgTable(
  "audit_call_notes",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    auditSessionId: uuid().notNull(),
    contactUserId: uuid().notNull(),
    rawNotes: text().default("").notNull(),
    callDate: timestamp({ precision: 3, mode: "date" }),
    callDuration: integer(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("audit_call_notes_sessionId_idx").on(table.auditSessionId),
    foreignKey({
      columns: [table.auditSessionId],
      foreignColumns: [auditSessions.id],
      name: "audit_call_notes_sessionId_fkey",
    }).onUpdate("cascade").onDelete("cascade"),
  ]
);

export const auditLensAnalysis = pgTable(
  "audit_lens_analysis",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    auditSessionId: uuid().notNull(),
    lens: auditLens().notNull(),
    ragScore: ragScore(),
    ragJustification: text(),
    currentState: text(),
    sortOrder: integer().default(0).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("audit_lens_analysis_sessionId_idx").on(table.auditSessionId),
    foreignKey({
      columns: [table.auditSessionId],
      foreignColumns: [auditSessions.id],
      name: "audit_lens_analysis_sessionId_fkey",
    }).onUpdate("cascade").onDelete("cascade"),
  ]
);

export const auditFindings = pgTable(
  "audit_findings",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    lensAnalysisId: uuid().notNull(),
    finding: text().notNull(),
    impact: findingImpact().notNull(),
    evidence: text(),
    priority: integer().notNull(),
    estimatedAnnualWaste: integer(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("audit_findings_lensId_idx").on(table.lensAnalysisId),
    foreignKey({
      columns: [table.lensAnalysisId],
      foreignColumns: [auditLensAnalysis.id],
      name: "audit_findings_lensId_fkey",
    }).onUpdate("cascade").onDelete("cascade"),
  ]
);

export const auditRecommendations = pgTable(
  "audit_recommendations",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    lensAnalysisId: uuid().notNull(),
    action: text().notNull(),
    estimatedEffort: text(),
    estimatedCost: integer(),
    priority: integer().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("audit_recommendations_lensId_idx").on(table.lensAnalysisId),
    foreignKey({
      columns: [table.lensAnalysisId],
      foreignColumns: [auditLensAnalysis.id],
      name: "audit_recommendations_lensId_fkey",
    }).onUpdate("cascade").onDelete("cascade"),
  ]
);
