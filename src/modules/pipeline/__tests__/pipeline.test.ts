import { describe, it, expect, vi, beforeEach } from "vitest";
import { pipelineService } from "../pipeline.service";
import { pipelineRepository } from "../pipeline.repository";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../pipeline.repository", () => ({
  pipelineRepository: {
    list: vi.fn(),
    findById: vi.fn(),
    findDefault: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    findStageById: vi.fn(),
    addStage: vi.fn(),
    updateStage: vi.fn(),
    removeStage: vi.fn(),
    reorderStages: vi.fn(),
    findMemberById: vi.fn(),
    addMember: vi.fn(),
    updateMemberStage: vi.fn(),
    removeMember: vi.fn(),
    updateMember: vi.fn(),
    listMembers: vi.fn(),
    getSummary: vi.fn(),
    countActiveMembers: vi.fn(),
    createHistoryEntry: vi.fn(),
    getMemberHistory: vi.fn(),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "user-1";
const PIPELINE_ID = "00000000-0000-0000-0000-000000000100";
const STAGE_OPEN_ID = "00000000-0000-0000-0000-000000000201";
const STAGE_WON_ID = "00000000-0000-0000-0000-000000000202";
const STAGE_LOST_ID = "00000000-0000-0000-0000-000000000203";
const STAGE_OPEN_2_ID = "00000000-0000-0000-0000-000000000204";
const MEMBER_ID = "00000000-0000-0000-0000-000000000300";
const CUSTOMER_ID = "00000000-0000-0000-0000-000000000400";

const ctx = { tenantId: TENANT_ID, userId: USER_ID } as any;

function makeStage(overrides: Partial<any> = {}) {
  return {
    id: STAGE_OPEN_ID,
    tenantId: TENANT_ID,
    pipelineId: PIPELINE_ID,
    name: "Lead",
    slug: "lead",
    position: 0,
    color: null,
    type: "OPEN" as const,
    allowedTransitions: [STAGE_WON_ID, STAGE_LOST_ID, STAGE_OPEN_2_ID],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePipeline(overrides: Partial<any> = {}) {
  return {
    id: PIPELINE_ID,
    tenantId: TENANT_ID,
    name: "Sales",
    description: null,
    isDefault: true,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    stages: [
      makeStage({ id: STAGE_OPEN_ID, position: 0, type: "OPEN" }),
      makeStage({ id: STAGE_OPEN_2_ID, position: 1, type: "OPEN", name: "Qualified" }),
      makeStage({ id: STAGE_WON_ID, position: 2, type: "WON", name: "Won" }),
      makeStage({ id: STAGE_LOST_ID, position: 3, type: "LOST", name: "Lost" }),
    ],
    ...overrides,
  };
}

function makeMember(overrides: Partial<any> = {}) {
  return {
    id: MEMBER_ID,
    tenantId: TENANT_ID,
    pipelineId: PIPELINE_ID,
    customerId: CUSTOMER_ID,
    stageId: STAGE_OPEN_ID,
    dealValue: 1000,
    lostReason: null,
    enteredStageAt: new Date(),
    addedAt: new Date(),
    closedAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const repo = pipelineRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// PIPELINE CRUD
// ===========================================================================

describe("pipelineService", () => {
  describe("listPipelines", () => {
    it("delegates to repository", async () => {
      const pipelines = [makePipeline()];
      repo.list.mockResolvedValue(pipelines);

      const result = await pipelineService.listPipelines(ctx);
      expect(result).toEqual(pipelines);
      expect(repo.list).toHaveBeenCalledWith(TENANT_ID);
    });
  });

  describe("getPipelineById", () => {
    it("returns pipeline when found", async () => {
      const pipeline = makePipeline();
      repo.findById.mockResolvedValue(pipeline);

      const result = await pipelineService.getPipelineById(ctx, PIPELINE_ID);
      expect(result).toEqual(pipeline);
    });

    it("throws NotFoundError when pipeline is null", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(pipelineService.getPipelineById(ctx, PIPELINE_ID)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("getDefaultPipeline", () => {
    it("returns default pipeline when found", async () => {
      const pipeline = makePipeline();
      repo.findDefault.mockResolvedValue(pipeline);

      const result = await pipelineService.getDefaultPipeline(ctx);
      expect(result).toEqual(pipeline);
    });

    it("throws NotFoundError when no default pipeline", async () => {
      repo.findDefault.mockResolvedValue(null);

      await expect(pipelineService.getDefaultPipeline(ctx)).rejects.toThrow(NotFoundError);
    });
  });

  describe("createPipeline", () => {
    it("creates and returns pipeline", async () => {
      const pipeline = makePipeline();
      repo.create.mockResolvedValue(pipeline);

      const result = await pipelineService.createPipeline(ctx, { name: "Sales" });
      expect(result).toEqual(pipeline);
      expect(repo.create).toHaveBeenCalledWith(TENANT_ID, { name: "Sales" });
    });
  });

  describe("updatePipeline", () => {
    it("delegates to repository", async () => {
      const pipeline = makePipeline({ name: "Updated" });
      repo.update.mockResolvedValue(pipeline);

      const result = await pipelineService.updatePipeline(ctx, PIPELINE_ID, { name: "Updated" });
      expect(result).toEqual(pipeline);
    });
  });

  // =========================================================================
  // ARCHIVE PIPELINE
  // =========================================================================

  describe("archivePipeline", () => {
    it("archives pipeline when no active members", async () => {
      repo.findById.mockResolvedValue(makePipeline());
      repo.countActiveMembers.mockResolvedValue(0);
      repo.archive.mockResolvedValue(undefined);

      await pipelineService.archivePipeline(ctx, PIPELINE_ID);

      expect(repo.archive).toHaveBeenCalledWith(TENANT_ID, PIPELINE_ID);
    });

    it("throws BadRequestError when active members exist", async () => {
      repo.findById.mockResolvedValue(makePipeline());
      repo.countActiveMembers.mockResolvedValue(3);

      await expect(pipelineService.archivePipeline(ctx, PIPELINE_ID)).rejects.toThrow(
        BadRequestError,
      );
      expect(repo.archive).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // STAGE CONFIGURATION
  // =========================================================================

  describe("addStage", () => {
    it("delegates to repository", async () => {
      const stage = makeStage();
      repo.addStage.mockResolvedValue(stage);

      const input = {
        pipelineId: PIPELINE_ID,
        name: "Lead",
        slug: "lead",
        position: 0,
      };
      const result = await pipelineService.addStage(ctx, input);
      expect(result).toEqual(stage);
      expect(repo.addStage).toHaveBeenCalledWith(TENANT_ID, input);
    });
  });

  describe("updateStage", () => {
    it("delegates to repository", async () => {
      const stage = makeStage({ name: "Updated" });
      repo.updateStage.mockResolvedValue(stage);

      const result = await pipelineService.updateStage(ctx, STAGE_OPEN_ID, { name: "Updated" });
      expect(result).toEqual(stage);
    });
  });

  describe("removeStage", () => {
    it("delegates to repository", async () => {
      repo.removeStage.mockResolvedValue(undefined);

      await pipelineService.removeStage(ctx, STAGE_OPEN_ID, STAGE_OPEN_2_ID);
      expect(repo.removeStage).toHaveBeenCalledWith(TENANT_ID, STAGE_OPEN_ID, STAGE_OPEN_2_ID);
    });
  });

  describe("reorderStages", () => {
    it("delegates to repository", async () => {
      repo.reorderStages.mockResolvedValue(undefined);
      const ids = [STAGE_OPEN_2_ID, STAGE_OPEN_ID];

      await pipelineService.reorderStages(ctx, PIPELINE_ID, ids);
      expect(repo.reorderStages).toHaveBeenCalledWith(TENANT_ID, PIPELINE_ID, ids);
    });
  });

  // =========================================================================
  // ADD MEMBER
  // =========================================================================

  describe("addMember", () => {
    it("adds member with explicit stageId", async () => {
      const member = makeMember();
      repo.addMember.mockResolvedValue(member);
      repo.createHistoryEntry.mockResolvedValue({});

      const result = await pipelineService.addMember(ctx, {
        pipelineId: PIPELINE_ID,
        customerId: CUSTOMER_ID,
        stageId: STAGE_OPEN_ID,
      });

      expect(result).toEqual(member);
      expect(repo.addMember).toHaveBeenCalledWith(TENANT_ID, {
        pipelineId: PIPELINE_ID,
        customerId: CUSTOMER_ID,
        stageId: STAGE_OPEN_ID,
        dealValue: undefined,
        metadata: undefined,
      });
    });

    it("uses first OPEN stage when no stageId provided", async () => {
      const pipeline = makePipeline();
      repo.findById.mockResolvedValue(pipeline);

      const member = makeMember({ stageId: STAGE_OPEN_ID });
      repo.addMember.mockResolvedValue(member);
      repo.createHistoryEntry.mockResolvedValue({});

      await pipelineService.addMember(ctx, {
        pipelineId: PIPELINE_ID,
        customerId: CUSTOMER_ID,
      });

      expect(repo.findById).toHaveBeenCalledWith(TENANT_ID, PIPELINE_ID);
      expect(repo.addMember).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ stageId: STAGE_OPEN_ID }),
      );
    });

    it("throws BadRequestError when pipeline has no OPEN stages", async () => {
      const pipeline = makePipeline({
        stages: [
          makeStage({ id: STAGE_WON_ID, type: "WON" }),
          makeStage({ id: STAGE_LOST_ID, type: "LOST" }),
        ],
      });
      repo.findById.mockResolvedValue(pipeline);

      await expect(
        pipelineService.addMember(ctx, {
          pipelineId: PIPELINE_ID,
          customerId: CUSTOMER_ID,
        }),
      ).rejects.toThrow(BadRequestError);
    });

    it("creates initial history entry", async () => {
      const member = makeMember();
      repo.addMember.mockResolvedValue(member);
      repo.createHistoryEntry.mockResolvedValue({});

      await pipelineService.addMember(ctx, {
        pipelineId: PIPELINE_ID,
        customerId: CUSTOMER_ID,
        stageId: STAGE_OPEN_ID,
      });

      expect(repo.createHistoryEntry).toHaveBeenCalledWith(TENANT_ID, {
        memberId: MEMBER_ID,
        fromStageId: null,
        toStageId: STAGE_OPEN_ID,
        changedById: USER_ID,
      });
    });

    it("emits member.added event", async () => {
      const member = makeMember();
      repo.addMember.mockResolvedValue(member);
      repo.createHistoryEntry.mockResolvedValue({});

      await pipelineService.addMember(ctx, {
        pipelineId: PIPELINE_ID,
        customerId: CUSTOMER_ID,
        stageId: STAGE_OPEN_ID,
      });

      expect(inngest.send).toHaveBeenCalledWith({
        name: "pipeline/member.added",
        data: {
          memberId: MEMBER_ID,
          pipelineId: PIPELINE_ID,
          customerId: CUSTOMER_ID,
          stageId: STAGE_OPEN_ID,
          tenantId: TENANT_ID,
        },
      });
    });
  });

  // =========================================================================
  // MOVE MEMBER
  // =========================================================================

  describe("moveMember", () => {
    it("moves member to a valid target stage", async () => {
      const member = makeMember();
      const currentStage = makeStage({
        id: STAGE_OPEN_ID,
        allowedTransitions: [STAGE_WON_ID, STAGE_LOST_ID, STAGE_OPEN_2_ID],
      });
      const targetStage = makeStage({
        id: STAGE_OPEN_2_ID,
        type: "OPEN",
        name: "Qualified",
      });
      const updatedMember = makeMember({ stageId: STAGE_OPEN_2_ID });

      repo.findMemberById.mockResolvedValue(member);
      repo.findStageById
        .mockResolvedValueOnce(currentStage)
        .mockResolvedValueOnce(targetStage);
      repo.updateMemberStage.mockResolvedValue(updatedMember);
      repo.createHistoryEntry.mockResolvedValue({});

      const result = await pipelineService.moveMember(ctx, {
        memberId: MEMBER_ID,
        toStageId: STAGE_OPEN_2_ID,
      });

      expect(result).toEqual(updatedMember);
      expect(repo.updateMemberStage).toHaveBeenCalledWith(
        TENANT_ID,
        MEMBER_ID,
        expect.objectContaining({
          stageId: STAGE_OPEN_2_ID,
          closedAt: null,
        }),
      );
    });

    it("throws BadRequestError for invalid transition", async () => {
      const member = makeMember();
      const currentStage = makeStage({
        id: STAGE_OPEN_ID,
        allowedTransitions: [STAGE_OPEN_2_ID], // WON not allowed
      });
      const targetStage = makeStage({
        id: STAGE_WON_ID,
        type: "WON",
        name: "Won",
      });

      repo.findMemberById.mockResolvedValue(member);
      repo.findStageById
        .mockResolvedValueOnce(currentStage)
        .mockResolvedValueOnce(targetStage);

      await expect(
        pipelineService.moveMember(ctx, {
          memberId: MEMBER_ID,
          toStageId: STAGE_WON_ID,
        }),
      ).rejects.toThrow(BadRequestError);

      expect(repo.updateMemberStage).not.toHaveBeenCalled();
    });

    it("allows transition when allowedTransitions is empty (no restrictions)", async () => {
      const member = makeMember();
      const currentStage = makeStage({
        id: STAGE_OPEN_ID,
        allowedTransitions: [], // No restrictions
      });
      const targetStage = makeStage({
        id: STAGE_WON_ID,
        type: "WON",
        name: "Won",
      });
      const updatedMember = makeMember({ stageId: STAGE_WON_ID, closedAt: new Date() });

      repo.findMemberById.mockResolvedValue(member);
      repo.findStageById
        .mockResolvedValueOnce(currentStage)
        .mockResolvedValueOnce(targetStage);
      repo.updateMemberStage.mockResolvedValue(updatedMember);
      repo.createHistoryEntry.mockResolvedValue({});

      await pipelineService.moveMember(ctx, {
        memberId: MEMBER_ID,
        toStageId: STAGE_WON_ID,
      });

      expect(repo.updateMemberStage).toHaveBeenCalled();
    });

    it("creates history entry with correct from/to stage IDs", async () => {
      const member = makeMember({ stageId: STAGE_OPEN_ID });
      const currentStage = makeStage({ id: STAGE_OPEN_ID });
      const targetStage = makeStage({ id: STAGE_OPEN_2_ID, type: "OPEN" });
      const updatedMember = makeMember({ stageId: STAGE_OPEN_2_ID });

      repo.findMemberById.mockResolvedValue(member);
      repo.findStageById
        .mockResolvedValueOnce(currentStage)
        .mockResolvedValueOnce(targetStage);
      repo.updateMemberStage.mockResolvedValue(updatedMember);
      repo.createHistoryEntry.mockResolvedValue({});

      await pipelineService.moveMember(ctx, {
        memberId: MEMBER_ID,
        toStageId: STAGE_OPEN_2_ID,
        notes: "Progressing",
      });

      expect(repo.createHistoryEntry).toHaveBeenCalledWith(TENANT_ID, {
        memberId: MEMBER_ID,
        fromStageId: STAGE_OPEN_ID,
        toStageId: STAGE_OPEN_2_ID,
        changedById: USER_ID,
        dealValue: undefined,
        lostReason: undefined,
        notes: "Progressing",
      });
    });

    it("sets closedAt when moving to WON stage", async () => {
      const member = makeMember();
      const currentStage = makeStage({ id: STAGE_OPEN_ID });
      const targetStage = makeStage({ id: STAGE_WON_ID, type: "WON", name: "Won" });
      const updatedMember = makeMember({ stageId: STAGE_WON_ID, closedAt: new Date() });

      repo.findMemberById.mockResolvedValue(member);
      repo.findStageById
        .mockResolvedValueOnce(currentStage)
        .mockResolvedValueOnce(targetStage);
      repo.updateMemberStage.mockResolvedValue(updatedMember);
      repo.createHistoryEntry.mockResolvedValue({});

      await pipelineService.moveMember(ctx, {
        memberId: MEMBER_ID,
        toStageId: STAGE_WON_ID,
      });

      expect(repo.updateMemberStage).toHaveBeenCalledWith(
        TENANT_ID,
        MEMBER_ID,
        expect.objectContaining({
          stageId: STAGE_WON_ID,
          closedAt: expect.any(Date),
        }),
      );
    });

    it("clears closedAt when moving from WON back to OPEN", async () => {
      const member = makeMember({ stageId: STAGE_WON_ID, closedAt: new Date() });
      const currentStage = makeStage({
        id: STAGE_WON_ID,
        type: "WON",
        allowedTransitions: [STAGE_OPEN_ID],
      });
      const targetStage = makeStage({ id: STAGE_OPEN_ID, type: "OPEN" });
      const updatedMember = makeMember({ stageId: STAGE_OPEN_ID, closedAt: null });

      repo.findMemberById.mockResolvedValue(member);
      repo.findStageById
        .mockResolvedValueOnce(currentStage)
        .mockResolvedValueOnce(targetStage);
      repo.updateMemberStage.mockResolvedValue(updatedMember);
      repo.createHistoryEntry.mockResolvedValue({});

      await pipelineService.moveMember(ctx, {
        memberId: MEMBER_ID,
        toStageId: STAGE_OPEN_ID,
      });

      expect(repo.updateMemberStage).toHaveBeenCalledWith(
        TENANT_ID,
        MEMBER_ID,
        expect.objectContaining({
          stageId: STAGE_OPEN_ID,
          closedAt: null,
        }),
      );
    });

    it("emits both moved and closed events for terminal stages", async () => {
      const member = makeMember();
      const currentStage = makeStage({ id: STAGE_OPEN_ID });
      const targetStage = makeStage({ id: STAGE_WON_ID, type: "WON", name: "Won" });
      const updatedMember = makeMember({
        stageId: STAGE_WON_ID,
        dealValue: 5000,
        closedAt: new Date(),
      });

      repo.findMemberById.mockResolvedValue(member);
      repo.findStageById
        .mockResolvedValueOnce(currentStage)
        .mockResolvedValueOnce(targetStage);
      repo.updateMemberStage.mockResolvedValue(updatedMember);
      repo.createHistoryEntry.mockResolvedValue({});

      await pipelineService.moveMember(ctx, {
        memberId: MEMBER_ID,
        toStageId: STAGE_WON_ID,
        dealValue: 5000,
      });

      // Moved event
      expect(inngest.send).toHaveBeenCalledWith({
        name: "pipeline/member.moved",
        data: expect.objectContaining({
          memberId: MEMBER_ID,
          fromStageId: STAGE_OPEN_ID,
          toStageId: STAGE_WON_ID,
        }),
      });

      // Closed event
      expect(inngest.send).toHaveBeenCalledWith({
        name: "pipeline/member.closed",
        data: expect.objectContaining({
          memberId: MEMBER_ID,
          stageType: "WON",
          dealValue: 5000,
        }),
      });
    });

    it("does not emit closed event for OPEN stage transitions", async () => {
      const member = makeMember();
      const currentStage = makeStage({ id: STAGE_OPEN_ID });
      const targetStage = makeStage({ id: STAGE_OPEN_2_ID, type: "OPEN" });
      const updatedMember = makeMember({ stageId: STAGE_OPEN_2_ID });

      repo.findMemberById.mockResolvedValue(member);
      repo.findStageById
        .mockResolvedValueOnce(currentStage)
        .mockResolvedValueOnce(targetStage);
      repo.updateMemberStage.mockResolvedValue(updatedMember);
      repo.createHistoryEntry.mockResolvedValue({});

      await pipelineService.moveMember(ctx, {
        memberId: MEMBER_ID,
        toStageId: STAGE_OPEN_2_ID,
      });

      // Only moved event, not closed
      expect(inngest.send).toHaveBeenCalledTimes(1);
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({ name: "pipeline/member.moved" }),
      );
    });

    it("sets closedAt when moving to LOST stage", async () => {
      const member = makeMember();
      const currentStage = makeStage({ id: STAGE_OPEN_ID });
      const targetStage = makeStage({ id: STAGE_LOST_ID, type: "LOST", name: "Lost" });
      const updatedMember = makeMember({ stageId: STAGE_LOST_ID, closedAt: new Date() });

      repo.findMemberById.mockResolvedValue(member);
      repo.findStageById
        .mockResolvedValueOnce(currentStage)
        .mockResolvedValueOnce(targetStage);
      repo.updateMemberStage.mockResolvedValue(updatedMember);
      repo.createHistoryEntry.mockResolvedValue({});

      await pipelineService.moveMember(ctx, {
        memberId: MEMBER_ID,
        toStageId: STAGE_LOST_ID,
        lostReason: "Budget constraints",
      });

      expect(repo.updateMemberStage).toHaveBeenCalledWith(
        TENANT_ID,
        MEMBER_ID,
        expect.objectContaining({
          closedAt: expect.any(Date),
          lostReason: "Budget constraints",
        }),
      );

      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "pipeline/member.closed",
          data: expect.objectContaining({ stageType: "LOST" }),
        }),
      );
    });
  });

  // =========================================================================
  // REMOVE MEMBER
  // =========================================================================

  describe("removeMember", () => {
    it("removes member and emits event", async () => {
      const member = makeMember();
      repo.findMemberById.mockResolvedValue(member);
      repo.removeMember.mockResolvedValue(undefined);

      await pipelineService.removeMember(ctx, MEMBER_ID);

      expect(repo.removeMember).toHaveBeenCalledWith(TENANT_ID, MEMBER_ID);
      expect(inngest.send).toHaveBeenCalledWith({
        name: "pipeline/member.removed",
        data: {
          memberId: MEMBER_ID,
          pipelineId: PIPELINE_ID,
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
        },
      });
    });

    it("throws NotFoundError for unknown member", async () => {
      repo.findMemberById.mockRejectedValue(new NotFoundError("PipelineMember", "unknown"));

      await expect(pipelineService.removeMember(ctx, "unknown")).rejects.toThrow(NotFoundError);
      expect(repo.removeMember).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // OTHER MEMBER OPERATIONS
  // =========================================================================

  describe("updateMember", () => {
    it("delegates to repository", async () => {
      const member = makeMember({ dealValue: 2000 });
      repo.updateMember.mockResolvedValue(member);

      const result = await pipelineService.updateMember(ctx, MEMBER_ID, { dealValue: 2000 });
      expect(result).toEqual(member);
    });
  });

  describe("listMembers", () => {
    it("delegates to repository", async () => {
      const members = [makeMember()];
      repo.listMembers.mockResolvedValue(members);

      const result = await pipelineService.listMembers(ctx, PIPELINE_ID);
      expect(result).toEqual(members);
    });
  });

  describe("getSummary", () => {
    it("delegates to repository", async () => {
      const summary = [{ stageId: STAGE_OPEN_ID, count: 5, totalDealValue: 10000 }];
      repo.getSummary.mockResolvedValue(summary);

      const result = await pipelineService.getSummary(ctx, PIPELINE_ID);
      expect(result).toEqual(summary);
    });
  });

  describe("getMemberHistory", () => {
    it("returns history for existing member", async () => {
      const member = makeMember();
      const history = [
        {
          id: "h1",
          tenantId: TENANT_ID,
          memberId: MEMBER_ID,
          fromStageId: null,
          toStageId: STAGE_OPEN_ID,
          changedAt: new Date(),
          changedById: USER_ID,
          dealValue: null,
          lostReason: null,
          notes: null,
        },
      ];
      repo.findMemberById.mockResolvedValue(member);
      repo.getMemberHistory.mockResolvedValue(history);

      const result = await pipelineService.getMemberHistory(ctx, MEMBER_ID);
      expect(result).toEqual(history);
    });

    it("throws NotFoundError for unknown member", async () => {
      repo.findMemberById.mockRejectedValue(new NotFoundError("PipelineMember", "unknown"));

      await expect(pipelineService.getMemberHistory(ctx, "unknown")).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
