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
