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

// Mocked to prevent database import side-effects from client-portal.repository
vi.mock("@/modules/client-portal/client-portal.repository", () => ({
  clientPortalRepository: {
    createEngagement: vi.fn(),
  },
}));

// Mocked to prevent database import side-effects from customer.repository
vi.mock("@/modules/customer/customer.repository", () => ({
  customerRepository: {
    create: vi.fn(),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn() },
}));

// ── db mock for createClientEngagement transaction tests ─────────────────────

const mockTxInsert = vi.fn();
const mockTxUpdate = vi.fn();

// Track call counts for rollback tests
let customerInsertCallCount = 0;

const mockTx = {
  insert: vi.fn((table) => {
    customerInsertCallCount++;
    return {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "customer-001" }]),
    };
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  }),
};

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: "tenant-ironheart-001" }]),
    }),
    transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
      return fn(mockTx);
    }),
  },
}));

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const ENGAGEMENT_ID = "00000000-0000-0000-0000-000000000010";

function makeCtx(tenantId = TENANT_ID) {
  return { tenantId, userId: "user-1" } as any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeEngagement(stage = "DISCOVERY"): any {
  return { id: ENGAGEMENT_ID, tenantId: TENANT_ID, stage, title: "Test Engagement" };
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

  it("allows DISCOVERY → CLOSED_LOST with reason", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(makeEngagement("DISCOVERY"));
    vi.mocked(consultingRepository.updateStage).mockResolvedValue(makeEngagement("CLOSED_LOST"));

    await consultingService.transitionStage(makeCtx(), {
      engagementId: ENGAGEMENT_ID,
      targetStage: "CLOSED_LOST",
      notes: "Not a fit",
    });

    expect(consultingRepository.updateStage).toHaveBeenCalledWith(
      TENANT_ID, ENGAGEMENT_ID, "CLOSED_LOST", "Not a fit"
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(null as any);

    await expect(
      consultingService.transitionStage(makeCtx(), {
        engagementId: ENGAGEMENT_ID,
        targetStage: "PROPOSAL",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("allows REPORTING → CLOSED_WON (audit-only)", async () => {
    vi.mocked(consultingRepository.findEngagementById).mockResolvedValue(makeEngagement("REPORTING"));
    vi.mocked(consultingRepository.updateStage).mockResolvedValue(makeEngagement("CLOSED_WON"));

    const result = await consultingService.transitionStage(makeCtx(), {
      engagementId: ENGAGEMENT_ID,
      targetStage: "CLOSED_WON",
    });

    expect(result.stage).toBe("CLOSED_WON");
  });
});

// ── createClientEngagement tests ─────────────────────────────────────────────

const VALID_ENGAGEMENT_INPUT = {
  companyName: "Widgets Co",
  contactName: "Jane Smith",
  contactEmail: "jane@widgets.com",
  contactPhone: "+44 7700 000000",
  industry: "Manufacturing" as const,
  source: "Referral" as const,
  engagementType: "PROJECT" as const,
  engagementTitle: "Q2 Operations Audit",
  teamSize: 20,
  revenue: "£500k–1m",
  painPoints: ["Manual processes", "Poor visibility"],
  decisionMaker: true,
};

describe("consultingService.createClientEngagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    customerInsertCallCount = 0;

    // Default mock: tx.insert returns customer row for first call, engagement for second
    let callIndex = 0;
    mockTx.insert.mockImplementation(() => ({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return Promise.resolve([{ id: "customer-001" }]);
        return Promise.resolve([{ id: "engagement-001" }]);
      }),
    }));
    mockTx.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    });
  });

  it("resolves tenantId from IRONHEART_TENANT_ID env var when set", async () => {
    const originalEnv = process.env.IRONHEART_TENANT_ID;
    process.env.IRONHEART_TENANT_ID = "env-tenant-id-abc";

    const { db } = await import("@/shared/db");

    await consultingService.createClientEngagement(VALID_ENGAGEMENT_INPUT);

    // db.select should NOT have been called for tenant lookup when env var is set
    expect(vi.mocked(db.select)).not.toHaveBeenCalled();
    // transaction should be called
    expect(vi.mocked(db.transaction)).toHaveBeenCalled();

    process.env.IRONHEART_TENANT_ID = originalEnv;
  });

  it("falls back to slug lookup when IRONHEART_TENANT_ID env var is not set", async () => {
    const originalEnv = process.env.IRONHEART_TENANT_ID;
    delete process.env.IRONHEART_TENANT_ID;

    const { db } = await import("@/shared/db");

    await consultingService.createClientEngagement(VALID_ENGAGEMENT_INPUT);

    expect(vi.mocked(db.select)).toHaveBeenCalled();
    expect(vi.mocked(db.transaction)).toHaveBeenCalled();

    process.env.IRONHEART_TENANT_ID = originalEnv;
  });

  it("throws INTERNAL_SERVER_ERROR when no tenant can be resolved", async () => {
    const originalEnv = process.env.IRONHEART_TENANT_ID;
    delete process.env.IRONHEART_TENANT_ID;

    const { db } = await import("@/shared/db");
    // Override the select mock to return empty array (no tenant found)
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as any);

    const { TRPCError } = await import("@trpc/server");
    await expect(
      consultingService.createClientEngagement(VALID_ENGAGEMENT_INPUT)
    ).rejects.toThrow(TRPCError);

    process.env.IRONHEART_TENANT_ID = originalEnv;
  });

  it("rolls back when second tx.insert (engagement) throws — no orphan customer", async () => {
    process.env.IRONHEART_TENANT_ID = "env-tenant-id-abc";

    let callIndex = 0;
    mockTx.insert.mockImplementation(() => ({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return Promise.resolve([{ id: "customer-001" }]);
        // Second insert (engagement) fails
        return Promise.reject(new Error("DB constraint error"));
      }),
    }));

    const { db } = await import("@/shared/db");

    // The transaction itself will throw because the inner fn throws.
    // Simulate rollback by making db.transaction reject when fn throws.
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => {
      try {
        return await fn(mockTx as any);
      } catch (err) {
        // In a real Drizzle transaction, this would roll back — simulated here
        throw err;
      }
    });

    await expect(
      consultingService.createClientEngagement(VALID_ENGAGEMENT_INPUT)
    ).rejects.toThrow("DB constraint error");

    // Both inserts were attempted within the (rolled-back) transaction
    expect(mockTx.insert).toHaveBeenCalledTimes(2);

    delete process.env.IRONHEART_TENANT_ID;
  });
});
