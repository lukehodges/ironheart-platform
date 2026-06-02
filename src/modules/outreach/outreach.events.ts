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
  "touch.queued",
  "touch.sent",
  "touch.delivered",
  "touch.bounced",
  "reply.received",
  "reply.classified",
  "dnc.added",
  "company.created",
  "contact.created",
  "leads.imported",
] as const

export type OutreachEventKind = (typeof OUTREACH_EVENT_KINDS)[number]

/** Inngest functions registered by this module (empty by design). */
export const outreachFunctions: ReturnType<typeof inngest.createFunction>[] = []
