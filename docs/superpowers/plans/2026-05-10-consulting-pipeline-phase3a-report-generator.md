# Consulting Pipeline Phase 3A: Report Generator Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the report generator module — takes structured audit data (5 lenses, findings, recommendations, questionnaire responses, call notes) and produces a full audit report. Supports AI auto-drafting, manual editing, internal review, and publishing to client tenant. HTML + PDF output.

**Architecture:** New `report-generator` module following established patterns. Pulls data from `audit-workspace` module. Report stored as both structured JSON (for rendering) and HTML (for display/PDF). Status workflow: GENERATING → DRAFT → IN_REVIEW → PUBLISHED.

**Tech Stack:** Drizzle ORM, tRPC 11, Zod, Inngest, Vitest

**Spec:** `docs/superpowers/specs/2026-05-10-consulting-pipeline-design.md` (Section 5.6)

**Note:** Backend only. AI integration is stubbed — generates report structure from audit data, actual AI drafting wired later via Anthropic API. PDF generation stubbed — HTML output is primary.

---

## File Structure

### New files
```
src/shared/db/schemas/report-generator.schema.ts
src/modules/report-generator/
  report-generator.types.ts
  report-generator.schemas.ts
  report-generator.repository.ts
  report-generator.service.ts
  report-generator.router.ts
  report-generator.events.ts
  index.ts
  __tests__/report-generator.test.ts
```

### Modified files
```
src/shared/db/schema.ts    — Add re-export
src/shared/inngest.ts      — Add report events
src/server/root.ts         — Wire router
```

---

## Task 1: Drizzle Schema + Types + Schemas

**Files:**
- Create: `src/shared/db/schemas/report-generator.schema.ts`
- Modify: `src/shared/db/schema.ts`
- Create: `src/modules/report-generator/report-generator.types.ts`
- Create: `src/modules/report-generator/report-generator.schemas.ts`

- [ ] **Step 1: Create Drizzle schema**

Create `src/shared/db/schemas/report-generator.schema.ts`:

```typescript
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
```

- [ ] **Step 2: Add re-export**

Add to `src/shared/db/schema.ts`:

```typescript
export * from "./schemas/report-generator.schema"
```

- [ ] **Step 3: Create types**

Create `src/modules/report-generator/report-generator.types.ts`:

```typescript
export type AuditReportStatus = "GENERATING" | "DRAFT" | "IN_REVIEW" | "PUBLISHED";

export interface AuditReportRecord {
  id: string;
  tenantId: string;
  engagementId: string;
  auditSessionId: string;
  status: AuditReportStatus;
  contentHtml: string;
  contentJson: ReportContentJson;
  executiveSummary: string;
  totalEstimatedWaste: number;
  driveFileId: string | null;
  publishedAt: Date | null;
  generatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportContentJson {
  title: string;
  clientName: string;
  auditDate: string;
  executiveSummary: string;
  totalEstimatedWaste: number;
  topFindings: ReportFinding[];
  lenses: ReportLensSection[];
  implementationRoadmap: ReportRoadmapPhase[];
}

export interface ReportLensSection {
  lens: string;
  ragScore: string;
  ragJustification: string;
  currentState: string;
  findings: ReportFinding[];
  recommendations: ReportRecommendation[];
}

export interface ReportFinding {
  finding: string;
  impact: string;
  evidence: string;
  priority: number;
  estimatedAnnualWaste: number | null;
}

export interface ReportRecommendation {
  action: string;
  estimatedEffort: string;
  estimatedCost: number | null;
  priority: number;
}

export interface ReportRoadmapPhase {
  phase: number;
  name: string;
  description: string;
  recommendations: ReportRecommendation[];
  estimatedDuration: string;
}
```

- [ ] **Step 4: Create schemas**

Create `src/modules/report-generator/report-generator.schemas.ts`:

```typescript
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
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/db/schemas/report-generator.schema.ts src/shared/db/schema.ts src/modules/report-generator/
git commit -m "feat(report-generator): add schema, types, and Zod schemas for audit reports"
```

---

## Task 2: Repository + Service

**Files:**
- Create: `src/modules/report-generator/report-generator.repository.ts`
- Create: `src/modules/report-generator/report-generator.service.ts`

- [ ] **Step 1: Create repository**

Create `src/modules/report-generator/report-generator.repository.ts`:

```typescript
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
```

- [ ] **Step 2: Create service**

Create `src/modules/report-generator/report-generator.service.ts`:

```typescript
import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import type { Context } from "@/shared/trpc";
import { reportGeneratorRepository } from "./report-generator.repository";
import { auditWorkspaceService } from "@/modules/audit-workspace/audit-workspace.service";
import type {
  AuditReportRecord,
  AuditReportStatus,
  ReportContentJson,
  ReportLensSection,
  ReportFinding,
  ReportRecommendation,
  ReportRoadmapPhase,
} from "./report-generator.types";
import type { z } from "zod";
import type {
  generateReportSchema,
  getReportSchema,
  getReportByEngagementSchema,
  updateReportContentSchema,
  transitionReportStatusSchema,
} from "./report-generator.schemas";

const log = logger.child({ module: "report-generator.service" });

const VALID_STATUS_TRANSITIONS: Record<string, AuditReportStatus[]> = {
  GENERATING: ["DRAFT"],
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["DRAFT", "PUBLISHED"],
  // PUBLISHED is terminal
};

export const reportGeneratorService = {
  /**
   * Generate a report from audit session data.
   * Pulls all structured data from the audit workspace and assembles it
   * into a ReportContentJson structure. AI drafting is stubbed — this
   * produces the data structure that AI (or manual editing) fills in.
   */
  async generateReport(
    ctx: Context,
    input: z.infer<typeof generateReportSchema>
  ): Promise<AuditReportRecord> {
    // Validate audit session is ready
    const validation = await auditWorkspaceService.validateReadiness(input.auditSessionId);
    if (!validation.isReady) {
      throw new BadRequestError("Audit session is not ready for report generation");
    }

    // Pull full audit data
    const fullSession = await auditWorkspaceService.getFullSession(ctx, {
      auditSessionId: input.auditSessionId,
    });

    // Assemble report content from audit data
    const lenses: ReportLensSection[] = fullSession.lenses.map((lens) => ({
      lens: lens.lens,
      ragScore: lens.ragScore ?? "AMBER",
      ragJustification: lens.ragJustification ?? "",
      currentState: lens.currentState ?? "",
      findings: lens.findings.map((f) => ({
        finding: f.finding,
        impact: f.impact,
        evidence: f.evidence ?? "",
        priority: f.priority,
        estimatedAnnualWaste: f.estimatedAnnualWaste,
      })),
      recommendations: lens.recommendations.map((r) => ({
        action: r.action,
        estimatedEffort: r.estimatedEffort ?? "",
        estimatedCost: r.estimatedCost,
        priority: r.priority,
      })),
    }));

    // Calculate total estimated waste
    const totalEstimatedWaste = lenses.reduce(
      (sum, lens) =>
        sum + lens.findings.reduce((s, f) => s + (f.estimatedAnnualWaste ?? 0), 0),
      0
    );

    // Top 3 findings across all lenses, sorted by priority
    const allFindings = lenses.flatMap((l) => l.findings);
    const topFindings = [...allFindings]
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3);

    // Group recommendations into roadmap phases by priority
    const allRecs = lenses.flatMap((l) => l.recommendations);
    const sortedRecs = [...allRecs].sort((a, b) => a.priority - b.priority);
    const phases: ReportRoadmapPhase[] = [];

    // Phase 1: Quick Wins (priority 1-3), Phase 2: Core Fixes (4-6), Phase 3: Strategic (7+)
    const quickWins = sortedRecs.filter((r) => r.priority <= 3);
    const coreFixes = sortedRecs.filter((r) => r.priority > 3 && r.priority <= 6);
    const strategic = sortedRecs.filter((r) => r.priority > 6);

    if (quickWins.length > 0) {
      phases.push({
        phase: 1,
        name: "Quick Wins",
        description: "High-impact, low-effort changes that deliver immediate value",
        recommendations: quickWins,
        estimatedDuration: "1-2 weeks",
      });
    }
    if (coreFixes.length > 0) {
      phases.push({
        phase: 2,
        name: "Core Fixes",
        description: "Structural improvements to operations and systems",
        recommendations: coreFixes,
        estimatedDuration: "3-6 weeks",
      });
    }
    if (strategic.length > 0) {
      phases.push({
        phase: 3,
        name: "Strategic Changes",
        description: "Long-term optimisations and capability building",
        recommendations: strategic,
        estimatedDuration: "6-12 weeks",
      });
    }

    const contentJson: ReportContentJson = {
      title: "Operational Audit Report",
      clientName: "", // Filled by frontend or AI
      auditDate: new Date().toISOString().split("T")[0],
      executiveSummary: "", // AI fills this
      totalEstimatedWaste,
      topFindings,
      lenses,
      implementationRoadmap: phases,
    };

    // Create report record
    const report = await reportGeneratorRepository.create({
      tenantId: ctx.tenantId,
      engagementId: input.engagementId,
      auditSessionId: input.auditSessionId,
      status: "DRAFT",
      contentJson,
      totalEstimatedWaste,
      generatedBy: "system",
    });

    await inngest.send({
      name: "report-generator/report-created",
      data: {
        reportId: report.id,
        engagementId: input.engagementId,
        tenantId: ctx.tenantId,
      },
    });

    log.info({ reportId: report.id, engagementId: input.engagementId }, "report generated from audit data");
    return report;
  },

  async getReport(ctx: Context, input: z.infer<typeof getReportSchema>): Promise<AuditReportRecord> {
    const report = await reportGeneratorRepository.findById(input.reportId);
    if (!report) throw new NotFoundError("AuditReport", input.reportId);
    return report;
  },

  async getReportByEngagement(
    ctx: Context,
    input: z.infer<typeof getReportByEngagementSchema>
  ): Promise<AuditReportRecord> {
    const report = await reportGeneratorRepository.findByEngagement(ctx.tenantId, input.engagementId);
    if (!report) throw new NotFoundError("AuditReport for engagement", input.engagementId);
    return report;
  },

  async updateContent(
    ctx: Context,
    input: z.infer<typeof updateReportContentSchema>
  ): Promise<AuditReportRecord> {
    const report = await reportGeneratorRepository.findById(input.reportId);
    if (!report) throw new NotFoundError("AuditReport", input.reportId);

    if (report.status === "PUBLISHED") {
      throw new BadRequestError("Cannot edit a published report");
    }

    return reportGeneratorRepository.updateContent(input.reportId, {
      contentHtml: input.contentHtml,
      contentJson: input.contentJson as unknown as ReportContentJson,
      executiveSummary: input.executiveSummary,
    });
  },

  async transitionStatus(
    ctx: Context,
    input: z.infer<typeof transitionReportStatusSchema>
  ): Promise<AuditReportRecord> {
    const report = await reportGeneratorRepository.findById(input.reportId);
    if (!report) throw new NotFoundError("AuditReport", input.reportId);

    const allowed = VALID_STATUS_TRANSITIONS[report.status];
    if (!allowed || !allowed.includes(input.targetStatus)) {
      throw new BadRequestError(
        `Cannot transition report from ${report.status} to ${input.targetStatus}`
      );
    }

    const publishedAt = input.targetStatus === "PUBLISHED" ? new Date() : undefined;
    const updated = await reportGeneratorRepository.updateStatus(
      input.reportId,
      input.targetStatus,
      publishedAt
    );

    if (input.targetStatus === "PUBLISHED") {
      await inngest.send({
        name: "report-generator/report-published",
        data: {
          reportId: input.reportId,
          engagementId: report.engagementId,
          tenantId: ctx.tenantId,
        },
      });
      log.info({ reportId: input.reportId }, "report published");
    }

    return updated;
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/report-generator/report-generator.repository.ts src/modules/report-generator/report-generator.service.ts
git commit -m "feat(report-generator): add repository and service with report generation from audit data"
```

---

## Task 3: Inngest Events + Router + Wiring

**Files:**
- Modify: `src/shared/inngest.ts`
- Create: `src/modules/report-generator/report-generator.events.ts`
- Create: `src/modules/report-generator/report-generator.router.ts`
- Create: `src/modules/report-generator/index.ts`
- Modify: `src/server/root.ts`

- [ ] **Step 1: Add events to inngest.ts**

Add to `IronheartEvents`:

```typescript
  "report-generator/report-created": {
    data: { reportId: string; engagementId: string; tenantId: string };
  };
  "report-generator/report-published": {
    data: { reportId: string; engagementId: string; tenantId: string };
  };
```

- [ ] **Step 2: Create events file**

Create `src/modules/report-generator/report-generator.events.ts`:

```typescript
import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "report-generator.events" });

export const onReportPublished = inngest.createFunction(
  { id: "report-generator/on-report-published", name: "Handle report published" },
  { event: "report-generator/report-published" },
  async ({ event, step }) => {
    const { reportId, engagementId } = event.data;
    log.info({ reportId, engagementId }, "report published — client notification will be sent");
    // Future: send notification to client, update engagement stage to REPORTING
    return { processed: true };
  }
);

export const reportGeneratorFunctions = [onReportPublished];
```

- [ ] **Step 3: Create router**

Create `src/modules/report-generator/report-generator.router.ts`:

```typescript
import { router, tenantProcedure, createModuleMiddleware } from "@/shared/trpc";
import { reportGeneratorService } from "./report-generator.service";
import {
  generateReportSchema,
  getReportSchema,
  getReportByEngagementSchema,
  updateReportContentSchema,
  transitionReportStatusSchema,
} from "./report-generator.schemas";

const moduleGate = createModuleMiddleware("report-generator");
const moduleProcedure = tenantProcedure.use(moduleGate);

export const reportGeneratorRouter = router({
  generate: moduleProcedure
    .input(generateReportSchema)
    .mutation(async ({ ctx, input }) => reportGeneratorService.generateReport(ctx, input)),

  get: moduleProcedure
    .input(getReportSchema)
    .query(async ({ ctx, input }) => reportGeneratorService.getReport(ctx, input)),

  getByEngagement: moduleProcedure
    .input(getReportByEngagementSchema)
    .query(async ({ ctx, input }) => reportGeneratorService.getReportByEngagement(ctx, input)),

  updateContent: moduleProcedure
    .input(updateReportContentSchema)
    .mutation(async ({ ctx, input }) => reportGeneratorService.updateContent(ctx, input)),

  transitionStatus: moduleProcedure
    .input(transitionReportStatusSchema)
    .mutation(async ({ ctx, input }) => reportGeneratorService.transitionStatus(ctx, input)),
});
```

- [ ] **Step 4: Create barrel export + wire**

Create `src/modules/report-generator/index.ts`:

```typescript
export { reportGeneratorRouter } from "./report-generator.router";
```

In `src/server/root.ts`:
- Add: `import { reportGeneratorRouter } from "@/modules/report-generator";`
- Add to appRouter: `reportGenerator: reportGeneratorRouter,`

- [ ] **Step 5: Commit**

```bash
git add src/shared/inngest.ts src/modules/report-generator/ src/server/root.ts
git commit -m "feat(report-generator): add router, events, and wire into root"
```

---

## Task 4: Tests + Verification

**Files:**
- Create: `src/modules/report-generator/__tests__/report-generator.test.ts`

- [ ] **Step 1: Create test file**

Create `src/modules/report-generator/__tests__/report-generator.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { reportGeneratorService } from "../report-generator.service";
import { reportGeneratorRepository } from "../report-generator.repository";
import { auditWorkspaceService } from "@/modules/audit-workspace/audit-workspace.service";
import { BadRequestError, NotFoundError } from "@/shared/errors";

vi.mock("../report-generator.repository", () => ({
  reportGeneratorRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByEngagement: vi.fn(),
    updateContent: vi.fn(),
    updateStatus: vi.fn(),
    setDriveFileId: vi.fn(),
  },
}));

vi.mock("@/modules/audit-workspace/audit-workspace.service", () => ({
  auditWorkspaceService: {
    validateReadiness: vi.fn(),
    getFullSession: vi.fn(),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn() },
}));

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const ENGAGEMENT_ID = "00000000-0000-0000-0000-000000000010";
const SESSION_ID = "00000000-0000-0000-0000-000000000020";
const REPORT_ID = "00000000-0000-0000-0000-000000000040";

function makeCtx() {
  return { tenantId: TENANT_ID, userId: "user-1" } as any;
}

function makeReport(status = "DRAFT") {
  return {
    id: REPORT_ID,
    tenantId: TENANT_ID,
    engagementId: ENGAGEMENT_ID,
    auditSessionId: SESSION_ID,
    status,
    contentHtml: "",
    contentJson: {},
    executiveSummary: "",
    totalEstimatedWaste: 47200,
    driveFileId: null,
    publishedAt: null,
    generatedBy: "system",
  };
}

function makeFullSession() {
  return {
    id: SESSION_ID,
    tenantId: TENANT_ID,
    engagementId: ENGAGEMENT_ID,
    status: "READY_FOR_REPORT",
    callNotes: [],
    lenses: [
      {
        id: "lens-1",
        lens: "REVENUE",
        ragScore: "RED",
        ragJustification: "No CRM",
        currentState: "Revenue from referrals only",
        findings: [
          { finding: "No CRM", impact: "HIGH", evidence: "Leads in memory", priority: 1, estimatedAnnualWaste: 18200 },
        ],
        recommendations: [
          { action: "Implement CRM", estimatedEffort: "3 days", estimatedCost: 1200, priority: 1 },
        ],
      },
      {
        id: "lens-2",
        lens: "OPERATIONS",
        ragScore: "AMBER",
        ragJustification: "Manual processes",
        currentState: "Heavy manual work",
        findings: [
          { finding: "Manual invoicing", impact: "HIGH", evidence: "45 mins/day", priority: 2, estimatedAnnualWaste: 29000 },
        ],
        recommendations: [
          { action: "Automate invoicing", estimatedEffort: "2 days", estimatedCost: 800, priority: 2 },
        ],
      },
      {
        id: "lens-3", lens: "FINANCE", ragScore: "RED", ragJustification: "No visibility", currentState: "Poor",
        findings: [{ finding: "No cash flow visibility", impact: "MEDIUM", evidence: "Owner guesses", priority: 3, estimatedAnnualWaste: null }],
        recommendations: [{ action: "Dashboard", estimatedEffort: "1 day", estimatedCost: 500, priority: 5 }],
      },
      {
        id: "lens-4", lens: "TECHNOLOGY", ragScore: "AMBER", ragJustification: "Disconnected tools", currentState: "OK",
        findings: [{ finding: "No integrations", impact: "MEDIUM", evidence: "Re-entry", priority: 4, estimatedAnnualWaste: null }],
        recommendations: [{ action: "Integrate tools", estimatedEffort: "5 days", estimatedCost: 2000, priority: 4 }],
      },
      {
        id: "lens-5", lens: "TEAM", ragScore: "GREEN", ragJustification: "Good team", currentState: "Strong",
        findings: [{ finding: "Key-person dependency", impact: "LOW", evidence: "Owner does everything", priority: 5, estimatedAnnualWaste: null }],
        recommendations: [{ action: "Document processes", estimatedEffort: "3 days", estimatedCost: 600, priority: 7 }],
      },
    ],
  };
}

describe("reportGeneratorService.generateReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates report from audit data with correct structure", async () => {
    vi.mocked(auditWorkspaceService.validateReadiness).mockResolvedValue({
      isReady: true, missingLenses: [], lensesWithoutRag: [], lensesWithoutFindings: [],
    });
    vi.mocked(auditWorkspaceService.getFullSession).mockResolvedValue(makeFullSession() as any);
    vi.mocked(reportGeneratorRepository.create).mockImplementation(async (data) => ({
      ...makeReport("DRAFT"),
      contentJson: data.contentJson,
      totalEstimatedWaste: data.totalEstimatedWaste,
    } as any));

    const result = await reportGeneratorService.generateReport(makeCtx(), {
      auditSessionId: SESSION_ID,
      engagementId: ENGAGEMENT_ID,
    });

    expect(reportGeneratorRepository.create).toHaveBeenCalled();
    const createCall = vi.mocked(reportGeneratorRepository.create).mock.calls[0][0];
    expect(createCall.totalEstimatedWaste).toBe(47200);
    expect(createCall.contentJson).toBeDefined();
    const json = createCall.contentJson!;
    expect(json.lenses).toHaveLength(5);
    expect(json.topFindings).toHaveLength(3);
    expect(json.implementationRoadmap.length).toBeGreaterThan(0);
  });

  it("rejects when audit session is not ready", async () => {
    vi.mocked(auditWorkspaceService.validateReadiness).mockResolvedValue({
      isReady: false, missingLenses: ["TEAM"], lensesWithoutRag: [], lensesWithoutFindings: [],
    });

    await expect(
      reportGeneratorService.generateReport(makeCtx(), {
        auditSessionId: SESSION_ID,
        engagementId: ENGAGEMENT_ID,
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("calculates total waste from all lens findings", async () => {
    vi.mocked(auditWorkspaceService.validateReadiness).mockResolvedValue({
      isReady: true, missingLenses: [], lensesWithoutRag: [], lensesWithoutFindings: [],
    });
    vi.mocked(auditWorkspaceService.getFullSession).mockResolvedValue(makeFullSession() as any);
    vi.mocked(reportGeneratorRepository.create).mockImplementation(async (data) => ({
      ...makeReport(), totalEstimatedWaste: data.totalEstimatedWaste,
    } as any));

    await reportGeneratorService.generateReport(makeCtx(), {
      auditSessionId: SESSION_ID, engagementId: ENGAGEMENT_ID,
    });

    const createCall = vi.mocked(reportGeneratorRepository.create).mock.calls[0][0];
    // 18200 (revenue) + 29000 (operations) = 47200
    expect(createCall.totalEstimatedWaste).toBe(47200);
  });
});

describe("reportGeneratorService.transitionStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows DRAFT → IN_REVIEW", async () => {
    vi.mocked(reportGeneratorRepository.findById).mockResolvedValue(makeReport("DRAFT") as any);
    vi.mocked(reportGeneratorRepository.updateStatus).mockResolvedValue(makeReport("IN_REVIEW") as any);

    const result = await reportGeneratorService.transitionStatus(makeCtx(), {
      reportId: REPORT_ID, targetStatus: "IN_REVIEW",
    });
    expect(result.status).toBe("IN_REVIEW");
  });

  it("allows IN_REVIEW → PUBLISHED and sets publishedAt", async () => {
    vi.mocked(reportGeneratorRepository.findById).mockResolvedValue(makeReport("IN_REVIEW") as any);
    vi.mocked(reportGeneratorRepository.updateStatus).mockResolvedValue(makeReport("PUBLISHED") as any);

    await reportGeneratorService.transitionStatus(makeCtx(), {
      reportId: REPORT_ID, targetStatus: "PUBLISHED",
    });

    expect(reportGeneratorRepository.updateStatus).toHaveBeenCalledWith(
      REPORT_ID, "PUBLISHED", expect.any(Date)
    );
  });

  it("allows IN_REVIEW → DRAFT (send back for edits)", async () => {
    vi.mocked(reportGeneratorRepository.findById).mockResolvedValue(makeReport("IN_REVIEW") as any);
    vi.mocked(reportGeneratorRepository.updateStatus).mockResolvedValue(makeReport("DRAFT") as any);

    const result = await reportGeneratorService.transitionStatus(makeCtx(), {
      reportId: REPORT_ID, targetStatus: "DRAFT",
    });
    expect(result.status).toBe("DRAFT");
  });

  it("rejects DRAFT → PUBLISHED (must go through review)", async () => {
    vi.mocked(reportGeneratorRepository.findById).mockResolvedValue(makeReport("DRAFT") as any);

    await expect(
      reportGeneratorService.transitionStatus(makeCtx(), {
        reportId: REPORT_ID, targetStatus: "PUBLISHED",
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("rejects transitions from PUBLISHED", async () => {
    vi.mocked(reportGeneratorRepository.findById).mockResolvedValue(makeReport("PUBLISHED") as any);

    await expect(
      reportGeneratorService.transitionStatus(makeCtx(), {
        reportId: REPORT_ID, targetStatus: "DRAFT",
      })
    ).rejects.toThrow(BadRequestError);
  });
});

describe("reportGeneratorService.updateContent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects edits to published reports", async () => {
    vi.mocked(reportGeneratorRepository.findById).mockResolvedValue(makeReport("PUBLISHED") as any);

    await expect(
      reportGeneratorService.updateContent(makeCtx(), {
        reportId: REPORT_ID, executiveSummary: "Updated",
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("allows edits to draft reports", async () => {
    vi.mocked(reportGeneratorRepository.findById).mockResolvedValue(makeReport("DRAFT") as any);
    vi.mocked(reportGeneratorRepository.updateContent).mockResolvedValue(makeReport("DRAFT") as any);

    await reportGeneratorService.updateContent(makeCtx(), {
      reportId: REPORT_ID, executiveSummary: "Updated summary",
    });

    expect(reportGeneratorRepository.updateContent).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/modules/report-generator/`
Expected: All tests pass.

- [ ] **Step 3: Run tsc + full suite**

Run: `npx tsc --noEmit && npx vitest run src/modules/ 2>&1 | tail -5`
Expected: Clean tsc, no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/modules/report-generator/__tests__/
git commit -m "test(report-generator): add tests for generation, status transitions, and content editing"
```
