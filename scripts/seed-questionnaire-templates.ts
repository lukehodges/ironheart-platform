import { config } from "dotenv"
import postgres from "postgres"
import { randomUUID } from "crypto"
import { QUESTIONNAIRE_SEEDS } from "../src/modules/forms/seeds"

config({ path: ".env.local" })
config({ path: ".env" })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")

  const tenantId = process.env.IRONHEART_TENANT_ID
  if (!tenantId) throw new Error("IRONHEART_TENANT_ID not set")

  const sql = postgres(url)

  try {
    let created = 0
    let updated = 0

    for (const seed of QUESTIONNAIRE_SEEDS) {
      // Look up by tenantId + slug (slug column added by apply-form-template-slug.ts)
      const existing = await sql`
        SELECT id FROM form_templates
        WHERE "tenantId" = ${tenantId}
          AND slug = ${seed.slug}
        LIMIT 1
      `

      // postgres driver needs the jsonb passed as sql.json() to avoid double-encoding
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fieldsJson = sql.json(seed.fields as any)

      if (existing.length === 0) {
        await sql`
          INSERT INTO form_templates (
            id,
            "tenantId",
            slug,
            name,
            description,
            fields,
            active,
            "completionRequired",
            "allowGuestAccess",
            "isPublic",
            "sortOrder",
            "sendTiming",
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${randomUUID()},
            ${tenantId},
            ${seed.slug},
            ${seed.name},
            ${seed.description},
            ${fieldsJson},
            true,
            false,
            false,
            false,
            0,
            'MANUAL',
            NOW(),
            NOW()
          )
        `
        created++
        console.log(`✓ Created: ${seed.name} (${seed.slug})`)
      } else {
        await sql`
          UPDATE form_templates
          SET
            name        = ${seed.name},
            description = ${seed.description},
            fields      = ${fieldsJson},
            "updatedAt" = NOW()
          WHERE id = ${existing[0].id}
        `
        updated++
        console.log(`↻ Updated: ${seed.name} (${seed.slug})`)
      }
    }

    console.log(`\nDone — ${created} created, ${updated} updated`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
