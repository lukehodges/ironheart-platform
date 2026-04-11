# Phase G — Field Service Billing
**Date:** 2026-04-11
**Status:** Approved
**Depends on:** Phase A, Phase B (split engine for TIME_AND_MATERIALS formula)
**Unlocks:** Plumbers, electricians, HVAC, IT MSP, installation engineers, any parts + labour billing

---

## Goal

Engineers clock in and out. They log parts used on the job. At completion, the invoice is auto-calculated: (hours × rate) + sum(materials). Resource certifications block assignment if qualifications are expired.

---

## New Tables

### `jobTimeEntries`
Clock-in/out records per resource per job.

```sql
jobTimeEntries {
  id              uuid PK
  jobId           uuid FK → jobs
  resourceId      uuid FK → resources
  tenantId        uuid FK → tenants
  startedAt       timestamp
  endedAt         timestamp (nullable)  -- null = currently clocked in
  durationMinutes int (nullable)        -- computed on clock-out
  billable        bool default true
  billedAt        timestamp (nullable)
  notes           text (nullable)
  createdAt
}
```

### `jobMaterials`
Parts and consumables used on a job.

```sql
jobMaterials {
  id              uuid PK
  jobId           uuid FK → jobs
  resourceId      uuid FK → resources (nullable)  -- who added it
  tenantId        uuid FK → tenants
  description     text
  partNumber      text (nullable)
  quantity        decimal(10,3)
  unitCost        decimal(10,2)
  totalCost       decimal(10,2)  -- quantity × unitCost
  supplierRef     text (nullable)
  billable        bool default true
  createdAt
}
```

### `resourceCertifications`
Qualifications held by a resource. Scheduling engine checks these before assignment.

```sql
resourceCertifications {
  id                uuid PK
  resourceId        uuid FK → resources
  tenantId          uuid FK → tenants
  name              text  -- 'GAS_SAFE', 'ELECTRICAL_PART_P', 'DBS', 'FIRST_AID', 'ASBESTOS_AWARENESS'
  issuedAt          date
  expiresAt         date (nullable)  -- null = does not expire
  licenceNumber     text (nullable)
  documentUrl       text (nullable)
  verifiedAt        timestamp (nullable)
  verifiedById      uuid FK → users (nullable)
  createdAt
}
```

### `serviceCertificationRequirements`
Which certifications are required to perform a given service.

```sql
serviceCertificationRequirements {
  id              uuid PK
  serviceId       uuid FK → services
  tenantId        uuid FK → tenants
  certificationName text  -- must match resourceCertifications.name
  isRequired      bool default true
}
```

---

## Time Tracking

### Clock In/Out

```typescript
// jobs router
jobs.clockIn(jobId: string, resourceId: string): Promise<JobTimeEntry>
// Creates jobTimeEntries row with startedAt = now, endedAt = null

jobs.clockOut(jobId: string, timeEntryId: string): Promise<JobTimeEntry>
// Sets endedAt = now, computes durationMinutes
// If job has no other open time entries → emit job/all-clocked-out
```

### Rules
- A resource can only have one open time entry (no endedAt) per job at a time
- Clock-out is required before job can be marked COMPLETED
- Billable hours = sum of `durationMinutes WHERE billable = true` / 60

---

## Materials Logging

```typescript
jobs.addMaterial(input: AddMaterialInput): Promise<JobMaterial>
// Validates: quantity > 0, unitCost >= 0
// Computes totalCost = quantity × unitCost

jobs.removeMaterial(materialId: string): Promise<void>
// Only allowed if job is not yet COMPLETED
```

---

## TIME_AND_MATERIALS Invoice Calculation

The split engine's `FORMULA` rule type evaluates:

```
(timeEntries.billableHours * resource.hourlyRate) + materials.totalCost
```

`resource.hourlyRate` is stored in `resources.metadata.hourlyRate` (number).

At job completion, `jobService.completeJob()` calls `evaluateSplitRules()` which resolves this formula via `SplitInput.timeEntries` and `SplitInput.materials`. No bespoke calculation code.

---

## Certification Enforcement

### Scheduling Engine Change

`schedulingService.findAvailableResources()` adds a certification check step:

```typescript
// For each candidate resource:
const requirements = await serviceRepo.getCertificationRequirements(serviceId)
for (const req of requirements) {
  const cert = resource.certifications.find(c => c.name === req.certificationName)
  if (!cert) return false  // missing cert
  if (cert.expiresAt && cert.expiresAt < today) return false  // expired
}
```

Manual assignment (`jobs.assignResource()`) also validates certifications and throws `BadRequestError` if unmet, with a clear message listing the missing/expired certs.

### Expiry Warnings

Inngest cron `checkCertificationExpiry` runs weekly:
- Finds all `resourceCertifications` where `expiresAt` is within 30 days
- Emits `resource/certification-expiring` event
- Notification trigger (configured in Phase C): sends email to manager + resource user

---

## Module Structure

```
src/modules/field-service/
  field-service.types.ts
  field-service.schemas.ts
  field-service.repository.ts  -- timeEntries + materials + certifications CRUD
  field-service.service.ts     -- clockIn, clockOut, addMaterial, getCertificationStatus
  field-service.router.ts
  field-service.events.ts      -- checkCertificationExpiry cron
  index.ts
  __tests__/
    field-service.service.test.ts
```

Certification CRUD also exposed via `resources` router (manage certs from resource profile page):
```typescript
resources.certifications.add
resources.certifications.update
resources.certifications.list
resources.certifications.delete
```

---

## Tests

`field-service.service.test.ts`:
- Clock in: creates open time entry
- Clock in: throws ConflictError if already clocked in
- Clock out: sets endedAt, computes durationMinutes correctly
- Clock out: throws NotFoundError for unknown entry
- Add material: computes totalCost correctly
- Add material: rejects quantity = 0
- Remove material: not allowed after COMPLETED
- TIME_AND_MATERIALS invoice: correct total for hours + materials
- Certification check: resource with valid cert → available
- Certification check: resource with expired cert → excluded from scheduling
- Certification check: resource missing required cert → excluded
- Manual assignment with missing cert → BadRequestError with cert name
- Expiry warning: cron finds cert expiring in 25 days, emits event

---

## Definition of Done

- [ ] `jobTimeEntries` table created
- [ ] `jobMaterials` table created
- [ ] `resourceCertifications` table created
- [ ] `serviceCertificationRequirements` table created
- [ ] Clock in/out procedures on jobs router
- [ ] Materials add/remove procedures on jobs router
- [ ] Certification CRUD on resources router
- [ ] `TIME_AND_MATERIALS` formula resolved correctly by split engine
- [ ] Scheduling engine enforces certification requirements
- [ ] Manual assignment validates certifications
- [ ] Cert expiry warning cron implemented
- [ ] Notification trigger for expiry warning seeded
- [ ] All tests pass
- [ ] tsc passes, build passes
