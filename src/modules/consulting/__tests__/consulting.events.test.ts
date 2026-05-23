/**
 * Tests for consulting.events.ts — onStageChanged Inngest handler
 *
 * Tests call the handler function directly, passing a mock event and a mock
 * step object (pattern from workflow/__tests__/linear.engine.test.ts).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { onStageChanged } from "../consulting.events";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/inngest", () => ({
  inngest: {
    createFunction: vi.fn(
      (
        _meta: unknown,
        _trigger: unknown,
        handler: (args: unknown) => unknown
      ) => handler
    ),
  },
}));

vi.mock("@/shared/logger", () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return { ...actual, eq: vi.fn() };
});

vi.mock("../provisioning.service", () => ({
  provisioningService: {
    provisionClientTenant: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { db } from "@/shared/db";
import { provisioningService } from "../provisioning.service";

const ENGAGEMENT_ID = "00000000-0000-0000-0000-000000000010";
const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const CLIENT_TENANT_ID = "00000000-0000-0000-0000-000000000099";

function makeEvent(toStage: string, fromStage = "PROPOSAL") {
  return {
    data: {
      engagementId: ENGAGEMENT_ID,
      tenantId: TENANT_ID,
      fromStage,
      toStage,
    },
  };
}

function makeEngagementRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ENGAGEMENT_ID,
    tenantId: TENANT_ID,
    stage: "CONTRACTED",
    clientTenantId: null,
    title: "Test Engagement",
    ...overrides,
  };
}

/**
 * Mock step object: step.run executes the callback immediately (synchronous),
 * matching the Inngest testing pattern used in linear.engine.test.ts.
 */
function makeStep() {
  return {
    run: vi.fn((_id: string, fn: () => Promise<unknown>) => fn()),
  };
}

/**
 * Extract and invoke the handler created by inngest.createFunction.
 *
 * Because inngest.createFunction is mocked to return the handler directly,
 * `onStageChanged` IS the handler function after the mock is applied.
 */
function invokeHandler(event: ReturnType<typeof makeEvent>, step = makeStep()) {
  // onStageChanged is the handler returned by the mocked createFunction
  return (onStageChanged as unknown as (args: { event: typeof event; step: typeof step }) => Promise<unknown>)({ event, step });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("onStageChanged — CONTRACTED provisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provisions tenant when toStage=CONTRACTED and no clientTenantId", async () => {
    // Arrange: engagement exists with no clientTenantId
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([makeEngagementRow()]),
    } as any);

    vi.mocked(provisioningService.provisionClientTenant).mockResolvedValue({
      tenantId: CLIENT_TENANT_ID,
      slug: "acme",
      workosOrgId: "org_abc123",
    });

    // Act
    const result = await invokeHandler(makeEvent("CONTRACTED"));

    // Assert
    expect(provisioningService.provisionClientTenant).toHaveBeenCalledOnce();
    expect(provisioningService.provisionClientTenant).toHaveBeenCalledWith(ENGAGEMENT_ID);
    expect(result).toEqual({ provisioned: true, tenantId: CLIENT_TENANT_ID });
  });

  it("skips provisioning when toStage=CONTRACTED but clientTenantId already set", async () => {
    // Arrange: engagement already has clientTenantId
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([makeEngagementRow({ clientTenantId: CLIENT_TENANT_ID })]),
    } as any);

    // Act
    const result = await invokeHandler(makeEvent("CONTRACTED"));

    // Assert
    expect(provisioningService.provisionClientTenant).not.toHaveBeenCalled();
    expect(result).toEqual({ skipped: true, reason: "already_provisioned" });
  });

  it("skips and returns not_found when engagement does not exist", async () => {
    // Arrange: DB returns empty
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as any);

    // Act
    const result = await invokeHandler(makeEvent("CONTRACTED"));

    // Assert
    expect(provisioningService.provisionClientTenant).not.toHaveBeenCalled();
    expect(result).toEqual({ skipped: true, reason: "not_found" });
  });

  it("skips provisioning when toStage=PROPOSAL", async () => {
    // Act — no DB mock needed for non-CONTRACTED stage
    const result = await invokeHandler(makeEvent("PROPOSAL", "DISCOVERY"));

    // Assert
    expect(db.select).not.toHaveBeenCalled();
    expect(provisioningService.provisionClientTenant).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: true, engagementId: ENGAGEMENT_ID, toStage: "PROPOSAL" });
  });

  it("skips provisioning for all non-CONTRACTED stages", async () => {
    const nonContractedStages = ["DISCOVERY", "PROPOSAL", "ONBOARDING", "IMPLEMENTING", "CLOSED_LOST", "CLOSED_WON"];

    for (const stage of nonContractedStages) {
      vi.clearAllMocks();
      await invokeHandler(makeEvent(stage));
      expect(provisioningService.provisionClientTenant).not.toHaveBeenCalled();
    }
  });
});
