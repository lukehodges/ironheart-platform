/**
 * Outbox dispatcher tests with db mocked.
 *
 * The dispatcher does two reads (subscriptions, then events per sub) and
 * one update per sub. We script the read responses via a queue.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

interface UpdateCall {
  set: Record<string, unknown>;
}

const state: {
  selectQueue: unknown[][];
  updates: UpdateCall[];
} = {
  selectQueue: [],
  updates: [],
};

vi.mock("@/shared/db", () => {
  function selectBuilder() {
    // The dispatcher chains .from().where().orderBy().limit() OR
    // .from() directly. We make every chain method return `this` and the
    // final await pulls from the queue. To make it awaitable at any point,
    // builder is a thenable.
    const result = state.selectQueue.shift() ?? [];
    const builder: Record<string, unknown> = {
      from: () => builder,
      where: () => builder,
      orderBy: () => builder,
      limit: () => builder,
      then: (resolve: (v: unknown) => unknown) => resolve(result),
    };
    return builder;
  }

  const dbMock = {
    select: vi.fn(() => selectBuilder()),
    update: vi.fn(() => ({
      set: (payload: Record<string, unknown>) => ({
        where: () => {
          state.updates.push({ set: payload });
          return Promise.resolve();
        },
      }),
    })),
  };
  return { db: dbMock };
});

vi.mock("@/shared/db/schema", () => ({
  events: { id: "id", tenantId: "tenantId", kind: "kind" },
  eventSubscriptions: {
    id: "id",
    tenantId: "tenantId",
    name: "name",
    kinds: "kinds",
    delivery: "delivery",
    config: "config",
    cursor: "cursor",
    enabled: "enabled",
  },
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
    gt: vi.fn(() => ({ op: "gt" })),
    inArray: vi.fn(() => ({ op: "inArray" })),
    isNull: vi.fn(() => ({ op: "isNull" })),
  };
});

// ---------------------------------------------------------------------------
import { runOutboxDispatchBatch } from "../outbox-dispatcher";

beforeEach(() => {
  state.selectQueue = [];
  state.updates = [];
});

describe("runOutboxDispatchBatch", () => {
  it("log-delivery sub: drains events and advances cursor", async () => {
    state.selectQueue.push([
      {
        id: "sub-1",
        tenantId: "tenant-1",
        name: "all-log",
        kinds: [],
        delivery: "log",
        config: {},
        cursor: 10,
      },
    ]);
    state.selectQueue.push([
      {
        id: 11,
        tenantId: "tenant-1",
        kind: "contact.touched",
        entityType: "contact",
        entityId: "c-1",
        payload: {},
        at: new Date(),
        actor: null,
      },
      {
        id: 12,
        tenantId: "tenant-1",
        kind: "payment.received",
        entityType: "invoice",
        entityId: "i-1",
        payload: {},
        at: new Date(),
        actor: null,
      },
    ]);

    const result = await runOutboxDispatchBatch();

    expect(result).toEqual({ subscriptions: 1, delivered: 2, failed: 0 });
    expect(state.updates).toHaveLength(1);
    expect((state.updates[0]!.set as Record<string, unknown>).cursor).toBe(12);
    expect((state.updates[0]!.set as Record<string, unknown>).lastError).toBeNull();
  });

  it("no pending events → no update issued", async () => {
    state.selectQueue.push([
      {
        id: "sub-1",
        tenantId: "tenant-1",
        name: "noop",
        kinds: [],
        delivery: "noop",
        config: {},
        cursor: 999,
      },
    ]);
    state.selectQueue.push([]);

    const result = await runOutboxDispatchBatch();
    expect(result).toEqual({ subscriptions: 1, delivered: 0, failed: 0 });
    expect(state.updates).toHaveLength(0);
  });

  it("webhook delivery: missing config.url → first event fails, cursor not advanced", async () => {
    state.selectQueue.push([
      {
        id: "sub-1",
        tenantId: "tenant-1",
        name: "bad-webhook",
        kinds: [],
        delivery: "webhook",
        config: {}, // no url
        cursor: 0,
      },
    ]);
    state.selectQueue.push([
      {
        id: 1,
        tenantId: "tenant-1",
        kind: "x.y",
        entityType: null,
        entityId: null,
        payload: {},
        at: new Date(),
        actor: null,
      },
    ]);

    const result = await runOutboxDispatchBatch();
    expect(result).toEqual({ subscriptions: 1, delivered: 0, failed: 1 });
    // Update was issued to record error, but cursor must not be set
    expect(state.updates).toHaveLength(1);
    const setPayload = state.updates[0]!.set as Record<string, unknown>;
    expect(setPayload.cursor).toBeUndefined();
    expect(String(setPayload.lastError)).toContain("config.url");
  });

  it("webhook delivery: successful POST drains and advances", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("ok", { status: 200 }));

    state.selectQueue.push([
      {
        id: "sub-1",
        tenantId: "tenant-1",
        name: "good-webhook",
        kinds: ["contact.touched"],
        delivery: "webhook",
        config: { url: "https://example.com/hook", secret: "shh" },
        cursor: 0,
      },
    ]);
    state.selectQueue.push([
      {
        id: 1,
        tenantId: "tenant-1",
        kind: "contact.touched",
        entityType: "contact",
        entityId: "c-1",
        payload: { foo: "bar" },
        at: new Date(),
        actor: null,
      },
    ]);

    const result = await runOutboxDispatchBatch();
    expect(result).toEqual({ subscriptions: 1, delivered: 1, failed: 0 });
    expect(fetchSpy).toHaveBeenCalledOnce();
    const callArgs = fetchSpy.mock.calls[0]!;
    expect(callArgs[0]).toBe("https://example.com/hook");
    const init = callArgs[1]!;
    const headers = init.headers as Record<string, string>;
    expect(headers["x-ironheart-signature"]).toMatch(/^sha256=/);
    expect((state.updates[0]!.set as Record<string, unknown>).cursor).toBe(1);

    fetchSpy.mockRestore();
  });
});
