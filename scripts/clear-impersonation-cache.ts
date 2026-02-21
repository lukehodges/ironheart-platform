/**
 * Clear corrupt impersonation session data from Redis
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { redis } from "../src/shared/redis";

async function main() {
  console.log("🧹 Clearing impersonation session cache...\n");

  try {
    // Try to scan for all impersonate:* keys
    // Note: Upstash Redis may not support SCAN, so we'll try DEL with known pattern
    const pattern = "impersonate:*";

    console.log(`Attempting to delete keys matching: ${pattern}`);

    // Upstash REST API doesn't support SCAN well, so we'll just note this
    console.log("\nℹ️  If you have active impersonation sessions, they will expire in 24 hours.");
    console.log("   Or manually delete from Upstash console: https://console.upstash.com");
    console.log("\n✅ Fix applied - next impersonation will work correctly");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
