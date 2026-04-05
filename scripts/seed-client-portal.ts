/**
 * Seed Client Portal Script
 *
 * Extends the demo tenant with rich client portal data:
 * - 5 engagements across various statuses
 * - Proposals (SENT, APPROVED, DRAFT)
 * - Milestones with mixed statuses
 * - Deliverables (pending, delivered, accepted)
 * - Invoices (draft, sent, paid)
 * - Approval requests (pending, approved, rejected)
 *
 * Run: npx tsx scripts/seed-client-portal.ts
 * Idempotent: deletes existing portal data for the demo tenant before re-seeding.
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
const days = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

async function main() {
  console.log("🌱 Seeding client portal data...\n");

  // ── Find demo tenant ──────────────────────────────────────────────────

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

  // ── Find existing customers ───────────────────────────────────────────

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

  // ── Clear existing portal data (cascade from engagements) ─────────────

  const existingEngagements = await db
    .select({ id: schema.engagements.id })
    .from(schema.engagements)
    .where(eq(schema.engagements.tenantId, tenant.id));

  if (existingEngagements.length > 0) {
    console.log(`  🗑  Clearing ${existingEngagements.length} existing engagements (cascade)...`);
    for (const e of existingEngagements) {
      await db.delete(schema.engagements).where(eq(schema.engagements.id, e.id));
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  //  ENGAGEMENT 1: Active project with full data (Brand Identity & Website)
  // ────────────────────────────────────────────────────────────────────────

  const e1Id = randomUUID();
  const e1m1 = randomUUID(); // milestone: Discovery (completed)
  const e1m2 = randomUUID(); // milestone: Design (in progress)
  const e1m3 = randomUUID(); // milestone: Development (upcoming)
  const e1m4 = randomUUID(); // milestone: Launch (upcoming)
  const e1d1 = randomUUID(); // deliverable: Brand Guidelines
  const e1d2 = randomUUID(); // deliverable: Wireframes
  const e1d3 = randomUUID(); // deliverable: Design Mockups
  const e1d4 = randomUUID(); // deliverable: Website Build

  await db.insert(schema.engagements).values({
    id: e1Id,
    tenantId: tenant.id,
    customerId: customers[0]!.id,
    type: "PROJECT",
    status: "ACTIVE",
    title: "Brand Identity & Website Redesign",
    description: "Complete rebrand including logo, guidelines, and responsive 8-page website with CMS.",
    startDate: days(-30),
    endDate: days(60),
    updatedAt: now,
  });

  // Approved proposal
  await db.insert(schema.proposals).values({
    engagementId: e1Id,
    status: "APPROVED",
    scope: `<p>Full brand identity refresh and responsive website build. We'll create a modern, cohesive brand that reflects your company's values and resonates with your target audience.</p>
<p>The website will be built on a modern CMS platform, optimised for performance and SEO, with a focus on conversion and user experience.</p>`,
    deliverables: JSON.stringify([
      { title: "Brand Guidelines", description: "Logo variations, typography, colour palette, iconography, and comprehensive usage rules." },
      { title: "Wireframes & UX", description: "Low and high-fidelity wireframes for all 8 pages with user flow mapping." },
      { title: "Design Mockups", description: "Pixel-perfect mockups for desktop, tablet, and mobile breakpoints." },
      { title: "Website Build & CMS", description: "Responsive 8-page website with headless CMS integration and content migration." },
    ]),
    price: 1450000, // £14,500
    paymentSchedule: JSON.stringify([
      { label: "Project Deposit (25%)", amount: 362500, dueType: "ON_APPROVAL" },
      { label: "Design Phase Complete", amount: 362500, dueType: "ON_MILESTONE" },
      { label: "Development Complete", amount: 362500, dueType: "ON_MILESTONE" },
      { label: "Final Delivery & Launch", amount: 362500, dueType: "ON_COMPLETION" },
    ]),
    terms: `<p>1. This proposal is valid for 30 days from the date of issue.</p>
<p>2. Payment terms are as outlined in the payment schedule above.</p>
<p>3. Late payments will incur interest at 4% above the Bank of England base rate.</p>
<p>4. Either party may terminate with 14 days written notice. Work completed to date will be invoiced.</p>
<p>5. All intellectual property created during this engagement transfers to the client upon final payment.</p>`,
    token: `seed-e1-proposal-${randomUUID().slice(0, 8)}`,
    tokenExpiresAt: days(30),
    sentAt: days(-35),
    approvedAt: days(-30),
    updatedAt: now,
  });

  // Milestones
  await db.insert(schema.engagementMilestones).values([
    { id: e1m1, engagementId: e1Id, title: "Discovery & Research", description: "Stakeholder interviews, competitor analysis, brand audit", status: "COMPLETED", sortOrder: 0, dueDate: days(-16), completedAt: days(-17), updatedAt: now },
    { id: e1m2, engagementId: e1Id, title: "Design Phase", description: "Brand identity, wireframes, and visual design", status: "IN_PROGRESS", sortOrder: 1, dueDate: days(14), updatedAt: now },
    { id: e1m3, engagementId: e1Id, title: "Development", description: "Frontend build, CMS integration, content migration", status: "UPCOMING", sortOrder: 2, dueDate: days(42), updatedAt: now },
    { id: e1m4, engagementId: e1Id, title: "Launch & Handover", description: "QA, training, go-live, and documentation", status: "UPCOMING", sortOrder: 3, dueDate: days(60), updatedAt: now },
  ]);

  // Deliverables
  await db.insert(schema.deliverables).values([
    { id: e1d1, engagementId: e1Id, milestoneId: e1m1, title: "Brand Guidelines v1.0", description: "Complete brand book with logo, typography, and colour system", status: "ACCEPTED", fileUrl: "https://example.com/brand-guidelines-v1.pdf", deliveredAt: days(-20), acceptedAt: days(-18), updatedAt: now },
    { id: e1d2, engagementId: e1Id, milestoneId: e1m2, title: "Wireframes — All Pages", description: "High-fidelity wireframes for 8 pages, desktop and mobile", status: "DELIVERED", fileUrl: "https://example.com/wireframes.fig", deliveredAt: days(-5), updatedAt: now },
    { id: e1d3, engagementId: e1Id, milestoneId: e1m2, title: "Design Mockups — Homepage & Key Pages", description: "Pixel-perfect designs for homepage, about, services, and contact", status: "PENDING", updatedAt: now },
    { id: e1d4, engagementId: e1Id, milestoneId: e1m3, title: "Website Build", description: "Responsive website with CMS integration", status: "PENDING", updatedAt: now },
  ]);

  // Invoices
  await db.insert(schema.portalInvoices).values([
    { engagementId: e1Id, proposalPaymentIndex: 0, amount: 362500, description: "Project Deposit (25%)", status: "PAID", dueDate: days(-28), sentAt: days(-30), paidAt: days(-28), paymentMethod: "BANK_TRANSFER", paymentReference: "REF-2026-001", token: `seed-inv-${randomUUID().slice(0, 8)}`, updatedAt: now },
    { engagementId: e1Id, milestoneId: e1m2, proposalPaymentIndex: 1, amount: 362500, description: "Design Phase Complete", status: "SENT", dueDate: days(14), sentAt: days(-2), token: `seed-inv-${randomUUID().slice(0, 8)}`, updatedAt: now },
  ]);

  // Approvals
  await db.insert(schema.approvalRequests).values([
    { engagementId: e1Id, deliverableId: e1d1, milestoneId: e1m1, title: "Brand Guidelines Sign-off", description: "Please review the final brand guidelines document and confirm you're happy with the direction.", status: "APPROVED", clientComment: "Love the colour palette. The logo is exactly what we envisioned. Approved!", respondedAt: days(-18), updatedAt: now },
    { engagementId: e1Id, deliverableId: e1d2, milestoneId: e1m2, title: "Wireframe Approval", description: "Please review the wireframes for all 8 pages. We've incorporated your feedback from the Discovery phase.", status: "PENDING", updatedAt: now },
  ]);

  console.log(`  ✓ Engagement 1: "Brand Identity & Website Redesign" (ACTIVE, 4 milestones, 4 deliverables, 2 invoices, 2 approvals)`);

  // ────────────────────────────────────────────────────────────────────────
  //  ENGAGEMENT 2: Proposed — AI Booking System (awaiting client response)
  // ────────────────────────────────────────────────────────────────────────

  const e2Id = randomUUID();
  const e2Token = `seed-e2-proposal-${randomUUID().slice(0, 8)}`;

  await db.insert(schema.engagements).values({
    id: e2Id,
    tenantId: tenant.id,
    customerId: customers[1]!.id,
    type: "PROJECT",
    status: "PROPOSED",
    title: "AI-Powered Booking System",
    description: "End-to-end AI integration for automated booking management, customer communication, and intelligent scheduling.",
    updatedAt: now,
  });

  await db.insert(schema.proposals).values({
    engagementId: e2Id,
    status: "SENT",
    scope: `<p>We'll build a complete AI-powered booking system that handles your entire customer journey — from initial enquiry through to post-appointment follow-up.</p>
<p>The system will integrate with your existing calendar, automatically manage availability, send smart reminders, and use AI to optimise your schedule for maximum efficiency.</p>`,
    deliverables: JSON.stringify([
      { title: "AI Scheduling Engine", description: "Intelligent scheduling with staff availability, preferences, and optimisation." },
      { title: "Unified Customer Inbox", description: "Single inbox for email, SMS, WhatsApp with AI-powered responses." },
      { title: "Smart Reminders & Follow-ups", description: "Automated reminder sequences with personalised messaging." },
      { title: "Analytics Dashboard", description: "Booking patterns, no-show rates, revenue forecasting, and utilisation." },
    ]),
    price: 1850000, // £18,500
    paymentSchedule: JSON.stringify([
      { label: "Deposit (30%)", amount: 555000, dueType: "ON_APPROVAL" },
      { label: "Mid-Project", amount: 740000, dueType: "ON_MILESTONE" },
      { label: "Final Delivery", amount: 555000, dueType: "ON_COMPLETION" },
    ]),
    terms: null,
    token: e2Token,
    tokenExpiresAt: days(25),
    sentAt: days(-5),
    updatedAt: now,
  });

  // Pre-create milestones even though proposal isn't accepted yet
  await db.insert(schema.engagementMilestones).values([
    { engagementId: e2Id, title: "Discovery & Architecture", status: "UPCOMING", sortOrder: 0, dueDate: days(21), updatedAt: now },
    { engagementId: e2Id, title: "Core Booking Engine", status: "UPCOMING", sortOrder: 1, dueDate: days(49), updatedAt: now },
    { engagementId: e2Id, title: "Communications Layer", status: "UPCOMING", sortOrder: 2, dueDate: days(70), updatedAt: now },
    { engagementId: e2Id, title: "Launch & Handover", status: "UPCOMING", sortOrder: 3, dueDate: days(91), updatedAt: now },
  ]);

  console.log(`  ✓ Engagement 2: "AI-Powered Booking System" (PROPOSED, proposal SENT)`);

  // ────────────────────────────────────────────────────────────────────────
  //  ENGAGEMENT 3: Active retainer — Monthly SEO & Content
  // ────────────────────────────────────────────────────────────────────────

  const e3Id = randomUUID();
  const e3m1 = randomUUID();
  const e3m2 = randomUUID();
  const e3m3 = randomUUID();

  await db.insert(schema.engagements).values({
    id: e3Id,
    tenantId: tenant.id,
    customerId: customers[2]!.id,
    type: "RETAINER",
    status: "ACTIVE",
    title: "Monthly SEO & Content Strategy",
    description: "Ongoing SEO optimisation, keyword research, and content creation to drive organic traffic growth.",
    startDate: days(-60),
    updatedAt: now,
  });

  await db.insert(schema.proposals).values({
    engagementId: e3Id,
    status: "APPROVED",
    scope: "<p>Monthly retainer covering technical SEO audits, keyword research, content strategy, and 4 long-form blog posts per month. Quarterly performance reviews with actionable recommendations.</p>",
    deliverables: JSON.stringify([
      { title: "Monthly SEO Audit", description: "Technical audit with prioritised recommendations." },
      { title: "4x Blog Posts", description: "SEO-optimised long-form articles (1,500+ words each)." },
      { title: "Quarterly Strategy Review", description: "Performance analysis and strategy adjustments." },
    ]),
    price: 250000, // £2,500/month
    paymentSchedule: JSON.stringify([
      { label: "Month 1", amount: 250000, dueType: "ON_APPROVAL" },
      { label: "Month 2", amount: 250000, dueType: "ON_DATE" },
      { label: "Month 3", amount: 250000, dueType: "ON_DATE" },
    ]),
    terms: null,
    token: `seed-e3-proposal-${randomUUID().slice(0, 8)}`,
    tokenExpiresAt: days(30),
    sentAt: days(-65),
    approvedAt: days(-60),
    updatedAt: now,
  });

  await db.insert(schema.engagementMilestones).values([
    { id: e3m1, engagementId: e3Id, title: "Month 1 — Foundation", description: "Initial audit, keyword map, content calendar", status: "COMPLETED", sortOrder: 0, dueDate: days(-30), completedAt: days(-31), updatedAt: now },
    { id: e3m2, engagementId: e3Id, title: "Month 2 — Execution", description: "Content production, on-page fixes, link strategy", status: "COMPLETED", sortOrder: 1, dueDate: days(-1), completedAt: days(-2), updatedAt: now },
    { id: e3m3, engagementId: e3Id, title: "Month 3 — Optimise", description: "Performance review, strategy refinement, new content", status: "IN_PROGRESS", sortOrder: 2, dueDate: days(28), updatedAt: now },
  ]);

  await db.insert(schema.deliverables).values([
    { engagementId: e3Id, milestoneId: e3m1, title: "Technical SEO Audit Report", description: "Comprehensive audit of site health, indexation, and performance", status: "ACCEPTED", deliveredAt: days(-35), acceptedAt: days(-33), updatedAt: now },
    { engagementId: e3Id, milestoneId: e3m1, title: "Month 1 Blog Posts (4x)", description: "AI in Small Business, Local SEO Guide, Customer Retention, Digital Trends", status: "ACCEPTED", deliveredAt: days(-32), acceptedAt: days(-30), updatedAt: now },
    { engagementId: e3Id, milestoneId: e3m2, title: "Month 2 Blog Posts (4x)", description: "E-commerce SEO, Content Marketing ROI, Voice Search, Schema Markup", status: "DELIVERED", deliveredAt: days(-3), updatedAt: now },
    { engagementId: e3Id, milestoneId: e3m3, title: "Q1 Performance Review", description: "Traffic analysis, ranking changes, and Q2 recommendations", status: "PENDING", updatedAt: now },
  ]);

  await db.insert(schema.portalInvoices).values([
    { engagementId: e3Id, proposalPaymentIndex: 0, amount: 250000, description: "Month 1 — SEO & Content Retainer", status: "PAID", dueDate: days(-58), sentAt: days(-60), paidAt: days(-55), paymentMethod: "BANK_TRANSFER", paymentReference: "REF-2026-010", token: `seed-inv-${randomUUID().slice(0, 8)}`, updatedAt: now },
    { engagementId: e3Id, proposalPaymentIndex: 1, amount: 250000, description: "Month 2 — SEO & Content Retainer", status: "PAID", dueDate: days(-28), sentAt: days(-30), paidAt: days(-26), paymentMethod: "STRIPE", paymentReference: "pi_3abc123", token: `seed-inv-${randomUUID().slice(0, 8)}`, updatedAt: now },
    { engagementId: e3Id, proposalPaymentIndex: 2, amount: 250000, description: "Month 3 — SEO & Content Retainer", status: "SENT", dueDate: days(2), sentAt: days(-1), token: `seed-inv-${randomUUID().slice(0, 8)}`, updatedAt: now },
  ]);

  await db.insert(schema.approvalRequests).values([
    { engagementId: e3Id, milestoneId: e3m1, title: "Month 1 Content Approval", description: "Please review and approve the 4 blog posts for Month 1.", status: "APPROVED", clientComment: "All four posts are great. Published them this morning.", respondedAt: days(-30), updatedAt: now },
    { engagementId: e3Id, milestoneId: e3m2, title: "Month 2 Content Approval", description: "4 new blog posts ready for your review. Topics based on our keyword research.", status: "APPROVED", clientComment: "Approved. The schema markup article is particularly useful.", respondedAt: days(-1), updatedAt: now },
  ]);

  console.log(`  ✓ Engagement 3: "Monthly SEO & Content Strategy" (ACTIVE retainer, 3 months, 3 invoices)`);

  // ────────────────────────────────────────────────────────────────────────
  //  ENGAGEMENT 4: Draft — CRM Implementation (proposal not yet sent)
  // ────────────────────────────────────────────────────────────────────────

  const e4Id = randomUUID();

  await db.insert(schema.engagements).values({
    id: e4Id,
    tenantId: tenant.id,
    customerId: customers[0]!.id,
    type: "PROJECT",
    status: "DRAFT",
    title: "CRM Implementation & Training",
    description: "Set up HubSpot CRM with custom pipelines, automations, and team training.",
    updatedAt: now,
  });

  await db.insert(schema.proposals).values({
    engagementId: e4Id,
    status: "DRAFT",
    scope: "<p>Full HubSpot CRM implementation including custom deal pipelines, contact segmentation, email automation workflows, and comprehensive team training.</p>",
    deliverables: JSON.stringify([
      { title: "CRM Setup & Configuration", description: "Custom pipelines, properties, and integrations with existing tools." },
      { title: "Automation Workflows", description: "Lead nurture, onboarding, and follow-up sequences." },
      { title: "Team Training (2 sessions)", description: "Hands-on training for sales and operations teams." },
    ]),
    price: 480000, // £4,800
    paymentSchedule: JSON.stringify([
      { label: "Setup Fee", amount: 240000, dueType: "ON_APPROVAL" },
      { label: "Training Complete", amount: 240000, dueType: "ON_COMPLETION" },
    ]),
    terms: null,
    token: `seed-e4-draft-${randomUUID().slice(0, 8)}`,
    tokenExpiresAt: days(60),
    updatedAt: now,
  });

  console.log(`  ✓ Engagement 4: "CRM Implementation & Training" (DRAFT, proposal not sent)`);

  // ────────────────────────────────────────────────────────────────────────
  //  ENGAGEMENT 5: Completed — E-commerce Platform Build
  // ────────────────────────────────────────────────────────────────────────

  const e5Id = randomUUID();
  const e5m1 = randomUUID();
  const e5m2 = randomUUID();

  await db.insert(schema.engagements).values({
    id: e5Id,
    tenantId: tenant.id,
    customerId: customers[1]!.id,
    type: "PROJECT",
    status: "COMPLETED",
    title: "E-commerce Platform Build",
    description: "Shopify Plus store with custom theme, product migration, and payment integration.",
    startDate: days(-120),
    endDate: days(-15),
    updatedAt: now,
  });

  await db.insert(schema.proposals).values({
    engagementId: e5Id,
    status: "APPROVED",
    scope: "<p>Custom Shopify Plus store with bespoke theme, 500+ product migration, Stripe payment integration, and shipping automation.</p>",
    deliverables: JSON.stringify([
      { title: "Custom Theme", description: "Bespoke Shopify theme matching brand guidelines." },
      { title: "Product Migration", description: "Migration of 500+ products with images, variants, and SEO data." },
      { title: "Payment & Shipping Setup", description: "Stripe integration, Royal Mail API, and automated fulfilment." },
    ]),
    price: 2200000, // £22,000
    paymentSchedule: JSON.stringify([
      { label: "Deposit", amount: 660000, dueType: "ON_APPROVAL" },
      { label: "Development Complete", amount: 880000, dueType: "ON_MILESTONE" },
      { label: "Launch & Handover", amount: 660000, dueType: "ON_COMPLETION" },
    ]),
    terms: null,
    token: `seed-e5-proposal-${randomUUID().slice(0, 8)}`,
    tokenExpiresAt: days(-60),
    sentAt: days(-130),
    approvedAt: days(-120),
    updatedAt: now,
  });

  await db.insert(schema.engagementMilestones).values([
    { id: e5m1, engagementId: e5Id, title: "Development & Migration", status: "COMPLETED", sortOrder: 0, dueDate: days(-45), completedAt: days(-48), updatedAt: now },
    { id: e5m2, engagementId: e5Id, title: "Launch & Handover", status: "COMPLETED", sortOrder: 1, dueDate: days(-15), completedAt: days(-16), updatedAt: now },
  ]);

  await db.insert(schema.deliverables).values([
    { engagementId: e5Id, milestoneId: e5m1, title: "Custom Shopify Theme", status: "ACCEPTED", deliveredAt: days(-50), acceptedAt: days(-48), updatedAt: now },
    { engagementId: e5Id, milestoneId: e5m1, title: "Product Migration (537 items)", status: "ACCEPTED", deliveredAt: days(-50), acceptedAt: days(-48), updatedAt: now },
    { engagementId: e5Id, milestoneId: e5m2, title: "Payment & Shipping Integration", status: "ACCEPTED", deliveredAt: days(-18), acceptedAt: days(-16), updatedAt: now },
  ]);

  await db.insert(schema.portalInvoices).values([
    { engagementId: e5Id, proposalPaymentIndex: 0, amount: 660000, description: "Deposit — E-commerce Build", status: "PAID", dueDate: days(-118), sentAt: days(-120), paidAt: days(-116), paymentMethod: "BANK_TRANSFER", paymentReference: "REF-2025-042", token: `seed-inv-${randomUUID().slice(0, 8)}`, updatedAt: now },
    { engagementId: e5Id, milestoneId: e5m1, proposalPaymentIndex: 1, amount: 880000, description: "Development Complete", status: "PAID", dueDate: days(-45), sentAt: days(-48), paidAt: days(-43), paymentMethod: "BANK_TRANSFER", paymentReference: "REF-2026-003", token: `seed-inv-${randomUUID().slice(0, 8)}`, updatedAt: now },
    { engagementId: e5Id, milestoneId: e5m2, proposalPaymentIndex: 2, amount: 660000, description: "Launch & Handover", status: "PAID", dueDate: days(-14), sentAt: days(-16), paidAt: days(-12), paymentMethod: "STRIPE", paymentReference: "pi_9xyz456", token: `seed-inv-${randomUUID().slice(0, 8)}`, updatedAt: now },
  ]);

  await db.insert(schema.approvalRequests).values([
    { engagementId: e5Id, milestoneId: e5m1, title: "Theme & Migration Sign-off", description: "Please review the custom theme and verify the product data migration is complete.", status: "APPROVED", clientComment: "Everything looks perfect. Great attention to detail on the product variants.", respondedAt: days(-48), updatedAt: now },
    { engagementId: e5Id, milestoneId: e5m2, title: "Go-Live Approval", description: "Final sign-off before we switch DNS and go live.", status: "APPROVED", clientComment: "Approved for launch. Let's go!", respondedAt: days(-16), updatedAt: now },
  ]);

  console.log(`  ✓ Engagement 5: "E-commerce Platform Build" (COMPLETED, fully paid)`);

  // ── Summary ───────────────────────────────────────────────────────────

  console.log("\n📊 Seed Summary:");
  console.log("   5 engagements (1 ACTIVE project, 1 PROPOSED, 1 ACTIVE retainer, 1 DRAFT, 1 COMPLETED)");
  console.log("   5 proposals (2 APPROVED, 1 SENT, 1 DRAFT, 1 APPROVED+COMPLETED)");
  console.log("   13 milestones");
  console.log("   11 deliverables");
  console.log("   8 invoices");
  console.log("   6 approval requests");
  console.log("\n   → Visit /admin/clients to see the data\n");

  await client.end();
  console.log("✅ Done!\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
