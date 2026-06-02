/**
 * Jobs module — public API.
 *
 * Owns the raw-event runner (drains raw_events through registered
 * processors) and the outbox dispatcher (fans events out to
 * event_subscriptions). Plus the ingest + emit chokepoints that the rest
 * of the app talks to.
 */

export {
  registerProcessor,
  getProcessor,
  listProcessors,
} from "./processors/processor.registry";

export type {
  RawEventProcessor,
  ProcessorContext,
  ProcessorResult,
  ProcessorEmitInput,
  ResolveContactInput as ProcessorResolveContactInput,
  ResolvedContact,
} from "./processors/processor.types";

export { emitEvent } from "./event-emitter";
export type { EmitInput, EmitResult } from "./event-emitter";

export { ingestRawEvent } from "./ingest";
export type { IngestInput, IngestResult } from "./ingest";

export { runRawEventBatch } from "./raw-event-runner";
export type {
  RunRawEventBatchOpts,
  RunRawEventBatchResult,
} from "./raw-event-runner";

export { runOutboxDispatchBatch } from "./outbox-dispatcher";
export type {
  RunOutboxDispatchBatchOpts,
  RunOutboxDispatchBatchResult,
} from "./outbox-dispatcher";

export { resolveContact, resolveCompany } from "./identity-resolver.service";
export type {
  ResolveContactInput,
  ResolveContactResult,
  ResolveCompanyInput,
  ResolveCompanyResult,
} from "./identity-resolver.service";
