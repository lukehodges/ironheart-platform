# Consulting Pipeline Phase 2A: Audit Core Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the audit workspace backend — 5-lens data model, call notes per contact, RAG scoring, structured findings tables, and recommendations. This is the core data layer that captures everything during a consulting audit.

**Architecture:** New `audit-workspace` module (existing `audit` module is for internal audit logging — different thing). New Drizzle schema file for 5 tables. Follows established module pattern (types → schemas → repository → service → router → events → tests).

**Tech Stack:** Drizzle ORM, tRPC 11, Zod, Inngest, Vitest

**Spec:** `docs/superpowers/specs/2026-05-10-consulting-pipeline-design.md` (Section 5.5)

**Note:** Backend only. Frontend audit workspace UI is Phase 2B.

---

## File Structure

### New files
```
src/shared/db/schemas/audit-workspace.schema.ts   — 5 new tables + 3 enums
src/modules/audit-workspace/
  audit-workspace.types.ts
  audit-workspace.schemas.ts
  audit-workspace.repository.ts
  audit-workspace.service.ts
  audit-workspace.router.ts
  audit-workspace.events.ts
  index.ts
  __tests__/audit-workspace.test.ts
```

### Modified files
```
src/shared/db/schema.ts        — Add re-export for audit-workspace.schema
src/shared/inngest.ts          — Add audit workspace events
src/server/root.ts             — Wire auditWorkspace router
```

---

## Task 1: Create Drizzle Schema

**Files:**
- Create: `src/shared/db/schemas/audit-workspace.schema.ts`
- Modify: `src/shared/db/schema.ts`

- [ ] **Step 1: Create schema file**

Create `src/shared/db/schemas/audit-workspace.schema.ts`:

```typescript
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
```

- [ ] **Step 2: Add re-export to schema barrel**

Add to `src/shared/db/schema.ts`:

```typescript
export * from "./schemas/audit-workspace.schema"
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/db/schemas/audit-workspace.schema.ts src/shared/db/schema.ts
git commit -m "feat(audit-workspace): add Drizzle schema for 5 audit tables + enums"
```

---

## Task 2: Create Types & Schemas

**Files:**
- Create: `src/modules/audit-workspace/audit-workspace.types.ts`
- Create: `src/modules/audit-workspace/audit-workspace.schemas.ts`

- [ ] **Step 1: Create types**

Create `src/modules/audit-workspace/audit-workspace.types.ts`:

```typescript
export type AuditSessionStatus = "IN_PROGRESS" | "PROCESSING" | "READY_FOR_REPORT" | "COMPLETE";
export type AuditLens = "REVENUE" | "OPERATIONS" | "FINANCE" | "TECHNOLOGY" | "TEAM";
export type RagScore = "RED" | "AMBER" | "GREEN";
export type FindingImpact = "HIGH" | "MEDIUM" | "LOW";

export const ALL_LENSES: AuditLens[] = ["REVENUE", "OPERATIONS", "FINANCE", "TECHNOLOGY", "TEAM"];

export interface AuditSessionRecord {
  id: string;
  tenantId: string;
  engagementId: string;
  status: AuditSessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditCallNoteRecord {
  id: string;
  auditSessionId: string;
  contactUserId: string;
  rawNotes: string;
  callDate: Date | null;
  callDuration: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLensAnalysisRecord {
  id: string;
  auditSessionId: string;
  lens: AuditLens;
  ragScore: RagScore | null;
  ragJustification: string | null;
  currentState: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditFindingRecord {
  id: string;
  lensAnalysisId: string;
  finding: string;
  impact: FindingImpact;
  evidence: string | null;
  priority: number;
  estimatedAnnualWaste: number | null;
  createdAt: Date;
}

export interface AuditRecommendationRecord {
  id: string;
  lensAnalysisId: string;
  action: string;
  estimatedEffort: string | null;
  estimatedCost: number | null;
  priority: number;
  createdAt: Date;
}

export interface AuditSessionWithLenses extends AuditSessionRecord {
  lenses: (AuditLensAnalysisRecord & {
    findings: AuditFindingRecord[];
    recommendations: AuditRecommendationRecord[];
  })[];
  callNotes: AuditCallNoteRecord[];
}

export interface AuditValidationResult {
  isReady: boolean;
  missingLenses: AuditLens[];
  lensesWithoutFindings: AuditLens[];
  lensesWithoutRag: AuditLens[];
}
```

- [ ] **Step 2: Create schemas**

Create `src/modules/audit-workspace/audit-workspace.schemas.ts`:

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/audit-workspace/
git commit -m "feat(audit-workspace): add types and Zod schemas for audit data model"
```

---

## Task 3: Create Repository

**Files:**
- Create: `src/modules/audit-workspace/audit-workspace.repository.ts`

- [ ] **Step 1: Create repository**

Create `src/modules/audit-workspace/audit-workspace.repository.ts`:

```typescript
import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import {
  auditSessions,
  auditCallNotes,
  auditLensAnalysis,
  auditFindings,
  auditRecommendations,
} from "@/shared/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type {
  AuditSessionRecord,
  AuditCallNoteRecord,
  AuditLensAnalysisRecord,
  AuditFindingRecord,
  AuditRecommendationRecord,
  AuditLens,
} from "./audit-workspace.types";

const log = logger.child({ module: "audit-workspace.repository" });

export const auditWorkspaceRepository = {
  // ── Sessions ────────────────────────────────────────────────────────────

  async createSession(tenantId: string, engagementId: string): Promise<AuditSessionRecord> {
    const rows = await db
      .insert(auditSessions)
      .values({ tenantId, engagementId, updatedAt: new Date() })
      .returning();
    log.info({ engagementId }, "audit session created");
    return rows[0] as AuditSessionRecord;
  },

  async findSessionById(sessionId: string): Promise<AuditSessionRecord | null> {
    const rows = await db
      .select()
      .from(auditSessions)
      .where(eq(auditSessions.id, sessionId))
      .limit(1);
    return (rows[0] as AuditSessionRecord) ?? null;
  },

  async findSessionByEngagement(tenantId: string, engagementId: string): Promise<AuditSessionRecord | null> {
    const rows = await db
      .select()
      .from(auditSessions)
      .where(and(eq(auditSessions.tenantId, tenantId), eq(auditSessions.engagementId, engagementId)))
      .orderBy(desc(auditSessions.createdAt))
      .limit(1);
    return (rows[0] as AuditSessionRecord) ?? null;
  },

  async updateSessionStatus(sessionId: string, status: string): Promise<AuditSessionRecord> {
    const rows = await db
      .update(auditSessions)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(auditSessions.id, sessionId))
      .returning();
    if (rows.length === 0) throw new NotFoundError("AuditSession", sessionId);
    return rows[0] as AuditSessionRecord;
  },

  // ── Call Notes ──────────────────────────────────────────────────────────

  async upsertCallNotes(
    sessionId: string,
    contactUserId: string,
    rawNotes: string,
    callDate?: Date | null,
    callDuration?: number | null,
  ): Promise<AuditCallNoteRecord> {
    // Check if notes exist for this contact
    const existing = await db
      .select()
      .from(auditCallNotes)
      .where(and(eq(auditCallNotes.auditSessionId, sessionId), eq(auditCallNotes.contactUserId, contactUserId)))
      .limit(1);

    if (existing.length > 0) {
      const rows = await db
        .update(auditCallNotes)
        .set({ rawNotes, callDate, callDuration, updatedAt: new Date() })
        .where(eq(auditCallNotes.id, existing[0].id))
        .returning();
      return rows[0] as AuditCallNoteRecord;
    }

    const rows = await db
      .insert(auditCallNotes)
      .values({ auditSessionId: sessionId, contactUserId, rawNotes, callDate, callDuration, updatedAt: new Date() })
      .returning();
    return rows[0] as AuditCallNoteRecord;
  },

  async listCallNotes(sessionId: string): Promise<AuditCallNoteRecord[]> {
    const rows = await db
      .select()
      .from(auditCallNotes)
      .where(eq(auditCallNotes.auditSessionId, sessionId));
    return rows as AuditCallNoteRecord[];
  },

  // ── Lens Analysis ──────────────────────────────────────────────────────

  async upsertLensAnalysis(
    sessionId: string,
    lens: AuditLens,
    data: { ragScore?: string | null; ragJustification?: string | null; currentState?: string | null },
  ): Promise<AuditLensAnalysisRecord> {
    const existing = await db
      .select()
      .from(auditLensAnalysis)
      .where(and(eq(auditLensAnalysis.auditSessionId, sessionId), eq(auditLensAnalysis.lens, lens as any)))
      .limit(1);

    if (existing.length > 0) {
      const rows = await db
        .update(auditLensAnalysis)
        .set({ ...data, ragScore: data.ragScore as any, updatedAt: new Date() })
        .where(eq(auditLensAnalysis.id, existing[0].id))
        .returning();
      return rows[0] as AuditLensAnalysisRecord;
    }

    const lensOrder = ["REVENUE", "OPERATIONS", "FINANCE", "TECHNOLOGY", "TEAM"];
    const rows = await db
      .insert(auditLensAnalysis)
      .values({
        auditSessionId: sessionId,
        lens: lens as any,
        ragScore: data.ragScore as any,
        ragJustification: data.ragJustification,
        currentState: data.currentState,
        sortOrder: lensOrder.indexOf(lens),
        updatedAt: new Date(),
      })
      .returning();
    return rows[0] as AuditLensAnalysisRecord;
  },

  async listLensAnalysis(sessionId: string): Promise<AuditLensAnalysisRecord[]> {
    const rows = await db
      .select()
      .from(auditLensAnalysis)
      .where(eq(auditLensAnalysis.auditSessionId, sessionId))
      .orderBy(auditLensAnalysis.sortOrder);
    return rows as AuditLensAnalysisRecord[];
  },

  // ── Findings ───────────────────────────────────────────────────────────

  async createFinding(data: {
    lensAnalysisId: string;
    finding: string;
    impact: string;
    evidence?: string | null;
    priority: number;
    estimatedAnnualWaste?: number | null;
  }): Promise<AuditFindingRecord> {
    const rows = await db
      .insert(auditFindings)
      .values({ ...data, impact: data.impact as any })
      .returning();
    return rows[0] as AuditFindingRecord;
  },

  async updateFinding(id: string, data: Partial<{
    finding: string;
    impact: string;
    evidence: string | null;
    priority: number;
    estimatedAnnualWaste: number | null;
  }>): Promise<AuditFindingRecord> {
    const rows = await db
      .update(auditFindings)
      .set({ ...data, impact: data.impact as any })
      .where(eq(auditFindings.id, id))
      .returning();
    if (rows.length === 0) throw new NotFoundError("AuditFinding", id);
    return rows[0] as AuditFindingRecord;
  },

  async deleteFinding(id: string): Promise<void> {
    const rows = await db.delete(auditFindings).where(eq(auditFindings.id, id)).returning();
    if (rows.length === 0) throw new NotFoundError("AuditFinding", id);
  },

  async listFindings(lensAnalysisId: string): Promise<AuditFindingRecord[]> {
    return db
      .select()
      .from(auditFindings)
      .where(eq(auditFindings.lensAnalysisId, lensAnalysisId))
      .orderBy(auditFindings.priority) as Promise<AuditFindingRecord[]>;
  },

  // ── Recommendations ────────────────────────────────────────────────────

  async createRecommendation(data: {
    lensAnalysisId: string;
    action: string;
    estimatedEffort?: string | null;
    estimatedCost?: number | null;
    priority: number;
  }): Promise<AuditRecommendationRecord> {
    const rows = await db.insert(auditRecommendations).values(data).returning();
    return rows[0] as AuditRecommendationRecord;
  },

  async updateRecommendation(id: string, data: Partial<{
    action: string;
    estimatedEffort: string | null;
    estimatedCost: number | null;
    priority: number;
  }>): Promise<AuditRecommendationRecord> {
    const rows = await db.update(auditRecommendations).set(data).where(eq(auditRecommendations.id, id)).returning();
    if (rows.length === 0) throw new NotFoundError("AuditRecommendation", id);
    return rows[0] as AuditRecommendationRecord;
  },

  async deleteRecommendation(id: string): Promise<void> {
    const rows = await db.delete(auditRecommendations).where(eq(auditRecommendations.id, id)).returning();
    if (rows.length === 0) throw new NotFoundError("AuditRecommendation", id);
  },

  async listRecommendations(lensAnalysisId: string): Promise<AuditRecommendationRecord[]> {
    return db
      .select()
      .from(auditRecommendations)
      .where(eq(auditRecommendations.lensAnalysisId, lensAnalysisId))
      .orderBy(auditRecommendations.priority) as Promise<AuditRecommendationRecord[]>;
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/audit-workspace/audit-workspace.repository.ts
git commit -m "feat(audit-workspace): add repository with CRUD for all 5 tables"
```

---

## Task 4: Create Service with Validation

**Files:**
- Create: `src/modules/audit-workspace/audit-workspace.service.ts`

- [ ] **Step 1: Create service**

Create `src/modules/audit-workspace/audit-workspace.service.ts`:

```typescript
import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import type { Context } from "@/shared/trpc";
import { auditWorkspaceRepository } from "./audit-workspace.repository";
import { ALL_LENSES, type AuditLens, type AuditValidationResult, type AuditSessionWithLenses } from "./audit-workspace.types";
import type { z } from "zod";
import type {
  createAuditSessionSchema,
  updateCallNotesSchema,
  upsertLensAnalysisSchema,
  createFindingSchema,
  updateFindingSchema,
  createRecommendationSchema,
  updateRecommendationSchema,
  getAuditSessionSchema,
  getByEngagementSchema,
} from "./audit-workspace.schemas";

const log = logger.child({ module: "audit-workspace.service" });

export const auditWorkspaceService = {
  async createSession(ctx: Context, input: z.infer<typeof createAuditSessionSchema>) {
    // Check no active session exists
    const existing = await auditWorkspaceRepository.findSessionByEngagement(ctx.tenantId, input.engagementId);
    if (existing && existing.status !== "COMPLETE") {
      throw new BadRequestError("An active audit session already exists for this engagement");
    }

    const session = await auditWorkspaceRepository.createSession(ctx.tenantId, input.engagementId);

    await inngest.send({
      name: "audit-workspace/session-created",
      data: { auditSessionId: session.id, engagementId: input.engagementId, tenantId: ctx.tenantId },
    });

    log.info({ engagementId: input.engagementId, sessionId: session.id }, "audit session created");
    return session;
  },

  async getSession(ctx: Context, input: z.infer<typeof getAuditSessionSchema>) {
    const session = await auditWorkspaceRepository.findSessionById(input.auditSessionId);
    if (!session) throw new NotFoundError("AuditSession", input.auditSessionId);
    return session;
  },

  async getSessionByEngagement(ctx: Context, input: z.infer<typeof getByEngagementSchema>) {
    const session = await auditWorkspaceRepository.findSessionByEngagement(ctx.tenantId, input.engagementId);
    if (!session) throw new NotFoundError("AuditSession for engagement", input.engagementId);
    return session;
  },

  async getFullSession(ctx: Context, input: z.infer<typeof getAuditSessionSchema>): Promise<AuditSessionWithLenses> {
    const session = await auditWorkspaceRepository.findSessionById(input.auditSessionId);
    if (!session) throw new NotFoundError("AuditSession", input.auditSessionId);

    const callNotes = await auditWorkspaceRepository.listCallNotes(input.auditSessionId);
    const lensRows = await auditWorkspaceRepository.listLensAnalysis(input.auditSessionId);

    const lenses = await Promise.all(
      lensRows.map(async (lens) => ({
        ...lens,
        findings: await auditWorkspaceRepository.listFindings(lens.id),
        recommendations: await auditWorkspaceRepository.listRecommendations(lens.id),
      }))
    );

    return { ...session, lenses, callNotes };
  },

  async updateCallNotes(ctx: Context, input: z.infer<typeof updateCallNotesSchema>) {
    return auditWorkspaceRepository.upsertCallNotes(
      input.auditSessionId,
      input.contactUserId,
      input.rawNotes,
      input.callDate,
      input.callDuration,
    );
  },

  async upsertLensAnalysis(ctx: Context, input: z.infer<typeof upsertLensAnalysisSchema>) {
    return auditWorkspaceRepository.upsertLensAnalysis(
      input.auditSessionId,
      input.lens,
      {
        ragScore: input.ragScore,
        ragJustification: input.ragJustification,
        currentState: input.currentState,
      },
    );
  },

  // ── Findings CRUD ──────────────────────────────────────────────────────

  async createFinding(ctx: Context, input: z.infer<typeof createFindingSchema>) {
    return auditWorkspaceRepository.createFinding(input);
  },

  async updateFinding(ctx: Context, input: z.infer<typeof updateFindingSchema>) {
    const { id, ...data } = input;
    return auditWorkspaceRepository.updateFinding(id, data);
  },

  async deleteFinding(ctx: Context, id: string) {
    return auditWorkspaceRepository.deleteFinding(id);
  },

  // ── Recommendations CRUD ───────────────────────────────────────────────

  async createRecommendation(ctx: Context, input: z.infer<typeof createRecommendationSchema>) {
    return auditWorkspaceRepository.createRecommendation(input);
  },

  async updateRecommendation(ctx: Context, input: z.infer<typeof updateRecommendationSchema>) {
    const { id, ...data } = input;
    return auditWorkspaceRepository.updateRecommendation(id, data);
  },

  async deleteRecommendation(ctx: Context, id: string) {
    return auditWorkspaceRepository.deleteRecommendation(id);
  },

  // ── Validation ─────────────────────────────────────────────────────────

  async validateReadiness(sessionId: string): Promise<AuditValidationResult> {
    const lenses = await auditWorkspaceRepository.listLensAnalysis(sessionId);
    const coveredLenses = lenses.map((l) => l.lens as AuditLens);

    const missingLenses = ALL_LENSES.filter((l) => !coveredLenses.includes(l));
    const lensesWithoutRag = lenses.filter((l) => !l.ragScore).map((l) => l.lens as AuditLens);

    const lensesWithoutFindings: AuditLens[] = [];
    for (const lens of lenses) {
      const findings = await auditWorkspaceRepository.listFindings(lens.id);
      if (findings.length === 0) {
        lensesWithoutFindings.push(lens.lens as AuditLens);
      }
    }

    const isReady = missingLenses.length === 0 && lensesWithoutRag.length === 0 && lensesWithoutFindings.length === 0;

    return { isReady, missingLenses, lensesWithoutFindings, lensesWithoutRag };
  },

  async markReadyForReport(ctx: Context, sessionId: string) {
    const validation = await this.validateReadiness(sessionId);
    if (!validation.isReady) {
      throw new BadRequestError(
        `Audit not ready: missing lenses: ${validation.missingLenses.join(", ") || "none"}, ` +
        `no RAG: ${validation.lensesWithoutRag.join(", ") || "none"}, ` +
        `no findings: ${validation.lensesWithoutFindings.join(", ") || "none"}`
      );
    }

    const session = await auditWorkspaceRepository.updateSessionStatus(sessionId, "READY_FOR_REPORT");

    await inngest.send({
      name: "audit-workspace/ready-for-report",
      data: { auditSessionId: sessionId, tenantId: ctx.tenantId },
    });

    log.info({ sessionId }, "audit session marked ready for report");
    return session;
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/audit-workspace/audit-workspace.service.ts
git commit -m "feat(audit-workspace): add service with validation, CRUD, and readiness checks"
```

---

## Task 5: Add Inngest Events + Create Router + Wire

**Files:**
- Modify: `src/shared/inngest.ts`
- Create: `src/modules/audit-workspace/audit-workspace.events.ts`
- Create: `src/modules/audit-workspace/audit-workspace.router.ts`
- Create: `src/modules/audit-workspace/index.ts`
- Modify: `src/server/root.ts`

- [ ] **Step 1: Add events to inngest.ts**

Add to `IronheartEvents` in `src/shared/inngest.ts`:

```typescript
  "audit-workspace/session-created": {
    data: { auditSessionId: string; engagementId: string; tenantId: string };
  };
  "audit-workspace/ready-for-report": {
    data: { auditSessionId: string; tenantId: string };
  };
```

- [ ] **Step 2: Create events file**

Create `src/modules/audit-workspace/audit-workspace.events.ts`:

```typescript
import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "audit-workspace.events" });

export const onSessionCreated = inngest.createFunction(
  { id: "audit-workspace/on-session-created", name: "Handle audit session created" },
  { event: "audit-workspace/session-created" },
  async ({ event, step }) => {
    const { auditSessionId, engagementId } = event.data;
    log.info({ auditSessionId, engagementId }, "audit session created event received");
    return { processed: true };
  }
);

export const auditWorkspaceFunctions = [onSessionCreated];
```

- [ ] **Step 3: Create router**

Create `src/modules/audit-workspace/audit-workspace.router.ts`:

```typescript
import { z } from "zod";
import { router, tenantProcedure, createModuleMiddleware } from "@/shared/trpc";
import { auditWorkspaceService } from "./audit-workspace.service";
import {
  createAuditSessionSchema,
  updateCallNotesSchema,
  upsertLensAnalysisSchema,
  createFindingSchema,
  updateFindingSchema,
  createRecommendationSchema,
  updateRecommendationSchema,
  getAuditSessionSchema,
  getByEngagementSchema,
  deleteFindingSchema,
  deleteRecommendationSchema,
} from "./audit-workspace.schemas";

const moduleGate = createModuleMiddleware("audit-workspace");
const moduleProcedure = tenantProcedure.use(moduleGate);

export const auditWorkspaceRouter = router({
  createSession: moduleProcedure
    .input(createAuditSessionSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.createSession(ctx, input)),

  getSession: moduleProcedure
    .input(getAuditSessionSchema)
    .query(async ({ ctx, input }) => auditWorkspaceService.getSession(ctx, input)),

  getByEngagement: moduleProcedure
    .input(getByEngagementSchema)
    .query(async ({ ctx, input }) => auditWorkspaceService.getSessionByEngagement(ctx, input)),

  getFull: moduleProcedure
    .input(getAuditSessionSchema)
    .query(async ({ ctx, input }) => auditWorkspaceService.getFullSession(ctx, input)),

  updateCallNotes: moduleProcedure
    .input(updateCallNotesSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.updateCallNotes(ctx, input)),

  upsertLens: moduleProcedure
    .input(upsertLensAnalysisSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.upsertLensAnalysis(ctx, input)),

  createFinding: moduleProcedure
    .input(createFindingSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.createFinding(ctx, input)),

  updateFinding: moduleProcedure
    .input(updateFindingSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.updateFinding(ctx, input)),

  deleteFinding: moduleProcedure
    .input(deleteFindingSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.deleteFinding(ctx, input.id)),

  createRecommendation: moduleProcedure
    .input(createRecommendationSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.createRecommendation(ctx, input)),

  updateRecommendation: moduleProcedure
    .input(updateRecommendationSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.updateRecommendation(ctx, input)),

  deleteRecommendation: moduleProcedure
    .input(deleteRecommendationSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.deleteRecommendation(ctx, input.id)),

  validateReadiness: moduleProcedure
    .input(getAuditSessionSchema)
    .query(async ({ input }) => auditWorkspaceService.validateReadiness(input.auditSessionId)),

  markReadyForReport: moduleProcedure
    .input(getAuditSessionSchema)
    .mutation(async ({ ctx, input }) => auditWorkspaceService.markReadyForReport(ctx, input.auditSessionId)),
});
```

- [ ] **Step 4: Create barrel export**

Create `src/modules/audit-workspace/index.ts`:

```typescript
export { auditWorkspaceRouter } from "./audit-workspace.router";
```

- [ ] **Step 5: Wire into root router**

In `src/server/root.ts`:
- Add: `import { auditWorkspaceRouter } from "@/modules/audit-workspace";`
- Add to appRouter: `auditWorkspace: auditWorkspaceRouter,`

- [ ] **Step 6: Commit**

```bash
git add src/shared/inngest.ts src/modules/audit-workspace/ src/server/root.ts
git commit -m "feat(audit-workspace): add router, events, and wire into root"
```

---

## Task 6: Write Tests

**Files:**
- Create: `src/modules/audit-workspace/__tests__/audit-workspace.test.ts`

- [ ] **Step 1: Create test file**

Create `src/modules/audit-workspace/__tests__/audit-workspace.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { auditWorkspaceService } from "../audit-workspace.service";
import { auditWorkspaceRepository } from "../audit-workspace.repository";
import { BadRequestError, NotFoundError } from "@/shared/errors";

vi.mock("../audit-workspace.repository", () => ({
  auditWorkspaceRepository: {
    createSession: vi.fn(),
    findSessionById: vi.fn(),
    findSessionByEngagement: vi.fn(),
    updateSessionStatus: vi.fn(),
    upsertCallNotes: vi.fn(),
    listCallNotes: vi.fn(),
    upsertLensAnalysis: vi.fn(),
    listLensAnalysis: vi.fn(),
    createFinding: vi.fn(),
    updateFinding: vi.fn(),
    deleteFinding: vi.fn(),
    listFindings: vi.fn(),
    createRecommendation: vi.fn(),
    updateRecommendation: vi.fn(),
    deleteRecommendation: vi.fn(),
    listRecommendations: vi.fn(),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn() },
}));

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const SESSION_ID = "00000000-0000-0000-0000-000000000020";
const ENGAGEMENT_ID = "00000000-0000-0000-0000-000000000010";
const LENS_ID = "00000000-0000-0000-0000-000000000030";

function makeCtx() {
  return { tenantId: TENANT_ID, userId: "user-1" } as any;
}

function makeSession(status = "IN_PROGRESS") {
  return { id: SESSION_ID, tenantId: TENANT_ID, engagementId: ENGAGEMENT_ID, status };
}

function makeLens(lens: string, ragScore: string | null = "RED") {
  return { id: LENS_ID, auditSessionId: SESSION_ID, lens, ragScore, sortOrder: 0 };
}

describe("auditWorkspaceService.createSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new session for an engagement", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(null);
    vi.mocked(auditWorkspaceRepository.createSession).mockResolvedValue(makeSession());

    const result = await auditWorkspaceService.createSession(makeCtx(), { engagementId: ENGAGEMENT_ID });

    expect(result.id).toBe(SESSION_ID);
    expect(auditWorkspaceRepository.createSession).toHaveBeenCalledWith(TENANT_ID, ENGAGEMENT_ID);
  });

  it("rejects if active session already exists", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(makeSession("IN_PROGRESS"));

    await expect(
      auditWorkspaceService.createSession(makeCtx(), { engagementId: ENGAGEMENT_ID })
    ).rejects.toThrow(BadRequestError);
  });

  it("allows new session if previous is COMPLETE", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(makeSession("COMPLETE"));
    vi.mocked(auditWorkspaceRepository.createSession).mockResolvedValue(makeSession());

    const result = await auditWorkspaceService.createSession(makeCtx(), { engagementId: ENGAGEMENT_ID });
    expect(result.id).toBe(SESSION_ID);
  });
});

describe("auditWorkspaceService.validateReadiness", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ready when all 5 lenses have RAG scores and findings", async () => {
    const lenses = [
      makeLens("REVENUE", "RED"),
      makeLens("OPERATIONS", "AMBER"),
      makeLens("FINANCE", "RED"),
      makeLens("TECHNOLOGY", "GREEN"),
      makeLens("TEAM", "GREEN"),
    ];
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue(lenses as any);
    vi.mocked(auditWorkspaceRepository.listFindings).mockResolvedValue([{ id: "f1" }] as any);

    const result = await auditWorkspaceService.validateReadiness(SESSION_ID);

    expect(result.isReady).toBe(true);
    expect(result.missingLenses).toEqual([]);
    expect(result.lensesWithoutRag).toEqual([]);
    expect(result.lensesWithoutFindings).toEqual([]);
  });

  it("returns not ready when lenses are missing", async () => {
    const lenses = [makeLens("REVENUE", "RED"), makeLens("OPERATIONS", "AMBER")];
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue(lenses as any);
    vi.mocked(auditWorkspaceRepository.listFindings).mockResolvedValue([{ id: "f1" }] as any);

    const result = await auditWorkspaceService.validateReadiness(SESSION_ID);

    expect(result.isReady).toBe(false);
    expect(result.missingLenses).toContain("FINANCE");
    expect(result.missingLenses).toContain("TECHNOLOGY");
    expect(result.missingLenses).toContain("TEAM");
  });

  it("returns not ready when lenses have no RAG score", async () => {
    const lenses = [
      makeLens("REVENUE", null),
      makeLens("OPERATIONS", "AMBER"),
      makeLens("FINANCE", "RED"),
      makeLens("TECHNOLOGY", "GREEN"),
      makeLens("TEAM", "GREEN"),
    ];
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue(lenses as any);
    vi.mocked(auditWorkspaceRepository.listFindings).mockResolvedValue([{ id: "f1" }] as any);

    const result = await auditWorkspaceService.validateReadiness(SESSION_ID);

    expect(result.isReady).toBe(false);
    expect(result.lensesWithoutRag).toContain("REVENUE");
  });

  it("returns not ready when lenses have no findings", async () => {
    const lenses = [
      makeLens("REVENUE", "RED"),
      makeLens("OPERATIONS", "AMBER"),
      makeLens("FINANCE", "RED"),
      makeLens("TECHNOLOGY", "GREEN"),
      makeLens("TEAM", "GREEN"),
    ];
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue(lenses as any);
    // All lenses return empty findings
    vi.mocked(auditWorkspaceRepository.listFindings).mockResolvedValue([]);

    const result = await auditWorkspaceService.validateReadiness(SESSION_ID);

    expect(result.isReady).toBe(false);
    expect(result.lensesWithoutFindings).toHaveLength(5);
  });
});

describe("auditWorkspaceService.markReadyForReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks session as READY_FOR_REPORT when validation passes", async () => {
    const lenses = ["REVENUE", "OPERATIONS", "FINANCE", "TECHNOLOGY", "TEAM"].map(
      (l) => makeLens(l, "RED")
    );
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue(lenses as any);
    vi.mocked(auditWorkspaceRepository.listFindings).mockResolvedValue([{ id: "f1" }] as any);
    vi.mocked(auditWorkspaceRepository.updateSessionStatus).mockResolvedValue(makeSession("READY_FOR_REPORT"));

    const result = await auditWorkspaceService.markReadyForReport(makeCtx(), SESSION_ID);

    expect(result.status).toBe("READY_FOR_REPORT");
    expect(auditWorkspaceRepository.updateSessionStatus).toHaveBeenCalledWith(SESSION_ID, "READY_FOR_REPORT");
  });

  it("rejects when validation fails", async () => {
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue([]);

    await expect(
      auditWorkspaceService.markReadyForReport(makeCtx(), SESSION_ID)
    ).rejects.toThrow(BadRequestError);
  });
});

describe("auditWorkspaceService.getSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError for missing session", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionById).mockResolvedValue(null);

    await expect(
      auditWorkspaceService.getSession(makeCtx(), { auditSessionId: SESSION_ID })
    ).rejects.toThrow(NotFoundError);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/modules/audit-workspace/`
Expected: All tests pass.

- [ ] **Step 3: Run tsc**

Run: `npx tsc --noEmit`
Expected: Clean.

- [ ] **Step 4: Commit**

```bash
git add src/modules/audit-workspace/__tests__/
git commit -m "test(audit-workspace): add tests for session creation, validation, and readiness"
```
