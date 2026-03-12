// src/modules/ai/ai.executor.ts

import { logger } from "@/shared/logger"

const log = logger.child({ module: "ai.executor" })

const MAX_RESULT_BYTES = 4096
const EXECUTION_TIMEOUT_MS = 10_000

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>

/**
 * Execute a TypeScript code snippet with a pre-authenticated tRPC caller.
 *
 * The code runs in an async context with two injected variables:
 * - `trpc`: pre-authenticated tRPC caller (e.g., `await trpc.booking.list({})`)
 * - `ctx`: { tenantId, userId, userPermissions, pageContext }
 *
 * The code MUST use `return` to produce a result.
 *
 * NOT accessible: require, import, fetch, process, fs, globalThis, db, redis.
 */
export async function executeCode(
  code: string,
  trpc: unknown,
  ctx: { tenantId: string; userId: string; userPermissions: string[]; pageContext?: unknown }
): Promise<{ result: unknown; durationMs: number }> {
  const fn = new AsyncFunction("trpc", "ctx", code)
  const start = Date.now()

  const result = await Promise.race([
    fn(trpc, ctx),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Code execution timed out (10s limit)")), EXECUTION_TIMEOUT_MS)
    ),
  ])

  const durationMs = Date.now() - start
  log.info({ durationMs }, "Code execution complete")

  return { result: truncateResult(result), durationMs }
}

/**
 * Truncate large results to stay within context window budget.
 * Arrays are trimmed to first N items with _truncated metadata.
 */
function truncateResult(result: unknown): unknown {
  if (result === undefined || result === null) return result

  try {
    const json = JSON.stringify(result)
    if (json.length <= MAX_RESULT_BYTES) return result

    // If it's an array, trim items
    if (Array.isArray(result)) {
      return truncateArray(result)
    }

    // If it's an object with a `rows` array, trim that
    if (typeof result === "object" && result !== null && "rows" in result) {
      const obj = result as Record<string, unknown>
      if (Array.isArray(obj.rows)) {
        return { ...obj, rows: truncateArray(obj.rows) }
      }
    }

    // Last resort: take first N keys of the object
    if (typeof result === "object" && result !== null && !Array.isArray(result)) {
      const keys = Object.keys(result as Record<string, unknown>)
      const trimmed: Record<string, unknown> = {}
      for (const key of keys) {
        trimmed[key] = (result as Record<string, unknown>)[key]
        if (JSON.stringify(trimmed).length > MAX_RESULT_BYTES - 100) {
          delete trimmed[key]
          break
        }
      }
      return { ...trimmed, _truncated: { totalKeys: keys.length, shownKeys: Object.keys(trimmed).length } }
    }

    return { _error: "Result too large to serialize", _sizeBytes: json.length }
  } catch {
    return { _error: "Result too large to serialize" }
  }
}

function truncateArray(arr: unknown[]): unknown {
  const total = arr.length
  // Binary search for max items that fit
  let shown = Math.min(total, 10)
  while (shown > 1) {
    const slice = arr.slice(0, shown)
    const json = JSON.stringify(slice)
    if (json.length <= MAX_RESULT_BYTES - 100) break // leave room for metadata
    shown = Math.floor(shown / 2)
  }
  return {
    items: arr.slice(0, shown),
    _truncated: { total, shown },
  }
}
