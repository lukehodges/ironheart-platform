/**
 * emitEvent — single chokepoint for writing to the `events` outbox.
 *
 * Called by:
 *   - app services (outreach.service, pipeline.service, ...) at state changes
 *   - raw-event processors via ctx.emit()
 *
 * The outbox dispatcher then fans these out to event_subscriptions.
 */

import { db, type DB } from "@/shared/db";
import { events } from "@/shared/db/schema";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "jobs.event-emitter" });

export interface EmitInput {
  tenantId: string | null;
  kind: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  actor?: string;
  /** Optional drizzle tx — if provided, the insert participates in the caller's tx */
  tx?: DB;
}

export interface EmitResult {
  eventId: number;
}

export async function emitEvent(input: EmitInput): Promise<EmitResult> {
  const exec = input.tx ?? db;

  const [row] = await exec
    .insert(events)
    .values({
      tenantId: input.tenantId,
      kind: input.kind,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      payload: input.payload ?? {},
      actor: input.actor ?? null,
    })
    .returning({ id: events.id });

  if (!row) {
    throw new Error("emitEvent: insert returned no row");
  }

  log.debug(
    { eventId: row.id, kind: input.kind, tenantId: input.tenantId },
    "Event emitted to outbox",
  );

  return { eventId: row.id };
}
