# Consulting Pipeline Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the engagement entity with a consulting lifecycle (DISCOVERY→RETAINER), build the onboarding orchestrator that provisions client tenants, seed questionnaire form templates, and wire audit windows into the booking module.

**Architecture:** Engagement-centric model where each client company becomes a tenant. The engagement lives on the client tenant. Module gating controls client visibility. WorkOS handles auth for all users (first 1M free). Existing modules (booking, forms, team, notification, workflow, tenant/platform) are used as-is.

**Tech Stack:** Next.js 16, tRPC 11, Drizzle ORM, postgres.js, WorkOS AuthKit, Inngest, Zod, Vitest

**Spec:** `docs/superpowers/specs/2026-05-10-consulting-pipeline-design.md`

**Note:** This plan covers backend only (schema, types, repository, service, router, tests). Frontend UI for the consulting pipeline (client tenant dashboard, audit workspace, onboarding screens) will be a separate plan after backend is solid. Phases 2-4 (Audit Core, Integration, Automation) will also be planned and executed sequentially after Phase 1 is complete.

---

## File Structure

### New files
```
src/modules/consulting/
  consulting.types.ts          — Engagement stage enum, audit window, qualification types
  consulting.schemas.ts        — Zod schemas for tRPC inputs
  consulting.repository.ts     — Drizzle queries for extended engagement fields
  consulting.service.ts        — Business logic: stage transitions, tenant provisioning orchestration
  consulting.router.ts         — tRPC procedures (platform admin + tenant)
  consulting.events.ts         — Inngest functions for async orchestration
  onboarding.service.ts        — Questionnaire assignment, invite sending, audit window logic
  index.ts                     — Barrel export
  __tests__/consulting.test.ts — Service tests
  __tests__/onboarding.test.ts — Onboarding logic tests
```

### Modified files
```
src/shared/db/schemas/client-portal.schema.ts  — Add new columns to engagements table
src/shared/inngest.ts                           — Add new event types
src/server/root.ts                              — Wire consulting router
src/modules/forms/forms.service.ts              — Add seedQuestionnaireTemplates method (if not existing)
```

### New schema file
```
src/shared/db/schemas/consulting.schema.ts      — New tables (auditSessions, auditCallNotes, etc.) — Phase 2, not this phase
```

---

## Task 1: Extend Engagement Schema

**Files:**
- Modify: `src/shared/db/schemas/client-portal.schema.ts`
- Modify: `src/modules/client-portal/client-portal.types.ts`

- [ ] **Step 1: Add new columns to engagements table in Drizzle schema**

In `src/shared/db/schemas/client-portal.schema.ts`, add a new enum and new columns to the `engagements` table:

```typescript
// Add after existing enums (after recurringInterval)

export const engagementStage = pgEnum("EngagementStage", [
  "DISCOVERY",
  "PROPOSAL",
  "CONTRACTED",
  "ONBOARDING",
  "AUDITING",
  "REPORTING",
  "IMPLEMENTING",
  "RETAINER",
  "CLOSED_WON",
  "CLOSED_LOST",
]);
```

Add these columns inside the `engagements` pgTable definition, after `activeProposalId`:

```typescript
    stage: engagementStage().default("DISCOVERY"),
    clientTenantId: uuid(),
    auditWindowStart: date({ mode: "date" }),
    auditWindowEnd: date({ mode: "date" }),
    closedReason: text(),
    planeProjectId: text(),
    driveFolderId: text(),
    discoveryCallId: uuid(),
    discoveryNotes: text(),
    qualificationData: jsonb(),
```

- [ ] **Step 2: Add new types to client-portal.types.ts**

Add the new stage type and extend EngagementRecord in `src/modules/client-portal/client-portal.types.ts`:

```typescript
// Add after existing type definitions at the top
export type EngagementStage =
  | "DISCOVERY"
  | "PROPOSAL"
  | "CONTRACTED"
  | "ONBOARDING"
  | "AUDITING"
  | "REPORTING"
  | "IMPLEMENTING"
  | "RETAINER"
  | "CLOSED_WON"
  | "CLOSED_LOST";

export interface QualificationData {
  revenue: string | null;        // e.g. "£500k-£1M"
  teamSize: number | null;
  painPoints: string[];
  industry: string | null;
  decisionMaker: boolean;
}
```

Add these fields to the `EngagementRecord` interface:

```typescript
  stage: EngagementStage | null;
  clientTenantId: string | null;
  auditWindowStart: Date | null;
  auditWindowEnd: Date | null;
  closedReason: string | null;
  planeProjectId: string | null;
  driveFolderId: string | null;
  discoveryCallId: string | null;
  discoveryNotes: string | null;
  qualificationData: QualificationData | null;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: May show errors in repository/service files that need updating — that's expected and handled in Task 2.

- [ ] **Step 4: Commit**

```bash
git add src/shared/db/schemas/client-portal.schema.ts src/modules/client-portal/client-portal.types.ts
git commit -m "feat(engagement): add consulting lifecycle stage + new fields to engagement entity"
```

---

## Task 2: Create Consulting Module — Types & Schemas

**Files:**
- Create: `src/modules/consulting/consulting.types.ts`
- Create: `src/modules/consulting/consulting.schemas.ts`

- [ ] **Step 1: Create consulting types**

Create `src/modules/consulting/consulting.types.ts`:

```typescript
import type { EngagementStage, QualificationData } from "@/modules/client-portal/client-portal.types";

export type { EngagementStage, QualificationData };

// Role-to-questionnaire mapping
export interface QuestionnaireMapping {
  roleKeywords: string[];
  templateSlug: string;
}

export const DEFAULT_QUESTIONNAIRE_MAPPINGS: QuestionnaireMapping[] = [
  { roleKeywords: ["owner", "director", "ceo", "founder", "managing"], templateSlug: "questionnaire-owner-director" },
  { roleKeywords: ["operations", "ops", "delivery", "manager"], templateSlug: "questionnaire-operations" },
  { roleKeywords: ["finance", "admin", "accounts", "bookkeeper", "accountant"], templateSlug: "questionnaire-finance-admin" },
  { roleKeywords: ["sales", "marketing", "bd", "business dev", "growth"], templateSlug: "questionnaire-sales-marketing" },
];

export const TEAM_MEMBER_TEMPLATE_SLUG = "questionnaire-team-member";
export const QUICK_PULSE_TEMPLATE_SLUG = "questionnaire-quick-pulse";

export interface StageTransitionInput {
  engagementId: string;
  targetStage: EngagementStage;
  notes?: string;
}

export interface SetAuditWindowInput {
  engagementId: string;
  startDate: string; // ISO date
  endDate: string;
}

export interface ProvisionClientTenantInput {
  engagementId: string;
  companyName: string;
  ownerEmail: string;
  ownerName: string;
}

export interface AssignQuestionnaireInput {
  engagementId: string;
  contactUserId: string;
  formTemplateId: string;
}

export interface AddTeamContactInput {
  name: string;
  email: string;
  role: string;
}

export interface OnboardingStatus {
  totalContacts: number;
  questionnairesCompleted: number;
  questionnairesPending: number;
  callsBooked: number;
  callsPending: number;
  contacts: {
    userId: string;
    name: string;
    email: string;
    role: string;
    questionnaireStatus: "PENDING" | "SENT" | "COMPLETED";
    callBooked: boolean;
  }[];
}
```

- [ ] **Step 2: Create consulting schemas**

Create `src/modules/consulting/consulting.schemas.ts`:

```typescript
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
  startDate: z.string(), // ISO date string
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
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/consulting/
git commit -m "feat(consulting): add types and schemas for consulting pipeline module"
```

---

## Task 3: Create Consulting Repository

**Files:**
- Create: `src/modules/consulting/consulting.repository.ts`

- [ ] **Step 1: Create repository**

Create `src/modules/consulting/consulting.repository.ts`:

```typescript
import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import { engagements } from "@/shared/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { EngagementStage, QualificationData } from "./consulting.types";

const log = logger.child({ module: "consulting.repository" });

export const consultingRepository = {
  async findEngagementById(tenantId: string, engagementId: string) {
    const rows = await db
      .select()
      .from(engagements)
      .where(and(eq(engagements.id, engagementId), eq(engagements.tenantId, tenantId)))
      .limit(1);
    return rows[0] ?? null;
  },

  async updateStage(tenantId: string, engagementId: string, stage: EngagementStage, closedReason?: string) {
    const rows = await db
      .update(engagements)
      .set({
        stage,
        closedReason: closedReason ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(engagements.id, engagementId), eq(engagements.tenantId, tenantId)))
      .returning();
    if (rows.length === 0) throw new NotFoundError("Engagement", engagementId);
    log.info({ engagementId, stage }, "engagement stage updated");
    return rows[0];
  },

  async setAuditWindow(tenantId: string, engagementId: string, startDate: Date, endDate: Date) {
    const rows = await db
      .update(engagements)
      .set({
        auditWindowStart: startDate,
        auditWindowEnd: endDate,
        updatedAt: new Date(),
      })
      .where(and(eq(engagements.id, engagementId), eq(engagements.tenantId, tenantId)))
      .returning();
    if (rows.length === 0) throw new NotFoundError("Engagement", engagementId);
    log.info({ engagementId, startDate, endDate }, "audit window set");
    return rows[0];
  },

  async setClientTenantId(tenantId: string, engagementId: string, clientTenantId: string) {
    const rows = await db
      .update(engagements)
      .set({
        clientTenantId,
        updatedAt: new Date(),
      })
      .where(and(eq(engagements.id, engagementId), eq(engagements.tenantId, tenantId)))
      .returning();
    if (rows.length === 0) throw new NotFoundError("Engagement", engagementId);
    return rows[0];
  },

  async setExternalIds(tenantId: string, engagementId: string, ids: { planeProjectId?: string; driveFolderId?: string }) {
    const rows = await db
      .update(engagements)
      .set({
        ...ids,
        updatedAt: new Date(),
      })
      .where(and(eq(engagements.id, engagementId), eq(engagements.tenantId, tenantId)))
      .returning();
    if (rows.length === 0) throw new NotFoundError("Engagement", engagementId);
    return rows[0];
  },

  async updateDiscoveryNotes(tenantId: string, engagementId: string, notes: string, qualificationData?: QualificationData) {
    const set: Record<string, unknown> = {
      discoveryNotes: notes,
      updatedAt: new Date(),
    };
    if (qualificationData) {
      set.qualificationData = qualificationData;
    }
    const rows = await db
      .update(engagements)
      .set(set)
      .where(and(eq(engagements.id, engagementId), eq(engagements.tenantId, tenantId)))
      .returning();
    if (rows.length === 0) throw new NotFoundError("Engagement", engagementId);
    return rows[0];
  },

  async listByStage(tenantId: string, stage?: EngagementStage, limit = 50, cursor?: string) {
    let query = db
      .select()
      .from(engagements)
      .where(
        stage
          ? and(eq(engagements.tenantId, tenantId), eq(engagements.stage, stage))
          : eq(engagements.tenantId, tenantId)
      )
      .orderBy(desc(engagements.updatedAt))
      .limit(limit + 1);

    const rows = await query;
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();
    return { rows, hasMore };
  },

  async listAllAcrossTenants(stage?: EngagementStage, limit = 50) {
    let query = db
      .select()
      .from(engagements)
      .orderBy(desc(engagements.updatedAt))
      .limit(limit + 1);

    // Platform admin view — filter by stage if provided
    if (stage) {
      query = db
        .select()
        .from(engagements)
        .where(eq(engagements.stage, stage))
        .orderBy(desc(engagements.updatedAt))
        .limit(limit + 1);
    }

    const rows = await query;
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();
    return { rows, hasMore };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/consulting/consulting.repository.ts
git commit -m "feat(consulting): add repository for engagement lifecycle queries"
```

---

## Task 4: Create Consulting Service

**Files:**
- Create: `src/modules/consulting/consulting.service.ts`

- [ ] **Step 1: Create service**

Create `src/modules/consulting/consulting.service.ts`:

```typescript
import { logger } from "@/shared/logger";
import { BadRequestError, NotFoundError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import type { Context } from "@/shared/trpc";
import { consultingRepository } from "./consulting.repository";
import type { EngagementStage, QualificationData } from "./consulting.types";
import type { z } from "zod";
import type {
  stageTransitionSchema,
  setAuditWindowSchema,
  updateDiscoveryNotesSchema,
  listEngagementsByStageSchema,
} from "./consulting.schemas";

const log = logger.child({ module: "consulting.service" });

// Valid stage transitions — linear with exit points at any stage
const VALID_TRANSITIONS: Record<string, EngagementStage[]> = {
  DISCOVERY: ["PROPOSAL", "CLOSED_LOST"],
  PROPOSAL: ["CONTRACTED", "CLOSED_LOST"],
  CONTRACTED: ["ONBOARDING", "CLOSED_LOST"],
  ONBOARDING: ["AUDITING", "CLOSED_LOST"],
  AUDITING: ["REPORTING", "CLOSED_LOST"],
  REPORTING: ["IMPLEMENTING", "CLOSED_WON", "CLOSED_LOST"],
  IMPLEMENTING: ["RETAINER", "CLOSED_WON", "CLOSED_LOST"],
  RETAINER: ["CLOSED_WON", "CLOSED_LOST"],
};

export const consultingService = {
  async transitionStage(
    ctx: Context,
    input: z.infer<typeof stageTransitionSchema>
  ) {
    const engagement = await consultingRepository.findEngagementById(
      ctx.tenantId,
      input.engagementId
    );
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    const currentStage = engagement.stage ?? "DISCOVERY";
    const allowed = VALID_TRANSITIONS[currentStage];
    if (!allowed || !allowed.includes(input.targetStage)) {
      throw new BadRequestError(
        `Cannot transition from ${currentStage} to ${input.targetStage}`
      );
    }

    const updated = await consultingRepository.updateStage(
      ctx.tenantId,
      input.engagementId,
      input.targetStage,
      input.targetStage === "CLOSED_LOST" ? input.notes : undefined
    );

    // Emit event for downstream automation
    await inngest.send({
      name: "engagement/stage-changed",
      data: {
        engagementId: input.engagementId,
        tenantId: ctx.tenantId,
        fromStage: currentStage,
        toStage: input.targetStage,
      },
    });

    log.info(
      { engagementId: input.engagementId, from: currentStage, to: input.targetStage },
      "engagement stage transitioned"
    );

    return updated;
  },

  async setAuditWindow(
    ctx: Context,
    input: z.infer<typeof setAuditWindowSchema>
  ) {
    return consultingRepository.setAuditWindow(
      ctx.tenantId,
      input.engagementId,
      new Date(input.startDate),
      new Date(input.endDate)
    );
  },

  async updateDiscoveryNotes(
    ctx: Context,
    input: z.infer<typeof updateDiscoveryNotesSchema>
  ) {
    return consultingRepository.updateDiscoveryNotes(
      ctx.tenantId,
      input.engagementId,
      input.notes,
      input.qualificationData as QualificationData | undefined
    );
  },

  async listEngagements(
    ctx: Context,
    input: z.infer<typeof listEngagementsByStageSchema>
  ) {
    return consultingRepository.listByStage(
      ctx.tenantId,
      input.stage,
      input.limit,
      input.cursor
    );
  },

  async listAllEngagements(
    input: z.infer<typeof listEngagementsByStageSchema>
  ) {
    // Platform admin — cross-tenant
    return consultingRepository.listAllAcrossTenants(input.stage, input.limit);
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/consulting/consulting.service.ts
git commit -m "feat(consulting): add service with stage transition logic and validation"
```

---

## Task 5: Add Inngest Events

**Files:**
- Modify: `src/shared/inngest.ts`

- [ ] **Step 1: Add new events to IronheartEvents type**

Add these entries to the `IronheartEvents` type in `src/shared/inngest.ts`:

```typescript
  "engagement/stage-changed": {
    data: {
      engagementId: string;
      tenantId: string;
      fromStage: string;
      toStage: string;
    };
  };
  "engagement/tenant-provisioned": {
    data: {
      engagementId: string;
      tenantId: string;
      clientTenantId: string;
      ownerEmail: string;
    };
  };
  "engagement/questionnaires-assigned": {
    data: {
      engagementId: string;
      tenantId: string;
      assignments: { contactUserId: string; formTemplateId: string }[];
    };
  };
  "engagement/onboarding-complete": {
    data: {
      engagementId: string;
      tenantId: string;
    };
  };
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/inngest.ts
git commit -m "feat(inngest): add engagement lifecycle events for consulting pipeline"
```

---

## Task 6: Create Onboarding Service

**Files:**
- Create: `src/modules/consulting/onboarding.service.ts`

- [ ] **Step 1: Create onboarding service**

Create `src/modules/consulting/onboarding.service.ts`:

```typescript
import { logger } from "@/shared/logger";
import { BadRequestError, NotFoundError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import type { Context } from "@/shared/trpc";
import { consultingRepository } from "./consulting.repository";
import {
  DEFAULT_QUESTIONNAIRE_MAPPINGS,
  TEAM_MEMBER_TEMPLATE_SLUG,
  type AddTeamContactInput,
  type OnboardingStatus,
} from "./consulting.types";

const log = logger.child({ module: "onboarding.service" });

/**
 * Match a role string to a questionnaire template slug.
 * Checks role keywords case-insensitively. Falls back to team member questionnaire.
 */
export function matchQuestionnaireTemplate(role: string): string {
  const roleLower = role.toLowerCase();
  for (const mapping of DEFAULT_QUESTIONNAIRE_MAPPINGS) {
    if (mapping.roleKeywords.some((kw) => roleLower.includes(kw))) {
      return mapping.templateSlug;
    }
  }
  return TEAM_MEMBER_TEMPLATE_SLUG;
}

export const onboardingService = {
  /**
   * Given a list of contacts with roles, return the suggested questionnaire
   * template slug for each one.
   */
  suggestQuestionnaireAssignments(
    contacts: AddTeamContactInput[]
  ): { contact: AddTeamContactInput; templateSlug: string }[] {
    return contacts.map((contact) => ({
      contact,
      templateSlug: matchQuestionnaireTemplate(contact.role),
    }));
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/consulting/onboarding.service.ts
git commit -m "feat(consulting): add onboarding service with questionnaire auto-assignment"
```

---

## Task 7: Create Consulting Router

**Files:**
- Create: `src/modules/consulting/consulting.router.ts`
- Create: `src/modules/consulting/index.ts`
- Modify: `src/server/root.ts`

- [ ] **Step 1: Create router**

Create `src/modules/consulting/consulting.router.ts`:

```typescript
import { z } from "zod";
import { router, tenantProcedure, platformAdminProcedure, createModuleMiddleware } from "@/shared/trpc";
import { consultingService } from "./consulting.service";
import { onboardingService } from "./onboarding.service";
import {
  stageTransitionSchema,
  setAuditWindowSchema,
  updateDiscoveryNotesSchema,
  listEngagementsByStageSchema,
  addTeamContactSchema,
  assignQuestionnaireSchema,
} from "./consulting.schemas";

const moduleGate = createModuleMiddleware("consulting");
const moduleProcedure = tenantProcedure.use(moduleGate);

export const consultingRouter = router({
  // Stage transitions
  transitionStage: moduleProcedure
    .input(stageTransitionSchema)
    .mutation(async ({ ctx, input }) => consultingService.transitionStage(ctx, input)),

  // Audit window
  setAuditWindow: moduleProcedure
    .input(setAuditWindowSchema)
    .mutation(async ({ ctx, input }) => consultingService.setAuditWindow(ctx, input)),

  // Discovery notes
  updateDiscoveryNotes: moduleProcedure
    .input(updateDiscoveryNotesSchema)
    .mutation(async ({ ctx, input }) => consultingService.updateDiscoveryNotes(ctx, input)),

  // List engagements by stage (tenant-scoped)
  list: moduleProcedure
    .input(listEngagementsByStageSchema)
    .query(async ({ ctx, input }) => consultingService.listEngagements(ctx, input)),

  // Platform admin: all engagements across tenants
  listAll: platformAdminProcedure
    .input(listEngagementsByStageSchema)
    .query(async ({ input }) => consultingService.listAllEngagements(input)),

  // Suggest questionnaire assignments for a list of contacts
  suggestAssignments: moduleProcedure
    .input(addTeamContactSchema)
    .query(async ({ input }) => onboardingService.suggestQuestionnaireAssignments(input.contacts)),
});
```

- [ ] **Step 2: Create barrel export**

Create `src/modules/consulting/index.ts`:

```typescript
export { consultingRouter } from "./consulting.router";
```

- [ ] **Step 3: Wire into root router**

In `src/server/root.ts`, add the import and router entry:

```typescript
import { consultingRouter } from "@/modules/consulting";
```

Add to the `appRouter` object:

```typescript
  consulting: consultingRouter,
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Clean compile or unrelated errors only.

- [ ] **Step 5: Commit**

```bash
git add src/modules/consulting/consulting.router.ts src/modules/consulting/index.ts src/server/root.ts
git commit -m "feat(consulting): wire consulting router into root with stage transitions and onboarding"
```

---

## Task 8: Write Tests — Stage Transitions

**Files:**
- Create: `src/modules/consulting/__tests__/consulting.test.ts`

- [ ] **Step 1: Write stage transition tests**

Create `src/modules/consulting/__tests__/consulting.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { consultingService } from "../consulting.service";
import { consultingRepository } from "../consulting.repository";
import { BadRequestError, NotFoundError } from "@/shared/errors";

vi.mock("../consulting.repository", () => ({
  consultingRepository: {
    findEngagementById: vi.fn(),
    updateStage: vi.fn(),
    setAuditWindow: vi.fn(),
    setClientTenantId: vi.fn(),
    updateDiscoveryNotes: vi.fn(),
    listByStage: vi.fn(),
    listAllAcrossTenants: vi.fn(),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn() },
}));

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const ENGAGEMENT_ID = "00000000-0000-0000-0000-000000000010";

function makeCtx(tenantId = TENANT_ID) {
  return { tenantId, userId: "user-1" } as any;
}

function makeEngagement(stage = "DISCOVERY") {
  return {
    id: ENGAGEMENT_ID,
    tenantId: TENANT_ID,
    stage,
    title: "Test Engagement",
  };
}

describe("consultingService.transitionStage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows valid transition DISCOVERY → PROPOSAL", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(makeEngagement("DISCOVERY"));
    vi.mocked(consultingRepository.updateStage).mockResolvedValue(makeEngagement("PROPOSAL"));

    const result = await consultingService.transitionStage(makeCtx(), {
      engagementId: ENGAGEMENT_ID,
      targetStage: "PROPOSAL",
    });

    expect(consultingRepository.updateStage).toHaveBeenCalledWith(
      TENANT_ID, ENGAGEMENT_ID, "PROPOSAL", undefined
    );
    expect(result.stage).toBe("PROPOSAL");
  });

  it("allows valid transition DISCOVERY → CLOSED_LOST with reason", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(makeEngagement("DISCOVERY"));
    vi.mocked(consultingRepository.updateStage).mockResolvedValue(makeEngagement("CLOSED_LOST"));

    await consultingService.transitionStage(makeCtx(), {
      engagementId: ENGAGEMENT_ID,
      targetStage: "CLOSED_LOST",
      notes: "Not a fit — budget too low",
    });

    expect(consultingRepository.updateStage).toHaveBeenCalledWith(
      TENANT_ID, ENGAGEMENT_ID, "CLOSED_LOST", "Not a fit — budget too low"
    );
  });

  it("rejects invalid transition DISCOVERY → AUDITING", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(makeEngagement("DISCOVERY"));

    await expect(
      consultingService.transitionStage(makeCtx(), {
        engagementId: ENGAGEMENT_ID,
        targetStage: "AUDITING",
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("rejects transition from CLOSED_WON", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(makeEngagement("CLOSED_WON"));

    await expect(
      consultingService.transitionStage(makeCtx(), {
        engagementId: ENGAGEMENT_ID,
        targetStage: "DISCOVERY",
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("throws NotFoundError for missing engagement", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(null);

    await expect(
      consultingService.transitionStage(makeCtx(), {
        engagementId: ENGAGEMENT_ID,
        targetStage: "PROPOSAL",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("allows REPORTING → CLOSED_WON (audit-only engagement)", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(makeEngagement("REPORTING"));
    vi.mocked(consultingRepository.updateStage).mockResolvedValue(makeEngagement("CLOSED_WON"));

    const result = await consultingService.transitionStage(makeCtx(), {
      engagementId: ENGAGEMENT_ID,
      targetStage: "CLOSED_WON",
    });

    expect(result.stage).toBe("CLOSED_WON");
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/modules/consulting/__tests__/consulting.test.ts`
Expected: All 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/modules/consulting/__tests__/consulting.test.ts
git commit -m "test(consulting): add stage transition tests covering valid/invalid/exit transitions"
```

---

## Task 9: Write Tests — Questionnaire Auto-Assignment

**Files:**
- Create: `src/modules/consulting/__tests__/onboarding.test.ts`

- [ ] **Step 1: Write onboarding tests**

Create `src/modules/consulting/__tests__/onboarding.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { matchQuestionnaireTemplate, onboardingService } from "../onboarding.service";

describe("matchQuestionnaireTemplate", () => {
  it("maps Owner to owner-director questionnaire", () => {
    expect(matchQuestionnaireTemplate("Owner")).toBe("questionnaire-owner-director");
  });

  it("maps Director to owner-director questionnaire", () => {
    expect(matchQuestionnaireTemplate("Managing Director")).toBe("questionnaire-owner-director");
  });

  it("maps CEO to owner-director questionnaire", () => {
    expect(matchQuestionnaireTemplate("CEO")).toBe("questionnaire-owner-director");
  });

  it("maps Operations Manager to operations questionnaire", () => {
    expect(matchQuestionnaireTemplate("Operations Manager")).toBe("questionnaire-operations");
  });

  it("maps Ops Lead to operations questionnaire", () => {
    expect(matchQuestionnaireTemplate("Ops Lead")).toBe("questionnaire-operations");
  });

  it("maps Finance Manager to finance questionnaire", () => {
    expect(matchQuestionnaireTemplate("Finance Manager")).toBe("questionnaire-finance-admin");
  });

  it("maps Bookkeeper to finance questionnaire", () => {
    expect(matchQuestionnaireTemplate("Bookkeeper")).toBe("questionnaire-finance-admin");
  });

  it("maps Sales Lead to sales questionnaire", () => {
    expect(matchQuestionnaireTemplate("Sales Lead")).toBe("questionnaire-sales-marketing");
  });

  it("maps Marketing Manager to sales questionnaire", () => {
    expect(matchQuestionnaireTemplate("Marketing Manager")).toBe("questionnaire-sales-marketing");
  });

  it("maps unknown role to team member questionnaire", () => {
    expect(matchQuestionnaireTemplate("Warehouse Operative")).toBe("questionnaire-team-member");
  });

  it("maps generic Team Member to team member questionnaire", () => {
    expect(matchQuestionnaireTemplate("Team Member")).toBe("questionnaire-team-member");
  });

  it("is case-insensitive", () => {
    expect(matchQuestionnaireTemplate("OPERATIONS MANAGER")).toBe("questionnaire-operations");
    expect(matchQuestionnaireTemplate("ceo")).toBe("questionnaire-owner-director");
  });
});

describe("onboardingService.suggestQuestionnaireAssignments", () => {
  it("assigns correct templates to a mixed team", () => {
    const contacts = [
      { name: "Sarah Chen", email: "sarah@acme.com", role: "Owner" },
      { name: "James Wright", email: "james@acme.com", role: "Operations Manager" },
      { name: "Lisa Park", email: "lisa@acme.com", role: "Finance Manager" },
      { name: "Tom Reeves", email: "tom@acme.com", role: "Sales Lead" },
      { name: "Amy Foster", email: "amy@acme.com", role: "Warehouse Staff" },
    ];

    const result = onboardingService.suggestQuestionnaireAssignments(contacts);

    expect(result).toHaveLength(5);
    expect(result[0].templateSlug).toBe("questionnaire-owner-director");
    expect(result[1].templateSlug).toBe("questionnaire-operations");
    expect(result[2].templateSlug).toBe("questionnaire-finance-admin");
    expect(result[3].templateSlug).toBe("questionnaire-sales-marketing");
    expect(result[4].templateSlug).toBe("questionnaire-team-member");
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/modules/consulting/__tests__/onboarding.test.ts`
Expected: All 14 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/modules/consulting/__tests__/onboarding.test.ts
git commit -m "test(consulting): add questionnaire auto-assignment tests covering all role mappings"
```

---

## Task 10: Create Inngest Events for Consulting

**Files:**
- Create: `src/modules/consulting/consulting.events.ts`

- [ ] **Step 1: Create Inngest event handlers**

Create `src/modules/consulting/consulting.events.ts`:

```typescript
import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "consulting.events" });

/**
 * When an engagement transitions to CONTRACTED, this could trigger
 * tenant provisioning. For now, log the event — full provisioning
 * will be wired when WorkOS org creation API is integrated.
 */
export const onStageChanged = inngest.createFunction(
  { id: "consulting/on-stage-changed", name: "Handle engagement stage change" },
  { event: "engagement/stage-changed" },
  async ({ event, step }) => {
    const { engagementId, tenantId, fromStage, toStage } = event.data;

    log.info({ engagementId, fromStage, toStage }, "processing stage change");

    if (toStage === "CONTRACTED") {
      await step.run("log-contracted", () => {
        log.info({ engagementId }, "engagement contracted — tenant provisioning will be triggered");
        // Future: auto-provision client tenant, send welcome email, create Drive folder
      });
    }

    if (toStage === "CLOSED_LOST") {
      await step.run("log-closed-lost", () => {
        log.info({ engagementId }, "engagement closed lost — follow-up reminder scheduled");
        // Future: create 60-day follow-up reminder
      });
    }

    return { processed: true, engagementId, toStage };
  }
);

export const consultingFunctions = [onStageChanged];
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/consulting/consulting.events.ts
git commit -m "feat(consulting): add Inngest event handlers for stage transitions"
```

---

## Task 11: Run Full Test Suite

- [ ] **Step 1: Run all consulting tests**

Run: `npx vitest run src/modules/consulting/`
Expected: All tests pass (consulting.test.ts + onboarding.test.ts).

- [ ] **Step 2: Run full project test suite**

Run: `npx vitest run`
Expected: All 224+ tests pass. No regressions.

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: Clean compile.

- [ ] **Step 4: Build check**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 5: Commit any fixes if needed**

If any fixes were required, commit them:

```bash
git add -A
git commit -m "fix(consulting): resolve build/test issues from Phase 1 integration"
```
