/**
 * Consulting Tenant Seed Script
 *
 * Bootstraps Luke's AI consulting tenant with services, form templates,
 * message templates, and workflow definitions.
 *
 * Run: npx tsx scripts/seed-consulting.ts
 *
 * Requires SEED_TENANT_ID env var or pass as CLI argument:
 *   SEED_TENANT_ID=<uuid> npx tsx scripts/seed-consulting.ts
 *   npx tsx scripts/seed-consulting.ts <uuid>
 *
 * Idempotent: skips records that already exist (matched by name + tenantId).
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/shared/db/schema";
import * as relations from "../src/shared/db/relations";
import { eq, and } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema: { ...schema, ...relations } });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uuid = () => crypto.randomUUID();
const now = new Date();
const log = (msg: string) => console.log(`  → ${msg}`);

// ---------------------------------------------------------------------------
// Resolve tenant ID
// ---------------------------------------------------------------------------

const tenantId = process.argv[2] ?? process.env.SEED_TENANT_ID;
if (!tenantId) {
  console.error(
    "ERROR: No tenant ID provided.\n" +
      "Usage:\n" +
      "  SEED_TENANT_ID=<uuid> npx tsx scripts/seed-consulting.ts\n" +
      "  npx tsx scripts/seed-consulting.ts <uuid>"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Service definitions
// ---------------------------------------------------------------------------

const SERVICE_DEFS = [
  {
    name: "Discovery Call",
    description:
      "Free 15-minute introductory call to understand your business challenges",
    durationMinutes: 15,
    price: "0.00",
  },
  {
    name: "Business Audit",
    description:
      "90-minute deep dive into your business processes, tools, and pain points",
    durationMinutes: 90,
    price: "500.00",
  },
  {
    name: "Solution Design Session",
    description:
      "60-minute follow-up session to review the solution map and refine the approach",
    durationMinutes: 60,
    price: "250.00",
  },
  {
    name: "Monthly Retainer Check-in",
    description: "30-minute monthly check-in for ongoing clients",
    durationMinutes: 30,
    price: "0.00",
  },
  {
    name: "n8n Automation Build",
    description: "Small automation project — typically 1-2 workflows",
    durationMinutes: 0,
    price: "2000.00",
  },
  {
    name: "Custom Software Build",
    description: "Bespoke software development project",
    durationMinutes: 0,
    price: "0.00",
  },
] as const;

// ---------------------------------------------------------------------------
// Form field helper
// ---------------------------------------------------------------------------

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

function field(
  label: string,
  type: string,
  opts?: { required?: boolean; options?: string[]; placeholder?: string }
): FormField {
  return {
    id: uuid(),
    type,
    label,
    required: opts?.required ?? false,
    ...(opts?.placeholder && { placeholder: opts.placeholder }),
    ...(opts?.options && { options: opts.options }),
  };
}

// ---------------------------------------------------------------------------
// Form template definitions
// ---------------------------------------------------------------------------

const FORM_TEMPLATE_DEFS = [
  {
    name: "Pre-Discovery Questionnaire",
    description:
      "Sent before the first discovery call to understand the prospect",
    fields: [
      field("What does your business do?", "TEXT", { required: true }),
      field("How many people in your team?", "SELECT", {
        required: true,
        options: ["1-5", "5-20", "20-50", "50+"],
      }),
      field("What tools/software do you currently use?", "TEXTAREA"),
      field("What's the #1 thing that wastes your time?", "TEXTAREA", {
        required: true,
      }),
      field("Budget range for solving this?", "SELECT", {
        options: [
          "Under £5k",
          "£5k-£20k",
          "£20k-£50k",
          "£50k+",
          "Not sure yet",
        ],
      }),
      field("How did you hear about me?", "TEXT"),
      field("Anything else I should know before our call?", "TEXTAREA"),
    ],
    sendTiming: "MANUAL" as const,
    isPublic: true,
    allowGuestAccess: true,
  },
  {
    name: "Business Audit Checklist",
    description:
      "Internal checklist used during and after a business audit session",
    fields: [
      field("Current tech stack", "TEXTAREA", { required: true }),
      field("Data sources and integrations", "TEXTAREA"),
      field("Manual processes identified", "TEXTAREA", { required: true }),
      field("Integration opportunities", "TEXTAREA"),
      field("Quick wins (implement in <1 week)", "TEXTAREA"),
      field("Medium-term improvements (1-4 weeks)", "TEXTAREA"),
      field("Strategic opportunities (1-3 months)", "TEXTAREA"),
      field("Estimated complexity", "SELECT", {
        required: true,
        options: ["Low", "Medium", "High"],
      }),
      field("Recommended approach", "SELECT", {
        required: true,
        options: [
          "n8n automation",
          "Custom software build",
          "Ironheart tenant deployment",
          "Partnership/rev-share",
          "Advisory only",
          "Other",
        ],
      }),
      field("Estimated value to client (annual)", "TEXT", {
        placeholder: "e.g. 50000",
      }),
      field("Notes and observations", "TEXTAREA"),
    ],
    sendTiming: "MANUAL" as const,
    isPublic: false,
    allowGuestAccess: false,
  },
  {
    name: "Client Onboarding Form",
    description:
      "Sent to new clients after a deal is won to collect onboarding details",
    fields: [
      field("Primary contact name", "TEXT", { required: true }),
      field("Primary contact email", "EMAIL", { required: true }),
      field("Company name", "TEXT", { required: true }),
      field("Company website", "TEXT"),
      field("Billing address", "TEXTAREA", { required: true }),
      field("Preferred communication channel", "SELECT", {
        required: true,
        options: ["Email", "Slack", "WhatsApp", "Phone"],
      }),
      field("Access credentials or logins needed", "TEXTAREA", {
        placeholder: "List any systems I'll need access to",
      }),
      field("Key stakeholders and their roles", "TEXTAREA"),
      field("Project deadline or constraints", "TEXTAREA"),
      field("Anything else for onboarding", "TEXTAREA"),
    ],
    sendTiming: "MANUAL" as const,
    isPublic: true,
    allowGuestAccess: true,
  },
];

// ---------------------------------------------------------------------------
// Message template definitions
// ---------------------------------------------------------------------------

const MESSAGE_TEMPLATE_DEFS = [
  {
    name: "Cold Outreach - Initial",
    trigger: "outreach.initial",
    channel: "EMAIL" as const,
    subject: "Quick question about your pipeline",
    body: `Hi {{firstName}},

I'm Luke, a Computer Science student at the University of Bath.

I'm curious — when you're running a {{niche}} search from brief through to placement, how much of the candidate tracking, client updates, and reference chasing is still running manually rather than through a single system?

I'm building a lightweight workflow tool for specialist recruiters to handle the coordination between clients, candidates, and internal vetting — the stuff that currently lives across email threads and spreadsheets.

I'm looking to work with 2-3 real firms to make sure I'm solving the right problems before I build anything.

Would you be open to a 15-minute call this week?

All the best,
Luke`,
  },
  {
    name: "Cold Outreach - Follow Up 1",
    trigger: "outreach.followup1",
    channel: "EMAIL" as const,
    subject: "Re: Quick question about your pipeline",
    body: `Hi {{firstName}},

Just circling back on my note last week. I know you're busy — I'll keep this short.

I'm looking for 2-3 recruitment firms to help shape a workflow tool I'm building. No sales pitch, just a 15-minute conversation about how you manage your pipeline today.

Worth a quick chat?

Luke`,
  },
  {
    name: "Cold Outreach - Follow Up 2",
    trigger: "outreach.followup2",
    channel: "EMAIL" as const,
    subject: "Last one from me",
    body: `Hi {{firstName}},

Last email from me on this — I promise.

If streamlining your recruitment pipeline isn't a priority right now, no worries at all. But if it is, I'd love 15 minutes of your time.

Either way, I appreciate you reading this far.

All the best,
Luke`,
  },
  {
    name: "Discovery Call Booked",
    trigger: "discovery.booked",
    channel: "EMAIL" as const,
    subject: "Confirmed: Discovery Call with Luke",
    body: `Hi {{firstName}},

Great news — your discovery call is confirmed.

Before we chat, it would really help if you could fill in a quick questionnaire so I can make the most of our time together:

{{formLink}}

It only takes 2-3 minutes and means we can jump straight into the good stuff.

Speak soon,
Luke`,
  },
  {
    name: "Proposal Sent",
    trigger: "proposal.sent",
    channel: "EMAIL" as const,
    subject: "Your Solution Map from Luke Hodges",
    body: `Hi {{firstName}},

Thanks for taking the time to walk me through your business — it was genuinely interesting.

I've put together a solution map based on everything we discussed. You'll find it attached, covering:

- The key problems we identified
- Recommended approach and timeline
- Investment breakdown

Take a look when you get a chance and let me know if you'd like to hop on a quick call to go through it together.

No rush — happy to work to your timeline.

All the best,
Luke`,
  },
  {
    name: "Invoice Sent",
    trigger: "invoice.sent",
    channel: "EMAIL" as const,
    subject: "Invoice from Luke Hodges Consulting",
    body: `Hi {{firstName}},

Please find your invoice attached.

Invoice #: {{invoiceNumber}}
Amount: {{amount}}
Due date: {{dueDate}}

Payment can be made via bank transfer using the details on the invoice.

If you have any questions, just reply to this email.

Thanks,
Luke`,
  },
  {
    name: "Review Request",
    trigger: "review.request",
    channel: "EMAIL" as const,
    subject: "How was working together?",
    body: `Hi {{firstName}},

Now that we've wrapped up, I'd love to hear how you found the experience of working together.

It only takes a minute and genuinely helps me improve:

{{reviewLink}}

Thanks for trusting me with this — it's been a pleasure.

Luke`,
  },
];

// ---------------------------------------------------------------------------
// Workflow definitions
// ---------------------------------------------------------------------------

const WORKFLOW_DEFS = [
  {
    name: "Outreach Sequence",
    description:
      "Automated cold email sequence: initial → 3 day wait → follow-up 1 → 4 day wait → follow-up 2 → 3 day wait → auto-LOST",
  },
  {
    name: "Discovery Prep",
    description:
      "When discovery call booked: send pre-discovery questionnaire form link",
  },
  {
    name: "Post-Audit Follow-up",
    description:
      "When stage moves to PROPOSAL: create draft invoice, start follow-up timer",
  },
  {
    name: "Deal Won Automation",
    description:
      "When stage moves to WON: create project with starter tasks, send invoice",
  },
  {
    name: "Engagement Complete",
    description:
      "When project completed: send review request, payment reminder if due",
  },
  {
    name: "Weekly Pipeline Digest",
    description:
      "Monday 8am: count customers per stage, send summary email",
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log(`\nSeeding consulting tenant: ${tenantId}\n`);

  // Verify tenant exists
  const [tenant] = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    console.error(`ERROR: Tenant ${tenantId} not found in database.`);
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // Services
  // -----------------------------------------------------------------------
  console.log("Services:");
  const existingServices = await db
    .select({ name: schema.services.name })
    .from(schema.services)
    .where(eq(schema.services.tenantId, tenantId));
  const existingServiceNames = new Set(existingServices.map((s) => s.name));

  for (const [i, svc] of SERVICE_DEFS.entries()) {
    if (existingServiceNames.has(svc.name)) {
      log(`SKIP (exists): ${svc.name}`);
      continue;
    }
    await db.insert(schema.services).values({
      id: uuid(),
      tenantId,
      name: svc.name,
      description: svc.description,
      durationMinutes: svc.durationMinutes,
      price: svc.price,
      active: true,
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    });
    log(`CREATED: ${svc.name}`);
  }

  // -----------------------------------------------------------------------
  // Form Templates
  // -----------------------------------------------------------------------
  console.log("\nForm Templates:");
  const existingForms = await db
    .select({ name: schema.formTemplates.name })
    .from(schema.formTemplates)
    .where(eq(schema.formTemplates.tenantId, tenantId));
  const existingFormNames = new Set(existingForms.map((f) => f.name));

  for (const [i, tmpl] of FORM_TEMPLATE_DEFS.entries()) {
    if (existingFormNames.has(tmpl.name)) {
      log(`SKIP (exists): ${tmpl.name}`);
      continue;
    }
    await db.insert(schema.formTemplates).values({
      id: uuid(),
      tenantId,
      name: tmpl.name,
      description: tmpl.description,
      fields: tmpl.fields,
      sendTiming: tmpl.sendTiming,
      isPublic: tmpl.isPublic,
      allowGuestAccess: tmpl.allowGuestAccess,
      active: true,
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    });
    log(`CREATED: ${tmpl.name}`);
  }

  // -----------------------------------------------------------------------
  // Message Templates
  // -----------------------------------------------------------------------
  console.log("\nMessage Templates:");
  const existingMessages = await db
    .select({ name: schema.messageTemplates.name })
    .from(schema.messageTemplates)
    .where(eq(schema.messageTemplates.tenantId, tenantId));
  const existingMessageNames = new Set(existingMessages.map((m) => m.name));

  for (const msg of MESSAGE_TEMPLATE_DEFS) {
    if (existingMessageNames.has(msg.name)) {
      log(`SKIP (exists): ${msg.name}`);
      continue;
    }
    await db.insert(schema.messageTemplates).values({
      id: uuid(),
      tenantId,
      name: msg.name,
      trigger: msg.trigger,
      channel: msg.channel,
      subject: msg.subject,
      body: msg.body,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    log(`CREATED: ${msg.name}`);
  }

  // -----------------------------------------------------------------------
  // Workflow Definitions
  // -----------------------------------------------------------------------
  console.log("\nWorkflow Definitions:");
  const existingWorkflows = await db
    .select({ name: schema.workflows.name })
    .from(schema.workflows)
    .where(eq(schema.workflows.tenantId, tenantId));
  const existingWorkflowNames = new Set(existingWorkflows.map((w) => w.name));

  for (const wf of WORKFLOW_DEFS) {
    if (existingWorkflowNames.has(wf.name)) {
      log(`SKIP (exists): ${wf.name}`);
      continue;
    }
    await db.insert(schema.workflows).values({
      id: uuid(),
      tenantId,
      name: wf.name,
      description: wf.description,
      enabled: false,
      isVisual: false,
      createdAt: now,
      updatedAt: now,
    });
    log(`CREATED: ${wf.name}`);
  }

  console.log("\nDone.\n");
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    client.end();
  });
