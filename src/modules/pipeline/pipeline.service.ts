import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import type { Context } from "@/shared/trpc";
import { pipelineRepository } from "./pipeline.repository";
import type {
  PipelineRecord,
  PipelineMemberRecord,
  PipelineMemberWithCustomer,
  PipelineWithStages,
  PipelineStageRecord,
  PipelineStageHistoryRecord,
  PipelineStageSummary,
} from "./pipeline.types";

const log = logger.child({ module: "pipeline.service" });

export const pipelineService = {
  // ---------------------------------------------------------------------------
  // PIPELINE CRUD
  // ---------------------------------------------------------------------------

  async listPipelines(ctx: Context): Promise<PipelineRecord[]> {
    return pipelineRepository.list(ctx.tenantId);
  },

  async getPipelineById(ctx: Context, pipelineId: string): Promise<PipelineWithStages> {
    const pipeline = await pipelineRepository.findById(ctx.tenantId, pipelineId);
    if (!pipeline) throw new NotFoundError("Pipeline", pipelineId);
    return pipeline;
  },

  async getDefaultPipeline(ctx: Context): Promise<PipelineWithStages> {
    const pipeline = await pipelineRepository.findDefault(ctx.tenantId);
    if (!pipeline) throw new NotFoundError("Pipeline", "default");
    return pipeline;
  },

  async createPipeline(
    ctx: Context,
    input: {
      name: string;
      description?: string | null;
      isDefault?: boolean;
      stages?: Array<{
        name: string;
        slug: string;
        position: number;
        color?: string | null;
        type?: "OPEN" | "WON" | "LOST";
        allowedTransitions?: string[];
      }>;
    },
  ): Promise<PipelineWithStages> {
    const pipeline = await pipelineRepository.create(ctx.tenantId, input);
    log.info({ tenantId: ctx.tenantId, pipelineId: pipeline.id }, "Pipeline created");
    return pipeline;
  },

  async updatePipeline(
    ctx: Context,
    pipelineId: string,
    input: Partial<{
      name: string;
      description: string | null;
      isDefault: boolean;
    }>,
  ): Promise<PipelineRecord> {
    return pipelineRepository.update(ctx.tenantId, pipelineId, input);
  },

  async archivePipeline(ctx: Context, pipelineId: string): Promise<void> {
    // Validate pipeline exists
    await pipelineRepository.findById(ctx.tenantId, pipelineId);

    // Check for active members
    const activeCount = await pipelineRepository.countActiveMembers(ctx.tenantId, pipelineId);
    if (activeCount > 0) {
      throw new BadRequestError(
        `Cannot archive pipeline with ${activeCount} active member(s). Move or remove them first.`,
      );
    }

    await pipelineRepository.archive(ctx.tenantId, pipelineId);
    log.info({ tenantId: ctx.tenantId, pipelineId }, "Pipeline archived");
  },

  // ---------------------------------------------------------------------------
  // STAGE CONFIGURATION
  // ---------------------------------------------------------------------------

  async addStage(
    ctx: Context,
    input: {
      pipelineId: string;
      name: string;
      slug: string;
      position: number;
      color?: string | null;
      type?: "OPEN" | "WON" | "LOST";
      allowedTransitions?: string[];
    },
  ): Promise<PipelineStageRecord> {
    return pipelineRepository.addStage(ctx.tenantId, input);
  },

  async updateStage(
    ctx: Context,
    stageId: string,
    input: Partial<{
      name: string;
      color: string | null;
      type: "OPEN" | "WON" | "LOST";
      allowedTransitions: string[];
    }>,
  ): Promise<PipelineStageRecord> {
    return pipelineRepository.updateStage(ctx.tenantId, stageId, input);
  },

  async removeStage(ctx: Context, stageId: string, reassignToStageId: string): Promise<void> {
    return pipelineRepository.removeStage(ctx.tenantId, stageId, reassignToStageId);
  },

  async reorderStages(ctx: Context, pipelineId: string, stageIds: string[]): Promise<void> {
    return pipelineRepository.reorderStages(ctx.tenantId, pipelineId, stageIds);
  },

  // ---------------------------------------------------------------------------
  // MEMBER OPERATIONS
  // ---------------------------------------------------------------------------

  async addMember(
    ctx: Context,
    input: {
      pipelineId: string;
      customerId: string;
      stageId?: string;
      dealValue?: number | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<PipelineMemberRecord> {
    let stageId = input.stageId;

    // If no stageId provided, find the first OPEN stage
    if (!stageId) {
      const pipeline = await pipelineRepository.findById(ctx.tenantId, input.pipelineId);
      const firstOpenStage = pipeline.stages
        .filter((s) => s.type === "OPEN")
        .sort((a, b) => a.position - b.position)[0];

      if (!firstOpenStage) {
        throw new BadRequestError("Pipeline has no OPEN stages to add member to");
      }
      stageId = firstOpenStage.id;
    }

    const member = await pipelineRepository.addMember(ctx.tenantId, {
      pipelineId: input.pipelineId,
      customerId: input.customerId,
      stageId,
      dealValue: input.dealValue,
      metadata: input.metadata,
    });

    // Create initial history entry
    await pipelineRepository.createHistoryEntry(ctx.tenantId, {
      memberId: member.id,
      fromStageId: null,
      toStageId: stageId,
      changedById: ctx.userId,
    });

    // Emit event
    await inngest.send({
      name: "pipeline/member.added",
      data: {
        memberId: member.id,
        pipelineId: input.pipelineId,
        customerId: input.customerId,
        stageId,
        tenantId: ctx.tenantId,
      },
    });

    log.info(
      { tenantId: ctx.tenantId, memberId: member.id, pipelineId: input.pipelineId, stageId },
      "Pipeline member added",
    );

    return member;
  },

  async moveMember(
    ctx: Context,
    input: {
      memberId: string;
      toStageId: string;
      dealValue?: number | null;
      lostReason?: string | null;
      notes?: string | null;
    },
  ): Promise<PipelineMemberRecord> {
    // Find member
    const member = await pipelineRepository.findMemberById(ctx.tenantId, input.memberId);

    // Find current stage
    const currentStage = await pipelineRepository.findStageById(ctx.tenantId, member.stageId);

    // Find target stage
    const targetStage = await pipelineRepository.findStageById(ctx.tenantId, input.toStageId);

    // Validate transition
    if (
      currentStage.allowedTransitions.length > 0 &&
      !currentStage.allowedTransitions.includes(input.toStageId)
    ) {
      throw new BadRequestError(
        `Transition from "${currentStage.name}" to "${targetStage.name}" is not allowed`,
      );
    }

    // Determine closedAt
    let closedAt: Date | null = null;
    if (targetStage.type === "WON" || targetStage.type === "LOST") {
      closedAt = new Date();
    }

    // Update member stage
    const updated = await pipelineRepository.updateMemberStage(ctx.tenantId, input.memberId, {
      stageId: input.toStageId,
      dealValue: input.dealValue,
      lostReason: input.lostReason,
      closedAt,
    });

    // Create history entry
    await pipelineRepository.createHistoryEntry(ctx.tenantId, {
      memberId: input.memberId,
      fromStageId: member.stageId,
      toStageId: input.toStageId,
      changedById: ctx.userId,
      dealValue: input.dealValue,
      lostReason: input.lostReason,
      notes: input.notes,
    });

    // Emit moved event
    await inngest.send({
      name: "pipeline/member.moved",
      data: {
        memberId: input.memberId,
        pipelineId: member.pipelineId,
        customerId: member.customerId,
        fromStageId: member.stageId,
        toStageId: input.toStageId,
        dealValue: updated.dealValue,
        tenantId: ctx.tenantId,
      },
    });

    // Emit closed event if terminal
    if (targetStage.type === "WON" || targetStage.type === "LOST") {
      await inngest.send({
        name: "pipeline/member.closed",
        data: {
          memberId: input.memberId,
          pipelineId: member.pipelineId,
          customerId: member.customerId,
          stageType: targetStage.type,
          dealValue: updated.dealValue,
          tenantId: ctx.tenantId,
        },
      });
    }

    log.info(
      {
        tenantId: ctx.tenantId,
        memberId: input.memberId,
        fromStageId: member.stageId,
        toStageId: input.toStageId,
      },
      "Pipeline member moved",
    );

    return updated;
  },

  async removeMember(ctx: Context, memberId: string): Promise<void> {
    const member = await pipelineRepository.findMemberById(ctx.tenantId, memberId);

    await pipelineRepository.removeMember(ctx.tenantId, memberId);

    await inngest.send({
      name: "pipeline/member.removed",
      data: {
        memberId,
        pipelineId: member.pipelineId,
        customerId: member.customerId,
        tenantId: ctx.tenantId,
      },
    });

    log.info({ tenantId: ctx.tenantId, memberId }, "Pipeline member removed");
  },

  async updateMember(
    ctx: Context,
    memberId: string,
    input: Partial<{
      dealValue: number | null;
      metadata: Record<string, unknown>;
    }>,
  ): Promise<PipelineMemberRecord> {
    return pipelineRepository.updateMember(ctx.tenantId, memberId, input);
  },

  async listMembers(ctx: Context, pipelineId: string): Promise<PipelineMemberWithCustomer[]> {
    return pipelineRepository.listMembers(ctx.tenantId, pipelineId);
  },

  async getSummary(ctx: Context, pipelineId: string): Promise<PipelineStageSummary[]> {
    return pipelineRepository.getSummary(ctx.tenantId, pipelineId);
  },

  async getMemberHistory(
    ctx: Context,
    memberId: string,
  ): Promise<PipelineStageHistoryRecord[]> {
    // Validate member exists
    await pipelineRepository.findMemberById(ctx.tenantId, memberId);
    return pipelineRepository.getMemberHistory(ctx.tenantId, memberId);
  },
};
