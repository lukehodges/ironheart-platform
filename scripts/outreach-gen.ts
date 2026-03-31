/**
 * Outreach Assembly Line
 *
 * Reads a CSV of leads, matches each to an industry template + case study,
 * fills a cold email template, polishes via Claude API, and generates a
 * self-contained HTML file with mailto links.
 *
 * Usage:
 *   npx tsx scripts/outreach-gen.ts <csv-file> [--dry-run] [--limit N] [--no-open]
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import Anthropic from "@anthropic-ai/sdk";
import config from "./outreach-templates.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Lead {
  name: string;
  email: string;
  company: string;
  industry: string;
  detail: string;       // woven into email body (manual CSV only)
  apolloMeta: string;   // shown on card for context, NOT in email (Apollo only)
}

interface GeneratedEmail {
  lead: Lead;
  subject: string;
  body: string;
  polished: boolean;
}

type IndustryKey = keyof typeof config.industries;
type CaseStudyKey = keyof typeof config.caseStudies;

// ---------------------------------------------------------------------------
// CSV Parser — handles quoted fields, commas inside quotes, escaped quotes
// ---------------------------------------------------------------------------

function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          fields.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseRow(lines[0]!).map((h) => h.toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]!);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]!] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Template filling
// ---------------------------------------------------------------------------

/** Map Apollo's verbose industry names to our template keys */
const APOLLO_INDUSTRY_MAP: Record<string, string> = {
  "real estate": "property",
  "architecture & planning": "construction",
  "construction": "construction",
  "hospitality": "hospitality",
  "leisure, travel & tourism": "hospitality",
  "events services": "hospitality",
  "food & beverages": "hospitality",
  "restaurants": "hospitality",
  "accounting": "professional-services",
  "financial services": "professional-services",
  "legal services": "professional-services",
  "management consulting": "professional-services",
  "professional training & coaching": "professional-services",
  "staffing & recruiting": "recruitment",
  "human resources": "recruitment",
  "information technology & services": "tech",
  "computer software": "tech",
  "internet": "tech",
  "marketing & advertising": "tech",
  "design": "tech",
  "media production": "tech",
  "health, wellness & fitness": "healthcare",
  "hospital & health care": "healthcare",
  "medical practice": "healthcare",
  "alternative medicine": "healthcare",
  "mental health care": "healthcare",
  "cosmetics": "healthcare",
  "education management": "education",
  "primary/secondary education": "education",
  "higher education": "education",
  "consumer services": "default",
  "defense & space": "default",
  "retail": "default",
};

function mapApolloIndustry(raw: string): string {
  const key = raw.toLowerCase().trim();
  return APOLLO_INDUSTRY_MAP[key] ?? key;
}

function matchIndustry(industry: string): IndustryKey {
  const key = industry.toLowerCase().replace(/\s+/g, "-") as IndustryKey;
  if (key in config.industries) return key;
  return "default";
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function buildEmail(lead: Lead): { subject: string; body: string } {
  const industryKey = matchIndustry(lead.industry);
  const industryConfig = config.industries[industryKey]!;
  const caseStudyKey = industryConfig.caseStudy as CaseStudyKey;
  const caseStudy = config.caseStudies[caseStudyKey]!;
  const painPoint = pickRandom(industryConfig.painPoints);

  const industryLine = lead.detail
    ? `${lead.detail} \u2014 I\u2019d guess ${painPoint}.`
    : `Running ${lead.company} \u2014 I\u2019d guess there\u2019s at least ${painPoint}.`;

  const body = [
    `Hi ${lead.name},`,
    "",
    `Luke here \u2014 I\u2019m a Computer Science student at the University of Bath.`,
    "",
    `${caseStudy.summary}. ${caseStudy.result}.`,
    "",
    `I\u2019m curious. ${industryLine}`,
    "",
    `If there\u2019s something held together with workarounds, I\u2019d be happy to take a look.`,
    "",
    `Worth a 15-minute coffee?`,
    "",
    config.defaults.signOff,
  ].join("\n");

  const subject = config.defaults.subject.replace("{company}", lead.company);

  return { subject: deAI(subject), body: deAI(body) };
}

/** Replace em dashes and smart quotes with plain equivalents */
function deAI(text: string): string {
  return text
    .replace(/\u2014/g, "-")  // em dash
    .replace(/\u2013/g, "-")  // en dash
    .replace(/[\u2018\u2019]/g, "'")  // smart single quotes
    .replace(/[\u201C\u201D]/g, '"');  // smart double quotes
}

// ---------------------------------------------------------------------------
// AI polish
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are Luke Hodges, a Computer Science student at the University of Bath who builds custom software for businesses.

Polish this cold outreach email. Rules:
- Keep it under 650 characters
- Keep the tone genuine, direct, and slightly informal \u2014 like a real person writing a real email
- Vary the phrasing so bulk emails don\u2019t read identically \u2014 change connecting words, sentence structure, the \u201cI\u2019m curious\u201d transition
- Do NOT add fluff, compliments, or \u201cI came across your company\u201d type lines
- Do NOT use emojis, exclamation marks, or salesy language
- Keep the core structure: intro \u2192 case study \u2192 their pain \u2192 CTA
- Return ONLY the polished email body, nothing else \u2014 no subject line, no markdown formatting`;

async function polishEmail(
  client: Anthropic,
  body: string,
): Promise<string | null> {
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: body }],
    });
    const block = response.content[0];
    if (block && block.type === "text") {
      return deAI(block.text.trim());
    }
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`  [warn] Claude API failed: ${msg} — using unpolished version`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

function generateHTML(emails: GeneratedEmail[], dateStr: string): string {
  const emailsJSON = JSON.stringify(
    emails.map((e, i) => ({
      id: i,
      name: e.lead.name,
      email: e.lead.email,
      company: e.lead.company,
      industry: e.lead.industry,
      apolloMeta: e.lead.apolloMeta,
      subject: e.subject,
      body: e.body,
      polished: e.polished,
    })),
  ).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Outreach — ${dateStr}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #111; color: #e0e0e0; padding: 24px; }
  h1 { font-size: 1.5rem; margin-bottom: 8px; color: #fff; }
  .subtitle { color: #888; margin-bottom: 24px; font-size: 0.9rem; }
  .progress-bar-container { background: #222; border-radius: 8px; height: 8px; margin-bottom: 8px; overflow: hidden; }
  .progress-bar { height: 100%; background: #4ade80; transition: width 0.3s; border-radius: 8px; }
  .stats { display: flex; gap: 16px; margin-bottom: 24px; font-size: 0.85rem; color: #aaa; }
  .stats span { display: inline-flex; align-items: center; gap: 4px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .dot-done { background: #4ade80; }
  .dot-skip { background: #f87171; }
  .dot-rem { background: #555; }
  .cards { display: flex; flex-direction: column; gap: 16px; }
  .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 20px; transition: opacity 0.3s; }
  .card.done { opacity: 0.4; border-color: #4ade80; }
  .card.skipped { opacity: 0.3; border-color: #f87171; }
  .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
  .card-meta { font-size: 0.85rem; }
  .card-meta .name { color: #fff; font-weight: 600; font-size: 1rem; }
  .card-meta .email { color: #888; }
  .card-meta .company { color: #aaa; }
  .card-meta .apollo-meta { color: #666; font-size: 0.8rem; margin-top: 2px; }
  .card-meta .tags { margin-top: 4px; }
  .tag { display: inline-block; background: #2a2a2a; color: #aaa; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-right: 4px; }
  .tag.polished { background: #1a3a1a; color: #4ade80; }
  .card-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #444; background: #222; color: #e0e0e0; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
  .btn:hover { background: #333; }
  .btn-primary { background: #2563eb; border-color: #2563eb; color: #fff; text-decoration: none; display: inline-flex; align-items: center; }
  .btn-primary:hover { background: #1d4ed8; }
  .btn-done { background: #166534; border-color: #166534; color: #fff; }
  .btn-skip { background: #7f1d1d; border-color: #7f1d1d; color: #fff; }
  .subject-line { font-size: 0.9rem; color: #ccc; margin-bottom: 8px; font-style: italic; }
  .email-body { background: #111; border: 1px solid #333; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 0.9rem; line-height: 1.6; color: #ddd; min-height: 120px; outline: none; }
  .email-body:focus { border-color: #2563eb; }
</style>
</head>
<body>
<h1>Outreach Assembly Line</h1>
<p class="subtitle">${dateStr} &mdash; ${emails.length} leads</p>
<div class="progress-bar-container"><div class="progress-bar" id="progressBar"></div></div>
<div class="stats">
  <span><span class="dot dot-done"></span> Done: <strong id="countDone">0</strong></span>
  <span><span class="dot dot-skip"></span> Skipped: <strong id="countSkip">0</strong></span>
  <span><span class="dot dot-rem"></span> Remaining: <strong id="countRem">${emails.length}</strong></span>
</div>
<div class="cards" id="cards"></div>

<script>
const EMAILS = ${emailsJSON};
const STORAGE_KEY = 'outreach-${dateStr}';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateStats(state) {
  let done = 0, skipped = 0;
  for (const id of Object.keys(state)) {
    if (state[id] === 'done') done++;
    if (state[id] === 'skipped') skipped++;
  }
  const rem = EMAILS.length - done - skipped;
  document.getElementById('countDone').textContent = done;
  document.getElementById('countSkip').textContent = skipped;
  document.getElementById('countRem').textContent = rem;
  const pct = EMAILS.length > 0 ? ((done + skipped) / EMAILS.length * 100) : 0;
  document.getElementById('progressBar').style.width = pct + '%';
}

function buildMailto(email, subject, bodyEl) {
  const body = bodyEl.innerText || bodyEl.textContent || '';
  return 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

function render() {
  const state = loadState();
  const container = document.getElementById('cards');
  container.innerHTML = '';

  EMAILS.forEach(function(em) {
    const card = document.createElement('div');
    card.className = 'card' + (state[em.id] === 'done' ? ' done' : '') + (state[em.id] === 'skipped' ? ' skipped' : '');
    card.id = 'card-' + em.id;

    const polishedTag = em.polished ? '<span class="tag polished">AI polished</span>' : '<span class="tag">unpolished</span>';

    card.innerHTML =
      '<div class="card-header">' +
        '<div class="card-meta">' +
          '<div class="name">' + escHtml(em.name) + '</div>' +
          '<div class="email">' + escHtml(em.email) + '</div>' +
          '<div class="company">' + escHtml(em.company) + ' &mdash; ' + escHtml(em.industry) + '</div>' +
          (em.apolloMeta ? '<div class="apollo-meta">' + escHtml(em.apolloMeta) + '</div>' : '') +
          '<div class="tags">' + polishedTag + '</div>' +
        '</div>' +
        '<div class="card-actions">' +
          '<a class="btn btn-primary" id="mailto-' + em.id + '" href="#" onmousedown="this.href=buildMailto(\\''+escJs(em.email)+'\\',\\''+escJs(em.subject)+'\\',document.getElementById(\\'body-'+em.id+'\\'))" target="_blank">Open in Outlook</a>' +
          '<button class="btn btn-done" onclick="markCard('+em.id+',\\'done\\')">Done</button>' +
          '<button class="btn btn-skip" onclick="markCard('+em.id+',\\'skipped\\')">Skip</button>' +
        '</div>' +
      '</div>' +
      '<div class="subject-line">Subject: ' + escHtml(em.subject) + '</div>' +
      '<div class="email-body" contenteditable="true" id="body-' + em.id + '">' + escHtml(em.body) + '</div>';

    container.appendChild(card);
  });

  updateStats(state);
}

function escHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function escJs(s) {
  return s.replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'").replace(/"/g,'\\\\"');
}

function markCard(id, status) {
  var state = loadState();
  if (state[id] === status) { delete state[id]; }
  else { state[id] = status; }
  saveState(state);
  var card = document.getElementById('card-' + id);
  card.className = 'card' + (state[id] === 'done' ? ' done' : '') + (state[id] === 'skipped' ? ' skipped' : '');
  updateStats(state);
}

render();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  const dryRun = args.includes("--dry-run");
  const noOpen = args.includes("--no-open");
  let limit = Infinity;
  const limitIdx = args.indexOf("--limit");
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    limit = parseInt(args[limitIdx + 1]!, 10);
    if (isNaN(limit) || limit < 1) {
      console.error("Error: --limit must be a positive integer");
      process.exit(1);
    }
  }

  // Find CSV path (first non-flag argument)
  const csvPath = args.find(
    (a) => !a.startsWith("--") && (limitIdx === -1 || a !== args[limitIdx + 1]),
  );

  if (!csvPath) {
    console.error(
      "Usage: npx tsx scripts/outreach-gen.ts <csv-file> [--dry-run] [--limit N] [--no-open]",
    );
    console.error("");
    console.error("  <csv-file>   CSV with columns: name, email, company, industry, detail");
    console.error("  --dry-run    Skip Claude API calls, use unpolished templates");
    console.error("  --limit N    Process only first N leads");
    console.error("  --no-open    Don't open the HTML file in the browser");
    process.exit(1);
  }

  // Load .env.local for ANTHROPIC_API_KEY if not already set
  if (!process.env.ANTHROPIC_API_KEY) {
    try {
      const dotenv = await import("dotenv");
      const envPath = path.resolve(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
      }
    } catch {
      // dotenv not available, that's fine
    }
  }

  if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY is required.");
    console.error("Set it in your environment or in .env.local");
    console.error("Use --dry-run to skip AI polishing.");
    process.exit(1);
  }

  // Read and parse CSV
  const resolvedPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: CSV file not found: ${resolvedPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolvedPath, "utf-8");
  const rows = parseCSV(raw);
  console.log(`Parsed ${rows.length} rows from ${path.basename(resolvedPath)}`);

  // Detect CSV format (Apollo vs simple) and map to leads
  const isApollo = rows.length > 0 && "first name" in rows[0]! && "company name" in rows[0]!;
  if (isApollo) console.log("Detected Apollo export format");

  const leads: Lead[] = [];
  for (const row of rows) {
    let name: string, email: string, company: string, industry: string, detail: string;

    let apolloMeta = "";

    if (isApollo) {
      name = row["first name"] ?? "";
      email = row["email"] ?? "";
      company = row["company name"] ?? "";
      industry = mapApolloIndustry(row["industry"] ?? "");
      detail = ""; // Apollo doesn't have manual detail - use company name in email
      const employees = row["# employees"] ?? "";
      const title = row["title"] ?? "";
      const city = row["city"] ?? "";
      const keywords = row["keywords"] ?? "";
      const website = row["website"] ?? "";
      // Build context string for the review card (not the email)
      const parts: string[] = [];
      if (title) parts.push(title);
      if (employees && employees !== "1") parts.push(`${employees} employees`);
      if (city) parts.push(city);
      // Only show first 3 keywords to keep meta readable
      if (keywords) parts.push(keywords.split(",").slice(0, 3).map(k => k.trim()).join(", "));
      if (website) parts.push(website);
      apolloMeta = parts.join(" | ");
    } else {
      name = row["name"] ?? "";
      email = row["email"] ?? "";
      company = row["company"] ?? "";
      industry = row["industry"] ?? "";
      detail = row["detail"] ?? "";
    }

    if (!name || !email) {
      continue;
    }

    leads.push({ name, email, company, industry, detail, apolloMeta });
  }

  const toProcess = leads.slice(0, limit);
  console.log(`Processing ${toProcess.length} leads${dryRun ? " (dry run)" : ""}\n`);

  // Build and optionally polish emails
  let client: Anthropic | null = null;
  if (!dryRun && process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  const emails: GeneratedEmail[] = [];

  for (const lead of toProcess) {
    const { subject, body } = buildEmail(lead);
    console.log(`  ${lead.name} (${lead.company})`);

    let finalBody = body;
    let polished = false;

    if (client) {
      const result = await polishEmail(client, body);
      if (result) {
        finalBody = result;
        polished = true;
        console.log(`    -> polished (${finalBody.length} chars)`);
      } else {
        console.log(`    -> unpolished (fallback)`);
      }
    } else {
      console.log(`    -> unpolished (dry run)`);
    }

    emails.push({ lead, subject, body: finalBody, polished });
  }

  // Generate HTML
  const dateStr = new Date().toISOString().split("T")[0]!;
  const html = generateHTML(emails, dateStr);

  const tmpDir = path.resolve(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const outPath = path.join(tmpDir, `outreach-${dateStr}.html`);
  fs.writeFileSync(outPath, html, "utf-8");
  console.log(`\nGenerated: ${outPath}`);
  console.log(`  ${emails.length} emails (${emails.filter((e) => e.polished).length} polished)`);

  // Open in browser
  if (!noOpen) {
    try {
      const platform = process.platform;
      if (platform === "darwin") {
        execSync(`open "${outPath}"`);
      } else if (platform === "linux") {
        execSync(`xdg-open "${outPath}"`);
      } else if (platform === "win32") {
        execSync(`start "" "${outPath}"`);
      }
      console.log("  Opened in browser");
    } catch {
      console.log("  Could not open browser automatically");
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
