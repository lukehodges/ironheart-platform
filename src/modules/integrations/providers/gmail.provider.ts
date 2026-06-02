// src/modules/integrations/providers/gmail.provider.ts
/**
 * Gmail Integration Provider — pull-style via IMAP + app password.
 *
 * For v1 we deliberately skip Gmail OAuth (heavy, requires CASA review for
 * production scopes). Single sender (Luke) → 1 connection → 1 app password
 * stored in an env var keyed by `integration_connections.secretsRef`.
 *
 * The cursor is `{ lastUid: number; sinceDate: string }` per mailbox.
 * UIDVALIDITY changes (server rotates UIDs) reset lastUid to 0.
 *
 * Reply correlation lives in the processor, not here — this file's job is
 * just to drop raw payloads into `raw_events`.
 */
import { ImapFlow, type FetchMessageObject } from "imapflow"
import { simpleParser } from "mailparser"
import { logger } from "@/shared/logger"
import { ingestRawEvent } from "@/modules/jobs/ingest"
import { integrationConnectionsRepository } from "../integration-connections.repository"
import type {
  IntegrationProvider,
  IntegrationContext,
  IntegrationResult,
  WebhookPayload,
} from "../integrations.types"

const log = logger.child({ module: "gmail.provider" })

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAP_HOST = process.env.GMAIL_IMAP_HOST ?? "imap.gmail.com"
const IMAP_PORT = Number(process.env.GMAIL_IMAP_PORT ?? "993")
const MAX_FETCH_PER_PULL = Number(process.env.GMAIL_MAX_FETCH_PER_PULL ?? "100")
const DEFAULT_MAILBOX = "INBOX"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GmailCursor {
  lastUid: number
  uidValidity?: number
  sinceDate: string // ISO
}

interface GmailConfig {
  email: string
  /** Mailbox to poll. Defaults to INBOX. */
  mailbox?: string
  /** Env var name containing the app password. e.g. `GMAIL_APP_PWD_LUKE` */
  passwordEnvVar?: string
}

export interface GmailEmailPayload {
  messageId: string
  threadId: string | null
  from: { name: string | null; email: string }
  to: Array<{ name: string | null; email: string }>
  subject: string
  body: string
  inReplyTo: string | null
  references: string[]
  date: string // ISO
  rawHeaders: Record<string, string>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCursor(raw: unknown): GmailCursor {
  if (raw && typeof raw === "object") {
    const obj = raw as Partial<GmailCursor>
    return {
      lastUid: typeof obj.lastUid === "number" ? obj.lastUid : 0,
      uidValidity:
        typeof obj.uidValidity === "number" ? obj.uidValidity : undefined,
      sinceDate:
        typeof obj.sinceDate === "string"
          ? obj.sinceDate
          : defaultSinceDate(),
    }
  }
  return { lastUid: 0, sinceDate: defaultSinceDate() }
}

function defaultSinceDate(): string {
  // Start 30 days back on first pull to avoid scanning the entire mailbox.
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString()
}

function resolvePassword(config: GmailConfig): string {
  const envVar = config.passwordEnvVar
  if (!envVar) {
    throw new Error(
      "gmail.provider: connection.config.passwordEnvVar is required",
    )
  }
  const pwd = process.env[envVar]
  if (!pwd) {
    throw new Error(
      `gmail.provider: env var ${envVar} is not set (referenced by connection config)`,
    )
  }
  return pwd
}

function pickAddress(
  list:
    | (ReturnType<typeof simpleParser> extends Promise<infer P>
        ? P extends { from?: infer F }
          ? F
          : never
        : never)
    | undefined,
): { name: string | null; email: string } {
  // Best-effort extraction — mailparser's address shapes vary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = list as any
  const addr = v?.value?.[0]
  return {
    name: addr?.name ?? null,
    email: String(addr?.address ?? "").toLowerCase(),
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const gmailProvider: IntegrationProvider = {
  slug: "gmail",
  name: "Gmail",
  handles: [],

  produces: [{ source: "gmail", kind: "email.received" }],

  async pull(
    ctx: IntegrationContext,
    cursorRaw: unknown,
  ): Promise<{ newCursor: GmailCursor; ingested: number }> {
    // 1. Load the connection row to get config + secrets ref.
    const connection =
      await integrationConnectionsRepository.getConnectionUnscoped(
        ctx.userIntegrationId,
      )
    if (!connection) {
      throw new Error(
        `gmail.provider: integration_connections row ${ctx.userIntegrationId} not found`,
      )
    }

    const config = connection.config as unknown as GmailConfig
    if (!config.email) {
      throw new Error("gmail.provider: connection.config.email is required")
    }

    // Honour secretsRef if present — otherwise fall back to config.passwordEnvVar.
    const passwordEnvVar = connection.secretsRef ?? config.passwordEnvVar
    const password = resolvePassword({ ...config, passwordEnvVar })

    const cursor = parseCursor(cursorRaw)
    const mailbox = config.mailbox ?? DEFAULT_MAILBOX

    const client = new ImapFlow({
      host: IMAP_HOST,
      port: IMAP_PORT,
      secure: true,
      auth: { user: config.email, pass: password },
      logger: false,
    })

    let ingested = 0
    let newLastUid = cursor.lastUid
    let newUidValidity = cursor.uidValidity

    try {
      await client.connect()
      const lock = await client.getMailboxLock(mailbox)
      try {
        const mb = client.mailbox
        const currentUidValidity =
          typeof mb === "object" && mb && "uidValidity" in mb
            ? Number((mb as { uidValidity: unknown }).uidValidity)
            : undefined

        // UIDVALIDITY rotation invalidates the lastUid pointer.
        if (
          currentUidValidity &&
          cursor.uidValidity &&
          currentUidValidity !== cursor.uidValidity
        ) {
          log.warn(
            {
              previous: cursor.uidValidity,
              current: currentUidValidity,
              connectionId: connection.id,
            },
            "Gmail UIDVALIDITY changed — resetting lastUid to 0",
          )
          newLastUid = 0
        }
        if (currentUidValidity) newUidValidity = currentUidValidity

        const fromUid = newLastUid + 1
        const range = `${fromUid}:*`

        let processed = 0
        for await (const msg of client.fetch(
          range,
          {
            uid: true,
            envelope: true,
            source: true,
            internalDate: true,
          },
          { uid: true },
        )) {
          if (processed >= MAX_FETCH_PER_PULL) break
          if (typeof msg.uid !== "number" || msg.uid <= newLastUid) continue

          const payload = await buildPayload(msg)
          if (!payload) continue

          await ingestRawEvent({
            source: "gmail",
            sourceEventId: payload.messageId || `uid:${msg.uid}`,
            kind: "email.received",
            payload: payload as unknown as Record<string, unknown>,
            tenantId: connection.tenantId,
            receivedAt: new Date(payload.date),
          })

          ingested += 1
          processed += 1
          if (msg.uid > newLastUid) newLastUid = msg.uid
        }
      } finally {
        lock.release()
      }
    } finally {
      try {
        await client.logout()
      } catch (err) {
        log.debug({ err }, "Gmail IMAP logout failed (non-fatal)")
      }
    }

    return {
      newCursor: {
        lastUid: newLastUid,
        uidValidity: newUidValidity,
        sinceDate: new Date().toISOString(),
      },
      ingested,
    }
  },

  async onEvent(): Promise<IntegrationResult> {
    return { success: true }
  },

  async onWebhook(
    _payload: WebhookPayload,
    _ctx: IntegrationContext,
  ): Promise<void> {
    // Gmail push notifications go via Pub/Sub — not implemented for v1.
    // The pull cron path is authoritative.
  },

  getOAuthUrl(_state: string, _redirectUri: string): string {
    // Gmail provider v1 uses an app password — no OAuth flow.
    return ""
  },

  async exchangeCode(): Promise<void> {
    // No-op — see getOAuthUrl.
  },

  async disconnect(): Promise<void> {
    // No external state to revoke for IMAP+app-password.
  },
}

// ─── Internal: parse a fetched message into GmailEmailPayload ────────────────

async function buildPayload(
  msg: FetchMessageObject,
): Promise<GmailEmailPayload | null> {
  if (!msg.source) return null
  const parsed = await simpleParser(msg.source as Buffer)

  const messageId =
    typeof parsed.messageId === "string"
      ? parsed.messageId.replace(/[<>]/g, "")
      : ""

  const headers: Record<string, string> = {}
  parsed.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = String(v)
  })

  // mailparser exposes `references` as string or string[]
  let references: string[] = []
  const refRaw = parsed.references
  if (Array.isArray(refRaw)) {
    references = refRaw.map((r) => r.replace(/[<>]/g, ""))
  } else if (typeof refRaw === "string") {
    references = refRaw
      .split(/\s+/)
      .map((r) => r.replace(/[<>]/g, ""))
      .filter(Boolean)
  }

  const inReplyTo =
    typeof parsed.inReplyTo === "string"
      ? parsed.inReplyTo.replace(/[<>]/g, "")
      : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toField = parsed.to as any
  const toList: Array<{ name: string | null; email: string }> = Array.isArray(
    toField?.value,
  )
    ? toField.value.map(
        (a: { name?: string; address?: string }) => ({
          name: a.name ?? null,
          email: String(a.address ?? "").toLowerCase(),
        }),
      )
    : []

  // mailparser's date can be Date | string | undefined
  const date =
    parsed.date instanceof Date
      ? parsed.date.toISOString()
      : typeof parsed.date === "string"
      ? new Date(parsed.date).toISOString()
      : (msg.internalDate instanceof Date
          ? msg.internalDate
          : new Date()
        ).toISOString()

  return {
    messageId,
    threadId: msg.threadId ? String(msg.threadId) : null,
    from: pickAddress(parsed.from),
    to: toList,
    subject: parsed.subject ?? "",
    body: parsed.text ?? "",
    inReplyTo,
    references,
    date,
    rawHeaders: headers,
  }
}
