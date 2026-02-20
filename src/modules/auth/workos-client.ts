/**
 * WorkOS Management API Client
 *
 * Used for updating WorkOS user metadata (externalId) to link WorkOS users
 * to our database user records for fast lookups.
 */

import { WorkOS } from "@workos-inc/node";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "workos-client" });

/**
 * WorkOS Management API client.
 * Only initialized if WORKOS_API_KEY is present.
 */
let workosClient: WorkOS | null = null;

function getWorkOSClient(): WorkOS | null {
  if (!process.env.WORKOS_API_KEY) {
    log.warn("WORKOS_API_KEY not set - WorkOS Management API unavailable");
    return null;
  }

  if (!workosClient) {
    workosClient = new WorkOS(process.env.WORKOS_API_KEY);
  }

  return workosClient;
}

/**
 * Set the externalId on a WorkOS user.
 * This links the WorkOS user to our database user ID for fast lookups.
 *
 * @param workosUserId - WorkOS user ID (e.g., "user_01...")
 * @param databaseUserId - Our database user ID (UUID)
 */
export async function setWorkOSExternalId(
  workosUserId: string,
  databaseUserId: string
): Promise<boolean> {
  const client = getWorkOSClient();
  if (!client) {
    log.warn("Cannot set externalId - WorkOS client not available");
    return false;
  }

  try {
    await client.userManagement.updateUser({
      userId: workosUserId,
      externalId: databaseUserId,
    });

    log.info(
      { workosUserId, databaseUserId },
      "Set externalId on WorkOS user"
    );
    return true;
  } catch (err) {
    log.error(
      { err, workosUserId, databaseUserId },
      "Failed to set externalId on WorkOS user"
    );
    return false;
  }
}

/**
 * Clear the Redis cache for a WorkOS user.
 * Call this when a user is updated or deleted.
 *
 * @param workosUserId - WorkOS user ID to clear cache for
 */
export async function clearWorkOSUserCache(workosUserId: string): Promise<void> {
  try {
    const { redis } = await import("@/shared/redis");
    const cacheKey = `workos:user:${workosUserId}`;
    await redis.del(cacheKey);
    log.debug({ workosUserId }, "Cleared WorkOS user cache");
  } catch (err) {
    log.warn({ err, workosUserId }, "Failed to clear WorkOS user cache");
  }
}
