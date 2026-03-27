import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const products = pgTable("products", {
  id: uuid().primaryKey().notNull(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  tagline: text().notNull(),
  description: text().notNull().default(""),
  logoUrl: text(),
  domain: text(),
  moduleSlugs: text().array().notNull().default(sql`'{}'::text[]`),
  isPublished: boolean().notNull().default(false),
  createdAt: timestamp({ precision: 3, mode: "date" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp({ precision: 3, mode: "date" }).notNull(),
});

export const productPlans = pgTable("product_plans", {
  id: uuid().primaryKey().notNull(),
  productId: uuid()
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  slug: text().notNull(),
  name: text().notNull(),
  priceMonthly: integer().notNull(),
  priceYearly: integer(),
  trialDays: integer().notNull().default(14),
  stripePriceId: text().notNull(),
  features: jsonb().$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  isDefault: boolean().notNull().default(true),
  createdAt: timestamp({ precision: 3, mode: "date" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});
