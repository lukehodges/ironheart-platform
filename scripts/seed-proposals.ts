/**
 * Seed Proposals Script
 *
 * Seeds engagement + proposal data for the demo tenant so the portal
 * frontend can be tested at /portal/<token>.
 *
 * Creates proposals in various statuses (SENT, APPROVED, DECLINED) with
 * realistic deliverables, milestones, and payment schedules.
 *
 * Run: npx tsx scripts/seed-proposals.ts
 * Idempotent: checks for existing engagements before inserting.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/shared/db/schema";
import * as relations from "../src/shared/db/relations";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema: { ...schema, ...relations } });

const now = new Date();
const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

async function main() {
  console.log("🌱 Seeding proposals...\n");

  // Find the demo tenant
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, "demo"))
    .limit(1);

  if (!tenant) {
    console.error("❌ Demo tenant not found. Run npm run db:seed first.");
    process.exit(1);
  }
  console.log(`  ✓ Found tenant: ${tenant.name} (${tenant.id})`);

  // Find existing customers
  const customers = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.tenantId, tenant.id))
    .limit(5);

  if (customers.length < 3) {
    console.error("❌ Need at least 3 customers. Run npm run db:seed first.");
    process.exit(1);
  }
  console.log(`  ✓ Found ${customers.length} customers\n`);

  // Check if we already seeded
  const existingEngagements = await db
    .select()
    .from(schema.engagements)
    .where(eq(schema.engagements.tenantId, tenant.id))
    .limit(1);

  if (existingEngagements.length > 0) {
    console.log("  ⏭  Engagements already exist — skipping seed.\n");
    await client.end();
    return;
  }

  // ── Proposal 1: SENT (the main one to test the full proposal view) ────

  const engagement1Id = randomUUID();
  const proposal1Token = "demo-proposal-sent";

  await db.insert(schema.engagements).values({
    id: engagement1Id,
    tenantId: tenant.id,
    customerId: customers[0].id,
    type: "PROJECT",
    status: "PROPOSED",
    title: "AI-Powered Booking System",
    description:
      "End-to-end AI integration for automated booking management, customer communication, and intelligent scheduling.",
    updatedAt: now,
  });

  await db.insert(schema.proposals).values({
    engagementId: engagement1Id,
    status: "SENT",
    scope: `<p>We'll build a complete AI-powered booking system that handles your entire customer journey — from initial enquiry through to post-appointment follow-up.</p>
<p>The system will integrate with your existing calendar, automatically manage availability, send smart reminders, and use AI to optimise your schedule for maximum efficiency.</p>
<p>All customer communications will be handled through a unified inbox with AI-suggested responses, reducing your admin time by an estimated 60%.</p>`,
    deliverables: JSON.stringify([
      {
        title: "AI Scheduling Engine",
        description:
          "Intelligent scheduling that considers staff availability, customer preferences, travel time, and historical patterns to suggest optimal appointment slots.",
      },
      {
        title: "Unified Customer Inbox",
        description:
          "Single inbox for all customer communications (email, SMS, WhatsApp) with AI-powered response suggestions and automatic categorisation.",
      },
      {
        title: "Smart Reminders & Follow-ups",
        description:
          "Automated reminder sequences with personalised messaging. Post-appointment follow-ups triggered by booking completion.",
      },
      {
        title: "Analytics Dashboard",
        description:
          "Real-time dashboard showing booking patterns, no-show rates, revenue forecasting, and staff utilisation metrics.",
      },
      {
        title: "Staff Mobile App",
        description:
          "Native mobile experience for staff to manage their schedule, view customer notes, and handle on-the-go bookings.",
      },
    ]),
    price: 1250000, // £12,500
    paymentSchedule: JSON.stringify([
      { label: "Project Deposit", amount: 375000, dueType: "ON_APPROVAL" },
      {
        label: "Mid-Project Milestone",
        amount: 500000,
        dueType: "ON_MILESTONE",
      },
      {
        label: "Final Delivery",
        amount: 375000,
        dueType: "ON_COMPLETION",
      },
    ]),
    terms: `<p><strong>Payment Terms:</strong> Invoices are due within 14 days of issue. Late payments may incur a 2% monthly charge.</p>
<p><strong>Scope Changes:</strong> Any changes to the agreed scope will be documented in a change request and may affect timeline and cost.</p>
<p><strong>Intellectual Property:</strong> All custom code and designs become your property upon full payment. Third-party licenses remain with their respective owners.</p>
<p><strong>Confidentiality:</strong> Both parties agree to keep project details confidential. Portfolio use requires written permission.</p>
<p><strong>Cancellation:</strong> Either party may cancel with 14 days written notice. Work completed to date will be invoiced at the agreed rates.</p>`,
    token: proposal1Token,
    tokenExpiresAt: thirtyDaysFromNow,
    sentAt: now,
    updatedAt: now,
  });

  // Milestones for engagement 1
  await db.insert(schema.engagementMilestones).values([
    {
      engagementId: engagement1Id,
      title: "Discovery & Architecture",
      description:
        "Requirements gathering, system architecture, and technical planning",
      status: "UPCOMING",
      sortOrder: 0,
      dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    {
      engagementId: engagement1Id,
      title: "Core Booking Engine",
      description:
        "AI scheduling, calendar integration, and availability management",
      status: "UPCOMING",
      sortOrder: 1,
      dueDate: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    {
      engagementId: engagement1Id,
      title: "Communications Layer",
      description: "Unified inbox, AI responses, and automated reminders",
      status: "UPCOMING",
      sortOrder: 2,
      dueDate: new Date(now.getTime() + 63 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
    {
      engagementId: engagement1Id,
      title: "Launch & Handover",
      description:
        "Testing, staff training, go-live support, and documentation",
      status: "UPCOMING",
      sortOrder: 3,
      dueDate: new Date(now.getTime() + 84 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
  ]);

  console.log(
    `  ✓ Proposal 1 (SENT): "AI-Powered Booking System" → /portal/${proposal1Token}`
  );

  // ── Proposal 2: APPROVED (to test approved state) ─────────────────────

  const engagement2Id = randomUUID();
  const proposal2Token = "demo-proposal-approved";

  await db.insert(schema.engagements).values({
    id: engagement2Id,
    tenantId: tenant.id,
    customerId: customers[1].id,
    type: "PROJECT",
    status: "ACTIVE",
    title: "Brand Identity & Website Redesign",
    description: "Complete rebrand with new website.",
    startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: now,
  });

  await db.insert(schema.proposals).values({
    engagementId: engagement2Id,
    status: "APPROVED",
    scope: "<p>Full brand identity refresh and responsive website build.</p>",
    deliverables: JSON.stringify([
      {
        title: "Brand Guidelines",
        description: "Logo, typography, colour palette, and usage rules.",
      },
      {
        title: "Website Design & Build",
        description:
          "Responsive 8-page website with CMS integration.",
      },
    ]),
    price: 850000, // £8,500
    paymentSchedule: JSON.stringify([
      { label: "Deposit", amount: 255000, dueType: "ON_APPROVAL" },
      { label: "Balance", amount: 595000, dueType: "ON_COMPLETION" },
    ]),
    terms: null,
    token: proposal2Token,
    tokenExpiresAt: thirtyDaysFromNow,
    sentAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    approvedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: now,
  });

  console.log(
    `  ✓ Proposal 2 (APPROVED): "Brand Identity & Website Redesign" → /portal/${proposal2Token}`
  );

  // ── Proposal 3: DECLINED (to test declined state) ─────────────────────

  const engagement3Id = randomUUID();
  const proposal3Token = "demo-proposal-declined";

  await db.insert(schema.engagements).values({
    id: engagement3Id,
    tenantId: tenant.id,
    customerId: customers[2].id,
    type: "RETAINER",
    status: "DRAFT",
    title: "Monthly SEO & Content Retainer",
    description: "Ongoing SEO optimisation and content creation.",
    updatedAt: now,
  });

  await db.insert(schema.proposals).values({
    engagementId: engagement3Id,
    status: "DECLINED",
    scope: "<p>Monthly retainer for SEO audits, keyword research, and blog content creation.</p>",
    deliverables: JSON.stringify([
      {
        title: "Monthly SEO Audit",
        description: "Technical audit with actionable recommendations.",
      },
      {
        title: "4x Blog Posts",
        description: "SEO-optimised long-form articles per month.",
      },
    ]),
    price: 200000, // £2,000/month
    paymentSchedule: JSON.stringify([
      { label: "Monthly Fee", amount: 200000, dueType: "ON_DATE" },
    ]),
    terms: null,
    token: proposal3Token,
    tokenExpiresAt: thirtyDaysFromNow,
    sentAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    declinedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: now,
  });

  console.log(
    `  ✓ Proposal 3 (DECLINED): "Monthly SEO & Content Retainer" → /portal/${proposal3Token}`
  );

  // ── Proposal 4: SENT but expired token (to test expired state) ────────

  const engagement4Id = randomUUID();
  const proposal4Token = "demo-proposal-expired";

  await db.insert(schema.engagements).values({
    id: engagement4Id,
    tenantId: tenant.id,
    customerId: customers[0].id,
    type: "PROJECT",
    status: "PROPOSED",
    title: "Data Migration & API Integration",
    description: "Migrate legacy data and build API integrations.",
    updatedAt: now,
  });

  await db.insert(schema.proposals).values({
    engagementId: engagement4Id,
    status: "SENT",
    scope: "<p>Full data migration from legacy system plus REST API integration layer.</p>",
    deliverables: JSON.stringify([
      {
        title: "Data Migration",
        description: "Clean extraction, transformation, and loading of all customer and booking data.",
      },
      {
        title: "API Integration Layer",
        description: "RESTful API connecting your existing tools with the new platform.",
      },
    ]),
    price: 750000, // £7,500
    paymentSchedule: JSON.stringify([
      { label: "Upfront", amount: 375000, dueType: "ON_APPROVAL" },
      { label: "On Completion", amount: 375000, dueType: "ON_COMPLETION" },
    ]),
    terms: null,
    token: proposal4Token,
    tokenExpiresAt: thirtyDaysAgo, // Already expired
    sentAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
    updatedAt: now,
  });

  console.log(
    `  ✓ Proposal 4 (EXPIRED): "Data Migration & API Integration" → /portal/${proposal4Token}`
  );

  // ── Summary ───────────────────────────────────────────────────────────

  console.log("\n📋 Test URLs:");
  console.log(`   SENT (full proposal):   http://localhost:3000/portal/${proposal1Token}`);
  console.log(`   APPROVED:               http://localhost:3000/portal/${proposal2Token}`);
  console.log(`   DECLINED:               http://localhost:3000/portal/${proposal3Token}`);
  console.log(`   EXPIRED:                http://localhost:3000/portal/${proposal4Token}`);
  console.log();

  await client.end();
  console.log("✅ Done!\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
