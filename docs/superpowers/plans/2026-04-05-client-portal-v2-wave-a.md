# Client Portal V2 — Wave A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize proposals from JSONB to relational tables, build a materialization engine that auto-creates milestones/deliverables/invoices on approval, and automate the invoice lifecycle with Stripe integration and reminders.

**Architecture:** Replace `proposals.deliverables` (JSONB) and `proposals.paymentSchedule` (JSONB) with three relational tables: `proposal_sections`, `proposal_items`, and `payment_rules`. On approval, a materialization engine creates downstream entities in a single transaction. A daily Inngest cron handles recurring invoices and overdue reminders.

**Tech Stack:** Drizzle ORM, tRPC 11, Zod v4, Inngest, Vitest, bcryptjs, Stripe (lazy-init)

**Design Spec:** `docs/superpowers/specs/2026-04-05-client-portal-v2-design.md`

---

### Task 1: Schema Migration — New Tables and Modified Columns

**Files:**
- Modify: `src/shared/db/schemas/client-portal.schema.ts`

- [ ] **Step 1: Add HYBRID to engagementType enum and PAUSED to engagementStatus**

In `src/shared/db/schemas/client-portal.schema.ts`, update the enum definitions:

```typescript
export const engagementType = pgEnum("EngagementType", [
  "PROJECT",
  "RETAINER",
  "HYBRID",
]);

export const engagementStatus = pgEnum("EngagementStatus", [
  "DRAFT",
  "PROPOSED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "PAUSED",
]);
```

- [ ] **Step 2: Add CANCELLED to deliverableStatus and VOID to portalInvoiceStatus**

```typescript
export const deliverableStatus = pgEnum("DeliverableStatus", [
  "PENDING",
  "DELIVERED",
  "ACCEPTED",
  "CANCELLED",
]);

export const portalInvoiceStatus = pgEnum("PortalInvoiceStatus", [
  "DRAFT",
  "SENT",
  "PAID",
  "OVERDUE",
  "VOID",
]);
```

- [ ] **Step 3: Add new enums for proposal sections and payment rules**

```typescript
export const proposalSectionType = pgEnum("ProposalSectionType", [
  "PHASE",
  "RECURRING",
  "AD_HOC",
]);

export const paymentRuleTrigger = pgEnum("PaymentRuleTrigger", [
  "MILESTONE_COMPLETE",
  "RECURRING",
  "RELATIVE_DATE",
  "FIXED_DATE",
  "ON_APPROVAL",
]);

export const recurringInterval = pgEnum("RecurringInterval", [
  "MONTHLY",
  "QUARTERLY",
]);
```

- [ ] **Step 4: Add activeProposalId to engagements table**

Add the column to the `engagements` table definition (after `endDate`):

```typescript
activeProposalId: uuid(),
```

Add a foreign key in the table's third argument array:

```typescript
foreignKey({
  columns: [table.activeProposalId],
  foreignColumns: [proposals.id],
  name: "engagements_activeProposalId_fkey",
})
  .onUpdate("cascade")
  .onDelete("set null"),
```

Note: This creates a circular reference between engagements and proposals. The `proposals` import is already in the file since proposals references engagements. This FK must be added AFTER the proposals table is defined. Move the `engagements` table definition below `proposals`, or use `sql` raw reference. The simplest approach: add `activeProposalId` as a plain `uuid()` column without an inline FK, and add the FK constraint in the migration SQL directly.

Actually, the cleanest approach: just add the column as `uuid()` — the foreign key relationship is implicit via application logic. Skip the Drizzle FK constraint to avoid circular reference issues.

- [ ] **Step 5: Modify proposals table — add version, revisionOf; keep JSONB columns for now**

Add new columns to the `proposals` table (we keep the old JSONB columns during transition — they'll be removed in the data migration task):

```typescript
version: integer().notNull().default(1),
revisionOf: uuid(),
```

- [ ] **Step 6: Add proposal_sections table**

After the `proposals` table definition:

```typescript
export const proposalSections = pgTable(
  "proposal_sections",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    proposalId: uuid().notNull(),
    title: text().notNull(),
    description: text(),
    type: proposalSectionType().notNull(),
    sortOrder: integer().notNull().default(0),
    estimatedDuration: text(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("proposal_sections_proposalId_idx").on(table.proposalId),
    foreignKey({
      columns: [table.proposalId],
      foreignColumns: [proposals.id],
      name: "proposal_sections_proposalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);
```

- [ ] **Step 7: Add proposal_items table**

```typescript
export const proposalItems = pgTable(
  "proposal_items",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    sectionId: uuid().notNull(),
    proposalId: uuid().notNull(),
    title: text().notNull(),
    description: text(),
    acceptanceCriteria: text(),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("proposal_items_sectionId_idx").on(table.sectionId),
    index("proposal_items_proposalId_idx").on(table.proposalId),
    foreignKey({
      columns: [table.sectionId],
      foreignColumns: [proposalSections.id],
      name: "proposal_items_sectionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.proposalId],
      foreignColumns: [proposals.id],
      name: "proposal_items_proposalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);
```

- [ ] **Step 8: Add payment_rules table**

```typescript
export const paymentRules = pgTable(
  "payment_rules",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    proposalId: uuid().notNull(),
    tenantId: uuid().notNull(),
    sectionId: uuid(),
    label: text().notNull(),
    amount: integer().notNull(),
    trigger: paymentRuleTrigger().notNull(),
    recurringInterval: recurringInterval(),
    relativeDays: integer(),
    fixedDate: date({ mode: "date" }),
    autoSend: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("payment_rules_proposalId_idx").on(table.proposalId),
    index("payment_rules_tenantId_idx").on(table.tenantId),
    foreignKey({
      columns: [table.proposalId],
      foreignColumns: [proposals.id],
      name: "payment_rules_proposalId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: "payment_rules_tenantId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.sectionId],
      foreignColumns: [proposalSections.id],
      name: "payment_rules_sectionId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ]
);
```

Add the `boolean` import at the top of the file:

```typescript
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
```

- [ ] **Step 9: Add lineage columns to existing tables**

Add `sourceSectionId` to `engagementMilestones`:

```typescript
sourceSectionId: uuid(),
```

Add `sourceProposalItemId` to `deliverables`:

```typescript
sourceProposalItemId: uuid(),
```

Add `sourcePaymentRuleId`, `stripePaymentIntentId`, `stripePaymentUrl`, and `invoiceNumber` to `portalInvoices`:

```typescript
sourcePaymentRuleId: uuid(),
stripePaymentIntentId: text(),
stripePaymentUrl: text(),
invoiceNumber: text(),
```

- [ ] **Step 10: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

Fix any import or type errors. The `boolean` import is the most likely missing one.

- [ ] **Step 11: Generate Drizzle migration**

Run: `npx drizzle-kit generate --name=proposal-normalization`

This creates a SQL migration in `drizzle/`. Review the generated SQL to verify it includes:
- New enum types
- New enum values added to existing enums
- New tables (proposal_sections, proposal_items, payment_rules)
- New columns on existing tables

- [ ] **Step 12: Commit**

```bash
git add src/shared/db/schemas/client-portal.schema.ts drizzle/
git commit -m "feat(schema): add proposal normalization tables and lineage columns"
```

---

### Task 2: Type Definitions — New Interfaces

**Files:**
- Modify: `src/modules/client-portal/client-portal.types.ts`

- [ ] **Step 1: Add new enum types and interfaces**

Add to the top of the file, after the existing enum types:

```typescript
export type EngagementType = "PROJECT" | "RETAINER" | "HYBRID";
export type EngagementStatus = "DRAFT" | "PROPOSED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "PAUSED";
export type DeliverableStatus = "PENDING" | "DELIVERED" | "ACCEPTED" | "CANCELLED";
export type PortalInvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";

export type ProposalSectionType = "PHASE" | "RECURRING" | "AD_HOC";
export type PaymentRuleTrigger = "MILESTONE_COMPLETE" | "RECURRING" | "RELATIVE_DATE" | "FIXED_DATE" | "ON_APPROVAL";
export type RecurringInterval = "MONTHLY" | "QUARTERLY";
```

Note: The existing `EngagementType`, `EngagementStatus`, `DeliverableStatus`, and `PortalInvoiceStatus` types must be REPLACED (not duplicated). Remove the old definitions and replace with the expanded versions above.

- [ ] **Step 2: Add new record interfaces**

After the existing record interfaces:

```typescript
export interface ProposalSectionRecord {
  id: string;
  proposalId: string;
  title: string;
  description: string | null;
  type: ProposalSectionType;
  sortOrder: number;
  estimatedDuration: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposalItemRecord {
  id: string;
  sectionId: string;
  proposalId: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRuleRecord {
  id: string;
  proposalId: string;
  tenantId: string;
  sectionId: string | null;
  label: string;
  amount: number;
  trigger: PaymentRuleTrigger;
  recurringInterval: RecurringInterval | null;
  relativeDays: number | null;
  fixedDate: Date | null;
  autoSend: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 3: Update EngagementRecord to include activeProposalId**

```typescript
export interface EngagementRecord {
  id: string;
  tenantId: string;
  customerId: string;
  type: EngagementType;
  status: EngagementStatus;
  title: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  activeProposalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 4: Update ProposalRecord to include version and revisionOf**

```typescript
export interface ProposalRecord {
  id: string;
  engagementId: string;
  status: ProposalStatus;
  scope: string;
  deliverables: ProposalDeliverable[];
  price: number;
  paymentSchedule: PaymentScheduleItem[];
  terms: string | null;
  token: string;
  tokenExpiresAt: Date;
  version: number;
  revisionOf: string | null;
  sentAt: Date | null;
  approvedAt: Date | null;
  declinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 5: Update MilestoneRecord, DeliverableRecord, PortalInvoiceRecord with lineage fields**

Add `sourceSectionId` to `MilestoneRecord`:

```typescript
export interface MilestoneRecord {
  id: string;
  engagementId: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  sortOrder: number;
  dueDate: Date | null;
  completedAt: Date | null;
  sourceSectionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

Add `sourceProposalItemId` to `DeliverableRecord`:

```typescript
export interface DeliverableRecord {
  id: string;
  engagementId: string;
  milestoneId: string | null;
  title: string;
  description: string | null;
  status: DeliverableStatus;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  deliveredAt: Date | null;
  acceptedAt: Date | null;
  sourceProposalItemId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

Add `sourcePaymentRuleId`, `stripePaymentIntentId`, `stripePaymentUrl`, `invoiceNumber` to `PortalInvoiceRecord`:

```typescript
export interface PortalInvoiceRecord {
  id: string;
  engagementId: string;
  milestoneId: string | null;
  proposalPaymentIndex: number | null;
  amount: number;
  description: string;
  status: PortalInvoiceStatus;
  dueDate: Date;
  paidAt: Date | null;
  paymentMethod: PortalPaymentMethod | null;
  paymentReference: string | null;
  token: string;
  sentAt: Date | null;
  sourcePaymentRuleId: string | null;
  stripePaymentIntentId: string | null;
  stripePaymentUrl: string | null;
  invoiceNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 6: Add ProposalWithSections type for enriched proposal queries**

```typescript
export interface ProposalWithSections extends ProposalRecord {
  sections: (ProposalSectionRecord & { items: ProposalItemRecord[] })[];
  paymentRules: PaymentRuleRecord[];
}
```

- [ ] **Step 7: Update PortalDashboard with financial summary**

```typescript
export interface FinancialSummary {
  totalValue: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
}

export interface PortalDashboard {
  engagement: EngagementRecord;
  pendingApprovals: ApprovalRequestRecord[];
  pendingInvoices: PortalInvoiceRecord[];
  milestones: MilestoneRecord[];
  deliverables: DeliverableRecord[];
  financials: FinancialSummary;
  activity: ActivityItem[];
}
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

Fix any type errors — the updated interfaces will likely cause errors in the repository mappers and service. Those will be fixed in subsequent tasks.

- [ ] **Step 9: Commit**

```bash
git add src/modules/client-portal/client-portal.types.ts
git commit -m "feat(types): add proposal section, item, and payment rule interfaces"
```

---

### Task 3: Zod Schemas — New Input Validation

**Files:**
- Modify: `src/modules/client-portal/client-portal.schemas.ts`

- [ ] **Step 1: Update engagement schemas to support HYBRID type and PAUSED status**

Replace the type enum in `createEngagementSchema`:

```typescript
export const createEngagementSchema = z.object({
  customerId: z.uuid(),
  type: z.enum(["PROJECT", "RETAINER", "HYBRID"]),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  startDate: z.date().optional().nullable(),
});

export const updateEngagementSchema = z.object({
  id: z.uuid(),
  type: z.enum(["PROJECT", "RETAINER", "HYBRID"]).optional(),
  status: z.enum(["DRAFT", "PROPOSED", "ACTIVE", "COMPLETED", "CANCELLED", "PAUSED"]).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
});

export const listEngagementsSchema = z.object({
  status: z.enum(["DRAFT", "PROPOSED", "ACTIVE", "COMPLETED", "CANCELLED", "PAUSED"]).optional(),
  type: z.enum(["PROJECT", "RETAINER", "HYBRID"]).optional(),
  search: z.string().optional(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
});
```

- [ ] **Step 2: Add proposal section schemas**

```typescript
// ── Admin: Proposal Sections ────────────────────────────────────────────

export const createProposalSectionSchema = z.object({
  proposalId: z.uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(["PHASE", "RECURRING", "AD_HOC"]),
  sortOrder: z.number().int().default(0),
  estimatedDuration: z.string().optional().nullable(),
});

export const updateProposalSectionSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(["PHASE", "RECURRING", "AD_HOC"]).optional(),
  sortOrder: z.number().int().optional(),
  estimatedDuration: z.string().optional().nullable(),
});

export const deleteProposalSectionSchema = z.object({
  id: z.uuid(),
});
```

- [ ] **Step 3: Add proposal item schemas**

```typescript
// ── Admin: Proposal Items ───────────────────────────────────────────────

export const createProposalItemSchema = z.object({
  sectionId: z.uuid(),
  proposalId: z.uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  acceptanceCriteria: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const updateProposalItemSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  acceptanceCriteria: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const deleteProposalItemSchema = z.object({
  id: z.uuid(),
});
```

- [ ] **Step 4: Add payment rule schemas**

```typescript
// ── Admin: Payment Rules ────────────────────────────────────────────────

export const createPaymentRuleSchema = z.object({
  proposalId: z.uuid(),
  sectionId: z.uuid().optional().nullable(),
  label: z.string().min(1),
  amount: z.number().int().positive(),
  trigger: z.enum(["MILESTONE_COMPLETE", "RECURRING", "RELATIVE_DATE", "FIXED_DATE", "ON_APPROVAL"]),
  recurringInterval: z.enum(["MONTHLY", "QUARTERLY"]).optional().nullable(),
  relativeDays: z.number().int().optional().nullable(),
  fixedDate: z.date().optional().nullable(),
  autoSend: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const updatePaymentRuleSchema = z.object({
  id: z.uuid(),
  sectionId: z.uuid().optional().nullable(),
  label: z.string().min(1).optional(),
  amount: z.number().int().positive().optional(),
  trigger: z.enum(["MILESTONE_COMPLETE", "RECURRING", "RELATIVE_DATE", "FIXED_DATE", "ON_APPROVAL"]).optional(),
  recurringInterval: z.enum(["MONTHLY", "QUARTERLY"]).optional().nullable(),
  relativeDays: z.number().int().optional().nullable(),
  fixedDate: z.date().optional().nullable(),
  autoSend: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const deletePaymentRuleSchema = z.object({
  id: z.uuid(),
});
```

- [ ] **Step 5: Add void invoice schema**

```typescript
export const voidInvoiceSchema = z.object({
  invoiceId: z.uuid(),
});
```

- [ ] **Step 6: Update createProposalSchema — make JSONB fields optional for backward compat**

The old `createProposalSchema` requires deliverables and price. During transition, make them optional so new code can create proposals without JSONB, while old code still works:

```typescript
export const createProposalSchema = z.object({
  engagementId: z.uuid(),
  scope: z.string().min(1),
  deliverables: z.array(proposalDeliverableSchema).default([]),
  price: z.number().int().default(0),
  paymentSchedule: z.array(paymentScheduleItemSchema).default([]),
  terms: z.string().optional().nullable(),
});
```

- [ ] **Step 7: Commit**

```bash
git add src/modules/client-portal/client-portal.schemas.ts
git commit -m "feat(schemas): add proposal section, item, and payment rule Zod schemas"
```

---

### Task 4: Repository — CRUD for New Tables

**Files:**
- Modify: `src/modules/client-portal/client-portal.repository.ts`

- [ ] **Step 1: Add imports for new schema tables**

Update the schema import at the top of the file:

```typescript
import {
  engagements,
  proposals,
  engagementMilestones,
  deliverables,
  approvalRequests,
  portalInvoices,
  portalCredentials,
  portalSessions,
  customers,
  proposalSections,
  proposalItems,
  paymentRules,
} from "@/shared/db/schema";
```

Add new type imports:

```typescript
import type {
  EngagementRecord,
  EngagementWithCustomer,
  ProposalRecord,
  ProposalSectionRecord,
  ProposalItemRecord,
  PaymentRuleRecord,
  MilestoneRecord,
  DeliverableRecord,
  ApprovalRequestRecord,
  PortalInvoiceRecord,
  PortalSessionRecord,
  ProposalDeliverable,
  PaymentScheduleItem,
} from "./client-portal.types";
```

- [ ] **Step 2: Add row types and mapper functions for new tables**

After the existing mapper functions:

```typescript
type SectionRow = typeof proposalSections.$inferSelect;
type ItemRow = typeof proposalItems.$inferSelect;
type RuleRow = typeof paymentRules.$inferSelect;

function toSection(row: SectionRow): ProposalSectionRecord {
  return {
    id: row.id,
    proposalId: row.proposalId,
    title: row.title,
    description: row.description ?? null,
    type: row.type,
    sortOrder: row.sortOrder,
    estimatedDuration: row.estimatedDuration ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toItem(row: ItemRow): ProposalItemRecord {
  return {
    id: row.id,
    sectionId: row.sectionId,
    proposalId: row.proposalId,
    title: row.title,
    description: row.description ?? null,
    acceptanceCriteria: row.acceptanceCriteria ?? null,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRule(row: RuleRow): PaymentRuleRecord {
  return {
    id: row.id,
    proposalId: row.proposalId,
    tenantId: row.tenantId,
    sectionId: row.sectionId ?? null,
    label: row.label,
    amount: row.amount,
    trigger: row.trigger,
    recurringInterval: row.recurringInterval ?? null,
    relativeDays: row.relativeDays ?? null,
    fixedDate: row.fixedDate ?? null,
    autoSend: row.autoSend,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

- [ ] **Step 3: Update existing mappers for new fields**

Update `toEngagement` to include `activeProposalId`:

```typescript
function toEngagement(row: EngagementRow): EngagementRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    customerId: row.customerId,
    type: row.type,
    status: row.status,
    title: row.title,
    description: row.description ?? null,
    startDate: row.startDate ?? null,
    endDate: row.endDate ?? null,
    activeProposalId: row.activeProposalId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

Update `toProposal` to include `version` and `revisionOf`:

```typescript
function toProposal(row: ProposalRow): ProposalRecord {
  return {
    id: row.id,
    engagementId: row.engagementId,
    status: row.status,
    scope: row.scope,
    deliverables: (row.deliverables ?? []) as ProposalDeliverable[],
    price: row.price,
    paymentSchedule: (row.paymentSchedule ?? []) as PaymentScheduleItem[],
    terms: row.terms ?? null,
    token: row.token,
    tokenExpiresAt: row.tokenExpiresAt,
    version: row.version,
    revisionOf: row.revisionOf ?? null,
    sentAt: row.sentAt ?? null,
    approvedAt: row.approvedAt ?? null,
    declinedAt: row.declinedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

Update `toMilestone` to include `sourceSectionId`:

```typescript
function toMilestone(row: MilestoneRow): MilestoneRecord {
  return {
    id: row.id,
    engagementId: row.engagementId,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    sortOrder: row.sortOrder,
    dueDate: row.dueDate ?? null,
    completedAt: row.completedAt ?? null,
    sourceSectionId: row.sourceSectionId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

Update `toDeliverable` to include `sourceProposalItemId`:

```typescript
function toDeliverable(row: DeliverableRow): DeliverableRecord {
  return {
    id: row.id,
    engagementId: row.engagementId,
    milestoneId: row.milestoneId ?? null,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    fileUrl: row.fileUrl ?? null,
    fileName: row.fileName ?? null,
    fileSize: row.fileSize ?? null,
    deliveredAt: row.deliveredAt ?? null,
    acceptedAt: row.acceptedAt ?? null,
    sourceProposalItemId: row.sourceProposalItemId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

Update `toInvoice` to include new fields:

```typescript
function toInvoice(row: InvoiceRow): PortalInvoiceRecord {
  return {
    id: row.id,
    engagementId: row.engagementId,
    milestoneId: row.milestoneId ?? null,
    proposalPaymentIndex: row.proposalPaymentIndex ?? null,
    amount: row.amount,
    description: row.description,
    status: row.status,
    dueDate: row.dueDate,
    paidAt: row.paidAt ?? null,
    paymentMethod: row.paymentMethod ?? null,
    paymentReference: row.paymentReference ?? null,
    token: row.token,
    sentAt: row.sentAt ?? null,
    sourcePaymentRuleId: row.sourcePaymentRuleId ?? null,
    stripePaymentIntentId: row.stripePaymentIntentId ?? null,
    stripePaymentUrl: row.stripePaymentUrl ?? null,
    invoiceNumber: row.invoiceNumber ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

- [ ] **Step 4: Add proposal section CRUD methods**

Add inside `clientPortalRepository` object:

```typescript
  // ── Proposal Sections ───────────────────────────────────────────────

  async listSections(proposalId: string): Promise<ProposalSectionRecord[]> {
    const rows = await db
      .select()
      .from(proposalSections)
      .where(eq(proposalSections.proposalId, proposalId))
      .orderBy(proposalSections.sortOrder);
    return rows.map(toSection);
  },

  async createSection(input: {
    proposalId: string;
    title: string;
    description?: string | null;
    type: string;
    sortOrder: number;
    estimatedDuration?: string | null;
  }): Promise<ProposalSectionRecord> {
    const now = new Date();
    const [row] = await db
      .insert(proposalSections)
      .values({
        proposalId: input.proposalId,
        title: input.title,
        description: input.description ?? null,
        type: input.type as any,
        sortOrder: input.sortOrder,
        estimatedDuration: input.estimatedDuration ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ sectionId: row!.id, proposalId: input.proposalId }, "Proposal section created");
    return toSection(row!);
  },

  async updateSection(
    id: string,
    updates: Partial<{ title: string; description: string | null; type: string; sortOrder: number; estimatedDuration: string | null }>
  ): Promise<ProposalSectionRecord> {
    const [row] = await db
      .update(proposalSections)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(proposalSections.id, id))
      .returning();
    if (!row) throw new NotFoundError("ProposalSection", id);
    return toSection(row);
  },

  async deleteSection(id: string): Promise<void> {
    const result = await db
      .delete(proposalSections)
      .where(eq(proposalSections.id, id))
      .returning({ id: proposalSections.id });
    if (!result.length) throw new NotFoundError("ProposalSection", id);
    log.info({ sectionId: id }, "Proposal section deleted");
  },
```

- [ ] **Step 5: Add proposal item CRUD methods**

```typescript
  // ── Proposal Items ──────────────────────────────────────────────────

  async listItems(proposalId: string): Promise<ProposalItemRecord[]> {
    const rows = await db
      .select()
      .from(proposalItems)
      .where(eq(proposalItems.proposalId, proposalId))
      .orderBy(proposalItems.sortOrder);
    return rows.map(toItem);
  },

  async listItemsBySection(sectionId: string): Promise<ProposalItemRecord[]> {
    const rows = await db
      .select()
      .from(proposalItems)
      .where(eq(proposalItems.sectionId, sectionId))
      .orderBy(proposalItems.sortOrder);
    return rows.map(toItem);
  },

  async createItem(input: {
    sectionId: string;
    proposalId: string;
    title: string;
    description?: string | null;
    acceptanceCriteria?: string | null;
    sortOrder: number;
  }): Promise<ProposalItemRecord> {
    const now = new Date();
    const [row] = await db
      .insert(proposalItems)
      .values({
        sectionId: input.sectionId,
        proposalId: input.proposalId,
        title: input.title,
        description: input.description ?? null,
        acceptanceCriteria: input.acceptanceCriteria ?? null,
        sortOrder: input.sortOrder,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ itemId: row!.id, sectionId: input.sectionId }, "Proposal item created");
    return toItem(row!);
  },

  async updateItem(
    id: string,
    updates: Partial<{ title: string; description: string | null; acceptanceCriteria: string | null; sortOrder: number }>
  ): Promise<ProposalItemRecord> {
    const [row] = await db
      .update(proposalItems)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(proposalItems.id, id))
      .returning();
    if (!row) throw new NotFoundError("ProposalItem", id);
    return toItem(row);
  },

  async deleteItem(id: string): Promise<void> {
    const result = await db
      .delete(proposalItems)
      .where(eq(proposalItems.id, id))
      .returning({ id: proposalItems.id });
    if (!result.length) throw new NotFoundError("ProposalItem", id);
    log.info({ itemId: id }, "Proposal item deleted");
  },
```

- [ ] **Step 6: Add payment rule CRUD methods**

```typescript
  // ── Payment Rules ───────────────────────────────────────────────────

  async listRules(proposalId: string): Promise<PaymentRuleRecord[]> {
    const rows = await db
      .select()
      .from(paymentRules)
      .where(eq(paymentRules.proposalId, proposalId))
      .orderBy(paymentRules.sortOrder);
    return rows.map(toRule);
  },

  async createRule(input: {
    proposalId: string;
    tenantId: string;
    sectionId?: string | null;
    label: string;
    amount: number;
    trigger: string;
    recurringInterval?: string | null;
    relativeDays?: number | null;
    fixedDate?: Date | null;
    autoSend: boolean;
    sortOrder: number;
  }): Promise<PaymentRuleRecord> {
    const now = new Date();
    const [row] = await db
      .insert(paymentRules)
      .values({
        proposalId: input.proposalId,
        tenantId: input.tenantId,
        sectionId: input.sectionId ?? null,
        label: input.label,
        amount: input.amount,
        trigger: input.trigger as any,
        recurringInterval: input.recurringInterval as any ?? null,
        relativeDays: input.relativeDays ?? null,
        fixedDate: input.fixedDate ?? null,
        autoSend: input.autoSend,
        sortOrder: input.sortOrder,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ ruleId: row!.id, proposalId: input.proposalId }, "Payment rule created");
    return toRule(row!);
  },

  async updateRule(
    id: string,
    updates: Partial<{
      sectionId: string | null;
      label: string;
      amount: number;
      trigger: string;
      recurringInterval: string | null;
      relativeDays: number | null;
      fixedDate: Date | null;
      autoSend: boolean;
      sortOrder: number;
    }>
  ): Promise<PaymentRuleRecord> {
    const [row] = await db
      .update(paymentRules)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(paymentRules.id, id))
      .returning();
    if (!row) throw new NotFoundError("PaymentRule", id);
    return toRule(row);
  },

  async deleteRule(id: string): Promise<void> {
    const result = await db
      .delete(paymentRules)
      .where(eq(paymentRules.id, id))
      .returning({ id: paymentRules.id });
    if (!result.length) throw new NotFoundError("PaymentRule", id);
    log.info({ ruleId: id }, "Payment rule deleted");
  },

  async findActiveRecurringRules(): Promise<(PaymentRuleRecord & { engagementId: string })[]> {
    const rows = await db
      .select({
        rule: paymentRules,
        engagementId: engagements.id,
      })
      .from(paymentRules)
      .innerJoin(proposals, eq(paymentRules.proposalId, proposals.id))
      .innerJoin(engagements, eq(proposals.engagementId, engagements.id))
      .where(
        and(
          eq(paymentRules.trigger, "RECURRING"),
          eq(proposals.status, "APPROVED"),
          eq(engagements.status, "ACTIVE")
        )
      );
    return rows.map((r) => ({
      ...toRule(r.rule),
      engagementId: r.engagementId,
    }));
  },

  async findRulesBySectionId(sectionId: string): Promise<PaymentRuleRecord[]> {
    const rows = await db
      .select()
      .from(paymentRules)
      .where(
        and(
          eq(paymentRules.sectionId, sectionId),
          eq(paymentRules.trigger, "MILESTONE_COMPLETE")
        )
      );
    return rows.map(toRule);
  },

  async findLastInvoiceForRule(ruleId: string): Promise<PortalInvoiceRecord | null> {
    const rows = await db
      .select()
      .from(portalInvoices)
      .where(eq(portalInvoices.sourcePaymentRuleId, ruleId))
      .orderBy(desc(portalInvoices.createdAt))
      .limit(1);
    return rows[0] ? toInvoice(rows[0]) : null;
  },
```

- [ ] **Step 7: Add enriched proposal query (with sections, items, rules)**

```typescript
  async getProposalWithSections(proposalId: string) {
    const proposal = await this.findProposal(proposalId);
    if (!proposal) return null;

    const [sectionList, itemList, ruleList] = await Promise.all([
      this.listSections(proposalId),
      this.listItems(proposalId),
      this.listRules(proposalId),
    ]);

    const sections = sectionList.map((section) => ({
      ...section,
      items: itemList.filter((item) => item.sectionId === section.id),
    }));

    return { ...proposal, sections, paymentRules: ruleList };
  },
```

- [ ] **Step 8: Add bulk create methods for materialization**

```typescript
  async createMilestoneBulk(
    inputs: {
      engagementId: string;
      title: string;
      description?: string | null;
      sortOrder: number;
      dueDate?: Date | null;
      sourceSectionId?: string | null;
    }[]
  ): Promise<MilestoneRecord[]> {
    if (inputs.length === 0) return [];
    const now = new Date();
    const rows = await db
      .insert(engagementMilestones)
      .values(
        inputs.map((input) => ({
          engagementId: input.engagementId,
          title: input.title,
          description: input.description ?? null,
          sortOrder: input.sortOrder,
          dueDate: input.dueDate ?? null,
          sourceSectionId: input.sourceSectionId ?? null,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning();
    return rows.map(toMilestone);
  },

  async createDeliverableBulk(
    inputs: {
      engagementId: string;
      milestoneId?: string | null;
      title: string;
      description?: string | null;
      sourceProposalItemId?: string | null;
    }[]
  ): Promise<DeliverableRecord[]> {
    if (inputs.length === 0) return [];
    const now = new Date();
    const rows = await db
      .insert(deliverables)
      .values(
        inputs.map((input) => ({
          engagementId: input.engagementId,
          milestoneId: input.milestoneId ?? null,
          title: input.title,
          description: input.description ?? null,
          sourceProposalItemId: input.sourceProposalItemId ?? null,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning();
    return rows.map(toDeliverable);
  },

  async createInvoiceBulk(
    inputs: {
      engagementId: string;
      milestoneId?: string | null;
      amount: number;
      description: string;
      dueDate: Date;
      token: string;
      sourcePaymentRuleId?: string | null;
      invoiceNumber?: string | null;
    }[]
  ): Promise<PortalInvoiceRecord[]> {
    if (inputs.length === 0) return [];
    const now = new Date();
    const rows = await db
      .insert(portalInvoices)
      .values(
        inputs.map((input) => ({
          engagementId: input.engagementId,
          milestoneId: input.milestoneId ?? null,
          amount: input.amount,
          description: input.description,
          dueDate: input.dueDate,
          token: input.token,
          sourcePaymentRuleId: input.sourcePaymentRuleId ?? null,
          invoiceNumber: input.invoiceNumber ?? null,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .returning();
    return rows.map(toInvoice);
  },

  async getNextInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const result = await db
      .select({ invoiceNumber: portalInvoices.invoiceNumber })
      .from(portalInvoices)
      .innerJoin(engagements, eq(portalInvoices.engagementId, engagements.id))
      .where(
        and(
          eq(engagements.tenantId, tenantId),
          sql`${portalInvoices.invoiceNumber} LIKE ${prefix + '%'}`
        )
      )
      .orderBy(desc(portalInvoices.invoiceNumber))
      .limit(1);

    if (!result[0]?.invoiceNumber) return `${prefix}0001`;
    const lastSeq = parseInt(result[0].invoiceNumber.replace(prefix, ""), 10);
    return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
  },

  async findOverdueInvoices(): Promise<(PortalInvoiceRecord & { tenantId: string; customerId: string })[]> {
    const now = new Date();
    const rows = await db
      .select({
        invoice: portalInvoices,
        tenantId: engagements.tenantId,
        customerId: engagements.customerId,
      })
      .from(portalInvoices)
      .innerJoin(engagements, eq(portalInvoices.engagementId, engagements.id))
      .where(
        and(
          eq(portalInvoices.status, "SENT"),
          sql`${portalInvoices.dueDate} < ${now}`
        )
      );
    return rows.map((r) => ({
      ...toInvoice(r.invoice),
      tenantId: r.tenantId,
      customerId: r.customerId,
    }));
  },
```

- [ ] **Step 9: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 10: Commit**

```bash
git add src/modules/client-portal/client-portal.repository.ts
git commit -m "feat(repo): add CRUD for proposal sections, items, payment rules, and bulk creators"
```

---

### Task 5: Service — Materialization Engine

**Files:**
- Modify: `src/modules/client-portal/client-portal.service.ts`

- [ ] **Step 1: Write failing test for materializeProposal**

Create `src/modules/client-portal/__tests__/materialization.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../client-portal.repository", () => ({
  clientPortalRepository: {
    findProposalByToken: vi.fn(),
    findEngagementById: vi.fn(),
    getProposalWithSections: vi.fn(),
    updateProposal: vi.fn(),
    updateEngagement: vi.fn(),
    createMilestoneBulk: vi.fn(),
    createDeliverableBulk: vi.fn(),
    createInvoiceBulk: vi.fn(),
    getNextInvoiceNumber: vi.fn(),
    createSession: vi.fn(),
    listSections: vi.fn(),
  },
}));
vi.mock("@/shared/inngest", () => ({ inngest: { send: vi.fn() } }));
vi.mock("@/shared/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));
vi.mock("bcryptjs", () => ({ hash: vi.fn(), compare: vi.fn() }));

import { clientPortalService } from "../client-portal.service";
import { clientPortalRepository } from "../client-portal.repository";
import { inngest } from "@/shared/inngest";

function makeProposal(overrides = {}) {
  return {
    id: "proposal-1",
    engagementId: "eng-1",
    status: "SENT" as const,
    scope: "<p>Scope</p>",
    deliverables: [],
    price: 0,
    paymentSchedule: [],
    terms: null,
    token: "tok-123",
    tokenExpiresAt: new Date(Date.now() + 86400000),
    version: 1,
    revisionOf: null,
    sentAt: new Date(),
    approvedAt: null,
    declinedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeEngagement(overrides = {}) {
  return {
    id: "eng-1",
    tenantId: "tenant-1",
    customerId: "cust-1",
    type: "PROJECT" as const,
    status: "PROPOSED" as const,
    title: "Test Engagement",
    description: null,
    startDate: null,
    endDate: null,
    activeProposalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("materializeProposal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates milestones from PHASE sections and deliverables from items", async () => {
    const proposal = makeProposal();
    const engagement = makeEngagement();

    vi.mocked(clientPortalRepository.findProposalByToken).mockResolvedValue(proposal);
    vi.mocked(clientPortalRepository.findEngagementById).mockResolvedValue(engagement);
    vi.mocked(clientPortalRepository.getProposalWithSections).mockResolvedValue({
      ...proposal,
      sections: [
        {
          id: "sec-1",
          proposalId: "proposal-1",
          title: "Discovery",
          description: null,
          type: "PHASE" as const,
          sortOrder: 0,
          estimatedDuration: "2 weeks",
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [
            {
              id: "item-1",
              sectionId: "sec-1",
              proposalId: "proposal-1",
              title: "Brand Audit",
              description: "Full brand audit",
              acceptanceCriteria: null,
              sortOrder: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ],
      paymentRules: [
        {
          id: "rule-1",
          proposalId: "proposal-1",
          tenantId: "tenant-1",
          sectionId: "sec-1",
          label: "Discovery payment",
          amount: 500000,
          trigger: "ON_APPROVAL" as const,
          recurringInterval: null,
          relativeDays: null,
          fixedDate: null,
          autoSend: false,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    vi.mocked(clientPortalRepository.updateProposal).mockResolvedValue({
      ...proposal,
      status: "APPROVED",
      approvedAt: new Date(),
    });
    vi.mocked(clientPortalRepository.updateEngagement).mockResolvedValue({
      ...engagement,
      status: "ACTIVE",
      activeProposalId: "proposal-1",
    });
    vi.mocked(clientPortalRepository.createMilestoneBulk).mockResolvedValue([
      {
        id: "ms-1",
        engagementId: "eng-1",
        title: "Discovery",
        description: null,
        status: "UPCOMING",
        sortOrder: 0,
        dueDate: null,
        completedAt: null,
        sourceSectionId: "sec-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(clientPortalRepository.createDeliverableBulk).mockResolvedValue([]);
    vi.mocked(clientPortalRepository.createInvoiceBulk).mockResolvedValue([]);
    vi.mocked(clientPortalRepository.getNextInvoiceNumber).mockResolvedValue("INV-2026-0001");
    vi.mocked(clientPortalRepository.createSession).mockResolvedValue({
      id: "sess-1",
      customerId: "cust-1",
      token: "tok",
      tokenExpiresAt: new Date(),
      sessionToken: "sess-tok",
      sessionExpiresAt: new Date(),
      lastAccessedAt: new Date(),
      createdAt: new Date(),
    });

    const result = await clientPortalService.approveProposalByToken("tok-123");

    expect(clientPortalRepository.createMilestoneBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        engagementId: "eng-1",
        title: "Discovery",
        sourceSectionId: "sec-1",
      }),
    ]);
    expect(clientPortalRepository.createDeliverableBulk).toHaveBeenCalled();
    expect(clientPortalRepository.createInvoiceBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        engagementId: "eng-1",
        amount: 500000,
        sourcePaymentRuleId: "rule-1",
      }),
    ]);
    expect(result.sessionToken).toBeDefined();
  });

  it("skips MILESTONE_COMPLETE and RECURRING payment rules during materialization", async () => {
    const proposal = makeProposal();
    const engagement = makeEngagement();

    vi.mocked(clientPortalRepository.findProposalByToken).mockResolvedValue(proposal);
    vi.mocked(clientPortalRepository.findEngagementById).mockResolvedValue(engagement);
    vi.mocked(clientPortalRepository.getProposalWithSections).mockResolvedValue({
      ...proposal,
      sections: [],
      paymentRules: [
        {
          id: "rule-ms",
          proposalId: "proposal-1",
          tenantId: "tenant-1",
          sectionId: null,
          label: "Milestone payment",
          amount: 500000,
          trigger: "MILESTONE_COMPLETE" as const,
          recurringInterval: null,
          relativeDays: null,
          fixedDate: null,
          autoSend: false,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "rule-rec",
          proposalId: "proposal-1",
          tenantId: "tenant-1",
          sectionId: null,
          label: "Monthly retainer",
          amount: 200000,
          trigger: "RECURRING" as const,
          recurringInterval: "MONTHLY" as const,
          relativeDays: null,
          fixedDate: null,
          autoSend: false,
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    vi.mocked(clientPortalRepository.updateProposal).mockResolvedValue({ ...proposal, status: "APPROVED", approvedAt: new Date() });
    vi.mocked(clientPortalRepository.updateEngagement).mockResolvedValue({ ...engagement, status: "ACTIVE", activeProposalId: "proposal-1" });
    vi.mocked(clientPortalRepository.createMilestoneBulk).mockResolvedValue([]);
    vi.mocked(clientPortalRepository.createDeliverableBulk).mockResolvedValue([]);
    vi.mocked(clientPortalRepository.createInvoiceBulk).mockResolvedValue([]);
    vi.mocked(clientPortalRepository.getNextInvoiceNumber).mockResolvedValue("INV-2026-0001");
    vi.mocked(clientPortalRepository.createSession).mockResolvedValue({
      id: "sess-1", customerId: "cust-1", token: "tok", tokenExpiresAt: new Date(),
      sessionToken: "sess-tok", sessionExpiresAt: new Date(), lastAccessedAt: new Date(), createdAt: new Date(),
    });

    await clientPortalService.approveProposalByToken("tok-123");

    // Should create zero invoices — both rules are deferred
    expect(clientPortalRepository.createInvoiceBulk).toHaveBeenCalledWith([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/client-portal/__tests__/materialization.test.ts`

Expected: FAIL — `approveProposalByToken` doesn't call `createMilestoneBulk` yet.

- [ ] **Step 3: Implement materialization in approveProposalByToken**

In `src/modules/client-portal/client-portal.service.ts`, replace the `approveProposalByToken` method:

```typescript
  async approveProposalByToken(token: string) {
    const proposal = await clientPortalRepository.findProposalByToken(token);
    if (!proposal) throw new NotFoundError("Proposal", token);
    if (proposal.status !== "SENT") throw new BadRequestError("Proposal cannot be approved");
    if (proposal.tokenExpiresAt < new Date()) throw new BadRequestError("Proposal link has expired");

    const engagement = await clientPortalRepository.findEngagementById(proposal.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

    // Load proposal with sections, items, and payment rules
    const enriched = await clientPortalRepository.getProposalWithSections(proposal.id);
    if (!enriched) throw new NotFoundError("Proposal", proposal.id);

    // 1. Update proposal status
    const updated = await clientPortalRepository.updateProposal(proposal.id, {
      status: "APPROVED",
      approvedAt: new Date(),
    });

    // 2. Infer engagement type from sections
    const sectionTypes = new Set(enriched.sections.map((s) => s.type));
    let engagementType: string = engagement.type;
    if (sectionTypes.has("PHASE") && sectionTypes.has("RECURRING")) {
      engagementType = "HYBRID";
    } else if (sectionTypes.has("RECURRING") && !sectionTypes.has("PHASE")) {
      engagementType = "RETAINER";
    } else if (sectionTypes.has("PHASE")) {
      engagementType = "PROJECT";
    }

    // 3. Activate engagement
    await clientPortalRepository.updateEngagement(engagement.tenantId, engagement.id, {
      status: "ACTIVE",
      type: engagementType,
      startDate: new Date(),
      activeProposalId: proposal.id,
    });

    // 4. Materialize PHASE sections → milestones
    const phaseSections = enriched.sections.filter((s) => s.type === "PHASE");
    const milestones = await clientPortalRepository.createMilestoneBulk(
      phaseSections.map((section) => ({
        engagementId: engagement.id,
        title: section.title,
        description: section.description,
        sortOrder: section.sortOrder,
        sourceSectionId: section.id,
      }))
    );

    // Build section → milestone ID map for deliverable assignment
    const sectionToMilestone = new Map<string, string>();
    phaseSections.forEach((section, i) => {
      if (milestones[i]) sectionToMilestone.set(section.id, milestones[i].id);
    });

    // 5. Materialize items → deliverables
    const deliverableInputs: {
      engagementId: string;
      milestoneId?: string | null;
      title: string;
      description?: string | null;
      sourceProposalItemId?: string | null;
    }[] = [];

    for (const section of enriched.sections) {
      if (section.type === "RECURRING") continue; // No deliverables for recurring sections

      const milestoneId = sectionToMilestone.get(section.id) ?? null;
      for (const item of section.items) {
        deliverableInputs.push({
          engagementId: engagement.id,
          milestoneId,
          title: item.title,
          description: item.description,
          sourceProposalItemId: item.id,
        });
      }
    }

    await clientPortalRepository.createDeliverableBulk(deliverableInputs);

    // 6. Materialize payment rules → invoices (only immediate triggers)
    const now = new Date();
    const invoiceInputs: {
      engagementId: string;
      amount: number;
      description: string;
      dueDate: Date;
      token: string;
      sourcePaymentRuleId: string;
      invoiceNumber: string;
    }[] = [];

    let nextInvoiceNumber = await clientPortalRepository.getNextInvoiceNumber(engagement.tenantId);

    for (const rule of enriched.paymentRules) {
      let dueDate: Date | null = null;

      if (rule.trigger === "ON_APPROVAL") {
        dueDate = addDays(now, rule.relativeDays ?? 14);
      } else if (rule.trigger === "FIXED_DATE" && rule.fixedDate) {
        dueDate = rule.fixedDate;
      } else if (rule.trigger === "RELATIVE_DATE") {
        dueDate = addDays(now, rule.relativeDays ?? 14);
      }
      // MILESTONE_COMPLETE and RECURRING are skipped — handled later

      if (dueDate) {
        invoiceInputs.push({
          engagementId: engagement.id,
          amount: rule.amount,
          description: rule.label,
          dueDate,
          token: randomUUID(),
          sourcePaymentRuleId: rule.id,
          invoiceNumber: nextInvoiceNumber,
        });
        // Increment invoice number
        const seq = parseInt(nextInvoiceNumber.split("-").pop()!, 10);
        const year = new Date().getFullYear();
        nextInvoiceNumber = `INV-${year}-${String(seq + 1).padStart(4, "0")}`;
      }
    }

    await clientPortalRepository.createInvoiceBulk(invoiceInputs);

    // 7. Create portal session
    const session = await this.createMagicLinkSession(engagement.customerId);

    // 8. Emit events
    await inngest.send({
      name: "portal/proposal:approved",
      data: {
        proposalId: proposal.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: engagement.tenantId,
      },
    });

    log.info(
      { proposalId: proposal.id, engagementId: engagement.id, milestones: milestones.length, deliverables: deliverableInputs.length, invoices: invoiceInputs.length },
      "Proposal approved and materialized"
    );

    return { proposal: updated, sessionToken: session.sessionToken };
  },
```

Also update the `updateEngagement` parameter type in the repository to accept `activeProposalId`:

In the existing `updateEngagement` method signature, add `activeProposalId` to the `updates` parameter:

```typescript
  async updateEngagement(
    tenantId: string,
    id: string,
    updates: Partial<{ type: string; status: string; title: string; description: string | null; startDate: Date | null; endDate: Date | null; activeProposalId: string | null }>
  ): Promise<EngagementRecord> {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/client-portal/__tests__/materialization.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/client-portal/client-portal.service.ts src/modules/client-portal/client-portal.repository.ts src/modules/client-portal/__tests__/materialization.test.ts
git commit -m "feat(service): add materialization engine on proposal approval"
```

---

### Task 6: Service — Milestone-Triggered Invoice Generation

**Files:**
- Modify: `src/modules/client-portal/client-portal.service.ts`
- Modify: `src/modules/client-portal/__tests__/materialization.test.ts`

- [ ] **Step 1: Write failing test for milestone completion triggering invoices**

Add to `src/modules/client-portal/__tests__/materialization.test.ts`:

```typescript
// Add to the vi.mock for repository:
// findRulesBySectionId: vi.fn(),
// findMilestone: vi.fn(),  (need to add this to repo too)
// getNextInvoiceNumber: vi.fn(),

describe("updateMilestone with invoice generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates invoice when milestone with MILESTONE_COMPLETE payment rule is completed", async () => {
    const milestone = {
      id: "ms-1",
      engagementId: "eng-1",
      title: "Discovery",
      description: null,
      status: "IN_PROGRESS" as const,
      sortOrder: 0,
      dueDate: null,
      completedAt: null,
      sourceSectionId: "sec-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const engagement = makeEngagement();
    const rule = {
      id: "rule-1",
      proposalId: "proposal-1",
      tenantId: "tenant-1",
      sectionId: "sec-1",
      label: "Discovery payment",
      amount: 500000,
      trigger: "MILESTONE_COMPLETE" as const,
      recurringInterval: null,
      relativeDays: 14,
      fixedDate: null,
      autoSend: false,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(clientPortalRepository.updateMilestone).mockResolvedValue({
      ...milestone,
      status: "COMPLETED",
      completedAt: new Date(),
    });
    vi.mocked(clientPortalRepository.findEngagement).mockResolvedValue(engagement);
    vi.mocked(clientPortalRepository.findRulesBySectionId).mockResolvedValue([rule]);
    vi.mocked(clientPortalRepository.getNextInvoiceNumber).mockResolvedValue("INV-2026-0001");
    vi.mocked(clientPortalRepository.createInvoiceBulk).mockResolvedValue([]);
    vi.mocked(inngest.send).mockResolvedValue(undefined as any);

    const ctx = { tenantId: "tenant-1", user: { id: "user-1", tenantId: "tenant-1" } } as any;

    await clientPortalService.updateMilestone(ctx, {
      id: "ms-1",
      status: "COMPLETED",
    });

    expect(clientPortalRepository.findRulesBySectionId).toHaveBeenCalledWith("sec-1");
    expect(clientPortalRepository.createInvoiceBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        engagementId: "eng-1",
        amount: 500000,
        sourcePaymentRuleId: "rule-1",
      }),
    ]);
  });
});
```

Also add `updateMilestone` and `findRulesBySectionId` to the mock at the top.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/client-portal/__tests__/materialization.test.ts`

Expected: FAIL

- [ ] **Step 3: Update updateMilestone to trigger invoice generation**

In `src/modules/client-portal/client-portal.service.ts`, replace the `updateMilestone` method:

```typescript
  async updateMilestone(ctx: Context, input: z.infer<typeof updateMilestoneSchema>) {
    const updates: Record<string, unknown> = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.status !== undefined) {
      updates.status = input.status;
      if (input.status === "COMPLETED") updates.completedAt = new Date();
    }
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
    if (input.dueDate !== undefined) updates.dueDate = input.dueDate;

    const milestone = await clientPortalRepository.updateMilestone(input.id, updates);

    // If milestone completed and has a source section, check for milestone-triggered payment rules
    if (input.status === "COMPLETED" && milestone.sourceSectionId) {
      const rules = await clientPortalRepository.findRulesBySectionId(milestone.sourceSectionId);

      if (rules.length > 0) {
        const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, milestone.engagementId);
        if (engagement) {
          let nextInvoiceNumber = await clientPortalRepository.getNextInvoiceNumber(ctx.tenantId);
          const now = new Date();

          const invoiceInputs = rules.map((rule) => {
            const invoiceNumber = nextInvoiceNumber;
            const seq = parseInt(nextInvoiceNumber.split("-").pop()!, 10);
            const year = now.getFullYear();
            nextInvoiceNumber = `INV-${year}-${String(seq + 1).padStart(4, "0")}`;

            return {
              engagementId: milestone.engagementId,
              amount: rule.amount,
              description: rule.label,
              dueDate: addDays(now, rule.relativeDays ?? 14),
              token: randomUUID(),
              sourcePaymentRuleId: rule.id,
              invoiceNumber,
            };
          });

          const invoices = await clientPortalRepository.createInvoiceBulk(invoiceInputs);

          // Auto-send if configured
          for (let i = 0; i < rules.length; i++) {
            if (rules[i].autoSend && invoices[i]) {
              await clientPortalRepository.updateInvoice(invoices[i].id, {
                status: "SENT",
                sentAt: new Date(),
              });
            }
          }

          log.info(
            { milestoneId: milestone.id, invoiceCount: invoices.length },
            "Milestone-triggered invoices generated"
          );
        }
      }
    }

    return milestone;
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/client-portal/__tests__/materialization.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/client-portal/client-portal.service.ts src/modules/client-portal/__tests__/materialization.test.ts
git commit -m "feat(service): add milestone-triggered invoice generation"
```

---

### Task 7: Service — Admin CRUD for Sections, Items, and Rules

**Files:**
- Modify: `src/modules/client-portal/client-portal.service.ts`

- [ ] **Step 1: Add service methods for proposal sections**

Add to `clientPortalService`:

```typescript
  // ── Admin: Proposal Sections ──────────────────────────────────────

  async createProposalSection(ctx: Context, input: z.infer<typeof createProposalSectionSchema>) {
    const proposal = await clientPortalRepository.findProposal(input.proposalId);
    if (!proposal) throw new NotFoundError("Proposal", input.proposalId);
    if (proposal.status !== "DRAFT") throw new BadRequestError("Cannot modify a sent proposal");

    // Verify tenant ownership
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, proposal.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

    return clientPortalRepository.createSection({
      proposalId: input.proposalId,
      title: input.title,
      description: input.description,
      type: input.type,
      sortOrder: input.sortOrder,
      estimatedDuration: input.estimatedDuration,
    });
  },

  async updateProposalSection(ctx: Context, input: z.infer<typeof updateProposalSectionSchema>) {
    return clientPortalRepository.updateSection(input.id, {
      title: input.title,
      description: input.description,
      type: input.type,
      sortOrder: input.sortOrder,
      estimatedDuration: input.estimatedDuration,
    });
  },

  async deleteProposalSection(ctx: Context, input: z.infer<typeof deleteProposalSectionSchema>) {
    await clientPortalRepository.deleteSection(input.id);
  },
```

- [ ] **Step 2: Add service methods for proposal items**

```typescript
  // ── Admin: Proposal Items ─────────────────────────────────────────

  async createProposalItem(ctx: Context, input: z.infer<typeof createProposalItemSchema>) {
    const proposal = await clientPortalRepository.findProposal(input.proposalId);
    if (!proposal) throw new NotFoundError("Proposal", input.proposalId);
    if (proposal.status !== "DRAFT") throw new BadRequestError("Cannot modify a sent proposal");

    return clientPortalRepository.createItem({
      sectionId: input.sectionId,
      proposalId: input.proposalId,
      title: input.title,
      description: input.description,
      acceptanceCriteria: input.acceptanceCriteria,
      sortOrder: input.sortOrder,
    });
  },

  async updateProposalItem(ctx: Context, input: z.infer<typeof updateProposalItemSchema>) {
    return clientPortalRepository.updateItem(input.id, {
      title: input.title,
      description: input.description,
      acceptanceCriteria: input.acceptanceCriteria,
      sortOrder: input.sortOrder,
    });
  },

  async deleteProposalItem(ctx: Context, input: z.infer<typeof deleteProposalItemSchema>) {
    await clientPortalRepository.deleteItem(input.id);
  },
```

- [ ] **Step 3: Add service methods for payment rules**

```typescript
  // ── Admin: Payment Rules ──────────────────────────────────────────

  async createPaymentRule(ctx: Context, input: z.infer<typeof createPaymentRuleSchema>) {
    const proposal = await clientPortalRepository.findProposal(input.proposalId);
    if (!proposal) throw new NotFoundError("Proposal", input.proposalId);
    if (proposal.status !== "DRAFT") throw new BadRequestError("Cannot modify a sent proposal");

    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, proposal.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

    return clientPortalRepository.createRule({
      proposalId: input.proposalId,
      tenantId: ctx.tenantId,
      sectionId: input.sectionId,
      label: input.label,
      amount: input.amount,
      trigger: input.trigger,
      recurringInterval: input.recurringInterval,
      relativeDays: input.relativeDays,
      fixedDate: input.fixedDate,
      autoSend: input.autoSend,
      sortOrder: input.sortOrder,
    });
  },

  async updatePaymentRule(ctx: Context, input: z.infer<typeof updatePaymentRuleSchema>) {
    return clientPortalRepository.updateRule(input.id, {
      sectionId: input.sectionId,
      label: input.label,
      amount: input.amount,
      trigger: input.trigger,
      recurringInterval: input.recurringInterval,
      relativeDays: input.relativeDays,
      fixedDate: input.fixedDate,
      autoSend: input.autoSend,
      sortOrder: input.sortOrder,
    });
  },

  async deletePaymentRule(ctx: Context, input: z.infer<typeof deletePaymentRuleSchema>) {
    await clientPortalRepository.deleteRule(input.id);
  },

  async voidInvoice(ctx: Context, input: z.infer<typeof voidInvoiceSchema>) {
    const invoice = await clientPortalRepository.findInvoice(input.invoiceId);
    if (!invoice) throw new NotFoundError("PortalInvoice", input.invoiceId);
    if (invoice.status === "PAID") throw new BadRequestError("Cannot void a paid invoice");
    if (invoice.status === "VOID") throw new BadRequestError("Invoice is already voided");

    return clientPortalRepository.updateInvoice(invoice.id, { status: "VOID" });
  },
```

- [ ] **Step 4: Add missing schema imports at top of service file**

```typescript
import type {
  createEngagementSchema,
  updateEngagementSchema,
  listEngagementsSchema,
  createProposalSchema,
  sendProposalSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  createDeliverableSchema,
  deliverDeliverableSchema,
  createApprovalSchema,
  createInvoiceSchema,
  sendInvoiceSchema,
  markInvoicePaidSchema,
  approveProposalSchema,
  declineProposalSchema,
  respondToApprovalSchema,
  acceptDeliverableSchema,
  setPasswordSchema,
  portalLoginSchema,
  requestMagicLinkSchema,
  getDashboardSchema,
  listByEngagementSchema,
  createProposalSectionSchema,
  updateProposalSectionSchema,
  deleteProposalSectionSchema,
  createProposalItemSchema,
  updateProposalItemSchema,
  deleteProposalItemSchema,
  createPaymentRuleSchema,
  updatePaymentRuleSchema,
  deletePaymentRuleSchema,
  voidInvoiceSchema,
} from "./client-portal.schemas";
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add src/modules/client-portal/client-portal.service.ts
git commit -m "feat(service): add admin CRUD for proposal sections, items, payment rules"
```

---

### Task 8: Router — New Admin Procedures

**Files:**
- Modify: `src/modules/client-portal/client-portal.router.ts`

- [ ] **Step 1: Add new admin procedures to the router**

Import the new schemas and add procedures. Inside the `adminRouter`, add:

```typescript
    // Proposal Sections
    createProposalSection: permissionProcedure("proposal:create")
      .input(createProposalSectionSchema)
      .mutation(({ ctx, input }) => clientPortalService.createProposalSection(ctx, input)),

    updateProposalSection: permissionProcedure("proposal:update")
      .input(updateProposalSectionSchema)
      .mutation(({ ctx, input }) => clientPortalService.updateProposalSection(ctx, input)),

    deleteProposalSection: permissionProcedure("proposal:update")
      .input(deleteProposalSectionSchema)
      .mutation(({ ctx, input }) => clientPortalService.deleteProposalSection(ctx, input)),

    // Proposal Items
    createProposalItem: permissionProcedure("proposal:create")
      .input(createProposalItemSchema)
      .mutation(({ ctx, input }) => clientPortalService.createProposalItem(ctx, input)),

    updateProposalItem: permissionProcedure("proposal:update")
      .input(updateProposalItemSchema)
      .mutation(({ ctx, input }) => clientPortalService.updateProposalItem(ctx, input)),

    deleteProposalItem: permissionProcedure("proposal:update")
      .input(deleteProposalItemSchema)
      .mutation(({ ctx, input }) => clientPortalService.deleteProposalItem(ctx, input)),

    // Payment Rules
    createPaymentRule: permissionProcedure("invoice:create")
      .input(createPaymentRuleSchema)
      .mutation(({ ctx, input }) => clientPortalService.createPaymentRule(ctx, input)),

    updatePaymentRule: permissionProcedure("invoice:update")
      .input(updatePaymentRuleSchema)
      .mutation(({ ctx, input }) => clientPortalService.updatePaymentRule(ctx, input)),

    deletePaymentRule: permissionProcedure("invoice:update")
      .input(deletePaymentRuleSchema)
      .mutation(({ ctx, input }) => clientPortalService.deletePaymentRule(ctx, input)),

    // Void Invoice
    voidInvoice: permissionProcedure("invoice:update")
      .input(voidInvoiceSchema)
      .mutation(({ ctx, input }) => clientPortalService.voidInvoice(ctx, input)),
```

- [ ] **Step 2: Add schema imports**

Update the schema import at the top of the router file to include all new schemas:

```typescript
import {
  // ... existing imports
  createProposalSectionSchema,
  updateProposalSectionSchema,
  deleteProposalSectionSchema,
  createProposalItemSchema,
  updateProposalItemSchema,
  deleteProposalItemSchema,
  createPaymentRuleSchema,
  updatePaymentRuleSchema,
  deletePaymentRuleSchema,
  voidInvoiceSchema,
} from "./client-portal.schemas";
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/modules/client-portal/client-portal.router.ts
git commit -m "feat(router): add admin procedures for proposal sections, items, payment rules"
```

---

### Task 9: Inngest — Recurring Invoice Cron and Overdue Detection

**Files:**
- Modify: `src/shared/inngest.ts`
- Modify: `src/modules/client-portal/client-portal.events.ts`

- [ ] **Step 1: Add new event types to inngest.ts**

Add to the events object in the Inngest client configuration:

```typescript
"portal/engagement:activated": {
  data: { engagementId: string; tenantId: string; customerId: string };
},
"portal/invoices:generated": {
  data: { invoiceIds: string[]; engagementId: string; tenantId: string };
},
"portal/invoice:reminder": {
  data: { invoiceId: string; engagementId: string; tenantId: string; customerId: string; reminderType: string };
},
"portal/milestone:completed": {
  data: { milestoneId: string; engagementId: string; tenantId: string; customerId: string };
},
```

- [ ] **Step 2: Add daily invoice cron to client-portal.events.ts**

```typescript
export const dailyInvoiceCheck = inngest.createFunction(
  { id: "portal-daily-invoice-check", retries: 3 },
  { cron: "0 9 * * *" },
  async ({ step, logger }) => {
    // 1. Generate recurring invoices
    await step.run("generate-recurring-invoices", async () => {
      const rules = await clientPortalRepository.findActiveRecurringRules();

      for (const rule of rules) {
        const lastInvoice = await clientPortalRepository.findLastInvoiceForRule(rule.id);
        const now = new Date();
        let isDue = false;

        if (!lastInvoice) {
          isDue = true;
        } else {
          const daysSinceLastInvoice = Math.floor(
            (now.getTime() - lastInvoice.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (rule.recurringInterval === "MONTHLY" && daysSinceLastInvoice >= 30) isDue = true;
          if (rule.recurringInterval === "QUARTERLY" && daysSinceLastInvoice >= 90) isDue = true;
        }

        if (isDue) {
          const invoiceNumber = await clientPortalRepository.getNextInvoiceNumber(rule.tenantId);
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 14);

          await clientPortalRepository.createInvoiceBulk([{
            engagementId: rule.engagementId,
            amount: rule.amount,
            description: rule.label,
            dueDate,
            token: crypto.randomUUID(),
            sourcePaymentRuleId: rule.id,
            invoiceNumber,
          }]);

          logger.info({ ruleId: rule.id, engagementId: rule.engagementId }, "Recurring invoice generated");
        }
      }
    });

    // 2. Detect and mark overdue invoices
    await step.run("detect-overdue-invoices", async () => {
      const overdueInvoices = await clientPortalRepository.findOverdueInvoices();

      for (const invoice of overdueInvoices) {
        await clientPortalRepository.updateInvoice(invoice.id, { status: "OVERDUE" });

        await inngest.send({
          name: "portal/invoice:overdue",
          data: {
            invoiceId: invoice.id,
            engagementId: invoice.engagementId,
            customerId: invoice.customerId,
            tenantId: invoice.tenantId,
          },
        });

        logger.info({ invoiceId: invoice.id }, "Invoice marked overdue");
      }
    });
  }
);
```

Add the required import at the top of `client-portal.events.ts`:

```typescript
import { clientPortalRepository } from "./client-portal.repository";
import { inngest } from "@/shared/inngest";
```

- [ ] **Step 3: Export the new function and register it**

Add `dailyInvoiceCheck` to the exports in `client-portal.events.ts` and register it in the Inngest serve route (`src/app/api/inngest/route.ts` or similar — find the file that calls `inngest.createFunction` and collects all functions).

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/shared/inngest.ts src/modules/client-portal/client-portal.events.ts
git commit -m "feat(events): add daily invoice cron for recurring generation and overdue detection"
```

---

### Task 10: Update getDashboard with Financial Summary

**Files:**
- Modify: `src/modules/client-portal/client-portal.service.ts`

- [ ] **Step 1: Update getDashboard to include financial summary and deliverables**

Replace the `getDashboard` method:

```typescript
  async getDashboard(portalCtx: PortalContext, input: z.infer<typeof getDashboardSchema>): Promise<PortalDashboard> {
    const engagement = await clientPortalRepository.findEngagementByCustomer(
      portalCtx.portalCustomerId,
      input.engagementId,
    );
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    const [milestones, allDeliverables, allApprovals, allInvoices, proposalList] = await Promise.all([
      clientPortalRepository.listMilestones(engagement.id),
      clientPortalRepository.listDeliverables(engagement.id),
      clientPortalRepository.listApprovals(engagement.id),
      clientPortalRepository.listInvoices(engagement.id),
      clientPortalRepository.listProposalsByEngagement(engagement.id),
    ]);

    const pendingApprovals = allApprovals.filter((a) => a.status === "PENDING");
    const pendingInvoices = allInvoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE");

    // Financial summary
    const nonVoidInvoices = allInvoices.filter((i) => i.status !== "VOID");
    const totalValue = nonVoidInvoices.reduce((sum, i) => sum + i.amount, 0);
    const totalPaid = nonVoidInvoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0);
    const totalOutstanding = nonVoidInvoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").reduce((sum, i) => sum + i.amount, 0);
    const overdueCount = nonVoidInvoices.filter((i) => i.status === "OVERDUE").length;

    // Build activity feed
    const activity: ActivityItem[] = [];

    for (const p of proposalList) {
      if (p.sentAt) activity.push({ type: "proposal_sent", title: "Proposal sent", timestamp: p.sentAt });
      if (p.approvedAt) activity.push({ type: "proposal_approved", title: "Proposal approved", timestamp: p.approvedAt });
      if (p.declinedAt) activity.push({ type: "proposal_declined", title: "Proposal declined", timestamp: p.declinedAt });
    }
    for (const m of milestones) {
      if (m.status === "IN_PROGRESS") activity.push({ type: "milestone_started", title: `${m.title} started`, timestamp: m.updatedAt });
      if (m.completedAt) activity.push({ type: "milestone_completed", title: `${m.title} completed`, timestamp: m.completedAt });
    }
    for (const d of allDeliverables) {
      if (d.deliveredAt) activity.push({ type: "deliverable_shared", title: `${d.title} shared`, timestamp: d.deliveredAt });
      if (d.acceptedAt) activity.push({ type: "deliverable_accepted", title: `${d.title} accepted`, timestamp: d.acceptedAt });
    }
    for (const a of allApprovals) {
      activity.push({ type: "approval_requested", title: `Approval requested: ${a.title}`, timestamp: a.createdAt });
      if (a.respondedAt) activity.push({ type: "approval_responded", title: `Approval ${a.status.toLowerCase()}: ${a.title}`, timestamp: a.respondedAt });
    }
    for (const i of allInvoices) {
      if (i.sentAt) activity.push({ type: "invoice_sent", title: `Invoice sent: ${i.description}`, timestamp: i.sentAt });
      if (i.paidAt) activity.push({ type: "invoice_paid", title: `Invoice paid: ${i.description}`, timestamp: i.paidAt });
    }

    activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      engagement,
      pendingApprovals,
      pendingInvoices,
      milestones,
      deliverables: allDeliverables,
      financials: { totalValue, totalPaid, totalOutstanding, overdueCount },
      activity,
    };
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/modules/client-portal/client-portal.service.ts
git commit -m "feat(service): add financial summary and deliverables to portal dashboard"
```

---

### Task 11: Verify Full Build

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript compiler**

Run: `npx tsc --noEmit`

Expected: 0 errors. Fix any errors found.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`

Expected: All tests pass, including the new materialization tests.

- [ ] **Step 3: Run build**

Run: `NEXT_PHASE=phase-production-build npm run build`

Expected: Build succeeds.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build and type errors from Wave A implementation"
```

---

### Task 12: Data Migration Script (Existing JSONB → Relational)

**Files:**
- Create: `scripts/migrate-proposal-jsonb.ts`

- [ ] **Step 1: Write migration script**

```typescript
/**
 * One-time data migration: converts existing proposal JSONB columns
 * (deliverables, paymentSchedule) into relational tables
 * (proposal_sections, proposal_items, payment_rules).
 *
 * Run: npx tsx scripts/migrate-proposal-jsonb.ts
 *
 * This is idempotent — it skips proposals that already have sections.
 */
import { db } from "../src/shared/db";
import {
  proposals,
  proposalSections,
  proposalItems,
  paymentRules,
  engagements,
} from "../src/shared/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting JSONB → relational migration...");

  const allProposals = await db.select().from(proposals);
  console.log(`Found ${allProposals.length} proposals to check`);

  let migrated = 0;
  let skipped = 0;

  for (const proposal of allProposals) {
    // Check if already migrated (has sections)
    const existingSections = await db
      .select()
      .from(proposalSections)
      .where(eq(proposalSections.proposalId, proposal.id))
      .limit(1);

    if (existingSections.length > 0) {
      skipped++;
      continue;
    }

    const deliverablesList = (proposal.deliverables ?? []) as { title: string; description: string }[];
    const paymentSchedule = (proposal.paymentSchedule ?? []) as { label: string; amount: number; dueType: string }[];

    if (deliverablesList.length === 0 && paymentSchedule.length === 0) {
      skipped++;
      continue;
    }

    // Get engagement for tenantId
    const [engagement] = await db
      .select()
      .from(engagements)
      .where(eq(engagements.id, proposal.engagementId))
      .limit(1);

    if (!engagement) {
      console.warn(`Skipping proposal ${proposal.id} — engagement not found`);
      skipped++;
      continue;
    }

    const now = new Date();

    // Create a single AD_HOC section for the deliverables
    if (deliverablesList.length > 0) {
      const [section] = await db
        .insert(proposalSections)
        .values({
          proposalId: proposal.id,
          title: "Deliverables",
          type: "AD_HOC" as any,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Create items from deliverables
      await db.insert(proposalItems).values(
        deliverablesList.map((d, i) => ({
          sectionId: section!.id,
          proposalId: proposal.id,
          title: d.title,
          description: d.description || null,
          sortOrder: i,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    // Create payment rules from paymentSchedule
    if (paymentSchedule.length > 0) {
      await db.insert(paymentRules).values(
        paymentSchedule.map((ps, i) => {
          let trigger = "ON_APPROVAL";
          if (ps.dueType === "ON_DATE") trigger = "FIXED_DATE";
          if (ps.dueType === "ON_MILESTONE") trigger = "MILESTONE_COMPLETE";
          if (ps.dueType === "ON_COMPLETION") trigger = "MILESTONE_COMPLETE";

          return {
            proposalId: proposal.id,
            tenantId: engagement.tenantId,
            label: ps.label,
            amount: ps.amount,
            trigger: trigger as any,
            autoSend: false,
            sortOrder: i,
            createdAt: now,
            updatedAt: now,
          };
        })
      );
    }

    migrated++;
    console.log(`Migrated proposal ${proposal.id} (${deliverablesList.length} items, ${paymentSchedule.length} rules)`);
  }

  console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-proposal-jsonb.ts
git commit -m "feat(scripts): add JSONB-to-relational data migration for proposals"
```

---

## Summary

**Wave A delivers:**
- 3 new tables: `proposal_sections`, `proposal_items`, `payment_rules`
- 6 modified tables with new columns for lineage tracking
- Full materialization engine (approval → milestones + deliverables + invoices)
- Milestone-triggered invoice generation
- Daily Inngest cron for recurring invoices and overdue detection
- Admin CRUD procedures for sections, items, and rules
- Enhanced portal dashboard with financial summary
- Data migration script for existing JSONB proposals

**What's NOT in Wave A (deferred to Wave B/C):**
- Proposal versioning (Wave B)
- Engagement templates (Wave B)
- Stripe Checkout Session creation (Wave B — requires Stripe account setup)
- Comments, documents, change requests (Wave C)
- Portal UI updates (separate plan — frontend)
