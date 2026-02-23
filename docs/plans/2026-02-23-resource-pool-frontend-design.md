# Resource Pool Frontend — Design

**Date:** 2026-02-23
**Status:** Approved
**Depends on:** Resource Pool backend (complete), Team module backend (complete)

## Summary

Build the frontend for the Resource Pool system: a staff profile page at `/admin/team/[id]` with 6 tabs, enhanced staff cards with workload badges and skill chips, and a "View full profile" link in the existing team member sheet.

## Decisions

- **Profile page architecture:** Single client-component page with shadcn Tabs. Each tab is a separate component file that owns its own data fetching. Matches existing codebase patterns.
- **Card click behavior:** Keep the quick-view sheet. Add a "View full profile" button that navigates to `/admin/team/[id]`. Two levels of detail.
- **Card density:** Medium — current layout + workload badge + up to 3 skill tag chips.
- **Tab scope:** All 6 tabs from day one (Overview, Skills, Capacity, Availability, Assignments, Activity).
- **Data fetching:** Per-card workload/skills queries (acceptable for <100 staff with React Query deduplication). No bulk endpoint needed yet.

## File Structure

```
src/app/admin/team/[id]/page.tsx              — Profile page (client component)

src/components/team/profile/
  profile-header.tsx                           — Avatar, name, status, quick actions, workload strip
  overview-tab.tsx                             — Employment details, contact, HR fields
  skills-tab.tsx                               — Skill registry: add/remove, expiry warnings
  capacity-tab.tsx                             — Capacity rules, usage bars, date overrides
  availability-tab.tsx                         — Wraps existing AvailabilityEditor
  assignments-tab.tsx                          — Filterable assignment list with pagination
  activity-tab.tsx                             — Audit log for this member

src/components/team/team-member-card.tsx       — Enhanced: workload badge + skill chips
src/components/team/team-member-sheet.tsx      — Add "View full profile" link
```

Updates to:
- `src/modules/team/team.manifest.ts` — add `/admin/team/[id]` route
- Scheduling sidebar entry — remove if present

## Profile Page (`/admin/team/[id]`)

### Layout

- Back button to `/admin/team` at top
- Profile header pinned (not scrolling with tabs)
- Tabs below header, tab content scrollable

### Profile Header

- Large avatar (h-20 w-20)
- Name, job title, employee type
- Status badge with change dropdown
- Contact row (email, phone)
- Quick action buttons: Edit Profile, Block Dates
- Workload summary strip (e.g. "Bookings: 5/8 today")

### Tabs

| Tab | Data Source | UI |
|-----|-----------|-----|
| Overview | `team.getById` (already fetched) | Detail grid: employment type, start date, hourly/day/mileage rates, job title. Edit via dialog. |
| Skills | `team.listSkills` | Grouped by skill type. Skill cards with name, proficiency badge, expiry. Add dialog. Remove with confirm. Expired = amber/red. |
| Capacity | `team.getCapacity` + `team.getWorkload` | Per capacity type: progress bar (used/max). Set capacity form (max daily, concurrent, weekly, effective dates). |
| Availability | `team.getAvailability` | Reuse existing `AvailabilityEditor` component. |
| Assignments | `team.listAssignments` | Table: Module, Type, Status, Date, Weight. Filters: module, status, date range. Pagination. |
| Activity | Audit log | Chronological change list. "Coming soon" placeholder if audit module unavailable. |

## Enhanced Staff Cards

Current card layout plus:

- **Skill chips** (max 3) between status badge and footer, showing skill names as small badges
- **Workload badge** in footer alongside availability indicator (e.g. "5/8")
- Skills from `team.listSkills`, workload from `team.getWorkload` per card

## Sheet Enhancement

- Add "View full profile" button in header (navigates to `/admin/team/[id]`)
- Keep existing 3 tabs (Availability, Capacity, Bookings) as quick-view
- No additional tabs in sheet

## Navigation

- Add `/admin/team/[id]` route to team manifest
- Remove scheduling from sidebar if present

## tRPC Routes Used

| Route | Used By |
|-------|---------|
| `team.list` | Staff list page |
| `team.getById` | Profile page header + overview tab |
| `team.update` | Profile header status change, overview tab edit |
| `team.listSkills` | Skills tab, card skill chips |
| `team.addSkill` | Skills tab add dialog |
| `team.removeSkill` | Skills tab remove action |
| `team.getCapacity` | Capacity tab |
| `team.setCapacity` | Capacity tab form |
| `team.getWorkload` | Profile header workload strip, card workload badge, capacity tab |
| `team.listAssignments` | Assignments tab |
| `team.getAvailability` | Availability tab |
| `team.setAvailability` | Availability tab |
| `team.blockDates` | Profile header quick action, availability tab |
