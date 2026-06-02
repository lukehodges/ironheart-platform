/**
 * Import DO_NOT_CONTACT.csv → dnc_list, flag contacts + companies.
 *
 * Idempotent: unique (tenantId, email) on dnc_list. Re-running upserts
 * (skips existing rows by email match) and re-flips contact/company flags
 * (already true is a no-op).
 *
 * Usage:
 *   tsx scripts/import-dnc.ts
 *   tsx scripts/import-dnc.ts --tenant ironheart --file /path/to/DO_NOT_CONTACT.csv
 *   DRY_RUN=1 tsx scripts/import-dnc.ts
 */

import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { and, eq } from "drizzle-orm";
import {
  makeDb,
  parseFlags,
  resolveTenantId,
  domainFromEmail,
} from "./import-helpers";
import * as schema from "../src/shared/db/schema";
import { emitEvent } from "../src/modules/jobs/event-emitter";

const DEFAULT_FILE =
  "/Users/lukehodges/Documents/the-ironheart-ltd/Pipeline/Outreach/DO_NOT_CONTACT.csv";

interface DncRow {
  name: string;
  email: string;
  company: string;
  date_requested: string;
  channel: string;
  reason: string;
  notes: string;
}

interface Summary {
  dncCreated: number;
  dncAlreadyPresent: number;
  contactsFlagged: number;
  companiesFlagged: number;
  eventsEmitted: number;
  skipped: number;
  errors: number;
}

async function main() {
  const flags = parseFlags(process.argv);
  const file = flags.file ?? DEFAULT_FILE;
  const { client, db } = makeDb();

  try {
    const tenantId = await resolveTenantId(db, flags.tenant);
    console.log(
      `[import-dnc] tenant=${tenantId} file=${file} dryRun=${flags.dryRun}`,
    );

    const raw = fs.readFileSync(file, "utf-8");
    const rows: DncRow[] = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    const summary: Summary = {
      dncCreated: 0,
      dncAlreadyPresent: 0,
      contactsFlagged: 0,
      companiesFlagged: 0,
      eventsEmitted: 0,
      skipped: 0,
      errors: 0,
    };

    for (const row of rows) {
      const email = row.email?.trim().toLowerCase();
      if (!email) {
        summary.skipped += 1;
        continue;
      }
      const domain = domainFromEmail(email);
      const reason = row.reason || row.notes || null;

      try {
        // 1. dnc_list upsert
        const [existing] = await db
          .select({ id: schema.dncList.id })
          .from(schema.dncList)
          .where(
            and(
              eq(schema.dncList.tenantId, tenantId),
              eq(schema.dncList.email, email),
            ),
          )
          .limit(1);

        if (existing) {
          summary.dncAlreadyPresent += 1;
          console.log(`  · ${email} already on DNC (id=${existing.id})`);
        } else if (flags.dryRun) {
          summary.dncCreated += 1;
          console.log(`  [dry] INSERT dnc_list email=${email} reason=${reason}`);
        } else {
          await db.insert(schema.dncList).values({
            tenantId,
            email,
            domain,
            reason,
            addedBy: "import-dnc.ts",
          });
          summary.dncCreated += 1;
          console.log(`  ✓ DNC ${email}`);
        }

        // 2. flag contacts by email
        if (!flags.dryRun) {
          const flippedContacts = await db
            .update(schema.contacts)
            .set({ doNotContact: true, updatedAt: new Date() })
            .where(
              and(
                eq(schema.contacts.tenantId, tenantId),
                eq(schema.contacts.email, email),
              ),
            )
            .returning({ id: schema.contacts.id, companyId: schema.contacts.companyId });
          summary.contactsFlagged += flippedContacts.length;

          // 3. flag parent company (via contact link OR via domain match)
          const companyIds = new Set(flippedContacts.map((c) => c.companyId));
          for (const cid of companyIds) {
            const r = await db
              .update(schema.companies)
              .set({
                doNotContact: true,
                dncReason: reason,
                dncAt: new Date(),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(schema.companies.tenantId, tenantId),
                  eq(schema.companies.id, cid),
                ),
              )
              .returning({ id: schema.companies.id });
            summary.companiesFlagged += r.length;
          }

          // Also match by domain if no contact found above
          if (companyIds.size === 0 && domain) {
            const r = await db
              .update(schema.companies)
              .set({
                doNotContact: true,
                dncReason: reason,
                dncAt: new Date(),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(schema.companies.tenantId, tenantId),
                  eq(schema.companies.domain, domain),
                ),
              )
              .returning({ id: schema.companies.id });
            summary.companiesFlagged += r.length;
          }

          // 4. emit dnc.added event
          await emitEvent({
            tenantId,
            kind: "dnc.added",
            entityType: "dnc_list",
            payload: {
              email,
              domain,
              reason,
              name: row.name || null,
              company: row.company || null,
              channel: row.channel || null,
              dateRequested: row.date_requested || null,
              source: "import-dnc.ts",
            },
            actor: "import-dnc.ts",
          });
          summary.eventsEmitted += 1;
        } else {
          console.log(
            `  [dry] would flag contacts/companies matching email=${email} domain=${domain} + emit dnc.added`,
          );
        }
      } catch (err) {
        summary.errors += 1;
        console.error(`  ✗ error on ${email}:`, err);
      }
    }

    console.log("\n=== import-dnc summary ===");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
