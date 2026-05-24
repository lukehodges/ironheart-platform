# Ironheart Systematic Testing Prompt

## How to Use This

Copy the prompt below into a **new Claude Code session** (or use with Cowork/parallel agents).
It instructs Claude to systematically test every feature of the running app and report all errors.

**Prerequisites before running:**
1. Dev server running: `npm run dev`
2. DB seeded: `npm run db:seed`
3. You're logged in at `http://localhost:3000/admin`

---

## THE PROMPT

```
You are a QA engineer systematically testing the Ironheart booking platform. The app is running at http://localhost:3000. You have access to the browser via the user (who will click what you ask) and to the codebase.

Your mission: Find every runtime error, broken feature, and unhandled edge case.

## Test Protocol

For EACH feature below, do the following:
1. Tell me exactly what to click/type in the browser
2. Ask me what I see on screen (or ask me to paste any error messages)
3. If there's an error, investigate the server logs (`docker logs` or terminal where `npm run dev` runs)
4. If something fails, read the relevant source files and diagnose the root cause
5. Log the issue with: page, action, expected result, actual result, root cause file:line

## Test Checklist — Work Through EVERY Item

### Phase 1: Page Load Smoke Test
Visit each page and report if it loads or crashes:

- [ ] /admin (dashboard)
- [ ] /admin/bookings
- [ ] /admin/calendar
- [ ] /admin/customers
- [ ] /admin/team
- [ ] /admin/workflows
- [ ] /admin/forms
- [ ] /admin/reviews
- [ ] /admin/payments
- [ ] /admin/scheduling
- [ ] /admin/analytics
- [ ] /admin/audit
- [ ] /admin/settings
- [ ] /admin/developer
- [ ] /platform (if platform admin)
- [ ] /platform/tenants
- [ ] /platform/analytics
- [ ] /book/demo (public booking portal)

### Phase 2: Dashboard Interactions
- [ ] Click every KPI card on the dashboard
- [ ] Click "New Booking" button
- [ ] Click every item in the activity feed
- [ ] Check if KPI numbers are real or all zeros
- [ ] Check browser console for errors

### Phase 3: Booking CRUD
- [ ] View booking list — do all columns show data?
- [ ] Click a booking row — does detail sheet open?
- [ ] Create new booking — walk through entire flow
- [ ] Edit an existing booking — change date/time
- [ ] Cancel a booking — does status update?
- [ ] Filter bookings by status
- [ ] Search bookings
- [ ] Check pagination (click "Next" if available)

### Phase 4: Customer CRUD
- [ ] View customer list — do aggregate columns show data or em-dashes?
- [ ] Search for "Emily" — does search work?
- [ ] Click customer row — does detail sheet open?
- [ ] Create new customer — fill all fields
- [ ] Edit customer — change email
- [ ] Add a note to a customer
- [ ] Delete a note
- [ ] Try merge — select two customers and merge
- [ ] Try GDPR export button
- [ ] Try anonymise button

### Phase 5: Team Management
- [ ] View team list — shows Sarah Mitchell, James Carter?
- [ ] Click team member — detail view works?
- [ ] Edit team member — change job title
- [ ] Set availability for a team member
- [ ] Block dates for a team member
- [ ] Check capacity settings

### Phase 6: Workflows
- [ ] List workflows
- [ ] Create a new workflow — name it, save it
- [ ] Open workflow detail page (/admin/workflows/[id])
- [ ] Add nodes if visual editor is present
- [ ] Activate a workflow
- [ ] Deactivate a workflow
- [ ] Delete a workflow
- [ ] View executions page

### Phase 7: Forms
- [ ] List form templates
- [ ] Create a form template — add fields
- [ ] Edit form template
- [ ] Delete form template
- [ ] Send a form to a customer
- [ ] View form responses
- [ ] Visit public form page (/forms/[sessionKey]) if you have a session key

### Phase 8: Reviews
- [ ] List reviews
- [ ] Filter by status (All, Pending, Published, Flagged)
- [ ] Request a review for a customer
- [ ] View review detail
- [ ] Resolve a flagged review
- [ ] Check automation settings

### Phase 9: Payments
- [ ] List invoices
- [ ] Create an invoice
- [ ] View invoice detail
- [ ] Send an invoice
- [ ] Record a payment
- [ ] Void an invoice
- [ ] Check pricing rules

### Phase 10: Settings (EVERY TAB)
- [ ] General tab — edit business name, save
- [ ] Modules tab — toggle a module off and on
- [ ] Billing tab — loads without error
- [ ] Notifications tab — toggle settings, save
- [ ] Security tab — webhooks section works
- [ ] Danger tab — shows org name, buttons disabled or working
- [ ] API Keys — create one, list it, revoke it

### Phase 11: Analytics
- [ ] Dashboard KPIs — real data or zeros?
- [ ] Revenue chart — renders or empty?
- [ ] Bookings by status — donut chart works?
- [ ] Staff utilization — shows data?
- [ ] Top services — ranked list works?
- [ ] Customer churn risk — any data?
- [ ] Export button — works or errors?
- [ ] Change time period filter

### Phase 12: Audit Log
- [ ] List audit entries
- [ ] Filter by resource type
- [ ] Filter by date range
- [ ] Export CSV
- [ ] Pagination works?

### Phase 13: Scheduling
- [ ] Calendar view loads
- [ ] Create a slot
- [ ] Edit a slot
- [ ] Delete a slot
- [ ] Bulk create slots
- [ ] Check availability

### Phase 14: Platform Admin
- [ ] List tenants
- [ ] View tenant detail
- [ ] Create new tenant — full wizard
- [ ] Suspend a tenant
- [ ] Activate a tenant
- [ ] Feature flags — list and toggle
- [ ] Audit log (platform level)
- [ ] Start impersonation — impersonate demo tenant
- [ ] Verify impersonation banner shows
- [ ] End impersonation

### Phase 15: Public Booking Portal
- [ ] Visit /book/demo
- [ ] Select a service
- [ ] Pick a date
- [ ] Pick a time slot
- [ ] Fill in customer details
- [ ] Submit booking
- [ ] Check confirmation page

### Phase 16: Edge Cases
- [ ] Rapidly click buttons — any double-submit issues?
- [ ] Submit empty forms — validation messages show?
- [ ] Enter very long text in fields — truncation or overflow?
- [ ] Use browser back button during multi-step flows
- [ ] Resize browser to mobile width — layout breaks?
- [ ] Open browser dev tools → Network tab → look for 500 errors
- [ ] Open browser dev tools → Console → look for red errors

## Issue Template

For each bug found, report:
```
**Bug #N: [Short description]**
- Page: /admin/[route]
- Action: [what was clicked/typed]
- Expected: [what should happen]
- Actual: [what happened — error message, white screen, etc.]
- Console error: [if any]
- Server log: [if any]
- Root cause: [file:line if you can determine it]
- Severity: Critical / High / Medium / Low
```

## When Done

Compile all bugs into a single numbered list sorted by severity.
Group them by: Critical (app crashes), High (feature broken), Medium (wrong data), Low (cosmetic).
```

---

## Automated Testing Commands

### Layer 1: Playwright E2E (browser automation)

```bash
# Install (one time)
npm install -D @playwright/test
npx playwright install chromium

# First run — saves auth cookies (you log in once)
npx playwright test --project=setup --headed

# Run all E2E tests
npm run e2e

# Run with browser visible
npm run e2e:headed

# Run specific test file
npx playwright test e2e/smoke.spec.ts

# Debug with step-through inspector
npx playwright test --debug
```

### Layer 2: tRPC API Exerciser (direct endpoint testing)

```bash
# Calls every service method against real DB — no browser needed
npm run test:api
```

### Layer 3: Existing Unit Tests

```bash
npm run test          # All unit tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```
