# Phase E — Recurring Contracts
**Date:** 2026-04-11
**Status:** Approved
**Depends on:** Phase A
**Unlocks:** Weekly cleaners, monthly maintenance, retainer billing, care plans, annual services

---

## Goal

A client signs a contract once. Jobs are generated automatically on schedule forever. The client never books again. Invoices are generated on schedule, not per-job.

---

## New Tables

### `serviceContracts`
One row = one recurring engagement with a customer.

```sql
serviceContracts {
  id                  uuid PK
  tenantId            uuid FK → tenants
  customerId          uuid FK → customers
  serviceId           uuid FK → services
  name                text  -- 'Weekly Office Cleaning', 'Monthly Boiler Service'
  rrule               text  -- RFC 5545: 'FREQ=WEEKLY;BYDAY=MO,WE,FR', 'FREQ=MONTHLY;BYMONTHDAY=1'
  startDate           date
  endDate             date (nullable)  -- null = indefinite
  preferredResourceId uuid FK → resources (nullable)  -- assign same person each time
  primaryAddressId    uuid FK → addresses (nullable)
  durationMinutes     int
  pricingStrategy     enum: FIXED_PER_OCCURRENCE | TIME_AND_MATERIALS | RETAINER_MONTHLY
  pricePerOccurrence  decimal(10,2) (nullable)
  retainerAmount      decimal(10,2) (nullable)  -- for RETAINER_MONTHLY
  invoicingSchedule   enum: PER_JOB | WEEKLY | MONTHLY | ON_COMPLETION
  nextJobDue          date  -- maintained by Inngest; engine advances this after each generation
  nextInvoiceDue      date (nullable)  -- for scheduled invoicing
  status              enum: ACTIVE | PAUSED | CANCELLED | COMPLETED
  pausedUntil         date (nullable)
  cancellationReason  text (nullable)
  notes               text (nullable)
  metadata            jsonb
  createdAt, updatedAt
}
```

---

## Inngest Functions

### `generateContractJobs` (daily cron)
Runs at 06:00 every day. Finds all contracts where `nextJobDue <= today` and `status = ACTIVE`.

```typescript
export const generateContractJobs = inngest.createFunction(
  { id: 'contracts/generate-jobs', concurrency: { limit: 1 } },
  { cron: '0 6 * * *' },
  async ({ step }) => {
    const due = await step.run('load-due-contracts', () =>
      contractRepository.getDueContracts()
    )

    for (const contract of due) {
      await step.run(`generate-job-${contract.id}`, async () => {
        // Create job from contract template
        await jobService.createFromContract(contract)
        // Advance nextJobDue by one rrule occurrence
        const nextDue = advanceRRule(contract.rrule, contract.nextJobDue)
        await contractRepository.updateNextJobDue(contract.id, nextDue)
      })
    }
  }
)
```

### `generateContractInvoices` (daily cron)
Runs at 07:00 every day. Finds contracts where `nextInvoiceDue <= today` and `invoicingSchedule != PER_JOB`.

### `handleContractExpiry` (daily cron)
Marks contracts as COMPLETED where `endDate < today`.

---

## RRule Engine

### Location
```
src/modules/contracts/lib/rrule.ts
```

Use `rrule` npm package (RFC 5545 compliant). Expose two functions:

```typescript
// Advance to the next occurrence after a given date
function advanceRRule(rrule: string, afterDate: Date): Date

// Get all occurrences between two dates (for calendar preview)
function getOccurrences(rrule: string, startDate: Date, endDate: Date): Date[]
```

Never store pre-expanded occurrences. Always compute on demand from the rrule string.

---

## Job Generation from Contract

`jobService.createFromContract(contract: ServiceContract)`:
1. Resolve preferred resource availability for `nextJobDue` — if unavailable, find next available (log warning, do not fail)
2. Create `jobs` row with:
   - `type = RECURRING_INSTANCE`
   - `contractId = contract.id`
   - `serviceId = contract.serviceId`
   - `customerId = contract.customerId`
   - `scheduledStart = nextJobDue + contract.preferredTime` (default 09:00)
   - `durationMinutes = contract.durationMinutes`
   - `pricingStrategy = contract.pricingStrategy`
   - `status = CONFIRMED` (recurring jobs skip the PENDING/APPROVAL flow)
3. Create `jobAssignments` for preferred resource (if set and available)
4. Create `jobLocations` from `contract.primaryAddressId`
5. Emit `job/created` — notification engine handles reminder setup automatically

---

## Contract Pausing

Admin can pause a contract until a future date:
- Set `status = PAUSED`, `pausedUntil = targetDate`
- Daily cron skips contracts where `status = PAUSED`
- Inngest scheduled function resumes contract on `pausedUntil` date: set `status = ACTIVE`, clear `pausedUntil`

No jobs are created during the pause window. No backfill on resume.

---

## Module Structure

```
src/modules/contracts/
  contracts.types.ts
  contracts.schemas.ts
  contracts.repository.ts
  contracts.service.ts     -- create, pause, resume, cancel, generateJobPreview
  contracts.router.ts
  contracts.events.ts      -- generateContractJobs, generateContractInvoices, handleContractExpiry
  lib/
    rrule.ts
  index.ts
  __tests__/
    contracts.service.test.ts
    rrule.test.ts
```

---

## Router Procedures

```typescript
contracts.create
contracts.update
contracts.list
contracts.getById
contracts.pause        // input: { contractId, pausedUntil }
contracts.resume
contracts.cancel       // input: { contractId, reason }
contracts.preview      // returns next N occurrences for calendar preview
contracts.getJobHistory // all jobs generated from this contract
```

---

## Tests

`contracts.service.test.ts`:
- Create contract: first `nextJobDue` set to `startDate`
- Generate job: creates `jobs` row with correct fields
- Advance rrule: weekly contract advances by 7 days
- Advance rrule: monthly BYMONTHDAY advances to correct next month date
- Skip: paused contract not processed by cron
- Resume: sets status ACTIVE, clears pausedUntil
- Cancel: sets status CANCELLED with reason
- Expiry: endDate in past → status COMPLETED
- Preferred resource unavailable: job created without assignment, warning logged
- Invoicing PER_JOB: invoice created with each job
- Invoicing MONTHLY: invoice created on schedule, not per job

`rrule.test.ts`:
- Weekly, Monday/Wednesday/Friday: correct next dates
- Monthly first of month: Dec 31 → Jan 1
- Annual: correct year advancement
- getOccurrences: correct count in date range

---

## Definition of Done

- [ ] `serviceContracts` table created
- [ ] `contracts` module scaffolded with full CRUD
- [ ] `rrule.ts` implemented using `rrule` package
- [ ] `generateContractJobs` Inngest cron implemented and tested
- [ ] `generateContractInvoices` Inngest cron implemented
- [ ] `handleContractExpiry` Inngest cron implemented
- [ ] Pause/resume/cancel implemented
- [ ] Job generated from contract has correct fields and triggers notification
- [ ] All tests pass
- [ ] tsc passes, build passes
