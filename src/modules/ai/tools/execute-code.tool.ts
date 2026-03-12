// src/modules/ai/tools/execute-code.tool.ts

import type Anthropic from "@anthropic-ai/sdk"

export const executeCodeTool: Anthropic.Tool = {
  name: "execute_code",
  description:
    "Execute TypeScript code against the platform's tRPC API. " +
    "The code runs in an async context with `trpc` (pre-authenticated caller) and `ctx` (tenantId, userId, userPermissions, pageContext). " +
    "Use `return` to produce a result. Use `await` for all trpc calls. " +
    "Standard JS built-ins are available (Date, Math, JSON, Promise, Array methods). " +
    "Do NOT use require, import, fetch, or access globals beyond trpc and ctx.",
  input_schema: {
    type: "object" as const,
    properties: {
      code: {
        type: "string",
        description:
          "TypeScript code to execute. Must use `return` to produce a result. " +
          "Example: `const bookings = await trpc.booking.list({ limit: 10 }); return bookings;`",
      },
    },
    required: ["code"],
  },
}
