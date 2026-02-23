# Bookmarked Overhauls

Items identified during review that need proper planning before implementation.
These are NOT quick fixes — each requires its own architecture/design session.

---

## 1. Dashboard System Overhaul
**Route:** `/admin`
**Problem:** Dashboard cards assume specific modules (bookings, etc.) are enabled. Random "New Booking" button present. No customization.
**Vision:** Complete drag-and-drop dashboard with widget system. Modules register their own widgets. Users can customize their dashboard layout.
**Links to:** `/admin/analytics` — should share the same widget/card system
**Scope:** Large — needs widget registry, layout persistence, module widget API

## 2. Customer Filtering & Search Modal (3 Variations)
**Route:** `/admin/customers`
**Problem:** The "New Booking" button at the top assumes bookings module is enabled. Need module-agnostic search/filter UI.
**Action:** Design 3 variations of the filtering/search modal using frontend-design skill. User will pick the best.
**Also applies to:** `/admin/bookings` — same 3 variations needed there
**Note:** Use `frontend-design` skill when implementing

## 3. Customer Module — Module-Aware Tabs
**Route:** `/admin/customers/[id]` popup
**Problem:** Customer detail popup shows all tabs (forms, bookings, etc.) regardless of whether those modules are enabled.
**Options:**
  - A) Only show tabs for enabled modules
  - B) Show disabled tabs with "Module not enabled — contact your account rep" upsell message
**Decision needed:** Which approach? Option B is more sales-friendly.
**Also:** The "Notes" field in the Edit form vs the Notes tab — clarify distinction and purpose

## 4. Customer Table — Column Selection + Module Gating
**Route:** `/admin/customers`
**Problem:** Table columns for disabled modules (e.g., "Last Booking" when bookings disabled) should be auto-hidden.
**Vision:** Users can select which columns to show. Disabled module columns show "Contact your admin/account rep" if manually enabled.

## 5. Inactive Customer Definition
**Problem:** No clear definition of what makes a customer "inactive."
**Questions:**
  - Should users manually toggle inactive status?
  - Should it be automatic after X days of no activity?
  - Should this be a workflow/cron job responsibility?
  - What's the threshold? Configurable per tenant?
**Decision needed before implementing**

## 6. Settings Module — Deep Architecture
**Route:** `/settings`
**Problem:** Settings is not fleshed out as a proper module. Needs clear separation:
  - **Tenant/Org settings** — business-wide config
  - **User/personal settings** — individual preferences
  - **Staff settings** — as a staff member vs as their manager viewing/editing
  - **Module settings** — per-module configuration (already partially at /settings/modules)
**Scope:** Large — this is foundational infrastructure

## 7. Module Settings System
**Route:** `/settings/modules`
**Problem:** Module enable/disable works, but there's no system for per-module configuration.
**Vision:** Each module can register its own settings schema. Settings UI auto-generates from module config.
**Scope:** Medium-Large — needs module settings registry pattern

## 8. Billing System Architecture
**Route:** `/settings/billing`
**Problem:** No billing architecture defined yet. For a Salesforce-like multi-industry SaaS, billing is complex.
**Considerations:**
  - Per-module pricing? Per-seat? Usage-based?
  - Stripe/payment processor integration
  - Plan tiers and feature gating
  - Trial periods
  - Invoice generation
**Scope:** Very Large — needs its own architecture document

## 9. Calendar Module — Multi-Module Integration
**Route:** `/admin/calendar`
**Problem:** Calendar is entirely booking-centric. For a multi-industry platform, calendar needs to integrate with multiple modules.
**Vision:** Calendar should aggregate events from any module that registers calendar items (bookings, tasks, deadlines, follow-ups, etc.)
**Pattern:** Module calendar event registry — modules push events to calendar via a standard interface
**Scope:** Large

## 10. Scheduling + Staff + Calendar Merge
**Route:** `/admin/scheduling`, `/admin/staff`, `/admin/calendar`
**Problem:** These three areas are fragmented and overlapping. Scheduling, staff management, and calendar are tightly coupled but implemented separately.
**Action:** Needs architectural unification. Define clear boundaries between:
  - Staff/Team management (profiles, roles, permissions)
  - Scheduling (availability, shifts, capacity)
  - Calendar (visual representation, event aggregation)

## 11. Team Module — Industry Standard Review
**Route:** `/admin/team`
**Problem:** Team module needs to be reviewed against industry standards. Currently may be too booking-specific.
**Vision:** Team/staff management that works across industries — not just "who's available for bookings" but proper HR-lite functionality.

## 12. Workflow Module — Deep Integration
**Route:** `/admin/workflow`
**Problem:** Many bugs, not integrating seamlessly with other modules. Needs deep review.
**Vision:** Workflow engine should be the automation backbone — triggers from any module, actions on any module.
**Scope:** Large — engine exists but integration layer needs work

## 13. Forms Module — Industry Standard
**Route:** `/admin/forms`
**Status:** On hold
**Problem:** Forms need to be a proper, flexible system if they're going to be industry-standard.
**Vision:** Form builder, conditional logic, integrations, public forms, embedded forms
**Scope:** Very Large

## 14. Developer Page Expansion
**Route:** `/admin/developer`
**Status:** Works fine currently
**Future:** Should expand into a proper developer portal (API keys, webhooks, integrations, logs)

## 15. Module Dependency System
**Problem:** Need to define which modules are CORE (required for all tenants) vs optional.
**Questions:**
  - Is `team` core since it contains users?
  - Is `customers` core for all industries?
  - What's the minimum viable module set?
**Links to:** MVP definition work

## 16. Seed Data Overhaul
**Priority:** Should be done BEFORE other work
**Problem:** Seed data needs to be properly planned and ready for development/testing
**Files:** scripts/seed-demo-v2.ts
**Action:** Plan and rebuild seed script to properly represent all modules, relationships, and edge cases

---

## Priority Order (Suggested)
1. Seed Data Overhaul (#16) — unblocks everything
2. Module Dependency System (#15) — defines MVP scope
3. Settings Module Architecture (#6) — foundational
4. Scheduling/Staff/Calendar Merge (#10) — resolves fragmentation
5. Everything else follows from MVP definition
