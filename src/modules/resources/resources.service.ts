import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
import { resourceRepository } from "./resources.repository";
import type { CreateResourceInput, UpdateResourceInput, ListAvailableInput, ResourceType } from "./resources.types";

const log = logger.child({ module: "resources.service" });

export const resourceService = {

  async create(tenantId: string, input: CreateResourceInput) {
    const resource = await resourceRepository.create(tenantId, input);
    log.info({ tenantId, resourceId: resource.id }, "Resource created via service");
    return resource;
  },

  async update(tenantId: string, resourceId: string, input: UpdateResourceInput) {
    const existing = await resourceRepository.findById(tenantId, resourceId);
    if (!existing) throw new NotFoundError("Resource", resourceId);

    const updated = await resourceRepository.update(tenantId, resourceId, input);
    log.info({ tenantId, resourceId }, "Resource updated via service");
    return updated;
  },

  async getById(tenantId: string, resourceId: string) {
    const resource = await resourceRepository.findById(tenantId, resourceId);
    if (!resource) throw new NotFoundError("Resource", resourceId);
    return resource;
  },

  async list(
    tenantId: string,
    filters: { type?: ResourceType; isActive?: boolean; limit?: number; cursor?: string }
  ) {
    return resourceRepository.list(tenantId, filters);
  },

  async delete(tenantId: string, resourceId: string) {
    const existing = await resourceRepository.findById(tenantId, resourceId);
    if (!existing) throw new NotFoundError("Resource", resourceId);

    await resourceRepository.delete(tenantId, resourceId);
    log.info({ tenantId, resourceId }, "Resource deleted via service");
  },

  async listAvailable(tenantId: string, input: ListAvailableInput) {
    return resourceRepository.listAvailable(tenantId, input);
  },
};
