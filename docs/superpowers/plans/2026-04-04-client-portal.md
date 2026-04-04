# Client Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-facing portal module for managing engagements from proposal through to project completion or ongoing retainer.

**Architecture:** New `client-portal` module following established Ironheart patterns (types → schemas → repository → service → router → events). Separate `portalProcedure` middleware for client auth via magic links. All tables include `tenantId` for multi-tenant consistency.

**Tech Stack:** Next.js 16, tRPC 11, Drizzle ORM, Zod v4, Inngest, Pino, vitest

**Spec:** `docs/superpowers/specs/2026-04-04-client-portal-design.md`

**Mockups:** `.superpowers/brainstorm/63013-1775327512/content/` (31 HTML files)

---

## File Map

### New Files
- `src/shared/db/schemas/client-portal.schema.ts` — Drizzle table definitions (8 tables)
- `src/modules/client-portal/client-portal.types.ts` — TypeScript interfaces
- `src/modules/client-portal/client-portal.schemas.ts` — Zod input validation schemas
- `src/modules/client-portal/client-portal.repository.ts` — Drizzle queries
- `src/modules/client-portal/client-portal.service.ts` — Business logic + Inngest events
- `src/modules/client-portal/client-portal.router.ts` — tRPC procedures (admin + portal)
- `src/modules/client-portal/client-portal.events.ts` — Inngest event handlers
- `src/modules/client-portal/index.ts` — Barrel export
- `src/modules/client-portal/__tests__/client-portal.test.ts` — Tests

### Modified Files
- `src/shared/db/schema.ts` — Re-export new schema tables
- `src/shared/inngest.ts` — Add 9 portal event types
- `src/shared/trpc.ts` — Add `portalProcedure` middleware
- `src/server/root.ts` — Wire `clientPortalRouter`
- `src/app/api/inngest/route.ts` — Register portal Inngest functions

---

### Task 1: Database Schema Tables

**Files:**
- Create: `src/shared/db/schemas/client-portal.schema.ts`
- Modify: `src/shared/db/schema.ts`

- [ ] **Step 1: Create the schema file with all 8 tables**

```typescript
// src/shared/db/schemas/client-portal.schema.ts
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenant.schema";
import { customers } from "./customer.schema";

// ── Enums ────────────────────────────────────────────────────────────────

export const engagementType = pgEnum("EngagementType", [
  "PROJECT",
  "RETAINER",
]);

export const engagementStatus = pgEnum("EngagementStatus", [
  "DRAFT",
  "PROPOSED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
]);

export const proposalStatus = pgEnum("ProposalStatus", [
  "DRAFT",
  "SENT",
  "APPROVED",
  "DECLINED",
  "SUPERSEDED",
]);

export const milestoneStatus = pgEnum("MilestoneStatus", [
  "UPCOMING",
  "IN_PROGRESS",
  "COMPLETED",
]);

export const deliverableStatus = pgEnum("DeliverableStatus", [
  "PENDING",
  "DELIVERED",
  "ACCEPTED",
]);

export const approvalRequestStatus = pgEnum("ApprovalRequestStatus", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const portalInvoiceStatus = pgEnum("PortalInvoiceStatus", [
  "DRAFT",
  "SENT",
  "PAID",
  "OVERDUE",
]);

export const portalPaymentMethod = pgEnum("PortalPaymentMethod", [
  "STRIPE",
  "BANK_TRANSFER",
]);

// ── Tables ───────────────────────────────────────────────────────────────

export const engagements = pgTable(
  "engagements",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    tenantId: uuid().notNull(),
    customerId: uuid().notNull(),
    type: engagementType().notNull(),
    status: engagementStatus().default("DRAFT").notNull(),
    title: text().notNull(),
    description: text(),
    startDate: date({ mode: "date" }),
    endDate: date({ mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("engagements_tenantId_idx").on(table.tenantId),
    index("engagements_customerId_idx").on(table.customerId),
    index("engagements_tenantId_status_idx").on(table.tenantId, table.status),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: "engagements_tenantId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: "engagements_customerId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const proposals = pgTable(
  "proposals",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    engagementId: uuid().notNull(),
    status: proposalStatus().default("DRAFT").notNull(),
    scope: text().notNull(),
    deliverables: jsonb().notNull().default(sql`'[]'::jsonb`),
    price: integer().notNull(),
    paymentSchedule: jsonb().notNull().default(sql`'[]'::jsonb`),
    terms: text(),
    token: text().notNull(),
    tokenExpiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    sentAt: timestamp({ precision: 3, mode: "date" }),
    approvedAt: timestamp({ precision: 3, mode: "date" }),
    declinedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("proposals_engagementId_idx").on(table.engagementId),
    uniqueIndex("proposals_token_key").on(table.token),
    foreignKey({
      columns: [table.engagementId],
      foreignColumns: [engagements.id],
      name: "proposals_engagementId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const engagementMilestones = pgTable(
  "engagement_milestones",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    engagementId: uuid().notNull(),
    title: text().notNull(),
    description: text(),
    status: milestoneStatus().default("UPCOMING").notNull(),
    sortOrder: integer().notNull().default(0),
    dueDate: date({ mode: "date" }),
    completedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("engagement_milestones_engagementId_idx").on(table.engagementId),
    foreignKey({
      columns: [table.engagementId],
      foreignColumns: [engagements.id],
      name: "engagement_milestones_engagementId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const deliverables = pgTable(
  "deliverables",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    engagementId: uuid().notNull(),
    milestoneId: uuid(),
    title: text().notNull(),
    description: text(),
    status: deliverableStatus().default("PENDING").notNull(),
    fileUrl: text(),
    fileName: text(),
    fileSize: integer(),
    deliveredAt: timestamp({ precision: 3, mode: "date" }),
    acceptedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("deliverables_engagementId_idx").on(table.engagementId),
    index("deliverables_milestoneId_idx").on(table.milestoneId),
    foreignKey({
      columns: [table.engagementId],
      foreignColumns: [engagements.id],
      name: "deliverables_engagementId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.milestoneId],
      foreignColumns: [engagementMilestones.id],
      name: "deliverables_milestoneId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ]
);

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    engagementId: uuid().notNull(),
    deliverableId: uuid(),
    milestoneId: uuid(),
    title: text().notNull(),
    description: text().notNull(),
    status: approvalRequestStatus().default("PENDING").notNull(),
    clientComment: text(),
    respondedAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("approval_requests_engagementId_idx").on(table.engagementId),
    foreignKey({
      columns: [table.engagementId],
      foreignColumns: [engagements.id],
      name: "approval_requests_engagementId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.deliverableId],
      foreignColumns: [deliverables.id],
      name: "approval_requests_deliverableId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    foreignKey({
      columns: [table.milestoneId],
      foreignColumns: [engagementMilestones.id],
      name: "approval_requests_milestoneId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ]
);

export const portalInvoices = pgTable(
  "portal_invoices",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    engagementId: uuid().notNull(),
    milestoneId: uuid(),
    proposalPaymentIndex: integer(),
    amount: integer().notNull(),
    description: text().notNull(),
    status: portalInvoiceStatus().default("DRAFT").notNull(),
    dueDate: date({ mode: "date" }).notNull(),
    paidAt: timestamp({ precision: 3, mode: "date" }),
    paymentMethod: portalPaymentMethod(),
    paymentReference: text(),
    token: text().notNull(),
    sentAt: timestamp({ precision: 3, mode: "date" }),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    index("portal_invoices_engagementId_idx").on(table.engagementId),
    uniqueIndex("portal_invoices_token_key").on(table.token),
    foreignKey({
      columns: [table.engagementId],
      foreignColumns: [engagements.id],
      name: "portal_invoices_engagementId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
    foreignKey({
      columns: [table.milestoneId],
      foreignColumns: [engagementMilestones.id],
      name: "portal_invoices_milestoneId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("set null"),
  ]
);

export const portalCredentials = pgTable(
  "portal_credentials",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    customerId: uuid().notNull(),
    passwordHash: text().notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("portal_credentials_customerId_key").on(table.customerId),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: "portal_credentials_customerId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);

export const portalSessions = pgTable(
  "portal_sessions",
  {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    customerId: uuid().notNull(),
    token: text().notNull(),
    tokenExpiresAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    sessionToken: text(),
    sessionExpiresAt: timestamp({ precision: 3, mode: "date" }),
    lastAccessedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
    createdAt: timestamp({ precision: 3, mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("portal_sessions_customerId_idx").on(table.customerId),
    uniqueIndex("portal_sessions_token_key").on(table.token),
    uniqueIndex("portal_sessions_sessionToken_key").on(table.sessionToken),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: "portal_sessions_customerId_fkey",
    })
      .onUpdate("cascade")
      .onDelete("cascade"),
  ]
);
```

- [ ] **Step 2: Re-export from the shared schema barrel**

Open `src/shared/db/schema.ts` and add:

```typescript
export * from "./schemas/client-portal.schema";
```

- [ ] **Step 3: Verify the schema compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to client-portal schema

- [ ] **Step 4: Commit**

```bash
git add src/shared/db/schemas/client-portal.schema.ts src/shared/db/schema.ts
git commit -m "feat(client-portal): add database schema tables for engagements, proposals, milestones, deliverables, approvals, invoices, portal auth"
```

---

### Task 2: Types File

**Files:**
- Create: `src/modules/client-portal/client-portal.types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/modules/client-portal/client-portal.types.ts

// ── Enums as string unions ───────────────────────────────────────────────

export type EngagementType = "PROJECT" | "RETAINER";
export type EngagementStatus = "DRAFT" | "PROPOSED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type ProposalStatus = "DRAFT" | "SENT" | "APPROVED" | "DECLINED" | "SUPERSEDED";
export type MilestoneStatus = "UPCOMING" | "IN_PROGRESS" | "COMPLETED";
export type DeliverableStatus = "PENDING" | "DELIVERED" | "ACCEPTED";
export type ApprovalRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PortalInvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";
export type PortalPaymentMethod = "STRIPE" | "BANK_TRANSFER";
export type PaymentDueType = "ON_APPROVAL" | "ON_DATE" | "ON_MILESTONE" | "ON_COMPLETION";

// ── JSONB shapes ─────────────────────────────────────────────────────────

export interface ProposalDeliverable {
  title: string;
  description: string;
}

export interface PaymentScheduleItem {
  label: string;
  amount: number;
  dueType: PaymentDueType;
}

// ── Domain records ───────────────────────────────────────────────────────

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
  createdAt: Date;
  updatedAt: Date;
}

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
  sentAt: Date | null;
  approvedAt: Date | null;
  declinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MilestoneRecord {
  id: string;
  engagementId: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  sortOrder: number;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

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
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalRequestRecord {
  id: string;
  engagementId: string;
  deliverableId: string | null;
  milestoneId: string | null;
  title: string;
  description: string;
  status: ApprovalRequestStatus;
  clientComment: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

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
  createdAt: Date;
  updatedAt: Date;
}

export interface PortalSessionRecord {
  id: string;
  customerId: string;
  token: string;
  tokenExpiresAt: Date;
  sessionToken: string | null;
  sessionExpiresAt: Date | null;
  lastAccessedAt: Date;
  createdAt: Date;
}

// ── Activity feed ────────────────────────────────────────────────────────

export type ActivityType =
  | "proposal_sent"
  | "proposal_approved"
  | "proposal_declined"
  | "milestone_started"
  | "milestone_completed"
  | "deliverable_shared"
  | "deliverable_accepted"
  | "approval_requested"
  | "approval_responded"
  | "invoice_sent"
  | "invoice_paid";

export interface ActivityItem {
  type: ActivityType;
  title: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ── Dashboard ────────────────────────────────────────────────────────────

export interface PortalDashboard {
  engagement: EngagementRecord;
  pendingApprovals: ApprovalRequestRecord[];
  pendingInvoices: PortalInvoiceRecord[];
  milestones: MilestoneRecord[];
  activity: ActivityItem[];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/client-portal/client-portal.types.ts
git commit -m "feat(client-portal): add TypeScript type definitions"
```

---

### Task 3: Zod Schemas

**Files:**
- Create: `src/modules/client-portal/client-portal.schemas.ts`

- [ ] **Step 1: Create the schemas file**

```typescript
// src/modules/client-portal/client-portal.schemas.ts
import { z } from "zod";

// ── Shared sub-schemas ───────────────────────────────────────────────────

const proposalDeliverableSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
});

const paymentScheduleItemSchema = z.object({
  label: z.string().min(1),
  amount: z.number().int().positive(),
  dueType: z.enum(["ON_APPROVAL", "ON_DATE", "ON_MILESTONE", "ON_COMPLETION"]),
});

// ── Admin: Engagements ───────────────────────────────────────────────────

export const createEngagementSchema = z.object({
  customerId: z.uuid(),
  type: z.enum(["PROJECT", "RETAINER"]),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  startDate: z.date().optional().nullable(),
});

export const updateEngagementSchema = z.object({
  id: z.uuid(),
  type: z.enum(["PROJECT", "RETAINER"]).optional(),
  status: z.enum(["DRAFT", "PROPOSED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
});

export const listEngagementsSchema = z.object({
  status: z.enum(["DRAFT", "PROPOSED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  type: z.enum(["PROJECT", "RETAINER"]).optional(),
  search: z.string().optional(),
  limit: z.number().int().max(100).default(50),
  cursor: z.string().optional(),
});

// ── Admin: Proposals ─────────────────────────────────────────────────────

export const createProposalSchema = z.object({
  engagementId: z.uuid(),
  scope: z.string().min(1),
  deliverables: z.array(proposalDeliverableSchema).min(1),
  price: z.number().int().positive(),
  paymentSchedule: z.array(paymentScheduleItemSchema),
  terms: z.string().optional().nullable(),
});

export const sendProposalSchema = z.object({
  proposalId: z.uuid(),
});

// ── Admin: Milestones ────────────────────────────────────────────────────

export const createMilestoneSchema = z.object({
  engagementId: z.uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  dueDate: z.date().optional().nullable(),
});

export const updateMilestoneSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["UPCOMING", "IN_PROGRESS", "COMPLETED"]).optional(),
  sortOrder: z.number().int().optional(),
  dueDate: z.date().optional().nullable(),
});

// ── Admin: Deliverables ──────────────────────────────────────────────────

export const createDeliverableSchema = z.object({
  engagementId: z.uuid(),
  milestoneId: z.uuid().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileSize: z.number().int().optional().nullable(),
});

export const deliverDeliverableSchema = z.object({
  id: z.uuid(),
});

// ── Admin: Approval Requests ─────────────────────────────────────────────

export const createApprovalSchema = z.object({
  engagementId: z.uuid(),
  deliverableId: z.uuid().optional().nullable(),
  milestoneId: z.uuid().optional().nullable(),
  title: z.string().min(1),
  description: z.string().min(1),
});

// ── Admin: Invoices ──────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  engagementId: z.uuid(),
  milestoneId: z.uuid().optional().nullable(),
  proposalPaymentIndex: z.number().int().optional().nullable(),
  amount: z.number().int().positive(),
  description: z.string().min(1),
  dueDate: z.date(),
});

export const sendInvoiceSchema = z.object({
  invoiceId: z.uuid(),
});

export const markInvoicePaidSchema = z.object({
  invoiceId: z.uuid(),
  paymentMethod: z.enum(["STRIPE", "BANK_TRANSFER"]),
  paymentReference: z.string().optional().nullable(),
});

// ── Portal: Client-facing ────────────────────────────────────────────────

export const getProposalByTokenSchema = z.object({
  token: z.string().min(1),
});

export const approveProposalSchema = z.object({
  proposalId: z.uuid(),
});

export const declineProposalSchema = z.object({
  proposalId: z.uuid(),
  feedback: z.string().optional().nullable(),
});

export const respondToApprovalSchema = z.object({
  approvalId: z.uuid(),
  approved: z.boolean(),
  comment: z.string().optional().nullable(),
});

export const acceptDeliverableSchema = z.object({
  deliverableId: z.uuid(),
});

export const setPasswordSchema = z.object({
  password: z.string().min(8),
});

export const portalLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const requestMagicLinkSchema = z.object({
  email: z.string().email(),
});

export const getDashboardSchema = z.object({
  engagementId: z.uuid(),
});

export const listByEngagementSchema = z.object({
  engagementId: z.uuid(),
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/client-portal/client-portal.schemas.ts
git commit -m "feat(client-portal): add Zod input validation schemas"
```

---

### Task 4: Add Inngest Event Types

**Files:**
- Modify: `src/shared/inngest.ts`

- [ ] **Step 1: Read the current inngest.ts to find the IronheartEvents type**

Read `src/shared/inngest.ts` and locate the `IronheartEvents` type definition.

- [ ] **Step 2: Add portal events to IronheartEvents**

Add these entries inside the `IronheartEvents` type:

```typescript
  "portal/proposal:sent": {
    data: {
      proposalId: string;
      engagementId: string;
      customerId: string;
      tenantId: string;
    };
  };
  "portal/proposal:approved": {
    data: {
      proposalId: string;
      engagementId: string;
      customerId: string;
      tenantId: string;
    };
  };
  "portal/proposal:declined": {
    data: {
      proposalId: string;
      engagementId: string;
      customerId: string;
      tenantId: string;
      feedback: string | null;
    };
  };
  "portal/deliverable:shared": {
    data: {
      deliverableId: string;
      engagementId: string;
      customerId: string;
      tenantId: string;
    };
  };
  "portal/approval:requested": {
    data: {
      approvalId: string;
      engagementId: string;
      customerId: string;
      tenantId: string;
    };
  };
  "portal/approval:responded": {
    data: {
      approvalId: string;
      engagementId: string;
      customerId: string;
      tenantId: string;
      approved: boolean;
    };
  };
  "portal/invoice:sent": {
    data: {
      invoiceId: string;
      engagementId: string;
      customerId: string;
      tenantId: string;
    };
  };
  "portal/invoice:paid": {
    data: {
      invoiceId: string;
      engagementId: string;
      customerId: string;
      tenantId: string;
    };
  };
  "portal/invoice:overdue": {
    data: {
      invoiceId: string;
      engagementId: string;
      customerId: string;
      tenantId: string;
    };
  };
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -10`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/shared/inngest.ts
git commit -m "feat(client-portal): add portal Inngest event types"
```

---

### Task 5: Portal Procedure Middleware

**Files:**
- Modify: `src/shared/trpc.ts`

- [ ] **Step 1: Read the current trpc.ts to find where to add the new procedure**

Read `src/shared/trpc.ts` and locate the exports section at the bottom.

- [ ] **Step 2: Add portalProcedure after the existing procedures**

Add this new procedure and its supporting type. The portal procedure reads a session token from a cookie or query param, validates it against the `portalSessions` table, and injects `customerId` into context.

```typescript
// ── Portal context (client-facing, separate from WorkOS auth) ──────────

export type PortalContext = Context & {
  portalCustomerId: string;
};

/**
 * portalProcedure — validates a portal session token from cookie or query.
 * Injects portalCustomerId into context. No WorkOS auth needed.
 */
export const portalProcedure = publicProcedure.use(
  async ({ ctx, next }) => {
    // Read session token from cookie header
    const cookieHeader = ctx.req.headers.get("cookie") ?? "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [key, ...rest] = c.trim().split("=");
        return [key, rest.join("=")];
      })
    );
    const sessionToken = cookies["portal_session"] ?? null;

    if (!sessionToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Portal session required",
      });
    }

    // Validate against portalSessions table
    const { portalSessions } = await import("@/shared/db/schema");
    const session = await ctx.db
      .select()
      .from(portalSessions)
      .where(eq(portalSessions.sessionToken, sessionToken))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid portal session",
      });
    }

    if (session.sessionExpiresAt && session.sessionExpiresAt < new Date()) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Portal session expired",
      });
    }

    // Update last accessed
    await ctx.db
      .update(portalSessions)
      .set({ lastAccessedAt: new Date() })
      .where(eq(portalSessions.id, session.id));

    return next({
      ctx: {
        ...ctx,
        portalCustomerId: session.customerId,
      } satisfies PortalContext,
    });
  }
);
```

You will need to add `eq` to the existing drizzle-orm import at the top of the file if it's not already there.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -10`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/shared/trpc.ts
git commit -m "feat(client-portal): add portalProcedure middleware for client auth"
```

---

### Task 6: Repository

**Files:**
- Create: `src/modules/client-portal/client-portal.repository.ts`

- [ ] **Step 1: Create the repository with all entity operations**

```typescript
// src/modules/client-portal/client-portal.repository.ts
import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { NotFoundError } from "@/shared/errors";
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
} from "@/shared/db/schema";
import { eq, and, desc, or, ilike, sql } from "drizzle-orm";
import type {
  EngagementRecord,
  ProposalRecord,
  MilestoneRecord,
  DeliverableRecord,
  ApprovalRequestRecord,
  PortalInvoiceRecord,
  PortalSessionRecord,
  ProposalDeliverable,
  PaymentScheduleItem,
} from "./client-portal.types";

const log = logger.child({ module: "client-portal.repository" });

// ── Mappers ──────────────────────────────────────────────────────────────

type EngagementRow = typeof engagements.$inferSelect;
type ProposalRow = typeof proposals.$inferSelect;
type MilestoneRow = typeof engagementMilestones.$inferSelect;
type DeliverableRow = typeof deliverables.$inferSelect;
type ApprovalRow = typeof approvalRequests.$inferSelect;
type InvoiceRow = typeof portalInvoices.$inferSelect;
type SessionRow = typeof portalSessions.$inferSelect;

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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

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
    sentAt: row.sentAt ?? null,
    approvedAt: row.approvedAt ?? null,
    declinedAt: row.declinedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toApproval(row: ApprovalRow): ApprovalRequestRecord {
  return {
    id: row.id,
    engagementId: row.engagementId,
    deliverableId: row.deliverableId ?? null,
    milestoneId: row.milestoneId ?? null,
    title: row.title,
    description: row.description,
    status: row.status,
    clientComment: row.clientComment ?? null,
    respondedAt: row.respondedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSession(row: SessionRow): PortalSessionRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    token: row.token,
    tokenExpiresAt: row.tokenExpiresAt,
    sessionToken: row.sessionToken ?? null,
    sessionExpiresAt: row.sessionExpiresAt ?? null,
    lastAccessedAt: row.lastAccessedAt,
    createdAt: row.createdAt,
  };
}

// ── Repository ───────────────────────────────────────────────────────────

export const clientPortalRepository = {
  // ── Engagements ──────────────────────────────────────────────────────

  async findEngagement(tenantId: string, id: string): Promise<EngagementRecord | null> {
    const result = await db
      .select()
      .from(engagements)
      .where(and(eq(engagements.id, id), eq(engagements.tenantId, tenantId)))
      .limit(1);
    return result[0] ? toEngagement(result[0]) : null;
  },

  async findEngagementByCustomer(customerId: string, engagementId: string): Promise<EngagementRecord | null> {
    const result = await db
      .select()
      .from(engagements)
      .where(and(eq(engagements.id, engagementId), eq(engagements.customerId, customerId)))
      .limit(1);
    return result[0] ? toEngagement(result[0]) : null;
  },

  async listEngagements(
    tenantId: string,
    opts: { status?: string; type?: string; search?: string; limit: number; cursor?: string }
  ): Promise<{ rows: EngagementRecord[]; hasMore: boolean }> {
    const conditions = [eq(engagements.tenantId, tenantId)];
    if (opts.status) conditions.push(eq(engagements.status, opts.status as any));
    if (opts.type) conditions.push(eq(engagements.type, opts.type as any));
    if (opts.search) {
      conditions.push(ilike(engagements.title, `%${opts.search}%`));
    }

    const rows = await db
      .select()
      .from(engagements)
      .where(and(...conditions))
      .orderBy(desc(engagements.createdAt))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    return {
      rows: (hasMore ? rows.slice(0, opts.limit) : rows).map(toEngagement),
      hasMore,
    };
  },

  async createEngagement(
    tenantId: string,
    input: { customerId: string; type: string; title: string; description?: string | null; startDate?: Date | null }
  ): Promise<EngagementRecord> {
    const now = new Date();
    const [row] = await db
      .insert(engagements)
      .values({
        tenantId,
        customerId: input.customerId,
        type: input.type as any,
        title: input.title,
        description: input.description ?? null,
        startDate: input.startDate ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ tenantId, engagementId: row!.id }, "Engagement created");
    return toEngagement(row!);
  },

  async updateEngagement(
    tenantId: string,
    id: string,
    updates: Partial<{ type: string; status: string; title: string; description: string | null; startDate: Date | null; endDate: Date | null }>
  ): Promise<EngagementRecord> {
    const [row] = await db
      .update(engagements)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(and(eq(engagements.id, id), eq(engagements.tenantId, tenantId)))
      .returning();
    if (!row) throw new NotFoundError("Engagement", id);
    return toEngagement(row);
  },

  // ── Proposals ────────────────────────────────────────────────────────

  async findProposal(id: string): Promise<ProposalRecord | null> {
    const result = await db.select().from(proposals).where(eq(proposals.id, id)).limit(1);
    return result[0] ? toProposal(result[0]) : null;
  },

  async findProposalByToken(token: string): Promise<ProposalRecord | null> {
    const result = await db.select().from(proposals).where(eq(proposals.token, token)).limit(1);
    return result[0] ? toProposal(result[0]) : null;
  },

  async listProposalsByEngagement(engagementId: string): Promise<ProposalRecord[]> {
    const rows = await db
      .select()
      .from(proposals)
      .where(eq(proposals.engagementId, engagementId))
      .orderBy(desc(proposals.createdAt));
    return rows.map(toProposal);
  },

  async createProposal(input: {
    engagementId: string;
    scope: string;
    deliverables: ProposalDeliverable[];
    price: number;
    paymentSchedule: PaymentScheduleItem[];
    terms?: string | null;
    token: string;
    tokenExpiresAt: Date;
  }): Promise<ProposalRecord> {
    const now = new Date();
    const [row] = await db
      .insert(proposals)
      .values({
        engagementId: input.engagementId,
        scope: input.scope,
        deliverables: input.deliverables,
        price: input.price,
        paymentSchedule: input.paymentSchedule,
        terms: input.terms ?? null,
        token: input.token,
        tokenExpiresAt: input.tokenExpiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ proposalId: row!.id, engagementId: input.engagementId }, "Proposal created");
    return toProposal(row!);
  },

  async updateProposal(
    id: string,
    updates: Partial<{ status: string; sentAt: Date; approvedAt: Date; declinedAt: Date }>
  ): Promise<ProposalRecord> {
    const [row] = await db
      .update(proposals)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(proposals.id, id))
      .returning();
    if (!row) throw new NotFoundError("Proposal", id);
    return toProposal(row);
  },

  // ── Milestones ───────────────────────────────────────────────────────

  async listMilestones(engagementId: string): Promise<MilestoneRecord[]> {
    const rows = await db
      .select()
      .from(engagementMilestones)
      .where(eq(engagementMilestones.engagementId, engagementId))
      .orderBy(engagementMilestones.sortOrder);
    return rows.map(toMilestone);
  },

  async createMilestone(input: {
    engagementId: string;
    title: string;
    description?: string | null;
    dueDate?: Date | null;
    sortOrder: number;
  }): Promise<MilestoneRecord> {
    const now = new Date();
    const [row] = await db
      .insert(engagementMilestones)
      .values({
        engagementId: input.engagementId,
        title: input.title,
        description: input.description ?? null,
        dueDate: input.dueDate ?? null,
        sortOrder: input.sortOrder,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ milestoneId: row!.id, engagementId: input.engagementId }, "Milestone created");
    return toMilestone(row!);
  },

  async updateMilestone(
    id: string,
    updates: Partial<{ title: string; description: string | null; status: string; sortOrder: number; dueDate: Date | null; completedAt: Date | null }>
  ): Promise<MilestoneRecord> {
    const [row] = await db
      .update(engagementMilestones)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(engagementMilestones.id, id))
      .returning();
    if (!row) throw new NotFoundError("Milestone", id);
    return toMilestone(row);
  },

  // ── Deliverables ─────────────────────────────────────────────────────

  async findDeliverable(id: string): Promise<DeliverableRecord | null> {
    const result = await db.select().from(deliverables).where(eq(deliverables.id, id)).limit(1);
    return result[0] ? toDeliverable(result[0]) : null;
  },

  async listDeliverables(engagementId: string): Promise<DeliverableRecord[]> {
    const rows = await db
      .select()
      .from(deliverables)
      .where(eq(deliverables.engagementId, engagementId))
      .orderBy(desc(deliverables.createdAt));
    return rows.map(toDeliverable);
  },

  async createDeliverable(input: {
    engagementId: string;
    milestoneId?: string | null;
    title: string;
    description?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
  }): Promise<DeliverableRecord> {
    const now = new Date();
    const [row] = await db
      .insert(deliverables)
      .values({
        engagementId: input.engagementId,
        milestoneId: input.milestoneId ?? null,
        title: input.title,
        description: input.description ?? null,
        fileUrl: input.fileUrl ?? null,
        fileName: input.fileName ?? null,
        fileSize: input.fileSize ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ deliverableId: row!.id, engagementId: input.engagementId }, "Deliverable created");
    return toDeliverable(row!);
  },

  async updateDeliverable(
    id: string,
    updates: Partial<{ status: string; deliveredAt: Date; acceptedAt: Date }>
  ): Promise<DeliverableRecord> {
    const [row] = await db
      .update(deliverables)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(deliverables.id, id))
      .returning();
    if (!row) throw new NotFoundError("Deliverable", id);
    return toDeliverable(row);
  },

  // ── Approval Requests ────────────────────────────────────────────────

  async findApproval(id: string): Promise<ApprovalRequestRecord | null> {
    const result = await db.select().from(approvalRequests).where(eq(approvalRequests.id, id)).limit(1);
    return result[0] ? toApproval(result[0]) : null;
  },

  async listApprovals(engagementId: string): Promise<ApprovalRequestRecord[]> {
    const rows = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.engagementId, engagementId))
      .orderBy(desc(approvalRequests.createdAt));
    return rows.map(toApproval);
  },

  async createApproval(input: {
    engagementId: string;
    deliverableId?: string | null;
    milestoneId?: string | null;
    title: string;
    description: string;
  }): Promise<ApprovalRequestRecord> {
    const now = new Date();
    const [row] = await db
      .insert(approvalRequests)
      .values({
        engagementId: input.engagementId,
        deliverableId: input.deliverableId ?? null,
        milestoneId: input.milestoneId ?? null,
        title: input.title,
        description: input.description,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ approvalId: row!.id, engagementId: input.engagementId }, "Approval request created");
    return toApproval(row!);
  },

  async updateApproval(
    id: string,
    updates: Partial<{ status: string; clientComment: string | null; respondedAt: Date }>
  ): Promise<ApprovalRequestRecord> {
    const [row] = await db
      .update(approvalRequests)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(approvalRequests.id, id))
      .returning();
    if (!row) throw new NotFoundError("ApprovalRequest", id);
    return toApproval(row);
  },

  // ── Invoices ─────────────────────────────────────────────────────────

  async findInvoice(id: string): Promise<PortalInvoiceRecord | null> {
    const result = await db.select().from(portalInvoices).where(eq(portalInvoices.id, id)).limit(1);
    return result[0] ? toInvoice(result[0]) : null;
  },

  async listInvoices(engagementId: string): Promise<PortalInvoiceRecord[]> {
    const rows = await db
      .select()
      .from(portalInvoices)
      .where(eq(portalInvoices.engagementId, engagementId))
      .orderBy(desc(portalInvoices.createdAt));
    return rows.map(toInvoice);
  },

  async createInvoice(input: {
    engagementId: string;
    milestoneId?: string | null;
    proposalPaymentIndex?: number | null;
    amount: number;
    description: string;
    dueDate: Date;
    token: string;
  }): Promise<PortalInvoiceRecord> {
    const now = new Date();
    const [row] = await db
      .insert(portalInvoices)
      .values({
        engagementId: input.engagementId,
        milestoneId: input.milestoneId ?? null,
        proposalPaymentIndex: input.proposalPaymentIndex ?? null,
        amount: input.amount,
        description: input.description,
        dueDate: input.dueDate,
        token: input.token,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    log.info({ invoiceId: row!.id, engagementId: input.engagementId }, "Invoice created");
    return toInvoice(row!);
  },

  async updateInvoice(
    id: string,
    updates: Partial<{ status: string; sentAt: Date; paidAt: Date; paymentMethod: string; paymentReference: string | null }>
  ): Promise<PortalInvoiceRecord> {
    const [row] = await db
      .update(portalInvoices)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(portalInvoices.id, id))
      .returning();
    if (!row) throw new NotFoundError("PortalInvoice", id);
    return toInvoice(row);
  },

  // ── Portal Auth ──────────────────────────────────────────────────────

  async createSession(input: {
    customerId: string;
    token: string;
    tokenExpiresAt: Date;
    sessionToken: string;
    sessionExpiresAt: Date;
  }): Promise<PortalSessionRecord> {
    const now = new Date();
    const [row] = await db
      .insert(portalSessions)
      .values({
        customerId: input.customerId,
        token: input.token,
        tokenExpiresAt: input.tokenExpiresAt,
        sessionToken: input.sessionToken,
        sessionExpiresAt: input.sessionExpiresAt,
        lastAccessedAt: now,
      })
      .returning();
    return toSession(row!);
  },

  async findSessionByToken(token: string): Promise<PortalSessionRecord | null> {
    const result = await db
      .select()
      .from(portalSessions)
      .where(eq(portalSessions.token, token))
      .limit(1);
    return result[0] ? toSession(result[0]) : null;
  },

  async findSessionBySessionToken(sessionToken: string): Promise<PortalSessionRecord | null> {
    const result = await db
      .select()
      .from(portalSessions)
      .where(eq(portalSessions.sessionToken, sessionToken))
      .limit(1);
    return result[0] ? toSession(result[0]) : null;
  },

  async findCredentialByCustomerId(customerId: string): Promise<{ passwordHash: string } | null> {
    const result = await db
      .select({ passwordHash: portalCredentials.passwordHash })
      .from(portalCredentials)
      .where(eq(portalCredentials.customerId, customerId))
      .limit(1);
    return result[0] ?? null;
  },

  async upsertCredential(customerId: string, passwordHash: string): Promise<void> {
    const now = new Date();
    await db
      .insert(portalCredentials)
      .values({ customerId, passwordHash, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: portalCredentials.customerId,
        set: { passwordHash, updatedAt: now },
      });
  },

  async findCustomerByEmail(email: string): Promise<{ id: string; tenantId: string } | null> {
    const result = await db
      .select({ id: customers.id, tenantId: customers.tenantId })
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);
    return result[0] ?? null;
  },

  // ── Engagement detail (for admin get) ────────────────────────────────

  async getEngagementDetail(tenantId: string, id: string) {
    const engagement = await this.findEngagement(tenantId, id);
    if (!engagement) return null;

    const [proposalList, milestoneList, deliverableList, approvalList, invoiceList] =
      await Promise.all([
        this.listProposalsByEngagement(id),
        this.listMilestones(id),
        this.listDeliverables(id),
        this.listApprovals(id),
        this.listInvoices(id),
      ]);

    return {
      ...engagement,
      proposals: proposalList,
      milestones: milestoneList,
      deliverables: deliverableList,
      approvals: approvalList,
      invoices: invoiceList,
    };
  },
};
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/client-portal/client-portal.repository.ts
git commit -m "feat(client-portal): add repository with all entity operations"
```

---

### Task 7: Service

**Files:**
- Create: `src/modules/client-portal/client-portal.service.ts`

- [ ] **Step 1: Create the service file**

```typescript
// src/modules/client-portal/client-portal.service.ts
import { randomUUID } from "node:crypto";
import { hash, compare } from "bcryptjs";
import { logger } from "@/shared/logger";
import { inngest } from "@/shared/inngest";
import { NotFoundError, BadRequestError, UnauthorizedError } from "@/shared/errors";
import type { Context, PortalContext } from "@/shared/trpc";
import { clientPortalRepository } from "./client-portal.repository";
import type { z } from "zod";
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
} from "./client-portal.schemas";
import type { ActivityItem, PortalDashboard } from "./client-portal.types";

const log = logger.child({ module: "client-portal.service" });

const MAGIC_LINK_EXPIRY_DAYS = 7;
const SESSION_EXPIRY_DAYS = 30;
const PROPOSAL_TOKEN_EXPIRY_DAYS = 30;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export const clientPortalService = {
  // ── Admin: Engagements ─────────────────────────────────────────────

  async listEngagements(ctx: Context, input: z.infer<typeof listEngagementsSchema>) {
    return clientPortalRepository.listEngagements(ctx.tenantId, {
      status: input.status,
      type: input.type,
      search: input.search,
      limit: input.limit,
      cursor: input.cursor,
    });
  },

  async getEngagement(ctx: Context, id: string) {
    const detail = await clientPortalRepository.getEngagementDetail(ctx.tenantId, id);
    if (!detail) throw new NotFoundError("Engagement", id);
    return detail;
  },

  async createEngagement(ctx: Context, input: z.infer<typeof createEngagementSchema>) {
    return clientPortalRepository.createEngagement(ctx.tenantId, {
      customerId: input.customerId,
      type: input.type,
      title: input.title,
      description: input.description,
      startDate: input.startDate,
    });
  },

  async updateEngagement(ctx: Context, input: z.infer<typeof updateEngagementSchema>) {
    return clientPortalRepository.updateEngagement(ctx.tenantId, input.id, {
      type: input.type,
      status: input.status,
      title: input.title,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
    });
  },

  // ── Admin: Proposals ───────────────────────────────────────────────

  async createProposal(ctx: Context, input: z.infer<typeof createProposalSchema>) {
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    const token = randomUUID();
    const tokenExpiresAt = addDays(new Date(), PROPOSAL_TOKEN_EXPIRY_DAYS);

    return clientPortalRepository.createProposal({
      engagementId: input.engagementId,
      scope: input.scope,
      deliverables: input.deliverables,
      price: input.price,
      paymentSchedule: input.paymentSchedule,
      terms: input.terms,
      token,
      tokenExpiresAt,
    });
  },

  async sendProposal(ctx: Context, input: z.infer<typeof sendProposalSchema>) {
    const proposal = await clientPortalRepository.findProposal(input.proposalId);
    if (!proposal) throw new NotFoundError("Proposal", input.proposalId);
    if (proposal.status !== "DRAFT") throw new BadRequestError("Proposal has already been sent");

    // Get engagement to find customer
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, proposal.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

    // Mark as sent
    const updated = await clientPortalRepository.updateProposal(proposal.id, {
      status: "SENT",
      sentAt: new Date(),
    });

    // Update engagement status
    await clientPortalRepository.updateEngagement(ctx.tenantId, engagement.id, {
      status: "PROPOSED",
    });

    // Emit event for email
    await inngest.send({
      name: "portal/proposal:sent",
      data: {
        proposalId: proposal.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: ctx.tenantId,
      },
    });

    log.info({ proposalId: proposal.id, engagementId: engagement.id }, "Proposal sent");
    return updated;
  },

  // ── Admin: Milestones ──────────────────────────────────────────────

  async createMilestone(ctx: Context, input: z.infer<typeof createMilestoneSchema>) {
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    // Auto-calculate sort order
    const existing = await clientPortalRepository.listMilestones(input.engagementId);
    const sortOrder = existing.length;

    return clientPortalRepository.createMilestone({
      engagementId: input.engagementId,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      sortOrder,
    });
  },

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

    return clientPortalRepository.updateMilestone(input.id, updates);
  },

  // ── Admin: Deliverables ────────────────────────────────────────────

  async createDeliverable(ctx: Context, input: z.infer<typeof createDeliverableSchema>) {
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    return clientPortalRepository.createDeliverable({
      engagementId: input.engagementId,
      milestoneId: input.milestoneId,
      title: input.title,
      description: input.description,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileSize: input.fileSize,
    });
  },

  async deliverDeliverable(ctx: Context, input: z.infer<typeof deliverDeliverableSchema>) {
    const deliverable = await clientPortalRepository.findDeliverable(input.id);
    if (!deliverable) throw new NotFoundError("Deliverable", input.id);

    // Verify tenant ownership via engagement
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, deliverable.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", deliverable.engagementId);

    const updated = await clientPortalRepository.updateDeliverable(input.id, {
      status: "DELIVERED",
      deliveredAt: new Date(),
    });

    await inngest.send({
      name: "portal/deliverable:shared",
      data: {
        deliverableId: deliverable.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: ctx.tenantId,
      },
    });

    log.info({ deliverableId: input.id }, "Deliverable marked as delivered");
    return updated;
  },

  // ── Admin: Approvals ───────────────────────────────────────────────

  async createApproval(ctx: Context, input: z.infer<typeof createApprovalSchema>) {
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    const approval = await clientPortalRepository.createApproval({
      engagementId: input.engagementId,
      deliverableId: input.deliverableId,
      milestoneId: input.milestoneId,
      title: input.title,
      description: input.description,
    });

    await inngest.send({
      name: "portal/approval:requested",
      data: {
        approvalId: approval.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: ctx.tenantId,
      },
    });

    log.info({ approvalId: approval.id }, "Approval request created");
    return approval;
  },

  // ── Admin: Invoices ────────────────────────────────────────────────

  async createInvoice(ctx: Context, input: z.infer<typeof createInvoiceSchema>) {
    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    const token = randomUUID();
    return clientPortalRepository.createInvoice({
      engagementId: input.engagementId,
      milestoneId: input.milestoneId,
      proposalPaymentIndex: input.proposalPaymentIndex,
      amount: input.amount,
      description: input.description,
      dueDate: input.dueDate,
      token,
    });
  },

  async sendInvoice(ctx: Context, input: z.infer<typeof sendInvoiceSchema>) {
    const invoice = await clientPortalRepository.findInvoice(input.invoiceId);
    if (!invoice) throw new NotFoundError("PortalInvoice", input.invoiceId);
    if (invoice.status !== "DRAFT") throw new BadRequestError("Invoice has already been sent");

    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, invoice.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", invoice.engagementId);

    const updated = await clientPortalRepository.updateInvoice(invoice.id, {
      status: "SENT",
      sentAt: new Date(),
    });

    await inngest.send({
      name: "portal/invoice:sent",
      data: {
        invoiceId: invoice.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: ctx.tenantId,
      },
    });

    log.info({ invoiceId: invoice.id }, "Invoice sent");
    return updated;
  },

  async markInvoicePaid(ctx: Context, input: z.infer<typeof markInvoicePaidSchema>) {
    const invoice = await clientPortalRepository.findInvoice(input.invoiceId);
    if (!invoice) throw new NotFoundError("PortalInvoice", input.invoiceId);

    const engagement = await clientPortalRepository.findEngagement(ctx.tenantId, invoice.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", invoice.engagementId);

    const updated = await clientPortalRepository.updateInvoice(invoice.id, {
      status: "PAID",
      paidAt: new Date(),
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference ?? null,
    });

    await inngest.send({
      name: "portal/invoice:paid",
      data: {
        invoiceId: invoice.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: ctx.tenantId,
      },
    });

    log.info({ invoiceId: invoice.id }, "Invoice marked as paid");
    return updated;
  },

  // ── Portal: Proposals ──────────────────────────────────────────────

  async getProposalByToken(token: string) {
    const proposal = await clientPortalRepository.findProposalByToken(token);
    if (!proposal) throw new NotFoundError("Proposal", token);
    if (proposal.tokenExpiresAt < new Date()) throw new BadRequestError("Proposal link has expired");
    if (proposal.status !== "SENT") throw new BadRequestError("Proposal is no longer available");
    return proposal;
  },

  async approveProposal(portalCtx: PortalContext, input: z.infer<typeof approveProposalSchema>) {
    const proposal = await clientPortalRepository.findProposal(input.proposalId);
    if (!proposal) throw new NotFoundError("Proposal", input.proposalId);
    if (proposal.status !== "SENT") throw new BadRequestError("Proposal cannot be approved");

    // Update proposal
    const updated = await clientPortalRepository.updateProposal(proposal.id, {
      status: "APPROVED",
      approvedAt: new Date(),
    });

    // Activate engagement
    // Need to find engagement tenant to update
    const engagement = await clientPortalRepository.findEngagementByCustomer(
      portalCtx.portalCustomerId,
      proposal.engagementId,
    );
    if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

    await clientPortalRepository.updateEngagement(engagement.tenantId, engagement.id, {
      status: "ACTIVE",
      startDate: new Date(),
    });

    await inngest.send({
      name: "portal/proposal:approved",
      data: {
        proposalId: proposal.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: engagement.tenantId,
      },
    });

    log.info({ proposalId: proposal.id }, "Proposal approved by client");
    return updated;
  },

  async declineProposal(portalCtx: PortalContext, input: z.infer<typeof declineProposalSchema>) {
    const proposal = await clientPortalRepository.findProposal(input.proposalId);
    if (!proposal) throw new NotFoundError("Proposal", input.proposalId);
    if (proposal.status !== "SENT") throw new BadRequestError("Proposal cannot be declined");

    const updated = await clientPortalRepository.updateProposal(proposal.id, {
      status: "DECLINED",
      declinedAt: new Date(),
    });

    const engagement = await clientPortalRepository.findEngagementByCustomer(
      portalCtx.portalCustomerId,
      proposal.engagementId,
    );
    if (!engagement) throw new NotFoundError("Engagement", proposal.engagementId);

    await inngest.send({
      name: "portal/proposal:declined",
      data: {
        proposalId: proposal.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: engagement.tenantId,
        feedback: input.feedback ?? null,
      },
    });

    log.info({ proposalId: proposal.id }, "Proposal declined by client");
    return updated;
  },

  // ── Portal: Dashboard ──────────────────────────────────────────────

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

    // Build activity feed from all entities
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

    // Sort by timestamp descending
    activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      engagement,
      pendingApprovals,
      pendingInvoices,
      milestones,
      activity,
    };
  },

  // ── Portal: Entity lists ───────────────────────────────────────────

  async listClientDeliverables(portalCtx: PortalContext, input: z.infer<typeof listByEngagementSchema>) {
    const engagement = await clientPortalRepository.findEngagementByCustomer(portalCtx.portalCustomerId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);
    return clientPortalRepository.listDeliverables(engagement.id);
  },

  async acceptDeliverable(portalCtx: PortalContext, input: z.infer<typeof acceptDeliverableSchema>) {
    const deliverable = await clientPortalRepository.findDeliverable(input.deliverableId);
    if (!deliverable) throw new NotFoundError("Deliverable", input.deliverableId);
    if (deliverable.status !== "DELIVERED") throw new BadRequestError("Deliverable is not ready for acceptance");

    // Verify ownership
    const engagement = await clientPortalRepository.findEngagementByCustomer(portalCtx.portalCustomerId, deliverable.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", deliverable.engagementId);

    return clientPortalRepository.updateDeliverable(input.deliverableId, {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    });
  },

  async listClientInvoices(portalCtx: PortalContext, input: z.infer<typeof listByEngagementSchema>) {
    const engagement = await clientPortalRepository.findEngagementByCustomer(portalCtx.portalCustomerId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);
    return clientPortalRepository.listInvoices(engagement.id);
  },

  async listClientApprovals(portalCtx: PortalContext, input: z.infer<typeof listByEngagementSchema>) {
    const engagement = await clientPortalRepository.findEngagementByCustomer(portalCtx.portalCustomerId, input.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);
    return clientPortalRepository.listApprovals(engagement.id);
  },

  async respondToApproval(portalCtx: PortalContext, input: z.infer<typeof respondToApprovalSchema>) {
    const approval = await clientPortalRepository.findApproval(input.approvalId);
    if (!approval) throw new NotFoundError("ApprovalRequest", input.approvalId);
    if (approval.status !== "PENDING") throw new BadRequestError("Approval has already been responded to");

    const engagement = await clientPortalRepository.findEngagementByCustomer(portalCtx.portalCustomerId, approval.engagementId);
    if (!engagement) throw new NotFoundError("Engagement", approval.engagementId);

    const updated = await clientPortalRepository.updateApproval(input.approvalId, {
      status: input.approved ? "APPROVED" : "REJECTED",
      clientComment: input.comment ?? null,
      respondedAt: new Date(),
    });

    await inngest.send({
      name: "portal/approval:responded",
      data: {
        approvalId: approval.id,
        engagementId: engagement.id,
        customerId: engagement.customerId,
        tenantId: engagement.tenantId,
        approved: input.approved,
      },
    });

    return updated;
  },

  // ── Portal: Auth ───────────────────────────────────────────────────

  async createMagicLinkSession(customerId: string): Promise<{ token: string; sessionToken: string }> {
    const token = randomUUID();
    const sessionToken = randomUUID();
    const now = new Date();

    await clientPortalRepository.createSession({
      customerId,
      token,
      tokenExpiresAt: addDays(now, MAGIC_LINK_EXPIRY_DAYS),
      sessionToken,
      sessionExpiresAt: addDays(now, SESSION_EXPIRY_DAYS),
    });

    return { token, sessionToken };
  },

  async validateMagicLink(token: string): Promise<{ customerId: string; sessionToken: string }> {
    const session = await clientPortalRepository.findSessionByToken(token);
    if (!session) throw new UnauthorizedError("Invalid magic link");
    if (session.tokenExpiresAt < new Date()) throw new UnauthorizedError("Magic link has expired");
    if (!session.sessionToken) throw new UnauthorizedError("Session not initialized");
    return { customerId: session.customerId, sessionToken: session.sessionToken };
  },

  async setPassword(portalCtx: PortalContext, input: z.infer<typeof setPasswordSchema>): Promise<void> {
    const passwordHash = await hash(input.password, 12);
    await clientPortalRepository.upsertCredential(portalCtx.portalCustomerId, passwordHash);
    log.info({ customerId: portalCtx.portalCustomerId }, "Portal password set");
  },

  async login(input: z.infer<typeof portalLoginSchema>): Promise<{ sessionToken: string }> {
    const customer = await clientPortalRepository.findCustomerByEmail(input.email);
    if (!customer) throw new UnauthorizedError("Invalid email or password");

    const credential = await clientPortalRepository.findCredentialByCustomerId(customer.id);
    if (!credential) throw new UnauthorizedError("Invalid email or password");

    const valid = await compare(input.password, credential.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    const { sessionToken } = await this.createMagicLinkSession(customer.id);
    return { sessionToken };
  },

  async requestMagicLink(input: z.infer<typeof requestMagicLinkSchema>): Promise<void> {
    const customer = await clientPortalRepository.findCustomerByEmail(input.email);
    if (!customer) {
      // Silent fail - don't reveal whether email exists
      log.info({ email: input.email }, "Magic link requested for unknown email");
      return;
    }
    const { token } = await this.createMagicLinkSession(customer.id);
    // TODO: Send magic link email via notification module
    log.info({ customerId: customer.id }, "Magic link created");
  },
};
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors (you may need to `npm install bcryptjs @types/bcryptjs` if not already installed)

- [ ] **Step 3: Commit**

```bash
git add src/modules/client-portal/client-portal.service.ts
git commit -m "feat(client-portal): add service with business logic for all entities and portal auth"
```

---

### Task 8: Router

**Files:**
- Create: `src/modules/client-portal/client-portal.router.ts`

- [ ] **Step 1: Create the router file**

```typescript
// src/modules/client-portal/client-portal.router.ts
import { z } from "zod";
import {
  router,
  publicProcedure,
  tenantProcedure,
  permissionProcedure,
  portalProcedure,
} from "@/shared/trpc";
import { clientPortalService } from "./client-portal.service";
import {
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
  getProposalByTokenSchema,
  approveProposalSchema,
  declineProposalSchema,
  getDashboardSchema,
  listByEngagementSchema,
  acceptDeliverableSchema,
  respondToApprovalSchema,
  setPasswordSchema,
  portalLoginSchema,
  requestMagicLinkSchema,
} from "./client-portal.schemas";
import type { PortalContext } from "@/shared/trpc";

// ── Admin procedures ─────────────────────────────────────────────────────

const adminRouter = router({
  // Engagements
  listEngagements: tenantProcedure
    .input(listEngagementsSchema)
    .query(({ ctx, input }) => clientPortalService.listEngagements(ctx, input)),

  getEngagement: tenantProcedure
    .input(z.object({ id: z.uuid() }))
    .query(({ ctx, input }) => clientPortalService.getEngagement(ctx, input.id)),

  createEngagement: permissionProcedure("engagement:create")
    .input(createEngagementSchema)
    .mutation(({ ctx, input }) => clientPortalService.createEngagement(ctx, input)),

  updateEngagement: permissionProcedure("engagement:update")
    .input(updateEngagementSchema)
    .mutation(({ ctx, input }) => clientPortalService.updateEngagement(ctx, input)),

  // Proposals
  createProposal: permissionProcedure("proposal:create")
    .input(createProposalSchema)
    .mutation(({ ctx, input }) => clientPortalService.createProposal(ctx, input)),

  sendProposal: permissionProcedure("proposal:send")
    .input(sendProposalSchema)
    .mutation(({ ctx, input }) => clientPortalService.sendProposal(ctx, input)),

  // Milestones
  createMilestone: permissionProcedure("milestone:create")
    .input(createMilestoneSchema)
    .mutation(({ ctx, input }) => clientPortalService.createMilestone(ctx, input)),

  updateMilestone: permissionProcedure("milestone:update")
    .input(updateMilestoneSchema)
    .mutation(({ ctx, input }) => clientPortalService.updateMilestone(ctx, input)),

  // Deliverables
  createDeliverable: permissionProcedure("deliverable:create")
    .input(createDeliverableSchema)
    .mutation(({ ctx, input }) => clientPortalService.createDeliverable(ctx, input)),

  deliverDeliverable: permissionProcedure("deliverable:update")
    .input(deliverDeliverableSchema)
    .mutation(({ ctx, input }) => clientPortalService.deliverDeliverable(ctx, input)),

  // Approvals
  createApproval: permissionProcedure("approval:create")
    .input(createApprovalSchema)
    .mutation(({ ctx, input }) => clientPortalService.createApproval(ctx, input)),

  // Invoices
  createInvoice: permissionProcedure("invoice:create")
    .input(createInvoiceSchema)
    .mutation(({ ctx, input }) => clientPortalService.createInvoice(ctx, input)),

  sendInvoice: permissionProcedure("invoice:send")
    .input(sendInvoiceSchema)
    .mutation(({ ctx, input }) => clientPortalService.sendInvoice(ctx, input)),

  markInvoicePaid: permissionProcedure("invoice:update")
    .input(markInvoicePaidSchema)
    .mutation(({ ctx, input }) => clientPortalService.markInvoicePaid(ctx, input)),
});

// ── Portal procedures (client-facing) ────────────────────────────────────

const portalRouter = router({
  // Public (no session needed - uses proposal token)
  getProposal: publicProcedure
    .input(getProposalByTokenSchema)
    .query(({ input }) => clientPortalService.getProposalByToken(input.token)),

  // Public auth endpoints
  login: publicProcedure
    .input(portalLoginSchema)
    .mutation(({ input }) => clientPortalService.login(input)),

  requestMagicLink: publicProcedure
    .input(requestMagicLinkSchema)
    .mutation(({ input }) => clientPortalService.requestMagicLink(input)),

  // Session-gated
  approveProposal: portalProcedure
    .input(approveProposalSchema)
    .mutation(({ ctx, input }) =>
      clientPortalService.approveProposal(ctx as PortalContext, input)),

  declineProposal: portalProcedure
    .input(declineProposalSchema)
    .mutation(({ ctx, input }) =>
      clientPortalService.declineProposal(ctx as PortalContext, input)),

  getDashboard: portalProcedure
    .input(getDashboardSchema)
    .query(({ ctx, input }) =>
      clientPortalService.getDashboard(ctx as PortalContext, input)),

  listDeliverables: portalProcedure
    .input(listByEngagementSchema)
    .query(({ ctx, input }) =>
      clientPortalService.listClientDeliverables(ctx as PortalContext, input)),

  acceptDeliverable: portalProcedure
    .input(acceptDeliverableSchema)
    .mutation(({ ctx, input }) =>
      clientPortalService.acceptDeliverable(ctx as PortalContext, input)),

  listInvoices: portalProcedure
    .input(listByEngagementSchema)
    .query(({ ctx, input }) =>
      clientPortalService.listClientInvoices(ctx as PortalContext, input)),

  listApprovals: portalProcedure
    .input(listByEngagementSchema)
    .query(({ ctx, input }) =>
      clientPortalService.listClientApprovals(ctx as PortalContext, input)),

  respondToApproval: portalProcedure
    .input(respondToApprovalSchema)
    .mutation(({ ctx, input }) =>
      clientPortalService.respondToApproval(ctx as PortalContext, input)),

  setPassword: portalProcedure
    .input(setPasswordSchema)
    .mutation(({ ctx, input }) =>
      clientPortalService.setPassword(ctx as PortalContext, input)),
});

// ── Combined router ──────────────────────────────────────────────────────

export const clientPortalRouter = router({
  admin: adminRouter,
  portal: portalRouter,
});

export type ClientPortalRouter = typeof clientPortalRouter;
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/client-portal/client-portal.router.ts
git commit -m "feat(client-portal): add tRPC router with admin and portal procedures"
```

---

### Task 9: Inngest Event Handlers

**Files:**
- Create: `src/modules/client-portal/client-portal.events.ts`

- [ ] **Step 1: Create the events file**

```typescript
// src/modules/client-portal/client-portal.events.ts
import { inngest } from "@/shared/inngest";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "client-portal.events" });

const onProposalSent = inngest.createFunction(
  { id: "portal-proposal-sent", retries: 3 },
  { event: "portal/proposal:sent" },
  async ({ event, step }) => {
    const { proposalId, customerId, tenantId } = event.data;
    log.info({ proposalId, customerId, tenantId }, "Handling proposal sent - send email to client");
    // TODO: Send proposal email with magic link via notification module
  }
);

const onProposalApproved = inngest.createFunction(
  { id: "portal-proposal-approved", retries: 3 },
  { event: "portal/proposal:approved" },
  async ({ event, step }) => {
    const { proposalId, customerId, tenantId } = event.data;
    log.info({ proposalId, customerId, tenantId }, "Handling proposal approved - notify admin, send confirmation");
    // TODO: Send confirmation email to client + notify Luke
  }
);

const onProposalDeclined = inngest.createFunction(
  { id: "portal-proposal-declined", retries: 3 },
  { event: "portal/proposal:declined" },
  async ({ event, step }) => {
    const { proposalId, tenantId, feedback } = event.data;
    log.info({ proposalId, tenantId, feedback }, "Handling proposal declined - notify admin");
    // TODO: Notify Luke with optional feedback
  }
);

const onDeliverableShared = inngest.createFunction(
  { id: "portal-deliverable-shared", retries: 3 },
  { event: "portal/deliverable:shared" },
  async ({ event, step }) => {
    const { deliverableId, customerId, tenantId } = event.data;
    log.info({ deliverableId, customerId, tenantId }, "Handling deliverable shared - email client");
    // TODO: Send deliverable notification email with portal link
  }
);

const onApprovalRequested = inngest.createFunction(
  { id: "portal-approval-requested", retries: 3 },
  { event: "portal/approval:requested" },
  async ({ event, step }) => {
    const { approvalId, customerId, tenantId } = event.data;
    log.info({ approvalId, customerId, tenantId }, "Handling approval requested - email client");
    // TODO: Send approval request email with approve/reject links
  }
);

const onApprovalResponded = inngest.createFunction(
  { id: "portal-approval-responded", retries: 3 },
  { event: "portal/approval:responded" },
  async ({ event, step }) => {
    const { approvalId, tenantId, approved } = event.data;
    log.info({ approvalId, tenantId, approved }, "Handling approval response - notify admin");
    // TODO: Notify Luke of client response
  }
);

const onInvoiceSent = inngest.createFunction(
  { id: "portal-invoice-sent", retries: 3 },
  { event: "portal/invoice:sent" },
  async ({ event, step }) => {
    const { invoiceId, customerId, tenantId } = event.data;
    log.info({ invoiceId, customerId, tenantId }, "Handling invoice sent - email client");
    // TODO: Send invoice email with pay link
  }
);

const onInvoicePaid = inngest.createFunction(
  { id: "portal-invoice-paid", retries: 3 },
  { event: "portal/invoice:paid" },
  async ({ event, step }) => {
    const { invoiceId, tenantId } = event.data;
    log.info({ invoiceId, tenantId }, "Handling invoice paid - notify admin");
    // TODO: Notify Luke of payment
  }
);

const onInvoiceOverdue = inngest.createFunction(
  { id: "portal-invoice-overdue", retries: 3 },
  { event: "portal/invoice:overdue" },
  async ({ event, step }) => {
    const { invoiceId, customerId, tenantId } = event.data;
    log.info({ invoiceId, customerId, tenantId }, "Handling invoice overdue - send reminder");
    // TODO: Send overdue reminder email to client
  }
);

/** All client-portal Inngest functions - register in src/app/api/inngest/route.ts */
export const clientPortalFunctions = [
  onProposalSent,
  onProposalApproved,
  onProposalDeclined,
  onDeliverableShared,
  onApprovalRequested,
  onApprovalResponded,
  onInvoiceSent,
  onInvoicePaid,
  onInvoiceOverdue,
];
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/client-portal/client-portal.events.ts
git commit -m "feat(client-portal): add Inngest event handlers for all portal events"
```

---

### Task 10: Index + Wiring

**Files:**
- Create: `src/modules/client-portal/index.ts`
- Modify: `src/server/root.ts`
- Modify: `src/app/api/inngest/route.ts`

- [ ] **Step 1: Create the barrel export**

```typescript
// src/modules/client-portal/index.ts
export { clientPortalRouter } from "./client-portal.router";
export { clientPortalFunctions } from "./client-portal.events";
export { clientPortalService } from "./client-portal.service";
export type {
  EngagementRecord,
  ProposalRecord,
  MilestoneRecord,
  DeliverableRecord,
  ApprovalRequestRecord,
  PortalInvoiceRecord,
  PortalSessionRecord,
  ActivityItem,
  PortalDashboard,
} from "./client-portal.types";
```

- [ ] **Step 2: Wire the router into root.ts**

Read `src/server/root.ts` and add:

```typescript
import { clientPortalRouter } from "@/modules/client-portal";
```

Then add to the `appRouter` object:

```typescript
clientPortal: clientPortalRouter,
```

- [ ] **Step 3: Register Inngest functions**

Read `src/app/api/inngest/route.ts` and add:

```typescript
import { clientPortalFunctions } from "@/modules/client-portal";
```

Then add `...clientPortalFunctions` to the `serve()` functions array.

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/modules/client-portal/index.ts src/server/root.ts src/app/api/inngest/route.ts
git commit -m "feat(client-portal): wire module into root router and Inngest"
```

---

### Task 11: Tests

**Files:**
- Create: `src/modules/client-portal/__tests__/client-portal.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// src/modules/client-portal/__tests__/client-portal.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks FIRST ──────────────────────────────────────────────────────────

vi.mock("../client-portal.repository", () => ({
  clientPortalRepository: {
    findEngagement: vi.fn(),
    findEngagementByCustomer: vi.fn(),
    listEngagements: vi.fn(),
    createEngagement: vi.fn(),
    updateEngagement: vi.fn(),
    getEngagementDetail: vi.fn(),
    findProposal: vi.fn(),
    findProposalByToken: vi.fn(),
    listProposalsByEngagement: vi.fn(),
    createProposal: vi.fn(),
    updateProposal: vi.fn(),
    listMilestones: vi.fn(),
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    findDeliverable: vi.fn(),
    listDeliverables: vi.fn(),
    createDeliverable: vi.fn(),
    updateDeliverable: vi.fn(),
    findApproval: vi.fn(),
    listApprovals: vi.fn(),
    createApproval: vi.fn(),
    updateApproval: vi.fn(),
    findInvoice: vi.fn(),
    listInvoices: vi.fn(),
    createInvoice: vi.fn(),
    updateInvoice: vi.fn(),
    createSession: vi.fn(),
    findSessionByToken: vi.fn(),
    findSessionBySessionToken: vi.fn(),
    findCredentialByCustomerId: vi.fn(),
    upsertCredential: vi.fn(),
    findCustomerByEmail: vi.fn(),
  },
}));

vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn() },
}));

vi.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn(async () => "$2a$12$hashedpassword"),
  compare: vi.fn(async () => true),
}));

// ── Imports AFTER mocks ──────────────────────────────────────────────────

import { clientPortalService } from "../client-portal.service";
import { clientPortalRepository } from "../client-portal.repository";
import { inngest } from "@/shared/inngest";
import { NotFoundError, BadRequestError, UnauthorizedError } from "@/shared/errors";

// ── Helpers ──────────────────────────────────────────────────────────────

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const CUSTOMER_ID = "00000000-0000-0000-0000-000000000002";
const ENGAGEMENT_ID = "00000000-0000-0000-0000-000000000003";
const PROPOSAL_ID = "00000000-0000-0000-0000-000000000004";

function makeCtx(tenantId = TENANT_ID) {
  return {
    tenantId,
    user: { id: "user-1", tenantId },
    db: {},
    session: null,
    requestId: "req-1",
    req: {} as unknown,
    tenantSlug: "test-tenant",
  } as unknown as import("@/shared/trpc").Context;
}

function makePortalCtx(customerId = CUSTOMER_ID) {
  return {
    ...makeCtx(),
    portalCustomerId: customerId,
  } as unknown as import("@/shared/trpc").PortalContext;
}

function makeEngagement(overrides = {}) {
  return {
    id: ENGAGEMENT_ID,
    tenantId: TENANT_ID,
    customerId: CUSTOMER_ID,
    type: "PROJECT" as const,
    status: "ACTIVE" as const,
    title: "AI Chatbot",
    description: null,
    startDate: new Date(),
    endDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeProposal(overrides = {}) {
  return {
    id: PROPOSAL_ID,
    engagementId: ENGAGEMENT_ID,
    status: "SENT" as const,
    scope: "Build a chatbot",
    deliverables: [{ title: "Chatbot", description: "AI chatbot" }],
    price: 480000,
    paymentSchedule: [{ label: "Deposit", amount: 240000, dueType: "ON_APPROVAL" as const }],
    terms: "Standard terms",
    token: "test-token",
    tokenExpiresAt: new Date(Date.now() + 86400000 * 30),
    sentAt: new Date(),
    approvedAt: null,
    declinedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("clientPortalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Engagements ────────────────────────────────────────────────────

  describe("createEngagement", () => {
    it("should create an engagement", async () => {
      const expected = makeEngagement({ status: "DRAFT" });
      vi.mocked(clientPortalRepository.createEngagement).mockResolvedValue(expected);

      const result = await clientPortalService.createEngagement(makeCtx(), {
        customerId: CUSTOMER_ID,
        type: "PROJECT",
        title: "AI Chatbot",
      });

      expect(result).toEqual(expected);
      expect(clientPortalRepository.createEngagement).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ customerId: CUSTOMER_ID, title: "AI Chatbot" })
      );
    });
  });

  describe("getEngagement", () => {
    it("should return engagement detail", async () => {
      const detail = {
        ...makeEngagement(),
        proposals: [],
        milestones: [],
        deliverables: [],
        approvals: [],
        invoices: [],
      };
      vi.mocked(clientPortalRepository.getEngagementDetail).mockResolvedValue(detail);

      const result = await clientPortalService.getEngagement(makeCtx(), ENGAGEMENT_ID);
      expect(result.id).toBe(ENGAGEMENT_ID);
    });

    it("should throw NotFoundError for missing engagement", async () => {
      vi.mocked(clientPortalRepository.getEngagementDetail).mockResolvedValue(null);

      await expect(
        clientPortalService.getEngagement(makeCtx(), "missing-id")
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ── Proposals ──────────────────────────────────────────────────────

  describe("sendProposal", () => {
    it("should send a draft proposal and emit event", async () => {
      const proposal = makeProposal({ status: "DRAFT" });
      const engagement = makeEngagement();
      vi.mocked(clientPortalRepository.findProposal).mockResolvedValue(proposal);
      vi.mocked(clientPortalRepository.findEngagement).mockResolvedValue(engagement);
      vi.mocked(clientPortalRepository.updateProposal).mockResolvedValue({
        ...proposal,
        status: "SENT",
        sentAt: new Date(),
      });
      vi.mocked(clientPortalRepository.updateEngagement).mockResolvedValue({
        ...engagement,
        status: "PROPOSED",
      });

      await clientPortalService.sendProposal(makeCtx(), { proposalId: PROPOSAL_ID });

      expect(clientPortalRepository.updateProposal).toHaveBeenCalledWith(
        PROPOSAL_ID,
        expect.objectContaining({ status: "SENT" })
      );
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({ name: "portal/proposal:sent" })
      );
    });

    it("should reject sending an already-sent proposal", async () => {
      vi.mocked(clientPortalRepository.findProposal).mockResolvedValue(
        makeProposal({ status: "SENT" })
      );

      await expect(
        clientPortalService.sendProposal(makeCtx(), { proposalId: PROPOSAL_ID })
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ── Portal: Approve Proposal ───────────────────────────────────────

  describe("approveProposal", () => {
    it("should approve a sent proposal and activate engagement", async () => {
      const proposal = makeProposal({ status: "SENT" });
      const engagement = makeEngagement({ status: "PROPOSED" });
      vi.mocked(clientPortalRepository.findProposal).mockResolvedValue(proposal);
      vi.mocked(clientPortalRepository.updateProposal).mockResolvedValue({
        ...proposal,
        status: "APPROVED",
        approvedAt: new Date(),
      });
      vi.mocked(clientPortalRepository.findEngagementByCustomer).mockResolvedValue(engagement);
      vi.mocked(clientPortalRepository.updateEngagement).mockResolvedValue({
        ...engagement,
        status: "ACTIVE",
      });

      const result = await clientPortalService.approveProposal(makePortalCtx(), {
        proposalId: PROPOSAL_ID,
      });

      expect(result.status).toBe("APPROVED");
      expect(clientPortalRepository.updateEngagement).toHaveBeenCalledWith(
        TENANT_ID,
        ENGAGEMENT_ID,
        expect.objectContaining({ status: "ACTIVE" })
      );
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({ name: "portal/proposal:approved" })
      );
    });
  });

  // ── Portal: Auth ───────────────────────────────────────────────────

  describe("validateMagicLink", () => {
    it("should validate a valid magic link", async () => {
      vi.mocked(clientPortalRepository.findSessionByToken).mockResolvedValue({
        id: "session-1",
        customerId: CUSTOMER_ID,
        token: "valid-token",
        tokenExpiresAt: new Date(Date.now() + 86400000),
        sessionToken: "session-token",
        sessionExpiresAt: new Date(Date.now() + 86400000 * 30),
        lastAccessedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await clientPortalService.validateMagicLink("valid-token");
      expect(result.customerId).toBe(CUSTOMER_ID);
      expect(result.sessionToken).toBe("session-token");
    });

    it("should reject an expired magic link", async () => {
      vi.mocked(clientPortalRepository.findSessionByToken).mockResolvedValue({
        id: "session-1",
        customerId: CUSTOMER_ID,
        token: "expired-token",
        tokenExpiresAt: new Date(Date.now() - 86400000),
        sessionToken: "session-token",
        sessionExpiresAt: new Date(Date.now() + 86400000 * 30),
        lastAccessedAt: new Date(),
        createdAt: new Date(),
      });

      await expect(
        clientPortalService.validateMagicLink("expired-token")
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("login", () => {
    it("should login with valid credentials", async () => {
      vi.mocked(clientPortalRepository.findCustomerByEmail).mockResolvedValue({
        id: CUSTOMER_ID,
        tenantId: TENANT_ID,
      });
      vi.mocked(clientPortalRepository.findCredentialByCustomerId).mockResolvedValue({
        passwordHash: "$2a$12$hashedpassword",
      });
      vi.mocked(clientPortalRepository.createSession).mockResolvedValue({
        id: "session-1",
        customerId: CUSTOMER_ID,
        token: "new-token",
        tokenExpiresAt: new Date(),
        sessionToken: "new-session",
        sessionExpiresAt: new Date(),
        lastAccessedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await clientPortalService.login({
        email: "sarah@bathpodiatry.co.uk",
        password: "securepassword",
      });

      expect(result.sessionToken).toBeDefined();
    });

    it("should reject login with unknown email", async () => {
      vi.mocked(clientPortalRepository.findCustomerByEmail).mockResolvedValue(null);

      await expect(
        clientPortalService.login({ email: "unknown@example.com", password: "pass" })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  // ── Portal: Deliverables ───────────────────────────────────────────

  describe("acceptDeliverable", () => {
    it("should accept a delivered deliverable", async () => {
      const deliverable = {
        id: "del-1",
        engagementId: ENGAGEMENT_ID,
        milestoneId: null,
        title: "Brand Audit",
        description: null,
        status: "DELIVERED" as const,
        fileUrl: null,
        fileName: null,
        fileSize: null,
        deliveredAt: new Date(),
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(clientPortalRepository.findDeliverable).mockResolvedValue(deliverable);
      vi.mocked(clientPortalRepository.findEngagementByCustomer).mockResolvedValue(makeEngagement());
      vi.mocked(clientPortalRepository.updateDeliverable).mockResolvedValue({
        ...deliverable,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      });

      const result = await clientPortalService.acceptDeliverable(makePortalCtx(), {
        deliverableId: "del-1",
      });

      expect(result.status).toBe("ACCEPTED");
    });

    it("should reject accepting a non-delivered deliverable", async () => {
      vi.mocked(clientPortalRepository.findDeliverable).mockResolvedValue({
        id: "del-1",
        engagementId: ENGAGEMENT_ID,
        milestoneId: null,
        title: "Brand Audit",
        description: null,
        status: "PENDING" as const,
        fileUrl: null,
        fileName: null,
        fileSize: null,
        deliveredAt: null,
        acceptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        clientPortalService.acceptDeliverable(makePortalCtx(), { deliverableId: "del-1" })
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ── Portal: Approval Response ──────────────────────────────────────

  describe("respondToApproval", () => {
    it("should approve a pending approval and emit event", async () => {
      const approval = {
        id: "apr-1",
        engagementId: ENGAGEMENT_ID,
        deliverableId: null,
        milestoneId: null,
        title: "Logo Concepts",
        description: "Review the 3 options",
        status: "PENDING" as const,
        clientComment: null,
        respondedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(clientPortalRepository.findApproval).mockResolvedValue(approval);
      vi.mocked(clientPortalRepository.findEngagementByCustomer).mockResolvedValue(makeEngagement());
      vi.mocked(clientPortalRepository.updateApproval).mockResolvedValue({
        ...approval,
        status: "APPROVED",
        respondedAt: new Date(),
      });

      const result = await clientPortalService.respondToApproval(makePortalCtx(), {
        approvalId: "apr-1",
        approved: true,
        comment: "Looks great",
      });

      expect(result.status).toBe("APPROVED");
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "portal/approval:responded",
          data: expect.objectContaining({ approved: true }),
        })
      );
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run src/modules/client-portal/__tests__/client-portal.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/modules/client-portal/__tests__/client-portal.test.ts
git commit -m "test(client-portal): add service tests for engagements, proposals, auth, deliverables, approvals"
```

---

### Task 12: Verification

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (224+ existing + new client-portal tests)

- [ ] **Step 3: Run build**

Run: `npx next build`
Expected: Build succeeds

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(client-portal): address build/type/test issues from verification"
```
