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
