/** Throwaway: prove mintApiKey / validateApiKey against the dev DB, then clean up. */
import { mintApiKey, validateApiKey, hashKey } from "@/modules/developer/lib/api-keys"
import { db } from "@/shared/db"
import { apiKeys } from "@/shared/db/schemas/auth.schema"
import { eq } from "drizzle-orm"

const T = process.env.TENANT_ID ?? "d3c13008-2826-4111-b546-b383e8e9df77"
let failed = false
const check = (c: boolean, m: string) => { console.log(`${c ? "✅" : "❌ FAIL:"} ${m}`); if (!c) failed = true }

async function main() {
  const { id, token, keyPrefix } = await mintApiKey({ tenantId: T, name: "verify test", scopes: ["outreach"], rateLimit: 300 })
  check(token.startsWith("ihk_"), "minted token has ihk_ prefix")
  check(keyPrefix.length === 12, "keyPrefix is 12 chars")

  const v = await validateApiKey(token)
  check(v?.tenantId === T, "validate returns correct tenantId")
  check(!!v && v.scopes.includes("outreach"), "validate returns outreach scope")
  check(v?.rateLimit === 300, "validate returns rateLimit")

  check((await validateApiKey("ihk_deadbeef")) === null, "unknown key → null")
  check((await validateApiKey("not-a-key")) === null, "non-ihk key → null")

  // raw token is NOT stored — only the hash
  const [row] = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1)
  check(row?.keyHash === hashKey(token) && row?.keyHash !== token, "only the SHA-256 hash is stored, not the token")

  await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, id))
  check((await validateApiKey(token)) === null, "revoked key → null")

  await db.delete(apiKeys).where(eq(apiKeys.id, id))
  console.log(failed ? "\n❌ SOME CHECKS FAILED" : "\n✅ ALL CHECKS PASSED")
  process.exit(failed ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
