# Proposal Depth Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four missing proposal fields — problem statement, exclusions, client requirements, and ROI calculator — to the schema, admin builder, and client portal view.

**Architecture:** New nullable columns on the `proposals` table. All four fields flow through the existing create path (schema → types → repository → service → router → admin UI → portal view). No new tables, no new procedures — purely additive to the existing proposal record.

**Tech Stack:** Drizzle ORM (postgres.js), Zod v4, tRPC 11, Next.js 15 App Router, React 19, Tailwind 4, shadcn/ui, Vitest

---

## File Map

| File | Change |
|---|---|
| `drizzle/0003_proposal-fields.sql` | **Create** — migration adding 4 columns |
| `src/shared/db/schemas/client-portal.schema.ts` | **Modify** — add 4 columns to `proposals` table |
| `src/modules/client-portal/client-portal.types.ts` | **Modify** — add `RoiData` interface, update `ProposalRecord` |
| `src/modules/client-portal/client-portal.schemas.ts` | **Modify** — update `createProposalSchema` |
| `src/modules/client-portal/client-portal.repository.ts` | **Modify** — update `createProposal` input, `toProposal` mapper, `updateProposal` signature |
| `src/modules/client-portal/client-portal.service.ts` | **Modify** — pass new fields through `createProposal` |
| `src/app/admin/clients/[engagementId]/proposals/new/page.tsx` | **Modify** — add 4 form sections |
| `src/components/portal/proposal/proposal-view.tsx` | **Modify** — render 4 new sections |
| `src/modules/client-portal/__tests__/client-portal.test.ts` | **Modify** — update mock data, add `createProposal` field test |

---

## Task 1: Migration SQL

**Files:**
- Create: `drizzle/0003_proposal-fields.sql`

- [ ] **Step 1: Write the migration**

```sql
ALTER TABLE "proposals" ADD COLUMN "problemStatement" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "requirements" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "roiData" jsonb;
```

- [ ] **Step 2: Commit**

```bash
git add drizzle/0003_proposal-fields.sql
git commit -m "chore(db): add proposal depth fields migration"
```

---

## Task 2: Schema + Types

**Files:**
- Modify: `src/shared/db/schemas/client-portal.schema.ts`
- Modify: `src/modules/client-portal/client-portal.types.ts`

- [ ] **Step 1: Add 4 columns to `proposals` table in schema**

In `src/shared/db/schemas/client-portal.schema.ts`, add these 4 fields inside the `proposals` pgTable definition, after `revisionOf`:

```typescript
    problemStatement: text(),
    exclusions: jsonb().notNull().default(sql`'[]'::jsonb`),
    requirements: jsonb().notNull().default(sql`'[]'::jsonb`),
    roiData: jsonb(),
```

- [ ] **Step 2: Add `RoiData` interface and update `ProposalRecord` in types**

In `src/modules/client-portal/client-portal.types.ts`, add after the `PaymentScheduleItem` interface (in the JSONB shapes section):

```typescript
export interface RoiData {
  hoursPerWeek: number;
  automationPct: number;    // e.g. 80 (not 0.8)
  hourlyRate: number;       // in pence, consistent with rest of system
  additionalValueLabel: string | null;
  additionalValue: number | null;  // in pence
}
```

Then update `ProposalRecord` to add these 4 fields after `revisionOf`:

```typescript
  problemStatement: string | null;
  exclusions: string[];
  requirements: string[];
  roiData: RoiData | null;
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/db/schemas/client-portal.schema.ts src/modules/client-portal/client-portal.types.ts
git commit -m "feat(schema): add problem statement, exclusions, requirements, ROI fields to proposals"
```

---

## Task 3: Zod Schema

**Files:**
- Modify: `src/modules/client-portal/client-portal.schemas.ts`

- [ ] **Step 1: Add `roiDataSchema` sub-schema and update `createProposalSchema`**

In `src/modules/client-portal/client-portal.schemas.ts`, add a `roiDataSchema` after the existing `paymentScheduleItemSchema`:

```typescript
const roiDataSchema = z.object({
  hoursPerWeek: z.number().positive(),
  automationPct: z.number().min(1).max(100),
  hourlyRate: z.number().int().positive(),
  additionalValueLabel: z.string().optional().nullable(),
  additionalValue: z.number().int().optional().nullable(),
});
```

Then update `createProposalSchema` — replace the existing definition with:

```typescript
export const createProposalSchema = z.object({
  engagementId: z.uuid(),
  scope: z.string().min(1),
  deliverables: z.array(proposalDeliverableSchema).default([]),
  price: z.number().int().default(0),
  paymentSchedule: z.array(paymentScheduleItemSchema).default([]),
  terms: z.string().optional().nullable(),
  problemStatement: z.string().optional().nullable(),
  exclusions: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  roiData: roiDataSchema.optional().nullable(),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/client-portal/client-portal.schemas.ts
git commit -m "feat(schemas): add proposal depth fields to createProposalSchema"
```

---

## Task 4: Repository

**Files:**
- Modify: `src/modules/client-portal/client-portal.repository.ts`

- [ ] **Step 1: Update `createProposal` input type**

Find the `async createProposal(input: {` function. Add 4 new fields to its input type after `revisionOf?`:

```typescript
  problemStatement?: string | null;
  exclusions?: string[];
  requirements?: string[];
  roiData?: RoiData | null;
```

- [ ] **Step 2: Update the insert call inside `createProposal`**

Find the `.values({` block inside `createProposal`. Add after `revisionOf: input.revisionOf`:

```typescript
      problemStatement: input.problemStatement ?? null,
      exclusions: input.exclusions ?? [],
      requirements: input.requirements ?? [],
      roiData: input.roiData ?? null,
```

- [ ] **Step 3: Update `toProposal` mapper**

Find `function toProposal(row: ProposalRow): ProposalRecord`. Add after `revisionOf: row.revisionOf ?? null,`:

```typescript
    problemStatement: row.problemStatement ?? null,
    exclusions: (row.exclusions ?? []) as string[],
    requirements: (row.requirements ?? []) as string[],
    roiData: (row.roiData ?? null) as RoiData | null,
```

- [ ] **Step 4: Update `updateProposal` signature**

Find `async updateProposal(id: string, updates: Partial<{ status: string; sentAt: Date; approvedAt: Date; declinedAt: Date }>)`.

Replace the `updates` type with:

```typescript
  updates: Partial<{
    status: string;
    sentAt: Date;
    approvedAt: Date;
    declinedAt: Date;
    problemStatement: string | null;
    exclusions: string[];
    requirements: string[];
    roiData: RoiData | null;
  }>
```

Make sure `RoiData` is imported at the top of the file:

```typescript
import type { ..., RoiData } from "./client-portal.types";
```

- [ ] **Step 5: Run tsc to check for type errors**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors in `client-portal.repository.ts` and `client-portal.types.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/modules/client-portal/client-portal.repository.ts
git commit -m "feat(repo): wire proposal depth fields through repository layer"
```

---

## Task 5: Service

**Files:**
- Modify: `src/modules/client-portal/client-portal.service.ts`

- [ ] **Step 1: Pass new fields through `createProposal`**

Find the `clientPortalRepository.createProposal({` call inside `service.createProposal`. Add after `terms: input.terms`:

```typescript
      problemStatement: input.problemStatement,
      exclusions: input.exclusions,
      requirements: input.requirements,
      roiData: input.roiData,
```

- [ ] **Step 2: Run tsc**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/client-portal/client-portal.service.ts
git commit -m "feat(service): pass proposal depth fields through createProposal"
```

---

## Task 6: Tests

**Files:**
- Modify: `src/modules/client-portal/__tests__/client-portal.test.ts`

- [ ] **Step 1: Find the `makeProposal` (or equivalent) mock helper in the test file**

Search for where `ProposalRecord` mock objects are built in the test file. They will look something like:

```typescript
const mockProposal = {
  id: "...",
  engagementId: "...",
  status: "DRAFT",
  scope: "...",
  ...
}
```

Add these 4 fields to every mock proposal object in the file:

```typescript
  problemStatement: null,
  exclusions: [],
  requirements: [],
  roiData: null,
```

- [ ] **Step 2: Add a test for `createProposal` with the new fields**

Find the `describe("createProposal"` block (or create one if it doesn't exist). Add this test:

```typescript
it("passes problem statement, exclusions, requirements and ROI data through to the repository", async () => {
  const engagement = makeEngagement();
  const roiData = {
    hoursPerWeek: 8,
    automationPct: 80,
    hourlyRate: 2200,  // £22/hr in pence
    additionalValueLabel: "Error reduction",
    additionalValue: 200000,  // £2,000 in pence
  };
  vi.mocked(clientPortalRepository.findEngagement).mockResolvedValue(engagement);
  vi.mocked(clientPortalRepository.createProposal).mockResolvedValue({
    ...makeProposal(),
    problemStatement: "Staff spend 8 hours a week on manual onboarding",
    exclusions: ["CRM changes", "New branding"],
    requirements: ["Admin access to Airtable", "Sample data"],
    roiData,
  });

  const result = await clientPortalService.createProposal(
    makeCtx(),
    {
      engagementId: engagement.id,
      scope: "Automate client onboarding",
      price: 0,
      problemStatement: "Staff spend 8 hours a week on manual onboarding",
      exclusions: ["CRM changes", "New branding"],
      requirements: ["Admin access to Airtable", "Sample data"],
      roiData,
    }
  );

  expect(clientPortalRepository.createProposal).toHaveBeenCalledWith(
    expect.objectContaining({
      problemStatement: "Staff spend 8 hours a week on manual onboarding",
      exclusions: ["CRM changes", "New branding"],
      requirements: ["Admin access to Airtable", "Sample data"],
      roiData,
    })
  );
  expect(result.problemStatement).toBe("Staff spend 8 hours a week on manual onboarding");
  expect(result.exclusions).toEqual(["CRM changes", "New branding"]);
  expect(result.roiData?.hoursPerWeek).toBe(8);
});
```

- [ ] **Step 3: Run the tests**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor && npx vitest run src/modules/client-portal/__tests__/client-portal.test.ts 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/modules/client-portal/__tests__/client-portal.test.ts
git commit -m "test(client-portal): add coverage for proposal depth fields"
```

---

## Task 7: Admin Proposal Builder UI

**Files:**
- Modify: `src/app/admin/clients/[engagementId]/proposals/new/page.tsx`

This is the largest change. Add 4 new form sections to the existing page.

- [ ] **Step 1: Add new imports**

At the top of the file, add `AlertCircle` to the lucide imports:

```typescript
import { ChevronLeft, Send, Plus, Trash2, GripVertical, Layers, CreditCard, FileText, AlertCircle, Users, TrendingUp } from "lucide-react"
```

- [ ] **Step 2: Add `LocalRoiData` type**

After the `LocalPaymentRule` interface, add:

```typescript
interface LocalRoiData {
  hoursPerWeek: string
  automationPct: string
  hourlyRate: string
  additionalValueLabel: string
  additionalValue: string
}
```

- [ ] **Step 3: Add state for new fields**

Inside `NewProposalPage`, after the `const [terms, setTerms] = useState(DEFAULT_TERMS)` line, add:

```typescript
  // New depth fields
  const [problemStatement, setProblemStatement] = useState("")
  const [exclusions, setExclusions] = useState<string[]>([""])
  const [requirements, setRequirements] = useState<string[]>([""])
  const [roiData, setRoiData] = useState<LocalRoiData>({
    hoursPerWeek: "",
    automationPct: "80",
    hourlyRate: "",
    additionalValueLabel: "",
    additionalValue: "",
  })
```

- [ ] **Step 4: Add ROI computed value helper**

After the `const totalPrice = ...` line, add:

```typescript
  const roiAnnualValue = (() => {
    const h = parseFloat(roiData.hoursPerWeek)
    const p = parseFloat(roiData.automationPct)
    const r = parseCurrencyInput(roiData.hourlyRate)
    if (!h || !p || !r) return null
    return Math.round(h * r * 52 * (p / 100))
  })()

  const roiAdditional = parseCurrencyInput(roiData.additionalValue)
  const roiTotal = roiAnnualValue !== null ? roiAnnualValue + roiAdditional : null
```

- [ ] **Step 5: Update `saveAll` to pass new fields**

Find the `createProposal.mutateAsync({` call. Add after `terms: terms.trim() || undefined`:

```typescript
        problemStatement: problemStatement.trim() || undefined,
        exclusions: exclusions.filter(e => e.trim()).map(e => e.trim()),
        requirements: requirements.filter(r => r.trim()).map(r => r.trim()),
        roiData: roiData.hoursPerWeek && roiData.hourlyRate ? {
          hoursPerWeek: parseFloat(roiData.hoursPerWeek),
          automationPct: parseFloat(roiData.automationPct),
          hourlyRate: parseCurrencyInput(roiData.hourlyRate),
          additionalValueLabel: roiData.additionalValueLabel.trim() || null,
          additionalValue: roiAdditional || null,
        } : undefined,
```

- [ ] **Step 6: Add the Problem Statement section to JSX**

Find the `{/* ── Scope ──────────────────────────────────────────── */}` comment. Insert this block **before** it:

```tsx
      {/* ── Problem Statement ──────────────────────────────── */}
      <div>
        <Label className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" /> Problem Statement
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
          The client's problem in their own words — this appears as a pull quote at the top of the proposal
        </p>
        <Textarea
          value={problemStatement}
          onChange={(e) => setProblemStatement(e.target.value)}
          className="mt-1.5 min-h-[80px]"
          placeholder="e.g. "Every time we take on a new tenant, someone here spends the best part of a morning chasing references…""
        />
      </div>

      <Separator className="my-6" />
```

- [ ] **Step 7: Add Exclusions section to JSX**

Find the second `<Separator className="my-6" />` (after the Sections block, before Payment Rules). Insert this block **before** the Payment Rules section:

```tsx
      <Separator className="my-6" />

      {/* ── Exclusions ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" /> What's Not Included
            </p>
            <p className="text-xs text-muted-foreground">Explicit exclusions — protects against scope creep</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setExclusions([...exclusions, ""])}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {exclusions.map((ex, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-muted-foreground text-sm shrink-0">—</span>
              <Input
                value={ex}
                onChange={(e) => setExclusions(exclusions.map((v, j) => j === i ? e.target.value : v))}
                placeholder="e.g. Changes to existing CRM setup"
                className="text-sm flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => setExclusions(exclusions.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-6" />

      {/* ── Requirements ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" /> What We Need From You
            </p>
            <p className="text-xs text-muted-foreground">Client responsibilities — access, data, response times</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRequirements([...requirements, ""])}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {requirements.map((req, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="h-5 w-5 rounded-full border border-border flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                {i + 1}
              </div>
              <Input
                value={req}
                onChange={(e) => setRequirements(requirements.map((v, j) => j === i ? e.target.value : v))}
                placeholder="e.g. Admin access to Airtable base within 2 business days of kickoff"
                className="text-sm flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => setRequirements(requirements.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
```

- [ ] **Step 8: Add ROI Calculator section, before Payment Rules**

Find `{/* ── Payment Rules ──────────────────────────────────────────── */}`. Insert this block immediately before it:

```tsx
      <Separator className="my-6" />

      {/* ── ROI Calculator ─────────────────────────────────── */}
      <div>
        <p className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" /> ROI Calculator
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">
          Shown in the proposal to justify the fee. All optional.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Hours / week</Label>
            <Input
              value={roiData.hoursPerWeek}
              onChange={(e) => setRoiData({ ...roiData, hoursPerWeek: e.target.value })}
              placeholder="e.g. 8"
              className="mt-1 text-sm"
              type="number"
              min="0"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Automation %</Label>
            <Input
              value={roiData.automationPct}
              onChange={(e) => setRoiData({ ...roiData, automationPct: e.target.value })}
              placeholder="80"
              className="mt-1 text-sm"
              type="number"
              min="1"
              max="100"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Hourly rate (£)</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&pound;</span>
              <Input
                value={roiData.hourlyRate}
                onChange={(e) => setRoiData({ ...roiData, hourlyRate: e.target.value })}
                placeholder="0"
                className="text-sm pl-7"
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_140px] gap-3 mt-2">
          <Input
            value={roiData.additionalValueLabel}
            onChange={(e) => setRoiData({ ...roiData, additionalValueLabel: e.target.value })}
            placeholder="Additional value label (e.g. Error reduction savings)"
            className="text-sm"
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&pound;</span>
            <Input
              value={roiData.additionalValue}
              onChange={(e) => setRoiData({ ...roiData, additionalValue: e.target.value })}
              placeholder="0"
              className="text-sm pl-7"
            />
          </div>
        </div>
        {roiTotal !== null && (
          <div className="mt-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Time recovered annually</span>
              <span>{formatCurrency(roiAnnualValue!)}</span>
            </div>
            {roiAdditional > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{roiData.additionalValueLabel || "Additional value"}</span>
                <span>{formatCurrency(roiAdditional)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-foreground mt-1 pt-1 border-t">
              <span>Total annual value</span>
              <span>{formatCurrency(roiTotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground mt-0.5">
              <span>Fee as % of year-one value</span>
              <span>{totalPrice > 0 ? `${Math.round((totalPrice / roiTotal) * 100)}%` : "—"}</span>
            </div>
          </div>
        )}
      </div>

```

- [ ] **Step 9: Run tsc to check for type errors**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 10: Commit**

```bash
git add src/app/admin/clients/[engagementId]/proposals/new/page.tsx
git commit -m "feat(admin): add problem statement, exclusions, requirements, ROI calculator to proposal builder"
```

---

## Task 8: Portal View

**Files:**
- Modify: `src/components/portal/proposal/proposal-view.tsx`

Add 4 new rendered sections. Sections render only when the field has content.

- [ ] **Step 1: Add Problem Statement section — before Scope**

Find `{/* Scope section */}`. Insert this block immediately **before** it:

```tsx
      {/* Problem Statement section */}
      {proposal.problemStatement && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-4 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            The Problem
          </h2>
          <blockquote
            className="border-l-2 pl-5 text-[16px] leading-[1.85]"
            style={{
              borderColor: "var(--amber)",
              color: "var(--text-1)",
              fontFamily: "var(--font-heading)",
              fontStyle: "italic",
              fontWeight: 300,
              background: "rgba(184,134,62,0.04)",
              padding: "20px 20px 20px 24px",
              borderRadius: "0 6px 6px 0",
            }}
          >
            &ldquo;{proposal.problemStatement}&rdquo;
          </blockquote>
        </section>
      )}
```

- [ ] **Step 2: Add Exclusions section — after Deliverables (both legacy and new)**

Find `{/* Timeline section */}`. Insert this block immediately **before** it:

```tsx
      {/* Exclusions section */}
      {proposal.exclusions && proposal.exclusions.length > 0 && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-4 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            What&apos;s Not Included
          </h2>
          <div
            className="rounded-xl border p-5"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
          >
            <ul className="flex flex-col gap-2.5">
              {proposal.exclusions.map((ex, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px]" style={{ color: "var(--text-3)" }}>
                  <span className="mt-0.5 shrink-0" style={{ color: "var(--text-4)" }}>—</span>
                  {ex}
                </li>
              ))}
            </ul>
            <p
              className="mt-4 pt-4 text-[12px] leading-[1.6]"
              style={{ borderTop: "1px solid var(--border)", color: "var(--text-4)" }}
            >
              Any additional work identified during the project will be discussed and priced separately before proceeding.
            </p>
          </div>
        </section>
      )}

      {/* Requirements section */}
      {proposal.requirements && proposal.requirements.length > 0 && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-4 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            What We Need From You
          </h2>
          <div
            className="rounded-xl border p-5"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
          >
            <ul className="flex flex-col gap-3">
              {proposal.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px]" style={{ color: "var(--text-2)" }}>
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                    style={{ border: "1.5px solid var(--amber-border)", color: "var(--amber)", background: "var(--amber-dim)", marginTop: "1px" }}
                  >
                    {i + 1}
                  </div>
                  {req}
                </li>
              ))}
            </ul>
            <p
              className="mt-4 pt-4 text-[12px]"
              style={{ borderTop: "1px solid var(--border)", color: "var(--text-4)" }}
            >
              Please provide the above within 2 business days of kickoff. Delays may affect the timeline.
            </p>
          </div>
        </section>
      )}
```

- [ ] **Step 3: Add ROI section — immediately before the Pricing section**

Find `{/* Pricing section */}`. Insert this block immediately **before** it:

```tsx
      {/* ROI section */}
      {proposal.roiData && (
        <section className="reveal mb-12 opacity-0 transition-all duration-700 ease-out translate-y-5 [&.visible]:opacity-100 [&.visible]:translate-y-0">
          <h2
            className="mb-6 text-[12px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: "var(--amber)" }}
          >
            Return on Investment
          </h2>
          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: "var(--border)" }}
          >
            {(() => {
              const roi = proposal.roiData!;
              const annualValue = Math.round(roi.hoursPerWeek * roi.hourlyRate * 52 * (roi.automationPct / 100));
              const totalValue = annualValue + (roi.additionalValue ?? 0);
              const feeRatio = totalPrice > 0 && totalValue > 0 ? Math.round((totalPrice / totalValue) * 100) : null;
              const paybackMonths = totalPrice > 0 && totalValue > 0 ? Math.ceil((totalPrice / totalValue) * 12) : null;
              return (
                <>
                  <div style={{ borderBottom: "1px solid var(--border)" }}>
                    {[
                      ["Time currently spent", `${roi.hoursPerWeek} hrs / week`],
                      ["Percentage automated", `${roi.automationPct}%`],
                      ["Staff hourly cost", formattedPrice.format(roi.hourlyRate / 100)],
                      ["Annual time value recovered", `~${formattedPrice.format(annualValue / 100)} / year`],
                      ...(roi.additionalValue && roi.additionalValueLabel
                        ? [[roi.additionalValueLabel, `+${formattedPrice.format(roi.additionalValue / 100)} / year`]]
                        : []),
                    ].map(([label, value], i, arr) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-5 py-3"
                        style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border-light)" : undefined }}
                      >
                        <span className="text-[13px]" style={{ color: "var(--text-3)" }}>{label}</span>
                        <span className="text-[13px]" style={{ color: "var(--text-1)" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-4" style={{ background: "rgba(184,134,62,0.04)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
                          Total annual value: {formattedPrice.format(totalValue / 100)}
                        </p>
                        {feeRatio !== null && paybackMonths !== null && (
                          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-4)" }}>
                            Project fee is ~{feeRatio}% of year-one value — pays for itself in {paybackMonths} month{paybackMonths !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </section>
      )}
```

- [ ] **Step 4: Run tsc**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor && npx vitest run 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/portal/proposal/proposal-view.tsx
git commit -m "feat(portal): render problem statement, exclusions, requirements, ROI in proposal view"
```

---

## Task 9: Build Verification

- [ ] **Step 1: Full tsc check**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Full test suite**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor && npx vitest run 2>&1 | tail -30
```

Expected: all tests pass. Note the new count (was 224 before).

- [ ] **Step 3: Next.js build**

```bash
cd /Users/lukehodges/Documents/ironheart-refactor && npx next build 2>&1 | tail -20
```

Expected: successful build, no errors.

- [ ] **Step 4: Final commit if any stray changes**

```bash
git status
```

If clean, no action needed.
