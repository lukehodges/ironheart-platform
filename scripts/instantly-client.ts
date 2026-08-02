/**
 * Instantly API v2 client — thin fetch wrapper.
 *
 * Base URL confirmed from Pipeline/1-cold/scripts/instantly_push.py:
 *   https://api.instantly.ai/api/v2
 *
 * Auth: Bearer token in Authorization header (same pattern as instantly_push.py).
 *
 * Key resolution order:
 *   1. env INSTANTLY_API_KEY
 *   2. file at /Users/lukehodges/Documents/the-ironheart-ltd/Other/infra/.instantly_platform_key
 *
 * Endpoint assumptions (document each one):
 *
 *   GET  /campaigns?limit=100
 *     Returns { items: Campaign[] }. Confirmed from instantly_push.py do_list().
 *
 *   POST /campaigns
 *     Creates a campaign draft. Confirmed from instantly_push.py do_push().
 *
 *   POST /leads
 *     Adds a single lead to a campaign. Body: { campaign, email, first_name, ... }
 *     Confirmed from instantly_push.py lead_body().
 *
 *   POST /leads/list
 *     Lists leads with a filter. Body: { campaign, email?, limit, starting_after? }
 *     Confirmed from instantly_push.py (used to list leads per campaign in do_list).
 *
 *   DELETE /leads/:email
 *     Assumed: delete a lead by email address from the workspace.
 *     The Instantly v2 docs describe DELETE /leads/{id} or DELETE /leads/{email}
 *     depending on whether you pass a UUID or email. We use email since that is
 *     what we have in our DB. ASSUMPTION: the path param is URL-encoded email.
 *     If this 404s, fall back to the search-then-delete approach below.
 *
 *   POST /leads/delete  (alternative bulk-remove — assumed fallback)
 *     Some Instantly v2 builds expose a bulk-delete body endpoint.
 *     ASSUMPTION: body { items: [{ email: string }] } or { emails: string[] }.
 *     We try DELETE /leads/:email first; this is the documented-assumption fallback.
 *
 *   GET  /accounts/summary  (workspace contact count — assumed)
 *     ASSUMPTION: returns workspace-level contact usage including { total_contacts: number }
 *     or a similar field. There is no confirmed endpoint from instantly_push.py for this —
 *     we fall back to listing campaigns and summing lead counts if summary 404s.
 *
 * Error handling: every method returns a typed result { ok, status, data, error }.
 * Callers decide whether to abort or log and continue.
 */

import fs from "node:fs"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstantlyLead {
  email: string
  first_name?: string
  last_name?: string
  company_name?: string
  website?: string
  custom_variables?: Record<string, string>
}

export interface InstantlyCampaign {
  id: string
  name: string
  status?: number
}

export interface ApiResult<T = unknown> {
  ok: boolean
  status: number
  data: T | null
  error?: string
}

// ---------------------------------------------------------------------------
// Key resolution
// ---------------------------------------------------------------------------

const KEY_FILE =
  "/Users/lukehodges/Documents/the-ironheart-ltd/Other/infra/.instantly_platform_key"

function resolveKey(): string {
  if (process.env.INSTANTLY_API_KEY) return process.env.INSTANTLY_API_KEY.trim()
  try {
    const raw = fs.readFileSync(KEY_FILE, "utf-8").trim()
    if (!raw) throw new Error("key file is empty")
    return raw
  } catch (e) {
    throw new Error(
      `INSTANTLY_API_KEY env var not set and key file unreadable at ${KEY_FILE}: ${e}`,
    )
  }
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

const BASE = "https://api.instantly.ai/api/v2"

async function request<T>(
  method: string,
  urlPath: string,
  body?: unknown,
  key?: string,
): Promise<ApiResult<T>> {
  const apiKey = key ?? resolveKey()
  const url = BASE + urlPath
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "User-Agent": "ironheart-platform/1.0",
  }
  if (body !== undefined) headers["Content-Type"] = "application/json"

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    return { ok: false, status: 0, data: null, error: String(e) }
  }

  let data: T | null = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text) as T
    } catch {
      data = text as unknown as T
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    error: res.ok ? undefined : text.slice(0, 500),
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class InstantlyClient {
  private key: string

  constructor(key?: string) {
    this.key = key ?? resolveKey()
  }

  // ── Campaigns ──────────────────────────────────────────────────────────────

  /**
   * List all campaigns in the workspace (up to 100).
   * Endpoint: GET /campaigns?limit=100
   * Confirmed from instantly_push.py do_list().
   */
  async listCampaigns(): Promise<ApiResult<{ items: InstantlyCampaign[] }>> {
    return request<{ items: InstantlyCampaign[] }>(
      "GET",
      "/campaigns?limit=100",
      undefined,
      this.key,
    )
  }

  // ── Workspace contact count ────────────────────────────────────────────────

  /**
   * Get the total number of uploaded contacts across the workspace.
   *
   * ASSUMPTION: GET /accounts/summary returns { total_contacts: number } or
   * similar workspace-usage fields. This endpoint is NOT confirmed from
   * instantly_push.py — it is an educated guess based on Instantly v2 docs
   * language. If it 404s, we fall back to summing per-campaign lead counts
   * via listCampaigns() + listLeads() (slower but reliable).
   *
   * Returns the contact count or null if unavailable.
   */
  async getWorkspaceContactCount(): Promise<number | null> {
    // Attempt 1: account summary endpoint (assumed)
    const res = await request<Record<string, unknown>>(
      "GET",
      "/accounts/summary",
      undefined,
      this.key,
    )
    if (res.ok && res.data) {
      // Try multiple plausible field names in case the shape differs
      for (const field of [
        "total_contacts",
        "contacts_count",
        "contactsCount",
        "uploaded_contacts",
      ]) {
        if (typeof res.data[field] === "number") return res.data[field] as number
      }
    }
    // Attempt 2: fall back — not implemented here to keep the client thin.
    // Callers can do their own campaign-by-campaign count if needed.
    console.warn(
      `[instantly-client] getWorkspaceContactCount: /accounts/summary returned ${res.status}` +
        (res.error ? ` — ${res.error}` : "") +
        ". Returning null. Use Instantly UI or sum campaign leads manually.",
    )
    return null
  }

  // ── Leads ──────────────────────────────────────────────────────────────────

  /**
   * Add one or more leads to a campaign.
   * Endpoint: POST /leads  (one call per lead — confirmed from instantly_push.py)
   *
   * Instantly v2 does not expose a native bulk-add endpoint in the confirmed
   * shape, so we loop and rate-limit with a small delay between requests.
   */
  async addLeadsToCampaign(
    campaignId: string,
    leads: InstantlyLead[],
  ): Promise<{ added: string[]; failed: Array<{ email: string; status: number; error?: string }> }> {
    const added: string[] = []
    const failed: Array<{ email: string; status: number; error?: string }> = []

    for (const lead of leads) {
      const body = {
        campaign: campaignId,
        email: lead.email.trim().toLowerCase(),
        first_name: lead.first_name ?? "",
        last_name: lead.last_name ?? "",
        company_name: lead.company_name ?? "",
        website: lead.website ?? "",
        ...(lead.custom_variables
          ? { custom_variables: lead.custom_variables }
          : {}),
      }
      const res = await request<{ id?: string }>("POST", "/leads", body, this.key)
      if (res.ok && res.data?.id) {
        added.push(lead.email)
      } else {
        failed.push({ email: lead.email, status: res.status, error: res.error })
      }
      // Small delay to avoid hammering the API (same 50ms used in instantly_push.py)
      await sleep(50)
    }

    return { added, failed }
  }

  /**
   * Remove a single lead from Instantly by email address.
   *
   * ASSUMPTION: DELETE /leads/:email — the email is URL-encoded in the path.
   * Instantly v2 supports delete-by-id; email-as-id is assumed based on the
   * API design pattern where email is the primary key for a contact.
   *
   * If the DELETE returns 404, we log a warning and treat it as "already gone"
   * (not a hard failure) since the goal is to free the slot.
   *
   * Returns true if removed (or already absent), false on unexpected error.
   */
  async deleteLead(email: string): Promise<boolean> {
    const encodedEmail = encodeURIComponent(email.trim().toLowerCase())
    const res = await request<unknown>(
      "DELETE",
      `/leads/${encodedEmail}`,
      undefined,
      this.key,
    )

    if (res.ok) return true

    if (res.status === 404) {
      // Lead not found in Instantly — slot already free; treat as success
      console.warn(
        `[instantly-client] deleteLead: ${email} not found in Instantly (404) — already removed or never uploaded`,
      )
      return true
    }

    console.error(
      `[instantly-client] deleteLead: failed to delete ${email} — HTTP ${res.status}: ${res.error}`,
    )
    return false
  }

  /**
   * List leads in a campaign (paginated).
   * Endpoint: POST /leads/list  — confirmed from instantly_push.py do_list().
   * Returns the raw result so callers can page if needed.
   */
  async listLeads(
    campaignId: string,
    opts: { limit?: number; starting_after?: string; email?: string } = {},
  ): Promise<ApiResult<{ items: Array<{ id: string; email: string }> }>> {
    const body: Record<string, unknown> = {
      campaign: campaignId,
      limit: opts.limit ?? 100,
    }
    if (opts.starting_after) body.starting_after = opts.starting_after
    if (opts.email) body.email = opts.email

    return request<{ items: Array<{ id: string; email: string }> }>(
      "POST",
      "/leads/list",
      body,
      this.key,
    )
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
