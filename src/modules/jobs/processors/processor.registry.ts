/**
 * In-process registry of raw-event processors, keyed by `${source}:${kind}`.
 *
 * Processors register themselves at module load. The runner looks up by
 * (source, kind) on each raw_events row.
 */

import type { RawEventProcessor } from "./processor.types";

const REGISTRY = new Map<string, RawEventProcessor>();

function key(source: string, kind: string): string {
  return `${source}:${kind}`;
}

export function registerProcessor(p: RawEventProcessor): void {
  const k = key(p.source, p.kind);
  REGISTRY.set(k, p);
}

export function getProcessor(
  source: string,
  kind: string,
): RawEventProcessor | undefined {
  return REGISTRY.get(key(source, kind));
}

export function listProcessors(): RawEventProcessor[] {
  return Array.from(REGISTRY.values());
}

/** Test-only — clear registry between tests */
export function _resetProcessorRegistry(): void {
  REGISTRY.clear();
}
