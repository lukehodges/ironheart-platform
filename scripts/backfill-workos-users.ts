// scripts/backfill-workos-users.ts
// Run ONCE before Phase 3 go-live:
//   DATABASE_URL=... WORKOS_API_KEY=... npx tsx scripts/backfill-workos-users.ts

import "dotenv/config";
import { WorkOS } from "@workos-inc/node";
import { db } from "../src/shared/db";
import { users } from "../src/shared/db/schema";
import { isNull, eq } from "drizzle-orm";

const workos = new WorkOS(process.env.WORKOS_API_KEY!);

async function backfillWorkOSUsers() {
  const usersToMigrate = await db
    .select()
    .from(users)
    .where(isNull(users.workosUserId));

  console.log(`Found ${usersToMigrate.length} users to migrate`);

  const results = { success: 0, failed: 0, skipped: 0 };
  const failures: Array<{ userId: string; email: string; error: string }> = [];

  for (const user of usersToMigrate) {
    try {
      const existing = await workos.userManagement.listUsers({
        email: user.email,
      });

      let workosUserId: string;

      if (existing.data.length > 0 && existing.data[0]) {
        workosUserId = existing.data[0].id;
        results.skipped++;
        console.log(`Skipped (already in WorkOS): ${user.email}`);
      } else {
        const workosUser = await workos.userManagement.createUser({
          email: user.email,
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          emailVerified: true,
        });
        workosUserId = workosUser.id;
        results.success++;
        console.log(`Created WorkOS user: ${user.email} → ${workosUserId}`);
      }

      await db
        .update(users)
        .set({ workosUserId })
        .where(eq(users.id, user.id));
    } catch (error) {
      results.failed++;
      failures.push({
        userId: user.id,
        email: user.email,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`Failed: ${user.email}`, error);
    }
  }

  console.log("Migration complete:", results);

  if (failures.length > 0) {
    console.error("\nFailed users (will be locked out after go-live):");
    failures.forEach((f) => console.error(`  ${f.email}: ${f.error}`));
    process.exit(1);
  }

  console.log("✓ All users migrated successfully.");
}

backfillWorkOSUsers().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
