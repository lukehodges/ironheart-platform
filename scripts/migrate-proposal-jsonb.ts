/**
 * One-time data migration: converts existing proposal JSONB columns
 * (deliverables, paymentSchedule) into relational tables
 * (proposal_sections, proposal_items, payment_rules).
 *
 * Run: npx tsx scripts/migrate-proposal-jsonb.ts
 *
 * This is idempotent — it skips proposals that already have sections.
 */
import { db } from "../src/shared/db";
import {
  proposals,
  proposalSections,
  proposalItems,
  paymentRules,
  engagements,
} from "../src/shared/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting JSONB → relational migration...");

  const allProposals = await db.select().from(proposals);
  console.log(`Found ${allProposals.length} proposals to check`);

  let migrated = 0;
  let skipped = 0;

  for (const proposal of allProposals) {
    // Check if already migrated (has sections)
    const existingSections = await db
      .select()
      .from(proposalSections)
      .where(eq(proposalSections.proposalId, proposal.id))
      .limit(1);

    if (existingSections.length > 0) {
      skipped++;
      continue;
    }

    const deliverablesList = (proposal.deliverables ?? []) as { title: string; description: string }[];
    const paymentSchedule = (proposal.paymentSchedule ?? []) as { label: string; amount: number; dueType: string }[];

    if (deliverablesList.length === 0 && paymentSchedule.length === 0) {
      skipped++;
      continue;
    }

    // Get engagement for tenantId
    const [engagement] = await db
      .select()
      .from(engagements)
      .where(eq(engagements.id, proposal.engagementId))
      .limit(1);

    if (!engagement) {
      console.warn(`Skipping proposal ${proposal.id} — engagement not found`);
      skipped++;
      continue;
    }

    const now = new Date();

    // Create a single AD_HOC section for the deliverables
    if (deliverablesList.length > 0) {
      const [section] = await db
        .insert(proposalSections)
        .values({
          proposalId: proposal.id,
          title: "Deliverables",
          type: "AD_HOC" as any,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Create items from deliverables
      await db.insert(proposalItems).values(
        deliverablesList.map((d, i) => ({
          sectionId: section!.id,
          proposalId: proposal.id,
          title: d.title,
          description: d.description || null,
          sortOrder: i,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    // Create payment rules from paymentSchedule
    if (paymentSchedule.length > 0) {
      await db.insert(paymentRules).values(
        paymentSchedule.map((ps, i) => {
          let trigger = "ON_APPROVAL";
          if (ps.dueType === "ON_DATE") trigger = "FIXED_DATE";
          if (ps.dueType === "ON_MILESTONE") trigger = "MILESTONE_COMPLETE";
          if (ps.dueType === "ON_COMPLETION") trigger = "MILESTONE_COMPLETE";

          return {
            proposalId: proposal.id,
            tenantId: engagement.tenantId,
            label: ps.label,
            amount: ps.amount,
            trigger: trigger as any,
            autoSend: false,
            sortOrder: i,
            createdAt: now,
            updatedAt: now,
          };
        })
      );
    }

    migrated++;
    console.log(`Migrated proposal ${proposal.id} (${deliverablesList.length} items, ${paymentSchedule.length} rules)`);
  }

  console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
