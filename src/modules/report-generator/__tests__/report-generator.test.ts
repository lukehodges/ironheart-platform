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
    validateByEngagement: vi.fn(),
    getFullSession: vi.fn(),
    getOrCreateSession: vi.fn(),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn() },
}));

// Mock Anthropic SDK — must be hoisted before any service import resolves
const mockAnthropicCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  // The service does `new Anthropic(...)`, so the default export must be a class/constructor
  function MockAnthropic(_opts: unknown) {
    return {
      messages: { create: mockAnthropicCreate },
    };
  }
  return { default: MockAnthropic };
});

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

// ---------------------------------------------------------------------------
// generateDraft — AI-powered async generation
// ---------------------------------------------------------------------------

function makeClaudeResponse(text: string) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: "claude-opus-4-7",
    stop_reason: "end_turn",
    usage: {
      input_tokens: 100,
      output_tokens: 200,
      cache_creation_input_tokens: 80,
      cache_read_input_tokens: 0,
    },
  };
}

const CLAUDE_MARKDOWN = `## Executive Summary
This business relies heavily on manual processes and lacks key systems. Revenue is at risk. Immediate action is needed.

## Lens Narratives
### REVENUE
No CRM means leads are lost constantly. Implementing one is the single highest-ROI action.

### OPERATIONS
Manual invoicing wastes nearly an hour a day. Automation would recoup that instantly.

### FINANCE
Without cash flow visibility the owner is flying blind. A simple dashboard changes everything.

### TECHNOLOGY
Disconnected tools create re-entry errors. Integration would save hours each week.

### TEAM
The team is capable but over-reliant on the owner. Process documentation is the unlock.
`;

describe("reportGeneratorService.generateDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when audit session is not ready", async () => {
    vi.mocked(auditWorkspaceService.validateByEngagement).mockResolvedValue({
      isReady: false,
      missingLenses: ["TEAM"],
      lensesWithoutRag: [],
      lensesWithoutFindings: [],
    });

    await expect(
      reportGeneratorService.generateDraft({
        engagementId: ENGAGEMENT_ID,
        tenantId: TENANT_ID,
        generatedBy: "ai",
      })
    ).rejects.toThrow(BadRequestError);

    expect(reportGeneratorRepository.create).not.toHaveBeenCalled();
  });

  it("creates GENERATING row, calls Claude, transitions to DRAFT", async () => {
    vi.mocked(auditWorkspaceService.validateByEngagement).mockResolvedValue({
      isReady: true, missingLenses: [], lensesWithoutRag: [], lensesWithoutFindings: [],
    });
    vi.mocked(auditWorkspaceService.getOrCreateSession).mockResolvedValue(makeFullSession() as any);
    vi.mocked(reportGeneratorRepository.create).mockResolvedValue(makeReport("GENERATING") as any);
    vi.mocked(reportGeneratorRepository.updateContent).mockResolvedValue(makeReport("GENERATING") as any);
    vi.mocked(reportGeneratorRepository.updateStatus).mockResolvedValue(makeReport("DRAFT") as any);
    mockAnthropicCreate.mockResolvedValue(makeClaudeResponse(CLAUDE_MARKDOWN));

    const result = await reportGeneratorService.generateDraft({
      engagementId: ENGAGEMENT_ID,
      tenantId: TENANT_ID,
      generatedBy: "ai",
    });

    // Row created with GENERATING
    expect(reportGeneratorRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "GENERATING", tenantId: TENANT_ID, engagementId: ENGAGEMENT_ID })
    );

    // Claude was called
    expect(mockAnthropicCreate).toHaveBeenCalledTimes(1);
    const claudeCall = mockAnthropicCreate.mock.calls[0][0];
    expect(claudeCall.model).toBe("claude-opus-4-7");
    expect(claudeCall.system[0].cache_control).toEqual({ type: "ephemeral" });

    // Content updated then status flipped to DRAFT
    expect(reportGeneratorRepository.updateContent).toHaveBeenCalled();
    expect(reportGeneratorRepository.updateStatus).toHaveBeenCalledWith(REPORT_ID, "DRAFT");

    // Final status
    expect(result.status).toBe("DRAFT");
  });

  it("includes audit data (lenses + findings) in Claude message", async () => {
    vi.mocked(auditWorkspaceService.validateByEngagement).mockResolvedValue({
      isReady: true, missingLenses: [], lensesWithoutRag: [], lensesWithoutFindings: [],
    });
    vi.mocked(auditWorkspaceService.getOrCreateSession).mockResolvedValue(makeFullSession() as any);
    vi.mocked(reportGeneratorRepository.create).mockResolvedValue(makeReport("GENERATING") as any);
    vi.mocked(reportGeneratorRepository.updateContent).mockResolvedValue(makeReport("GENERATING") as any);
    vi.mocked(reportGeneratorRepository.updateStatus).mockResolvedValue(makeReport("DRAFT") as any);
    mockAnthropicCreate.mockResolvedValue(makeClaudeResponse(CLAUDE_MARKDOWN));

    await reportGeneratorService.generateDraft({
      engagementId: ENGAGEMENT_ID, tenantId: TENANT_ID, generatedBy: "ai",
    });

    const claudeCall = mockAnthropicCreate.mock.calls[0][0];
    const userMessage = claudeCall.messages[0].content as string;
    expect(userMessage).toContain("REVENUE");
    expect(userMessage).toContain("No CRM");
    expect(userMessage).toContain("Manual invoicing");
  });

  it("parses executive summary from Claude response into contentJson", async () => {
    vi.mocked(auditWorkspaceService.validateByEngagement).mockResolvedValue({
      isReady: true, missingLenses: [], lensesWithoutRag: [], lensesWithoutFindings: [],
    });
    vi.mocked(auditWorkspaceService.getOrCreateSession).mockResolvedValue(makeFullSession() as any);
    vi.mocked(reportGeneratorRepository.create).mockResolvedValue(makeReport("GENERATING") as any);
    vi.mocked(reportGeneratorRepository.updateContent).mockResolvedValue(makeReport("GENERATING") as any);
    vi.mocked(reportGeneratorRepository.updateStatus).mockResolvedValue(makeReport("DRAFT") as any);
    mockAnthropicCreate.mockResolvedValue(makeClaudeResponse(CLAUDE_MARKDOWN));

    await reportGeneratorService.generateDraft({
      engagementId: ENGAGEMENT_ID, tenantId: TENANT_ID, generatedBy: "ai",
    });

    const updateCall = vi.mocked(reportGeneratorRepository.updateContent).mock.calls[0];
    expect(updateCall[1].executiveSummary).toContain("manual processes");
    const json = updateCall[1].contentJson as any;
    expect(json.executiveSummary).toContain("manual processes");
  });

  it("falls back to DRAFT on Claude API error", async () => {
    vi.mocked(auditWorkspaceService.validateByEngagement).mockResolvedValue({
      isReady: true, missingLenses: [], lensesWithoutRag: [], lensesWithoutFindings: [],
    });
    vi.mocked(auditWorkspaceService.getOrCreateSession).mockResolvedValue(makeFullSession() as any);
    vi.mocked(reportGeneratorRepository.create).mockResolvedValue(makeReport("GENERATING") as any);
    vi.mocked(reportGeneratorRepository.updateStatus).mockResolvedValue(makeReport("DRAFT") as any);
    mockAnthropicCreate.mockRejectedValue(new Error("API timeout"));

    await expect(
      reportGeneratorService.generateDraft({
        engagementId: ENGAGEMENT_ID, tenantId: TENANT_ID, generatedBy: "ai",
      })
    ).rejects.toThrow("API timeout");

    // Must flip back to DRAFT on failure
    expect(reportGeneratorRepository.updateStatus).toHaveBeenCalledWith(REPORT_ID, "DRAFT");
  });

  it("uses model claude-opus-4-7 (not any other model)", async () => {
    vi.mocked(auditWorkspaceService.validateByEngagement).mockResolvedValue({
      isReady: true, missingLenses: [], lensesWithoutRag: [], lensesWithoutFindings: [],
    });
    vi.mocked(auditWorkspaceService.getOrCreateSession).mockResolvedValue(makeFullSession() as any);
    vi.mocked(reportGeneratorRepository.create).mockResolvedValue(makeReport("GENERATING") as any);
    vi.mocked(reportGeneratorRepository.updateContent).mockResolvedValue(makeReport("GENERATING") as any);
    vi.mocked(reportGeneratorRepository.updateStatus).mockResolvedValue(makeReport("DRAFT") as any);
    mockAnthropicCreate.mockResolvedValue(makeClaudeResponse(CLAUDE_MARKDOWN));

    await reportGeneratorService.generateDraft({
      engagementId: ENGAGEMENT_ID, tenantId: TENANT_ID, generatedBy: "ai",
    });

    const claudeCall = mockAnthropicCreate.mock.calls[0][0];
    expect(claudeCall.model).toBe("claude-opus-4-7");
  });
});
