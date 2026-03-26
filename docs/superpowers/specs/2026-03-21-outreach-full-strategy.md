# Outreach Full Strategy — Module Expansion, Infrastructure & Self-Marketing Flywheel

> Compiled 2026-03-21. Covers three streams: (1) expanding the outreach module from mockup to full suite, (2) email infrastructure and tooling decisions, (3) using the platform to market itself.

---

## Part 1: Module Expansion — From Mockup to Full Suite

### Current State

The `/admin/outreach` page has three views backed by mock data:
- **Today**: Due contacts queue, recent replies, progress ring, sequence mini-table
- **Sequences**: Cards with status bars, A/B spotlight with confidence meter
- **Analytics**: State machine flow, activity feed, channel mix, sector heatmap, velocity

The backend spec (3 tables: `outreach_sequences`, `outreach_contacts`, `outreach_activities`) is solid but the UI only scratches the surface.

### MVP Features (Build First)

#### 1. Daily Workflow Optimization (Today View)

This is where 90% of time is spent. Every second saved compounds across 15-20 contacts/day.

- **Quick-copy email body**: "Copy" button on each contact card that calls `getBody`, copies rendered subject + body to clipboard. Toast: "Copied email for James at NorthStar"
- **Open-in-Gmail**: `mailto:` link with pre-filled to/subject/body. For LinkedIn steps, generate LinkedIn message URL
- **Batch actions**: Checkboxes on cards, "Select All", batch "Mark Sent" / "Skip" / "Pause"
- **Sector filter chips**: Clickable sector badges to batch all recruitment emails together
- **Daily briefing card**: "15 contacts due, 3 overdue, 2 replies waiting. Est. time: 45 min"
- **Smart prioritization**: Score = overdue penalty + high-reply-rate bonus + earlier step preference + sector rotation
- **Keyboard shortcuts**: `j/k` navigate, `s` mark sent, `c` copy body, `o` open in Gmail
- **Undo last action**: 5-second toast with undo button after marking sent

**New endpoints needed**: `outreach.dashboard.getBriefing`, `outreach.contact.batchLogActivity`, `outreach.contact.undoActivity`

#### 2. Contact Detail View

Clicking any contact name opens a full detail view:

- **Header**: Name, company, email, LinkedIn, sector badge, status, assigned user
- **Timeline**: Vertical chronological history of every touchpoint — activity type, step, channel, rendered email subject, notes
- **Sequence progress**: Horizontal step indicator (completed/current/future)
- **Notes panel**: Editable, auto-saves on blur
- **Related deals**: If converted, shows pipeline member with stage + value
- **Quick actions sidebar**: Mark Sent, Skip, Log Reply, Pause, Convert, Snooze, Copy Body, Open in Gmail

**New endpoints**: `outreach.contact.getDetail` (aggregated response), `outreach.contact.getActivities` (paginated)

#### 3. Reply Management

Replies are where revenue happens. Need a dedicated interface.

- **Inbox-like view**: List on left, detail on right. Sentiment badges (Positive/Negative/Neutral/Not Now)
- **Quick actions**: Convert to Deal, Schedule Follow-up, Mark Not Now (snooze with date), Mark Lost
- **Reply categorization**: Interested / Not Now / Not Interested / Wrong Person / Auto-Reply — feeds analytics
- **Snooze/Follow-up**: "Follow up in X days" sets `snoozedUntil` so contact reappears in Today queue (e.g., "Premier Office Cleaning said follow up in Q3")

**Schema additions**: Add `sentiment`, `replyCategory`, `snoozedUntil` to `outreach_contacts`. New state: REPLIED -> ACTIVE (snooze reactivates).

**New endpoints**: `outreach.contact.snooze`, `outreach.contact.categorize`

#### 4. Contact Import

Without import, every contact is enrolled one-by-one.

- **CSV upload**: Drag-and-drop, column mapper (headers -> firstName/lastName/email/company/sector), duplicate detection on email, preview before commit, auto-enroll into sequence
- **Manual add**: Quick form with "Add and enroll" button (creates customer + enrolls in one action)
- **LinkedIn paste**: Parse profile URL, extract name/company/title
- **New "Contacts" tab**: Searchable, filterable table of all outreach contacts across sequences

**New endpoints**: `outreach.contact.import`, `outreach.contact.bulkEnroll`

#### 5. Pipeline Integration UI

The backend convert flow already works (`convertContact` -> `pipelineService.addMember`). Needs proper UI.

- **Convert slide-over**: Select pipeline, stage, estimated deal value, notes. One-click convert
- **Revenue attribution**: Each sequence card shows "Revenue Attributed: £12,500"
- **Reverse link**: Pipeline deals from outreach show an "Outreach" badge with sequence name

**New endpoints**: `outreach.analytics.revenue` (groups by sequence/sector, sums deal values)

#### 6. Sequence Editor

Step-by-step builder UI for creating/editing sequences:

- Channel selector per step (Email/LinkedIn Request/LinkedIn Message/Call)
- Delay days input, subject line, body editor with template variable pills (`{{firstName}}`, `{{company}}`)
- Preview mode: rendered with sample contact's real data
- Visual timeline showing the multi-channel flow

### Post-MVP Features

#### 7. Template Library & AI Assist
- Saved templates by purpose (intro, follow-up, break-up, case study)
- Snippet library for reusable blocks
- AI rewrite button: sends template + context to AI module, returns 2-3 variants
- Quick-action buttons: "Make shorter", "More casual", "Add social proof"

**New tables**: `outreach_templates`, `outreach_snippets`

#### 8. Reporting & Intelligence
- **Best time to send**: Heatmap of reply rates by day-of-week x hour
- **Optimal sequence length**: "68% of replies come by step 3"
- **Cohort analysis**: Group by enrollment week, track reply/convert rates over time
- **Weekly digest**: Auto-generated summary (Inngest cron, Monday)
- **Predicted reply probability**: Per-contact score based on sector rate + step position

#### 9. Automation Hooks
- Stale reply check (REPLIED + no follow-up in 48h -> notification)
- Overdue escalation (overdue > 3 days -> alert)
- Domain bounce detection (3+ bounces from same domain -> auto-pause all contacts)
- All already wirable through existing Inngest events + workflow engine

#### 10. Team Features (When VAs Join)
- Assignment filter on Today view (show only your contacts)
- Daily quotas per team member with progress bar
- Leaderboard (sent/reply rate/conversions)
- Handoff flow: VA flags positive reply -> assigned to Luke
- `performedByUserId` on activities for attribution

**Schema addition**: Add `performedByUserId` to `outreach_activities`

---

## Part 2: Email Infrastructure & Tooling

### The Golden Rule

**Never send cold email from your primary domain.** If your outreach domain gets blacklisted, transactional email (password resets, booking confirmations via Resend) stays clean.

### Recommended Stack

```
TRANSACTIONAL (keep as-is)
  Resend → password resets, notifications, booking confirmations
  Domain: ironheart primary domain

COLD OUTREACH (new, completely separate)
  Instantly Hypergrowth ($97/mo)
    → Warming (200K+ account network), inbox rotation, unified inbox
    → Webhooks push events back to Ironheart
  Google Workspace accounts ($4-8/account/mo via reseller)
    → Connected to Instantly for sending
    → On separate outreach domains

PROSPECTING (when needed)
  Apollo Basic ($49/user/mo)
    → 275M+ contact database, email finder/verifier
    → Export leads into Instantly or Ironheart

IRONHEART OUTREACH MODULE (the brain)
    → Manages sequences, templates, tracking, analytics
    → Pushes contacts to Instantly via API
    → Receives webhook events (opens, replies, bounces)
    → Pipeline integration, revenue attribution
    → Eventually: white-label outreach-as-a-service
```

### Why This Split Works

- **Ironheart owns the data layer**: prospect lists, sequence logic, templates, analytics, pipeline tracking
- **Instantly owns the delivery layer**: warming, rotation, spam avoidance, actual SMTP sending
- If you switch from Instantly later, only the integration changes — your data stays
- For outreach-as-a-service: each client gets their own domains/accounts in Instantly, all managed through Ironheart's multi-tenant platform

### Tool Comparison

| Feature | Instantly | Apollo | Smartlead |
|---|---|---|---|
| Starting price | $37/mo | $49/user/mo | $39/mo |
| Email accounts | Unlimited | Limited | Unlimited |
| Built-in warmup | Yes (largest network) | No | Yes |
| Contact database | Separate product | Built-in (275M+) | No |
| Per-seat pricing | No | Yes | No |
| API/Webhooks | Yes (Hypergrowth+) | Yes | Yes |
| Best for | Sending infrastructure | Prospecting + data | Sending + agency use |

### Resend vs Google Workspace vs Dedicated SMTP

**Resend**: Keep for transactional ONLY. Cold email risks contaminating your transactional domain reputation. If cold emails trigger spam complaints on a shared IP, your password resets land in spam.

**Google Workspace**: 94% inbox placement — highest of any provider. Safe cold email limit is 25-50/day per account (official 2,000 limit is a system cap, not deliverability-safe). Cost: $4-8.40/account/month.

**Dedicated SMTP (SES, Mailgun)**: Cold email violates their ToS. They can terminate without warning. Not viable.

### Domain Strategy

Buy separate outreach domains (.com TLDs only):
- Naming: `tryironheart.com`, `getironheart.com`, `ironhearthq.com`, `meetironheart.com`
- 2-3 inboxes per domain (luke@, hello@, team@)
- Each domain needs: MX records, SPF, DKIM, DMARC

**Formula**: Daily target / 30 per inbox = inboxes needed. Inboxes / 2-3 per domain = domains needed.

| Daily volume | Inboxes | Domains |
|---|---|---|
| 50/day | 2 | 1-2 |
| 200/day | 7 | 3-4 |
| 500/day | 17 | 6-8 |

### Warming Timeline

- Week 1: 5-10 emails/day per inbox (warmup tool handles engagement)
- Week 2: 15-20/day
- Week 3: 30-40/day
- Week 4+: Cap at 50/day per inbox
- Minimum warmup: 2 weeks. Recommended: 3-4 weeks.

### Volume Economics

| Phase | Volume | Domains | Accounts | Instantly | Apollo | Monthly Cost | Cost/Email |
|---|---|---|---|---|---|---|---|
| Startup | 50/day | 2 | 2 | Growth $37 | — | ~$47 | $0.031 |
| Growth | 200/day | 4 | 7 | Growth $37 | — | ~$69 | $0.012 |
| Scale | 500/day | 7 | 17 | Hypergrowth $97 | — | ~$172 | $0.011 |
| Agency | 1000+/day | 13 | 34 | Hypergrowth $97 | Basic $49 | ~$295 | $0.010 |

### Phased Rollout

**Phase 1 — Now (0-50/day, ~$47/mo)**
- Buy 2 outreach domains, set up Google Workspace
- Sign up for Instantly Growth ($37/mo)
- Connect accounts, warm for 2-3 weeks
- Ramp from 10/day to 30-50/day

**Phase 2 — Month 2-3 (50-200/day, ~$150-175/mo)**
- Add 2-3 domains + inboxes
- Upgrade to Instantly Hypergrowth ($97/mo) for API/webhooks
- Build Ironheart webhook receiver for Instantly events
- Add Apollo Basic ($49/mo) when you need prospecting data

**Phase 3 — Month 4-6 (200-500/day, ~$175-250/mo)**
- Scale to 6-8 domains, 15-20 inboxes
- Full Ironheart <-> Instantly API integration
- Client-facing dashboards in Ironheart

**Phase 4 — Month 6+ (Agency mode)**
- Offer outreach-as-a-service through Ironheart
- Each client gets isolated domains/accounts
- Infrastructure cost ~$10-15/month per client

### Compliance

**UK GDPR + PECR (B2B exemption)**:
- Can send to corporate employees without prior consent IF you identify yourself, provide opt-out, and email is relevant to their role
- Need documented Legitimate Interest Assessment (LIA) per vertical
- **Sole traders/partnerships (many trades, cleaning, letting agents) are NOT covered** — need consent or soft opt-in

**Every email must include**:
- Clear sender identification
- Physical business address
- One-click unsubscribe link (Google/Yahoo enforce this)
- Why you're contacting them

**Build into Ironheart**:
- Global suppression list synced across Instantly campaigns
- Auto-append unsubscribe links
- Store data source per contact record
- Flag sole traders for consent-based outreach only

---

## Part 3: The Self-Marketing Flywheel

### The Core Loop

```
Prospect Discovery → Enroll in Sequence → Morning Dashboard shows who to contact
→ Send manually → Log activity → Track reply → Convert to pipeline deal → Close
→ Revenue attributed back to sequence + sector → Data improves next campaign
```

The outreach module literally sells the platform. Every campaign generates:
- Response rate data by sector, angle, and step
- Conversion data from reply to close
- Revenue attribution to specific sequences
- A growing library of proven templates

### The Demo Moment

During a sales call, show the prospect: "This is the system I used to find you. You replied to step 2 of my recruitment sequence. Here's the dashboard I use every morning. This is the platform I'm offering to build for your business."

### Industry Playbooks

#### Recruitment Agencies
- **Angle**: Time calculation. "Your top biller spends 15h/week on admin. At their billing rate, that's £X/month on the table."
- **Sequence**: 4 steps, 12 days — pain-point opener → insight share → LinkedIn message → breakup email
- **Offer**: Free 20-minute "Admin Audit"

#### Commercial Cleaning
- **Angle**: Scheduling chaos. "When a cleaner calls in sick at 6am, how long does it take to cover their jobs?"
- **Sequence**: 3 steps, 10 days — scheduling question → mini case study → direct phone call
- **Offer**: Free "Operations Snapshot"

#### Dental Practices
- **Angle**: Chair time money. "At £85/appointment, a 10% no-show rate on 40 daily appointments costs £340/day."
- **Sequence**: 4 steps, 14 days — no-show cost calc → recall automation article → LinkedIn connect → personalised observation
- **Offer**: Free no-show cost calculator spreadsheet

#### Trades (Plumbing, Electrical, HVAC, Scaffolding)
- **Angle**: Quoting speed. "The trades company that quotes first wins 60% of the time. How fast are you?"
- **Sequence**: 3 steps, 8 days — quoting speed question → profitability tracking article → direct call
- **Offer**: Free "Quote Speed Audit"

#### Letting Agents
- **Angle**: Maintenance black hole. "How many maintenance requests are currently 'in progress' with no update logged?"
- **Sequence**: 4 steps, 12 days — maintenance question → case study → LinkedIn message → breakup + free template
- **Offer**: Free maintenance process audit

#### Property Companies
- **Angle**: Compliance risk. "With [X] properties, how confident are you that every gas safety cert is current?"
- **Sequence**: 3 steps, 10 days — compliance question → dashboard case study → free audit offer
- **Offer**: Free compliance gap analysis

### Content Strategy That Feeds Outreach

**LinkedIn posts (2-3/week)**:
1. "What I'm Building" — screenshots/data from Ironheart (normalizes your name before cold email)
2. "What I'm Seeing" — industry observations from conversations (demonstrates expertise)
3. "What I've Learned" — honest lessons from building and consulting (builds trust)

**Industry mini-reports (1/quarter/vertical)**:
- "State of Automation in UK Recruitment: What 50 agencies told us"
- "The Hidden Cost of Manual Scheduling in Commercial Cleaning"
- Built from conversations you're already having through outreach — genuinely original research

**Case studies as sequence steps**: Each proof point (podiatry clinic, theatre, events, environmental) becomes step-2 material in relevant sequences.

### Scaling to Agency

**Month 0-6 (Solo with leverage)**: Platform multiplies effectiveness. Target: 200 prospects/month, 10-15 discovery calls, 3-5 new clients.

**Month 6-12 (VA-assisted)**: 1-2 VAs handle send-and-log. `assignedUserId` already supports this. VA cost ~£800-1200/mo. At 500 contacts/mo, 8% reply rate = 40 conversations. Conservative 10% close at £5k avg = £20k/mo from £1k investment.

**Month 12-18 (Outreach-as-a-service)**: Offer outreach module to clients. Multi-tenant by design. £500-1500/mo retainer per client.

**Month 18+ (White-label + referral)**: Agencies brand it as their own. Referral engine: converted clients refer others, tracked via pipeline metadata.

### Revenue Attribution

The data model already supports end-to-end tracking:

```
outreach_sequences.id + sector + abVariant
  → outreach_contacts (enrolled prospect)
    → outreach_activities (every touchpoint)
      → outreach_contacts.status = CONVERTED
        → pipeline_members.dealValue (revenue)
```

**Key metrics**:
- Cost per reply by sequence/sector
- Revenue per contact enrolled (total revenue / total enrolled = true unit economics)
- Which sequences produce highest-value deals (not just most replies)
- ROI by sector (revenue - outreach cost / cost)

### The Demo Day One-Liner

> "I built an AI platform for operational businesses, used its own outreach module to find my first 10 paying clients, and every campaign makes the next one better because the data stays in the system."

Updated Slide 4 (Proof) should add a data card:
```
"Outreach Intelligence" — LIVE DATA
"This platform found every prospect in this room's inbox.
200 companies contacted. 12% reply rate. 8 discovery calls.
3 paid engagements — from a system I built in 2 weeks."
```

---

## Implementation Priority Summary

### MVP (Build These First)
1. Daily workflow: copy body, open-in-Gmail, batch actions, keyboard shortcuts
2. Contact detail view: full timeline, quick actions, notes
3. Reply management: dedicated interface, categorization, snooze
4. Contact import: CSV with column mapping, bulk enroll
5. Pipeline integration UI: convert slide-over, revenue attribution
6. Sequence editor: step builder with preview

### Post-MVP
7. Template library + AI rewrite
8. Reporting: timing heatmap, weekly digest, sequence comparison
9. Multi-channel UI: channel-specific step fields
10. Automation hooks: stale reply check, overdue alerts, bounce detection

### Future
11. Team features: assignment, quotas, leaderboard, handoff
12. Advanced analytics: cohort analysis, reply prediction
13. Enrichment API integration (Apollo/Clay)
14. Instantly API integration (push campaigns, receive webhooks)
15. White-label outreach-as-a-service

### Schema Changes Needed
- **New on `outreach_contacts`**: `sentiment`, `replyCategory`, `snoozedUntil`
- **New on `outreach_activities`**: `performedByUserId`
- **New tables**: `outreach_templates`, `outreach_snippets`
- **New Inngest crons**: `outreach/check-stale-replies` (daily), `outreach/check-overdue` (daily), `outreach/weekly-digest` (Monday)
