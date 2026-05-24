import { config } from "dotenv"
import { Redis } from "@upstash/redis"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  const sql = postgres(process.env.DATABASE_URL!)
  try {
    const tenants = await sql`SELECT id, slug FROM tenants WHERE "deletedAt" IS NULL`
    let busted = 0
    for (const t of tenants) {
      const key = `tenant:modules:${t.id}`
      await redis.del(key)
      console.log(`✓ busted ${key} (${t.slug})`)
      busted++
    }
    console.log(`\n${busted} cache keys cleared`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
