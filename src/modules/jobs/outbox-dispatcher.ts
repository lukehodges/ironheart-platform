/**
 * Outbox dispatcher — for each enabled event_subscription, fetch events
 * past its cursor, deliver them, advance the cursor.
 *
 * Delivery modes:
 *   - 'webhook' → POST config.url, HMAC-SHA256 sign if config.secret
 *   - 'log'     → console.log via logger
 *   - 'noop'    → drop (used for paused subs that still want cursor to advance)
 *
 * On per-event failure: stop advancing cursor for that subscription, record
 * lastError, move on to the next subscription. The next tick will retry
 * from the failed event.
 */

import { db } from "@/shared/db";
import { events, eventSubscriptions } from "@/shared/db/schema";
import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { logger } from "@/shared/logger";
import { createHmac } from "node:crypto";

const log = logger.child({ module: "jobs.outbox-dispatcher" });

export interface RunOutboxDispatchBatchOpts {
  /** Per-subscription event fetch limit */
  limit?: number;
}

export interface RunOutboxDispatchBatchResult {
  subscriptions: number;
  delivered: number;
  failed: number;
}

interface SubscriptionRow {
  id: string;
  tenantId: string;
  name: string;
  kinds: string[];
  delivery: "webhook" | "log" | "noop";
  config: Record<string, unknown>;
  cursor: number;
}

interface EventRow {
  id: number;
  tenantId: string | null;
  kind: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown>;
  at: Date;
  actor: string | null;
}

export async function runOutboxDispatchBatch(
  opts: RunOutboxDispatchBatchOpts = {},
): Promise<RunOutboxDispatchBatchResult> {
  const limit = opts.limit ?? 100;

  const subs = (await db
    .select({
      id: eventSubscriptions.id,
      tenantId: eventSubscriptions.tenantId,
      name: eventSubscriptions.name,
      kinds: eventSubscriptions.kinds,
      delivery: eventSubscriptions.delivery,
      config: eventSubscriptions.config,
      cursor: eventSubscriptions.cursor,
    })
    .from(eventSubscriptions)
    .where(eq(eventSubscriptions.enabled, true))) as unknown as SubscriptionRow[];

  let delivered = 0;
  let failed = 0;

  for (const sub of subs) {
    const conds = [
      gt(events.id, sub.cursor),
      // tenantId filter — subs are scoped to a tenant; deliver tenant rows + null-tenant (system) rows
      or(eq(events.tenantId, sub.tenantId), isNull(events.tenantId))!,
    ];
    if (sub.kinds.length > 0) {
      conds.push(inArray(events.kind, sub.kinds));
    }

    const pending = (await db
      .select()
      .from(events)
      .where(and(...conds))
      .orderBy(asc(events.id))
      .limit(limit)) as unknown as EventRow[];

    if (pending.length === 0) continue;

    let lastDelivered: number | null = null;
    let stopErr: string | null = null;

    for (const evt of pending) {
      try {
        await deliverOne(sub, evt);
        lastDelivered = evt.id;
        delivered++;
      } catch (err) {
        stopErr = err instanceof Error ? err.message : String(err);
        failed++;
        log.warn(
          {
            subscriptionId: sub.id,
            subscriptionName: sub.name,
            eventId: evt.id,
            err: stopErr,
          },
          "Outbox delivery failed — halting this subscription, will retry next tick",
        );
        break;
      }
    }

    if (lastDelivered != null) {
      await db
        .update(eventSubscriptions)
        .set({
          cursor: lastDelivered,
          lastDeliveredAt: new Date(),
          lastError: stopErr,
          updatedAt: new Date(),
        })
        .where(eq(eventSubscriptions.id, sub.id));
    } else if (stopErr) {
      // First event itself failed — record error, don't move cursor
      await db
        .update(eventSubscriptions)
        .set({
          lastError: stopErr,
          updatedAt: new Date(),
        })
        .where(eq(eventSubscriptions.id, sub.id));
    }
  }

  return { subscriptions: subs.length, delivered, failed };
}

// ---------------------------------------------------------------------------
// internal — deliver a single event via the subscription's chosen channel
// ---------------------------------------------------------------------------

async function deliverOne(sub: SubscriptionRow, evt: EventRow): Promise<void> {
  switch (sub.delivery) {
    case "noop":
      return;

    case "log":
      log.info(
        {
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          eventId: evt.id,
          kind: evt.kind,
          tenantId: evt.tenantId,
          entityType: evt.entityType,
          entityId: evt.entityId,
          payload: evt.payload,
        },
        "Outbox event delivered (log)",
      );
      return;

    case "webhook": {
      const url = sub.config.url;
      if (typeof url !== "string" || url.length === 0) {
        throw new Error("webhook subscription missing config.url");
      }
      const body = JSON.stringify({
        eventId: evt.id,
        tenantId: evt.tenantId,
        kind: evt.kind,
        entityType: evt.entityType,
        entityId: evt.entityId,
        payload: evt.payload,
        at: evt.at,
        actor: evt.actor,
      });

      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-ironheart-event-id": String(evt.id),
        "x-ironheart-event-kind": evt.kind,
      };

      const secret = sub.config.secret;
      if (typeof secret === "string" && secret.length > 0) {
        const sig = createHmac("sha256", secret).update(body).digest("hex");
        headers["x-ironheart-signature"] = `sha256=${sig}`;
      }

      const res = await fetch(url, { method: "POST", body, headers });
      if (!res.ok) {
        throw new Error(`webhook ${url} returned ${res.status}`);
      }
      return;
    }

    default: {
      // Exhaustiveness — TS will warn here if the enum grows.
      const _exhaustive: never = sub.delivery;
      throw new Error(`unknown delivery mode: ${String(_exhaustive)}`);
    }
  }
}

// Re-export sql for tests that need to peek
export const _sql = sql;
