# Outreach Assembly Line v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CLI script that reads a lead CSV, fills industry-matched templates, polishes each email via Claude API, and outputs a local HTML page with mailto links — enabling 30 emails/day in under 10 minutes.

**Architecture:** Single standalone TypeScript script (`scripts/outreach-gen.ts`) with a JSON config file (`scripts/outreach-templates.json`). No Ironheart integration, no database, no framework dependencies. Outputs a self-contained HTML file to `tmp/`.

**Tech Stack:** TypeScript, `@anthropic-ai/sdk` (already installed), `tsx` (already used for scripts), Node built-in `fs` and `path`.

---

## File Structure

```
scripts/
  outreach-gen.ts           # Main CLI script — CSV parsing, template fill, AI polish, HTML generation
  outreach-templates.json   # Template config — case studies, industries, pain points
tmp/                        # Generated output directory (gitignored)
  outreach-YYYY-MM-DD.html  # Daily email review page
```

---

### Task 1: Add `tmp/` to `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add tmp/ to gitignore**

Add `tmp/` to the `.gitignore` file under the misc section:

```gitignore
# outreach output
tmp/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add tmp/ to gitignore for outreach output"
```

---

### Task 2: Create template config

**Files:**
- Create: `scripts/outreach-templates.json`

- [ ] **Step 1: Create the template config file**

Create `scripts/outreach-templates.json` with this exact content:

```json
{
  "defaults": {
    "senderName": "Luke",
    "senderTitle": "Computer Science student at the University of Bath",
    "signOff": "All the best,\nLuke",
    "maxChars": 650,
    "subject": "Quick question — {company}"
  },
  "caseStudies": {
    "healthcare-scheduling": {
      "summary": "Recently built a scheduling and capacity system for a healthcare provider managing staff across multiple sites",
      "result": "Cut their daily coordination time by about 8 hours a week"
    },
    "events-booking": {
      "summary": "Just finished a booking engine and back-office platform for an events company — scheduling, team management, customer portal",
      "result": "Cut their admin by about 10 hours a week"
    },
    "coffee-automation": {
      "summary": "Built an AI customer service agent for a coffee roaster — handles enquiries, bookings, and review management automatically",
      "result": "Freed up about 15 hours a week of staff time"
    },
    "ops-platform": {
      "summary": "Recently built an ops platform for an environmental brokerage company — document workflows, deadline tracking, audit trails across dozens of concurrent projects",
      "result": "Saved about 12 hours a week on admin"
    }
  },
  "industries": {
    "property": {
      "caseStudy": "ops-platform",
      "painPoints": [
        "managing listings and viewings across offices still runs on spreadsheets",
        "tenant onboarding and compliance docs involve more manual chasing than they should",
        "property management coordination still relies on email chains and shared drives"
      ]
    },
    "hospitality": {
      "caseStudy": "events-booking",
      "painPoints": [
        "multi-site staff scheduling and coordination still involves WhatsApp groups and spreadsheets",
        "reservation and event booking management eats more time than it should",
        "supplier management across locations still runs on email chains"
      ]
    },
    "construction": {
      "caseStudy": "ops-platform",
      "painPoints": [
        "project pipeline and subcontractor scheduling still lives in spreadsheets",
        "client approvals and sign-offs involve more manual steps than anyone would like",
        "compliance docs and job tracking across multiple sites still runs on workarounds"
      ]
    },
    "professional-services": {
      "caseStudy": "ops-platform",
      "painPoints": [
        "client onboarding and document collection still involves too much manual chasing",
        "cross-office coordination and handoffs rely on email chains",
        "compliance and deadline tracking still runs on spreadsheets"
      ]
    },
    "healthcare": {
      "caseStudy": "healthcare-scheduling",
      "painPoints": [
        "multi-practitioner scheduling still eats more time than it should",
        "patient intake and reminders involve manual follow-ups",
        "coordination across clinics or sites still relies on phone calls and shared calendars"
      ]
    },
    "recruitment": {
      "caseStudy": "events-booking",
      "painPoints": [
        "candidate pipeline and tracking still involves a fair few spreadsheets",
        "compliance and timesheet management still runs on manual processes",
        "client CRM and placement tracking relies on workarounds"
      ]
    },
    "education": {
      "caseStudy": "events-booking",
      "painPoints": [
        "parent comms and session bookings still involve more manual coordination than anyone would like",
        "staff scheduling across sites still runs on spreadsheets",
        "compliance docs and enrolment management still relies on workarounds"
      ]
    },
    "tech": {
      "caseStudy": "ops-platform",
      "painPoints": [
        "internal tooling problems that sit outside your core offering",
        "client delivery coordination still involves manual processes",
        "internal ops that could use a dedicated system rather than a workaround"
      ]
    },
    "saas": {
      "caseStudy": "ops-platform",
      "painPoints": [
        "customer onboarding still involves manual steps that don't scale",
        "internal ops processes still run on spreadsheets and workarounds",
        "reporting and data workflows still eat more time than they should"
      ]
    },
    "dental": {
      "caseStudy": "healthcare-scheduling",
      "painPoints": [
        "patient intake and appointment management still eats more time than it should",
        "review collection and follow-ups rely on manual processes",
        "reminders and scheduling coordination still runs on workarounds"
      ]
    },
    "fitness": {
      "caseStudy": "events-booking",
      "painPoints": [
        "member onboarding and retention follow-up still involves manual processes",
        "class scheduling and booking management eats more time than it should",
        "dormant member re-engagement still relies on spreadsheets"
      ]
    },
    "default": {
      "caseStudy": "events-booking",
      "painPoints": [
        "a process still held together with spreadsheets or workarounds",
        "manual coordination that eats more time than it should",
        "something that could use a proper system behind it"
      ]
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/outreach-templates.json
git commit -m "feat: add outreach template config with case studies and industry mappings"
```

---

### Task 3: Create the main outreach generation script

**Files:**
- Create: `scripts/outreach-gen.ts`

- [ ] **Step 1: Create `scripts/outreach-gen.ts`**

```typescript
/**
 * Outreach Assembly Line v1
 *
 * Reads a CSV of leads, fills industry-matched templates, polishes each email
 * via Claude API, and outputs a local HTML page with mailto links.
 *
 * Usage: npx tsx scripts/outreach-gen.ts <csv-file> [--dry-run] [--limit N] [--no-open]
 *
 * CSV columns: name, email, company, industry, detail (optional)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, basename } from "path";
import { execSync } from "child_process";
import Anthropic from "@anthropic-ai/sdk";
import templateConfig from "./outreach-templates.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Lead {
  name: string;
  email: string;
  company: string;
  industry: string;
  detail: string;
}

interface GeneratedEmail {
  lead: Lead;
  subject: string;
  body: string;
  wasPolished: boolean;
}

interface IndustryConfig {
  caseStudy: string;
  painPoints: string[];
}

interface CaseStudy {
  summary: string;
  result: string;
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(args: string[]): {
  csvPath: string;
  dryRun: boolean;
  limit: number;
  noOpen: boolean;
} {
  const positional: string[] = [];
  let dryRun = false;
  let limit = Infinity;
  let noOpen = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--limit") {
      const next = args[++i];
      if (!next || isNaN(Number(next))) {
        console.error("Error: --limit requires a number");
        process.exit(1);
      }
      limit = Number(next);
    } else if (arg === "--no-open") {
      noOpen = true;
    } else {
      positional.push(arg);
    }
  }

  if (positional.length === 0) {
    console.error(
      "Usage: npx tsx scripts/outreach-gen.ts <csv-file> [--dry-run] [--limit N] [--no-open]"
    );
    process.exit(1);
  }

  return { csvPath: positional[0], dryRun, limit, noOpen };
}

// ---------------------------------------------------------------------------
// CSV parsing (no external dependency — handles quoted fields)
// ---------------------------------------------------------------------------

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) {
    console.error("Error: CSV must have a header row and at least one data row");
    process.exit(1);
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] || "").trim();
    }
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

// ---------------------------------------------------------------------------
// Template filling
// ---------------------------------------------------------------------------

function getIndustryConfig(industry: string): IndustryConfig {
  const key = industry.toLowerCase().trim();
  const industries = templateConfig.industries as Record<string, IndustryConfig>;
  return industries[key] || industries["default"];
}

function getCaseStudy(key: string): CaseStudy {
  const studies = templateConfig.caseStudies as Record<string, CaseStudy>;
  return studies[key] || studies["events-booking"];
}

function fillTemplate(lead: Lead): { subject: string; body: string } {
  const industryConfig = getIndustryConfig(lead.industry);
  const caseStudy = getCaseStudy(industryConfig.caseStudy);

  // Pick a random pain point for variety
  const painPoint =
    industryConfig.painPoints[
      Math.floor(Math.random() * industryConfig.painPoints.length)
    ];

  // Build the industry-specific line using detail if available
  let industryLine: string;
  if (lead.detail) {
    industryLine = `${lead.detail} — I'd guess ${painPoint}.`;
  } else {
    industryLine = `Running ${lead.company} — I'd guess there's at least ${painPoint}.`;
  }

  const subject = templateConfig.defaults.subject.replace(
    "{company}",
    lead.company
  );

  const body = `Hi ${lead.name},

Luke here — I'm a ${templateConfig.defaults.senderTitle}.

${caseStudy.summary}. ${caseStudy.result}.

I'm curious. ${industryLine}

If there's something held together with workarounds, I'd be happy to take a look.

Worth a 15-minute coffee?

${templateConfig.defaults.signOff}`;

  return { subject, body };
}

// ---------------------------------------------------------------------------
// AI polish
// ---------------------------------------------------------------------------

async function polishEmail(
  client: Anthropic,
  body: string,
  lead: Lead
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 800,
    system: `You are Luke Hodges, a Computer Science student at the University of Bath who builds custom software for businesses.

Polish this cold outreach email. Rules:
- Keep it under 650 characters
- Keep the tone genuine, direct, and slightly informal — like a real person writing a real email
- Vary the phrasing so bulk emails don't read identically — change connecting words, sentence structure, the "I'm curious" transition
- Do NOT add fluff, compliments, or "I came across your company" type lines
- Do NOT use emojis, exclamation marks, or salesy language
- Keep the core structure: intro → case study → their pain → CTA
- Return ONLY the polished email body, nothing else — no subject line, no markdown formatting`,
    messages: [
      {
        role: "user",
        content: `Polish this email for ${lead.name} at ${lead.company} (${lead.industry}):\n\n${body}`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type === "text") {
    return block.text.trim();
  }
  return body; // fallback to unpolished
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

function generateMailtoLink(
  email: string,
  subject: string,
  body: string
): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function generateHTML(emails: GeneratedEmail[], date: string): string {
  const emailCards = emails
    .map(
      (e, i) => `
    <div class="card" id="card-${i}" data-index="${i}">
      <div class="card-header">
        <div class="lead-info">
          <span class="lead-num">#${i + 1}</span>
          <strong>${escapeHTML(e.lead.name)}</strong> — ${escapeHTML(e.lead.company)}
          <span class="tag">${escapeHTML(e.lead.industry)}</span>
          ${!e.wasPolished ? '<span class="tag tag-warn">unpolished</span>' : ""}
        </div>
        <div class="lead-email">${escapeHTML(e.lead.email)}</div>
      </div>
      <div class="card-subject"><strong>Subject:</strong> ${escapeHTML(e.subject)}</div>
      <div class="card-body" contenteditable="true" id="body-${i}">${escapeHTML(e.body)}</div>
      <div class="card-actions">
        <a class="btn btn-primary" id="mailto-${i}" href="${generateMailtoLink(e.lead.email, e.subject, e.body)}" onclick="updateMailto(${i})">Open in Outlook</a>
        <button class="btn btn-done" onclick="markDone(${i})">Done</button>
        <button class="btn btn-skip" onclick="markSkip(${i})">Skip</button>
      </div>
    </div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Outreach — ${date}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 24px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin-bottom: 4px; color: #fff; }
  .subtitle { color: #888; margin-bottom: 24px; font-size: 0.9rem; }
  .progress { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; gap: 24px; align-items: center; position: sticky; top: 0; z-index: 10; }
  .progress-stat { text-align: center; }
  .progress-stat .num { font-size: 1.5rem; font-weight: 700; color: #fff; }
  .progress-stat .label { font-size: 0.75rem; color: #888; text-transform: uppercase; }
  .progress-bar { flex: 1; height: 6px; background: #222; border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; background: #4ade80; border-radius: 3px; transition: width 0.3s; width: 0%; }
  .card { background: #141414; border: 1px solid #262626; border-radius: 8px; padding: 20px; margin-bottom: 12px; transition: opacity 0.3s; }
  .card.done { opacity: 0.3; }
  .card.skipped { opacity: 0.2; }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
  .lead-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .lead-num { color: #555; font-size: 0.85rem; }
  .lead-email { color: #888; font-size: 0.85rem; }
  .tag { background: #1e293b; color: #60a5fa; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
  .tag-warn { background: #422006; color: #fb923c; }
  .card-subject { color: #aaa; font-size: 0.85rem; margin-bottom: 8px; padding: 8px; background: #0d0d0d; border-radius: 4px; }
  .card-body { white-space: pre-wrap; font-size: 0.9rem; line-height: 1.6; padding: 12px; background: #0d0d0d; border: 1px solid #262626; border-radius: 4px; margin-bottom: 12px; min-height: 120px; outline: none; }
  .card-body:focus { border-color: #4ade80; }
  .card-actions { display: flex; gap: 8px; }
  .btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-size: 0.85rem; font-weight: 500; text-decoration: none; display: inline-block; text-align: center; }
  .btn-primary { background: #166534; color: #fff; }
  .btn-primary:hover { background: #15803d; }
  .btn-done { background: #1e293b; color: #94a3b8; }
  .btn-done:hover { background: #334155; }
  .btn-skip { background: #1c1917; color: #78716c; }
  .btn-skip:hover { background: #292524; }
</style>
</head>
<body>
<h1>Outreach — ${date}</h1>
<p class="subtitle">${emails.length} emails ready to send</p>

<div class="progress">
  <div class="progress-stat"><div class="num" id="done-count">0</div><div class="label">Sent</div></div>
  <div class="progress-stat"><div class="num" id="skip-count">0</div><div class="label">Skipped</div></div>
  <div class="progress-stat"><div class="num" id="remaining-count">${emails.length}</div><div class="label">Remaining</div></div>
  <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
</div>

${emailCards}

<script>
const STORAGE_KEY = 'outreach-${date}';
const total = ${emails.length};
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

// Restore state on load
Object.keys(state).forEach(idx => {
  const card = document.getElementById('card-' + idx);
  if (card && state[idx]) card.classList.add(state[idx]);
});
updateCounts();

function updateMailto(idx) {
  const bodyEl = document.getElementById('body-' + idx);
  const body = bodyEl.innerText;
  const link = document.getElementById('mailto-' + idx);
  const card = document.getElementById('card-' + idx);
  const email = card.querySelector('.lead-email').innerText;
  const subject = card.querySelector('.card-subject').innerText.replace('Subject: ', '');
  link.href = 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

function markDone(idx) {
  const card = document.getElementById('card-' + idx);
  card.classList.remove('skipped');
  card.classList.add('done');
  state[idx] = 'done';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateCounts();
}

function markSkip(idx) {
  const card = document.getElementById('card-' + idx);
  card.classList.remove('done');
  card.classList.add('skipped');
  state[idx] = 'skipped';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateCounts();
}

function updateCounts() {
  const done = Object.values(state).filter(s => s === 'done').length;
  const skipped = Object.values(state).filter(s => s === 'skipped').length;
  const remaining = total - done - skipped;
  document.getElementById('done-count').textContent = done;
  document.getElementById('skip-count').textContent = skipped;
  document.getElementById('remaining-count').textContent = remaining;
  document.getElementById('progress-fill').style.width = ((done / total) * 100) + '%';
}
</script>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Read and parse CSV
  const csvPath = resolve(args.csvPath);
  if (!existsSync(csvPath)) {
    console.error(`Error: File not found: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvContent);

  // Validate and convert to leads
  const leads: Lead[] = [];
  const skipped: string[] = [];

  for (const row of rows) {
    if (!row.name || !row.email) {
      skipped.push(row.email || row.name || "(empty row)");
      continue;
    }
    leads.push({
      name: row.name,
      email: row.email,
      company: row.company || "",
      industry: row.industry || "default",
      detail: row.detail || "",
    });
  }

  const toProcess = leads.slice(0, args.limit);
  console.log(
    `\n📋 ${toProcess.length} leads to process${skipped.length > 0 ? ` (${skipped.length} skipped — missing name/email)` : ""}\n`
  );

  // Fill templates
  const filledEmails = toProcess.map((lead) => {
    const { subject, body } = fillTemplate(lead);
    return { lead, subject, body };
  });

  // AI polish (or dry run)
  const results: GeneratedEmail[] = [];

  if (args.dryRun) {
    console.log("🏃 Dry run — skipping AI polish\n");
    for (const e of filledEmails) {
      results.push({ lead: e.lead, subject: e.subject, body: e.body, wasPolished: false });
      console.log(`  ✓ ${e.lead.name} (${e.lead.company})`);
    }
  } else {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error(
        "Error: ANTHROPIC_API_KEY not set. Set it in your environment or .env.local file."
      );
      console.error("Tip: use --dry-run to test without the API.\n");
      process.exit(1);
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    console.log("🤖 Polishing emails with Claude...\n");

    for (let i = 0; i < filledEmails.length; i++) {
      const e = filledEmails[i];
      process.stdout.write(
        `  [${i + 1}/${filledEmails.length}] ${e.lead.name} (${e.lead.company})...`
      );
      try {
        const polished = await polishEmail(client, e.body, e.lead);
        results.push({
          lead: e.lead,
          subject: e.subject,
          body: polished,
          wasPolished: true,
        });
        console.log(" ✓");
      } catch (err) {
        // Fallback to unpolished on API error
        results.push({
          lead: e.lead,
          subject: e.subject,
          body: e.body,
          wasPolished: false,
        });
        console.log(` ✗ (using unpolished — ${err instanceof Error ? err.message : "unknown error"})`);
      }
    }
  }

  // Generate HTML
  const date = new Date().toISOString().split("T")[0];
  const tmpDir = resolve(process.cwd(), "tmp");
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  const outputPath = resolve(tmpDir, `outreach-${date}.html`);
  const html = generateHTML(results, date);
  writeFileSync(outputPath, html, "utf-8");

  // Summary
  const polished = results.filter((r) => r.wasPolished).length;
  const unpolished = results.filter((r) => !r.wasPolished).length;
  console.log(`\n✅ Generated ${results.length} emails`);
  if (polished > 0) console.log(`   ${polished} polished by AI`);
  if (unpolished > 0) console.log(`   ${unpolished} unpolished (template only)`);
  if (skipped.length > 0) console.log(`   ${skipped.length} skipped: ${skipped.join(", ")}`);
  console.log(`\n📄 Output: ${outputPath}`);

  // Open in browser
  if (!args.noOpen) {
    try {
      const platform = process.platform;
      if (platform === "darwin") {
        execSync(`open "${outputPath}"`);
      } else if (platform === "linux") {
        execSync(`xdg-open "${outputPath}"`);
      } else if (platform === "win32") {
        execSync(`start "" "${outputPath}"`);
      }
    } catch {
      console.log("Could not auto-open browser. Open the file manually.");
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify the script compiles**

Run: `npx tsx --tsconfig tsconfig.json scripts/outreach-gen.ts 2>&1 | head -5`

Expected: Should show the usage error since no CSV was provided:

```
Usage: npx tsx scripts/outreach-gen.ts <csv-file> [--dry-run] [--limit N] [--no-open]
```

- [ ] **Step 3: Commit**

```bash
git add scripts/outreach-gen.ts
git commit -m "feat: add outreach assembly line script — CSV to mailto links via AI polish"
```

---

### Task 4: Create a sample CSV and test dry run

**Files:**
- Create: `tmp/sample-leads.csv` (not committed — for testing only)

- [ ] **Step 1: Create `tmp/` directory and sample CSV**

```bash
mkdir -p tmp
```

Then create `tmp/sample-leads.csv` with this content:

```csv
name,email,company,industry,detail
Paresh,test@example.com,Havana House,hospitality,10+ cigar shops from Bath to Windsor
Nick,test2@example.com,Berkeley Place,construction,Three offices — Bristol Bath and London
Sarah,test3@example.com,Richardson Swift,professional-services,Bath's largest independent accountants
Toby,test4@example.com,Talbot Clinic,dental,Independent dental practice
Amy,test5@example.com,Acme Corp,unknown,
```

- [ ] **Step 2: Run dry run to verify template filling**

Run: `npx tsx --tsconfig tsconfig.json scripts/outreach-gen.ts tmp/sample-leads.csv --dry-run --no-open`

Expected output should show:
- 5 leads processed
- 0 skipped
- "Dry run — skipping AI polish"
- An HTML file generated at `tmp/outreach-YYYY-MM-DD.html`

- [ ] **Step 3: Open the generated HTML file and verify**

Run: `open tmp/outreach-*.html` (on macOS)

Verify:
- 5 email cards are displayed
- Each card shows lead name, company, industry
- Email body is filled with the correct case study and pain point for each industry
- "Acme Corp" falls back to the default template
- Mailto links open Outlook with pre-filled fields
- Done/Skip buttons work
- Progress counter updates
- The "unpolished" tag appears on all cards (since dry run)

- [ ] **Step 4: Run with AI polish (limit 2) to test Claude API**

Run: `npx tsx --tsconfig tsconfig.json scripts/outreach-gen.ts tmp/sample-leads.csv --limit 2 --no-open`

Expected:
- 2 emails processed with Claude API
- Output shows "Polishing emails with Claude..."
- Each email shows "✓" when done
- Generated HTML shows polished text (will differ from template fill)

- [ ] **Step 5: Commit (no files to commit — tmp/ is gitignored, but verify everything works)**

```bash
git status
```

Expected: nothing to commit (sample CSV and HTML are in `tmp/` which is gitignored).

---

### Task 5: Add npm script shortcut

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the outreach script to package.json**

Add to the `"scripts"` section in `package.json`:

```json
"outreach": "tsx --tsconfig tsconfig.json scripts/outreach-gen.ts",
"outreach:dry": "tsx --tsconfig tsconfig.json scripts/outreach-gen.ts --dry-run"
```

- [ ] **Step 2: Test the shortcut**

Run: `npm run outreach -- tmp/sample-leads.csv --dry-run --no-open`

Expected: Same output as Task 4 Step 2.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add npm run outreach shortcut for assembly line script"
```

---

### Task 6: Final verification — full end-to-end run

- [ ] **Step 1: Run full pipeline with sample data**

Run: `npm run outreach -- tmp/sample-leads.csv --no-open`

Expected:
- All 5 leads processed
- Claude API polishes each email
- HTML file generated and all cards render correctly
- Mailto links work (open Outlook with pre-filled to/subject/body)
- Done/Skip/Progress all functional
- Editable email bodies update the mailto link when "Open in Outlook" is clicked

- [ ] **Step 2: Verify with a real Apollo export (if available)**

If you have a real CSV export from Apollo, rename columns to match `name,email,company,industry,detail` and run:

```bash
npm run outreach -- path/to/real-leads.csv --limit 5
```

Verify the emails match the quality and tone of your hand-written Berkeley Place emails.
