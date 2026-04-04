# Proposal Flow Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the client-facing proposal pages — view, approve, decline, expired, and login — as exact pixel-perfect recreations of the HTML mockups.

**Architecture:** New `/portal` route group with custom layout (Fraunces + Sora fonts, warm amber design system). Status-driven rendering on `/portal/[token]`. Backend changes to support token-based approve/decline as public procedures. All styles via Tailwind utility classes with CSS custom properties.

**Tech Stack:** Next.js 16 App Router, React 19, tRPC 11 + React Query, Tailwind 4, next/font/google

**Spec:** `docs/superpowers/specs/2026-04-04-proposal-flow-frontend-design.md`

**Mockups (source of truth):** `.superpowers/brainstorm/63013-1775327512/content/` — `proposal-view.html`, `proposal-approved.html`, `proposal-declined.html`, `proposal-expired.html`, `portal-login.html`

---

## File Map

### New Files
- `src/app/portal/layout.tsx` — Portal layout with fonts + CSS custom properties
- `src/app/portal/[token]/page.tsx` — Status-driven proposal page
- `src/app/portal/login/page.tsx` — Client login page
- `src/components/portal/proposal/proposal-layout.tsx` — Sticky topbar, 720px wrapper, grain overlay
- `src/components/portal/proposal/proposal-view.tsx` — Full proposal with all sections
- `src/components/portal/proposal/proposal-approved.tsx` — Success state + deposit CTA
- `src/components/portal/proposal/proposal-declined.tsx` — Feedback form
- `src/components/portal/proposal/proposal-expired.tsx` — Request new link form
- `src/components/portal/proposal/proposal-confirm-modal.tsx` — Approval confirmation
- `src/components/portal/portal-login-form.tsx` — Login + magic link form

### Modified Files
- `src/modules/client-portal/client-portal.schemas.ts` — Add token-based approve/decline schemas
- `src/modules/client-portal/client-portal.repository.ts` — Add `findEngagementById`
- `src/modules/client-portal/client-portal.service.ts` — Add `approveProposalByToken`, `declineProposalByToken`, enhance `getProposalByToken`
- `src/modules/client-portal/client-portal.router.ts` — Switch approve/decline to public + token-based

---

### Task 1: Backend — Token-Based Approve/Decline

The frontend needs approve/decline to work without a portal session (client arrives via magic link, no cookie yet). Change these from `portalProcedure` to `publicProcedure` and accept the proposal `token` instead of `proposalId`.

Also enhance `getProposalByToken` to return enriched data the frontend needs (customer name, engagement title, milestones).

**Files:**
- Modify: `src/modules/client-portal/client-portal.schemas.ts`
- Modify: `src/modules/client-portal/client-portal.repository.ts`
- Modify: `src/modules/client-portal/client-portal.service.ts`
- Modify: `src/modules/client-portal/client-portal.router.ts`
- Modify: `src/modules/client-portal/__tests__/client-portal.test.ts`

- [ ] **Step 1: Add token-based schemas**

In `src/modules/client-portal/client-portal.schemas.ts`, add after the existing `declineProposalSchema`:

```typescript
// Token-based versions for public proposal flow (no session required)
export const approveProposalByTokenSchema = z.object({
  token: z.string().min(1),
});

export const declineProposalByTokenSchema = z.object({
  token: z.string().min(1),
  feedback: z.string().optional().nullable(),
});
```

- [ ] **Step 2: Add `findEngagementById` to repository**

In `src/modules/client-portal/client-portal.repository.ts`, add after the existing `findEngagementByCustomer` method:

```typescript
async findEngagementById(engagementId: string): Promise<EngagementRecord | null> {
  const rows = await db
    .select()
    .from(engagements)
    .where(eq(engagements.id, engagementId))
    .limit(1);
  return rows[0] ? toEngagement(rows[0]) : null;
},
```

- [ ] **Step 3: Enhance `getProposalByToken` service method**

The frontend needs customer name, engagement title, and milestones alongside the proposal. Replace the existing `getProposalByToken` in `src/modules/client-portal/client-portal.service.ts`:

```typescript
async getProposalByToken(token: string) {
  const proposal = await clientPortalRepository.findProposalByToken(token);
  if (!proposal) throw new NotFoundError("Proposal", token);

  const engagement = await clientPortalRepository.findEngagementById(proposal.engagementId);
  if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

  const milestones = await clientPortalRepository.listMilestones(engagement.id);

  return {
    ...proposal,
    engagement: {
      id: engagement.id,
      title: engagement.title,
      customerId: engagement.customerId,
      status: engagement.status,
    },
    milestones,
  };
},
```

Note: this now returns ALL statuses (SENT, APPROVED, DECLINED, DRAFT) — the frontend decides what to render. Token expiry is checked client-side for the expired page UI, and server-side in the mutation methods.

- [ ] **Step 4: Add `approveProposalByToken` service method**

Add to `clientPortalService` in `src/modules/client-portal/client-portal.service.ts`:

```typescript
async approveProposalByToken(token: string) {
  const proposal = await clientPortalRepository.findProposalByToken(token);
  if (!proposal) throw new NotFoundError("Proposal", token);
  if (proposal.status !== "SENT") throw new BadRequestError("Proposal cannot be approved");
  if (proposal.tokenExpiresAt < new Date()) throw new BadRequestError("Proposal link has expired");

  const engagement = await clientPortalRepository.findEngagementById(proposal.engagementId);
  if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

  const updated = await clientPortalRepository.updateProposal(proposal.id, {
    status: "APPROVED",
    approvedAt: new Date(),
  });

  await clientPortalRepository.updateEngagement(engagement.tenantId, engagement.id, {
    status: "ACTIVE",
    startDate: new Date(),
  });

  // Create a portal session so the client can access their portal
  const session = await this.createMagicLinkSession(engagement.customerId);

  await inngest.send({
    name: "portal/proposal:approved",
    data: {
      proposalId: proposal.id,
      engagementId: engagement.id,
      customerId: engagement.customerId,
      tenantId: engagement.tenantId,
    },
  });

  log.info({ proposalId: proposal.id }, "Proposal approved by client via token");
  return { proposal: updated, sessionToken: session.sessionToken };
},
```

- [ ] **Step 5: Add `declineProposalByToken` service method**

Add to `clientPortalService` in `src/modules/client-portal/client-portal.service.ts`:

```typescript
async declineProposalByToken(token: string, feedback?: string | null) {
  const proposal = await clientPortalRepository.findProposalByToken(token);
  if (!proposal) throw new NotFoundError("Proposal", token);
  if (proposal.status !== "SENT") throw new BadRequestError("Proposal cannot be declined");
  if (proposal.tokenExpiresAt < new Date()) throw new BadRequestError("Proposal link has expired");

  const engagement = await clientPortalRepository.findEngagementById(proposal.engagementId);
  if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

  const updated = await clientPortalRepository.updateProposal(proposal.id, {
    status: "DECLINED",
    declinedAt: new Date(),
  });

  await inngest.send({
    name: "portal/proposal:declined",
    data: {
      proposalId: proposal.id,
      engagementId: engagement.id,
      customerId: engagement.customerId,
      tenantId: engagement.tenantId,
      feedback: feedback ?? null,
    },
  });

  log.info({ proposalId: proposal.id }, "Proposal declined by client via token");
  return updated;
},
```

- [ ] **Step 6: Update router to use public procedures with token**

In `src/modules/client-portal/client-portal.router.ts`, add these imports at the top:

```typescript
import {
  approveProposalByTokenSchema,
  declineProposalByTokenSchema,
} from "./client-portal.schemas";
```

Then in `portalRouter`, replace the existing `approveProposal` and `declineProposal`:

```typescript
// Public (token-based, no session needed)
approveProposal: publicProcedure
  .input(approveProposalByTokenSchema)
  .mutation(({ input }) =>
    clientPortalService.approveProposalByToken(input.token)),

declineProposal: publicProcedure
  .input(declineProposalByTokenSchema)
  .mutation(({ input }) =>
    clientPortalService.declineProposalByToken(input.token, input.feedback)),
```

- [ ] **Step 7: Add tests for new service methods**

Add to `src/modules/client-portal/__tests__/client-portal.test.ts`:

```typescript
describe("approveProposalByToken", () => {
  it("should approve a proposal by token and return session", async () => {
    const proposal = makeProposal({ status: "SENT" });
    const engagement = makeEngagement({ status: "PROPOSED" });
    vi.mocked(clientPortalRepository.findProposalByToken).mockResolvedValue(proposal);
    vi.mocked(clientPortalRepository.findEngagementById).mockResolvedValue(engagement);
    vi.mocked(clientPortalRepository.updateProposal).mockResolvedValue({
      ...proposal, status: "APPROVED", approvedAt: new Date(),
    });
    vi.mocked(clientPortalRepository.updateEngagement).mockResolvedValue({
      ...engagement, status: "ACTIVE",
    });
    vi.mocked(clientPortalRepository.createSession).mockResolvedValue({
      id: "session-1", customerId: CUSTOMER_ID, token: "tok",
      tokenExpiresAt: new Date(), sessionToken: "sess-tok",
      sessionExpiresAt: new Date(), lastAccessedAt: new Date(), createdAt: new Date(),
    });

    const result = await clientPortalService.approveProposalByToken("test-token");

    expect(result.proposal.status).toBe("APPROVED");
    expect(result.sessionToken).toBe("sess-tok");
    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: "portal/proposal:approved" })
    );
  });

  it("should reject expired token", async () => {
    vi.mocked(clientPortalRepository.findProposalByToken).mockResolvedValue(
      makeProposal({ status: "SENT", tokenExpiresAt: new Date(Date.now() - 86400000) })
    );

    await expect(
      clientPortalService.approveProposalByToken("expired-token")
    ).rejects.toThrow(BadRequestError);
  });
});

describe("declineProposalByToken", () => {
  it("should decline a proposal by token with feedback", async () => {
    const proposal = makeProposal({ status: "SENT" });
    const engagement = makeEngagement();
    vi.mocked(clientPortalRepository.findProposalByToken).mockResolvedValue(proposal);
    vi.mocked(clientPortalRepository.findEngagementById).mockResolvedValue(engagement);
    vi.mocked(clientPortalRepository.updateProposal).mockResolvedValue({
      ...proposal, status: "DECLINED", declinedAt: new Date(),
    });

    const result = await clientPortalService.declineProposalByToken("test-token", "Too expensive");

    expect(result.status).toBe("DECLINED");
    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "portal/proposal:declined",
        data: expect.objectContaining({ feedback: "Too expensive" }),
      })
    );
  });
});
```

Also add `findEngagementById` to the mock at the top of the test file:

```typescript
findEngagementById: vi.fn(),
```

- [ ] **Step 8: Run tests**

Run: `npx vitest run src/modules/client-portal`
Expected: All tests pass (existing 14 + new 3 = 17)

- [ ] **Step 9: Run tsc**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add src/modules/client-portal/
git commit -m "feat(client-portal): add token-based approve/decline for public proposal flow"
```

---

### Task 2: Portal Layout with Design Tokens

Create the portal layout that loads the custom fonts and sets CSS custom properties for the warm design system. This layout wraps all `/portal/*` routes.

**Files:**
- Create: `src/app/portal/layout.tsx`

- [ ] **Step 1: Create the portal layout**

```typescript
// src/app/portal/layout.tsx
import { Fraunces, Sora } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  axes: ["opsz"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "Client Portal — Luke Hodges",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${fraunces.variable} ${sora.variable}`}
      style={{
        // Design tokens matching mockups exactly
        "--bg": "#faf9f7",
        "--bg-warm": "#f5f3ef",
        "--bg-card": "#ffffff",
        "--text-1": "#1a1a1a",
        "--text-2": "#5a5a5a",
        "--text-3": "#8a8a8a",
        "--text-4": "#b0ada8",
        "--amber": "#b8863e",
        "--amber-bright": "#c8964c",
        "--amber-light": "#e4c78e",
        "--amber-dim": "rgba(184,134,62,0.06)",
        "--amber-border": "rgba(184,134,62,0.18)",
        "--green": "#3d8a5a",
        "--green-bright": "#4a9e6e",
        "--green-light": "#e8f5ee",
        "--green-border": "rgba(61,138,90,0.2)",
        "--green-dim": "rgba(61,138,90,0.08)",
        "--border": "#e8e5e0",
        "--border-light": "#f0ede8",
        "--shadow-sm": "0 1px 3px rgba(0,0,0,0.04)",
        "--shadow-md": "0 4px 20px rgba(0,0,0,0.06)",
        "--shadow-lg": "0 12px 48px rgba(0,0,0,0.08)",
      } as React.CSSProperties}
    >
      <div
        className="min-h-screen font-[var(--font-body)]"
        style={{
          background: "var(--bg)",
          color: "var(--text-1)",
          fontSize: "15px",
          lineHeight: 1.7,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders**

Run: `npx next build`
Expected: Build succeeds (no pages using this layout yet, but it should compile)

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/layout.tsx
git commit -m "feat(portal): add portal layout with Fraunces + Sora fonts and design tokens"
```

---

### Task 3: Proposal Layout Component

The shared wrapper for all proposal page states — sticky topbar with frosted glass, 720px content wrapper, and grain texture overlay.

**Files:**
- Create: `src/components/portal/proposal/proposal-layout.tsx`

- [ ] **Step 1: Create the proposal layout**

Reference mockup: `.superpowers/brainstorm/63013-1775327512/content/proposal-view.html` — the topbar and wrapper structure.

```typescript
// src/components/portal/proposal/proposal-layout.tsx
"use client";

interface ProposalLayoutProps {
  children: React.ReactNode;
  /** Status pill text, e.g. "Awaiting Approval". Omit to hide pill. */
  statusPill?: string;
  /** Status pill color variant */
  statusVariant?: "amber" | "green" | "gray";
}

export function ProposalLayout({
  children,
  statusPill,
  statusVariant = "amber",
}: ProposalLayoutProps) {
  const pillColors = {
    amber: {
      bg: "var(--amber-dim)",
      border: "var(--amber-border)",
      text: "var(--amber)",
      dot: "var(--amber)",
    },
    green: {
      bg: "var(--green-dim)",
      border: "var(--green-border)",
      text: "var(--green)",
      dot: "var(--green)",
    },
    gray: {
      bg: "rgba(0,0,0,0.03)",
      border: "rgba(0,0,0,0.08)",
      text: "var(--text-3)",
      dot: "var(--text-4)",
    },
  };

  const pill = pillColors[statusVariant];

  return (
    <div className="relative">
      {/* Grain texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[999]"
        style={{
          opacity: 0.3,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Sticky topbar */}
      <div
        className="sticky top-0 z-50"
        style={{
          background: "rgba(250,249,247,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        <div className="mx-auto flex max-w-[720px] items-center justify-between px-6 py-4">
          {/* Brand mark */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, var(--amber) 0%, var(--amber-bright) 100%)",
                boxShadow: "0 2px 8px rgba(184,134,62,0.25)",
              }}
            >
              L
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-2)" }}
            >
              Luke Hodges
            </span>
          </div>

          {/* Status pill */}
          {statusPill && (
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{
                background: pill.bg,
                border: `1px solid ${pill.border}`,
                color: pill.text,
              }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: pill.dot,
                  animation: statusVariant === "amber" ? "pulse 2s ease-in-out infinite" : undefined,
                }}
              />
              {statusPill}
            </div>
          )}
        </div>
      </div>

      {/* Content wrapper */}
      <div className="mx-auto max-w-[720px] px-6">
        {children}
      </div>

      {/* Pulse animation for status dot */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/portal/proposal/proposal-layout.tsx
git commit -m "feat(portal): add proposal layout with sticky topbar, grain overlay, and brand mark"
```

---

### Task 4: Proposal View Component

The main proposal page showing scope, deliverables, timeline, pricing, terms, and CTA. This is the largest component — exact recreation of `proposal-view.html`.

**Files:**
- Create: `src/components/portal/proposal/proposal-view.tsx`

- [ ] **Step 1: Create the proposal view component**

Reference mockup: `.superpowers/brainstorm/63013-1775327512/content/proposal-view.html` — every section, every style.

```typescript
// src/components/portal/proposal/proposal-view.tsx
"use client";

import { useEffect, useRef } from "react";
import type { ProposalRecord, MilestoneRecord } from "@/modules/client-portal/client-portal.types";
import type { ProposalDeliverable, PaymentScheduleItem } from "@/modules/client-portal/client-portal.types";

interface ProposalViewProps {
  proposal: ProposalRecord & {
    engagement: {
      id: string;
      title: string;
      customerId: string;
      status: string;
    };
    milestones: MilestoneRecord[];
  };
  customerName: string;
  onApprove: () => void;
  onDecline: () => void;
}

export function ProposalView({ proposal, customerName, onApprove, onDecline }: ProposalViewProps) {
  const revealRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for scroll-triggered reveal animations
  useEffect(() => {
    if (!revealRef.current) return;
    const elements = revealRef.current.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const firstName = customerName.split(" ")[0];
  const formattedPrice = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
  });

  return (
    <div ref={revealRef}>
      {/* Hero */}
      <div
        className="relative pb-14 pt-[72px] text-center"
        style={{ animation: "fadeInUp 0.6s ease forwards" }}
      >
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(184,134,62,0.04), transparent)",
          }}
        />
        <div className="relative">
          {/* Meta line */}
          <p
            className="mb-6 text-[12px] font-medium uppercase tracking-[0.15em]"
            style={{ color: "var(--text-4)" }}
          >
            Proposal
          </p>

          {/* Title */}
          <h1
            className="mx-auto mb-6 max-w-[560px] font-[var(--font-heading)]"
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 400,
              lineHeight: 1.25,
            }}
          >
            {proposal.engagement.title}
          </h1>

          {/* Greeting */}
          <p className="mb-8 text-[15px]" style={{ color: "var(--text-2)" }}>
            Hi {firstName} — here&apos;s everything we discussed.
          </p>

          {/* Date and ref */}
          <div className="flex items-center justify-center gap-4 text-[13px]" style={{ color: "var(--text-3)" }}>
            <span>Prepared {new Date(proposal.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span style={{ color: "var(--border)" }}>|</span>
            <span>Ref: {proposal.id.slice(0, 8).toUpperCase()}</span>
            <span style={{ color: "var(--border)" }}>|</span>
            <span>Valid for 30 days</span>
          </div>
        </div>
      </div>

      {/* Ornamental divider */}
      <div className="relative my-10 flex items-center justify-center">
        <div className="h-px w-full" style={{ background: "var(--border)" }} />
        <div
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--amber-light)" }}
        />
      </div>

      {/* Scope section */}
      {proposal.scope && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-2 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            Scope
          </h2>
          <div
            className="text-[15px] leading-[1.8] [&_p]:mb-4"
            style={{ color: "var(--text-2)" }}
            dangerouslySetInnerHTML={{ __html: proposal.scope }}
          />
        </section>
      )}

      {/* Deliverables section */}
      {proposal.deliverables && proposal.deliverables.length > 0 && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-6 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            Deliverables
          </h2>
          <div className="flex flex-col gap-3">
            {proposal.deliverables.map((item: ProposalDeliverable, i: number) => (
              <div
                key={i}
                className="grid gap-4 rounded-lg border p-4"
                style={{
                  gridTemplateColumns: "40px 1fr",
                  borderColor: "var(--border)",
                  background: "var(--bg-card)",
                }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold"
                  style={{
                    border: "2px solid var(--amber-border)",
                    color: "var(--amber)",
                    background: "var(--amber-dim)",
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <h3 className="mb-0.5 text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
                    {item.title}
                  </h3>
                  <p className="text-[13px] leading-[1.6]" style={{ color: "var(--text-3)" }}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline section */}
      {proposal.milestones && proposal.milestones.length > 0 && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-6 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            Timeline
          </h2>
          <div className="relative pl-6">
            {/* Track line */}
            <div
              className="absolute bottom-2 left-[5px] top-2 w-[2px]"
              style={{
                background: "linear-gradient(to bottom, var(--amber-light), var(--border))",
              }}
            />
            <div className="flex flex-col gap-6">
              {proposal.milestones.map((milestone: MilestoneRecord, i: number) => {
                const isActive = milestone.status === "IN_PROGRESS";
                const isComplete = milestone.status === "COMPLETED";
                return (
                  <div key={milestone.id} className="relative">
                    {/* Dot */}
                    <div
                      className="absolute -left-6 top-1 h-[11px] w-[11px] rounded-full"
                      style={{
                        background: isActive || isComplete ? "var(--amber)" : "var(--bg-card)",
                        border: `2px solid ${isActive || isComplete ? "var(--amber)" : "var(--border)"}`,
                      }}
                    />
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
                          {milestone.title}
                        </h3>
                        {isActive && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                            style={{ background: "var(--amber-dim)", color: "var(--amber)", border: "1px solid var(--amber-border)" }}
                          >
                            Current
                          </span>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="mb-1 text-[13px]" style={{ color: "var(--text-3)" }}>
                          {milestone.description}
                        </p>
                      )}
                      {milestone.dueDate && (
                        <p className="text-[12px]" style={{ color: "var(--text-4)" }}>
                          Due {new Date(milestone.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Pricing section */}
      {proposal.price > 0 && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-6 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            Pricing
          </h2>
          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}
          >
            {/* Total */}
            <div className="p-6 text-center" style={{ background: "var(--bg-card)" }}>
              <p className="mb-1 text-[12px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
                Project Total
              </p>
              <p className="font-[var(--font-heading)]" style={{ fontSize: "36px", fontWeight: 300, color: "var(--text-1)" }}>
                {formattedPrice.format(proposal.price / 100)}
              </p>
            </div>

            {/* Payment schedule */}
            {proposal.paymentSchedule && proposal.paymentSchedule.length > 0 && (
              <div style={{ borderTop: "1px solid var(--border)" }}>
                <div className="px-6 pb-2 pt-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-4)" }}>
                    Payment Schedule
                  </p>
                </div>
                {proposal.paymentSchedule.map((item: PaymentScheduleItem, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-3"
                    style={{ borderTop: i > 0 ? "1px solid var(--border-light)" : undefined }}
                  >
                    <div>
                      <p className="text-[14px] font-medium" style={{ color: "var(--text-1)" }}>
                        {item.label}
                      </p>
                      <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
                        {item.dueType === "ON_APPROVAL" && "Due on approval"}
                        {item.dueType === "ON_COMPLETION" && "Due on completion"}
                        {item.dueType === "ON_MILESTONE" && "Due on milestone"}
                        {item.dueType === "ON_DATE" && "Scheduled"}
                      </p>
                    </div>
                    <p className="font-[var(--font-heading)] text-[18px]" style={{ fontWeight: 400, color: "var(--text-1)" }}>
                      {formattedPrice.format(item.amount / 100)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Terms section */}
      {proposal.terms && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <TermsCollapsible terms={proposal.terms} />
        </section>
      )}

      {/* CTA section */}
      <section
        className="pb-16 pt-4 text-center"
        style={{ animation: "fadeInUp 0.6s ease 0.4s forwards", opacity: 0 }}
      >
        {/* Approve button */}
        <button
          onClick={onApprove}
          className="group relative mx-auto mb-4 flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg, var(--text-1) 0%, #2a2a2a 100%)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            width: "100%",
            maxWidth: "380px",
          }}
        >
          <span className="relative z-10">Approve &amp; Get Started</span>
          <svg className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>

        {/* Decline link */}
        <button
          onClick={onDecline}
          className="mb-6 text-[13px] transition-colors hover:underline"
          style={{ color: "var(--text-4)" }}
        >
          Not right now? Let me know
        </button>

        {/* Reassurance */}
        <div className="flex items-center justify-center gap-1.5 text-[12px]" style={{ color: "var(--green)" }}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Secure link. Only you can view this proposal.
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-[13px]" style={{ borderColor: "var(--border-light)", color: "var(--text-4)" }}>
        <p>Prepared by <span className="font-[var(--font-heading)]" style={{ color: "var(--text-2)" }}>Luke Hodges</span></p>
        <p className="mt-1">
          <a href="mailto:luke@lukehodges.uk" className="transition-colors hover:underline" style={{ color: "var(--text-4)" }}>
            luke@lukehodges.uk
          </a>
        </p>
      </footer>
    </div>
  );
}

// ── Terms Collapsible ───────────────────────────────────────────────────

function TermsCollapsible({ terms }: { terms: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between"
      >
        <h2
          className="text-[12px] font-semibold uppercase tracking-[0.15em]"
          style={{ color: "var(--amber)" }}
        >
          Terms &amp; Conditions
        </h2>
        <svg
          className="h-4 w-4 transition-transform duration-300"
          style={{
            color: "var(--text-4)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-all duration-500"
        style={{
          maxHeight: isOpen ? "600px" : "0px",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          className="pt-4 text-[13px] leading-[1.8]"
          style={{ color: "var(--text-3)" }}
          dangerouslySetInnerHTML={{ __html: terms }}
        />
      </div>
    </div>
  );
}
```

Add the missing import at the top:

```typescript
import { useState } from "react";
```

- [ ] **Step 2: Commit**

```bash
git add src/components/portal/proposal/proposal-view.tsx
git commit -m "feat(portal): add proposal view component with all sections"
```

---

### Task 5: Proposal Confirmation Modal

Simple centered overlay for confirming proposal approval.

**Files:**
- Create: `src/components/portal/proposal/proposal-confirm-modal.tsx`

- [ ] **Step 1: Create the confirmation modal**

```typescript
// src/components/portal/proposal/proposal-confirm-modal.tsx
"use client";

import { useEffect, useRef } from "react";

interface ProposalConfirmModalProps {
  engagementTitle: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ProposalConfirmModal({
  engagementTitle,
  isLoading,
  onConfirm,
  onCancel,
}: ProposalConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus trap: focus cancel button on mount
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isLoading, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-6"
      style={{ animation: "fadeIn 0.2s ease" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(26,26,26,0.4)", backdropFilter: "blur(4px)" }}
        onClick={!isLoading ? onCancel : undefined}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-[400px] rounded-xl p-8 text-center"
        style={{
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeInUp 0.3s ease",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h3
          id="confirm-title"
          className="mb-2 font-[var(--font-heading)] text-[20px]"
          style={{ color: "var(--text-1)" }}
        >
          Approve this proposal?
        </h3>
        <p className="mb-6 text-[14px]" style={{ color: "var(--text-3)" }}>
          You&apos;re approving <strong style={{ color: "var(--text-1)" }}>{engagementTitle}</strong>. This will kick things off.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full rounded-lg px-6 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
            style={{
              background: "linear-gradient(135deg, var(--green) 0%, var(--green-bright) 100%)",
              boxShadow: "0 4px 16px rgba(61,138,90,0.25)",
            }}
          >
            {isLoading ? "Approving..." : "Yes, approve"}
          </button>
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isLoading}
            className="w-full rounded-lg px-6 py-3 text-[14px] font-medium transition-colors"
            style={{
              color: "var(--text-3)",
              background: "transparent",
              border: "1px solid var(--border)",
            }}
          >
            Go back
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/portal/proposal/proposal-confirm-modal.tsx
git commit -m "feat(portal): add proposal approval confirmation modal"
```

---

### Task 6: Proposal Approved Component

Post-approval success page with animated checkmark, next steps, deposit CTA, and portal link.

**Files:**
- Create: `src/components/portal/proposal/proposal-approved.tsx`

- [ ] **Step 1: Create the approved component**

Reference mockup: `.superpowers/brainstorm/63013-1775327512/content/proposal-approved.html`

```typescript
// src/components/portal/proposal/proposal-approved.tsx
"use client";

interface ProposalApprovedProps {
  customerName: string;
  engagementTitle: string;
  depositAmount?: number;
  sessionToken?: string;
}

export function ProposalApproved({
  customerName,
  engagementTitle,
  depositAmount,
  sessionToken,
}: ProposalApprovedProps) {
  const firstName = customerName.split(" ")[0];
  const formattedDeposit = depositAmount
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0 }).format(depositAmount / 100)
    : null;

  return (
    <div className="pb-16 pt-16 text-center">
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(61,138,90,0.06), transparent)" }}
      />

      {/* Success icon */}
      <div
        className="relative mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full"
        style={{
          background: "var(--green-light)",
          border: "1px solid var(--green-border)",
          animation: "scaleIn 0.5s ease 0.1s forwards",
          opacity: 0,
        }}
      >
        <svg className="h-8 w-8" style={{ color: "var(--green)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <polyline
            points="6 12 10 16 18 8"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: 24,
              animation: "checkDraw 0.5s ease 0.5s forwards",
            }}
          />
        </svg>
      </div>

      {/* Title */}
      <h1
        className="mb-3 font-[var(--font-heading)]"
        style={{
          fontSize: "clamp(28px, 3.5vw, 38px)",
          fontWeight: 400,
          color: "var(--text-1)",
          animation: "fadeInUp 0.6s ease 0.3s forwards",
          opacity: 0,
        }}
      >
        You&apos;re all set, {firstName}
      </h1>

      <p
        className="mb-10 text-[16px]"
        style={{
          color: "var(--text-2)",
          animation: "fadeInUp 0.6s ease 0.45s forwards",
          opacity: 0,
        }}
      >
        <strong style={{ color: "var(--text-1)" }}>{engagementTitle}</strong> is confirmed.
      </p>

      {/* What happens next */}
      <div
        className="mx-auto mb-8 max-w-[440px] overflow-hidden rounded-xl border text-left"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-md)",
          animation: "fadeInUp 0.6s ease 0.6s forwards",
          opacity: 0,
        }}
      >
        <div className="border-b px-6 py-4" style={{ borderColor: "var(--border-light)" }}>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            What happens next
          </h3>
        </div>
        <div className="flex flex-col">
          {[
            { icon: "check", color: "green", title: "Confirmation email sent", desc: "Check your inbox for a copy of the approved proposal." },
            { icon: "clock", color: "amber", title: "Discovery call this week", desc: "I'll reach out to schedule our kickoff session." },
            { icon: "doc", color: "amber", title: "Contract & invoice", desc: "You'll receive a formal contract and first invoice." },
          ].map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-4 border-b px-6 py-4 last:border-b-0"
              style={{ borderColor: "var(--border-light)" }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: step.color === "green" ? "var(--green-light)" : "var(--amber-dim)",
                  border: step.color === "green" ? "1px solid var(--green-border)" : "1px solid var(--amber-border)",
                }}
              >
                {step.icon === "check" && (
                  <svg className="h-4 w-4" style={{ color: "var(--green)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {step.icon === "clock" && (
                  <svg className="h-4 w-4" style={{ color: "var(--amber)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                )}
                {step.icon === "doc" && (
                  <svg className="h-4 w-4" style={{ color: "var(--amber)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>{step.title}</p>
                <p className="text-[13px]" style={{ color: "var(--text-3)" }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deposit */}
      {formattedDeposit && (
        <div
          className="mx-auto mb-6 max-w-[440px] rounded-xl border p-6 text-center"
          style={{
            borderColor: "var(--amber-border)",
            background: "var(--bg-card)",
            animation: "fadeInUp 0.6s ease 0.75s forwards",
            opacity: 0,
          }}
        >
          <p className="mb-1 text-[12px] font-medium uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>
            Deposit Due
          </p>
          <p className="mb-4 font-[var(--font-heading)]" style={{ fontSize: "36px", fontWeight: 300, color: "var(--text-1)" }}>
            {formattedDeposit}
          </p>
          <button
            className="mx-auto rounded-lg px-8 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, var(--amber) 0%, var(--amber-bright) 100%)",
              boxShadow: "0 4px 16px rgba(184,134,62,0.3)",
            }}
          >
            Pay Deposit
          </button>
          <p className="mt-3 flex items-center justify-center gap-1 text-[11px]" style={{ color: "var(--text-4)" }}>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secure payment via Stripe
          </p>
        </div>
      )}

      {/* Portal link */}
      <div
        style={{ animation: "fadeInUp 0.6s ease 0.9s forwards", opacity: 0 }}
      >
        <div className="my-6 flex items-center gap-3 text-[12px]" style={{ color: "var(--text-4)" }}>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          <span>or</span>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
        </div>

        <a
          href={sessionToken ? "/portal/dashboard" : "#"}
          className="group mx-auto flex max-w-[380px] items-center justify-center gap-2 rounded-lg px-8 py-4 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg, var(--text-1) 0%, #2a2a2a 100%)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        >
          <span>Go to Your Portal</span>
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-[13px]" style={{ color: "var(--text-4)" }}>
        <p>
          Questions? <a href="mailto:luke@lukehodges.uk" className="underline transition-colors" style={{ color: "var(--amber)" }}>luke@lukehodges.uk</a>
        </p>
      </footer>

      <style jsx global>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/portal/proposal/proposal-approved.tsx
git commit -m "feat(portal): add proposal approved component with animated checkmark and next steps"
```

---

### Task 7: Proposal Declined + Expired Components

Two simpler page states — declined with feedback form, expired with request new link form.

**Files:**
- Create: `src/components/portal/proposal/proposal-declined.tsx`
- Create: `src/components/portal/proposal/proposal-expired.tsx`

- [ ] **Step 1: Create the declined component**

Reference mockup: `.superpowers/brainstorm/63013-1775327512/content/proposal-declined.html`

```typescript
// src/components/portal/proposal/proposal-declined.tsx
"use client";

import { useState } from "react";

interface ProposalDeclinedProps {
  customerName: string;
  proposalToken: string;
  onSubmitFeedback: (feedback: string) => void;
}

export function ProposalDeclined({ customerName, proposalToken, onSubmitFeedback }: ProposalDeclinedProps) {
  const firstName = customerName.split(" ")[0];
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (feedback.trim()) {
      onSubmitFeedback(feedback);
    }
    setSubmitted(true);
  }

  return (
    <div className="pb-16 pt-16 text-center">
      {/* Icon */}
      <div
        className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background: "var(--bg-warm)",
          border: "1px solid var(--border)",
          animation: "fadeInUp 0.6s ease 0.1s forwards",
          opacity: 0,
        }}
      >
        <svg className="h-7 w-7" style={{ color: "var(--text-4)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>

      {/* Title */}
      <h1
        className="mb-3 font-[var(--font-heading)]"
        style={{
          fontSize: "clamp(24px, 3vw, 32px)",
          fontWeight: 400,
          color: "var(--text-1)",
          animation: "fadeInUp 0.6s ease 0.25s forwards",
          opacity: 0,
        }}
      >
        Thanks for letting us know
      </h1>

      <p
        className="mx-auto mb-8 max-w-[400px] text-[15px]"
        style={{
          color: "var(--text-2)",
          animation: "fadeInUp 0.6s ease 0.4s forwards",
          opacity: 0,
        }}
      >
        No worries at all, {firstName}. If anything changes in the future, I&apos;m always here.
      </p>

      {/* Feedback card */}
      <div
        className="mx-auto mb-8 max-w-[440px] rounded-xl border p-8 text-left"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-md)",
          animation: "fadeInUp 0.6s ease 0.55s forwards",
          opacity: 0,
        }}
      >
        {!submitted ? (
          <>
            <h3 className="mb-1 text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
              Anything I could do differently?
            </h3>
            <p className="mb-4 text-[13px]" style={{ color: "var(--text-3)" }}>
              Completely optional — but it helps me improve.
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Your thoughts..."
              className="mb-3 w-full resize-none rounded-lg border px-4 py-3 text-[14px] outline-none transition-all"
              style={{
                minHeight: "120px",
                borderColor: "var(--border)",
                background: "var(--bg)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--amber)";
                e.target.style.boxShadow = "0 0 0 3px var(--amber-dim)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }}
            />
            <button
              onClick={handleSubmit}
              className="rounded-lg px-5 py-2.5 text-[13px] font-medium transition-colors"
              style={{
                background: "var(--bg-warm)",
                border: "1px solid var(--border)",
                color: "var(--text-2)",
              }}
            >
              Send Feedback
            </button>
          </>
        ) : (
          <div className="py-4 text-center">
            <p className="text-[14px] font-medium" style={{ color: "var(--green)" }}>
              Thanks for the feedback — it genuinely helps.
            </p>
          </div>
        )}
      </div>

      {/* Changed your mind */}
      <div
        style={{ animation: "fadeInUp 0.6s ease 0.7s forwards", opacity: 0 }}
      >
        <div className="my-6 flex items-center gap-3 text-[12px]" style={{ color: "var(--text-4)" }}>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          <span>Changed your mind?</span>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
        </div>

        <a
          href={`/portal/${proposalToken}`}
          className="group mx-auto flex max-w-[320px] items-center justify-center gap-2 rounded-lg border px-6 py-3 text-[14px] font-medium transition-colors"
          style={{
            borderColor: "var(--amber-border)",
            color: "var(--amber)",
            background: "transparent",
          }}
        >
          <span>View Proposal Again</span>
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>

      {/* Contact section */}
      <div
        className="mt-10 border-t pt-8"
        style={{
          borderColor: "var(--border-light)",
          animation: "fadeInUp 0.6s ease 0.85s forwards",
          opacity: 0,
        }}
      >
        <p className="font-[var(--font-heading)] text-[18px]" style={{ color: "var(--text-1)" }}>Luke Hodges</p>
        <div className="mt-2 flex flex-col items-center gap-1 text-[13px]" style={{ color: "var(--text-3)" }}>
          <a href="mailto:luke@lukehodges.uk" className="transition-colors hover:underline" style={{ color: "var(--text-3)" }}>luke@lukehodges.uk</a>
          <a href="tel:+447000000000" className="transition-colors hover:underline" style={{ color: "var(--text-3)" }}>07XXX XXXXXX</a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the expired component**

Reference mockup: `.superpowers/brainstorm/63013-1775327512/content/proposal-expired.html`

```typescript
// src/components/portal/proposal/proposal-expired.tsx
"use client";

import { useState } from "react";

interface ProposalExpiredProps {
  onRequestNewLink: (email: string) => Promise<void>;
}

export function ProposalExpired({ onRequestNewLink }: ProposalExpiredProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) return;
    setSending(true);
    await onRequestNewLink(email);
    setSent(true);
    setSending(false);
  }

  return (
    <div
      className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center px-6 py-12 text-center"
      style={{ position: "relative" }}
    >
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 35%, rgba(184,134,62,0.05), transparent)" }}
      />

      {/* Clock icon */}
      <div
        className="relative mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full"
        style={{
          background: "var(--bg-warm)",
          border: "1px solid var(--border)",
          animation: "fadeInUp 0.6s ease 0.1s forwards",
          opacity: 0,
        }}
      >
        <svg className="h-8 w-8" style={{ color: "var(--text-4)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M12 6v6l4 2" />
        </svg>
      </div>

      {/* Title */}
      <h1
        className="mb-3 font-[var(--font-heading)]"
        style={{
          fontSize: "clamp(24px, 3vw, 32px)",
          fontWeight: 400,
          color: "var(--text-1)",
          animation: "fadeInUp 0.6s ease 0.2s forwards",
          opacity: 0,
        }}
      >
        This link has expired
      </h1>

      <p
        className="mx-auto mb-8 max-w-[380px] text-[15px]"
        style={{
          color: "var(--text-2)",
          animation: "fadeInUp 0.6s ease 0.35s forwards",
          opacity: 0,
        }}
      >
        For your security, proposal links are only valid for a limited time.
      </p>

      {/* Request card */}
      <div
        className="relative w-full max-w-[400px] rounded-xl border p-8"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeInUp 0.6s ease 0.5s forwards",
          opacity: 0,
        }}
      >
        {!sent ? (
          <>
            <h3 className="mb-1 text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
              Request a new link
            </h3>
            <p className="mb-4 text-[13px]" style={{ color: "var(--text-3)" }}>
              Enter your email and we&apos;ll send a fresh link.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="mb-3 w-full rounded-lg border px-4 py-3 text-[14px] outline-none transition-all"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--amber)";
                e.target.style.boxShadow = "0 0 0 3px var(--amber-dim)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={sending || !email.trim()}
              className="group relative w-full overflow-hidden rounded-lg px-6 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
              style={{
                background: "linear-gradient(135deg, var(--text-1) 0%, #2a2a2a 100%)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {sending ? "Sending..." : "Send New Link"}
                {!sending && (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
              </span>
            </button>
          </>
        ) : (
          <div className="py-4 text-center">
            <div
              className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "var(--green-light)", border: "1px solid var(--green-border)" }}
            >
              <svg className="h-5 w-5" style={{ color: "var(--green)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="mb-1 text-[15px] font-medium" style={{ color: "var(--text-1)" }}>
              Link sent!
            </h4>
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
              Check your inbox for a new proposal link.
            </p>
          </div>
        )}
      </div>

      {/* Contact */}
      <div
        className="mt-8"
        style={{ animation: "fadeInUp 0.6s ease 0.65s forwards", opacity: 0 }}
      >
        <div className="mb-3 flex items-center gap-3 text-[12px]" style={{ color: "var(--text-4)" }}>
          <div className="h-px w-12" style={{ background: "var(--border)" }} />
          <span>Need help?</span>
          <div className="h-px w-12" style={{ background: "var(--border)" }} />
        </div>
        <div className="flex items-center justify-center gap-4 text-[13px]" style={{ color: "var(--text-3)" }}>
          <a href="mailto:luke@lukehodges.uk" className="transition-colors hover:underline">luke@lukehodges.uk</a>
        </div>
      </div>

      {/* Brand footer */}
      <div
        className="mt-10 flex items-center justify-center gap-2"
        style={{ animation: "fadeInUp 0.6s ease 0.8s forwards", opacity: 0 }}
      >
        <div
          className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-[10px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg, var(--amber) 0%, var(--amber-bright) 100%)" }}
        >
          L
        </div>
        <span className="text-[13px] font-medium" style={{ color: "var(--text-3)" }}>Luke Hodges</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/proposal/proposal-declined.tsx src/components/portal/proposal/proposal-expired.tsx
git commit -m "feat(portal): add proposal declined and expired components"
```

---

### Task 8: Portal Login Form

The client login page with email/password and magic link toggle.

**Files:**
- Create: `src/components/portal/portal-login-form.tsx`

- [ ] **Step 1: Create the login form component**

Reference mockup: `.superpowers/brainstorm/63013-1775327512/content/portal-login.html`

```typescript
// src/components/portal/portal-login-form.tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { toast } from "sonner";

export function PortalLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const loginMutation = api.clientPortal.portal.login.useMutation({
    onSuccess: (data) => {
      // Cookie is set server-side; redirect to portal
      window.location.href = "/portal/dashboard";
    },
    onError: (error) => {
      setLoggingIn(false);
      toast.error(error.message || "Invalid email or password");
    },
  });

  const magicLinkMutation = api.clientPortal.portal.requestMagicLink.useMutation({
    onSuccess: () => setMagicLinkSent(true),
    onError: () => setMagicLinkSent(true), // Silent fail — don't reveal if email exists
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoggingIn(true);
    loginMutation.mutate({ email, password });
  }

  function handleMagicLink() {
    if (!email.trim()) {
      toast.error("Enter your email first");
      return;
    }
    magicLinkMutation.mutate({ email });
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-12"
      style={{ position: "relative" }}
    >
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 50% 35% at 50% 30%, rgba(184,134,62,0.06), transparent)" }}
      />

      {/* Brand */}
      <div
        className="relative mb-8 text-center"
        style={{ animation: "fadeInUp 0.6s ease 0.1s forwards", opacity: 0 }}
      >
        <div
          className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[10px] text-[20px] font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, var(--amber) 0%, var(--amber-bright) 100%)",
            boxShadow: "0 4px 16px rgba(184,134,62,0.3)",
          }}
        >
          L
        </div>
        <p className="text-[14px] font-medium" style={{ color: "var(--text-1)" }}>Luke Hodges</p>
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Client Portal</p>
      </div>

      {/* Login card */}
      <div
        className="relative w-full max-w-[400px] rounded-xl border p-9"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeInUp 0.6s ease 0.25s forwards",
          opacity: 0,
        }}
      >
        <h2 className="mb-1 text-center font-[var(--font-heading)] text-[22px]" style={{ color: "var(--text-1)" }}>
          Welcome back
        </h2>
        <p className="mb-6 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
          Sign in to your client portal
        </p>

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[12px] font-medium" style={{ color: "var(--text-2)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg border px-4 py-3 text-[14px] outline-none transition-all"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--amber)";
                e.target.style.boxShadow = "0 0 0 3px var(--amber-dim)";
                e.target.style.background = "var(--bg-card)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
                e.target.style.background = "var(--bg)";
              }}
            />
          </div>

          {/* Password */}
          <div className="mb-2">
            <label className="mb-1.5 block text-[12px] font-medium" style={{ color: "var(--text-2)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border px-4 py-3 text-[14px] outline-none transition-all"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--amber)";
                e.target.style.boxShadow = "0 0 0 3px var(--amber-dim)";
                e.target.style.background = "var(--bg-card)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
                e.target.style.background = "var(--bg)";
              }}
            />
          </div>

          {/* Forgot password */}
          <div className="mb-5 text-right">
            <button
              type="button"
              onClick={handleMagicLink}
              className="text-[12px] transition-colors"
              style={{ color: "var(--text-4)" }}
            >
              Forgot password?
            </button>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loggingIn}
            className="group relative w-full overflow-hidden rounded-lg px-6 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, var(--text-1) 0%, #2a2a2a 100%)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <span className="relative z-10">{loggingIn ? "Signing in..." : "Log In"}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3 text-[12px]" style={{ color: "var(--text-4)" }}>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          <span>or</span>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
        </div>

        {/* Magic link */}
        {!magicLinkSent ? (
          <button
            onClick={handleMagicLink}
            disabled={magicLinkMutation.isPending}
            className="w-full rounded-lg border px-6 py-3 text-[14px] font-medium transition-colors"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-2)",
              background: "transparent",
            }}
          >
            {magicLinkMutation.isPending ? "Sending..." : "Send me a magic link instead"}
          </button>
        ) : (
          <div className="py-2 text-center">
            <div className="flex items-center justify-center gap-2 text-[14px]" style={{ color: "var(--green)" }}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Check your email for a sign-in link
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <p
        className="mt-8 text-[13px]"
        style={{
          color: "var(--text-4)",
          animation: "fadeInUp 0.6s ease 0.4s forwards",
          opacity: 0,
        }}
      >
        Need help? <a href="mailto:luke@lukehodges.uk" className="underline" style={{ color: "var(--text-3)" }}>luke@lukehodges.uk</a>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/portal/portal-login-form.tsx
git commit -m "feat(portal): add client login form with password and magic link flows"
```

---

### Task 9: Page Wiring — Token Page + Login Page

Wire the components into actual Next.js pages with tRPC data fetching.

**Files:**
- Create: `src/app/portal/[token]/page.tsx`
- Create: `src/app/portal/login/page.tsx`

- [ ] **Step 1: Create the token page**

```typescript
// src/app/portal/[token]/page.tsx
"use client";

import { use, useState, useCallback } from "react";
import { api } from "@/lib/trpc/react";
import { ProposalLayout } from "@/components/portal/proposal/proposal-layout";
import { ProposalView } from "@/components/portal/proposal/proposal-view";
import { ProposalApproved } from "@/components/portal/proposal/proposal-approved";
import { ProposalDeclined } from "@/components/portal/proposal/proposal-declined";
import { ProposalExpired } from "@/components/portal/proposal/proposal-expired";
import { ProposalConfirmModal } from "@/components/portal/proposal/proposal-confirm-modal";

export default function ProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const { data: proposal, isLoading, isError, refetch } = api.clientPortal.portal.getProposal.useQuery(
    { token },
    { retry: false, refetchOnWindowFocus: false }
  );

  const approveMutation = api.clientPortal.portal.approveProposal.useMutation({
    onSuccess: (data) => {
      setSessionToken(data.sessionToken);
      setShowConfirm(false);
      refetch();
    },
  });

  const declineMutation = api.clientPortal.portal.declineProposal.useMutation({
    onSuccess: () => refetch(),
  });

  const magicLinkMutation = api.clientPortal.portal.requestMagicLink.useMutation();

  const handleApproveConfirm = useCallback(() => {
    approveMutation.mutate({ token });
  }, [approveMutation, token]);

  const handleDeclineFeedback = useCallback((feedback: string) => {
    declineMutation.mutate({ token, feedback });
  }, [declineMutation, token]);

  const handleRequestNewLink = useCallback(async (email: string) => {
    await magicLinkMutation.mutateAsync({ email });
  }, [magicLinkMutation]);

  // Loading
  if (isLoading) {
    return (
      <ProposalLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-[14px]" style={{ color: "var(--text-3)" }}>Loading proposal...</p>
        </div>
      </ProposalLayout>
    );
  }

  // Not found
  if (isError || !proposal) {
    return (
      <ProposalLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <h1 className="mb-2 font-[var(--font-heading)] text-[24px]" style={{ color: "var(--text-1)" }}>
            Proposal not found
          </h1>
          <p className="text-[14px]" style={{ color: "var(--text-3)" }}>
            This link may be invalid. Please contact Luke for a new one.
          </p>
        </div>
      </ProposalLayout>
    );
  }

  // Check if token expired (for SENT proposals only)
  const isExpired = proposal.status === "SENT" && new Date(proposal.tokenExpiresAt) < new Date();

  // Expired
  if (isExpired) {
    return (
      <ProposalLayout>
        <ProposalExpired onRequestNewLink={handleRequestNewLink} />
      </ProposalLayout>
    );
  }

  // Approved
  if (proposal.status === "APPROVED") {
    const depositItem = proposal.paymentSchedule?.find(
      (p) => p.dueType === "ON_APPROVAL"
    );
    return (
      <ProposalLayout>
        <ProposalApproved
          customerName="Client"
          engagementTitle={proposal.engagement.title}
          depositAmount={depositItem?.amount}
          sessionToken={sessionToken ?? undefined}
        />
      </ProposalLayout>
    );
  }

  // Declined
  if (proposal.status === "DECLINED") {
    return (
      <ProposalLayout>
        <ProposalDeclined
          customerName="Client"
          proposalToken={token}
          onSubmitFeedback={handleDeclineFeedback}
        />
      </ProposalLayout>
    );
  }

  // Draft (not yet sent)
  if (proposal.status === "DRAFT") {
    return (
      <ProposalLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-center">
          <p className="text-[14px]" style={{ color: "var(--text-3)" }}>
            This proposal hasn&apos;t been sent yet.
          </p>
        </div>
      </ProposalLayout>
    );
  }

  // SENT — show full proposal
  return (
    <ProposalLayout statusPill="Awaiting Approval" statusVariant="amber">
      <ProposalView
        proposal={proposal}
        customerName="Client"
        onApprove={() => setShowConfirm(true)}
        onDecline={() => declineMutation.mutate({ token })}
      />

      {showConfirm && (
        <ProposalConfirmModal
          engagementTitle={proposal.engagement.title}
          isLoading={approveMutation.isPending}
          onConfirm={handleApproveConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </ProposalLayout>
  );
}
```

Note: `customerName` is hardcoded as "Client" for now because `getProposalByToken` doesn't return customer name yet. This will be wired up when the customer join is added to the repository query. For the initial build, the proposal components accept `customerName` as a prop so it's ready to be populated.

- [ ] **Step 2: Create the login page**

```typescript
// src/app/portal/login/page.tsx
import { PortalLoginForm } from "@/components/portal/portal-login-form";

export const metadata = {
  title: "Log In — Client Portal",
};

export default function PortalLoginPage() {
  return <PortalLoginForm />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/[token]/page.tsx src/app/portal/login/page.tsx
git commit -m "feat(portal): wire proposal token page and login page with tRPC data fetching"
```

---

### Task 10: Verification

Run tsc, tests, and build to verify everything compiles and works.

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 2: Run client-portal tests**

Run: `npx vitest run src/modules/client-portal`
Expected: All tests pass (17 with the new token-based tests)

- [ ] **Step 3: Run Next.js build**

Run: `NEXT_PHASE=phase-production-build npx next build`
Expected: Build succeeds, new `/portal/[token]` and `/portal/login` routes appear in output

- [ ] **Step 4: Fix any issues and commit**

If any fixes were needed:
```bash
git add -A
git commit -m "fix(portal): address build/type issues from verification"
```
