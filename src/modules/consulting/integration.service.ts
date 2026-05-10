import { logger } from "@/shared/logger";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { consultingRepository } from "./consulting.repository";
import type { PlaneProjectResult, DriveFolderResult, IntegrationStatus } from "./integration.types";
import type { AuditSessionWithLenses } from "@/modules/audit-workspace/audit-workspace.types";

const log = logger.child({ module: "consulting.integration" });

/**
 * Stubbed Plane.so client.
 * Replace with actual MCP tool calls or Plane API when ready.
 */
async function createPlaneProject(
  projectName: string,
  tasks: { title: string; description: string; priority: string }[]
): Promise<PlaneProjectResult> {
  // STUB: In production, this calls Plane.so MCP tools:
  //   mcp__plane__create_project({ name, description })
  //   mcp__plane__create_work_item({ title, description, priority }) for each task
  log.info({ projectName, taskCount: tasks.length }, "STUB: would create Plane.so project");
  return {
    projectId: `plane-stub-${Date.now()}`,
    projectUrl: `https://app.plane.so/ironheart/projects/stub-${Date.now()}`,
  };
}

/**
 * Stubbed Google Drive client.
 * Replace with actual MCP tool calls or Drive API when ready.
 */
async function createDriveFolderStructure(
  companyName: string
): Promise<DriveFolderResult> {
  // STUB: In production, this calls Google Drive MCP tools:
  //   mcp__claude_ai_Google_Drive__create_folder("Ironheart Clients/{companyName}")
  //   create subfolders: Proposal, Contract, Audit, Implementation
  log.info({ companyName }, "STUB: would create Google Drive folder structure");
  const stubId = `drive-stub-${Date.now()}`;
  return {
    folderId: stubId,
    folderUrl: `https://drive.google.com/drive/folders/${stubId}`,
    subfolders: {
      proposal: `${stubId}-proposal`,
      contract: `${stubId}-contract`,
      audit: `${stubId}-audit`,
      implementation: `${stubId}-implementation`,
    },
  };
}

export const integrationService = {
  /**
   * Create a Plane.so project from audit recommendations.
   * Called when engagement reaches IMPLEMENTING.
   */
  async createPlaneProjectFromAudit(
    tenantId: string,
    engagementId: string,
    auditData: AuditSessionWithLenses,
    projectName: string
  ): Promise<PlaneProjectResult> {
    const engagement = await consultingRepository.findEngagementById(tenantId, engagementId);
    if (!engagement) throw new NotFoundError("Engagement", engagementId);
    if ((engagement as any).planeProjectId) {
      throw new BadRequestError("Plane project already exists for this engagement");
    }

    // Extract tasks from audit recommendations
    const tasks = auditData.lenses.flatMap((lens) =>
      lens.recommendations.map((rec) => ({
        title: rec.action,
        description: `Lens: ${lens.lens} | Effort: ${rec.estimatedEffort ?? "TBD"} | Cost: ${rec.estimatedCost ? `£${(rec.estimatedCost / 100).toFixed(0)}` : "TBD"}`,
        priority: rec.priority <= 3 ? "HIGH" : rec.priority <= 6 ? "MEDIUM" : "LOW",
      }))
    );

    const result = await createPlaneProject(projectName, tasks);

    await consultingRepository.setExternalIds(tenantId, engagementId, {
      planeProjectId: result.projectId,
    });

    log.info({ engagementId, projectId: result.projectId }, "Plane project linked to engagement");
    return result;
  },

  /**
   * Create a Google Drive folder structure for a client.
   * Called when engagement reaches CONTRACTED.
   */
  async createDriveFolder(
    tenantId: string,
    engagementId: string,
    companyName: string
  ): Promise<DriveFolderResult> {
    const engagement = await consultingRepository.findEngagementById(tenantId, engagementId);
    if (!engagement) throw new NotFoundError("Engagement", engagementId);
    if ((engagement as any).driveFolderId) {
      throw new BadRequestError("Drive folder already exists for this engagement");
    }

    const result = await createDriveFolderStructure(companyName);

    await consultingRepository.setExternalIds(tenantId, engagementId, {
      driveFolderId: result.folderId,
    });

    log.info({ engagementId, folderId: result.folderId }, "Drive folder linked to engagement");
    return result;
  },

  /**
   * Get integration status for an engagement.
   */
  async getIntegrationStatus(
    tenantId: string,
    engagementId: string
  ): Promise<IntegrationStatus> {
    const engagement = await consultingRepository.findEngagementById(tenantId, engagementId);
    if (!engagement) throw new NotFoundError("Engagement", engagementId);

    const eng = engagement as any;
    return {
      plane: {
        connected: !!eng.planeProjectId,
        projectId: eng.planeProjectId ?? null,
        projectUrl: eng.planeProjectId ? `https://app.plane.so/ironheart/projects/${eng.planeProjectId}` : null,
      },
      drive: {
        connected: !!eng.driveFolderId,
        folderId: eng.driveFolderId ?? null,
        folderUrl: eng.driveFolderId ? `https://drive.google.com/drive/folders/${eng.driveFolderId}` : null,
      },
    };
  },
};
