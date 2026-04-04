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
