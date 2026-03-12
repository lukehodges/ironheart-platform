// src/modules/ai/mcp/repository.ts

import { db } from "@/shared/db"
import { aiMcpConnections } from "@/shared/db/schema"
import { eq, and } from "drizzle-orm"
import { logger } from "@/shared/logger"
import type { MCPConnectionRecord, MCPToolDefinition } from "./types"

const log = logger.child({ module: "ai.mcp.repository" })

function mapConnection(row: typeof aiMcpConnections.$inferSelect): MCPConnectionRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    serverUrl: row.serverUrl,
    authType: row.authType as MCPConnectionRecord["authType"],
    authCredential: row.authCredential,
    cachedTools: row.cachedTools as MCPToolDefinition[] | null,
    toolsRefreshedAt: row.toolsRefreshedAt,
    defaultGuardrailTier: row.defaultGuardrailTier as MCPConnectionRecord["defaultGuardrailTier"],
    toolGuardrailOverrides: (row.toolGuardrailOverrides as Record<string, "AUTO" | "CONFIRM" | "RESTRICT">) ?? {},
    healthStatus: row.healthStatus as MCPConnectionRecord["healthStatus"],
    lastHealthCheck: row.lastHealthCheck,
    isEnabled: row.isEnabled === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const mcpConnectionRepository = {
  async create(data: {
    tenantId: string
    name: string
    description?: string
    serverUrl: string
    authType: string
    authCredential?: string
  }): Promise<MCPConnectionRecord> {
    const [row] = await db
      .insert(aiMcpConnections)
      .values({
        tenantId: data.tenantId,
        name: data.name,
        description: data.description ?? null,
        serverUrl: data.serverUrl,
        authType: data.authType,
        authCredential: data.authCredential ?? null,
      })
      .returning()
    log.info({ connectionId: row!.id, tenantId: data.tenantId }, "MCP connection created")
    return mapConnection(row!)
  },

  async getById(tenantId: string, id: string): Promise<MCPConnectionRecord | null> {
    const [row] = await db
      .select()
      .from(aiMcpConnections)
      .where(and(eq(aiMcpConnections.id, id), eq(aiMcpConnections.tenantId, tenantId)))
      .limit(1)
    return row ? mapConnection(row) : null
  },

  async listByTenant(tenantId: string): Promise<MCPConnectionRecord[]> {
    const rows = await db
      .select()
      .from(aiMcpConnections)
      .where(eq(aiMcpConnections.tenantId, tenantId))
    return rows.map(mapConnection)
  },

  async listEnabled(tenantId: string): Promise<MCPConnectionRecord[]> {
    const rows = await db
      .select()
      .from(aiMcpConnections)
      .where(and(eq(aiMcpConnections.tenantId, tenantId), eq(aiMcpConnections.isEnabled, 1)))
    return rows.map(mapConnection)
  },

  async updateCachedTools(id: string, tools: MCPToolDefinition[]): Promise<void> {
    await db
      .update(aiMcpConnections)
      .set({
        cachedTools: tools,
        toolsRefreshedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiMcpConnections.id, id))
  },

  async updateHealth(id: string, status: "healthy" | "degraded" | "unreachable"): Promise<void> {
    await db
      .update(aiMcpConnections)
      .set({
        healthStatus: status,
        lastHealthCheck: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiMcpConnections.id, id))
  },

  async update(id: string, tenantId: string, data: {
    name?: string
    description?: string
    serverUrl?: string
    authType?: string
    authCredential?: string
    isEnabled?: number
    defaultGuardrailTier?: string
    toolGuardrailOverrides?: Record<string, string>
  }): Promise<void> {
    await db
      .update(aiMcpConnections)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(aiMcpConnections.id, id), eq(aiMcpConnections.tenantId, tenantId)))
  },

  async delete(id: string, tenantId: string): Promise<void> {
    await db
      .delete(aiMcpConnections)
      .where(and(eq(aiMcpConnections.id, id), eq(aiMcpConnections.tenantId, tenantId)))
    log.info({ connectionId: id }, "MCP connection deleted")
  },
}
