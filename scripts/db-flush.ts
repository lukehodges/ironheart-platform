/**
 * db:flush — Hard-reset the database by dropping all tables, enums, and
 * extensions then pushing the schema fresh via drizzle-kit push.
 *
 * Usage:  npm run db:flush
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

async function flush() {
  const sql = postgres(DATABASE_URL!, { max: 1 });

  console.log("Dropping all tables, enums, and extensions in public schema...");

  await sql.unsafe(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      -- Drop all tables
      FOR r IN (
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;

      -- Drop all custom enum types
      FOR r IN (
        SELECT t.typname
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typtype = 'e'
      ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  console.log("Database wiped.");
  await sql.end();

  // Push schema directly (no migrations)
  console.log("Pushing schema with drizzle-kit push...");
  const { execSync } = await import("child_process");
  execSync("npx drizzle-kit push", { stdio: "inherit" });

  console.log("Database flush complete.");
}

flush().catch((err) => {
  console.error("Flush failed:", err);
  process.exit(1);
});
