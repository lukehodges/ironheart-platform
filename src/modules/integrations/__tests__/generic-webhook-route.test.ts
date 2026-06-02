// src/modules/integrations/__tests__/generic-webhook-route.test.ts
/**
 * Smoke tests for the generic webhook ingest endpoint
 * (POST /api/webhooks/:source).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const ingestRawEvent = vi.fn().mockResolvedValue({
  rawEventId: "evt-1",
  deduplicated: false,
})
vi.mock("@/modules/jobs/ingest", () => ({ ingestRawEvent }))

const getProvider = vi.fn()
vi.mock("@/modules/integrations", () => ({ getProvider }))

vi.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

import { POST } from "@/app/api/webhooks/[source]/route"

function mkRequest(
  source: string,
  body: unknown,
  headers: Record<string, string> = {},
): { req: Request; params: Promise<{ source: string }> } {
  const req = new Request(`https://app.test/api/webhooks/${source}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { req: req as any, params: Promise.resolve({ source }) }
}

beforeEach(() => {
  ingestRawEvent.mockClear()
  getProvider.mockReset()
})

describe("POST /api/webhooks/[source]", () => {
  it("returns 404 for unknown source", async () => {
    getProvider.mockReturnValue(null)
    const { req, params } = mkRequest("nope", { id: "1", type: "x" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any, { params })
    expect(res.status).toBe(404)
    expect(ingestRawEvent).not.toHaveBeenCalled()
  })

  it("ingests payload for known source and returns 200", async () => {
    getProvider.mockReturnValue({ slug: "gmail" })
    const { req, params } = mkRequest("gmail", {
      id: "msg-1",
      type: "email.received",
      tenantId: "00000000-0000-0000-0000-000000000001",
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any, { params })
    expect(res.status).toBe(200)
    expect(ingestRawEvent).toHaveBeenCalledOnce()
    expect(ingestRawEvent.mock.calls[0][0]).toMatchObject({
      source: "gmail",
      sourceEventId: "msg-1",
      kind: "email.received",
      tenantId: "00000000-0000-0000-0000-000000000001",
    })
  })

  it("rejects with 401 when provider.verifyWebhook returns false", async () => {
    getProvider.mockReturnValue({
      slug: "stripe",
      verifyWebhook: vi.fn().mockResolvedValue(false),
    })
    const { req, params } = mkRequest("stripe", { id: "evt_1", type: "x" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any, { params })
    expect(res.status).toBe(401)
    expect(ingestRawEvent).not.toHaveBeenCalled()
  })

  it("accepts when provider.verifyWebhook returns true", async () => {
    getProvider.mockReturnValue({
      slug: "stripe",
      verifyWebhook: vi.fn().mockResolvedValue(true),
    })
    const { req, params } = mkRequest("stripe", { id: "evt_1", type: "x" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any, { params })
    expect(res.status).toBe(200)
    expect(ingestRawEvent).toHaveBeenCalledOnce()
  })

  it("falls back to fallback id when payload lacks an id", async () => {
    getProvider.mockReturnValue({ slug: "gmail" })
    const { req, params } = mkRequest("gmail", { type: "email.received" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any, { params })
    expect(res.status).toBe(200)
    const call = ingestRawEvent.mock.calls[0][0]
    expect(typeof call.sourceEventId).toBe("string")
    expect(call.sourceEventId.length).toBeGreaterThan(0)
  })
})
