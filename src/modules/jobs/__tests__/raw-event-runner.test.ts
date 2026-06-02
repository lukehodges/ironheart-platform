/**
 * Raw-event runner — orchestration tests with the db client mocked.
 *
 * We mock @/shared/db to a thin object whose `execute` returns a queue of
 * claim rows, and whose `update` records the SET payloads so we can assert
 * processedAt / nextAttemptAt / attemptCount transitions.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Shared mock state
// ---------------------------------------------------------------------------

interface UpdateCall {
  table: unknown;
  set: Record<string, unknown>;
}

const state: {
  claimQueue: unknown[][];
  updates: UpdateCall[];
  insertedEvents: Record<string, unknown>[];
} = {
  claimQueue: [],
  updates: [],
  insertedEvents: [],
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/db", () => {
  const dbMock = {
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(dbMock),
    ),
    execute: vi.fn(async () => {
      const next = state.claimQueue.shift() ?? [];
      // Drizzle's `tx.execute` returns something array-like; the runner
      // casts to RawEventClaim[], so a plain array is enough.
      return next;
    }),
    update: vi.fn((table: unknown) => ({
      set: (payload: Record<string, unknown>) => ({
        where: (_w: unknown) => {
          state.updates.push({ table, set: payload });
          return Promise.resolve();
        },
      }),
    })),
    insert: vi.fn((_table: unknown) => ({
      values: (v: Record<string, unknown>) => ({
        returning: () => {
          state.insertedEvents.push(v);
          return Promise.resolve([{ id: state.insertedEvents.length }]);
        },
      }),
    })),
  };
  return { db: dbMock };
});

// Stub the schema imports to opaque sentinels — the runner only uses them
// as Drizzle column references inside .where() / .set(), which our mocks
// ignore.
vi.mock("@/shared/db/schema", () => ({
  rawEvents: { _table: "raw_events" },
  events: { _table: "events" },
  eventSubscriptions: { _table: "event_subscriptions" },
  identities: { _table: "identities" },
  contacts: { _table: "contacts" },
  companies: { _table: "companies" },
}));

vi.mock("drizzle-orm", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    ...actual,
    eq: vi.fn(() => ({ op: "eq" })),
    and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
    or: vi.fn((...args: unknown[]) => ({ op: "or", args })),
    asc: vi.fn(() => ({ op: "asc" })),
    desc: vi.fn(() => ({ op: "desc" })),
    gt: vi.fn(() => ({ op: "gt" })),
    inArray: vi.fn(() => ({ op: "inArray" })),
    isNull: vi.fn(() => ({ op: "isNull" })),
  };
});

// ---------------------------------------------------------------------------
// Imports — AFTER mocks
// ---------------------------------------------------------------------------

import { runRawEventBatch } from "../raw-event-runner";
import {
  registerProcessor,
  _resetProcessorRegistry,
} from "../processors/processor.registry";
import type { RawEventProcessor } from "../processors/processor.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  state.claimQueue = [];
  state.updates = [];
  state.insertedEvents = [];
  _resetProcessorRegistry();
});

function claim(overrides: Partial<{
  id: string;
  tenantId: string | null;
  source: string;
  kind: string;
  payload: unknown;
  receivedAt: Date;
  attemptCount: number;
}> = {}) {
  return {
    id: overrides.id ?? "raw-1",
    tenantId: overrides.tenantId ?? "tenant-1",
    source: overrides.source ?? "gmail",
    kind: overrides.kind ?? "email.received",
    payload: overrides.payload ?? { hello: "world" },
    receivedAt: overrides.receivedAt ?? new Date("2026-05-01T00:00:00Z"),
    attemptCount: overrides.attemptCount ?? 0,
  };
}

function findUpdate(predicate: (u: UpdateCall) => boolean): UpdateCall | undefined {
  return state.updates.find(predicate);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runRawEventBatch", () => {
  it("happy path — processor returns ok, row marked processed and emit called", async () => {
    const handle = vi.fn(async (ctx, _payload) => {
      await ctx.emit({ kind: "contact.touched", entityType: "contact", entityId: "c-1" });
      return { ok: true };
    });

    const processor: RawEventProcessor = {
      source: "gmail",
      kind: "email.received",
      version: 3,
      handle: handle as unknown as RawEventProcessor["handle"],
    };
    registerProcessor(processor);

    state.claimQueue.push([claim()]);

    const result = await runRawEventBatch({ now: new Date("2026-05-31T12:00:00Z") });

    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0, skipped: 0 });
    expect(handle).toHaveBeenCalledOnce();

    // emit() → insert into events
    expect(state.insertedEvents).toHaveLength(1);
    expect(state.insertedEvents[0]).toMatchObject({
      kind: "contact.touched",
      entityType: "contact",
      entityId: "c-1",
      tenantId: "tenant-1",
    });

    // raw_events marked processed
    const processed = findUpdate(
      (u) =>
        (u.set as Record<string, unknown>).processedAt instanceof Date &&
        (u.set as Record<string, unknown>).error === null,
    );
    expect(processed).toBeDefined();
    expect((processed!.set as Record<string, unknown>).processorVersion).toBe(3);
  });

  it("no processor registered → row marked processed with error, counted as skipped", async () => {
    state.claimQueue.push([claim({ source: "unknown", kind: "thing.happened" })]);

    const result = await runRawEventBatch();

    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 0, skipped: 1 });
    const u = state.updates[0]!;
    expect((u.set as Record<string, unknown>).processedAt).toBeInstanceOf(Date);
    expect(String((u.set as Record<string, unknown>).error)).toContain("no processor");
  });

  it("retryable error → attemptCount++ and nextAttemptAt set with backoff", async () => {
    const processor: RawEventProcessor = {
      source: "stripe",
      kind: "payment.succeeded",
      version: 1,
      handle: async () => ({
        ok: false,
        error: "downstream timeout",
        retryable: true,
      }),
    };
    registerProcessor(processor);

    const now = new Date("2026-05-31T12:00:00Z");
    state.claimQueue.push([
      claim({ source: "stripe", kind: "payment.succeeded", attemptCount: 2 }),
    ]);

    const result = await runRawEventBatch({ now });

    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1, skipped: 0 });

    const u = state.updates[0]!;
    expect((u.set as Record<string, unknown>).attemptCount).toBe(3);
    const nextAt = (u.set as Record<string, unknown>).nextAttemptAt as Date;
    // Backoff at attempt=2 → 1m * 2^2 = 4 minutes
    const delayMs = nextAt.getTime() - now.getTime();
    expect(delayMs).toBe(4 * 60 * 1000);
    expect((u.set as Record<string, unknown>).error).toBe("downstream timeout");
  });

  it("non-retryable error → dead-letter (processedAt set, error recorded)", async () => {
    const processor: RawEventProcessor = {
      source: "stripe",
      kind: "payment.succeeded",
      version: 1,
      handle: async () => ({
        ok: false,
        error: "permanently malformed",
        retryable: false,
      }),
    };
    registerProcessor(processor);

    state.claimQueue.push([claim({ source: "stripe", kind: "payment.succeeded" })]);

    const result = await runRawEventBatch();
    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1, skipped: 0 });

    const u = state.updates[0]!;
    expect((u.set as Record<string, unknown>).processedAt).toBeInstanceOf(Date);
    expect((u.set as Record<string, unknown>).error).toBe("permanently malformed");
  });

  it("max retries exhausted → dead-letter even if retryable", async () => {
    const processor: RawEventProcessor = {
      source: "stripe",
      kind: "payment.succeeded",
      version: 1,
      handle: async () => ({
        ok: false,
        error: "still failing",
        retryable: true,
      }),
    };
    registerProcessor(processor);

    state.claimQueue.push([
      claim({ source: "stripe", kind: "payment.succeeded", attemptCount: 4 }),
    ]);

    await runRawEventBatch();

    const u = state.updates[0]!;
    expect((u.set as Record<string, unknown>).processedAt).toBeInstanceOf(Date);
    expect((u.set as Record<string, unknown>).error).toBe("still failing");
  });

  it("retryAfterMs overrides exponential backoff", async () => {
    const processor: RawEventProcessor = {
      source: "stripe",
      kind: "payment.succeeded",
      version: 1,
      handle: async () => ({
        ok: false,
        error: "rate limited",
        retryable: true,
        retryAfterMs: 7_000,
      }),
    };
    registerProcessor(processor);

    const now = new Date("2026-05-31T12:00:00Z");
    state.claimQueue.push([claim({ source: "stripe", kind: "payment.succeeded" })]);

    await runRawEventBatch({ now });

    const u = state.updates[0]!;
    const nextAt = (u.set as Record<string, unknown>).nextAttemptAt as Date;
    expect(nextAt.getTime() - now.getTime()).toBe(7_000);
  });

  it("processor that throws → caught, scheduled for retry, batch continues", async () => {
    const okHandle = vi.fn(async () => ({ ok: true as const }));
    registerProcessor({
      source: "gmail",
      kind: "email.received",
      version: 1,
      handle: async () => {
        throw new Error("kaboom");
      },
    });
    registerProcessor({
      source: "stripe",
      kind: "payment.succeeded",
      version: 1,
      handle: okHandle,
    });

    state.claimQueue.push([
      claim({ id: "raw-A", source: "gmail", kind: "email.received" }),
      claim({ id: "raw-B", source: "stripe", kind: "payment.succeeded" }),
    ]);

    const result = await runRawEventBatch();
    expect(result.processed).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(okHandle).toHaveBeenCalledOnce();
  });
});
