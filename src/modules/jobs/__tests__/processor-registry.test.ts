import { describe, it, expect, beforeEach } from "vitest";
import {
  registerProcessor,
  getProcessor,
  listProcessors,
  _resetProcessorRegistry,
} from "../processors/processor.registry";
import type { RawEventProcessor } from "../processors/processor.types";

describe("processor.registry", () => {
  beforeEach(() => {
    _resetProcessorRegistry();
  });

  function fakeProcessor(
    source: string,
    kind: string,
  ): RawEventProcessor {
    return {
      source,
      kind,
      version: 1,
      handle: async () => ({ ok: true }),
    };
  }

  it("registers and retrieves by (source, kind)", () => {
    const p = fakeProcessor("gmail", "email.received");
    registerProcessor(p);
    expect(getProcessor("gmail", "email.received")).toBe(p);
  });

  it("returns undefined for unknown (source, kind)", () => {
    expect(getProcessor("nope", "missing")).toBeUndefined();
  });

  it("listProcessors enumerates everything registered", () => {
    registerProcessor(fakeProcessor("gmail", "email.received"));
    registerProcessor(fakeProcessor("stripe", "payment.succeeded"));
    expect(listProcessors().map((p) => `${p.source}:${p.kind}`).sort()).toEqual([
      "gmail:email.received",
      "stripe:payment.succeeded",
    ]);
  });

  it("re-registering same (source, kind) overwrites", () => {
    const p1 = fakeProcessor("gmail", "email.received");
    const p2 = fakeProcessor("gmail", "email.received");
    registerProcessor(p1);
    registerProcessor(p2);
    expect(getProcessor("gmail", "email.received")).toBe(p2);
  });
});
