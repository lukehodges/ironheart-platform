/**
 * Import SendList2.csv (Apollo export) → companies + contacts.
 *
 * Idempotent:
 *   - companies upsert by (tenantId, domain)
 *   - contacts upsert by (tenantId, email)
 *   - rows with email on dnc_list (by email OR domain) are skipped
 *
 * Usage:
 *   tsx scripts/import-apollo.ts
 *   tsx scripts/import-apollo.ts --tenant ironheart --file /path/to/SendList2.csv
 *   DRY_RUN=1 tsx scripts/import-apollo.ts
 */

import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { and, eq } from "drizzle-orm";
import {
  makeDb,
  parseFlags,
  resolveTenantId,
  domainFromEmail,
  domainFromWebsite,
  stripExcelQuote,
  employeeBand,
  isOwnerSeniority,
  isDecisionMakerSeniority,
} from "./import-helpers";
import * as schema from "../src/shared/db/schema";

const DEFAULT_FILE =
  "/Users/lukehodges/Documents/the-ironheart-ltd/Pipeline/Outreach/SendList2.csv";

interface Summary {
  rowsRead: number;
  companiesCreated: number;
  companiesUpdated: number;
  contactsCreated: number;
  contactsUpdated: number;
  skippedNoEmail: number;
  skippedDnc: number;
  errors: number;
}

async function main() {
  const flags = parseFlags(process.argv);
  const file = flags.file ?? DEFAULT_FILE;
  const { client, db } = makeDb();

  try {
    const tenantId = await resolveTenantId(db, flags.tenant);
    console.log(
      `[import-apollo] tenant=${tenantId} file=${file} dryRun=${flags.dryRun}`,
    );

    const raw = fs.readFileSync(file, "utf-8");
    const rows: Record<string, string>[] = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_quotes: true,
      relax_column_count: true,
    });

    // Preload DNC list for fast lookup
    const dncRows = await db
      .select({ email: schema.dncList.email, domain: schema.dncList.domain })
      .from(schema.dncList)
      .where(eq(schema.dncList.tenantId, tenantId));
    const dncEmails = new Set(
      dncRows.map((r) => r.email?.toLowerCase()).filter(Boolean) as string[],
    );
    const dncDomains = new Set(
      dncRows.map((r) => r.domain?.toLowerCase()).filter(Boolean) as string[],
    );

    const summary: Summary = {
      rowsRead: rows.length,
      companiesCreated: 0,
      companiesUpdated: 0,
      contactsCreated: 0,
      contactsUpdated: 0,
      skippedNoEmail: 0,
      skippedDnc: 0,
      errors: 0,
    };

    for (const row of rows) {
      const email = (row["Email"] || "").trim().toLowerCase();
      if (!email) {
        summary.skippedNoEmail += 1;
        continue;
      }

      const emailDomain = domainFromEmail(email);
      const webDomain = domainFromWebsite(row["Website"]);
      const domain = webDomain ?? emailDomain;

      if (dncEmails.has(email) || (domain && dncDomains.has(domain))) {
        summary.skippedDnc += 1;
        console.log(`  · skip dnc ${email}`);
        continue;
      }

      try {
        // -------- COMPANY UPSERT --------
        const companyName = (row["Company Name"] || "").trim() || domain || email;
        const industry = row["Industry"]?.trim() || null;
        const empStr = row["# Employees"]?.trim();
        const empCount = empStr ? parseInt(empStr, 10) : NaN;
        const band = employeeBand(Number.isFinite(empCount) ? empCount : null);
        const city = row["City"]?.trim() || row["Company City"]?.trim() || null;
        const country =
          row["Country"]?.trim() || row["Company Country"]?.trim() || null;
        const seniority = row["Seniority"]?.trim() || null;
        const ownerLed =
          isOwnerSeniority(seniority) &&
          Number.isFinite(empCount) &&
          (empCount as number) < 15;

        const enrichment: Record<string, unknown> = { apolloRow: row };

        let companyId: string;
        let existingCompany: { id: string } | undefined;
        if (domain) {
          [existingCompany] = await db
            .select({ id: schema.companies.id })
            .from(schema.companies)
            .where(
              and(
                eq(schema.companies.tenantId, tenantId),
                eq(schema.companies.domain, domain),
              ),
            )
            .limit(1);
        }

        if (existingCompany) {
          companyId = existingCompany.id;
          if (!flags.dryRun) {
            await db
              .update(schema.companies)
              .set({
                name: companyName,
                industry,
                employeeBand: band,
                city,
                country,
                ownerLed,
                enrichment,
                updatedAt: new Date(),
              })
              .where(eq(schema.companies.id, companyId));
          }
          summary.companiesUpdated += 1;
        } else if (flags.dryRun) {
          companyId = "00000000-0000-0000-0000-000000000000";
          summary.companiesCreated += 1;
          console.log(`  [dry] INSERT company domain=${domain} name=${companyName}`);
        } else {
          const [ins] = await db
            .insert(schema.companies)
            .values({
              tenantId,
              name: companyName,
              domain,
              industry,
              employeeBand: band,
              city,
              country,
              ownerLed,
              source: "cold",
              enrichment,
            })
            .returning({ id: schema.companies.id });
          companyId = ins!.id;
          summary.companiesCreated += 1;
        }

        // -------- CONTACT UPSERT --------
        const firstName = (row["First Name"] || "").trim();
        const lastName = (row["Last Name"] || "").trim();
        const fullName =
          `${firstName} ${lastName}`.trim() || email.split("@")[0] || email;
        const role = row["Title"]?.trim() || null;
        const phone =
          stripExcelQuote(row["Mobile Phone"]) ??
          stripExcelQuote(row["Work Direct Phone"]) ??
          stripExcelQuote(row["Corporate Phone"]) ??
          null;
        const linkedinUrl = row["Person Linkedin Url"]?.trim() || null;
        const isOwner = isOwnerSeniority(seniority);
        const isDM = isDecisionMakerSeniority(seniority);
        const emailStatus = row["Email Status"]?.trim() || "";
        const bounced = emailStatus.toLowerCase() === "bounced";

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

        if (existingContact) {
          if (!flags.dryRun) {
            await db
              .update(schema.contacts)
              .set({
                companyId,
                fullName,
                role,
                phone,
                linkedinUrl,
                isOwner,
                isDecisionMaker: isDM,
                bounced,
                updatedAt: new Date(),
              })
              .where(eq(schema.contacts.id, existingContact.id));
          }
          summary.contactsUpdated += 1;
        } else if (flags.dryRun) {
          summary.contactsCreated += 1;
          console.log(`  [dry] INSERT contact email=${email} name=${fullName}`);
        } else {
          await db.insert(schema.contacts).values({
            tenantId,
            companyId,
            fullName,
            role,
            email,
            phone,
            linkedinUrl,
            isOwner,
            isDecisionMaker: isDM,
            bounced,
          });
          summary.contactsCreated += 1;
        }
      } catch (err) {
        summary.errors += 1;
        console.error(`  ✗ error on ${email}:`, err);
      }
    }

    console.log("\n=== import-apollo summary ===");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
