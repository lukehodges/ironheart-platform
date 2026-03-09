import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";
import * as relations from "./db/relations";

// During `next build`, NEXT_PHASE === "phase-production-build".
// postgres() is instantiated but never connects until a query is made,
// so using a placeholder URL here is safe - the real URL is required at runtime.
if (!process.env.DATABASE_URL && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("DATABASE_URL environment variable is not set");
}

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://localhost/placeholder_build_only";

// In serverless (Vercel), max: 1 prevents connection pool exhaustion.
// In development, a small pool avoids excessive reconnects.
const client = postgres(connectionString, {
  max: process.env.NODE_ENV === "production" ? 1 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema: { ...schema, ...relations } });
export type DB = typeof db;
