/**
 * Mint a production MCP API key for a tenant. Prints the raw token ONCE — it is
 * only stored hashed, so copy it immediately.
 *
 *   DATABASE_URL=... TENANT_ID=<uuid> \
 *   npx tsx --tsconfig tsconfig.json scripts/mint-api-key.ts \
 *     --name "Alex — outreach" --scopes outreach [--rate 600] [--expires 2027-01-01]
 *
 * --scopes is a comma-separated list of module names the key may call (e.g.
 * "outreach" or "outreach,ai"); use "*" for full access.
 */
import { mintApiKey } from "@/modules/developer/lib/api-keys"
import { db } from "@/shared/db"
import { tenants } from "@/shared/db/schema"
import { eq } from "drizzle-orm"

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const TENANT_ID = process.env.TENANT_ID
  if (!TENANT_ID) throw new Error("TENANT_ID env is required")
  const name = arg("--name") ?? "MCP key"
  const scopes = (arg("--scopes") ?? "outreach").split(",").map((s) => s.trim()).filter(Boolean)
  const rateLimit = arg("--rate") ? Number(arg("--rate")) : undefined
  const expiresAt = arg("--expires") ?? null

  const [t] = await db.select().from(tenants).where(eq(tenants.id, TENANT_ID)).limit(1)
  if (!t) throw new Error(`Tenant ${TENANT_ID} not found`)

  const { id, token, keyPrefix } = await mintApiKey({ tenantId: TENANT_ID, name, scopes, rateLimit, expiresAt })

  console.log("\n✅ API key minted — copy the token now, it will not be shown again:\n")
  console.log("  tenant :", t.name, `(${TENANT_ID})`)
  console.log("  name   :", name)
  console.log("  scopes :", scopes.join(", "))
  console.log("  prefix :", keyPrefix)
  console.log("  id     :", id)
  console.log("\n  TOKEN  :", token, "\n")
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
