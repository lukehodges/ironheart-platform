# Ironheart Testing Playbook

A comprehensive manual testing guide for the Ironheart multi-tenant SaaS booking platform. Follow this playbook systematically to verify every feature, page, and edge case in the application using live data in a browser.

**Total test cases: 260+**

---

## Table of Contents

1. [Setup Instructions](#1-setup-instructions)
2. [Section A: Smoke Tests](#section-a-smoke-tests)
3. [Section B: CRUD Flow Tests](#section-b-crud-flow-tests)
4. [Section C: Public Flow Tests](#section-c-public-flow-tests)
5. [Section D: Platform Admin Tests](#section-d-platform-admin-tests)
6. [Section E: Navigation & UI Tests](#section-e-navigation--ui-tests)
7. [Section F: Edge Cases & Destructive Tests](#section-f-edge-cases--destructive-tests)
8. [Section G: Console & Network Monitoring](#section-g-console--network-monitoring)

---

## 1. Setup Instructions

### Prerequisites

- Node.js 20+
- PostgreSQL database running with `DATABASE_URL` configured in `.env.local`
- WorkOS credentials configured (`WORKOS_API_KEY`, `WORKOS_CLIENT_ID`) in `.env.local`

### Prepare the test environment

```bash
# 1. Install dependencies
npm install

# 2. Run database migrations
npx drizzle-kit migrate

# 3. Seed the demo data (creates "Riverside Wellness Clinic" tenant)
npm run db:seed

# 4. Start the dev server
npm run dev
```

### Seed data reference

After seeding, the following data exists:

| Entity            | Count | Details                                                                   |
| ----------------- | ----- | ------------------------------------------------------------------------- |
| Tenants           | 2     | "Ironheart Platform" (slug: `platform`), "Riverside Wellness Clinic" (slug: `demo`) |
| Staff users       | 4     | Luke Hodges (owner, platform admin), Luke Hodges (tenant admin), Sarah Mitchell (owner), James Carter (member) |
| Customers         | 10    | Emily Thompson, Michael Davies, Sophie Williams, James Brown, Olivia Jones, Harry Wilson, Amelia Taylor, George Anderson, Isabella Martin, Charlie White |
| Services          | 5     | Initial Consultation (60m, GBP 80), Follow-up (30m, GBP 45), Physiotherapy (45m, GBP 65), Sports Massage (60m, GBP 55), Wellness Assessment (90m, GBP 120) |
| Bookings          | 10    | Mix of CONFIRMED, COMPLETED, and CANCELLED across past and future dates   |
| Venues            | 1     | Riverside Wellness Clinic, 12 Thames Street, Oxford OX1 2AB               |
| Modules           | 18    | All enabled for demo tenant                                               |
| Roles             | 3     | Owner, Admin, Member with appropriate permission assignments              |
| Portal template   | 1     | "Wellness & Health Standard" with 5-field form schema                     |

### Test accounts

| Email                                     | Role          | Access             |
| ----------------------------------------- | ------------- | ------------------ |
| `luke@theironheart.org`                   | Owner         | Platform admin + demo tenant |
| `luke.hodges.dev@gmail.com`               | Owner         | Demo tenant only   |
| `sarah.mitchell@riverside-wellness.co.uk` | Owner         | Demo tenant only   |
| `james.carter@riverside-wellness.co.uk`   | Member        | Demo tenant only (limited permissions) |

### Browser setup

1. Open Chrome DevTools (F12) before starting
2. Keep the Console tab visible for error monitoring
3. Enable "Preserve log" in the Console settings
4. In the Network tab, enable "Preserve log" and filter by "Fetch/XHR" to watch tRPC calls
5. Consider installing React DevTools for component inspection

---

## Section A: Smoke Tests

Visit every page and verify it renders without crashing. Open DevTools Console before each navigation.

### A1. Public Routes

- [ ] **A1.1** Visit `/` (Landing page) -- Expected: Marketing landing page renders with navigation, hero section, and call-to-action buttons -- Red flag: Blank page, error boundary, or console errors
- [ ] **A1.2** Visit `/(auth)/sign-in` (Sign in page) -- Expected: WorkOS-powered sign-in form or redirect to WorkOS hosted auth page -- Red flag: 500 error, blank page, or "missing provider" error in console
- [ ] **A1.3** Visit `/auth/account-not-found` -- Expected: Friendly error page explaining the account was not found, with a link back to sign-in -- Red flag: Raw error text or crash
- [ ] **A1.4** Visit `/book/demo` (Public booking portal) -- Expected: Booking wizard loads with "Riverside Wellness Clinic" branding, step 1 "Select a Service" card visible, progress bar at top -- Red flag: "Booking Not Available" card (theme loading failed), infinite skeleton, or console errors
- [ ] **A1.5** Visit `/book/nonexistent-tenant` -- Expected: Graceful "Booking Not Available" error card with retry button -- Red flag: Unhandled crash, blank page, or tRPC error displayed raw
- [ ] **A1.6** Visit `/forms/invalid-session-key` -- Expected: Graceful error or "form not found" message -- Red flag: Crash, white page, or uncaught promise rejection
- [ ] **A1.7** Visit `/review/invalid-token` -- Expected: Graceful error or "review not found" message -- Red flag: Crash or raw error message

### A2. Admin Routes (requires authentication)

Sign in as `luke@theironheart.org` first. For each page, verify: (1) the page loads, (2) the sidebar is visible, (3) the page header renders with correct title, (4) data loads (skeleton appears then resolves or empty state shows).

- [ ] **A2.1** Visit `/admin` (Dashboard) -- Expected: "Dashboard" heading, 4 KPI stat cards (Today's Bookings, New Customers, Revenue, Avg. Rating), "Recent Activity" card with up to 5 booking entries -- Red flag: All stats showing "--" indefinitely, skeleton never resolves, console tRPC errors
- [ ] **A2.2** Visit `/admin/analytics` -- Expected: "Analytics" heading, date range picker, 4+ KPI cards, Revenue chart, Status donut chart, Top Services bar chart, Staff Utilization heatmap, Churn Risk table -- Red flag: All charts showing zero/empty, hardcoded data visible, chart library errors in console
- [ ] **A2.3** Visit `/admin/audit` -- Expected: "Audit Log" heading, Filters toggle button, Export button, either audit timeline entries or "No audit entries found" empty state -- Red flag: "Failed to load audit log" error, missing filter options
- [ ] **A2.4** Visit `/admin/bookings` -- Expected: "Bookings" heading, page-size selector, "New Booking" button, BookingsFilters toolbar, BookingsTable with 10 seeded bookings showing booking numbers (BK-001 through BK-010), status badges (CONFIRMED/COMPLETED/CANCELLED) -- Red flag: Empty table despite seed data, filter bar missing, "Failed to load" error
- [ ] **A2.5** Visit `/admin/calendar` -- Expected: Calendar view rendering with weekly or monthly view of bookings -- Red flag: Blank calendar, JavaScript errors, missing date navigation
- [ ] **A2.6** Visit `/admin/customers` -- Expected: "Customers" heading, "Add Customer" button, search input, status filter chips (All/Active/Inactive), table with 10 seeded customers showing name, email, phone, bookings count, spend, last booking, status badge, actions dropdown -- Red flag: Customer aggregate columns (Bookings, Spend, Last Booking) all showing skeleton indefinitely or dashes
- [ ] **A2.7** Visit `/admin/developer` -- Expected: "Developer" heading, "Add Webhook" button, webhook table (likely empty state: "No webhooks configured") -- Red flag: Page crash, missing dialog components
- [ ] **A2.8** Visit `/admin/forms` -- Expected: "Forms" heading, "New Template" button, search input, status filter chips, template table (likely empty state: "No form templates yet") -- Red flag: Page crash or tRPC error
- [ ] **A2.9** Visit `/admin/payments` -- Expected: "Payments" heading, "New Invoice" button, status filter chips (All/Draft/Sent/Overdue/Paid/Void), invoice table (likely empty state: "No invoices yet") -- Red flag: Page crash, dialog components missing
- [ ] **A2.10** Visit `/admin/reviews` -- Expected: "Reviews" heading, visibility filter chips (All/Public/Private/Issues), min rating dropdown, review table (likely empty state) -- Red flag: Page crash, filter components not rendering
- [ ] **A2.11** Visit `/admin/scheduling` -- Expected: "Scheduling" heading with weekly calendar grid, day columns, time slot cards, navigation arrows for week changes, "Create Slot" button or dialog -- Red flag: Calendar grid blank, date calculations wrong, console errors
- [ ] **A2.12** Visit `/admin/settings` -- Expected: Two-column layout with settings sidebar (General, Notifications, Integrations, Billing, Modules, Security, Danger) and General Settings tab content showing business name, address, etc. pre-filled from seed data -- Red flag: Tab content blank, lazy-loaded components failing, sidebar missing tabs
- [ ] **A2.13** Visit `/admin/settings#notifications` -- Expected: Notifications tab active, notification settings form -- Red flag: Tab not switching, hash routing broken
- [ ] **A2.14** Visit `/admin/settings#billing` -- Expected: Billing tab active with plan information -- Red flag: Tab content empty
- [ ] **A2.15** Visit `/admin/settings#modules` -- Expected: Modules tab showing list of enabled/disabled modules for the tenant -- Red flag: Module list empty despite 18 modules being seeded
- [ ] **A2.16** Visit `/admin/settings#security` -- Expected: Security tab with API key management section -- Red flag: Tab content missing
- [ ] **A2.17** Visit `/admin/settings#danger` -- Expected: Danger Zone tab with destructive actions (clearly marked) -- Red flag: Missing warning styling, actions triggering without confirmation
- [ ] **A2.18** Visit `/admin/team` -- Expected: "Team" heading, "Add Member" button, availability bar ("X available now" with green indicator and avatar stack), status filter chips, employee type filter chips, results count badge, grid of team member cards (4 seeded members) -- Red flag: Grid showing 0 members, availability bar wrong count, filter chips not working
- [ ] **A2.19** Visit `/admin/workflows` -- Expected: "Workflows" heading, "Create Workflow" button, search input, status filter chips, workflow table (likely empty or with seeded workflows), trigger event filter -- Red flag: Page crash, table not rendering
- [ ] **A2.20** Visit `/admin/workflows/new` -- Expected: Workflow creation page or redirect to workflow editor -- Red flag: 404 error, blank page
- [ ] **A2.21** Visit `/admin/workflows/[valid-id]` (use a real workflow ID if one exists) -- Expected: Workflow detail/editor page -- Red flag: Crash on valid ID, no back navigation
- [ ] **A2.22** Visit `/admin/workflows/[valid-id]/executions` -- Expected: Workflow execution history list -- Red flag: Page crash, missing route

### A3. Platform Admin Routes

Sign in as `luke@theironheart.org` (platform admin).

- [ ] **A3.1** Visit `/platform` -- Expected: Redirects to `/platform/tenants` -- Red flag: 404 or infinite redirect loop
- [ ] **A3.2** Visit `/platform/tenants` -- Expected: "Tenants" heading, "Create Tenant" button, TenantListTable showing at least 2 tenants (platform + demo) -- Red flag: Empty table, tRPC authorization error, missing platform admin layout
- [ ] **A3.3** Visit `/platform/tenants/new` -- Expected: Create tenant wizard/form -- Red flag: Blank page, form not rendering
- [ ] **A3.4** Visit `/platform/tenants/[demo-tenant-id]` (use the actual UUID) -- Expected: Tenant detail page showing "Riverside Wellness Clinic" details, plan, status, modules, actions (suspend/activate) -- Red flag: 404 or crash on valid ID
- [ ] **A3.5** Visit `/platform/analytics` -- Expected: Platform-wide analytics dashboard -- Red flag: Page crash, authorization error

---

## Section B: CRUD Flow Tests

For each module, walk through the complete Create, Read, Update, Delete lifecycle. Verify toast notifications, data persistence (refresh page and confirm changes stuck), and proper error handling.

### B1. Bookings

- [ ] **B1.1** Navigate to `/admin/bookings` and click "New Booking" -- Expected: Booking wizard dialog opens with multi-step flow -- Red flag: Dialog does not open, wizard component crashes
- [ ] **B1.2** Fill out new booking wizard: select a service, pick a date/time, assign staff, select customer -- Expected: Each step validates before advancing, progress indicator updates -- Red flag: Steps skip validation, no staff/service options available
- [ ] **B1.3** Submit the new booking -- Expected: Success toast "Booking created", wizard closes, new booking appears in table with CONFIRMED status -- Red flag: tRPC error, booking not appearing after refresh
- [ ] **B1.4** Click on a booking row in the table -- Expected: BookingDetailSheet slides in from right showing booking number, customer, service, staff, date/time, status, price -- Red flag: Sheet blank, data not loading
- [ ] **B1.5** In the booking detail sheet, verify all fields display correctly -- Expected: Booking number (e.g., BK-001), status badge, scheduled date/time, price, service name -- Red flag: Missing fields, wrong data, currency formatting issues
- [ ] **B1.6** Update a booking's status or details -- Expected: Changes save with success toast, sheet refreshes with new data -- Red flag: Optimistic update fails, stale data after close/reopen
- [ ] **B1.7** Cancel a booking -- Expected: Confirmation dialog appears, after confirm: status changes to CANCELLED, cancel reason stored, success toast -- Red flag: No confirmation prompt, booking still shows as CONFIRMED after cancel
- [ ] **B1.8** Use the status filter buttons to filter bookings -- Expected: Table updates to show only bookings matching selected statuses -- Red flag: Filter has no effect, wrong bookings shown
- [ ] **B1.9** Use the date range filters -- Expected: Only bookings within the selected date range appear -- Red flag: Date parsing errors, timezone issues
- [ ] **B1.10** Use the search filter to search by booking number -- Expected: Table filters to matching bookings -- Red flag: Search returns no results for known booking numbers
- [ ] **B1.11** Change the page size selector (10, 25, 50, 100) -- Expected: Table re-renders with the selected number of rows, pagination adjusts -- Red flag: Page size has no effect
- [ ] **B1.12** Test pagination: if more than `limit` bookings exist, click next/previous page -- Expected: Next page shows additional bookings, previous returns to first page -- Red flag: Next page shows same data, cursor-based pagination broken

### B2. Customers

- [ ] **B2.1** Navigate to `/admin/customers` and click "Add Customer" -- Expected: CustomerCreateDialog opens with first name, last name, email, phone fields -- Red flag: Dialog does not open
- [ ] **B2.2** Fill out customer form with valid data and submit -- Expected: Success toast, dialog closes, customer detail sheet opens for new customer, table updates -- Red flag: Validation error on valid data, customer not persisting
- [ ] **B2.3** Search for a seeded customer (e.g., "Emily Thompson") -- Expected: Table filters to show matching customer(s) within 300ms debounce -- Red flag: Search returns no results, debounce not working
- [ ] **B2.4** Click on a customer row to view details -- Expected: CustomerDetailSheet slides in showing full customer info, booking history, notes -- Red flag: Sheet empty or crashes
- [ ] **B2.5** Click the edit action from the row dropdown menu -- Expected: CustomerEditDialog opens pre-populated with customer data -- Red flag: Fields empty, wrong customer data
- [ ] **B2.6** Edit customer fields (change phone number) and save -- Expected: Success toast, updated data reflected in table and detail sheet -- Red flag: Changes not persisting
- [ ] **B2.7** Add a note to a customer via the detail sheet -- Expected: Note input, submit, note appears in notes list with timestamp -- Red flag: Note not saving, notes section missing
- [ ] **B2.8** Delete a customer note -- Expected: Note removed after confirmation -- Red flag: Note persists after delete
- [ ] **B2.9** Merge two customers: click dropdown "Merge into another customer" on a customer row -- Expected: CustomerSearchDialog opens to pick target customer, then CustomerMergeDialog shows preview of merge (which bookings, notes, etc. will transfer) -- Red flag: Search dialog crashes, merge dialog missing
- [ ] **B2.10** Confirm customer merge -- Expected: Success toast, source customer soft-deleted (mergedIntoId set), all associated records transferred to target, table refreshes -- Red flag: Merge fails, associated records lost
- [ ] **B2.11** Test customer anonymise (GDPR): via detail sheet or dropdown -- Expected: Confirmation dialog, customer PII replaced with anonymised placeholders, success toast -- Red flag: PII still visible after anonymise
- [ ] **B2.12** Filter customers by status (Active/Inactive) -- Expected: Table shows only customers matching selected status -- Red flag: Filter has no effect
- [ ] **B2.13** Test pagination on customers list with next/previous buttons -- Expected: Cursor-based pagination works correctly -- Red flag: Same data on next page

### B3. Team Management

- [ ] **B3.1** Navigate to `/admin/team` and verify grid layout -- Expected: 4 seeded team member cards in grid, each showing avatar, name, job title, status badge -- Red flag: Cards missing, wrong layout
- [ ] **B3.2** Click "Add Member" button -- Expected: AddMemberDialog opens with email, name, role, job title fields -- Red flag: Dialog does not open
- [ ] **B3.3** Create a new team member -- Expected: Success toast, new card appears in grid, refetch completes -- Red flag: Creation fails, card not appearing
- [ ] **B3.4** Click on a team member card -- Expected: TeamMemberSheet slides in with full member details (contact info, job title, employment type, start date, day rate, services, availability, capacity) -- Red flag: Sheet blank or crashes
- [ ] **B3.5** Set availability for a team member -- Expected: Availability form (recurring schedule or specific dates), save completes with success toast -- Red flag: Availability form missing, save fails
- [ ] **B3.6** Block specific dates for a team member -- Expected: Date picker for blocking, blocked dates saved and displayed -- Red flag: Block action not available
- [ ] **B3.7** Set capacity for a team member -- Expected: Max daily bookings input, save succeeds -- Red flag: Capacity field missing
- [ ] **B3.8** Deactivate a team member -- Expected: Confirmation, status changes to INACTIVE, card shows inactive badge, member removed from availability bar -- Red flag: No confirmation, deactivation not reflected
- [ ] **B3.9** Filter by status (Active/Inactive/Suspended) -- Expected: Grid shows only matching members -- Red flag: Filter chips not working
- [ ] **B3.10** Filter by employment type (Employed/Self-employed/Contractor) -- Expected: Grid filters by employee type -- Red flag: No effect
- [ ] **B3.11** Verify availability bar -- Expected: Green dot, "X available now" count, avatar stack of active members -- Red flag: Count wrong, bar missing

### B4. Forms

- [ ] **B4.1** Navigate to `/admin/forms` and click "New Template" -- Expected: TemplateFormDialog opens with name, description, active toggle, signature toggle, field editor -- Red flag: Dialog not opening
- [ ] **B4.2** Create a form template: enter name "Patient Intake Form", add 3 fields (Text "Full Name" required, Email "Email" required, Textarea "Medical History" optional) -- Expected: Field editor rows render correctly with type selector, label input, required checkbox, remove button -- Red flag: Field type dropdown not working, fields not adding
- [ ] **B4.3** Submit the template -- Expected: "Template created" toast, dialog closes, new template appears in table -- Red flag: Validation errors on valid input
- [ ] **B4.4** Click on the template row to view details -- Expected: TemplateDetailDialog shows name, description, status, fields list, response count, send timing -- Red flag: Dialog blank
- [ ] **B4.5** Edit the template: click Edit from detail dialog or row dropdown -- Expected: TemplateFormDialog opens pre-populated with existing data, fields editable -- Red flag: Fields not populated
- [ ] **B4.6** Update the template (add a new field) and save -- Expected: "Template updated" toast, field count updates in table -- Red flag: Update fails
- [ ] **B4.7** Delete a template: click Delete from row dropdown -- Expected: AlertDialog confirmation "Are you sure?", confirm deletes, "Template deleted" toast, row removed from table -- Red flag: No confirmation, template persists after delete
- [ ] **B4.8** Search for templates by name -- Expected: Table filters with 300ms debounce -- Red flag: Search broken
- [ ] **B4.9** Filter by status (Active/Inactive) -- Expected: Table shows matching templates -- Red flag: Filter has no effect
- [ ] **B4.10** Test SELECT/MULTISELECT field type options editor -- Expected: Comma-separated options input appears when SELECT or MULTISELECT type is chosen -- Red flag: Options input missing

### B5. Reviews

- [ ] **B5.1** Navigate to `/admin/reviews` -- Expected: Reviews table with visibility filters and min rating dropdown -- Red flag: Page crash
- [ ] **B5.2** Filter by visibility (Public/Private/Issues) -- Expected: Table filters appropriately, "Issues" shows only flagged reviews -- Red flag: Filters not working
- [ ] **B5.3** Filter by minimum rating -- Expected: Only reviews at or above selected rating shown -- Red flag: Rating filter has no effect
- [ ] **B5.4** Click on a review row -- Expected: ReviewDetailSheet slides in with rating stars, visibility badge, platform, comment, date, booking ID, issue section (if flagged) -- Red flag: Sheet blank
- [ ] **B5.5** For a review with a flagged issue (issueCategory set), verify the issue resolution form appears -- Expected: "Flagged Issue" section with category badge, "Resolve This Issue" form with status dropdown (Contacted/Resolved/Dismissed) and notes textarea -- Red flag: Form missing for flagged reviews
- [ ] **B5.6** Submit issue resolution -- Expected: "Issue resolved successfully" toast, sheet closes and list refreshes, re-opening the review shows resolution status and notes -- Red flag: Resolution not saving
- [ ] **B5.7** For an already-resolved review, verify the resolution details display instead of the form -- Expected: Resolution status badge, resolution notes, resolved-at date -- Red flag: Form shown again instead of resolution details

### B6. Workflows

- [ ] **B6.1** Navigate to `/admin/workflows` and click "Create Workflow" -- Expected: Navigates to `/admin/workflows/new` or opens creation UI -- Red flag: Navigation fails, 404
- [ ] **B6.2** Create a new workflow with name and description -- Expected: Workflow created, navigates to workflow editor -- Red flag: Creation fails
- [ ] **B6.3** View the workflow list -- Expected: Table shows workflow name, trigger events (code badges), status (Active/Inactive), last run, actions (toggle switch + dropdown) -- Red flag: Columns not rendering
- [ ] **B6.4** Toggle a workflow active/inactive using the Switch -- Expected: Switch toggles, activate/deactivate mutation fires, status badge updates -- Red flag: Switch unresponsive, no API call
- [ ] **B6.5** Click on a workflow row to open the detail editor -- Expected: Navigates to `/admin/workflows/[id]` with workflow editor page -- Red flag: Navigation broken, page crashes
- [ ] **B6.6** Delete a workflow: click dropdown, select Delete -- Expected: AlertDialog "Delete Workflow" confirmation with workflow name, confirm triggers delete, "workflow deleted" row removed -- Red flag: No confirmation, delete fails
- [ ] **B6.7** Search workflows by name -- Expected: Client-side filtering of workflow list -- Red flag: Search broken
- [ ] **B6.8** Filter by status (Active/Inactive) -- Expected: Table shows only matching workflows -- Red flag: Filter not applied
- [ ] **B6.9** View workflow executions at `/admin/workflows/[id]/executions` -- Expected: Execution history list with status, timestamps, trigger data -- Red flag: Page crash, no data

### B7. Payments

- [ ] **B7.1** Navigate to `/admin/payments` and click "New Invoice" -- Expected: Create invoice dialog opens with Customer ID, Subtotal, Tax, Total, Currency selector, Due Date, Notes fields -- Red flag: Dialog not opening
- [ ] **B7.2** Create an invoice: enter a valid customer UUID (from seed data), subtotal 80.00, tax 16.00, total 96.00, due date 30 days from now -- Expected: "Invoice created" toast, dialog closes, invoice appears in table with DRAFT status -- Red flag: Customer UUID not accepted, amounts stored incorrectly (pence vs pounds confusion)
- [ ] **B7.3** Send the invoice: from the row dropdown, click "Send Invoice" -- Expected: Status changes from DRAFT to SENT, "Invoice sent" toast -- Red flag: Send fails, status unchanged
- [ ] **B7.4** Click on an invoice row to view details -- Expected: Detail sheet slides in showing invoice number, status, subtotal/tax/discount/total breakdown, amount paid, amount due, dates, line items, notes, action buttons -- Red flag: Sheet blank, amounts formatted wrong
- [ ] **B7.5** Record a payment: click "Record Payment" from dropdown or sheet -- Expected: Dialog with amount input, payment method selector (Card/Bank Transfer/Direct Debit/Cash), notes -- Red flag: Dialog not opening
- [ ] **B7.6** Submit payment record -- Expected: "Payment recorded" toast, invoice status updates (PAID if fully paid, PARTIALLY_PAID otherwise), amount paid updates -- Red flag: Payment not recorded, status not transitioning
- [ ] **B7.7** Void an invoice: click "Void Invoice" from dropdown or sheet -- Expected: Status changes to VOID, "Invoice voided" toast, void actions disabled afterward -- Red flag: Void fails, can void an already-paid invoice
- [ ] **B7.8** Filter invoices by status (Draft/Sent/Overdue/Paid/Void) -- Expected: Table shows only matching invoices -- Red flag: Filter broken
- [ ] **B7.9** Test pagination on invoice list -- Expected: Cursor-based pagination works -- Red flag: Same data on next page

### B8. Scheduling

- [ ] **B8.1** Navigate to `/admin/scheduling` -- Expected: Weekly calendar grid with day columns (Mon-Sun), time slot blocks, week navigation arrows -- Red flag: Calendar blank, date calculations wrong
- [ ] **B8.2** Navigate forward/backward through weeks -- Expected: Week dates update correctly, slots for new week load -- Red flag: Dates jump incorrectly, slots not refreshing
- [ ] **B8.3** Create a new slot -- Expected: Dialog or inline form with date, start time, end time, staff assignment, service, capacity fields -- Red flag: Create action not available
- [ ] **B8.4** Create a slot and verify it appears in the calendar grid -- Expected: New slot block rendered at correct day/time position -- Red flag: Slot not visible, wrong position
- [ ] **B8.5** Bulk create slots -- Expected: Ability to create multiple slots at once (e.g., same time across multiple days) -- Red flag: Bulk create UI missing
- [ ] **B8.6** Generate recurring slots -- Expected: Recurrence pattern UI (daily/weekly), date range, slots generated automatically -- Red flag: Recurring generation fails
- [ ] **B8.7** Delete a slot -- Expected: Confirmation, slot removed from calendar, success toast -- Red flag: Slot persists after delete
- [ ] **B8.8** Check availability for a date/time -- Expected: Availability check returns available/unavailable with reason -- Red flag: Always shows available or always unavailable

### B9. Settings

- [ ] **B9.1** Navigate to `/admin/settings` (General tab) -- Expected: Business name, legal name, email, phone, website, address fields pre-filled from seed data ("Riverside Wellness Clinic", "12 Thames Street", etc.) -- Red flag: Fields empty, wrong data
- [ ] **B9.2** Update a general setting (change phone number) and save -- Expected: Success toast, page refresh shows updated value -- Red flag: Save fails, data reverts
- [ ] **B9.3** Switch to Notifications tab (`#notifications`) -- Expected: Notification settings form loads (email/SMS preferences) -- Red flag: Tab content empty
- [ ] **B9.4** Switch to Integrations tab (`#integrations`) -- Expected: Integration options displayed -- Red flag: Component lazy-load failure
- [ ] **B9.5** Switch to Billing tab (`#billing`) -- Expected: Current plan shown ("PROFESSIONAL" from seed data), plan details -- Red flag: Plan data missing
- [ ] **B9.6** Switch to Modules tab (`#modules`) -- Expected: List of all 18 modules with enable/disable toggles, module details -- Red flag: Empty module list
- [ ] **B9.7** Toggle a module on/off -- Expected: Module status changes, toast confirmation -- Red flag: Toggle has no effect
- [ ] **B9.8** Switch to Security tab (`#security`) -- Expected: API key management (create, list, revoke) -- Red flag: Tab empty
- [ ] **B9.9** Create an API key -- Expected: Key generated, shown once (with copy button), appears in list -- Red flag: Key creation fails
- [ ] **B9.10** Revoke an API key -- Expected: Key revoked, removed from active list -- Red flag: Revoke fails
- [ ] **B9.11** Switch to Danger tab (`#danger`) -- Expected: Clearly-marked destructive actions with warnings -- Red flag: Actions available without confirmation

### B10. Developer (Webhooks)

- [ ] **B10.1** Navigate to `/admin/developer` and click "Add Webhook" -- Expected: Dialog opens with URL input, description input, event type checkboxes (8 types: booking/created, booking/updated, booking/cancelled, customer/created, customer/updated, payment/received, review/submitted, form/submitted) -- Red flag: Dialog not opening, events missing
- [ ] **B10.2** Create webhook with URL `https://example.com/webhook`, select "booking/created" and "booking/updated" -- Expected: "Webhook endpoint created" toast, signing secret dialog appears with secret value and copy button, warning about one-time display -- Red flag: No secret shown, webhook not in list
- [ ] **B10.3** Copy the signing secret -- Expected: "Signing secret copied to clipboard" toast -- Red flag: Copy fails
- [ ] **B10.4** Verify webhook appears in table with URL, events, status (Active), created date -- Expected: Row visible with correct data -- Red flag: Row missing or wrong data
- [ ] **B10.5** Delete the webhook via row dropdown -- Expected: Toast confirmation prompt "Are you sure?", confirm deletes, "Webhook endpoint deleted" toast, row removed -- Red flag: No confirmation, webhook persists

### B11. Audit Log

- [ ] **B11.1** Navigate to `/admin/audit` -- Expected: Audit timeline with entries or "No audit entries found" empty state -- Red flag: "Failed to load audit log" error
- [ ] **B11.2** Click "Filters" button -- Expected: Filter panel expands with filter options (action type, resource, date range, actor) -- Red flag: Panel does not appear
- [ ] **B11.3** Apply a filter (e.g., by action type) -- Expected: Timeline updates to show only matching entries -- Red flag: Filter has no effect
- [ ] **B11.4** Click "Export" button -- Expected: CSV download triggers (or "Audit log exported successfully" toast), file contains entries matching current filters -- Red flag: Export fails, empty CSV, export button disabled when entries exist
- [ ] **B11.5** Scroll down to trigger infinite scroll loading -- Expected: Additional entries load when scrolling near bottom (IntersectionObserver triggers `onLoadMore`) -- Red flag: No additional loading, duplicate entries

---

## Section C: Public Flow Tests

Test end-to-end flows from the customer/public perspective.

### C1. Public Booking Flow

- [ ] **C1.1** Visit `/book/demo` in an incognito/private window (no auth) -- Expected: Booking wizard loads with "Riverside Wellness Clinic" header, step 1 "Select a Service" -- Red flag: Auth redirect, theme loading failure
- [ ] **C1.2** Observe the progress bar and step indicator -- Expected: "Step 1 of 3" shown, progress bar at ~25%, WizardProgress component shows service/slot/details steps -- Red flag: Progress bar missing, step count wrong
- [ ] **C1.3** Note: the service selector may show "Services module not yet implemented" placeholder -- Expected: This is a known incomplete area; services list may be empty -- Red flag: Hard crash instead of graceful empty state
- [ ] **C1.4** If services are available, select one and advance to step 2 -- Expected: Slot picker loads with date selection and available time slots -- Red flag: No slots available, date picker broken
- [ ] **C1.5** Pick a time slot and advance to step 3 -- Expected: "Your Details" form with customer info fields -- Red flag: Form not rendering
- [ ] **C1.6** Fill out customer details and submit -- Expected: Booking created, step 4 "Confirmed" shows BookingSuccess component with booking ID, service name, date/time, staff name, customer email -- Red flag: Submission fails, no confirmation shown
- [ ] **C1.7** Verify the back button works at each step -- Expected: ChevronLeft button returns to previous step without data loss -- Red flag: Back button missing or clears form data

### C2. Public Form Submission

- [ ] **C2.1** Obtain a valid form session key (create a form template in admin, then use the "Send Form" action to generate a session key/URL) -- Expected: Session key generated, URL like `/forms/[sessionKey]` -- Red flag: Send form action not available
- [ ] **C2.2** Visit `/forms/[sessionKey]` in an incognito window -- Expected: Public form renders with the template's fields (field labels, types, required indicators) -- Red flag: "Form not found" for valid key, fields not rendering
- [ ] **C2.3** Fill out the form with valid data and submit -- Expected: Submission succeeds, confirmation/thank-you message shown -- Red flag: Submission fails, no feedback
- [ ] **C2.4** Verify the response appears in admin at `/admin/forms` (view template responses) -- Expected: Response visible in template detail dialog with submitted data -- Red flag: Response not recorded
- [ ] **C2.5** Visit `/forms/[sessionKey]` again after submission -- Expected: Either "already submitted" message or allows resubmission depending on configuration -- Red flag: Crash on revisit

### C3. Public Review Submission

- [ ] **C3.1** Obtain a valid review token (use the "Request Review" action from admin reviews or via tRPC) -- Expected: Token generated for a specific booking -- Red flag: Request review action not available
- [ ] **C3.2** Visit `/review/[token]` in an incognito window -- Expected: Review submission form with star rating, comment textarea, optional fields -- Red flag: "Review not found" for valid token, form not rendering
- [ ] **C3.3** Submit a review with 4 stars and a comment -- Expected: Submission succeeds, confirmation shown -- Red flag: Submission fails
- [ ] **C3.4** Verify the review appears in admin at `/admin/reviews` -- Expected: New review row with correct rating, comment, and "Public" or "Private" badge based on automation settings -- Red flag: Review not appearing in admin
- [ ] **C3.5** Try submitting with the same token again -- Expected: Either "already reviewed" message or idempotent resubmission -- Red flag: Duplicate review created

---

## Section D: Platform Admin Tests

All tests require sign-in as `luke@theironheart.org` (isPlatformAdmin: true).

### D1. Tenant Management

- [ ] **D1.1** Visit `/platform/tenants` -- Expected: Table with at least 2 tenants: "Ironheart Platform" (CUSTOM plan, ACTIVE) and "Riverside Wellness Clinic" (PROFESSIONAL plan, ACTIVE) -- Red flag: Empty table, authorization error
- [ ] **D1.2** Click "Create Tenant" (navigates to `/platform/tenants/new`) -- Expected: Multi-step tenant creation wizard with name, slug, plan, billing email, limits -- Red flag: Blank page, form not rendering
- [ ] **D1.3** Create a new tenant: name "Test Clinic", slug "test-clinic", plan "STARTER" -- Expected: Tenant created with modules provisioned, success message, redirect to tenant detail or list -- Red flag: Creation fails, slug collision not handled
- [ ] **D1.4** View the new tenant's detail page (`/platform/tenants/[id]`) -- Expected: Tenant info displayed: name, slug, plan, status, billing email, user limits, module list -- Red flag: Blank page, wrong data
- [ ] **D1.5** Suspend the demo tenant -- Expected: Confirmation dialog, status changes to SUSPENDED, tenant users cannot access admin -- Red flag: Suspend fails, no confirmation
- [ ] **D1.6** Activate the suspended tenant -- Expected: Status returns to ACTIVE, tenant users can access admin again -- Red flag: Activation fails
- [ ] **D1.7** Change a tenant's plan (e.g., PROFESSIONAL to ENTERPRISE) -- Expected: Plan updated, limits adjusted, success toast -- Red flag: Plan change not persisting

### D2. Impersonation

- [ ] **D2.1** From platform tenant list or detail page, initiate impersonation of the demo tenant -- Expected: `startImpersonation` called, session switches to demo tenant context, impersonation banner appears at top of page -- Red flag: No impersonation UI, session not switching
- [ ] **D2.2** While impersonating, navigate to `/admin` -- Expected: Dashboard shows demo tenant data, impersonation banner persists across navigation -- Red flag: Banner disappears, seeing platform data instead of tenant data
- [ ] **D2.3** End impersonation -- Expected: `endImpersonation` called, session returns to platform admin context, banner disappears -- Red flag: Cannot end impersonation, stuck in tenant context

### D3. Feature Flags & Modules

- [ ] **D3.1** View global feature flags (`platform.listFlags`) -- Expected: List of platform-wide feature flags with names and values -- Red flag: Empty list, API error
- [ ] **D3.2** Set a global feature flag -- Expected: Flag value updated, persists on refresh -- Red flag: Set fails
- [ ] **D3.3** View tenant-specific flags (`platform.listTenantFlags`) -- Expected: Flags for a specific tenant -- Red flag: API error
- [ ] **D3.4** Set a tenant-specific flag -- Expected: Flag set for that tenant only -- Red flag: Flag applied globally instead
- [ ] **D3.5** View tenant modules (`platform.listTenantModules`) -- Expected: List of modules with enabled/disabled status for the tenant -- Red flag: Empty or wrong module list
- [ ] **D3.6** Toggle a tenant module via `platform.setTenantModule` -- Expected: Module enabled/disabled for that tenant, change reflected in tenant's admin sidebar -- Red flag: Module toggle not persisting

### D4. Platform Audit & Analytics

- [ ] **D4.1** View platform audit log (`platform.getAuditLog`) -- Expected: Platform-wide audit entries (tenant creation, impersonation, etc.) -- Red flag: Empty log despite platform actions taken
- [ ] **D4.2** Visit `/platform/analytics` -- Expected: Platform-wide analytics (total tenants, total users, aggregate metrics) -- Red flag: Page crash, all zeros

### D5. Signup Requests

- [ ] **D5.1** List signup requests (`platform.listSignupRequests`) -- Expected: List of pending signup requests (may be empty if none submitted) -- Red flag: API error
- [ ] **D5.2** Approve a signup request (if available) -- Expected: Request approved, tenant provisioned -- Red flag: Approval fails
- [ ] **D5.3** Reject a signup request (if available) -- Expected: Request rejected with optional reason -- Red flag: Rejection fails

---

## Section E: Navigation & UI Tests

### E1. Sidebar Navigation

- [ ] **E1.1** Verify the sidebar renders with all expected sections based on enabled modules -- Expected: Dashboard at top, then module-driven sections (Operations: Bookings, Calendar, Scheduling; Business: Customers, Team, Forms, Reviews, Workflows; Finance: Payments; Intelligence: Analytics; Tooling: Developer; Account: Settings, Audit Log) -- Red flag: Missing nav items, wrong section grouping
- [ ] **E1.2** Click every sidebar link and verify it navigates to the correct page -- Expected: Each link loads the corresponding page, active state (highlighted) matches current URL -- Red flag: Link points to wrong page, 404, active state wrong
- [ ] **E1.3** Verify the Dashboard link (`/admin`) only highlights when exactly on `/admin`, not on sub-pages -- Expected: Dashboard active only at `/admin`, not at `/admin/bookings` -- Red flag: Dashboard highlighted on all admin pages
- [ ] **E1.4** Test sidebar collapse (desktop) -- Expected: Sidebar collapses to icon-only mode, tooltips appear on hover over icons, section dividers show instead of titles -- Red flag: Collapse broken, tooltips missing
- [ ] **E1.5** Verify platform admin sidebar items appear only for platform admins -- Expected: Platform-specific nav items (Platform Dashboard, Tenants, etc.) visible for luke@theironheart.org, hidden for non-admin users -- Red flag: Platform items visible to regular users

### E2. Global Search

- [ ] **E2.1** Press Cmd+K (or Ctrl+K on Windows/Linux) -- Expected: Global search dialog opens with search input focused -- Red flag: Shortcut does not work, dialog not rendering
- [ ] **E2.2** Type a customer name (e.g., "Emily") -- Expected: Search results appear with customer match, possibly booking matches too -- Red flag: No results for known data, search takes too long
- [ ] **E2.3** Type a booking number (e.g., "BK-001") -- Expected: Matching booking appears in results -- Red flag: No results
- [ ] **E2.4** Click on a search result -- Expected: Navigates to the correct detail page/sheet for the selected item -- Red flag: Navigation broken, wrong destination
- [ ] **E2.5** Press Escape -- Expected: Search dialog closes -- Red flag: Dialog does not close

### E3. Responsive/Mobile

- [ ] **E3.1** Resize browser to mobile width (< 768px) -- Expected: Sidebar collapses/hides, hamburger menu appears in topbar, content stacks vertically -- Red flag: Content overflows, sidebar overlaps content
- [ ] **E3.2** Open the mobile sidebar (hamburger menu) -- Expected: Sidebar slides in as an overlay with all nav items -- Red flag: Sidebar does not open, nav items truncated
- [ ] **E3.3** Click a nav item in mobile sidebar -- Expected: Navigates to page and closes the sidebar (onNavigate callback fires) -- Red flag: Sidebar stays open after navigation
- [ ] **E3.4** Test tables on mobile width -- Expected: Tables scroll horizontally or columns adapt for narrow viewports -- Red flag: Table breaks layout, columns stack unreadably
- [ ] **E3.5** Test dialog/sheet components on mobile -- Expected: Dialogs full-width, sheets slide from bottom or side appropriately -- Red flag: Dialogs too wide, sheets inaccessible

### E4. Error States

- [ ] **E4.1** Disconnect from the network (DevTools > Network > Offline) and try navigating -- Expected: Error states show (retry buttons, error messages), tRPC queries fail gracefully -- Red flag: Uncaught promise rejections, blank pages, no retry option
- [ ] **E4.2** Reconnect and click "Retry" on any error state -- Expected: Data loads successfully -- Red flag: Retry does not work, stale error state persists
- [ ] **E4.3** Cause a tRPC error by manually calling a procedure with bad input (via browser console) -- Expected: Error formatter converts to appropriate HTTP error, not INTERNAL_SERVER_ERROR for validation failures -- Red flag: All errors returned as 500

### E5. Loading States

- [ ] **E5.1** Throttle network to "Slow 3G" (DevTools > Network > Throttle) and load `/admin` -- Expected: Skeleton cards appear for stats, skeleton list for recent activity, then resolve to real data -- Red flag: No skeletons (flash of empty content), skeletons never resolve
- [ ] **E5.2** Throttle and load `/admin/customers` -- Expected: 8 skeleton table rows appear, then resolve -- Red flag: No loading state
- [ ] **E5.3** Throttle and load `/admin/team` -- Expected: Grid skeleton (8 placeholder cards) appears, then resolves -- Red flag: No skeleton, flash of empty grid
- [ ] **E5.4** Throttle and open a detail sheet (click a booking/customer row) -- Expected: Sheet skeleton appears while data loads -- Red flag: Sheet shows blank content until data arrives

---

## Section F: Edge Cases & Destructive Tests

### F1. Empty States

- [ ] **F1.1** Create a new tenant (via platform admin) with no data and visit its admin pages -- Expected: Every page shows an appropriate empty state ("No bookings yet", "No customers yet", etc.) with call-to-action buttons -- Red flag: Page crashes with no data, missing empty states
- [ ] **F1.2** Delete all bookings for a tenant and visit `/admin/bookings` -- Expected: "No bookings yet" empty state with "New Booking" action -- Red flag: Stale data shown, cache not invalidated
- [ ] **F1.3** Visit `/admin/calendar` with no slots or bookings -- Expected: Empty calendar grid renders without errors -- Red flag: Calendar crashes with no data
- [ ] **F1.4** Visit `/admin/workflows` with no workflows -- Expected: "No workflows yet" empty state with "Create Workflow" action -- Red flag: Table header with no body, broken layout
- [ ] **F1.5** Visit `/admin/reviews` with no reviews -- Expected: "No reviews found" empty state -- Red flag: Table error

### F2. Pagination Edge Cases

- [ ] **F2.1** Create exactly `PAGE_SIZE` items (25 customers) and verify pagination boundary -- Expected: Page shows 25 items, "hasMore" is false (no next page) or true if there's a 26th -- Red flag: Off-by-one error, next button enabled when no more data
- [ ] **F2.2** Rapidly click next/previous page buttons -- Expected: No duplicate requests, data consistent, no stale cursor issues -- Red flag: Duplicate data, wrong page shown
- [ ] **F2.3** Apply a filter while on page 2 -- Expected: Pagination resets to page 1 (cursor and cursorStack cleared) -- Red flag: Filtered results start from page 2 cursor

### F3. Concurrent Mutations

- [ ] **F3.1** Open the same booking detail in two browser tabs, update it in one tab -- Expected: Second tab's data is stale but does not crash; refreshing shows updated data -- Red flag: Silent data overwrite, crash on conflict
- [ ] **F3.2** Rapidly click a "Save" button multiple times -- Expected: Only one mutation fires (button disabled during pending state with "Saving..." text) -- Red flag: Multiple mutations fire, duplicate records created
- [ ] **F3.3** Toggle a workflow active/inactive switch rapidly -- Expected: Only the final state is applied, no race conditions -- Red flag: State oscillates, incorrect final state

### F4. Invalid URLs

- [ ] **F4.1** Visit `/admin/workflows/nonexistent-uuid` -- Expected: 404 page or "Workflow not found" error state -- Red flag: Crash, unhandled error, blank page
- [ ] **F4.2** Visit `/platform/tenants/nonexistent-uuid` -- Expected: "Tenant not found" error or 404 -- Red flag: Crash
- [ ] **F4.3** Visit `/admin/nonexistent-page` -- Expected: Next.js 404 page -- Red flag: Server error, blank page
- [ ] **F4.4** Visit `/admin/settings#nonexistent-tab` -- Expected: Falls back to "general" tab (isValidTab check returns false, defaults to general) -- Red flag: Blank content, JavaScript error

### F5. Permission Boundaries

- [ ] **F5.1** Sign in as James Carter (Member role) and visit `/admin/settings` -- Expected: Settings page loads but may have restricted tabs based on permissions -- Red flag: Full admin access for Member role
- [ ] **F5.2** As a Member, attempt to delete a customer -- Expected: Permission denied error or action not available in dropdown -- Red flag: Delete succeeds despite lacking permission
- [ ] **F5.3** As a non-platform-admin, visit `/platform/tenants` -- Expected: Redirect to admin dashboard or "Access Denied" message -- Red flag: Platform admin data exposed
- [ ] **F5.4** Disable a module (e.g., "Forms") for the demo tenant, then visit `/admin/forms` -- Expected: Page shows "module not enabled" or nav item hidden from sidebar -- Red flag: Page loads normally despite module disabled

### F6. Form Validation

- [ ] **F6.1** Try to create a customer with empty required fields -- Expected: Validation errors shown inline or via toast, form does not submit -- Red flag: Empty submission succeeds, no validation
- [ ] **F6.2** Try to create an invoice with non-numeric amount -- Expected: Validation prevents submission -- Red flag: NaN stored in database, calculation errors
- [ ] **F6.3** Try to create a webhook with invalid URL format -- Expected: "URL is required" or URL validation error -- Red flag: Invalid URL accepted
- [ ] **F6.4** Try to create a webhook with no events selected -- Expected: "Select at least one event type" error -- Red flag: Webhook created with empty events
- [ ] **F6.5** Try to create a form template with empty name -- Expected: "Template name is required" toast error -- Red flag: Template created with empty name
- [ ] **F6.6** Try to create a form template with all field labels empty -- Expected: "At least one field with a label is required" error -- Red flag: Template with labelless fields created
- [ ] **F6.7** Submit the record payment dialog with amount 0 or negative -- Expected: "Please enter a valid payment amount" error -- Red flag: Zero/negative payment recorded

### F7. Large/Special Inputs

- [ ] **F7.1** Create a customer with a very long name (200+ characters) -- Expected: Name accepted and truncated in UI display (max-w with truncate class), stored in full in database -- Red flag: Layout breaks, text overflows container
- [ ] **F7.2** Enter special characters in text fields: `<script>alert("xss")</script>` -- Expected: Text stored and displayed as literal text (React auto-escapes), no script execution -- Red flag: XSS vulnerability, script executes
- [ ] **F7.3** Enter SQL injection in search: `'; DROP TABLE customers; --` -- Expected: Search treats input as literal string, no SQL injection (Drizzle ORM parameterizes queries) -- Red flag: Database error, table dropped
- [ ] **F7.4** Paste Unicode/emoji in a note field -- Expected: Characters stored and displayed correctly -- Red flag: Encoding errors, garbled text
- [ ] **F7.5** Enter a customer email with non-standard TLD: `user@example.photography` -- Expected: Accepted as valid email -- Red flag: Rejected by overly strict validation

### F8. Date Edge Cases

- [ ] **F8.1** Create a booking for today -- Expected: Booking created (if allowSameDayBook is true) or rejected with "minimum notice" error (minNoticeHours is 24 in seed data) -- Red flag: Same-day booking allowed when setting says 24h notice required
- [ ] **F8.2** Create a booking for a date in the past -- Expected: Rejected with appropriate error -- Red flag: Past-date booking accepted
- [ ] **F8.3** Create a booking for a date far in the future (2+ years) -- Expected: Accepted (within booking window) or rejected if outside `bookingWindowDays` (60 in seed) -- Red flag: Accepted despite being outside window
- [ ] **F8.4** Test date display across timezone boundaries -- Expected: Dates display consistently in the tenant's configured timezone (Europe/London) -- Red flag: Dates off by one day, wrong timezone shown
- [ ] **F8.5** Test the scheduling calendar around DST transition dates -- Expected: Time slots display correctly, no duplicate or missing hours -- Red flag: Slots shifted by 1 hour, missing slot at transition

---

## Section G: Console & Network Monitoring

Keep browser DevTools open throughout all testing. After each section, review the console and network tabs for issues.

### G1. Console Error Monitoring

- [ ] **G1.1** Check for React hydration mismatch warnings -- Expected: No hydration mismatches (client-rendered content should match server HTML) -- Red flag: "Text content does not match server-rendered HTML", "Hydration failed because..." warnings
- [ ] **G1.2** Check for uncaught Promise rejections -- Expected: None. All async operations should have error handlers -- Red flag: "Unhandled Promise Rejection" in console
- [ ] **G1.3** Check for `TypeError: Cannot read properties of undefined/null` errors -- Expected: None. All optional chaining and null checks should be in place -- Red flag: Frequent property access errors indicating missing data guards
- [ ] **G1.4** Check for React key warnings -- Expected: No "Each child in a list should have a unique key prop" warnings -- Red flag: Key warnings indicate potential rendering bugs
- [ ] **G1.5** Check for deprecated API warnings -- Expected: No deprecation warnings from React 19, tRPC 11, or Next.js 16 -- Red flag: Deprecated API usage that may break in future versions
- [ ] **G1.6** Check for "act()" warnings in development -- Expected: None in production-like testing; may appear in strict mode -- Red flag: Indicates improper state update handling

### G2. Network Error Monitoring

- [ ] **G2.1** Filter Network tab by "trpc" and check for 500 responses -- Expected: No 500 Internal Server Error responses during normal operations -- Red flag: Frequent 500s indicate unhandled server errors
- [ ] **G2.2** Check for 401/403 responses on authenticated routes -- Expected: Only when session expired or accessing forbidden resources -- Red flag: 401/403 on valid authenticated requests indicates auth middleware issues
- [ ] **G2.3** Check tRPC batch request payloads -- Expected: Multiple procedures batched into single HTTP requests for efficiency -- Red flag: Every procedure making a separate HTTP request
- [ ] **G2.4** Check response sizes for list endpoints -- Expected: Reasonable payload sizes (not fetching entire database), pagination working at API level -- Red flag: Huge response payloads, all data fetched at once
- [ ] **G2.5** Check for CORS errors -- Expected: None (same-origin requests in normal setup) -- Red flag: CORS errors in console/network

### G3. tRPC-Specific Checks

- [ ] **G3.1** Inspect a tRPC error response body -- Expected: Structured error with `code` (e.g., "NOT_FOUND", "BAD_REQUEST", "FORBIDDEN"), `message`, no stack traces in production -- Red flag: Raw stack traces exposed, generic "Internal error" for all failures
- [ ] **G3.2** Verify tRPC query caching (staleTime) -- Expected: Customer booking history queries use `staleTime: 5 * 60 * 1000` (5 minutes), reducing redundant requests -- Red flag: Same query firing on every render
- [ ] **G3.3** Verify tRPC cache invalidation after mutations -- Expected: After creating/updating/deleting, related queries are invalidated (e.g., `utils.booking.list.invalidate()` after booking creation) -- Red flag: Stale data shown after mutation, requires manual refresh

### G4. Performance Monitoring

- [ ] **G4.1** Check initial page load time for `/admin` -- Expected: Under 3 seconds on broadband, skeleton states visible quickly -- Red flag: Over 5 seconds, no visual feedback during load
- [ ] **G4.2** Monitor memory usage on `/admin/customers` with 10 customers (each firing N+1 aggregate queries) -- Expected: Memory stable, no growth over time -- Red flag: Memory climbs continuously (leak from useQuery hooks or subscriptions)
- [ ] **G4.3** Check for unnecessary re-renders using React DevTools Profiler -- Expected: Components re-render only when their data changes -- Red flag: Entire page tree re-renders on single component state change
- [ ] **G4.4** Monitor network waterfall for `/admin` dashboard -- Expected: `analytics.getSummary` and `booking.list` queries fire in parallel -- Red flag: Sequential waterfall where queries wait for each other

---

## Appendix: Quick Reference

### Key tRPC endpoints to test via DevTools console

If you need to test a specific endpoint directly, use the browser console:

```javascript
// Access the tRPC client (available in React DevTools via component props)
// Or call via fetch:
fetch('/api/trpc/auth.me', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log)
```

### Common seed data UUIDs

After running `npm run db:seed`, query the database or check console output for:
- Demo tenant ID
- Customer IDs (for invoice creation)
- Service IDs (for booking creation)
- Staff user IDs

### Module slugs (for module gating tests)

`auth`, `tenant`, `platform`, `analytics`, `search`, `customer`, `booking`, `team`, `scheduling`, `portal`, `staff`, `notification`, `calendar-sync`, `forms`, `review`, `payment`, `workflow`, `developer`

### Settings hash routes

`#general`, `#notifications`, `#integrations`, `#billing`, `#modules`, `#security`, `#danger`

### Invoice status lifecycle

`DRAFT` -> `SENT` -> `VIEWED` -> `PARTIALLY_PAID` / `PAID` / `OVERDUE`

Also: any non-final status -> `VOID`

### Booking status values

`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`

---

## Test Completion Summary

| Section | Total Tests | Passed | Failed | Blocked |
| ------- | ----------- | ------ | ------ | ------- |
| A. Smoke Tests | 27 | | | |
| B. CRUD Flows | 92 | | | |
| C. Public Flows | 17 | | | |
| D. Platform Admin | 17 | | | |
| E. Navigation & UI | 20 | | | |
| F. Edge Cases | 36 | | | |
| G. Console/Network | 16 | | | |
| **TOTAL** | **225** | | | |

Additional test cases discovered during testing should be appended below:

### Ad-hoc Findings

_Record any bugs, unexpected behaviors, or additional test cases discovered during testing here._

| # | Page/Feature | Description | Severity | Status |
| - | ------------ | ----------- | -------- | ------ |
| | | | | |
