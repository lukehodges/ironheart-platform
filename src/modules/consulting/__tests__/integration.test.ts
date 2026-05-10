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
