import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { engagements } from "./client-portal.schema";

// ── engagement_org_chart ─────────────────────────────────────────────────────
// Tree nodes per engagement. Nodes can be DEPARTMENT, ROLE, or PERSON.
// parentId is nullable — null means root node.
// version + lastEditedBy support optimistic concurrency for two-way
// consultant/client collaboration (D-06).

export const engagementOrgChart = pgTable(
  "engagement_org_chart",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenantId").notNull(),
    engagementId: uuid("engagementId")
      .notNull()
      .references(() => engagements.id, { onDelete: "cascade" }),
    parentId: uuid("parentId"), // self-ref nullable; null = root

    label: text("label").notNull(),
    type: text("type", { enum: ["DEPARTMENT", "ROLE", "PERSON"] }).notNull(),

    headcount: integer("headcount"),
    contactUserId: uuid("contactUserId"),
    contactEmail: text("contactEmail"),
    contactName: text("contactName"),
    contactRole: text("contactRole"),

    interviewMode: text("interviewMode", {
      enum: ["ALL", "SAMPLE", "OWNER_ONLY", "SKIP"],
    })
      .notNull()
      .default("OWNER_ONLY"),
    sampleSize: integer("sampleSize"),
    templateSlugOverride: text("templateSlugOverride"),

    sortOrder: integer("sortOrder").notNull().default(0),
    version: integer("version").notNull().default(1),
    lastEditedBy: text("lastEditedBy", {
      enum: ["CONSULTANT", "CLIENT"],
    }).notNull(),
    lastEditedAt: timestamp("lastEditedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Set when a form invitation has been dispatched for this node (0.2.B).
    // Points to the completed_forms row on the Ironheart tenant.
    // Nullable — null means no form has been sent yet.
    formSendId: uuid("formSendId"),

    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    byEngagement: index("idx_org_chart_engagement").on(t.engagementId),
    byParent: index("idx_org_chart_parent").on(t.parentId),
    byTenant: index("idx_org_chart_tenant").on(t.tenantId),
    byFormSend: index("idx_org_chart_form_send").on(t.formSendId),
  })
);

// ── engagement_org_chart_activity ────────────────────────────────────────────
// Append-only activity log for org chart changes — local to chart for 0.1,
// not unified with client-portal activity yet (D-08).

export const engagementOrgChartActivity = pgTable(
  "engagement_org_chart_activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    engagementId: uuid("engagementId").notNull(),
    nodeId: uuid("nodeId"),
    actorType: text("actorType", {
      enum: ["CONSULTANT", "CLIENT", "SYSTEM"],
    }).notNull(),
    // text (not uuid) — actor can be a WorkOS user id (`user_01K…` format) or null for SYSTEM actors
    actorId: text("actorId"),
    actorName: text("actorName").notNull(),
    action: text("action").notNull(),
    fromValue: jsonb("fromValue"),
    toValue: jsonb("toValue"),
    message: text("message").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    byEngagement: index("idx_org_chart_activity_engagement").on(
      t.engagementId,
      t.createdAt.desc()
    ),
  })
);
