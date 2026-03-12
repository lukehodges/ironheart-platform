// src/modules/ai/tools/describe-module.tool.ts

import type Anthropic from "@anthropic-ai/sdk"
import { getModuleMetadata } from "../ai.introspection"

export const describeModuleTool: Anthropic.Tool = {
  name: "describe_module",
  description:
    "Returns full input schemas for a module's procedures. " +
    "Only call this if the procedure index in the system prompt doesn't give you enough information to write your code. " +
    "Do NOT call this for the same module twice.",
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

export async function handleDescribeModule(input: { module: string }): Promise<{
  result: unknown
  durationMs: number
}> {
  const start = Date.now()
  const metadata = await getModuleMetadata(input.module)

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
