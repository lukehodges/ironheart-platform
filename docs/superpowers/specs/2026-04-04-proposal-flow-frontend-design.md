# Proposal Flow Frontend — Design Spec

**Date:** 2026-04-04
**Status:** Draft
**Author:** Luke Hodges + Claude
**Sub-project:** 1 of 4 (Client Portal Frontend)

## Purpose

Build the client-facing proposal pages — the first thing a prospect sees when Luke sends them a proposal link. Handles viewing, approving, declining, and expired proposals, plus client login. Exact visual recreation of the HTML mockups at `.superpowers/brainstorm/63013-1775327512/content/`.

## Scope

5 pages across 2 routes:
- `/portal/[token]` — proposal view, approved, declined, expired (status-driven)
- `/portal/login` — email/password + magic link

## Non-Goals

- Client portal dashboard (sub-project 2)
- Admin proposal creation (sub-project 3)
- Email templates (sub-project 4)
- Payment/Stripe integration (future)

---

## Routes

### `/portal/[token]`

Single client component that fetches the proposal by token and renders based on status:

| Proposal Status | Token Expired? | Renders |
|-----------------|---------------|---------|
| `SENT` | No | `ProposalView` — full proposal with approve/decline CTAs |
| `SENT` | Yes | `ProposalExpired` — expired message + request new link form |
| `APPROVED` | — | `ProposalApproved` — success state + deposit CTA |
| `DECLINED` | — | `ProposalDeclined` — thanks + feedback form |
| `DRAFT` | — | 404 (proposal not yet sent) |
| Not found | — | 404 |

### `/portal/login`

Standalone login page for returning clients with passwords. Two flows:
1. Email + password → creates session → redirects to portal dashboard
2. "Send me a magic link" → calls `requestMagicLink` → shows "check your email" confirmation

---

## Component Structure

```
src/app/portal/
  layout.tsx                        — Fonts (Fraunces + Sora), warm bg, CSS custom properties
  login/page.tsx                    — Login page
  [token]/page.tsx                  — Proposal page (status-driven)

src/components/portal/
  proposal/
    proposal-layout.tsx             — Sticky topbar, 720px wrapper, grain overlay
    proposal-view.tsx               — Full proposal with all sections
    proposal-section.tsx            — Generic section renderer (hides when data empty)
    proposal-approved.tsx           — Success + deposit CTA
    proposal-declined.tsx           — Feedback form
    proposal-expired.tsx            — Request new link form
    proposal-confirm-modal.tsx      — Approval confirmation dialog
  portal-login-form.tsx             — Login form with magic link toggle
```

### `proposal-layout.tsx`

Wraps all proposal states. Provides:
- Sticky topbar with frosted glass backdrop blur (brand name left, status pill right)
- 720px max-width centered wrapper
- Grain texture SVG overlay (from mockup)
- Warm background (`#faf9f7`)

### `proposal-view.tsx`

The main proposal page. Renders sections in order, each from proposal data. A section is hidden if its data is null/empty. Sections:

1. **Hero** — greeting with client name, engagement title, prepared date, reference, validity
2. **Scope** — rich text/markdown rendered as HTML
3. **Deliverables** — numbered cards from `proposal.deliverables[]`
4. **Timeline** — milestones with visual timeline dots and connecting lines, from engagement milestones
5. **Pricing** — total price, breakdown, payment schedule from `proposal.paymentSchedule[]`
6. **Terms** — collapsible accordion from `proposal.terms`
7. **CTA** — "Approve & Get Started" button + "Not right now?" link

Each section follows a consistent pattern: section heading, content, divider. This makes adding new section types (video, custom content) straightforward later — add a new section component and include it in the render list.

### `proposal-confirm-modal.tsx`

Shown when client clicks "Approve & Get Started". Simple centered overlay with:
- "Are you sure?" message with engagement title
- "Yes, approve" primary button
- "Go back" secondary button
- Calls `approveProposal` mutation on confirm

### `proposal-approved.tsx`

Post-approval success page:
- Animated checkmark
- "You're all set, {name}" heading
- "What happens next" card with 3 steps
- Deposit section with amount and "Pay Deposit" button (links to future payment flow)
- "Go to Your Portal" secondary button — the `approveProposal` response includes a `sessionToken`, which is set as a cookie. This button links to `/portal/dashboard` (the portal dashboard, built in sub-project 2). Until sub-project 2 is built, this button can link to a placeholder or be hidden.

### `proposal-declined.tsx`

Post-decline page:
- Empathetic messaging
- Optional feedback textarea with submit
- "Changed your mind?" link back to proposal
- Contact information

### `proposal-expired.tsx`

Expired token page:
- Clock icon
- "This link has expired" message
- Email input + "Send New Link" button (calls `requestMagicLink`)
- Success state after submission
- Contact fallback

### `portal-login-form.tsx`

Login page form:
- Brand section (logo, "Client Portal" subtitle)
- Email + password inputs with amber focus states
- "Forgot password?" link
- "Log In" button
- OR divider
- "Send me a magic link instead" button
- State transitions (form → magic link sent confirmation)

---

## Design System

Exact recreation of mockup styles. No Shadcn components.

### Fonts

Loaded via `next/font/google` in `/portal/layout.tsx`:
- **Fraunces** (variable, optical size 9-144) — headings, weight 300-600
- **Sora** (variable) — body text, weight 300-600

### Colors (CSS Custom Properties)

```
--bg: #faf9f7
--bg-warm: #f5f3ef
--bg-card: #ffffff
--text-1: #1a1a1a
--text-2: #5a5a5a
--text-3: #8a8a8a
--text-4: #b0ada8
--amber: #b8863e
--amber-bright: #c8964c
--amber-light: #e4c78e
--amber-dim: rgba(184,134,62,0.06)
--amber-border: rgba(184,134,62,0.18)
--green: #3d8a5a
--green-light: #e8f5ee
--green-border: rgba(61,138,90,0.2)
--border: #e8e5e0
--border-light: #f0ede8
```

### Shadows

```
--shadow-sm: 0 1px 3px rgba(0,0,0,0.04)
--shadow-md: 0 4px 20px rgba(0,0,0,0.06)
--shadow-lg: 0 12px 48px rgba(0,0,0,0.08)
```

### Visual Details

- Grain texture overlay (SVG noise filter, fixed position, 0.3 opacity)
- Sticky topbar with `backdrop-filter: blur(16px)` and semi-transparent background
- Scroll-triggered fade-up animations on sections
- Animated checkmark stroke on approved page
- Pulsing dot on status pills
- 720px max-width content wrapper
- 15px base font size, 1.7 line height

### Tailwind Implementation

All styles via Tailwind utility classes referencing CSS custom properties:
```tsx
<div className="bg-[var(--bg)] text-[var(--text-1)] font-[var(--font-body)]">
```

Custom properties set on the portal layout's root element. No separate CSS files.

---

## Data Flow

### Fetching

`/portal/[token]/page.tsx`:
```
api.clientPortal.portal.getProposal.useQuery({ token })
```

Returns: proposal record with status, scope, deliverables, paymentSchedule, terms, tokenExpiresAt, plus engagement title and customer name.

Token expiry checked client-side: `proposal.tokenExpiresAt < new Date()` → render expired state.

### Mutations

All public procedures (no session required — proposal token proves identity):

| Action | Mutation | Input |
|--------|----------|-------|
| Approve | `approveProposal` | `{ token }` |
| Decline | `declineProposal` | `{ token, feedback? }` |
| Request new link | `requestMagicLink` | `{ email }` |
| Login | `login` | `{ email, password }` |

On successful approve/decline, the query is invalidated so the page re-renders with the new status.

### Backend Changes Required

`approveProposal` and `declineProposal` must change from `portalProcedure` to `publicProcedure` and accept the proposal `token` instead of `proposalId`. The procedures validate the token, look up the proposal, verify it belongs to the token's customer, then proceed with the existing service logic.

Schema change: add `token` field to `approveProposalSchema` and `declineProposalSchema` (replace `proposalId` with `token`).

Service change: add `approveProposalByToken` and `declineProposalByToken` methods that look up the proposal by token first, then delegate to existing logic.

---

## Error Handling

- **Network errors** — toast notification via Sonner (already in app providers)
- **Invalid token** — `getProposal` returns 404 → render a "proposal not found" message
- **Already approved/declined** — mutation returns error → toast, page already shows correct state from query
- **Expired token** — client-side check renders expired state, server also rejects mutations on expired proposals
- **Login failures** — inline error message below form (not toast — keeps the warm feel)

---

## Accessibility

- Semantic HTML: `<main>`, `<section>`, `<header>`, `<footer>`
- Form labels and `aria-describedby` for hints
- Focus management: modal traps focus, returns focus on close
- Color contrast: all text/background combinations meet WCAG AA
- Keyboard navigation: all interactive elements focusable, Enter/Escape for modal
- Screen reader: status changes announced via `aria-live` region

---

## Testing

- Component renders for each proposal status (SENT, APPROVED, DECLINED, expired)
- Approve flow: click → modal → confirm → mutation called → re-renders as approved
- Decline flow: click → feedback form → submit → mutation called → re-renders as declined
- Expired: shows request form, submits email, shows confirmation
- Login: password flow + magic link flow
- Empty sections hidden when data is null
- Error states render correctly
