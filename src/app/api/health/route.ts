import { type NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/db'
import { redis } from '@/shared/redis'
import { sql } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/health        → lightweight DB ping - for load balancers
// GET /api/health?deep   → full check (DB + Redis) - for monitoring systems
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const deep = searchParams.has('deep')

  const dbStart = Date.now()
  try {
    await db.execute(sql`SELECT 1`)
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Database unreachable' },
      { status: 503 }
    )
  }
  const dbLatency = Date.now() - dbStart

  if (!deep) {
    return NextResponse.json({ status: 'healthy', db: { latencyMs: dbLatency } })
  }

  const redisStart = Date.now()
  try {
    await redis.ping()
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        checks: {
          database: { status: 'ok', latencyMs: dbLatency },
          redis: { status: 'unreachable' },
        },
      },
      { status: 207 }
    )
  }
  const redisLatency = Date.now() - redisStart

  return NextResponse.json({
    status: 'healthy',
    checks: {
      database: { status: 'ok', latencyMs: dbLatency },
      redis: { status: 'ok', latencyMs: redisLatency },
    },
    version: process.env['npm_package_version'] ?? 'unknown',
    uptime: process.uptime(),
  })
}
