# Phase D — Route Jobs
**Date:** 2026-04-11
**Status:** Approved
**Depends on:** Phase A
**Unlocks:** Waste disposal, delivery drivers, district nurses, any multi-stop workflow

---

## Goal

A job can have one location (appointment) or N ordered locations (route). The routing engine calculates travel time between stops, optionally optimises stop order, and tracks actual arrival/departure per stop.

---

## New Tables

### `jobLocations`
Ordered stops on a job. A single-location job has exactly one row. A route job has N rows.

```sql
jobLocations {
  id                  uuid PK
  jobId               uuid FK → jobs
  tenantId            uuid FK → tenants
  sequence            int  -- 1-based ordering
  type                enum: ORIGIN | PICKUP | DROPOFF | WAYPOINT | SITE | HOME | OFFICE | VENUE | VIRTUAL
  addressId           uuid FK → addresses
  label               text (nullable) -- 'Customer Site', 'Disposal Facility'
  scheduledArrival    timestamp (nullable)
  actualArrival       timestamp (nullable)
  scheduledDeparture  timestamp (nullable)
  actualDeparture     timestamp (nullable)
  durationMinutes     int (nullable) -- time spent at this stop
  notes               text (nullable)
  completedAt         timestamp (nullable)
  completedById       uuid FK → users (nullable)
  createdAt
}
```

### `routingConfigs`
Per-tenant routing settings. Determines which routing mode and cost model to use.

```sql
routingConfigs {
  id              uuid PK
  tenantId        uuid FK → tenants (unique)
  mode            enum: POINT_TO_POINT | ROUTE_OPTIMISATION | FLEET_DISPATCH
  costStrategy    enum: NONE | TIME_BASED | DISTANCE_BASED | LOOKUP_TABLE
  lookupTableId   uuid FK → splitLookupTables (nullable)
  provider        enum: MAPBOX | GOOGLE_MAPS | HERE  default: MAPBOX
  paddingMinutes  int default 15  -- buffer between job stops
  defaultOriginAddressId uuid FK → addresses (nullable)  -- fallback start location
  createdAt, updatedAt
}
```

---

## Routing Engine

### Location
```
src/modules/scheduling/lib/routing-engine.ts
```

### Three Modes

**MODE 1: POINT_TO_POINT**
Used for: appointment travel time, mobile engineer driving to customer.
```typescript
async function getPointToPointTravel(
  originAddressId: string,
  destinationAddressId: string,
  tenantId: string
): Promise<{ durationMinutes: number; distanceMiles: number; cost: number }>
```
- Resolves addresses from DB (uses cached lat/lng)
- Calls Mapbox Directions API
- Calculates cost via cost strategy (NONE = 0, TIME_BASED = lookup table, DISTANCE_BASED = rate × miles)
- Caches result on the `jobLocations` row

**MODE 2: ROUTE_OPTIMISATION**
Used for: waste disposal, delivery rounds, district nurse rounds.
```typescript
async function optimiseRoute(
  resourceId: string,
  jobLocationIds: string[],
  tenantId: string
): Promise<{ orderedSequence: string[]; totalDurationMinutes: number; totalDistanceMiles: number }>
```
- Fetches all addresses for the job locations
- Calls Mapbox Optimisation API (or nearest-neighbour fallback if >12 stops)
- Returns new sequence order — updates `jobLocations.sequence` accordingly
- Updates `scheduledArrival` per stop based on optimised route

**MODE 3: FLEET_DISPATCH**
Used for: emergency plumber, taxi, breakdown recovery.
```typescript
async function findNearestAvailableResource(
  jobAddressId: string,
  requiredSkillTags: string[],
  requiredCertifications: string[],
  tenantId: string
): Promise<{ resourceId: string; etaMinutes: number }>
```
- Queries all resources where `isActive = true` and not currently assigned to IN_PROGRESS job
- Filters by `skillTags` and `certifications` if specified
- Calculates ETA for each candidate (point-to-point from resource current/home location)
- Returns closest match

---

## Job Creation Changes

When creating a job, the client can optionally provide `locations: JobLocationInput[]`:

```typescript
const jobCreateSchema = z.object({
  // ...existing fields
  locations: z.array(z.object({
    type: jobLocationTypeEnum,
    addressId: z.uuid().optional(),
    address: addressCreateSchema.optional(), // inline address creation
    label: z.string().optional(),
    scheduledArrival: z.date().optional(),
    durationMinutes: z.number().optional(),
    notes: z.string().optional(),
  })).optional()
})
```

If `locations` is omitted → create one `jobLocations` row from existing `primaryAddressId` (backwards compatible).
If `locations` provided → create rows with sequence 1, 2, 3...

After creation, if `routingConfig.mode = ROUTE_OPTIMISATION`, automatically trigger `job/route-optimise` Inngest event.

---

## Driver / Mobile View

New router procedure for field staff:

```typescript
jobs.getMyRoute  // returns jobs for today with all locations, ordered by scheduledArrival
jobs.arriveAtStop(jobId, locationId)    // sets actualArrival = now
jobs.departFromStop(jobId, locationId) // sets actualDeparture = now, advances to next stop
```

Notification trigger (Phase C): on `job/stop-departed`, send ETA notification to next stop contact if `customerContact.receivesNotifications = true`.

---

## Module Changes

### `scheduling` module
- Add `routing-engine.ts` to `lib/`
- Add `routingConfigs` CRUD to repository and router
- Update `scheduling.service.ts` to call routing engine on job creation/assignment

### `jobs` module
- Update `createJob` to accept and persist `locations`
- Add `arriveAtStop`, `departFromStop` procedures to router
- Update job completion: all stops must be `completedAt` before job can transition to COMPLETED

---

## Tests

`routing-engine.test.ts`:
- Point-to-point: returns duration and distance for known postcodes
- Point-to-point: uses cached lat/lng, does not re-geocode
- Point-to-point: cost calculated correctly for TIME_BASED strategy
- Point-to-point: cost = 0 for NONE strategy
- Route optimisation: returns reordered sequence
- Route optimisation: updates scheduledArrival per stop
- Fleet dispatch: returns nearest resource with required skills
- Fleet dispatch: excludes resources with expired certifications
- Fleet dispatch: excludes resources currently IN_PROGRESS

---

## Definition of Done

- [ ] `jobLocations` table created
- [ ] `routingConfigs` table created
- [ ] `routing-engine.ts` implemented with all 3 modes
- [ ] Job creation accepts optional `locations` array
- [ ] Backwards compatible: jobs without locations still work
- [ ] `arriveAtStop` and `departFromStop` procedures on jobs router
- [ ] Route optimisation triggered automatically via Inngest on job assignment
- [ ] Driver route view (`getMyRoute`) implemented
- [ ] ETA notification trigger wired via notification engine
- [ ] All tests pass
- [ ] tsc passes, build passes
