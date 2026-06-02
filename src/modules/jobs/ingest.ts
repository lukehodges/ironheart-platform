/**
 * ingestRawEvent — single chokepoint for landing webhook / sync payloads
 * into `raw_events`. Idempotent on (source, source_event_id) so retry-
 * happy webhook senders can hammer the same payload safely.
 */

import { db } from "@/shared/db";
import { rawEvents } from "@/shared/db/schema";
import { and, eq } from "drizzle-orm";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "jobs.ingest" });

export interface IngestInput {
  source: string;
  sourceEventId: string;
  kind: string;
  payload: Record<string, unknown>;
  tenantId?: string | null;
  receivedAt?: Date;
}

export interface IngestResult {
  rawEventId: string;
  deduplicated: boolean;
}

export async function ingestRawEvent(
  input: IngestInput,
): Promise<IngestResult> {
  const inserted = await db
    .insert(rawEvents)
    .values({
      tenantId: input.tenantId ?? null,
      source: input.source,
      sourceEventId: input.sourceEventId,
      kind: input.kind,
      payload: input.payload,
      receivedAt: input.receivedAt ?? new Date(),
    })
    .onConflictDoNothing({
      target: [rawEvents.source, rawEvents.sourceEventId],
    })
    .returning({ id: rawEvents.id });

  if (inserted[0]) {
    log.debug(
      {
        rawEventId: inserted[0].id,
        source: input.source,
        kind: input.kind,
      },
      "Raw event ingested",
    );
    return { rawEventId: inserted[0].id, deduplicated: false };
  }

  // Conflict — look up the existing row so caller still gets the id
  const existing = await db
    .select({ id: rawEvents.id })
    .from(rawEvents)
    .where(
      and(
        eq(rawEvents.source, input.source),
        eq(rawEvents.sourceEventId, input.sourceEventId),
      ),
    )
    .limit(1);

  if (!existing[0]) {
    // Race: row vanished between INSERT and SELECT. Vanishingly rare in
    // practice (no DELETE path exists for raw_events). Surface clearly.
    throw new Error(
      `ingestRawEvent: conflict on (${input.source}, ${input.sourceEventId}) but lookup found nothing`,
    );
  }

  return { rawEventId: existing[0].id, deduplicated: true };
}
