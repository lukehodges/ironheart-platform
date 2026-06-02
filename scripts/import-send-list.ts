/**
 * Import SEND_LIST.csv → companies + contacts + touches.
 *
 * For each row:
 *   - status === 'skip'   → skipped entirely
 *   - status === 'sent'   → upsert company/contact, insert touch (delivery_status='sent', sent_at=sent_date)
 *   - status === 'draft'  → upsert company/contact, insert touch (delivery_status='queued')
 *   - status === 'pending'→ upsert company/contact, no touch
 *
 * The `reason` column is Claude's per-lead personalisation observation about
 * how that business runs (e.g. "Founder-led material innovation startup..."),
 * not the email body itself.
 *
 * Storage location for reason:
 *   - When a touch row exists (sent/draft): touches.bodyRendered is set to
 *     `[OBSERVATION-ONLY] <reason>` so the observation is reachable from the
 *     touch timeline. (There is no metadata jsonb column on touches.)
 *   - When no touch row exists (pending): the reason is appended to
 *     companies.notes prefixed with `[OBSERVATION] <email>: <reason>`.
 *
 * Idempotent:
 *   - companies upsert by (tenantId, domain)
 *   - contacts upsert by (tenantId, email)
 *   - touches dedup by (tenantId, contactId, sentAt) — re-running will not
 *     insert a second touch with the same sent_date for the same contact.
 *
 * Usage:
 *   tsx scripts/import-send-list.ts
 *   tsx scripts/import-send-list.ts --tenant ironheart --file /path/to/SEND_LIST.csv
 *   DRY_RUN=1 tsx scripts/import-send-list.ts
 */

import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { and, eq, sql as drizzleSql } from "drizzle-orm";
import {
  makeDb,
  parseFlags,
  resolveTenantId,
  domainFromEmail,
  companyNameFromDomain,
} from "./import-helpers";
import * as schema from "../src/shared/db/schema";

const DEFAULT_FILE =
  "/Users/lukehodges/Documents/the-ironheart-ltd/Pipeline/Outreach/SEND_LIST.csv";

interface SendListRow {
  idx: string;
  source_file: string;
  name: string;
  to_email: string;
  status: string;
  sent_date: string;
  reason: string;
  notes: string;
}

interface Summary {
  rowsRead: number;
  companiesCreated: number;
  companiesUpdated: number;
  contactsCreated: number;
  contactsUpdated: number;
  touchesCreated: number;
  touchesAlreadyPresent: number;
  skippedStatus: number;
  skippedNoEmail: number;
  errors: number;
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const flags = parseFlags(process.argv);
  const file = flags.file ?? DEFAULT_FILE;
  const { client, db } = makeDb();

  try {
    const tenantId = await resolveTenantId(db, flags.tenant);
    console.log(
      `[import-send-list] tenant=${tenantId} file=${file} dryRun=${flags.dryRun}`,
    );

    const raw = fs.readFileSync(file, "utf-8");
    const rows: SendListRow[] = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_quotes: true,
      relax_column_count: true,
    });

    const summary: Summary = {
      rowsRead: rows.length,
      companiesCreated: 0,
      companiesUpdated: 0,
      contactsCreated: 0,
      contactsUpdated: 0,
      touchesCreated: 0,
      touchesAlreadyPresent: 0,
      skippedStatus: 0,
      skippedNoEmail: 0,
      errors: 0,
    };

    for (const row of rows) {
      const status = (row.status || "").trim().toLowerCase();
      if (status === "skip") {
        summary.skippedStatus += 1;
        continue;
      }

      const email = (row.to_email || "").trim().toLowerCase();
      if (!email) {
        summary.skippedNoEmail += 1;
        continue;
      }

      const domain = domainFromEmail(email);
      const reason = (row.reason || "").trim() || null;
      const sentDate = parseDate(row.sent_date);

      try {
        // -------- COMPANY UPSERT --------
        let companyId: string | undefined;
        if (domain) {
          const [existing] = await db
            .select({
              id: schema.companies.id,
              notes: schema.companies.notes,
            })
            .from(schema.companies)
            .where(
              and(
                eq(schema.companies.tenantId, tenantId),
                eq(schema.companies.domain, domain),
              ),
            )
            .limit(1);

          if (existing) {
            companyId = existing.id;
            // If this is a pending row and we have a reason, append observation to notes
            if (status === "pending" && reason) {
              const tag = `[OBSERVATION] ${email}: ${reason}`;
              if (!existing.notes || !existing.notes.includes(tag)) {
                const newNotes = existing.notes
                  ? `${existing.notes}\n${tag}`
                  : tag;
                if (!flags.dryRun) {
                  await db
                    .update(schema.companies)
                    .set({ notes: newNotes, updatedAt: new Date() })
                    .where(eq(schema.companies.id, companyId));
                }
              }
            }
            summary.companiesUpdated += 1;
          } else {
            const name = companyNameFromDomain(domain);
            const notes =
              status === "pending" && reason
                ? `[OBSERVATION] ${email}: ${reason}`
                : null;
            if (flags.dryRun) {
              companyId = "00000000-0000-0000-0000-000000000000";
              console.log(
                `  [dry] INSERT company domain=${domain} name=${name}`,
              );
            } else {
              const [ins] = await db
                .insert(schema.companies)
                .values({
                  tenantId,
                  name,
                  domain,
                  source: "cold",
                  notes,
                })
                .returning({ id: schema.companies.id });
              companyId = ins!.id;
            }
            summary.companiesCreated += 1;
          }
        }

        // Without a domain (no @) we can't link to a company. Skip.
        if (!companyId) {
          console.warn(`  ! no domain for ${email}, skipping`);
          summary.errors += 1;
          continue;
        }

        // -------- CONTACT UPSERT --------
        const fullName = (row.name || "").trim() || email.split("@")[0] || email;

        const [existingContact] = await db
          .select({ id: schema.contacts.id })
          .from(schema.contacts)
          .where(
            and(
              eq(schema.contacts.tenantId, tenantId),
              eq(schema.contacts.email, email),
            ),
          )
          .limit(1);

        let contactId: string;
        if (existingContact) {
          contactId = existingContact.id;
          if (!flags.dryRun) {
            await db
              .update(schema.contacts)
              .set({
                companyId,
                fullName,
                updatedAt: new Date(),
              })
              .where(eq(schema.contacts.id, contactId));
          }
          summary.contactsUpdated += 1;
        } else if (flags.dryRun) {
          contactId = "00000000-0000-0000-0000-000000000000";
          console.log(`  [dry] INSERT contact email=${email} name=${fullName}`);
          summary.contactsCreated += 1;
        } else {
          const [ins] = await db
            .insert(schema.contacts)
            .values({
              tenantId,
              companyId,
              fullName,
              email,
            })
            .returning({ id: schema.contacts.id });
          contactId = ins!.id;
          summary.contactsCreated += 1;
        }

        // -------- TOUCH --------
        // Treat 'off-list-sent' (the Enrico row — sent but missing from master)
        // as a normal 'sent' touch.
        const effectiveStatus =
          status === "off-list-sent" ? "sent" : status;

        if (effectiveStatus === "sent" || effectiveStatus === "draft") {
          const deliveryStatus = effectiveStatus === "sent" ? "sent" : "queued";
          const bodyRendered = reason ? `[OBSERVATION-ONLY] ${reason}` : null;

          // Dedup: (tenantId, contactId, sentAt) for sent rows;
          // for draft rows with no sent_date, dedup on (tenantId, contactId, deliveryStatus=queued + bodyRendered match)
          if (flags.dryRun) {
            console.log(
              `  [dry] INSERT touch contact=${email} status=${deliveryStatus} sentAt=${sentDate?.toISOString() ?? "null"}`,
            );
            summary.touchesCreated += 1;
          } else {
            // Look for existing touch
            let existingTouch: { id: string } | undefined;
            if (sentDate) {
              const [t] = await db
                .select({ id: schema.touches.id })
                .from(schema.touches)
                .where(
                  and(
                    eq(schema.touches.tenantId, tenantId),
                    eq(schema.touches.contactId, contactId),
                    drizzleSql`${schema.touches.sentAt} = ${sentDate}`,
                  ),
                )
                .limit(1);
              existingTouch = t;
            } else {
              // Draft: dedup on (tenantId, contactId, deliveryStatus='queued')
              const [t] = await db
                .select({ id: schema.touches.id })
                .from(schema.touches)
                .where(
                  and(
                    eq(schema.touches.tenantId, tenantId),
                    eq(schema.touches.contactId, contactId),
                    eq(schema.touches.deliveryStatus, "queued"),
                  ),
                )
                .limit(1);
              existingTouch = t;
            }

            if (existingTouch) {
              summary.touchesAlreadyPresent += 1;
            } else {
              await db.insert(schema.touches).values({
                tenantId,
                contactId,
                channel: "email",
                sentAt: sentDate,
                bodyRendered,
                deliveryStatus,
                externalMessageId: row.source_file
                  ? `sendlist:${row.source_file}#${row.idx}`
                  : null,
              });
              summary.touchesCreated += 1;
            }
          }
        }
      } catch (err) {
        summary.errors += 1;
        console.error(`  ✗ error on ${email}:`, err);
      }
    }

    console.log("\n=== import-send-list summary ===");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
