// src/app/api/mcp/route.ts

import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/shared/logger"
import { mcpServerHandler } from "@/modules/ai/mcp/server"

const log = logger.child({ module: "api.mcp" })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const apiKey = req.headers.get("authorization")?.replace("Bearer ", "")

    if (!apiKey) {
      return NextResponse.json(
        { jsonrpc: "2.0", id: body.id ?? null, error: { code: -32600, message: "Missing API key" } },
        { status: 401 }
      )
    }

    const response = await mcpServerHandler(body, apiKey, req)
    return NextResponse.json(response)
  } catch (err) {
    log.error({ err }, "MCP server error")
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32603, message: "Internal server error" } },
      { status: 500 }
    )
  }
}
