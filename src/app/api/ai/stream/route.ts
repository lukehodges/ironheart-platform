// src/app/api/ai/stream/route.ts

import { withAuth } from "@workos-inc/authkit-nextjs"
import { eq, and } from "drizzle-orm"
import { db } from "@/shared/db"
import { users, tenants } from "@/shared/db/schema"
import { getUserPermissions } from "@/modules/auth/rbac"
import { extractTenantSlugFromRequest } from "@/modules/auth/tenant"
import { aiService } from "@/modules/ai/ai.service"
import { logger } from "@/shared/logger"
import type { PageContext } from "@/modules/ai/ai.types"

const log = logger.child({ module: "api.ai.stream" })

export async function POST(req: Request) {
  // 1. Authenticate via WorkOS session cookie
  const authResult = await withAuth()
  if (!authResult.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 2. Resolve tenant
  const { slug: tenantSlug } = extractTenantSlugFromRequest(req)
  const resolvedSlug = tenantSlug ?? process.env.DEFAULT_TENANT_SLUG ?? "default"

  let tenantId = "default"
  if (resolvedSlug !== "default") {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, resolvedSlug),
      columns: { id: true },
    })
    if (!tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }
    tenantId = tenant.id
  }

  // 3. Load user with roles/permissions
  const dbUser = await db.query.users.findFirst({
    where: and(
      eq(users.workosUserId, authResult.user.id),
      eq(users.tenantId, tenantId)
    ),
    with: {
      userRoles: {
        with: {
          role: {
            with: {
              rolePermissions: {
                with: { permission: true },
              },
            },
          },
        },
      },
    },
  })

  if (!dbUser) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Reshape to UserWithRoles format
  const userWithRoles = {
    ...dbUser,
    roles: dbUser.userRoles.map((ur) => ({
      role: {
        ...ur.role,
        permissions: ur.role.rolePermissions.map((rp) => ({
          permission: rp.permission,
        })),
      },
    })),
  }

  const userPermissions = getUserPermissions(userWithRoles as Parameters<typeof getUserPermissions>[0])

  // 4. Parse request body
  let body: { conversationId?: string; message: string; pageContext?: PageContext }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!body.message || typeof body.message !== "string") {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 5. Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const eventStream = aiService.sendMessageStreaming(
          tenantId,
          dbUser.id,
          userPermissions,
          {
            conversationId: body.conversationId,
            message: body.message,
            pageContext: body.pageContext,
          }
        )

        for await (const event of eventStream) {
          const data = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(data))
        }
      } catch (err) {
        log.error({ err }, "SSE stream error")
        const errorEvent = `data: ${JSON.stringify({ type: "error", message: "Internal server error", recoverable: false })}\n\n`
        controller.enqueue(encoder.encode(errorEvent))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
