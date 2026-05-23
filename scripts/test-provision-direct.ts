import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

// Direct call bypassing Inngest — for testing
async function main() {
  const engagementId = process.env.ENGAGEMENT_ID ?? "c950c06a-1b41-4f46-9c89-660845d96bee"

  console.log(`Provisioning tenant for engagement ${engagementId}...`)

  const { provisioningService } = await import("@/modules/consulting/provisioning.service")
  const result = await provisioningService.provisionClientTenant(engagementId)

  console.log("\n✓ Provisioning complete")
  console.log(JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error("✗ Provisioning failed:")
  console.error(err)
  if (err.cause) console.error("Cause:", err.cause)
  process.exit(1)
})
