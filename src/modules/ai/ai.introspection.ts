// src/modules/ai/ai.introspection.ts

import { z } from "zod"
import { logger } from "@/shared/logger"
import { getDefaultGuardrailTier } from "./ai.guardrails"

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
async function getRouter() {
  // Dynamic import to avoid circular dependency:
  // ai.service.ts -> @/server/root -> @/modules/ai -> ai.service.ts
  const { appRouter } = await import("@/server/root")
  if (!appRouter) {
    throw new Error("appRouter is undefined — circular dependency may not be resolved yet")
  }
  return appRouter as { _def: { procedures: Record<string, unknown> } }
}

function extractInputSchema(procedure: unknown): Record<string, unknown> | null {
  try {
    const def = (procedure as { _def?: { inputs?: unknown[] } })?._def
    const inputs = def?.inputs
    if (!inputs || inputs.length === 0) return null

    // tRPC v11 stores input validators in _def.inputs array.
    // With middleware chains, the user-defined .input() schema may not be the last entry.
    // Try from last to first, returning the first valid Zod schema we find.
    for (let i = inputs.length - 1; i >= 0; i--) {
      const candidate = inputs[i]
      if (candidate && typeof candidate === "object" && "_zod" in (candidate as Record<string, unknown>)) {
        try {
          const jsonSchema = z.toJSONSchema(candidate as z.ZodType) as Record<string, unknown>
          // Remove $schema key to save tokens
          delete jsonSchema["$schema"]
          // Skip trivially empty schemas (middleware placeholders)
          const props = jsonSchema.properties as Record<string, unknown> | undefined
          if (props && Object.keys(props).length > 0) {
            return jsonSchema
          }
        } catch {
          // This entry failed conversion, try next
          continue
        }
      }
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
export async function getModuleMap(): Promise<Map<string, ModuleMetadata>> {
  if (cachedModules) return cachedModules

  const appRouter = await getRouter()
  const procedures = appRouter._def.procedures
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
 * Map JSON Schema type+format to a compact type hint.
 */
function compactType(prop: Record<string, unknown>): string {
  const type = prop.type as string | undefined
  const format = prop.format as string | undefined
  const enumValues = prop.enum as string[] | undefined

  if (enumValues) return enumValues.map((v) => `"${v}"`).join("|")
  if (format === "uuid") return "uuid"
  if (format === "email") return "email"
  if (format === "date" || format === "date-time" || type === "string" && prop.pattern === "date") return "Date"
  if (type === "number" || type === "integer") return "number"
  if (type === "boolean") return "boolean"
  if (type === "object") return "object"
  if (type === "array") return "array"
  return ""
}

/**
 * Summarise a JSON Schema input into a compact one-liner like "{ limit?, offset?, status? }".
 * For mutations, includes type hints for non-obvious fields.
 */
function summariseInput(schema: Record<string, unknown> | null, includeTypes = false): string {
  if (!schema) return "()"
  const props = schema.properties as Record<string, Record<string, unknown>> | undefined
  if (!props || Object.keys(props).length === 0) return "()"

  const required = new Set((schema.required as string[]) ?? [])
  const parts = Object.keys(props).map((k) => {
    const suffix = required.has(k) ? "" : "?"
    if (includeTypes) {
      const hint = compactType(props[k])
      return hint ? `${k}${suffix}: ${hint}` : `${k}${suffix}`
    }
    return `${k}${suffix}`
  })
  return `({ ${parts.join(", ")} })`
}

/**
 * Get the compact module index for the system prompt.
 * Shows query procedures with compact input signatures so the model
 * can often call execute_code directly without describe_module.
 */
export async function getModuleIndex(): Promise<string> {
  if (cachedIndex) return cachedIndex

  const moduleMap = await getModuleMap()
  const lines: string[] = ["Available query procedures (use describe_module for full input schemas if needed):"]

  for (const [moduleName, meta] of moduleMap) {
    const queryProcs = meta.procedures.filter((p) => p.type === "query")
    if (queryProcs.length === 0) continue

    lines.push(`\n  ${moduleName}:`)
    for (const proc of queryProcs) {
      lines.push(`    .${proc.name}${summariseInput(proc.inputSchema)}`)
    }
  }

  // Mutation procedures with guardrail tier annotations and type hints
  const mutationLines: string[] = []
  for (const [moduleName, meta] of moduleMap) {
    const mutationProcs = meta.procedures.filter((p) => p.type === "mutation")
    if (mutationProcs.length === 0) continue

    mutationLines.push(`\n  ${moduleName}:`)
    for (const proc of mutationProcs) {
      const tier = getDefaultGuardrailTier(`${moduleName}.${proc.name}`)
      mutationLines.push(`    .${proc.name}${summariseInput(proc.inputSchema, true)} [${tier}]`)
    }
  }

  if (mutationLines.length > 0) {
    lines.push("")
    lines.push("Available mutation procedures (guardrail tier shown — use describe_module before calling any CONFIRM mutation):")
    lines.push("  AUTO = executes immediately | CONFIRM = requires user approval | RESTRICT = blocked")
    lines.push(...mutationLines)
  }

  cachedIndex = lines.join("\n")
  return cachedIndex
}

/**
 * Get full procedure metadata for a specific module.
 * Returns null if module not found.
 */
export async function getModuleMetadata(moduleName: string): Promise<ModuleMetadata | null> {
  const moduleMap = await getModuleMap()
  return moduleMap.get(moduleName) ?? null
}

/**
 * Reset the cache (useful for testing).
 */
export function resetIntrospectionCache(): void {
  cachedModules = null
  cachedIndex = null
}
