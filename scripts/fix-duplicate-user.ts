/**
 * Fix duplicate luke@theironheart.org user
 *
 * Problem: User exists in both platform tenant and demo tenant
 * Solution: Keep demo tenant user, delete platform user, set isPlatformAdmin = true
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/shared/db/schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

async function main() {
  console.log("\n🔧 Fixing duplicate user issue...\n");

  const email = "luke@theironheart.org";

  // Find all users with this email
  const users = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      tenantId: schema.users.tenantId,
      isPlatformAdmin: schema.users.isPlatformAdmin,
      workosUserId: schema.users.workosUserId,
    })
    .from(schema.users)
    .where(eq(schema.users.email, email));

  console.log(`Found ${users.length} user(s) with email ${email}:`);
  users.forEach((u, i) => {
    console.log(`  ${i + 1}. ID: ${u.id}`);
    console.log(`     Tenant: ${u.tenantId}`);
    console.log(`     Platform Admin: ${u.isPlatformAdmin}`);
    console.log(`     WorkOS ID: ${u.workosUserId || "(not set)"}`);
    console.log("");
  });

  if (users.length < 2) {
    console.log("✓ No duplicate found. Checking if platform admin flag is set...");

    if (users[0] && !users[0].isPlatformAdmin) {
      console.log("  → Setting isPlatformAdmin = true");
      await db
        .update(schema.users)
        .set({ isPlatformAdmin: true })
        .where(eq(schema.users.id, users[0].id));
      console.log("  ✓ Platform admin flag set");
    } else {
      console.log("  ✓ Already has platform admin access");
    }

    await client.end();
    return;
  }

  // Find demo tenant
  const demoTenant = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, "demo"))
    .limit(1);

  if (!demoTenant[0]) {
    console.log("❌ Demo tenant not found");
    await client.end();
    return;
  }

  const demoTenantId = demoTenant[0].id;

  // Find which user is in demo tenant
  const demoUser = users.find((u) => u.tenantId === demoTenantId);
  const otherUsers = users.filter((u) => u.tenantId !== demoTenantId);

  if (!demoUser) {
    console.log("❌ No user found in demo tenant");
    await client.end();
    return;
  }

  console.log(`✓ Keeping demo tenant user: ${demoUser.id}`);
  console.log(`  → Setting isPlatformAdmin = true`);

  // Update demo user to have platform admin access
  await db
    .update(schema.users)
    .set({ isPlatformAdmin: true })
    .where(eq(schema.users.id, demoUser.id));

  console.log("  ✓ Platform admin flag set");

  // Delete other users
  for (const user of otherUsers) {
    console.log(`  → Deleting duplicate user: ${user.id} (tenant: ${user.tenantId})`);
    await db.delete(schema.users).where(eq(schema.users.id, user.id));
    console.log("    ✓ Deleted");
  }

  console.log("\n✅ Fix complete!");
  console.log(`\nYour user (${email}) is now:`);
  console.log(`  - In demo tenant`);
  console.log(`  - Has platform admin access (isPlatformAdmin = true)`);
  console.log(`  - Can access both /admin and /platform routes`);
  console.log("");

  await client.end();
}

main();
