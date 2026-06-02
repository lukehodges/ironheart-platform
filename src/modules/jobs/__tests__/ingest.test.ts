/**
 * ingestRawEvent — idempotency contract.
 *
 * First call returns deduplicated:false. Second call with same
 * (source, sourceEventId) returns deduplicated:true and the same id.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const state: {
  rows: { id: string; source: string; sourceEventId: string }[];
} = { rows: [] };

vi.mock("@/shared/db", () => {
  let insertId = 0;
  function selectBuilder() {
    return {
      from: () => ({
        where: () => ({
          limit: () => {
            // Find by (source, sourceEventId) — captured below via lastWhere
            const found = state.rows[state.rows.length - 1]; // simplification
            return Promise.resolve(found ? [{ id: found.id }] : []);
          },
        }),
      }),
    };
  }
  const dbMock = {
    insert: vi.fn(() => ({
      values: (v: { source: string; sourceEventId: string }) => ({
        onConflictDoNothing: () => ({
          returning: () => {
            const exists = state.rows.find(
              (r) =>
                r.source === v.source && r.sourceEventId === v.sourceEventId,
            );
            if (exists) {
              return Promise.resolve([]);
            }
            insertId++;
            const id = `raw-${insertId}`;
            state.rows.push({
              id,
              source: v.source,
              sourceEventId: v.sourceEventId,
            });
            return Promise.resolve([{ id }]);
          },
        }),
      }),
    })),
    select: vi.fn(() => selectBuilder()),
  };
  return { db: dbMock };
});

vi.mock("@/shared/db/schema", () => ({
  rawEvents: { id: "id", source: "source", sourceEventId: "sourceEventId" },
}));

vi.mock("drizzle-orm", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    ...actual,
    eq: vi.fn(() => ({ op: "eq" })),
    and: vi.fn(() => ({ op: "and" })),
  };
});

import { ingestRawEvent } from "../ingest";

beforeEach(() => {
  state.rows = [];
});

describe("ingestRawEvent", () => {
  it("first call returns deduplicated:false with new id", async () => {
    const result = await ingestRawEvent({
      source: "stripe",
      sourceEventId: "evt_abc",
      kind: "payment.succeeded",
      payload: { amount: 100 },
    });
    expect(result.deduplicated).toBe(false);
    expect(result.rawEventId).toBe("raw-1");
  });

  it("second call with same (source, sourceEventId) is deduplicated", async () => {
    const first = await ingestRawEvent({
      source: "stripe",
      sourceEventId: "evt_abc",
      kind: "payment.succeeded",
      payload: { amount: 100 },
    });
    const second = await ingestRawEvent({
      source: "stripe",
      sourceEventId: "evt_abc",
      kind: "payment.succeeded",
      payload: { amount: 100 },
    });
    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(true);
    expect(second.rawEventId).toBe(first.rawEventId);
  });

  it("different sourceEventId → new row", async () => {
    const a = await ingestRawEvent({
      source: "stripe",
      sourceEventId: "evt_a",
      kind: "payment.succeeded",
      payload: {},
    });
    const b = await ingestRawEvent({
      source: "stripe",
      sourceEventId: "evt_b",
      kind: "payment.succeeded",
      payload: {},
    });
    expect(a.rawEventId).not.toBe(b.rawEventId);
    expect(a.deduplicated).toBe(false);
    expect(b.deduplicated).toBe(false);
  });
});
