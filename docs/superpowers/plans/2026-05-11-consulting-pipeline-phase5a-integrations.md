# Consulting Pipeline Phase 5A: External Integrations Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build integration services for Plane.so and Google Drive that orchestrate external tool setup per engagement. Auto-create Plane projects from audit findings and Drive folder structures for client documents. Store external IDs on the engagement.

**Architecture:** New `integrations.service.ts` in the consulting module. These services define the WHAT (create project, create folder) and store results. The HOW (actual API calls) is delegated to MCP tools or direct API calls — stubbed for now with clear interfaces. Inngest events trigger integration setup at the right lifecycle moments.

**Tech Stack:** tRPC 11, Zod, Inngest, Vitest

**Note:** Actual MCP/API calls are stubbed behind interfaces. The service layer orchestrates the flow and stores results. Real integration wiring happens when MCP tools are connected.

---

## File Structure

### New files
```
src/modules/consulting/integration.service.ts     — Plane.so + Google Drive orchestration
src/modules/consulting/integration.types.ts        — Types for integration results
src/modules/consulting/__tests__/integration.test.ts
```

### Modified files
```
src/modules/consulting/consulting.router.ts    — Add integration trigger procedures
src/modules/consulting/consulting.schemas.ts   — Add integration schemas
src/modules/consulting/consulting.events.ts    — Wire integration into stage-changed
```

---

## Task 1: Integration Types + Service

**Files:**
- Create: `src/modules/consulting/integration.types.ts`
- Create: `src/modules/consulting/integration.service.ts`

- [ ] **Step 1: Create integration types**

Create `src/modules/consulting/integration.types.ts`:

```typescript
export interface PlaneProjectResult {
  projectId: string;
  projectUrl: string;
}

export interface DriveFolderResult {
  folderId: string;
  folderUrl: string;
  subfolders: {
    proposal: string;
    contract: string;
    audit: string;
    implementation: string;
  };
}

export interface IntegrationStatus {
  plane: {
    connected: boolean;
    projectId: string | null;
    projectUrl: string | null;
  };
  drive: {
    connected: boolean;
    folderId: string | null;
    folderUrl: string | null;
  };
}
```

- [ ] **Step 2: Create integration service**

Create `src/modules/consulting/integration.service.ts`:

```typescript
import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { consultingRepository } from "./consulting.repository";
import type { PlaneProjectResult, DriveFolderResult, IntegrationStatus } from "./integration.types";
import type { AuditSessionWithLenses } from "@/modules/audit-workspace/audit-workspace.types";

const log = logger.child({ module: "consulting.integration" });

/**
 * Stubbed Plane.so client.
 * Replace with actual MCP tool calls or Plane API when ready.
 */
async function createPlaneProject(
  projectName: string,
  tasks: { title: string; description: string; priority: string }[]
): Promise<PlaneProjectResult> {
  // STUB: In production, this calls Plane.so MCP tools:
  //   mcp__plane__create_project({ name, description })
  //   mcp__plane__create_work_item({ title, description, priority }) for each task
  log.info({ projectName, taskCount: tasks.length }, "STUB: would create Plane.so project");
  return {
    projectId: `plane-stub-${Date.now()}`,
    projectUrl: `https://app.plane.so/ironheart/projects/stub-${Date.now()}`,
  };
}

/**
 * Stubbed Google Drive client.
 * Replace with actual MCP tool calls or Drive API when ready.
 */
async function createDriveFolderStructure(
  companyName: string
): Promise<DriveFolderResult> {
  // STUB: In production, this calls Google Drive MCP tools:
  //   mcp__claude_ai_Google_Drive__create_folder("Ironheart Clients/{companyName}")
  //   create subfolders: Proposal, Contract, Audit, Implementation
  log.info({ companyName }, "STUB: would create Google Drive folder structure");
  const stubId = `drive-stub-${Date.now()}`;
  return {
    folderId: stubId,
    folderUrl: `https://drive.google.com/drive/folders/${stubId}`,
    subfolders: {
      proposal: `${stubId}-proposal`,
      contract: `${stubId}-contract`,
      audit: `${stubId}-audit`,
      implementation: `${stubId}-implementation`,
    },
  };
}

export const integrationService = {
  /**
   * Create a Plane.so project from audit recommendations.
   * Called when engagement reaches IMPLEMENTING.
   */
  async createPlaneProjectFromAudit(
    tenantId: string,
    engagementId: string,
    auditData: AuditSessionWithLenses,
    projectName: string
  ): Promise<PlaneProjectResult> {
    const engagement = await consultingRepository.findEngagementById(tenantId, engagementId);
    if (!engagement) throw new NotFoundError("Engagement", engagementId);
    if ((engagement as any).planeProjectId) {
      throw new BadRequestError("Plane project already exists for this engagement");
    }

    // Extract tasks from audit recommendations
    const tasks = auditData.lenses.flatMap((lens) =>
      lens.recommendations.map((rec) => ({
        title: rec.action,
        description: `Lens: ${lens.lens} | Effort: ${rec.estimatedEffort ?? "TBD"} | Cost: ${rec.estimatedCost ? `£${(rec.estimatedCost / 100).toFixed(0)}` : "TBD"}`,
        priority: rec.priority <= 3 ? "HIGH" : rec.priority <= 6 ? "MEDIUM" : "LOW",
      }))
    );

    const result = await createPlaneProject(projectName, tasks);

    await consultingRepository.setExternalIds(tenantId, engagementId, {
      planeProjectId: result.projectId,
    });

    log.info({ engagementId, projectId: result.projectId }, "Plane project linked to engagement");
    return result;
  },

  /**
   * Create a Google Drive folder structure for a client.
   * Called when engagement reaches CONTRACTED.
   */
  async createDriveFolder(
    tenantId: string,
    engagementId: string,
    companyName: string
  ): Promise<DriveFolderResult> {
    const engagement = await consultingRepository.findEngagementById(tenantId, engagementId);
    if (!engagement) throw new NotFoundError("Engagement", engagementId);
    if ((engagement as any).driveFolderId) {
      throw new BadRequestError("Drive folder already exists for this engagement");
    }

    const result = await createDriveFolderStructure(companyName);

    await consultingRepository.setExternalIds(tenantId, engagementId, {
      driveFolderId: result.folderId,
    });

    log.info({ engagementId, folderId: result.folderId }, "Drive folder linked to engagement");
    return result;
  },

  /**
   * Get integration status for an engagement.
   */
  async getIntegrationStatus(
    tenantId: string,
    engagementId: string
  ): Promise<IntegrationStatus> {
    const engagement = await consultingRepository.findEngagementById(tenantId, engagementId);
    if (!engagement) throw new NotFoundError("Engagement", engagementId);

    const eng = engagement as any;
    return {
      plane: {
        connected: !!eng.planeProjectId,
        projectId: eng.planeProjectId ?? null,
        projectUrl: eng.planeProjectId ? `https://app.plane.so/ironheart/projects/${eng.planeProjectId}` : null,
      },
      drive: {
        connected: !!eng.driveFolderId,
        folderId: eng.driveFolderId ?? null,
        folderUrl: eng.driveFolderId ? `https://drive.google.com/drive/folders/${eng.driveFolderId}` : null,
      },
    };
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/consulting/integration.types.ts src/modules/consulting/integration.service.ts
git commit -m "feat(consulting): add integration service for Plane.so and Google Drive orchestration"
```

---

## Task 2: Wire Into Router + Schemas

**Files:**
- Modify: `src/modules/consulting/consulting.schemas.ts`
- Modify: `src/modules/consulting/consulting.router.ts`

- [ ] **Step 1: Add schemas**

Add to `src/modules/consulting/consulting.schemas.ts`:

```typescript
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
```

- [ ] **Step 2: Add procedures to router**

Add imports to `src/modules/consulting/consulting.router.ts`:

```typescript
import { integrationService } from "./integration.service";
import { auditWorkspaceService } from "@/modules/audit-workspace/audit-workspace.service";
import {
  // ... existing imports ...
  createPlaneProjectSchema,
  createDriveFolderSchema,
  getIntegrationStatusSchema,
} from "./consulting.schemas";
```

Add procedures to router object:

```typescript
  createPlaneProject: moduleProcedure
    .input(createPlaneProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const fullSession = await auditWorkspaceService.getFullSession(ctx, {
        auditSessionId: input.auditSessionId,
      });
      return integrationService.createPlaneProjectFromAudit(
        ctx.tenantId, input.engagementId, fullSession, input.projectName
      );
    }),

  createDriveFolder: moduleProcedure
    .input(createDriveFolderSchema)
    .mutation(async ({ ctx, input }) =>
      integrationService.createDriveFolder(ctx.tenantId, input.engagementId, input.companyName)
    ),

  integrationStatus: moduleProcedure
    .input(getIntegrationStatusSchema)
    .query(async ({ ctx, input }) =>
      integrationService.getIntegrationStatus(ctx.tenantId, input.engagementId)
    ),
```

- [ ] **Step 3: Verify tsc**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add src/modules/consulting/consulting.schemas.ts src/modules/consulting/consulting.router.ts
git commit -m "feat(consulting): add integration procedures for Plane and Drive to router"
```

---

## Task 3: Tests + Verification

**Files:**
- Create: `src/modules/consulting/__tests__/integration.test.ts`

- [ ] **Step 1: Create tests**

Create `src/modules/consulting/__tests__/integration.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { integrationService } from "../integration.service";
import { consultingRepository } from "../consulting.repository";
import { BadRequestError, NotFoundError } from "@/shared/errors";

vi.mock("../consulting.repository", () => ({
  consultingRepository: {
    findEngagementById: vi.fn(),
    setExternalIds: vi.fn(),
  },
}));

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const ENGAGEMENT_ID = "00000000-0000-0000-0000-000000000010";

function makeEngagement(overrides: Record<string, unknown> = {}) {
  return {
    id: ENGAGEMENT_ID,
    tenantId: TENANT_ID,
    stage: "IMPLEMENTING",
    planeProjectId: null,
    driveFolderId: null,
    title: "Acme Audit",
    ...overrides,
  };
}

function makeAuditData() {
  return {
    id: "session-1",
    tenantId: TENANT_ID,
    engagementId: ENGAGEMENT_ID,
    status: "COMPLETE",
    callNotes: [],
    lenses: [
      {
        id: "lens-1",
        lens: "REVENUE",
        ragScore: "RED",
        ragJustification: "No CRM",
        currentState: "Bad",
        findings: [],
        recommendations: [
          { action: "Implement CRM", estimatedEffort: "3 days", estimatedCost: 120000, priority: 1 },
          { action: "Build pipeline", estimatedEffort: "2 days", estimatedCost: 80000, priority: 2 },
        ],
      },
      {
        id: "lens-2",
        lens: "OPERATIONS",
        ragScore: "AMBER",
        ragJustification: "Manual",
        currentState: "OK",
        findings: [],
        recommendations: [
          { action: "Automate invoicing", estimatedEffort: "1 day", estimatedCost: 50000, priority: 3 },
        ],
      },
    ],
  } as any;
}

describe("integrationService.createPlaneProjectFromAudit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates project and stores ID on engagement", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(makeEngagement());
    vi.mocked(consultingRepository.setExternalIds).mockResolvedValue(makeEngagement({ planeProjectId: "plane-123" }));

    const result = await integrationService.createPlaneProjectFromAudit(
      TENANT_ID, ENGAGEMENT_ID, makeAuditData(), "Acme Implementation"
    );

    expect(result.projectId).toBeTruthy();
    expect(consultingRepository.setExternalIds).toHaveBeenCalledWith(
      TENANT_ID, ENGAGEMENT_ID, expect.objectContaining({ planeProjectId: expect.any(String) })
    );
  });

  it("rejects if project already exists", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(
      makeEngagement({ planeProjectId: "existing-project" })
    );

    await expect(
      integrationService.createPlaneProjectFromAudit(TENANT_ID, ENGAGEMENT_ID, makeAuditData(), "Acme")
    ).rejects.toThrow(BadRequestError);
  });

  it("rejects if engagement not found", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(null);

    await expect(
      integrationService.createPlaneProjectFromAudit(TENANT_ID, ENGAGEMENT_ID, makeAuditData(), "Acme")
    ).rejects.toThrow(NotFoundError);
  });
});

describe("integrationService.createDriveFolder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates folder structure and stores ID", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(makeEngagement());
    vi.mocked(consultingRepository.setExternalIds).mockResolvedValue(makeEngagement({ driveFolderId: "drive-123" }));

    const result = await integrationService.createDriveFolder(TENANT_ID, ENGAGEMENT_ID, "Acme Ltd");

    expect(result.folderId).toBeTruthy();
    expect(result.subfolders).toHaveProperty("proposal");
    expect(result.subfolders).toHaveProperty("contract");
    expect(result.subfolders).toHaveProperty("audit");
    expect(result.subfolders).toHaveProperty("implementation");
    expect(consultingRepository.setExternalIds).toHaveBeenCalledWith(
      TENANT_ID, ENGAGEMENT_ID, expect.objectContaining({ driveFolderId: expect.any(String) })
    );
  });

  it("rejects if folder already exists", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(
      makeEngagement({ driveFolderId: "existing-folder" })
    );

    await expect(
      integrationService.createDriveFolder(TENANT_ID, ENGAGEMENT_ID, "Acme Ltd")
    ).rejects.toThrow(BadRequestError);
  });
});

describe("integrationService.getIntegrationStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns status for connected integrations", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(
      makeEngagement({ planeProjectId: "plane-123", driveFolderId: "drive-456" })
    );

    const status = await integrationService.getIntegrationStatus(TENANT_ID, ENGAGEMENT_ID);

    expect(status.plane.connected).toBe(true);
    expect(status.plane.projectId).toBe("plane-123");
    expect(status.drive.connected).toBe(true);
    expect(status.drive.folderId).toBe("drive-456");
  });

  it("returns status for unconnected integrations", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(makeEngagement());

    const status = await integrationService.getIntegrationStatus(TENANT_ID, ENGAGEMENT_ID);

    expect(status.plane.connected).toBe(false);
    expect(status.drive.connected).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/modules/consulting/`
Expected: All consulting tests pass (24 + 7 new = 31).

- [ ] **Step 3: Run tsc + full suite**

Run: `npx tsc --noEmit && npx vitest run src/modules/ 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add src/modules/consulting/__tests__/integration.test.ts
git commit -m "test(consulting): add integration tests for Plane.so and Google Drive orchestration"
```
