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
