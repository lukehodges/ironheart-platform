# AI Vision Mockups — Design

**Date**: 2026-03-09
**Status**: Approved
**Purpose**: Per-phase pitch deck mockups showing the AI-native platform vision to CEO-level clients. One page per phase (A→B→C→D→F) showing cumulative product state at that phase, plus a landing page and infrastructure diagram.

---

## Overview

Seven new pages under `/admin/brokerage-mockups/ai-assistant/`:

```
page.tsx                  ← Landing: phase timeline + infrastructure thumbnail
phase-a/page.tsx          ← Read-only Intelligence
phase-b/page.tsx          ← Actionable Agent
phase-c/page.tsx          ← Workflow Intelligence
phase-d/page.tsx          ← Memory & Context
phase-f/page.tsx          ← Autonomous Operations
infrastructure/page.tsx   ← Architecture diagram
```

The existing `page.tsx` (current AI assistant mockup) is replaced by the landing page. Each phase page shows the cumulative product state at that phase — not just deltas.

---

## Landing Page (`/ai-assistant`)

### Layout
- Full-width horizontal phase timeline with 5 phase cards (A → B → C → D → F)
- Below: capability heatmap (6 capability rows × 5 phases)
- Below: infrastructure diagram thumbnail linking to `/infrastructure`

### Phase Cards
Each card contains:
- Phase letter + title (e.g. "Phase A — Read-only Intelligence")
- Status badge: **Live** · **In Development** · **Planned Q2** · **Planned Q3**
- 2-line tagline
- Expandable "Learn more" section: 3 deliverables + link to phase preview

### Before/After Strip
Horizontal comparison strip between timeline and heatmap:
- "Without Ironheart: 45 min manual analysis | Phase A: 2.3 seconds | Phase F: 0 seconds (overnight)"
- Anchors the value proposition before the CEO clicks into any phase

### Capability Heatmap
6 capability rows × 5 phases grid. Cells fill progressively left-to-right:
- Rows: Read & Reason · Approve & Act · Workflow Intelligence · Memory & Context · Autonomous Operations · Cross-vertical Scale
- Cells: empty (grey) → unlocking (yellow) → live (green)

### Graceful Degradation for Planned Phases
Clicking a "Planned" phase card opens a modal:
- Phase title + "Coming [Q2/Q3] 2026"
- What it unlocks (3 bullet points)
- CTA: "In the meantime, here's what Phase A/B can do today" with link

---

## Phase A — Read-only Intelligence

### Script
**User query**: "Which BNG sites near the Solent have the most unallocated biodiversity units and which developers could they serve?"

Demonstrates: multi-table reasoning, no mutations, streaming tool calls, entity card results.

### Layout: 3-column (left 40% chat, right 60% split into panels)

### Chat Panel
**Streaming cascade** (visible step-by-step):
```
Status:      "Searching BNG sites in Solent catchment..."
Tool call:   sites.list({ region: "Solent", limit: 100 })
Tool result: "✓ Found 47 habitat sites"
Status:      "Calculating unallocated units..."
Tool call:   sites.calculateUnallocated({ siteIds: [...] })
Tool result: "✓ Ranked by HU surplus"
Status:      "Matching to active developer requirements..."
Tool call:   deals.list({ status: "active", catchment: "Solent" })
Tool result: "✓ Found 12 matching requirements"
Response:    Rich narrative + 3 site entity cards
```

**Site entity cards** in response:
- Site name + BGS reference
- Total area (ha) / baseline HUs / improvement HUs
- Unallocated HU count (highlighted)
- Nearest matching developer (distance + project name)
- "View site →" link

**Phase B teaser** (greyed out approval card at bottom of chat):
```
┌ [Locked — Phase B] ──────────────────────┐
│ Approve: Create quote for Manor Fields   │
│ Taylor Wimpey · 30 units · £90,000       │
│ [Approve] [Edit] [Reject]                │
│ Unlocks in Phase B →                     │
└──────────────────────────────────────────┘
```

**Edge case shown**: Tool timeout mid-reasoning:
- "The availability service is taking longer than expected. Let me try a narrower query..."
- Agent retries with tighter parameters, succeeds

### Right Panels
- **Session list**: Last 5 conversations with timestamps and summaries
- **Tool call audit log**: This session's tool invocations (name, input summary, ✓ result)
- **Token usage bar**: 12,400 / 50,000 session tokens (with 80%/95% warning states shown)

---

## Phase B — Actionable Agent

### Script
Morning compliance check → agent drafts reminder → CONFIRM approval card → user clicks Edit → modifies message → Approves → trust ratchet notification.

### Layout: 3-column (same structure as Phase A, panels evolve)

### Chat Panel
**Conversation**:
1. Agent morning message: 3 compliance items flagged, one ready to action
2. Agent: "Whiteley Farm (S-0001) is 7 days overdue. I've drafted a reminder to Tom Jenkins — approve to send?"
3. **CONFIRM approval card** appears inline:
   ```
   ┌─ ACTION REQUIRES APPROVAL ───────────────┐
   │ Send Compliance Reminder                 │
   │ To: Tom Jenkins (tom@whiteleyfarm.co.uk) │
   │ Re: Annual Habitat Monitoring Report     │
   │ Site: Whiteley Farm (S-0001)             │
   │                                          │
   │ ⏱ Expires in 28m 15s                    │
   │                                          │
   │ [Approve] [Edit] [Reject]                │
   │ [Why did you draft this? ↓]              │
   └──────────────────────────────────────────┘
   ```
4. User clicks "Edit" → parameters expand in-card (email body editable, CC field, send time)
5. User approves → confirmation: "✅ Reminder sent to Tom Jenkins via email and SMS"
6. Undo affordance: "[Undo — available until 9pm]"

**"Why did you draft this?" expands**:
- Reasoning: compliance deadline 7 days ago → NE registry requirement → Tom Jenkins is assigned → email template pre-filled from HMMP records
- Historical precedent: "You've approved 47/50 similar reminders (94%)"

**Trust ratchet notification** (toast, non-blocking):
```
✨ Suggested automation
Your team has approved "Send Compliance Reminder" 47/50 times.
Would you like the agent to send these automatically?
[Yes, automate] [Keep reviewing] [Remind me later]
```

**Edge case shown**: Rejection with feedback:
- User rejects quote creation → reason form appears (checkboxes: price too high / risk profile / other)
- Agent: "Understood — I've recorded that first-time supplier quotes need more conservative pricing."

### Right Panels
- **Approval queue**: 3 pending approvals with countdown timers + preview links
- **Autonomous actions log**: Last 7 days AUTO-tier actions (green checkmarks)
- **Undo stack**: Last 5 approved actions with reversibility windows

---

## Phase C — Workflow Intelligence

### Script
User types natural language → agent asks clarifying question → generates workflow → inline preview → full graph in right panel.

### Layout: 3-column with workflow graph preview panel

### Chat Panel
**Conversation**:
1. User: "When a deal reaches ALLOCATED, check compliance and block if documents are missing"
2. Agent: "I need to clarify: which documents are critical? I'm thinking habitat management plan, 30-year monitoring agreement, and Natural England registration. Is that the full set?"
3. User: "Yes, exactly those three."
4. Agent generates workflow preview inline (compact node diagram):
   ```
   [TRIGGER: deal/status → ALLOCATED]
          ↓
   [AI_DECISION: check 3 compliance docs]
     ├─ [passed] → [UPDATE_DEAL: unblock]
     └─ [missing] → [SEND_NOTIFICATION: admin]
                  → [STOP]
   ```
5. "I've built this workflow. Preview it in full detail →"
6. Full workflow graph appears in right panel

**What-if simulator** (shown as second conversation turn):
- User: "What if I tightened compliance to 4 documents?"
- Agent: "Replaying the last 30 days through the new rules... 12 deals would have been blocked instead of 2. That's 10 more escalations per month."

**Edge case shown**: Cycle detection:
- Agent: "This creates a circular dependency — your workflows would loop. I've highlighted the conflict. How would you like to break it?"

### Right Panels (tabbed)
- **Tab 1 — Workflow Preview**: Full visual graph of the generated workflow (node types colour-coded: trigger=blue, decision=orange/gold AI icon, action=green, stop=grey)
- **Tab 2 — Active Automations**: List of active workflows, those with AI nodes highlighted with ⚡ icon

---

## Phase D — Memory & Context

### Script
Cross-session opener → knowledge base citations inline → correction conflict detection → memory layers panel.

### Layout: 3-column with memory-specific right panels

### Chat Panel
**Cross-session opener** (first message):
"Welcome back. Last week you were evaluating Deal D-0089 for Bellway Homes — we identified 3 Solent sites with matching supply. Want to continue from where we left off?"

**Knowledge base citations** embedded in responses:
```
"Based on your uploaded S106 template v4 and Natural England Discretionary
Advice Guidelines (Section 3.2)..."

  ▸ Cited: S106 Template v4.pdf · Chunk 12 · 94% match
  ▸ Cited: NE DAS Guidelines 2024 · Section 3.2 · 87% match
```

**Conflict detection outlier** (shown mid-conversation):
```
⚠ Learned Rule Conflict
You said: "Never suggest spreadsheet habitat for Solent sites."
This conflicts with Rule 12: "Spreadsheet OK if NE pre-approval obtained"

4 live deals used Rule 12:
• Deal D-0089 (Bellway Homes) — 15 units
• Deal D-0094 (Taylor Wimpey) — 22 units
• Deal D-0076 — archive
• Deal D-0102 — draft

[Update all 4]  [Keep Rule 12]  [Review each]
```

**RAG conflict edge case**:
Agent: "I found two conflicting sources on Solent phosphorus standards. I'm showing you both — you'll need to tell me which is current."

### Right Panels
- **Memory layers visualisation**: Three stacked boxes (Redis hot cache / PG episodic / pgvector semantic) with token counts and refresh cadence
- **Corrections learned**: Last 5 rules with who taught them, how many times applied, confidence level
- **Knowledge base status**: Documents indexed, chunk count, last updated, retrieval test link

---

## Phase F — Autonomous Operations

### Script
App opens at 8am → morning briefing as first chat message → overnight timeline visible in right panel → Ghost Operator error surfaced transparently.

### Layout: 3-column with ghost operator right panels

### Chat Panel
**Morning briefing** (auto-loaded as first message):
```
🌅 Good morning. Here's what your Ghost Operator handled overnight.

COMPLETED AUTONOMOUSLY (11pm–7am)
✓ Confirmed 3 booking requests (high-trust customers, within auto-rules)
✓ Published 1 five-star review (above auto-publish threshold)
✓ Processed invoice — Greenfield Estates £12,400
  Deal D-0089 moved to AWAITING_TERMS

NEEDS YOUR ATTENTION
⚠ Review draft response to 3-star review — Thames Valley Council
  [Review before publishing →]

⚠ Deal D-0089 aging: 31 days in LEGAL_IN_PROGRESS (avg: 14)
  Your legal team may need a nudge. [Create task →]

⚠ At 3:14am I sent a booking confirmation to the wrong contact.
  I caught and corrected it at 3:17am. No customer was affected.
  [See what happened →]  [What I've learned from this →]

TODAY'S SCHEDULE
4 site assessments, 2 compliance reviews. No conflicts.
```

**Ghost Operator error card** (shows when user clicks "See what happened"):
```
Error at 3:14am: Sent confirmation to wrong contact
Confidence at time of action: 67% (below my usual threshold of 85%)
I sent anyway because: deadline pressure on D-0089

What I did: Revoked the email at 3:17am, sent correct version at 3:18am
Customer impact: None — customer hadn't opened the original

What I've learned: I've added a contact-name verification step before
sending high-value confirmations. This won't happen again.
```

### Right Panels
- **Overnight timeline**: Horizontal scrubable timeline (11pm–7am), Ghost Operator actions as colour-coded blocks (green=auto-approved, amber=queued for morning review, red=self-corrected error). Hover shows what the Ghost was doing at each moment.
- **Ghost Operator confidence gauge**: Radial gauge showing 96.4% accuracy over 1,847 decisions. Trend sparkline for last 30 days.
- **Compliance copilot**: Running list of compliance gaps across all active deals (sorted by risk level, each clickable)

---

## Infrastructure Diagram (`/infrastructure`)

### Section 1 — AI Agent Architecture (top ~60%)
**Style**: Dark background, swim-lane diagram, high-contrast accent colours.

**Swim lanes** (left-to-right flow):
1. **User** → sends chat message, sees streaming events, approves actions
2. **tRPC + Next.js** → receives message, injects page context, streams SSE
3. **Trigger.dev** → runs agent task, emits Realtime events, manages approval wait tokens
4. **Claude (Anthropic API)** → ReAct loop: context assembled → two-phase tool selection → tool calls → results → response
5. **Module Tool Registry** → 150+ tools from 7 modules, filtered by permission + intent
6. **Data layer** → PostgreSQL (deals, sites, conversations, actions), Redis (session cache), pgvector (knowledge chunks)

**Insets**:
- **Approval gate branch**: CONFIRM-tier tool → `wait.forToken()` → approval card sent to user → user approves → execution resumes
- **Memory layers**: Stacked visual (Redis hot / PG episodic / pgvector semantic)
- **Trust ratchet micro-diagram**: Tool promotion journey (CONFIRM → 94% acceptance → AUTO suggestion) and demotion (rejection spike → back to CONFIRM)
- **Fail-safe branches**: Orange paths showing graceful degradation (tool timeout → retry → exclude; budget exhaustion → halt + partial result; malformed LLM → 3 self-correction attempts → halt)

**Colour coding**:
- Approval tiers: green (auto) / yellow (confirm) / red (escalate)
- Module colours: sites=blue, deals=purple, matching=teal, compliance=orange, workflow=green, team=magenta

### Section 2 — How This Powers BNG (bottom ~40%)
Traces one end-to-end BNG flow through the infrastructure:

**Flow**: Developer submits 30-unit requirement → agent matches to 3 Solent sites (parcel-level allocation logic) → draft quote created → deal enters pipeline → compliance copilot monitors stage transitions → Ghost Operator processes invoice overnight → morning briefing surfaces the closed deal.

**Callouts**:
- "Parcel-level allocation: units link to specific habitat parcels, not just totals"
- "Multi-tenant: every tool call includes tenantId — no data leakage between brokerages"
- "Cross-vertical: same infrastructure runs for Nutrient Credits, Carbon, Real Estate, Energy"

---

## Navigation Changes
- Add landing page link in brokerage-mockups sidebar nav: "AI Platform Vision"
- Each phase page has: breadcrumb (Dashboard → AI Platform Vision → Phase X), back/next phase navigation buttons
- Infrastructure page linked from landing page thumbnail and phase page footers

---

## Design System
- Reuse existing brokerage-mockup components (Card, Badge, Button, Separator, Avatar)
- New components needed: ApprovalCard, StreamingToolCall, EntityCard, WorkflowGraphPreview, OvernightTimeline, MemoryLayersPanel, ArchitectureDiagram (SVG)
- All data is static mock data — no real API calls
- Dark diagram on infrastructure page uses inline SVG or a CSS-only node graph
