/**
 * Processor contract for raw_events.
 *
 * Every external system (gmail, stripe, calcom, ...) that drops rows into
 * raw_events is drained by exactly one registered processor, keyed by
 * (source, kind). Processors are *pure handlers*: they receive context +
 * payload, do their work, and return a result. The runner owns retry,
 * dead-lettering, and tx boundaries.
 */

import type { DB } from "@/shared/db";

// ---------------------------------------------------------------------------
// Emit input — mirrors events outbox row, tenantId comes from ctx.
// ---------------------------------------------------------------------------

export interface ProcessorEmitInput {
  kind: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  actor?: string;
}

// ---------------------------------------------------------------------------
// Identity resolver shape — returned by ctx.resolveContact()
// ---------------------------------------------------------------------------

export interface ResolvedContact {
  contactId: string;
  companyId: string;
}

export interface ResolveContactInput {
  email?: string;
  externalId?: string;
  source: string;
  autoCreate?: boolean;
}

// ---------------------------------------------------------------------------
// Processor context — what the runner hands to handle()
// ---------------------------------------------------------------------------

export interface ProcessorContext {
  rawEventId: string;
  tenantId: string | null;
  receivedAt: Date;
  attempt: number;
  /** Drizzle client — processors may read/write extra tables if needed */
  db: DB;
  /** Append a domain event to the outbox. tenantId is taken from ctx. */
  emit(event: ProcessorEmitInput): Promise<void>;
  /** Identity resolver — find or create a contact for a (source, externalId|email) */
  resolveContact(input: ResolveContactInput): Promise<ResolvedContact | null>;
}

// ---------------------------------------------------------------------------
// Processor result
// ---------------------------------------------------------------------------

export type ProcessorResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      retryable: boolean;
      /** Override exponential backoff with an explicit retry delay */
      retryAfterMs?: number;
    };

// ---------------------------------------------------------------------------
// Processor — the thing registered against (source, kind)
// ---------------------------------------------------------------------------

export interface RawEventProcessor {
  /** Source system, e.g. 'gmail', 'stripe', 'calcom' */
  source: string;
  /** Event kind within that source, e.g. 'email.received', 'payment.succeeded' */
  kind: string;
  /** Bump to force re-processing of historical rows (recorded on processedAt) */
  version: number;
  handle(
    ctx: ProcessorContext,
    payload: unknown,
  ): Promise<ProcessorResult>;
}
