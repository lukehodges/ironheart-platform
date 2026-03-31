# Outreach Assembly Line v1 — Design Spec

**Date:** 2026-03-31
**Author:** Luke Hodges + Claude
**Status:** Approved

---

## Problem

Luke has a proven cold email template (10-17% reply rate) but can't consistently hit 30 emails/day because the manual process — researching, writing, personalising, sending — takes too long. The bottleneck is friction, not strategy.

## Solution

A single CLI script that reads a CSV of leads, fills industry-matched templates, polishes each email with Claude API, and outputs a local HTML page with mailto links. Daily workflow takes 5 minutes instead of 2 hours.

## Daily Workflow

```
1. Export ~30 leads from Apollo → CSV (or maintain a running CSV)
2. Run: npx tsx scripts/outreach-gen.ts leads.csv
3. Browser opens with 30 draft emails
4. Click mailto link → Outlook opens with pre-filled email → send → next
5. Done in ~5 minutes
```

## Components

### 1. Lead CSV Format

User-maintained CSV (from Apollo export or manual). Columns:

| Column | Required | Description |
|--------|----------|-------------|
| `name` | Yes | Contact first name (or full name) |
| `email` | Yes | Contact email address |
| `company` | Yes | Company name |
| `industry` | Yes | Industry/sector — must match a template key |
| `detail` | No | Extra context e.g. "10 locations", "3 offices", "est. 1996" |

### 2. Template Bank — `scripts/outreach-templates.json`

A JSON config file mapping industries to templates and case studies. Structure:

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
      "summary": "Built a scheduling and capacity system for a healthcare provider managing staff across multiple sites",
      "result": "Cut their daily coordination time by about 8 hours a week"
    },
    "events-booking": {
      "summary": "Built a booking engine and back-office platform for an events company — scheduling, team management, customer portal",
      "result": "Cut their admin by about 10 hours a week"
    },
    "coffee-automation": {
      "summary": "Built an AI customer service agent for a coffee roaster — handles enquiries, bookings, and review management automatically",
      "result": "Freed up about 15 hours a week of staff time"
    }
  },
  "industries": {
    "property": {
      "caseStudy": "healthcare-scheduling",
      "painPoints": [
        "managing listings and viewings across offices",
        "tenant onboarding and compliance docs",
        "property management still running on spreadsheets"
      ]
    },
    "hospitality": {
      "caseStudy": "events-booking",
      "painPoints": [
        "multi-site staff scheduling and coordination",
        "reservation and event booking management",
        "supplier management across locations"
      ]
    },
    "construction": {
      "caseStudy": "healthcare-scheduling",
      "painPoints": [
        "project pipeline and subcontractor scheduling",
        "client approvals and sign-offs",
        "compliance docs and job tracking"
      ]
    },
    "professional-services": {
      "caseStudy": "events-booking",
      "painPoints": [
        "client onboarding and document collection",
        "cross-office coordination and handoffs",
        "compliance and deadline tracking"
      ]
    },
    "healthcare": {
      "caseStudy": "healthcare-scheduling",
      "painPoints": [
        "multi-practitioner scheduling",
        "patient intake and reminders",
        "coordination across clinics or sites"
      ]
    },
    "recruitment": {
      "caseStudy": "events-booking",
      "painPoints": [
        "candidate pipeline and tracking",
        "compliance and timesheet management",
        "client CRM and placement tracking"
      ]
    },
    "default": {
      "caseStudy": "events-booking",
      "painPoints": [
        "a process still held together with spreadsheets or workarounds",
        "manual coordination that eats more time than it should",
        "something that could use a proper system"
      ]
    }
  }
}
```

If the `industry` value in the CSV doesn't match a key, fall back to `"default"`.

### 3. Template Format

The base template follows the proven Berkeley Place structure:

```
Hi {name},

Luke here — I'm a Computer Science student at the University of Bath.

{case_study_summary}. {case_study_result}.

I'm curious. {industry_specific_line}

If there's something held together with workarounds, I'd be happy to take a look.

Worth a 15-minute coffee? {location_line}

All the best,
Luke
```

The `{industry_specific_line}` is constructed from the lead's `company`, `detail`, and one of the `painPoints` for their industry. Example: "Running 10+ cigar shops from Bath to Windsor — I'd guess there's at least one process in there that still runs on WhatsApp groups or shared spreadsheets."

### 4. AI Polish Step

Each filled template is sent to Claude API (claude-sonnet-4-5-20250514 for speed/cost) with this system prompt:

```
You are Luke Hodges, a Computer Science student at the University of Bath who builds custom software for businesses.

Polish this cold outreach email. Rules:
- Keep it under 650 characters
- Keep the tone genuine, direct, and slightly informal — like a real person writing a real email
- Vary the phrasing so bulk emails don't read identically — change connecting words, sentence structure, the "I'm curious" transition
- Do NOT add fluff, compliments, or "I came across your company" type lines
- Do NOT use emojis, exclamation marks, or salesy language
- Keep the core structure: intro → case study → their pain → CTA
- The {detail} field contains context about the business — weave it in naturally if it adds value, ignore it if it doesn't
- Return ONLY the polished email body, nothing else
```

### 5. Review + Send Page — `tmp/outreach-YYYY-MM-DD.html`

A self-contained HTML file (no external dependencies) that opens in the browser. Contains:

**Header:**
- Date and count: "30 March 2026 — 30 emails"
- Progress counter: "0/30 sent"

**Per email card:**
- Lead info: name, company, industry, email
- The polished email text displayed in a readable format
- An "Edit" button that makes the email text editable inline (contenteditable)
- A **mailto link button** labelled "Open in Outlook" — clicking it opens: `mailto:{email}?subject={subject}&body={url_encoded_body}`
- A "Done" checkbox — checking it greys out the card, updates the progress counter
- A "Skip" button — greys it out without marking as done

**Footer:**
- "Copy remaining emails" button — copies all un-done email addresses as comma-separated list
- Simple stats: total, done, skipped, remaining

The page uses localStorage keyed by date so progress persists if you close the tab.

### 6. Script — `scripts/outreach-gen.ts`

Single TypeScript file. Dependencies: `@anthropic-ai/sdk`, `csv-parse` (or manual CSV parsing).

```
Usage: npx tsx scripts/outreach-gen.ts <csv-file> [--dry-run] [--limit N] [--no-open]

Arguments:
  csv-file       Path to leads CSV
  --dry-run      Show template fills without calling Claude API
  --limit N      Process only first N leads (default: all)
  --no-open      Don't auto-open the HTML file in browser
```

**Flow:**
1. Read and parse CSV
2. For each lead:
   a. Match industry → template config (or default)
   b. Pick case study from config
   c. Fill template variables
   d. Send to Claude API for polish
   e. Collect result
3. Generate HTML file with all emails
4. Write to `tmp/outreach-YYYY-MM-DD.html`
5. Open in default browser

**Error handling:**
- Skip leads with missing `name` or `email`, log warning
- If Claude API fails for a lead, use the unpolished template fill as fallback
- Log summary at end: "30 processed, 0 skipped, 0 API errors"

**Rate limiting:**
- Process Claude API calls sequentially (no need for parallelism at 30 emails)
- ~2 seconds per call = ~1 minute total for 30 emails

### 7. Environment

Requires `ANTHROPIC_API_KEY` in environment (or `.env` file).

## File Structure

```
scripts/
  outreach-gen.ts           # Main script
  outreach-templates.json   # Template + case study config
tmp/
  outreach-YYYY-MM-DD.html  # Generated daily output (gitignored)
```

## What This Does NOT Do

- No automated lead sourcing (you export from Apollo manually)
- No reply tracking or CRM integration
- No Ironheart integration (that comes later)
- No Instantly/SMTP sending (uni email security prevents it)
- No follow-up sequences (v1 is first-touch only)
- No deduplication (you manage that in your CSV/Apollo)

## Success Criteria

- You can go from "CSV of 30 leads" to "30 emails sent from Outlook" in under 10 minutes
- Emails match the quality and tone of your hand-written Berkeley Place emails
- You actually use it daily

## Future (v2+)

- Integrate into Ironheart outreach module (track sends, replies, conversions)
- Add follow-up sequence generation
- Apollo API integration for automated lead sourcing
- Sending infrastructure (multiple domains via Instantly) for higher volume
- AI reply classification
