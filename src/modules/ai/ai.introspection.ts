// src/modules/ai/ai.introspection.ts

import { z } from "zod"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "ai.introspection" })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcedureMetadata {
  name: string
  type: "query" | "mutation"
  inputSchema: Record<string, unknown> | null
}

export interface ModuleMetadata {
  module: string
  procedures: ProcedureMetadata[]
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let cachedModules: Map<string, ModuleMetadata> | null = null
let cachedIndex: string | null = null

// ---------------------------------------------------------------------------
// Introspection
// ---------------------------------------------------------------------------

/**
 * tRPC v11 stores a flattened `procedures` map in `appRouter._def.procedures`
 * with dot-separated keys like "booking.list", "booking.getById", etc.
 * Each value is a function (procedure) with a `_def` containing `type` and `inputs`.
 *
 * This is far simpler than walking the nested `record` tree — we just iterate
 * the flattened map and group by the first path segment (module name).
 */
function getRouter() {
  // Lazy import to avoid circular dependency:
  // ai.service.ts -> @/server/root -> @/modules/ai -> ai.service.ts
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { appRouter } = require("@/server/root") as { appRouter: { _def: { procedures: Record<string, unknown> } } }
  return appRouter
}

function extractInputSchema(procedure: unknown): Record<string, unknown> | null {
  try {
    const def = (procedure as { _def?: { inputs?: unknown[] } })?._def
    const inputs = def?.inputs
    if (!inputs || inputs.length === 0) return null

    // tRPC v11 stores input validators in _def.inputs array.
    // The last entry is typically the user-defined .input() schema.
    const zodSchema = inputs[inputs.length - 1]
    if (zodSchema && typeof zodSchema === "object" && "_zod" in (zodSchema as Record<string, unknown>)) {
      const jsonSchema = z.toJSONSchema(zodSchema as z.ZodType) as Record<string, unknown>
      // Remove $schema key to save tokens
      delete jsonSchema["$schema"]
      return jsonSchema
    }
    return null
  } catch (err) {
    log.warn({ err }, "Failed to convert input schema to JSON Schema")
    return null
  }
}

/**
 * Build the module metadata map from appRouter._def.procedures.
 * Called once, cached thereafter.
 */
export function getModuleMap(): Map<string, ModuleMetadata> {
  if (cachedModules) return cachedModules

  const appRouter = getRouter()
  const procedures = (appRouter._def as { procedures: Record<string, unknown> }).procedures
  const moduleMap = new Map<string, ModuleMetadata>()

  for (const [path, procedure] of Object.entries(procedures)) {
    // path is like "booking.list" or "booking.approval.getPendingBookings"
    const segments = path.split(".")
    const moduleName = segments[0]
    const procedureName = segments.slice(1).join(".")

    if (!moduleName || !procedureName) continue

    const def = (procedure as { _def?: { type?: string } })?._def
    const type = def?.type
    if (type !== "query" && type !== "mutation") continue

    if (!moduleMap.has(moduleName)) {
      moduleMap.set(moduleName, { module: moduleName, procedures: [] })
    }

    moduleMap.get(moduleName)!.procedures.push({
      name: procedureName,
      type: type as "query" | "mutation",
      inputSchema: extractInputSchema(procedure),
    })
  }

  cachedModules = moduleMap
  log.info(
    { moduleCount: moduleMap.size, totalProcedures: Array.from(moduleMap.values()).reduce((sum, m) => sum + m.procedures.length, 0) },
    "Router introspection complete"
  )
  return moduleMap
}

/**
 * Get the compact module index for the system prompt.
 * Lists only query procedure names grouped by module.
 */
export function getModuleIndex(): string {
  if (cachedIndex) return cachedIndex

  const moduleMap = getModuleMap()
  const lines: string[] = ["Available modules (use describe_module to see input schemas):"]

  for (const [moduleName, meta] of moduleMap) {
    const queryProcs = meta.procedures
      .filter((p) => p.type === "query")
      .map((p) => p.name)

    if (queryProcs.length > 0) {
      lines.push(`  ${moduleName}: ${queryProcs.join(", ")}`)
    }
  }

  cachedIndex = lines.join("\n")
  return cachedIndex
}

/**
 * Get full procedure metadata for a specific module.
 * Returns null if module not found.
 */
export function getModuleMetadata(moduleName: string): ModuleMetadata | null {
  const moduleMap = getModuleMap()
  return moduleMap.get(moduleName) ?? null
}

/**
 * Reset the cache (useful for testing).
 */
export function resetIntrospectionCache(): void {
  cachedModules = null
  cachedIndex = null
}
