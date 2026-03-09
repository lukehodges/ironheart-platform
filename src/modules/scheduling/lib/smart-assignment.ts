import type { StaffCandidate, AssignmentStrategyType, AssignmentContext } from '../scheduling.types'

/**
 * Select a staff member from candidates using the given strategy.
 * Returns null if no suitable candidate found.
 */
export function selectStaff(
  candidates: StaffCandidate[],
  strategy: AssignmentStrategyType,
  ctx: AssignmentContext
): StaffCandidate | null {
  if (candidates.length === 0) return null

  switch (strategy) {
    case 'PREFERRED':
      return preferred(candidates, ctx) ?? roundRobin(candidates)
    case 'ROUND_ROBIN':
      return roundRobin(candidates)
    case 'LEAST_LOADED':
      return leastLoaded(candidates)
    case 'SKILL_MATCH':
      return skillMatch(candidates, ctx) ?? roundRobin(candidates)
    case 'GEOGRAPHIC':
      return geographic(candidates, ctx) ?? roundRobin(candidates)
    default:
      return roundRobin(candidates)
  }
}

function preferred(candidates: StaffCandidate[], ctx: AssignmentContext): StaffCandidate | null {
  if (!ctx.preferredStaffId) return null
  return candidates.find((c) => c.userId === ctx.preferredStaffId) ?? null
}

function roundRobin(candidates: StaffCandidate[]): StaffCandidate {
  // Select candidate with earliest lastAssignedAt (null = never assigned = first priority)
  return candidates.reduce((best, c) => {
    if (!best.lastAssignedAt) return best
    if (!c.lastAssignedAt) return c
    return c.lastAssignedAt < best.lastAssignedAt ? c : best
  })
}

function leastLoaded(candidates: StaffCandidate[]): StaffCandidate {
  return candidates.reduce((best, c) =>
    c.bookingsToday < best.bookingsToday ? c : best
  )
}

function skillMatch(candidates: StaffCandidate[], ctx: AssignmentContext): StaffCandidate | null {
  if (!ctx.requiredSkills?.length) return null
  const qualified = candidates.filter((c) =>
    ctx.requiredSkills!.every((skill) => c.skills.includes(skill))
  )
  return qualified.length > 0 ? roundRobin(qualified) : null
}

function geographic(candidates: StaffCandidate[], ctx: AssignmentContext): StaffCandidate | null {
  if (ctx.customerLatitude == null || ctx.customerLongitude == null) return null

  const withDistance = candidates
    .filter((c) => c.homeLatitude != null && c.homeLongitude != null)
    .map((c) => ({
      candidate: c,
      distance: haversineKm(
        ctx.customerLatitude!,
        ctx.customerLongitude!,
        c.homeLatitude!,
        c.homeLongitude!
      ),
    }))
    .sort((a, b) => a.distance - b.distance)

  return withDistance[0]?.candidate ?? null
}

/** Haversine formula - distance in km between two lat/lng points */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R   = 6_371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
