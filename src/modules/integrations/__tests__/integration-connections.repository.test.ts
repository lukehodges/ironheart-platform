// src/modules/integrations/__tests__/integration-connections.repository.test.ts
/**
 * Smoke tests for integrationConnectionsRepository. We mock @/shared/db
 * so these run as unit tests without a live Postgres.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── DB mock ──────────────────────────────────────────────────────────────────

const insertedRows: Array<Record<string, unknown>> = []
const updateCalls: Array<{ where: unknown; set: Record<string, unknown> }> = []
const dbRows: Array<Record<string, unknown>> = []

vi.mock("@/shared/db", () => {
  function mkBuilder() {
    return {
      values(v: Record<string, unknown>) {
        const row = {
          id: "00000000-0000-0000-0000-000000000aaa",
          tenantId: v.tenantId,
          userId: v.userId ?? null,
          providerSlug: v.providerSlug,
          name: v.name,
          config: v.config ?? {},
          secretsRef: v.secretsRef ?? null,
          enabled: true,
          syncCursor: {},
          lastSyncAt: null,
          lastSyncError: null,
          installedAt: new Date(),
          updatedAt: new Date(),
        }
        insertedRows.push(row)
        dbRows.push(row)
        return { returning: async () => [row] }
      },
    }
  }

  function selectChain(rows: typeof dbRows) {
    const chain = {
      from: () => chain,
      where: () => chain,
      limit: async () => rows,
      then: (cb: (v: unknown) => unknown) => Promise.resolve(rows).then(cb),
    }
    return chain
  }

  function updateChain() {
    let setData: Record<string, unknown> = {}
    const chain = {
      set(v: Record<string, unknown>) {
        setData = v
        return chain
      },
      where(w: unknown) {
        updateCalls.push({ where: w, set: setData })
        return Promise.resolve()
      },
    }
    return chain
  }

  return {
    db: {
      insert: () => mkBuilder(),
      select: () => selectChain(dbRows),
      update: () => updateChain(),
    },
  }
})

vi.mock("@/shared/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}))

import { integrationConnectionsRepository } from "../integration-connections.repository"

const TENANT_ID = "00000000-0000-0000-0000-000000000001"

beforeEach(() => {
  insertedRows.length = 0
  updateCalls.length = 0
  dbRows.length = 0
})

describe("integrationConnectionsRepository", () => {
  it("createConnection inserts and returns the row", async () => {
    const row = await integrationConnectionsRepository.createConnection({
      tenantId: TENANT_ID,
      providerSlug: "gmail",
      name: "Luke Inbox",
      config: { email: "luke@example.com" },
      secretsRef: "GMAIL_APP_PWD_LUKE",
    })

    expect(insertedRows).toHaveLength(1)
    expect(row.providerSlug).toBe("gmail")
    expect(row.name).toBe("Luke Inbox")
    expect(row.secretsRef).toBe("GMAIL_APP_PWD_LUKE")
  })

  it("updateCursor records cursor + lastSyncAt and clears error", async () => {
    await integrationConnectionsRepository.updateCursor(
      "00000000-0000-0000-0000-000000000aaa",
      { lastUid: 42, sinceDate: "2026-05-31T00:00:00.000Z" },
    )

    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]?.set).toMatchObject({
      syncCursor: { lastUid: 42, sinceDate: "2026-05-31T00:00:00.000Z" },
      lastSyncError: null,
    })
    expect(updateCalls[0]?.set.lastSyncAt).toBeInstanceOf(Date)
  })

  it("recordSyncError sets lastSyncError + lastSyncAt", async () => {
    await integrationConnectionsRepository.recordSyncError(
      "00000000-0000-0000-0000-000000000aaa",
      "IMAP timeout",
    )
    expect(updateCalls[0]?.set.lastSyncError).toBe("IMAP timeout")
  })

  it("enable + disable both write the enabled flag", async () => {
    await integrationConnectionsRepository.enable(
      "00000000-0000-0000-0000-000000000aaa",
      TENANT_ID,
    )
    await integrationConnectionsRepository.disable(
      "00000000-0000-0000-0000-000000000aaa",
      TENANT_ID,
    )
    expect(updateCalls[0]?.set.enabled).toBe(true)
    expect(updateCalls[1]?.set.enabled).toBe(false)
  })
})
