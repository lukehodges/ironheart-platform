// src/modules/ai/tools/describe-module.tool.ts

import type Anthropic from "@anthropic-ai/sdk"
import { getModuleMetadata } from "../ai.introspection"

export const describeModuleTool: Anthropic.Tool = {
  name: "describe_module",
  description:
    "Get input schemas for a module's procedures. " +
    "Call BEFORE any unfamiliar mutation. Do NOT call twice for the same module.",
  input_schema: {
    type: "object" as const,
    properties: {
      module: {
        type: "string",
        description: "Module name from the procedure index (e.g., 'booking', 'customer').",
      },
    },
    required: ["module"],
  },
}

export async function handleDescribeModule(input: { module: string }): Promise<{
  result: unknown
  durationMs: number
}> {
  const start = Date.now()
  const metadata = await getModuleMetadata(input.module)

  if (!metadata) {
    return {
      result: { error: `Module "${input.module}" not found. Check the procedure index.` },
      durationMs: Date.now() - start,
    }
  }

  return {
    result: metadata,
    durationMs: Date.now() - start,
  }
}
