/**
 * Outreach module — event kinds emitted to the `events` outbox table.
 *
 * Naming: dotted lowercase. Subscribers consume from event_subscriptions.
 *
 * Inngest functions live in `outreachFunctions` for backwards compatibility
 * with the existing Inngest serve() registration in src/app/api/inngest/route.ts.
 * Currently empty — all state changes are emitted via the outbox table, not
 * Inngest events. Subscribers (e.g. integrations) should read from `events`.
 */

import { inngest } from "@/shared/inngest"

export const OUTREACH_EVENT_KINDS = [
  "lead.created",
  "lead.updated",
  "touch.sent",
  "reply.received",
  "reply.classified",
  "reply.handled",
  "dnc.added",
  "leads.imported",
] as const

export type OutreachEventKind = (typeof OUTREACH_EVENT_KINDS)[number]

/** Inngest functions registered by this module (empty by design). */
export const outreachFunctions: ReturnType<typeof inngest.createFunction>[] = []
