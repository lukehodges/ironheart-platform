# Consulting Pipeline Phase 4A: Client Tenant Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the client tenant provisioning orchestrator and client-facing API endpoints. When an engagement reaches CONTRACTED, the system auto-provisions a client tenant with the right modules enabled. Client-facing endpoints let the owner add team members, view onboarding status, access published reports, and approve deliverables.

**Architecture:** Extends the existing `consulting` module with a provisioning service that calls `platformService.provisionTenant()`. New client-facing router with endpoints scoped to the client's tenant. Audit window scoping filters booking availability by engagement dates.

**Tech Stack:** Drizzle ORM, tRPC 11, Zod, Inngest, Vitest

**Spec:** `docs/superpowers/specs/2026-05-10-consulting-pipeline-design.md` (Sections 4, 5.3, 5.4)

**Note:** Backend only. WorkOS org creation is stubbed (called in the provisioning flow but actual WorkOS API call is a future integration — for now we provision the tenant and record that WorkOS setup is needed). Google Drive folder creation is also stubbed.

---

## File Structure

### New files
```
src/modules/consulting/provisioning.service.ts   — Tenant provisioning orchestration
src/modules/consulting/client.router.ts           — Client-facing tRPC endpoints
src/modules/consulting/client.schemas.ts          — Zod schemas for client endpoints
src/modules/consulting/__tests__/provisioning.test.ts
src/modules/consulting/__tests__/client.test.ts
```

### Modified files
```
src/modules/consulting/consulting.events.ts   — Wire provisioning into stage-changed handler
src/modules/consulting/consulting.router.ts    — Add provisionClientTenant procedure
src/modules/consulting/index.ts                — Export client router
src/server/root.ts                             — Wire client router
```

---

## Task 1: Provisioning Service

**Files:**
- Create: `src/modules/consulting/provisioning.service.ts`

- [ ] **Step 1: Create provisioning service**

Create `src/modules/consulting/provisioning.service.ts`:

```typescript
import { logger } from "@/shared/logger";
import { BadRequestError, NotFoundError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import { platformService } from "@/modules/platform/platform.service";
import { consultingRepository } from "./consulting.repository";
import type { z } from "zod";
import type { provisionClientTenantSchema } from "./consulting.schemas";

const log = logger.child({ module: "consulting.provisioning" });

/** Module slugs enabled for client tenants */
const CLIENT_MODULE_SLUGS = [
  "consulting",
  "team",
  "forms",
  "booking",
  "customer",
  "notification",
];

export const provisioningService = {
  /**
   * Provision a client tenant for an engagement.
   *
   * 1. Create tenant via platformService.provisionTenant()
   * 2. Set clientTenantId on engagement
   * 3. Emit event for downstream automation (WorkOS org, Drive folder, welcome email)
   */
  async provisionClientTenant(
    ironheartTenantId: string,
    input: z.infer<typeof provisionClientTenantSchema>
  ) {
    // Verify engagement exists and is at CONTRACTED stage
    const engagement = await consultingRepository.findEngagementById(
      ironheartTenantId,
      input.engagementId
    );
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    const stage = (engagement.stage ?? "DISCOVERY") as string;
    if (stage !== "CONTRACTED" && stage !== "ONBOARDING") {
      throw new BadRequestError(
        `Cannot provision client tenant — engagement is at ${stage}, must be CONTRACTED or ONBOARDING`
      );
    }

    if (engagement.clientTenantId) {
      throw new BadRequestError("Client tenant already provisioned for this engagement");
    }

    // Provision tenant with client module set
    const tenant = await platformService.provisionTenant({
      businessName: input.companyName,
      email: input.ownerEmail,
      plan: "STARTER",
      moduleSlugs: CLIENT_MODULE_SLUGS,
    });

    log.info(
      { engagementId: input.engagementId, clientTenantId: tenant.id, companyName: input.companyName },
      "client tenant provisioned"
    );

    // Link tenant to engagement
    await consultingRepository.setClientTenantId(
      ironheartTenantId,
      input.engagementId,
      tenant.id
    );

    // Emit event for downstream automation
    await inngest.send({
      name: "engagement/tenant-provisioned",
      data: {
        engagementId: input.engagementId,
        tenantId: ironheartTenantId,
        clientTenantId: tenant.id,
        ownerEmail: input.ownerEmail,
      },
    });

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      engagementId: input.engagementId,
    };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/consulting/provisioning.service.ts
git commit -m "feat(consulting): add client tenant provisioning service"
```

---

## Task 2: Client-Facing Schemas + Router

**Files:**
- Create: `src/modules/consulting/client.schemas.ts`
- Create: `src/modules/consulting/client.router.ts`
- Modify: `src/modules/consulting/consulting.router.ts`
- Modify: `src/modules/consulting/index.ts`
- Modify: `src/server/root.ts`

- [ ] **Step 1: Create client schemas**

Create `src/modules/consulting/client.schemas.ts`:

```typescript
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
```

- [ ] **Step 2: Create client router**

Create `src/modules/consulting/client.router.ts`:

```typescript
import { router, tenantProcedure, createModuleMiddleware } from "@/shared/trpc";
import { consultingRepository } from "./consulting.repository";
import { reportGeneratorRepository } from "@/modules/report-generator/report-generator.repository";
import { NotFoundError, ForbiddenError } from "@/shared/errors";
import {
  getOnboardingStatusSchema,
  getClientReportSchema,
  getClientProgressSchema,
} from "./client.schemas";

const moduleGate = createModuleMiddleware("consulting");
const moduleProcedure = tenantProcedure.use(moduleGate);

/**
 * Client-facing router.
 * These endpoints are called by the client tenant UI.
 * They are scoped to the client's own tenant via tenantProcedure.
 */
export const consultingClientRouter = router({
  /** Get the engagement for this client tenant */
  getEngagement: moduleProcedure.query(async ({ ctx }) => {
    // Find engagement where clientTenantId = this tenant
    const result = await consultingRepository.listByStage(ctx.tenantId);
    const engagement = result.rows[0];
    if (!engagement) throw new NotFoundError("Engagement for tenant", ctx.tenantId);
    return engagement;
  }),

  /** Get published report for this engagement (client view) */
  getReport: moduleProcedure
    .input(getClientReportSchema)
    .query(async ({ ctx, input }) => {
      const report = await reportGeneratorRepository.findByEngagement(
        ctx.tenantId,
        input.engagementId
      );
      if (!report) throw new NotFoundError("Report for engagement", input.engagementId);
      if (report.status !== "PUBLISHED") {
        throw new ForbiddenError("Report is not yet published");
      }
      return {
        id: report.id,
        status: report.status,
        contentHtml: report.contentHtml,
        contentJson: report.contentJson,
        executiveSummary: report.executiveSummary,
        totalEstimatedWaste: report.totalEstimatedWaste,
        publishedAt: report.publishedAt,
      };
    }),

  /** Get engagement stage and milestone progress */
  getProgress: moduleProcedure
    .input(getClientProgressSchema)
    .query(async ({ ctx, input }) => {
      const result = await consultingRepository.listByStage(ctx.tenantId);
      const engagement = result.rows.find((e: any) => e.id === input.engagementId);
      if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

      return {
        stage: (engagement as any).stage,
        title: (engagement as any).title,
        startDate: (engagement as any).startDate,
        endDate: (engagement as any).endDate,
      };
    }),
});
```

- [ ] **Step 3: Add provisionClientTenant to consulting router**

In `src/modules/consulting/consulting.router.ts`, add import and procedure:

Add import at top:
```typescript
import { provisioningService } from "./provisioning.service";
import { provisionClientTenantSchema } from "./consulting.schemas";
```

Add to router object:
```typescript
  provisionClientTenant: moduleProcedure
    .input(provisionClientTenantSchema)
    .mutation(async ({ ctx, input }) => provisioningService.provisionClientTenant(ctx.tenantId, input)),
```

- [ ] **Step 4: Update barrel export**

Update `src/modules/consulting/index.ts`:

```typescript
export { consultingRouter } from "./consulting.router";
export { consultingClientRouter } from "./client.router";
```

- [ ] **Step 5: Wire client router into root**

In `src/server/root.ts`:
- Update consulting import: `import { consultingRouter, consultingClientRouter } from "@/modules/consulting";`
- Add to appRouter: `consultingClient: consultingClientRouter,`

- [ ] **Step 6: Verify tsc**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 7: Commit**

```bash
git add src/modules/consulting/client.schemas.ts src/modules/consulting/client.router.ts src/modules/consulting/consulting.router.ts src/modules/consulting/index.ts src/server/root.ts
git commit -m "feat(consulting): add client-facing router and tenant provisioning procedure"
```

---

## Task 3: Tests

**Files:**
- Create: `src/modules/consulting/__tests__/provisioning.test.ts`

- [ ] **Step 1: Create provisioning tests**

Create `src/modules/consulting/__tests__/provisioning.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { provisioningService } from "../provisioning.service";
import { consultingRepository } from "../consulting.repository";
import { platformService } from "@/modules/platform/platform.service";
import { BadRequestError, NotFoundError } from "@/shared/errors";

vi.mock("../consulting.repository", () => ({
  consultingRepository: {
    findEngagementById: vi.fn(),
    setClientTenantId: vi.fn(),
  },
}));

vi.mock("@/modules/platform/platform.service", () => ({
  platformService: {
    provisionTenant: vi.fn(),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn() },
}));

const IRONHEART_TENANT = "00000000-0000-0000-0000-000000000001";
const ENGAGEMENT_ID = "00000000-0000-0000-0000-000000000010";
const CLIENT_TENANT_ID = "00000000-0000-0000-0000-000000000099";

function makeEngagement(stage = "CONTRACTED", clientTenantId: string | null = null) {
  return {
    id: ENGAGEMENT_ID,
    tenantId: IRONHEART_TENANT,
    stage,
    clientTenantId,
    title: "Acme Audit",
  };
}

describe("provisioningService.provisionClientTenant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("provisions a new client tenant and links to engagement", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(makeEngagement("CONTRACTED"));
    vi.mocked(platformService.provisionTenant).mockResolvedValue({
      id: CLIENT_TENANT_ID,
      slug: "acme-ltd-abc12",
      name: "Acme Ltd",
      plan: "STARTER",
      status: "ACTIVE",
      trialEndsAt: null,
      suspendedAt: null,
      suspendedReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(consultingRepository.setClientTenantId).mockResolvedValue(makeEngagement("CONTRACTED", CLIENT_TENANT_ID));

    const result = await provisioningService.provisionClientTenant(IRONHEART_TENANT, {
      engagementId: ENGAGEMENT_ID,
      companyName: "Acme Ltd",
      ownerEmail: "sarah@acme.com",
      ownerName: "Sarah Chen",
    });

    expect(result.tenantId).toBe(CLIENT_TENANT_ID);
    expect(platformService.provisionTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        businessName: "Acme Ltd",
        email: "sarah@acme.com",
        plan: "STARTER",
        moduleSlugs: expect.arrayContaining(["consulting", "team", "forms", "booking"]),
      })
    );
    expect(consultingRepository.setClientTenantId).toHaveBeenCalledWith(
      IRONHEART_TENANT, ENGAGEMENT_ID, CLIENT_TENANT_ID
    );
  });

  it("rejects if engagement not at CONTRACTED stage", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(makeEngagement("DISCOVERY"));

    await expect(
      provisioningService.provisionClientTenant(IRONHEART_TENANT, {
        engagementId: ENGAGEMENT_ID,
        companyName: "Acme Ltd",
        ownerEmail: "sarah@acme.com",
        ownerName: "Sarah Chen",
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("rejects if tenant already provisioned", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(
      makeEngagement("CONTRACTED", CLIENT_TENANT_ID)
    );

    await expect(
      provisioningService.provisionClientTenant(IRONHEART_TENANT, {
        engagementId: ENGAGEMENT_ID,
        companyName: "Acme Ltd",
        ownerEmail: "sarah@acme.com",
        ownerName: "Sarah Chen",
      })
    ).rejects.toThrow(BadRequestError);
  });

  it("rejects if engagement not found", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(null);

    await expect(
      provisioningService.provisionClientTenant(IRONHEART_TENANT, {
        engagementId: ENGAGEMENT_ID,
        companyName: "Acme Ltd",
        ownerEmail: "sarah@acme.com",
        ownerName: "Sarah Chen",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("allows provisioning at ONBOARDING stage", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(makeEngagement("ONBOARDING"));
    vi.mocked(platformService.provisionTenant).mockResolvedValue({
      id: CLIENT_TENANT_ID, slug: "acme-ltd-abc12", name: "Acme Ltd",
      plan: "STARTER", status: "ACTIVE",
    } as any);
    vi.mocked(consultingRepository.setClientTenantId).mockResolvedValue(makeEngagement("ONBOARDING", CLIENT_TENANT_ID));

    const result = await provisioningService.provisionClientTenant(IRONHEART_TENANT, {
      engagementId: ENGAGEMENT_ID,
      companyName: "Acme Ltd",
      ownerEmail: "sarah@acme.com",
      ownerName: "Sarah Chen",
    });

    expect(result.tenantId).toBe(CLIENT_TENANT_ID);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/modules/consulting/`
Expected: All consulting tests pass (19 original + 5 new = 24).

- [ ] **Step 3: Run tsc + full suite**

Run: `npx tsc --noEmit && npx vitest run src/modules/ 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add src/modules/consulting/__tests__/provisioning.test.ts
git commit -m "test(consulting): add provisioning tests covering happy path, stage guards, and duplicate prevention"
```
