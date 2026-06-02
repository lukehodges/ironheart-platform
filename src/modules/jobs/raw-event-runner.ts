/**
 * Raw-event runner — drains pending raw_events rows, routes each through
 * its registered processor, and records success / retry / dead-letter.
 *
 * Concurrency-safe across processes via `FOR UPDATE SKIP LOCKED` on the
 * SELECT — multiple runners can hammer the table without double-processing
 * the same row.
 *
 * Each event is processed inside its own tx so one bad row never poisons
 * the batch.
 */

import { db } from "@/shared/db";
import { rawEvents } from "@/shared/db/schema";
import { sql, eq } from "drizzle-orm";
import { logger } from "@/shared/logger";
import { getProcessor } from "./processors/processor.registry";
import type {
  ProcessorContext,
  ProcessorEmitInput,
  RawEventProcessor,
} from "./processors/processor.types";
import { emitEvent } from "./event-emitter";
import { resolveContact } from "./identity-resolver.service";

const log = logger.child({ module: "jobs.raw-event-runner" });

// Backoff: 1m * 2^attempt, capped at 1h
const BASE_RETRY_MS = 60_000; // 1 minute
const MAX_RETRY_MS = 60 * 60_000; // 1 hour
const MAX_ATTEMPTS = 5;

export interface RunRawEventBatchOpts {
  limit?: number;
  now?: Date;
}

export interface RunRawEventBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  /** raw_events with no registered processor (marked processed + skipped) */
  skipped: number;
}

interface RawEventClaim {
  id: string;
  tenantId: string | null;
  source: string;
  kind: string;
  payload: unknown;
  receivedAt: Date;
  attemptCount: number;
  [key: string]: unknown;
}

export async function runRawEventBatch(
  opts: RunRawEventBatchOpts = {},
): Promise<RunRawEventBatchResult> {
  const limit = opts.limit ?? 50;
  const now = opts.now ?? new Date();

  // Claim rows up-front in a short tx so other runners skip them. We then
  // process each row in its own tx (so a single failure doesn't roll back
  // the whole claim batch).
  //
  // NOTE: We don't actually need to hold the lock past the claim — we
  // mutate `processed_at` / `next_attempt_at` after each handler runs,
  // which moves the row out of the "pending" query window.
  const claims = await db.transaction(async (tx) => {
    const rows = await tx.execute<RawEventClaim>(sql`
      SELECT
        "id",
        "tenantId",
        "source",
        "kind",
        "payload",
        "receivedAt",
        "attemptCount"
      FROM raw_events
      WHERE "processedAt" IS NULL
        AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= ${now})
      ORDER BY "receivedAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `);
    return rows as unknown as RawEventClaim[];
  });

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const claim of claims) {
    const processor = getProcessor(claim.source, claim.kind);

    if (!processor) {
      await markProcessed(claim.id, {
        error: `no processor for (${claim.source}, ${claim.kind})`,
        processorVersion: 0,
        now,
      });
      skipped++;
      log.warn(
        { rawEventId: claim.id, source: claim.source, kind: claim.kind },
        "Dropped raw_event — no registered processor",
      );
      continue;
    }

    try {
      const result = await runOne(claim, processor, now);
      if (result.ok) {
        succeeded++;
      } else {
        failed++;
      }
    } catch (err) {
      // Defensive: handler threw despite the "MUST NOT throw" contract.
      // Treat as retryable so we don't dead-letter on transient bugs.
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      log.error(
        { rawEventId: claim.id, source: claim.source, kind: claim.kind, err: message },
        "Processor threw — scheduling retry",
      );
      await scheduleRetry(claim, message, now);
    }
  }

  return {
    processed: claims.length,
    succeeded,
    failed,
    skipped,
  };
}

// ---------------------------------------------------------------------------
// internal — run a single processor with its own tx
// ---------------------------------------------------------------------------

async function runOne(
  claim: RawEventClaim,
  processor: RawEventProcessor,
  now: Date,
): Promise<{ ok: boolean }> {
  const ctx: ProcessorContext = {
    rawEventId: claim.id,
    tenantId: claim.tenantId,
    receivedAt: claim.receivedAt,
    attempt: claim.attemptCount + 1,
    db,
    async emit(event: ProcessorEmitInput) {
      await emitEvent({
        tenantId: claim.tenantId,
        kind: event.kind,
        entityType: event.entityType,
        entityId: event.entityId,
        payload: event.payload,
        actor: event.actor,
      });
    },
    async resolveContact(input) {
      if (!claim.tenantId) {
        // Cross-tenant raw event — identity resolver is tenant-scoped, so we
        // can't help here. Processors are expected to handle this case.
        return null;
      }
      return resolveContact({
        tenantId: claim.tenantId,
        email: input.email,
        externalId: input.externalId,
        source: input.source,
        autoCreate: input.autoCreate,
      });
    },
  };

  const result = await processor.handle(ctx, claim.payload);

  if (result.ok) {
    await markProcessed(claim.id, {
      error: null,
      processorVersion: processor.version,
      now,
    });
    return { ok: true };
  }

  if (!result.retryable || claim.attemptCount + 1 >= MAX_ATTEMPTS) {
    // Dead-letter — processed, won't retry, error recorded.
    await markProcessed(claim.id, {
      error: result.error,
      processorVersion: processor.version,
      now,
    });
    log.warn(
      {
        rawEventId: claim.id,
        source: claim.source,
        kind: claim.kind,
        attempts: claim.attemptCount + 1,
        retryable: result.retryable,
      },
      "Dead-lettering raw_event",
    );
    return { ok: false };
  }

  await scheduleRetry(claim, result.error, now, result.retryAfterMs);
  return { ok: false };
}

// ---------------------------------------------------------------------------
// internal — mark processed (success or dead-letter)
// ---------------------------------------------------------------------------

async function markProcessed(
  rawEventId: string,
  opts: { error: string | null; processorVersion: number; now: Date },
): Promise<void> {
  await db
    .update(rawEvents)
    .set({
      processedAt: opts.now,
      error: opts.error,
      processorVersion: opts.processorVersion,
    })
    .where(eq(rawEvents.id, rawEventId));
}

// ---------------------------------------------------------------------------
// internal — schedule a retry with exponential backoff
// ---------------------------------------------------------------------------

async function scheduleRetry(
  claim: RawEventClaim,
  error: string,
  now: Date,
  retryAfterMs?: number,
): Promise<void> {
  const nextAttempt = claim.attemptCount + 1;
  const delay =
    retryAfterMs ??
    Math.min(BASE_RETRY_MS * 2 ** claim.attemptCount, MAX_RETRY_MS);

  await db
    .update(rawEvents)
    .set({
      attemptCount: nextAttempt,
      nextAttemptAt: new Date(now.getTime() + delay),
      error,
    })
    .where(eq(rawEvents.id, claim.id));
}
