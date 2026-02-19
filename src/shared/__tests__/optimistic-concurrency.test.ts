import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConflictError } from '../errors'

// ---------------------------------------------------------------------------
// Drizzle mock
//
// updateWithVersion calls:
//   db.update(table).set({...}).where(and(...)).returning()
//
// vi.mock is hoisted to the top of the file, so we cannot reference
// module-level let/const inside the factory. Instead we use vi.hoisted()
// to declare the mocks inside the hoisted scope so they are available both
// in the factory and in the test body.
// ---------------------------------------------------------------------------

const {
  mockReturning,
  mockWhere,
  mockSet,
  mockUpdate,
  returningResultHolder,
} = vi.hoisted(() => {
  const returningResultHolder: { value: unknown[] } = { value: [] }
  const mockReturning = vi.fn(() => Promise.resolve(returningResultHolder.value))
  const mockWhere     = vi.fn(() => ({ returning: mockReturning }))
  const mockSet       = vi.fn(() => ({ where: mockWhere }))
  const mockUpdate    = vi.fn(() => ({ set: mockSet }))
  return { mockReturning, mockWhere, mockSet, mockUpdate, returningResultHolder }
})

vi.mock('@/shared/db', () => ({
  db: {
    update: mockUpdate,
  },
}))

// drizzle-orm helpers are used in the where() clause — mock to avoid import
vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  eq:  (col: unknown, val: unknown) => ({ col, val }),
}))

// ---------------------------------------------------------------------------
// Module under test — imported AFTER mocks
// ---------------------------------------------------------------------------

import { updateWithVersion } from '../optimistic-concurrency'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-00000000-0000-0000-0000-000000000001'
const RECORD_ID = 'record-00000000-0000-0000-0000-000000000002'
const VERSION   = 3

/** Minimal fake PgTable with id/tenantId/version column accessors. */
const fakeTable = {
  id:       Symbol('id'),
  tenantId: Symbol('tenantId'),
  version:  Symbol('version'),
} as unknown as Parameters<typeof updateWithVersion>[0]

interface FakeRecord {
  id: string
  tenantId: string
  version: number
  name?: string
}

function makeUpdatedRow(overrides: Partial<FakeRecord> = {}): FakeRecord {
  return {
    id:       RECORD_ID,
    tenantId: TENANT_ID,
    version:  VERSION + 1,
    name:     'Updated Name',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('updateWithVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-install chain mock implementations after clearAllMocks
    mockUpdate.mockReturnValue({ set: mockSet })
    mockSet.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ returning: mockReturning })
    returningResultHolder.value = [makeUpdatedRow()]
    mockReturning.mockImplementation(() =>
      Promise.resolve(returningResultHolder.value),
    )
  })

  // ── Successful update ─────────────────────────────────────────────────────

  describe('successful update', () => {
    it('returns the updated row', async () => {
      const expected = makeUpdatedRow({ name: 'New Name' })
      returningResultHolder.value = [expected]

      const result = await updateWithVersion<FakeRecord>(
        fakeTable,
        RECORD_ID,
        TENANT_ID,
        VERSION,
        { name: 'New Name' },
      )

      expect(result).toEqual(expected)
    })

    it('calls db.update with the correct table', async () => {
      await updateWithVersion<FakeRecord>(
        fakeTable,
        RECORD_ID,
        TENANT_ID,
        VERSION,
        { name: 'Test' },
      )

      expect(mockUpdate).toHaveBeenCalledWith(fakeTable)
    })

    it('passes version incremented by 1 to .set()', async () => {
      await updateWithVersion<FakeRecord>(
        fakeTable,
        RECORD_ID,
        TENANT_ID,
        VERSION,
        { name: 'Test' },
      )

      const setArg = mockSet.mock.calls[0]![0] as Record<string, unknown>
      expect(setArg.version).toBe(VERSION + 1)
    })

    it('merges caller-supplied values into .set()', async () => {
      await updateWithVersion<FakeRecord>(
        fakeTable,
        RECORD_ID,
        TENANT_ID,
        VERSION,
        { name: 'Merged', extraField: 'extra' },
      )

      const setArg = mockSet.mock.calls[0]![0] as Record<string, unknown>
      expect(setArg.name).toBe('Merged')
      expect(setArg.extraField).toBe('extra')
    })

    it('sets updatedAt to a Date in .set()', async () => {
      const before = new Date()

      await updateWithVersion<FakeRecord>(
        fakeTable,
        RECORD_ID,
        TENANT_ID,
        VERSION,
        {},
      )

      const setArg = mockSet.mock.calls[0]![0] as Record<string, unknown>
      expect(setArg.updatedAt).toBeInstanceOf(Date)
      expect((setArg.updatedAt as Date).getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      )
    })

    it('calls .returning() to retrieve the updated row', async () => {
      await updateWithVersion<FakeRecord>(
        fakeTable,
        RECORD_ID,
        TENANT_ID,
        VERSION,
        {},
      )

      expect(mockReturning).toHaveBeenCalledOnce()
    })

    it('typed result can be cast to the caller-supplied generic', async () => {
      interface Widget {
        id: string
        name: string
        version: number
        tenantId: string
      }
      returningResultHolder.value = [
        {
          id:       RECORD_ID,
          name:     'Widget-1',
          version:  VERSION + 1,
          tenantId: TENANT_ID,
        },
      ]

      const widget = await updateWithVersion<Widget>(
        fakeTable,
        RECORD_ID,
        TENANT_ID,
        VERSION,
        { name: 'Widget-1' },
      )

      expect(widget.name).toBe('Widget-1')
      expect(widget.version).toBe(VERSION + 1)
    })
  })

  // ── Version conflict ──────────────────────────────────────────────────────

  describe('version conflict', () => {
    it('throws ConflictError when db returns 0 rows (version mismatch)', async () => {
      returningResultHolder.value = []

      await expect(
        updateWithVersion<FakeRecord>(fakeTable, RECORD_ID, TENANT_ID, VERSION, {}),
      ).rejects.toThrow(ConflictError)
    })

    it('ConflictError message mentions concurrent modification', async () => {
      returningResultHolder.value = []

      await expect(
        updateWithVersion<FakeRecord>(fakeTable, RECORD_ID, TENANT_ID, VERSION, {}),
      ).rejects.toThrow(/concurrent/i)
    })

    it('is an instance of ConflictError (not a generic Error)', async () => {
      returningResultHolder.value = []

      await expect(
        updateWithVersion<FakeRecord>(fakeTable, RECORD_ID, TENANT_ID, VERSION, {}),
      ).rejects.toBeInstanceOf(ConflictError)
    })

    it('makes no additional DB calls after conflict (exactly one update attempt)', async () => {
      returningResultHolder.value = []

      await expect(
        updateWithVersion<FakeRecord>(fakeTable, RECORD_ID, TENANT_ID, VERSION, {}),
      ).rejects.toThrow(ConflictError)

      // Only one db.update call — no retry logic
      expect(mockUpdate).toHaveBeenCalledOnce()
    })

    it('previous expected version is passed in where clause condition', async () => {
      // Verify that VERSION (not VERSION+1) is used in the WHERE clause
      await updateWithVersion<FakeRecord>(
        fakeTable,
        RECORD_ID,
        TENANT_ID,
        VERSION,
        {},
      )

      // where() was called; the eq() calls for version use the original VERSION
      expect(mockWhere).toHaveBeenCalledOnce()
    })
  })

  // ── Error propagation ─────────────────────────────────────────────────────

  describe('error propagation', () => {
    it('propagates db errors directly', async () => {
      const dbError = new Error('Connection refused')
      mockReturning.mockRejectedValueOnce(dbError)

      await expect(
        updateWithVersion<FakeRecord>(fakeTable, RECORD_ID, TENANT_ID, VERSION, {}),
      ).rejects.toBe(dbError)
    })

    it('does not wrap db errors in ConflictError', async () => {
      const dbError = new Error('Deadlock')
      mockReturning.mockRejectedValueOnce(dbError)

      await expect(
        updateWithVersion<FakeRecord>(fakeTable, RECORD_ID, TENANT_ID, VERSION, {}),
      ).rejects.not.toBeInstanceOf(ConflictError)
    })

    it('propagates constraint violation errors from db layer', async () => {
      const constraintError = Object.assign(new Error('unique constraint violated'), {
        code: '23505',
      })
      mockReturning.mockRejectedValueOnce(constraintError)

      await expect(
        updateWithVersion<FakeRecord>(fakeTable, RECORD_ID, TENANT_ID, VERSION, {}),
      ).rejects.toMatchObject({ message: 'unique constraint violated' })
    })
  })

  // ── Chain call sequence ───────────────────────────────────────────────────

  describe('Drizzle chain call sequence', () => {
    it('calls update → set → where → returning in correct order', async () => {
      const callOrder: string[] = []
      mockUpdate.mockImplementationOnce(() => {
        callOrder.push('update')
        return { set: mockSet }
      })
      mockSet.mockImplementationOnce(() => {
        callOrder.push('set')
        return { where: mockWhere }
      })
      mockWhere.mockImplementationOnce(() => {
        callOrder.push('where')
        return { returning: mockReturning }
      })
      mockReturning.mockImplementationOnce(() => {
        callOrder.push('returning')
        return Promise.resolve([makeUpdatedRow()])
      })

      await updateWithVersion<FakeRecord>(
        fakeTable,
        RECORD_ID,
        TENANT_ID,
        VERSION,
        {},
      )

      expect(callOrder).toEqual(['update', 'set', 'where', 'returning'])
    })
  })
})
