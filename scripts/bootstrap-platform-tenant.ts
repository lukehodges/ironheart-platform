/**
 * Bootstrap Ironheart Platform Tenant
 *
 * Creates the root "ironheart" tenant used by the platform admin (Luke) to provision client tenants.
 * Idempotent: skips if tenant with slug "ironheart" already exists.
 *
 * Usage: npm run db:bootstrap-platform
 *
 * Output: Prints the tenant UUID on stdout for pasting into .env.local as IRONHEART_TENANT_ID
 *
 * Note: This is distinct from the "platform" tenant (which hosts platform-layer admin users).
 * The "ironheart" tenant is the business tenant for The Ironheart Ltd operations.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/shared/db/schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

function uuid(): string {
  return crypto.randomUUID();
}

async function bootstrapIronheartTenant(): Promise<void> {
  console.log("📦 Bootstrapping Ironheart platform tenant...");

  // Check if already exists
  const existing = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, "ironheart"))
    .limit(1);

  if (existing[0]) {
    console.log(`✓ Ironheart tenant already exists (${existing[0].id})`);
    console.log(`\nCopy this into .env.local:`);
    console.log(`IRONHEART_TENANT_ID=${existing[0].id}`);
    process.exit(0);
  }

  const now = new Date();
  const tenantId = uuid();

  // Create the tenant
  await db.insert(schema.tenants).values({
    id: tenantId,
    name: "Ironheart",
    slug: "ironheart",
    plan: "CUSTOM",
    status: "ACTIVE",
    billingEmail: "operations@theironheart.org",
    maxUsers: 100,
    maxStaff: 100,
    maxBookingsMonth: 10000,
    createdAt: now,
    updatedAt: now,
    workosOrgId: null, // Will be populated when WorkOS org is created
  });

  // Create organization settings
  await db.insert(schema.organizationSettings).values({
    tenantId,
    businessName: "The Ironheart Ltd",
    email: "operations@theironheart.org",
    timezone: "Europe/London",
    currency: "GBP",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "HH:mm",
    weekStartsOn: 1,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`✓ Ironheart tenant created`);
  console.log(`\nTenant ID: ${tenantId}`);
  console.log(`\nCopy this into .env.local:`);
  console.log(`IRONHEART_TENANT_ID=${tenantId}`);

  await client.end();
}

bootstrapIronheartTenant()
  .then(() => {
    console.log("\n✓ Bootstrap complete. Restart your dev server.\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n✗ Bootstrap failed:", err);
    process.exit(1);
  });
