import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

const NEW_EMAIL = "luke.hodges.dev@gmail.com"
const OLD_INVITATION_ID = "invitation_01KSB4A52MXN3WY1K5XMRHWP9H"
const WORKOS_ORG_ID = "org_01KSB4A2R0A0EH1GBD7220K1DM"
const CUSTOMER_ID = "2df614b1-2d97-4ba8-989a-499eee81883e"
const TENANT_ID = "bb749224-5ca0-4751-ab36-891eb8bcbd28"

async function main() {
  const url = process.env.DATABASE_URL!
  const sql = postgres(url)

  try {
    console.log("=== Step 1: Revoke old invitation ===")
    const { revokeInvitation, sendInvitation } = await import("@/shared/workos")
    try {
      await revokeInvitation({ invitationId: OLD_INVITATION_ID })
      console.log(`✓ Revoked ${OLD_INVITATION_ID}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.log(`⚠ Revoke failed (probably already accepted/revoked): ${message}`)
    }

    console.log("\n=== Step 2: Update customer email in DB ===")
    await sql`UPDATE customers SET email = ${NEW_EMAIL}, "updatedAt" = NOW() WHERE id = ${CUSTOMER_ID}`
    console.log(`✓ customers.email → ${NEW_EMAIL}`)

    console.log("\n=== Step 3: Send fresh WorkOS invitation ===")
    const invitation = await sendInvitation({
      email: NEW_EMAIL,
      organizationId: WORKOS_ORG_ID,
      roleSlug: "admin",
    })
    console.log(`✓ New invitation ID: ${invitation.id}`)
    console.log(`  Email: ${invitation.email}`)
    console.log(`  Expires: ${invitation.expiresAt}`)
    console.log(`  State: ${invitation.state}`)

    console.log("\n=== Step 4: Confirm tenant + engagement still intact ===")
    const tenant = await sql`SELECT id, slug, name, "workosOrgId" FROM tenants WHERE id = ${TENANT_ID}`
    console.log("Tenant:", tenant[0])
    const customer = await sql`SELECT id, "firstName", "lastName", email FROM customers WHERE id = ${CUSTOMER_ID}`
    console.log("Customer:", customer[0])
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error("✗ Failed:", err)
  if (err.cause) console.error("Cause:", err.cause)
  process.exit(1)
})
