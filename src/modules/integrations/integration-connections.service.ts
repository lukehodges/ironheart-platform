// src/modules/integrations/integration-connections.service.ts
/**
 * Service layer over integrationConnectionsRepository.
 *
 * Adds validation, error handling, and the `runPull` helper that wires
 * provider.pull → cursor update / error recording. Used by both the admin
 * tRPC router and the background sync runner.
 */
import { logger } from "@/shared/logger"
import { BadRequestError, NotFoundError } from "@/shared/errors"
import { getProvider } from "./integrations.registry"
import {
  integrationConnectionsRepository,
  type CreateConnectionInput,
} from "./integration-connections.repository"
import type { IntegrationConnectionRow } from "@/shared/db/schemas/event-framework.schema"

const log = logger.child({ module: "integration-connections.service" })

export interface RunPullResult {
  connectionId: string
  ingested: number
  ok: boolean
  error?: string
}

export const integrationConnectionsService = {
  async createConnection(
    input: CreateConnectionInput,
  ): Promise<IntegrationConnectionRow> {
    if (!input.tenantId) throw new BadRequestError("tenantId is required")
    if (!input.providerSlug)
      throw new BadRequestError("providerSlug is required")
    if (!input.name) throw new BadRequestError("name is required")

    // Sanity-check that the provider exists in the in-process registry.
    const provider = getProvider(input.providerSlug)
    if (!provider) {
      throw new BadRequestError(`Unknown provider: ${input.providerSlug}`)
    }

    return integrationConnectionsRepository.createConnection(input)
  },

  async listConnections(
    tenantId: string,
    providerSlug?: string,
  ): Promise<IntegrationConnectionRow[]> {
    return integrationConnectionsRepository.listConnections({
      tenantId,
      providerSlug,
    })
  },

  async getConnection(
    connectionId: string,
    tenantId: string,
  ): Promise<IntegrationConnectionRow> {
    const row = await integrationConnectionsRepository.getConnection(
      connectionId,
      tenantId,
    )
    if (!row) throw new NotFoundError("Connection", connectionId)
    return row
  },

  async enable(connectionId: string, tenantId: string): Promise<void> {
    // Guarantee tenant ownership before mutating.
    await this.getConnection(connectionId, tenantId)
    await integrationConnectionsRepository.enable(connectionId, tenantId)
  },

  async disable(connectionId: string, tenantId: string): Promise<void> {
    await this.getConnection(connectionId, tenantId)
    await integrationConnectionsRepository.disable(connectionId, tenantId)
  },

  /**
   * Execute a pull-style sync for a single connection.
   *
   *   1. Load connection + provider
   *   2. Call provider.pull(ctx, cursor)
   *   3. On success → updateCursor with newCursor
   *   4. On error  → recordSyncError(stringified error)
   *
   * Does not throw — returns a result object so callers (cron, admin tools)
   * can decide what to do.
   */
  async runPull(connectionId: string): Promise<RunPullResult> {
    const connection =
      await integrationConnectionsRepository.getConnectionUnscoped(connectionId)
    if (!connection) {
      return {
        connectionId,
        ingested: 0,
        ok: false,
        error: "Connection not found",
      }
    }

    if (!connection.enabled) {
      return {
        connectionId,
        ingested: 0,
        ok: false,
        error: "Connection disabled",
      }
    }

    const provider = getProvider(connection.providerSlug)
    if (!provider) {
      const error = `No provider registered for slug: ${connection.providerSlug}`
      await integrationConnectionsRepository.recordSyncError(connectionId, error)
      return { connectionId, ingested: 0, ok: false, error }
    }

    if (typeof provider.pull !== "function") {
      const error = `Provider ${connection.providerSlug} does not support pull-style sync`
      await integrationConnectionsRepository.recordSyncError(connectionId, error)
      return { connectionId, ingested: 0, ok: false, error }
    }

    const ctx = {
      tenantId: connection.tenantId,
      userId: connection.userId ?? "",
      // For new-style connections this points at the integration_connections row.
      userIntegrationId: connection.id,
    }

    try {
      const result = await provider.pull(ctx, connection.syncCursor)
      await integrationConnectionsRepository.updateCursor(
        connectionId,
        (result.newCursor ?? {}) as Record<string, unknown>,
      )
      log.info(
        {
          connectionId,
          providerSlug: connection.providerSlug,
          ingested: result.ingested,
        },
        "Pull completed",
      )
      return { connectionId, ingested: result.ingested, ok: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      log.warn(
        { connectionId, providerSlug: connection.providerSlug, err },
        "Pull failed",
      )
      await integrationConnectionsRepository.recordSyncError(connectionId, error)
      return { connectionId, ingested: 0, ok: false, error }
    }
  },
}
