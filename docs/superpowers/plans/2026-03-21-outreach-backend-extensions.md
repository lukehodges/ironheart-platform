# Outreach Backend Extensions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the outreach module backend with schema changes, new endpoints, and Inngest crons needed to power the Phase 1 UI (Dashboard, Contact Detail, Replies, Contact Import).

**Architecture:** Add 3 columns to `outreach_contacts`, 2 columns + 1 enum value to `outreach_activities`, and wire new service/repository/router methods for categorization, snooze, batch operations, undo, and import. Fix missing `sector` field in the activity logged event. Add Inngest cron for snooze reactivation.

**Tech Stack:** Drizzle ORM, tRPC 11, Zod v4, Inngest, Vitest

**Spec:** `docs/superpowers/specs/2026-03-21-outreach-ui-design.md`
**Backend spec:** `docs/superpowers/specs/2026-03-20-outreach-module-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/shared/db/schemas/outreach.schema.ts` | Modify | Add enums, columns to contacts + activities |
| `src/shared/inngest.ts` | Modify | Add `sector` to activity.logged event |
| `src/modules/outreach/outreach.types.ts` | Modify | Add new types, update records |
| `src/modules/outreach/outreach.schemas.ts` | Modify | Add Zod schemas for new endpoints |
| `src/modules/outreach/outreach.repository.ts` | Modify | Add repo methods for new operations |
| `src/modules/outreach/outreach.service.ts` | Modify | Add service methods, fix event emission |
| `src/modules/outreach/outreach.router.ts` | Modify | Add new tRPC procedures |
| `src/modules/outreach/outreach.events.ts` | Modify | Add snooze cron function, update event destructuring |
| `src/modules/outreach/index.ts` | Modify | Export new types |
| `src/modules/outreach/__tests__/outreach.test.ts` | Create | Tests for all new functionality |

---

### Task 1: Schema — Add enums and columns

**Files:**
- Modify: `src/shared/db/schemas/outreach.schema.ts`

- [ ] **Step 1: Add the two new pgEnums after the existing enums (after line 45)**

```typescript
export const outreachSentimentEnum = pgEnum("outreach_sentiment", [
  "POSITIVE",
  "NEUTRAL",
  "NEGATIVE",
  "NOT_NOW",
])

export const outreachReplyCategoryEnum = pgEnum("outreach_reply_category", [
  "INTERESTED",
  "NOT_NOW",
  "NOT_INTERESTED",
  "WRONG_PERSON",
  "AUTO_REPLY",
])
```

- [ ] **Step 2: Add `UNDONE` to `outreachActivityTypeEnum` (line 36)**

Change the array to include `"UNDONE"` at the end:
```typescript
export const outreachActivityTypeEnum = pgEnum("outreach_activity_type", [
  "SENT",
  "REPLIED",
  "BOUNCED",
  "OPTED_OUT",
  "SKIPPED",
  "CALL_COMPLETED",
  "MEETING_BOOKED",
  "CONVERTED",
  "UNDONE",
])
```

- [ ] **Step 3: Add 3 columns to `outreachContacts` table (after `notes` column, line 94)**

```typescript
  sentiment: outreachSentimentEnum(),
  replyCategory: outreachReplyCategoryEnum(),
  snoozedUntil: timestamp({ precision: 3, mode: 'date' }),
```

- [ ] **Step 4: Add 2 columns to `outreachActivities` table (after `notes` column, line 135)**

```typescript
  performedByUserId: uuid(),
  previousState: jsonb().$type<{ currentStep: number; status: string; nextDueAt: string | null }>(),
```

Add a foreign key for `performedByUserId` in the table's constraint array:
```typescript
  foreignKey({
    columns: [table.performedByUserId],
    foreignColumns: [users.id],
    name: "outreach_activities_performedByUserId_fkey",
  }).onUpdate("cascade").onDelete("set null"),
```

Note: Import `users` is already present (line 18).

- [ ] **Step 5: Update type aliases at bottom of file**

The `$inferSelect` types auto-update from the table definitions, so no changes needed to the type aliases section.

- [ ] **Step 6: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors related to outreach schema (there may be pre-existing errors elsewhere).

- [ ] **Step 7: Commit**

```bash
git add src/shared/db/schemas/outreach.schema.ts
git commit -m "feat(outreach): add sentiment, replyCategory, snoozedUntil, previousState schema columns"
```

---

### Task 2: Types — Update type interfaces

**Files:**
- Modify: `src/modules/outreach/outreach.types.ts`

- [ ] **Step 1: Add new type unions after `OutreachChannel` (after line 28)**

```typescript
export type OutreachSentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "NOT_NOW"

export type OutreachReplyCategory =
  | "INTERESTED"
  | "NOT_NOW"
  | "NOT_INTERESTED"
  | "WRONG_PERSON"
  | "AUTO_REPLY"
```

- [ ] **Step 2: Add `"UNDONE"` to `OutreachActivityType` union (line 22)**

Add `| "UNDONE"` after `| "CONVERTED"`.

- [ ] **Step 3: Add 3 fields to `OutreachContactRecord` (after `notes` field, line 76)**

```typescript
  sentiment: OutreachSentiment | null
  replyCategory: OutreachReplyCategory | null
  snoozedUntil: Date | null
```

- [ ] **Step 4: Add 2 fields to `OutreachActivityRecord` (after `notes` field, line 91)**

```typescript
  performedByUserId: string | null
  previousState: { currentStep: number; status: string; nextDueAt: string | null } | null
```

- [ ] **Step 5: Add sentiment derivation helper and new derived types at end of file**

```typescript
// ---------------------------------------------------------------------------
// Sentiment derivation
// ---------------------------------------------------------------------------

const CATEGORY_TO_SENTIMENT: Record<OutreachReplyCategory, OutreachSentiment> = {
  INTERESTED: "POSITIVE",
  NOT_NOW: "NOT_NOW",
  NOT_INTERESTED: "NEGATIVE",
  WRONG_PERSON: "NEUTRAL",
  AUTO_REPLY: "NEUTRAL",
}

export function deriveSentiment(category: OutreachReplyCategory): OutreachSentiment {
  return CATEGORY_TO_SENTIMENT[category]
}

// ---------------------------------------------------------------------------
// Import result
// ---------------------------------------------------------------------------

export interface ImportResult {
  imported: number
  skipped: number
  skippedEmails: string[]
}
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/outreach/outreach.types.ts
git commit -m "feat(outreach): add sentiment, replyCategory, UNDONE types"
```

---

### Task 3: Inngest — Add sector to activity.logged event

**Files:**
- Modify: `src/shared/inngest.ts`

- [ ] **Step 1: Add `sector` field to `outreach/activity.logged` event (line 236-243)**

Replace the existing event definition:
```typescript
  "outreach/activity.logged": {
    data: {
      contactId: string;
      sequenceId: string;
      customerId: string;
      activityType: string;
      sector: string;
      tenantId: string;
    };
  };
```

Note: Inngest cron functions do NOT need a custom event type in `IronheartEvents` — they trigger on a cron schedule, not an event. Do NOT add an `outreach/snooze.check` event type.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep -i "outreach" | head -20`
Expected: Error in `outreach.service.ts` at the `inngest.send` call — missing `sector` field. This is expected and will be fixed in Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/shared/inngest.ts
git commit -m "feat(outreach): add sector field to activity.logged event type"
```

---

### Task 4: Schemas — Add Zod validation schemas for new endpoints

**Files:**
- Modify: `src/modules/outreach/outreach.schemas.ts`

- [ ] **Step 1: Add new schemas at the end of the Contact schemas section (after line 103)**

```typescript
// IMPORTANT: Do NOT add "UNDONE" to logActivitySchema above — UNDONE is only created
// internally by the undoActivity service method, never by user input.

export const categorizeContactSchema = z.object({
  contactId: z.uuid(),
  replyCategory: z.enum([
    'INTERESTED',
    'NOT_NOW',
    'NOT_INTERESTED',
    'WRONG_PERSON',
    'AUTO_REPLY',
  ]),
})

export const snoozeContactSchema = z.object({
  contactId: z.uuid(),
  snoozedUntil: z.coerce.date(),
})

export const batchLogActivitySchema = z.object({
  contactIds: z.array(z.uuid()).min(1).max(50),
  activityType: z.enum(['SENT', 'SKIPPED']),
  notes: z.string().max(1000).optional(),
})

export const undoActivitySchema = z.object({
  contactId: z.uuid(),
  activityId: z.uuid(),
})

// NOTE: importContactsSchema and bulkEnrollSchema are schema stubs for Plan 2 (Dashboard + Contacts).
// Service/repository/router implementation deferred to that plan.
export const importContactsSchema = z.object({
  contacts: z.array(z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().max(100).optional(),
    email: z.string().email().max(200),
    company: z.string().max(200).optional(),
    sector: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
  })).min(1).max(500),
  sequenceId: z.uuid().optional(),
})

export const bulkEnrollSchema = z.object({
  customerIds: z.array(z.uuid()).min(1).max(100),
  sequenceId: z.uuid(),
  assignedUserId: z.uuid().optional(),
})

export const getContactDetailSchema = z.object({
  contactId: z.uuid(),
})

export const getContactActivitiesSchema = z.object({
  contactId: z.uuid(),
  cursor: z.uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
})
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/outreach/outreach.schemas.ts
git commit -m "feat(outreach): add Zod schemas for categorize, snooze, batch, undo, import endpoints"
```

---

### Task 5: Repository — Add new query methods

**Files:**
- Modify: `src/modules/outreach/outreach.repository.ts`

- [ ] **Step 1: Write the test for categorizeContact**

Create `src/modules/outreach/__tests__/outreach.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock dependencies before imports
vi.mock("@/shared/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), transaction: vi.fn() },
}))
vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock("@/shared/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}))
vi.mock("@/modules/outreach/outreach.repository", () => ({
  outreachRepository: {
    findContactById: vi.fn(),
    findSequenceById: vi.fn(),
    categorizeContact: vi.fn(),
    snoozeContact: vi.fn(),
    logActivity: vi.fn(),
    updateContactStatus: vi.fn(),
    reactivateSnoozedContacts: vi.fn(),
    findActivityById: vi.fn(),
    getDueContacts: vi.fn(),
    getOverdueContacts: vi.fn(),
    getRecentReplies: vi.fn(),
    getTodayStats: vi.fn(),
    listSequences: vi.fn(),
  },
}))
vi.mock("@/modules/pipeline/pipeline.service", () => ({
  pipelineService: { addMember: vi.fn() },
}))

import { outreachService } from "../outreach.service"
import { outreachRepository } from "../outreach.repository"
import { inngest } from "@/shared/inngest"
import { BadRequestError } from "@/shared/errors"

const repo = outreachRepository as unknown as Record<string, ReturnType<typeof vi.fn>>

const TENANT_ID = "t-00000000-0000-0000-0000-000000000001"
const CONTACT_ID = "c-00000000-0000-0000-0000-000000000001"
const SEQUENCE_ID = "s-00000000-0000-0000-0000-000000000001"
const CUSTOMER_ID = "u-00000000-0000-0000-0000-000000000001"
const ACTIVITY_ID = "a-00000000-0000-0000-0000-000000000001"

const ctx = { tenantId: TENANT_ID, userId: "user-1", permissions: ["outreach:write"] }

function makeContact(overrides: Record<string, unknown> = {}) {
  return {
    id: CONTACT_ID,
    tenantId: TENANT_ID,
    customerId: CUSTOMER_ID,
    sequenceId: SEQUENCE_ID,
    assignedUserId: null,
    status: "ACTIVE",
    currentStep: 1,
    nextDueAt: new Date(),
    enrolledAt: new Date(),
    completedAt: null,
    lastActivityAt: null,
    pipelineMemberId: null,
    notes: null,
    sentiment: null,
    replyCategory: null,
    snoozedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeSequence(overrides: Record<string, unknown> = {}) {
  return {
    id: SEQUENCE_ID,
    tenantId: TENANT_ID,
    name: "Test Sequence",
    description: null,
    sector: "recruitment",
    targetIcp: null,
    isActive: true,
    abVariant: null,
    pairedSequenceId: null,
    steps: [
      { position: 1, channel: "EMAIL", delayDays: 0, subject: "Hello {{firstName}}", bodyMarkdown: "Hi there", notes: null },
      { position: 2, channel: "EMAIL", delayDays: 3, subject: "Follow up", bodyMarkdown: "Following up", notes: null },
    ],
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: ACTIVITY_ID,
    tenantId: TENANT_ID,
    contactId: CONTACT_ID,
    sequenceId: SEQUENCE_ID,
    customerId: CUSTOMER_ID,
    stepPosition: 1,
    channel: "EMAIL",
    activityType: "SENT",
    deliveredTo: null,
    notes: null,
    performedByUserId: null,
    previousState: null,
    occurredAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe("outreachService.categorizeContact", () => {
  it("sets replyCategory and derives sentiment for a REPLIED contact", async () => {
    repo.findContactById.mockResolvedValue(makeContact({ status: "REPLIED" }))
    repo.categorizeContact.mockResolvedValue(
      makeContact({ status: "REPLIED", replyCategory: "INTERESTED", sentiment: "POSITIVE" }),
    )

    const result = await outreachService.categorizeContact(ctx, {
      contactId: CONTACT_ID,
      replyCategory: "INTERESTED",
    })

    expect(repo.categorizeContact).toHaveBeenCalledWith(
      TENANT_ID,
      CONTACT_ID,
      "INTERESTED",
      "POSITIVE",
    )
    expect(result.replyCategory).toBe("INTERESTED")
    expect(result.sentiment).toBe("POSITIVE")
  })

  it("rejects categorization for non-REPLIED contacts", async () => {
    repo.findContactById.mockResolvedValue(makeContact({ status: "ACTIVE" }))

    await expect(
      outreachService.categorizeContact(ctx, { contactId: CONTACT_ID, replyCategory: "INTERESTED" }),
    ).rejects.toThrow(BadRequestError)
  })
})

describe("outreachService.snoozeContact", () => {
  it("sets snoozedUntil for a REPLIED contact", async () => {
    const snoozedUntil = new Date("2026-04-01")
    repo.findContactById.mockResolvedValue(makeContact({ status: "REPLIED" }))
    repo.snoozeContact.mockResolvedValue(
      makeContact({ status: "REPLIED", snoozedUntil }),
    )

    const result = await outreachService.snoozeContact(ctx, {
      contactId: CONTACT_ID,
      snoozedUntil,
    })

    expect(repo.snoozeContact).toHaveBeenCalledWith(TENANT_ID, CONTACT_ID, snoozedUntil)
    expect(result.snoozedUntil).toEqual(snoozedUntil)
  })

  it("rejects snooze for non-REPLIED contacts", async () => {
    repo.findContactById.mockResolvedValue(makeContact({ status: "ACTIVE" }))

    await expect(
      outreachService.snoozeContact(ctx, { contactId: CONTACT_ID, snoozedUntil: new Date() }),
    ).rejects.toThrow(BadRequestError)
  })
})

describe("outreachService.logActivity — sector in event", () => {
  it("includes sector in the outreach/activity.logged event", async () => {
    repo.findContactById.mockResolvedValue(makeContact({ status: "ACTIVE" }))
    repo.findSequenceById.mockResolvedValue(makeSequence())
    repo.logActivity.mockResolvedValue(makeActivity())
    repo.updateContactStatus.mockResolvedValue(makeContact({ currentStep: 2 }))

    await outreachService.logActivity(ctx, { contactId: CONTACT_ID, activityType: "SENT" })

    expect(inngest.send).toHaveBeenCalledWith({
      name: "outreach/activity.logged",
      data: expect.objectContaining({ sector: "recruitment" }),
    })
  })
})

describe("outreachService.undoActivity", () => {
  it("reverts contact state and logs UNDONE activity", async () => {
    const originalState = { currentStep: 1, status: "ACTIVE", nextDueAt: "2026-03-21T00:00:00.000Z" }
    repo.findActivityById.mockResolvedValue(
      makeActivity({ previousState: originalState, occurredAt: new Date() }),
    )
    repo.findContactById.mockResolvedValue(makeContact({ status: "ACTIVE", currentStep: 2 }))
    repo.updateContactStatus.mockResolvedValue(makeContact(originalState))
    repo.logActivity.mockResolvedValue(makeActivity({ activityType: "UNDONE" }))

    await outreachService.undoActivity(ctx, { contactId: CONTACT_ID, activityId: ACTIVITY_ID })

    expect(repo.updateContactStatus).toHaveBeenCalledWith(
      TENANT_ID,
      CONTACT_ID,
      expect.objectContaining({
        currentStep: 1,
        status: "ACTIVE",
      }),
    )
    expect(repo.logActivity).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ activityType: "UNDONE" }),
    )
  })

  it("rejects undo if activity belongs to a different contact", async () => {
    repo.findActivityById.mockResolvedValue(
      makeActivity({ contactId: "other-contact-id", previousState: { currentStep: 1, status: "ACTIVE", nextDueAt: null }, occurredAt: new Date() }),
    )

    await expect(
      outreachService.undoActivity(ctx, { contactId: CONTACT_ID, activityId: ACTIVITY_ID }),
    ).rejects.toThrow(BadRequestError)
  })

  it("rejects undo if activity is older than 30 seconds", async () => {
    const oldDate = new Date(Date.now() - 60_000) // 60 seconds ago
    repo.findActivityById.mockResolvedValue(
      makeActivity({ previousState: { currentStep: 1, status: "ACTIVE", nextDueAt: null }, occurredAt: oldDate }),
    )

    await expect(
      outreachService.undoActivity(ctx, { contactId: CONTACT_ID, activityId: ACTIVITY_ID }),
    ).rejects.toThrow(BadRequestError)
  })
})

describe("outreachService.batchLogActivity", () => {
  it("logs activity for multiple contacts", async () => {
    const contact2Id = "c-00000000-0000-0000-0000-000000000002"
    repo.findContactById
      .mockResolvedValueOnce(makeContact())
      .mockResolvedValueOnce(makeContact({ id: contact2Id }))
    repo.findSequenceById.mockResolvedValue(makeSequence())
    repo.logActivity.mockResolvedValue(makeActivity())
    repo.updateContactStatus.mockResolvedValue(makeContact({ currentStep: 2 }))

    const result = await outreachService.batchLogActivity(ctx, {
      contactIds: [CONTACT_ID, contact2Id],
      activityType: "SENT",
    })

    expect(result.succeeded).toBe(2)
    expect(result.failed).toBe(0)
  })
})

describe("outreachService.reactivateSnoozedContacts", () => {
  it("reactivates contacts whose snooze has expired", async () => {
    repo.reactivateSnoozedContacts.mockResolvedValue(3)

    const count = await outreachService.reactivateSnoozedContacts()

    expect(repo.reactivateSnoozedContacts).toHaveBeenCalled()
    expect(count).toBe(3)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/modules/outreach/__tests__/outreach.test.ts 2>&1 | tail -20`
Expected: FAIL — service methods don't exist yet.

- [ ] **Step 3: Add repository methods to `outreach.repository.ts`**

Add these methods before the closing `};` of the repository object:

```typescript
  async categorizeContact(
    tenantId: string,
    contactId: string,
    replyCategory: string,
    sentiment: string,
  ): Promise<OutreachContactRecord> {
    const [updated] = await db
      .update(outreachContacts)
      .set({
        replyCategory: replyCategory as "INTERESTED" | "NOT_NOW" | "NOT_INTERESTED" | "WRONG_PERSON" | "AUTO_REPLY",
        sentiment: sentiment as "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "NOT_NOW",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(outreachContacts.tenantId, tenantId),
          eq(outreachContacts.id, contactId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("OutreachContact", contactId);
    return toContactRecord(updated);
  },

  async snoozeContact(
    tenantId: string,
    contactId: string,
    snoozedUntil: Date,
  ): Promise<OutreachContactRecord> {
    const [updated] = await db
      .update(outreachContacts)
      .set({
        snoozedUntil,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(outreachContacts.tenantId, tenantId),
          eq(outreachContacts.id, contactId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("OutreachContact", contactId);
    return toContactRecord(updated);
  },

  async reactivateSnoozedContacts(): Promise<number> {
    const now = new Date();

    // Find all snoozed contacts ready for reactivation
    const snoozedContacts = await db
      .select()
      .from(outreachContacts)
      .where(
        and(
          eq(outreachContacts.status, "REPLIED"),
          lte(outreachContacts.snoozedUntil, now),
        ),
      );

    // Reactivate each with nextDueAt = now (so they appear in the due queue immediately)
    for (const row of snoozedContacts) {
      await db
        .update(outreachContacts)
        .set({
          status: "ACTIVE",
          snoozedUntil: null,
          nextDueAt: now,
          updatedAt: now,
        })
        .where(eq(outreachContacts.id, row.id));

      log.info({ tenantId: row.tenantId, contactId: row.id }, "Snoozed contact reactivated");
    }

    return snoozedContacts.length;
  },

  async findActivityById(
    tenantId: string,
    activityId: string,
  ): Promise<OutreachActivityRecord> {
    const [row] = await db
      .select()
      .from(outreachActivities)
      .where(
        and(
          eq(outreachActivities.tenantId, tenantId),
          eq(outreachActivities.id, activityId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundError("OutreachActivity", activityId);
    return toActivityRecord(row);
  },
```

Note: You'll need to add `lte` to the Drizzle ORM imports at the top of the file. Check existing imports — there should already be `eq, and, gte, desc, count, sql` etc. Add `lte` alongside them.

- [ ] **Step 4: Update the `toContactRecord` mapper to include new fields**

Find the `toContactRecord` function in the repository and add:
```typescript
    sentiment: row.sentiment ?? null,
    replyCategory: row.replyCategory ?? null,
    snoozedUntil: row.snoozedUntil ?? null,
```

- [ ] **Step 5: Update the `toActivityRecord` mapper to include new fields**

Find the `toActivityRecord` function and add:
```typescript
    performedByUserId: row.performedByUserId ?? null,
    previousState: row.previousState ?? null,
```

- [ ] **Step 6: Update `logActivity` to accept and store `previousState`**

In the repository's `logActivity` method, add `previousState` to the input type and insert:

Update the input type (around line 607):
```typescript
  async logActivity(
    tenantId: string,
    input: {
      contactId: string;
      sequenceId: string;
      customerId: string;
      stepPosition: number;
      channel: string;
      activityType: string;
      deliveredTo?: string | null;
      notes?: string | null;
      performedByUserId?: string | null;
      previousState?: { currentStep: number; status: string; nextDueAt: string | null } | null;
    },
  ): Promise<OutreachActivityRecord> {
```

Add to the `.values()` call:
```typescript
        performedByUserId: input.performedByUserId ?? null,
        previousState: input.previousState ?? null,
```

And update the existing `activityType` cast on the same `.values()` call to include `UNDONE`:
```typescript
        activityType: input.activityType as "SENT" | "REPLIED" | "BOUNCED" | "OPTED_OUT" | "SKIPPED" | "CALL_COMPLETED" | "MEETING_BOOKED" | "CONVERTED" | "UNDONE",
```

- [ ] **Step 7: Commit**

```bash
git add src/modules/outreach/outreach.repository.ts
git commit -m "feat(outreach): add categorize, snooze, reactivate, findActivity repo methods"
```

---

### Task 6: Service — Add new service methods

**Files:**
- Modify: `src/modules/outreach/outreach.service.ts`

- [ ] **Step 1: Add import for `deriveSentiment` at the top**

```typescript
import { deriveSentiment } from "./outreach.types"
import type { OutreachReplyCategory } from "./outreach.types"
```

- [ ] **Step 2: Fix `sector` field in `logActivity` event emission (around line 239)**

In the existing `logActivity` method, get the sector from the sequence (which is already loaded at line 157). Update the `inngest.send` call:

```typescript
    await inngest.send({
      name: "outreach/activity.logged",
      data: {
        contactId: contact.id,
        sequenceId: contact.sequenceId,
        customerId: contact.customerId,
        activityType: input.activityType,
        sector: sequence.sector,
        tenantId: ctx.tenantId,
      },
    });
```

- [ ] **Step 3: Update `logActivity` to store `previousState` snapshot**

Before the activity insert (around line 165), capture the snapshot:

```typescript
    // 3b. Capture previous state for undo support
    const previousState = {
      currentStep: contact.currentStep,
      status: contact.status,
      nextDueAt: contact.nextDueAt?.toISOString() ?? null,
    };
```

Then pass it to the repository call (also include `performedByUserId` from context):

```typescript
    await outreachRepository.logActivity(ctx.tenantId, {
      contactId: contact.id,
      sequenceId: contact.sequenceId,
      customerId: contact.customerId,
      stepPosition,
      channel,
      activityType: input.activityType,
      deliveredTo: input.deliveredTo,
      notes: input.notes,
      performedByUserId: ctx.userId,
      previousState,
    });
```

- [ ] **Step 4: Add `categorizeContact` method before the Dashboard section**

```typescript
  async categorizeContact(
    ctx: Context,
    input: { contactId: string; replyCategory: OutreachReplyCategory },
  ): Promise<OutreachContactRecord> {
    const contact = await outreachRepository.findContactById(ctx.tenantId, input.contactId);

    if (contact.status !== "REPLIED") {
      throw new BadRequestError(
        `Cannot categorize contact with status ${contact.status}. Contact must be REPLIED.`,
      );
    }

    const sentiment = deriveSentiment(input.replyCategory);
    const updated = await outreachRepository.categorizeContact(
      ctx.tenantId,
      input.contactId,
      input.replyCategory,
      sentiment,
    );

    log.info(
      { tenantId: ctx.tenantId, contactId: input.contactId, replyCategory: input.replyCategory, sentiment },
      "Outreach contact categorized",
    );

    return updated;
  },
```

- [ ] **Step 5: Add `snoozeContact` method**

```typescript
  async snoozeContact(
    ctx: Context,
    input: { contactId: string; snoozedUntil: Date },
  ): Promise<OutreachContactRecord> {
    const contact = await outreachRepository.findContactById(ctx.tenantId, input.contactId);

    if (contact.status !== "REPLIED") {
      throw new BadRequestError(
        `Cannot snooze contact with status ${contact.status}. Contact must be REPLIED.`,
      );
    }

    const updated = await outreachRepository.snoozeContact(
      ctx.tenantId,
      input.contactId,
      input.snoozedUntil,
    );

    log.info(
      { tenantId: ctx.tenantId, contactId: input.contactId, snoozedUntil: input.snoozedUntil },
      "Outreach contact snoozed",
    );

    return updated;
  },
```

- [ ] **Step 6: Add `undoActivity` method**

```typescript
  async undoActivity(
    ctx: Context,
    input: { contactId: string; activityId: string },
  ): Promise<OutreachContactRecord> {
    const activity = await outreachRepository.findActivityById(ctx.tenantId, input.activityId);

    // Validate activity belongs to the specified contact
    if (activity.contactId !== input.contactId) {
      throw new BadRequestError("Activity does not belong to this contact.");
    }

    // Validate time window (30 seconds server-side)
    const elapsed = Date.now() - activity.occurredAt.getTime();
    if (elapsed > 30_000) {
      throw new BadRequestError("Undo window has expired (30 seconds maximum).");
    }

    if (!activity.previousState) {
      throw new BadRequestError("This activity cannot be undone — no previous state recorded.");
    }

    // Revert contact state
    const updated = await outreachRepository.updateContactStatus(
      ctx.tenantId,
      input.contactId,
      {
        currentStep: activity.previousState.currentStep,
        status: activity.previousState.status,
        nextDueAt: activity.previousState.nextDueAt ? new Date(activity.previousState.nextDueAt) : null,
        lastActivityAt: new Date(),
      },
    );

    // Log compensating UNDONE activity
    const contact = await outreachRepository.findContactById(ctx.tenantId, input.contactId);
    const sequence = await outreachRepository.findSequenceById(ctx.tenantId, contact.sequenceId);
    const step = sequence.steps[activity.previousState.currentStep - 1];

    await outreachRepository.logActivity(ctx.tenantId, {
      contactId: input.contactId,
      sequenceId: contact.sequenceId,
      customerId: contact.customerId,
      stepPosition: activity.previousState.currentStep,
      channel: step?.channel ?? "EMAIL",
      activityType: "UNDONE",
      notes: `Undo of ${activity.activityType} at step ${activity.stepPosition}`,
    });

    log.info(
      { tenantId: ctx.tenantId, contactId: input.contactId, activityId: input.activityId },
      "Outreach activity undone",
    );

    return updated;
  },
```

- [ ] **Step 7: Add `batchLogActivity` method**

```typescript
  async batchLogActivity(
    ctx: Context,
    input: { contactIds: string[]; activityType: "SENT" | "SKIPPED"; notes?: string },
  ): Promise<{ succeeded: number; failed: number; errors: Array<{ contactId: string; error: string }> }> {
    const results = { succeeded: 0, failed: 0, errors: [] as Array<{ contactId: string; error: string }> };

    for (const contactId of input.contactIds) {
      try {
        await this.logActivity(ctx, {
          contactId,
          activityType: input.activityType,
          notes: input.notes,
        });
        results.succeeded++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          contactId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    log.info(
      { tenantId: ctx.tenantId, succeeded: results.succeeded, failed: results.failed },
      "Batch outreach activity logged",
    );

    return results;
  },
```

- [ ] **Step 8: Add `reactivateSnoozedContacts` method (no ctx — called by cron)**

```typescript
  async reactivateSnoozedContacts(): Promise<number> {
    const count = await outreachRepository.reactivateSnoozedContacts();
    log.info({ count }, "Reactivated snoozed outreach contacts");
    return count;
  },
```

- [ ] **Step 9: Run tests**

Run: `npx vitest run src/modules/outreach/__tests__/outreach.test.ts 2>&1 | tail -30`
Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/modules/outreach/outreach.service.ts src/modules/outreach/__tests__/outreach.test.ts
git commit -m "feat(outreach): add categorize, snooze, undo, batch service methods + tests"
```

---

### Task 7: Router — Add new tRPC procedures

**Files:**
- Modify: `src/modules/outreach/outreach.router.ts`

- [ ] **Step 1: Add new schema imports (line 3-16)**

Add to the existing import block:
```typescript
  categorizeContactSchema,
  snoozeContactSchema,
  batchLogActivitySchema,
  undoActivitySchema,
  getContactDetailSchema,
  getContactActivitiesSchema,
```

- [ ] **Step 2: Add new procedures to the router object (before the Dashboard comment)**

```typescript
  // Contact — categorize & snooze
  categorizeContact: modulePermission("outreach:write")
    .input(categorizeContactSchema)
    .mutation(async ({ ctx, input }) => outreachService.categorizeContact(ctx, input)),

  snoozeContact: modulePermission("outreach:write")
    .input(snoozeContactSchema)
    .mutation(async ({ ctx, input }) => outreachService.snoozeContact(ctx, input)),

  // Contact — batch & undo
  batchLogActivity: modulePermission("outreach:write")
    .input(batchLogActivitySchema)
    .mutation(async ({ ctx, input }) => outreachService.batchLogActivity(ctx, input)),

  undoActivity: modulePermission("outreach:write")
    .input(undoActivitySchema)
    .mutation(async ({ ctx, input }) => outreachService.undoActivity(ctx, input)),

  // Contact — detail & activities
  getContactDetail: moduleProcedure
    .input(getContactDetailSchema)
    .query(async ({ ctx, input }) => outreachService.getContactById(ctx, input.contactId)),

  getContactActivities: moduleProcedure
    .input(getContactActivitiesSchema)
    .query(async ({ ctx, input }) =>
      outreachService.getContactActivities(ctx, input.contactId, {
        cursor: input.cursor,
        limit: input.limit,
      }),
    ),
```

- [ ] **Step 3: Add `getContactActivities` to the service**

In `outreach.service.ts`, add after the existing `getContactById` method:

```typescript
  async getContactActivities(
    ctx: Context,
    contactId: string,
    pagination: { cursor?: string; limit: number },
  ): Promise<{ activities: OutreachActivityRecord[]; hasMore: boolean }> {
    // Validate contact exists and belongs to tenant
    await outreachRepository.findContactById(ctx.tenantId, contactId);
    const activities = await outreachRepository.getContactActivities(ctx.tenantId, contactId);

    // Apply cursor pagination
    let filtered = activities;
    if (pagination.cursor) {
      const cursorIdx = filtered.findIndex((a) => a.id === pagination.cursor);
      if (cursorIdx >= 0) {
        filtered = filtered.slice(cursorIdx + 1);
      }
    }

    const hasMore = filtered.length > pagination.limit;
    return {
      activities: filtered.slice(0, pagination.limit),
      hasMore,
    };
  },
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors.

- [ ] **Step 5: Run all tests**

Run: `npx vitest run src/modules/outreach/__tests__/outreach.test.ts 2>&1 | tail -20`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/outreach/outreach.router.ts src/modules/outreach/outreach.service.ts
git commit -m "feat(outreach): add categorize, snooze, batch, undo, detail router procedures"
```

---

### Task 8: Events — Add snooze cron Inngest function

**Files:**
- Modify: `src/modules/outreach/outreach.events.ts`
- Modify: `src/modules/outreach/index.ts`

- [ ] **Step 1: Update the event destructuring for `sector` in `onActivityLogged`**

```typescript
const onActivityLogged = inngest.createFunction(
  { id: "outreach-activity-logged", retries: 3 },
  { event: "outreach/activity.logged" },
  async ({ event }) => {
    const { contactId, sequenceId, customerId, activityType, sector, tenantId } = event.data
    log.info({ contactId, sequenceId, customerId, activityType, sector, tenantId }, "Outreach activity logged")
    // Future: fan-out to workflow engine via inngest.send("workflow/trigger", ...)
  }
)
```

- [ ] **Step 2: Add the snooze cron function**

```typescript
const checkSnoozedContacts = inngest.createFunction(
  { id: "outreach-check-snoozed", retries: 2 },
  { cron: "0 6 * * *" }, // Daily at 6am UTC (Inngest default timezone)
  async () => {
    const { outreachService } = await import("./outreach.service")
    const count = await outreachService.reactivateSnoozedContacts()
    log.info({ reactivatedCount: count }, "Checked snoozed outreach contacts")
    return { reactivatedCount: count }
  }
)
```

Note: Use dynamic import to avoid circular dependency (cron → service → inngest → back).

- [ ] **Step 3: Update the exports array**

```typescript
export const outreachFunctions = [onActivityLogged, onContactConverted, checkSnoozedContacts]
```

- [ ] **Step 4: Update `index.ts` to export new types**

Add `ImportResult` to the type exports:

```typescript
export type {
  OutreachSequenceRecord,
  OutreachContactRecord,
  OutreachActivityRecord,
  DailyDashboard,
  ImportResult,
} from "./outreach.types"
```

- [ ] **Step 5: Run type check + tests**

Run: `npx tsc --noEmit 2>&1 | head -20 && npx vitest run src/modules/outreach/__tests__/outreach.test.ts 2>&1 | tail -10`
Expected: No tsc errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/modules/outreach/outreach.events.ts src/modules/outreach/index.ts
git commit -m "feat(outreach): add snooze cron function, fix sector in activity event"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full project type check**

Run: `npx tsc --noEmit 2>&1 | tail -20`
Expected: 0 errors (or only pre-existing unrelated errors).

- [ ] **Step 2: Run outreach tests**

Run: `npx vitest run src/modules/outreach/ 2>&1 | tail -20`
Expected: All tests pass.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run 2>&1 | tail -30`
Expected: All existing tests still pass (no regressions).

- [ ] **Step 4: Run build**

Run: `NEXT_PHASE=phase-production-build npx next build 2>&1 | tail -20`
Expected: Build succeeds.
