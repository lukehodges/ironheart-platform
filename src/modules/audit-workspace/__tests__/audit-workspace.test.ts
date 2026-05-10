import { describe, it, expect, vi, beforeEach } from "vitest";
import { auditWorkspaceService } from "../audit-workspace.service";
import { auditWorkspaceRepository } from "../audit-workspace.repository";
import { BadRequestError, NotFoundError } from "@/shared/errors";

vi.mock("../audit-workspace.repository", () => ({
  auditWorkspaceRepository: {
    createSession: vi.fn(),
    findSessionById: vi.fn(),
    findSessionByEngagement: vi.fn(),
    updateSessionStatus: vi.fn(),
    upsertCallNotes: vi.fn(),
    listCallNotes: vi.fn(),
    upsertLensAnalysis: vi.fn(),
    listLensAnalysis: vi.fn(),
    createFinding: vi.fn(),
    updateFinding: vi.fn(),
    deleteFinding: vi.fn(),
    listFindings: vi.fn(),
    createRecommendation: vi.fn(),
    updateRecommendation: vi.fn(),
    deleteRecommendation: vi.fn(),
    listRecommendations: vi.fn(),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn() },
}));

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const SESSION_ID = "00000000-0000-0000-0000-000000000020";
const ENGAGEMENT_ID = "00000000-0000-0000-0000-000000000010";
const LENS_ID = "00000000-0000-0000-0000-000000000030";

function makeCtx() {
  return { tenantId: TENANT_ID, userId: "user-1" } as any;
}

function makeSession(status = "IN_PROGRESS") {
  return { id: SESSION_ID, tenantId: TENANT_ID, engagementId: ENGAGEMENT_ID, status };
}

function makeLens(lens: string, ragScore: string | null = "RED") {
  return { id: LENS_ID, auditSessionId: SESSION_ID, lens, ragScore, sortOrder: 0 };
}

describe("auditWorkspaceService.createSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new session for an engagement", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(null);
    vi.mocked(auditWorkspaceRepository.createSession).mockResolvedValue(makeSession() as any);

    const result = await auditWorkspaceService.createSession(makeCtx(), { engagementId: ENGAGEMENT_ID });

    expect(result.id).toBe(SESSION_ID);
    expect(auditWorkspaceRepository.createSession).toHaveBeenCalledWith(TENANT_ID, ENGAGEMENT_ID);
  });

  it("rejects if active session already exists", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(makeSession("IN_PROGRESS") as any);

    await expect(
      auditWorkspaceService.createSession(makeCtx(), { engagementId: ENGAGEMENT_ID })
    ).rejects.toThrow(BadRequestError);
  });

  it("allows new session if previous is COMPLETE", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(makeSession("COMPLETE") as any);
    vi.mocked(auditWorkspaceRepository.createSession).mockResolvedValue(makeSession() as any);

    const result = await auditWorkspaceService.createSession(makeCtx(), { engagementId: ENGAGEMENT_ID });
    expect(result.id).toBe(SESSION_ID);
  });
});

describe("auditWorkspaceService.validateReadiness", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ready when all 5 lenses have RAG scores and findings", async () => {
    const lenses = [
      makeLens("REVENUE", "RED"),
      makeLens("OPERATIONS", "AMBER"),
      makeLens("FINANCE", "RED"),
      makeLens("TECHNOLOGY", "GREEN"),
      makeLens("TEAM", "GREEN"),
    ];
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue(lenses as any);
    vi.mocked(auditWorkspaceRepository.listFindings).mockResolvedValue([{ id: "f1" }] as any);

    const result = await auditWorkspaceService.validateReadiness(SESSION_ID);

    expect(result.isReady).toBe(true);
    expect(result.missingLenses).toEqual([]);
    expect(result.lensesWithoutRag).toEqual([]);
    expect(result.lensesWithoutFindings).toEqual([]);
  });

  it("returns not ready when lenses are missing", async () => {
    const lenses = [makeLens("REVENUE", "RED"), makeLens("OPERATIONS", "AMBER")];
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue(lenses as any);
    vi.mocked(auditWorkspaceRepository.listFindings).mockResolvedValue([{ id: "f1" }] as any);

    const result = await auditWorkspaceService.validateReadiness(SESSION_ID);

    expect(result.isReady).toBe(false);
    expect(result.missingLenses).toContain("FINANCE");
    expect(result.missingLenses).toContain("TECHNOLOGY");
    expect(result.missingLenses).toContain("TEAM");
  });

  it("returns not ready when lenses have no RAG score", async () => {
    const lenses = [
      makeLens("REVENUE", null),
      makeLens("OPERATIONS", "AMBER"),
      makeLens("FINANCE", "RED"),
      makeLens("TECHNOLOGY", "GREEN"),
      makeLens("TEAM", "GREEN"),
    ];
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue(lenses as any);
    vi.mocked(auditWorkspaceRepository.listFindings).mockResolvedValue([{ id: "f1" }] as any);

    const result = await auditWorkspaceService.validateReadiness(SESSION_ID);

    expect(result.isReady).toBe(false);
    expect(result.lensesWithoutRag).toContain("REVENUE");
  });

  it("returns not ready when lenses have no findings", async () => {
    const lenses = [
      makeLens("REVENUE", "RED"),
      makeLens("OPERATIONS", "AMBER"),
      makeLens("FINANCE", "RED"),
      makeLens("TECHNOLOGY", "GREEN"),
      makeLens("TEAM", "GREEN"),
    ];
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue(lenses as any);
    // All lenses return empty findings
    vi.mocked(auditWorkspaceRepository.listFindings).mockResolvedValue([]);

    const result = await auditWorkspaceService.validateReadiness(SESSION_ID);

    expect(result.isReady).toBe(false);
    expect(result.lensesWithoutFindings).toHaveLength(5);
  });
});

describe("auditWorkspaceService.markReadyForReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks session as READY_FOR_REPORT when validation passes", async () => {
    const lenses = ["REVENUE", "OPERATIONS", "FINANCE", "TECHNOLOGY", "TEAM"].map(
      (l) => makeLens(l, "RED")
    );
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue(lenses as any);
    vi.mocked(auditWorkspaceRepository.listFindings).mockResolvedValue([{ id: "f1" }] as any);
    vi.mocked(auditWorkspaceRepository.updateSessionStatus).mockResolvedValue(makeSession("READY_FOR_REPORT") as any);

    const result = await auditWorkspaceService.markReadyForReport(makeCtx(), SESSION_ID);

    expect(result.status).toBe("READY_FOR_REPORT");
    expect(auditWorkspaceRepository.updateSessionStatus).toHaveBeenCalledWith(SESSION_ID, "READY_FOR_REPORT");
  });

  it("rejects when validation fails", async () => {
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue([]);

    await expect(
      auditWorkspaceService.markReadyForReport(makeCtx(), SESSION_ID)
    ).rejects.toThrow(BadRequestError);
  });
});

describe("auditWorkspaceService.getSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError for missing session", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionById).mockResolvedValue(null);

    await expect(
      auditWorkspaceService.getSession(makeCtx(), { auditSessionId: SESSION_ID })
    ).rejects.toThrow(NotFoundError);
  });
});
