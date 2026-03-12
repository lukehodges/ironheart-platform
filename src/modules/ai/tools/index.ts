// src/modules/ai/tools/index.ts

import type Anthropic from "@anthropic-ai/sdk"
import { describeModuleTool } from "./describe-module.tool"
import { executeCodeTool } from "./execute-code.tool"

export { describeModuleTool, handleDescribeModule } from "./describe-module.tool"
export { executeCodeTool } from "./execute-code.tool"

/**
 * The two tools sent to Claude in every request.
 * Replaces the previous 25-tool array.
 */
export const agentTools: Anthropic.Tool[] = [
  describeModuleTool,
  executeCodeTool,
]
