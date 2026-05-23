import { describe, it, expect, vi, beforeEach } from "vitest";
import { auditWorkspaceService } from "../audit-workspace.service";
import { auditWorkspaceRepository } from "../audit-workspace.repository";
import { BadRequestError, NotFoundError } from "@/shared/errors";

// ── Mock DB for engagement lookups ─────────────────────────────────────────

const mockEngagementFindFirst = vi.fn();

vi.mock("@/shared/db", () => ({
  db: {
    query: {
      engagements: {
        findFirst: (...args: any[]) => mockEngagementFindFirst(...args),
      },
    },
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
}));

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
    reorderFindings: vi.fn(),
    reorderRecommendations: vi.fn(),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn() },
}));

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const SESSION_ID = "00000000-0000-0000-0000-000000000020";
const ENGAGEMENT_ID = "00000000-0000-0000-0000-000000000010";
const CLIENT_TENANT_ID = "00000000-0000-0000-0000-000000000002";
const LENS_ID = "00000000-0000-0000-0000-000000000030";

function makeSession(status = "IN_PROGRESS") {
  return { id: SESSION_ID, tenantId: CLIENT_TENANT_ID, engagementId: ENGAGEMENT_ID, status };
}

function makeEngagement(stage = "ONBOARDING") {
  return { id: ENGAGEMENT_ID, clientTenantId: CLIENT_TENANT_ID, stage };
}

function makeLens(lens: string, ragScore: string | null = "RED") {
  return { id: LENS_ID, auditSessionId: SESSION_ID, lens, ragScore, sortOrder: 0 };
}

// ── getOrCreateSession ────────────────────────────────────────────────────

describe("auditWorkspaceService.getOrCreateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEngagementFindFirst.mockResolvedValue(makeEngagement());
  });

  it("returns existing session with full data when one exists", async () => {
    const session = makeSession();
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(session as any);
    vi.mocked(auditWorkspaceRepository.listCallNotes).mockResolvedValue([]);
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue([]);

    const result = await auditWorkspaceService.getOrCreateSession(ENGAGEMENT_ID);

    expect(result.id).toBe(SESSION_ID);
    expect(result.lenses).toEqual([]);
    expect(result.callNotes).toEqual([]);
    // Should NOT have called createSession
    expect(auditWorkspaceRepository.createSession).not.toHaveBeenCalled();
  });

  it("creates a new session when none exists and advances engagement to AUDITING", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(null);
    vi.mocked(auditWorkspaceRepository.createSession).mockResolvedValue(makeSession() as any);
    vi.mocked(auditWorkspaceRepository.listCallNotes).mockResolvedValue([]);
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue([]);

    const result = await auditWorkspaceService.getOrCreateSession(ENGAGEMENT_ID);

    expect(result.id).toBe(SESSION_ID);
    expect(auditWorkspaceRepository.createSession).toHaveBeenCalledWith(CLIENT_TENANT_ID, ENGAGEMENT_ID);
  });

  it("throws NotFoundError when engagement does not exist", async () => {
    mockEngagementFindFirst.mockResolvedValue(null);

    await expect(
      auditWorkspaceService.getOrCreateSession(ENGAGEMENT_ID)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when engagement has no clientTenantId", async () => {
    mockEngagementFindFirst.mockResolvedValue({ id: ENGAGEMENT_ID, clientTenantId: null, stage: "ONBOARDING" });

    await expect(
      auditWorkspaceService.getOrCreateSession(ENGAGEMENT_ID)
    ).rejects.toThrow(NotFoundError);
  });

  it("hydrates lenses with findings and recommendations", async () => {
    const lens = makeLens("REVENUE");
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(makeSession() as any);
    vi.mocked(auditWorkspaceRepository.listCallNotes).mockResolvedValue([]);
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue([lens as any]);
    vi.mocked(auditWorkspaceRepository.listFindings).mockResolvedValue([{ id: "f1" }] as any);
    vi.mocked(auditWorkspaceRepository.listRecommendations).mockResolvedValue([{ id: "r1" }] as any);

    const result = await auditWorkspaceService.getOrCreateSession(ENGAGEMENT_ID);

    expect(result.lenses).toHaveLength(1);
    expect(result.lenses[0].findings).toHaveLength(1);
    expect(result.lenses[0].recommendations).toHaveLength(1);
  });
});

// ── upsertCallNoteByEngagement ────────────────────────────────────────────

describe("auditWorkspaceService.upsertCallNoteByEngagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEngagementFindFirst.mockResolvedValue(makeEngagement());
  });

  it("upserts call note for existing session", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(makeSession() as any);
    const noteRecord = { id: "note-1", auditSessionId: SESSION_ID, contactUserId: "user-2", rawNotes: "hello" };
    vi.mocked(auditWorkspaceRepository.upsertCallNotes).mockResolvedValue(noteRecord as any);

    const result = await auditWorkspaceService.upsertCallNoteByEngagement({
      engagementId: ENGAGEMENT_ID,
      contactUserId: "user-2",
      rawNotes: "hello",
    });

    expect(result.id).toBe("note-1");
    expect(auditWorkspaceRepository.upsertCallNotes).toHaveBeenCalledWith(SESSION_ID, "user-2", "hello", undefined, undefined);
  });

  it("throws NotFoundError when no session exists for engagement", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(null);

    await expect(
      auditWorkspaceService.upsertCallNoteByEngagement({
        engagementId: ENGAGEMENT_ID,
        contactUserId: "user-2",
        rawNotes: "hello",
      })
    ).rejects.toThrow(NotFoundError);
  });
});

// ── reorderFindings ────────────────────────────────────────────────────────

describe("auditWorkspaceService.reorderFindings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates to repository with correct args", async () => {
    vi.mocked(auditWorkspaceRepository.reorderFindings).mockResolvedValue(undefined);

    await auditWorkspaceService.reorderFindings({ lensAnalysisId: LENS_ID, order: ["f1", "f2", "f3"] });

    expect(auditWorkspaceRepository.reorderFindings).toHaveBeenCalledWith(LENS_ID, ["f1", "f2", "f3"]);
  });
});

// ── reorderRecommendations ─────────────────────────────────────────────────

describe("auditWorkspaceService.reorderRecommendations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates to repository with correct args", async () => {
    vi.mocked(auditWorkspaceRepository.reorderRecommendations).mockResolvedValue(undefined);

    await auditWorkspaceService.reorderRecommendations({ lensAnalysisId: LENS_ID, order: ["r1", "r2"] });

    expect(auditWorkspaceRepository.reorderRecommendations).toHaveBeenCalledWith(LENS_ID, ["r1", "r2"]);
  });
});

// ── validateByEngagement ───────────────────────────────────────────────────

describe("auditWorkspaceService.validateByEngagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEngagementFindFirst.mockResolvedValue(makeEngagement());
  });

  it("returns all lenses missing when no session exists", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(null);

    const result = await auditWorkspaceService.validateByEngagement(ENGAGEMENT_ID);

    expect(result.isReady).toBe(false);
    expect(result.missingLenses).toHaveLength(5);
  });

  it("delegates to validateReadiness when session exists and is ready", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(makeSession() as any);
    const lenses = ["REVENUE", "OPERATIONS", "FINANCE", "TECHNOLOGY", "TEAM"].map(
      (l) => ({ id: LENS_ID, auditSessionId: SESSION_ID, lens: l, ragScore: "RED", sortOrder: 0 })
    );
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue(lenses as any);
    vi.mocked(auditWorkspaceRepository.listFindings).mockResolvedValue([{ id: "f1" }] as any);

    const result = await auditWorkspaceService.validateByEngagement(ENGAGEMENT_ID);

    expect(result.isReady).toBe(true);
  });
});

// ── markReadyByEngagement ─────────────────────────────────────────────────

describe("auditWorkspaceService.markReadyByEngagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEngagementFindFirst.mockResolvedValue(makeEngagement());
  });

  it("transitions to READY_FOR_REPORT when validation passes", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(makeSession() as any);
    const lenses = ["REVENUE", "OPERATIONS", "FINANCE", "TECHNOLOGY", "TEAM"].map(
      (l) => ({ id: LENS_ID, auditSessionId: SESSION_ID, lens: l, ragScore: "RED", sortOrder: 0 })
    );
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue(lenses as any);
    vi.mocked(auditWorkspaceRepository.listFindings).mockResolvedValue([{ id: "f1" }] as any);
    vi.mocked(auditWorkspaceRepository.updateSessionStatus).mockResolvedValue(
      makeSession("READY_FOR_REPORT") as any
    );

    const result = await auditWorkspaceService.markReadyByEngagement(ENGAGEMENT_ID);

    expect(result.status).toBe("READY_FOR_REPORT");
    expect(auditWorkspaceRepository.updateSessionStatus).toHaveBeenCalledWith(SESSION_ID, "READY_FOR_REPORT");
  });

  it("throws NotFoundError when no session exists", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(null);

    await expect(
      auditWorkspaceService.markReadyByEngagement(ENGAGEMENT_ID)
    ).rejects.toThrow(NotFoundError);
  });

  it("throws BadRequestError when validation fails", async () => {
    vi.mocked(auditWorkspaceRepository.findSessionByEngagement).mockResolvedValue(makeSession() as any);
    // No lenses → fails validation
    vi.mocked(auditWorkspaceRepository.listLensAnalysis).mockResolvedValue([]);

    await expect(
      auditWorkspaceService.markReadyByEngagement(ENGAGEMENT_ID)
    ).rejects.toThrow(BadRequestError);
  });
});
