// src/modules/ai/tools/describe-module.tool.ts

import type Anthropic from "@anthropic-ai/sdk"
import { getModuleMetadata } from "../ai.introspection"

export const describeModuleTool: Anthropic.Tool = {
  name: "describe_module",
  description:
    "Returns procedure names, types (query/mutation), and input schemas for a given module. " +
    "Call this before writing execute_code to learn available procedures and their expected inputs.",
  input_schema: {
    type: "object" as const,
    properties: {
      module: {
        type: "string",
        description: "The module name from the module index (e.g., 'booking', 'customer', 'analytics').",
      },
    },
    required: ["module"],
  },
}

export function handleDescribeModule(input: { module: string }): {
  result: unknown
  durationMs: number
} {
  const start = Date.now()
  const metadata = getModuleMetadata(input.module)

  if (!metadata) {
    return {
      result: { error: `Module "${input.module}" not found. Check the module index in the system prompt.` },
      durationMs: Date.now() - start,
    }
  }

  return {
    result: metadata,
    durationMs: Date.now() - start,
  }
}
