import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client.
 *
 * @upstash/redis uses HTTP REST calls, not TCP connections.
 * Safe to instantiate at module level in serverless environments.
 * Each Redis command is a single HTTP request - no pool to exhaust.
 *
 * Usage patterns:
 *   // Rate limiting
 *   const count = await redis.incr(`rate:${ip}:${Math.floor(Date.now() / 60000)}`);
 *   await redis.expire(`rate:${ip}:${Math.floor(Date.now() / 60000)}`, 60);
 *
 *   // Tenant lookup cache (5 min TTL)
 *   await redis.setex(`tenant:${slug}`, 300, JSON.stringify(tenant));
 *   const cached = await redis.get<TenantRow>(`tenant:${slug}`);
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
