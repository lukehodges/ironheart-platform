import { describe, it, expect } from 'vitest'
import { selectStaff } from '../lib/smart-assignment'
import type { StaffCandidate, AssignmentContext } from '../scheduling.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStaff(overrides: Partial<StaffCandidate> = {}): StaffCandidate {
  return {
    userId:         'staff-1',
    lastAssignedAt: null,
    bookingsToday:  0,
    skills:         [],
    homeLatitude:   null,
    homeLongitude:  null,
    ...overrides,
  }
}

function makeCtx(overrides: Partial<AssignmentContext> = {}): AssignmentContext {
  return {
    serviceId:         'svc-1',
    requiredSkills:    [],
    customerLatitude:  undefined,
    customerLongitude: undefined,
    preferredStaffId:  undefined,
    date:              '2026-06-15',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// No candidates
// ---------------------------------------------------------------------------

describe('selectStaff — no candidates', () => {
  it('returns null when candidate list is empty for any strategy', () => {
    const ctx = makeCtx()
    expect(selectStaff([], 'ROUND_ROBIN',  ctx)).toBeNull()
    expect(selectStaff([], 'LEAST_LOADED', ctx)).toBeNull()
    expect(selectStaff([], 'SKILL_MATCH',  ctx)).toBeNull()
    expect(selectStaff([], 'GEOGRAPHIC',   ctx)).toBeNull()
    expect(selectStaff([], 'PREFERRED',    ctx)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Single candidate
// ---------------------------------------------------------------------------

describe('selectStaff — single candidate', () => {
  it('always returns the single candidate regardless of strategy', () => {
    const staff = makeStaff({ userId: 'only-one' })
    const ctx   = makeCtx()

    expect(selectStaff([staff], 'ROUND_ROBIN',  ctx)?.userId).toBe('only-one')
    expect(selectStaff([staff], 'LEAST_LOADED', ctx)?.userId).toBe('only-one')
    expect(selectStaff([staff], 'SKILL_MATCH',  ctx)?.userId).toBe('only-one')
    expect(selectStaff([staff], 'GEOGRAPHIC',   ctx)?.userId).toBe('only-one')
  })
})

// ---------------------------------------------------------------------------
// PREFERRED strategy
// ---------------------------------------------------------------------------

describe('selectStaff — PREFERRED strategy', () => {
  it('returns the preferred staff when they are in the candidate list', () => {
    const alice = makeStaff({ userId: 'alice' })
    const bob   = makeStaff({ userId: 'bob' })
    const ctx   = makeCtx({ preferredStaffId: 'bob' })

    const result = selectStaff([alice, bob], 'PREFERRED', ctx)
    expect(result?.userId).toBe('bob')
  })

  it('falls back to round-robin when preferred staff is not in candidate list', () => {
    const alice = makeStaff({ userId: 'alice', lastAssignedAt: null })
    const bob   = makeStaff({ userId: 'bob',   lastAssignedAt: new Date('2026-01-01') })
    const ctx   = makeCtx({ preferredStaffId: 'charlie' }) // charlie not in list

    const result = selectStaff([alice, bob], 'PREFERRED', ctx)
    // Round-robin picks null lastAssignedAt first → alice
    expect(result?.userId).toBe('alice')
  })

  it('falls back to round-robin when preferredStaffId is not set', () => {
    const alice = makeStaff({ userId: 'alice', lastAssignedAt: new Date('2026-01-01') })
    const bob   = makeStaff({ userId: 'bob',   lastAssignedAt: null })
    const ctx   = makeCtx({ preferredStaffId: undefined })

    const result = selectStaff([alice, bob], 'PREFERRED', ctx)
    // Round-robin: bob has null lastAssignedAt → bob wins
    expect(result?.userId).toBe('bob')
  })

  it('returns correct staff when multiple candidates and preferred is first', () => {
    const alice = makeStaff({ userId: 'alice' })
    const bob   = makeStaff({ userId: 'bob' })
    const carol = makeStaff({ userId: 'carol' })
    const ctx   = makeCtx({ preferredStaffId: 'alice' })

    expect(selectStaff([alice, bob, carol], 'PREFERRED', ctx)?.userId).toBe('alice')
  })
})

// ---------------------------------------------------------------------------
// ROUND_ROBIN strategy
// ---------------------------------------------------------------------------

describe('selectStaff — ROUND_ROBIN strategy', () => {
  it('picks the candidate with null lastAssignedAt (never assigned) first', () => {
    const alice = makeStaff({ userId: 'alice', lastAssignedAt: new Date('2026-01-10') })
    const bob   = makeStaff({ userId: 'bob',   lastAssignedAt: null })
    const ctx   = makeCtx()

    expect(selectStaff([alice, bob], 'ROUND_ROBIN', ctx)?.userId).toBe('bob')
  })

  it('picks the candidate with the oldest lastAssignedAt when none are null', () => {
    const alice = makeStaff({ userId: 'alice', lastAssignedAt: new Date('2026-01-05') })
    const bob   = makeStaff({ userId: 'bob',   lastAssignedAt: new Date('2026-01-10') })
    const carol = makeStaff({ userId: 'carol', lastAssignedAt: new Date('2026-01-01') })
    const ctx   = makeCtx()

    // carol has oldest assignment → selected
    expect(selectStaff([alice, bob, carol], 'ROUND_ROBIN', ctx)?.userId).toBe('carol')
  })

  it('returns the first candidate when all have null lastAssignedAt', () => {
    const alice = makeStaff({ userId: 'alice', lastAssignedAt: null })
    const bob   = makeStaff({ userId: 'bob',   lastAssignedAt: null })
    const ctx   = makeCtx()

    // Both null: reduce keeps current best (alice, first item)
    expect(selectStaff([alice, bob], 'ROUND_ROBIN', ctx)?.userId).toBe('alice')
  })

  it('picks the single staff with oldest assignment among many', () => {
    const staff = [
      makeStaff({ userId: 's1', lastAssignedAt: new Date('2026-02-01') }),
      makeStaff({ userId: 's2', lastAssignedAt: new Date('2025-12-01') }), // oldest
      makeStaff({ userId: 's3', lastAssignedAt: new Date('2026-01-15') }),
    ]
    const ctx = makeCtx()

    expect(selectStaff(staff, 'ROUND_ROBIN', ctx)?.userId).toBe('s2')
  })
})

// ---------------------------------------------------------------------------
// LEAST_LOADED strategy
// ---------------------------------------------------------------------------

describe('selectStaff — LEAST_LOADED strategy', () => {
  it('selects the staff member with the fewest bookings today', () => {
    const alice = makeStaff({ userId: 'alice', bookingsToday: 5 })
    const bob   = makeStaff({ userId: 'bob',   bookingsToday: 2 })
    const carol = makeStaff({ userId: 'carol', bookingsToday: 8 })
    const ctx   = makeCtx()

    expect(selectStaff([alice, bob, carol], 'LEAST_LOADED', ctx)?.userId).toBe('bob')
  })

  it('selects the first candidate on tie (reduce keeps current best)', () => {
    const alice = makeStaff({ userId: 'alice', bookingsToday: 3 })
    const bob   = makeStaff({ userId: 'bob',   bookingsToday: 3 })
    const ctx   = makeCtx()

    // alice is first with 3 bookings; bob also 3 but reduce only swaps on strict less-than
    expect(selectStaff([alice, bob], 'LEAST_LOADED', ctx)?.userId).toBe('alice')
  })

  it('selects staff with 0 bookings over staff with any bookings', () => {
    const alice = makeStaff({ userId: 'alice', bookingsToday: 1 })
    const bob   = makeStaff({ userId: 'bob',   bookingsToday: 0 })
    const ctx   = makeCtx()

    expect(selectStaff([alice, bob], 'LEAST_LOADED', ctx)?.userId).toBe('bob')
  })

  it('works correctly with a single staff member', () => {
    const alice = makeStaff({ userId: 'alice', bookingsToday: 10 })
    expect(selectStaff([alice], 'LEAST_LOADED', makeCtx())?.userId).toBe('alice')
  })
})

// ---------------------------------------------------------------------------
// SKILL_MATCH strategy
// ---------------------------------------------------------------------------

describe('selectStaff — SKILL_MATCH strategy', () => {
  it('selects staff who has all required skills', () => {
    const alice = makeStaff({ userId: 'alice', skills: ['massage', 'aromatherapy'] })
    const bob   = makeStaff({ userId: 'bob',   skills: ['massage'] })
    const ctx   = makeCtx({ requiredSkills: ['massage', 'aromatherapy'] })

    expect(selectStaff([alice, bob], 'SKILL_MATCH', ctx)?.userId).toBe('alice')
  })

  it('excludes staff missing any required skill', () => {
    const alice = makeStaff({ userId: 'alice', skills: ['massage'] })           // missing aromatherapy
    const bob   = makeStaff({ userId: 'bob',   skills: ['massage', 'aromatherapy'] }) // has all
    const ctx   = makeCtx({ requiredSkills: ['massage', 'aromatherapy'] })

    expect(selectStaff([alice, bob], 'SKILL_MATCH', ctx)?.userId).toBe('bob')
  })

  it('falls back to round-robin when no staff has all required skills', () => {
    const alice = makeStaff({ userId: 'alice', skills: ['massage'],             lastAssignedAt: null })
    const bob   = makeStaff({ userId: 'bob',   skills: ['aromatherapy'],        lastAssignedAt: new Date('2026-01-01') })
    const ctx   = makeCtx({ requiredSkills: ['massage', 'aromatherapy'] })

    // No qualified → falls back to roundRobin → alice (null lastAssignedAt)
    const result = selectStaff([alice, bob], 'SKILL_MATCH', ctx)
    expect(result?.userId).toBe('alice')
  })

  it('returns any staff when requiredSkills is empty (falls back to round-robin)', () => {
    // When requiredSkills is empty, skillMatch returns null → falls back to roundRobin
    const alice = makeStaff({ userId: 'alice', skills: [],       lastAssignedAt: null })
    const bob   = makeStaff({ userId: 'bob',   skills: ['yoga'], lastAssignedAt: new Date() })
    const ctx   = makeCtx({ requiredSkills: [] })

    // Empty requiredSkills → skillMatch returns null → roundRobin → alice
    const result = selectStaff([alice, bob], 'SKILL_MATCH', ctx)
    expect(result).not.toBeNull()
  })

  it('matches staff with extra skills beyond requirements', () => {
    const alice = makeStaff({ userId: 'alice', skills: ['massage', 'yoga', 'pilates'] })
    const ctx   = makeCtx({ requiredSkills: ['massage'] })

    expect(selectStaff([alice], 'SKILL_MATCH', ctx)?.userId).toBe('alice')
  })

  it('when multiple qualified, uses round-robin among them (oldest lastAssignedAt)', () => {
    const alice = makeStaff({ userId: 'alice', skills: ['massage', 'yoga'], lastAssignedAt: new Date('2026-01-10') })
    const bob   = makeStaff({ userId: 'bob',   skills: ['massage', 'yoga'], lastAssignedAt: new Date('2026-01-05') })
    const carol = makeStaff({ userId: 'carol', skills: ['massage'],         lastAssignedAt: null }) // missing yoga
    const ctx   = makeCtx({ requiredSkills: ['massage', 'yoga'] })

    // Qualified: alice, bob (carol excluded); round-robin picks bob (older lastAssignedAt)
    expect(selectStaff([alice, bob, carol], 'SKILL_MATCH', ctx)?.userId).toBe('bob')
  })
})

// ---------------------------------------------------------------------------
// GEOGRAPHIC strategy
// ---------------------------------------------------------------------------

describe('selectStaff — GEOGRAPHIC strategy', () => {
  // London: 51.5074, -0.1278
  // Manchester: 53.4808, -2.2426  (~265 km from London)
  // Birmingham: 52.4862, -1.8904  (~160 km from London)

  it('selects the staff member closest to the customer location', () => {
    const london     = makeStaff({ userId: 'london-staff',     homeLatitude: 51.5074,  homeLongitude: -0.1278  })
    const manchester = makeStaff({ userId: 'manchester-staff', homeLatitude: 53.4808,  homeLongitude: -2.2426  })
    const ctx = makeCtx({
      customerLatitude:  51.5074, // customer is in London
      customerLongitude: -0.1278,
    })

    expect(selectStaff([manchester, london], 'GEOGRAPHIC', ctx)?.userId).toBe('london-staff')
  })

  it('excludes staff without homeLatitude/homeLongitude coordinates', () => {
    const noCoords = makeStaff({ userId: 'no-coords', homeLatitude: null, homeLongitude: null })
    const withCoords = makeStaff({ userId: 'with-coords', homeLatitude: 51.5074, homeLongitude: -0.1278 })
    const ctx = makeCtx({
      customerLatitude:  51.5074,
      customerLongitude: -0.1278,
    })

    expect(selectStaff([noCoords, withCoords], 'GEOGRAPHIC', ctx)?.userId).toBe('with-coords')
  })

  it('falls back to round-robin when no staff have coordinates', () => {
    const alice = makeStaff({ userId: 'alice', homeLatitude: null, homeLongitude: null, lastAssignedAt: null })
    const bob   = makeStaff({ userId: 'bob',   homeLatitude: null, homeLongitude: null, lastAssignedAt: new Date() })
    const ctx   = makeCtx({ customerLatitude: 51.5, customerLongitude: -0.1 })

    // geographic returns null → falls back to roundRobin → alice (null lastAssignedAt)
    expect(selectStaff([alice, bob], 'GEOGRAPHIC', ctx)?.userId).toBe('alice')
  })

  it('falls back to round-robin when customerLatitude/Longitude not set', () => {
    const alice = makeStaff({ userId: 'alice', homeLatitude: 51.5, homeLongitude: -0.1, lastAssignedAt: null })
    const ctx   = makeCtx({ customerLatitude: undefined, customerLongitude: undefined })

    // No customer coords → geographic returns null → roundRobin → alice
    expect(selectStaff([alice], 'GEOGRAPHIC', ctx)?.userId).toBe('alice')
  })

  it('selects the closest of three staff by Haversine distance', () => {
    const london     = makeStaff({ userId: 'london',     homeLatitude: 51.5074, homeLongitude: -0.1278  })
    const manchester = makeStaff({ userId: 'manchester', homeLatitude: 53.4808, homeLongitude: -2.2426  })
    const birmingham = makeStaff({ userId: 'birmingham', homeLatitude: 52.4862, homeLongitude: -1.8904  })
    const ctx = makeCtx({
      customerLatitude:  51.5074, // customer is in London
      customerLongitude: -0.1278,
    })

    // London staff is at distance 0 km
    expect(selectStaff([manchester, birmingham, london], 'GEOGRAPHIC', ctx)?.userId).toBe('london')
  })

  it('correctly handles negative longitude values', () => {
    // West coast USA: Los Angeles 34.0522, -118.2437
    const la      = makeStaff({ userId: 'la',      homeLatitude: 34.0522, homeLongitude: -118.2437 })
    const seattle = makeStaff({ userId: 'seattle', homeLatitude: 47.6062, homeLongitude: -122.3321 })
    const ctx = makeCtx({
      customerLatitude:  34.0522, // customer in LA
      customerLongitude: -118.2437,
    })

    expect(selectStaff([la, seattle], 'GEOGRAPHIC', ctx)?.userId).toBe('la')
  })
})

// ---------------------------------------------------------------------------
// Default / unknown strategy
// ---------------------------------------------------------------------------

describe('selectStaff — unknown strategy falls back to round-robin', () => {
  it('uses round-robin for unrecognized strategy types', () => {
    const alice = makeStaff({ userId: 'alice', lastAssignedAt: null })
    const bob   = makeStaff({ userId: 'bob',   lastAssignedAt: new Date() })
    const ctx   = makeCtx()

    // Cast to bypass type safety
    const result = selectStaff([alice, bob], 'UNKNOWN' as 'ROUND_ROBIN', ctx)
    expect(result?.userId).toBe('alice')
  })
})
