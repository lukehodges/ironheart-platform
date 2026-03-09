import { inngest } from '@/shared/inngest'
import { workflowRepository } from './workflow.repository'
import { workflowService } from './workflow.service'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'workflow.events' })

// ---------------------------------------------------------------------------
// Trigger dispatchers - each listens to a domain event and dispatches
// 'workflow/execute' for every matching workflow registered for that trigger.
// ---------------------------------------------------------------------------

/**
 * Dispatch workflows configured to fire on BOOKING_CREATED.
 */
const triggerOnBookingCreated = inngest.createFunction(
  { id: 'workflow-trigger-booking-created', retries: 2 },
  { event: 'booking/created' },
  async ({ event, step }) => {
    const { bookingId, tenantId } = event.data

    const workflows = await step.run('find-workflows', () =>
      workflowRepository.findByTrigger(tenantId, 'BOOKING_CREATED')
    )

    log.info({ tenantId, bookingId, count: workflows.length }, 'Dispatching BOOKING_CREATED workflows')

    await step.run('dispatch-workflows', () =>
      Promise.all(
        workflows.map((wf) =>
          inngest.send({
            name: 'workflow/execute',
            data: {
              workflowId: wf.id,
              tenantId,
              triggerEvent: 'BOOKING_CREATED',
              triggerData: { bookingId, tenantId },
            },
          })
        )
      )
    )
  }
)

/**
 * Dispatch workflows configured to fire on BOOKING_CONFIRMED.
 */
const triggerOnBookingConfirmed = inngest.createFunction(
  { id: 'workflow-trigger-booking-confirmed', retries: 2 },
  { event: 'booking/confirmed' },
  async ({ event, step }) => {
    const { bookingId, tenantId } = event.data

    const workflows = await step.run('find-workflows', () =>
      workflowRepository.findByTrigger(tenantId, 'BOOKING_CONFIRMED')
    )

    log.info({ tenantId, bookingId, count: workflows.length }, 'Dispatching BOOKING_CONFIRMED workflows')

    await step.run('dispatch-workflows', () =>
      Promise.all(
        workflows.map((wf) =>
          inngest.send({
            name: 'workflow/execute',
            data: {
              workflowId: wf.id,
              tenantId,
              triggerEvent: 'BOOKING_CONFIRMED',
              triggerData: { bookingId, tenantId },
            },
          })
        )
      )
    )
  }
)

/**
 * Dispatch workflows configured to fire on BOOKING_CANCELLED.
 * Includes cancellation reason in triggerData when present.
 */
const triggerOnBookingCancelled = inngest.createFunction(
  { id: 'workflow-trigger-booking-cancelled', retries: 2 },
  { event: 'booking/cancelled' },
  async ({ event, step }) => {
    const { bookingId, tenantId, reason } = event.data

    const workflows = await step.run('find-workflows', () =>
      workflowRepository.findByTrigger(tenantId, 'BOOKING_CANCELLED')
    )

    log.info({ tenantId, bookingId, count: workflows.length }, 'Dispatching BOOKING_CANCELLED workflows')

    await step.run('dispatch-workflows', () =>
      Promise.all(
        workflows.map((wf) =>
          inngest.send({
            name: 'workflow/execute',
            data: {
              workflowId: wf.id,
              tenantId,
              triggerEvent: 'BOOKING_CANCELLED',
              triggerData: { bookingId, tenantId, reason: reason ?? null },
            },
          })
        )
      )
    )
  }
)

/**
 * Dispatch workflows configured to fire on BOOKING_COMPLETED.
 */
const triggerOnBookingCompleted = inngest.createFunction(
  { id: 'workflow-trigger-booking-completed', retries: 2 },
  { event: 'booking/completed' },
  async ({ event, step }) => {
    const { bookingId, tenantId } = event.data

    const workflows = await step.run('find-workflows', () =>
      workflowRepository.findByTrigger(tenantId, 'BOOKING_COMPLETED')
    )

    log.info({ tenantId, bookingId, count: workflows.length }, 'Dispatching BOOKING_COMPLETED workflows')

    await step.run('dispatch-workflows', () =>
      Promise.all(
        workflows.map((wf) =>
          inngest.send({
            name: 'workflow/execute',
            data: {
              workflowId: wf.id,
              tenantId,
              triggerEvent: 'BOOKING_COMPLETED',
              triggerData: { bookingId, tenantId },
            },
          })
        )
      )
    )
  }
)

/**
 * Dispatch workflows configured to fire on FORM_SUBMITTED.
 */
const triggerOnFormSubmitted = inngest.createFunction(
  { id: 'workflow-trigger-form-submitted', retries: 2 },
  { event: 'forms/submitted' },
  async ({ event, step }) => {
    const { formId, bookingId, tenantId, customerId } = event.data

    const workflows = await step.run('find-workflows', () =>
      workflowRepository.findByTrigger(tenantId, 'FORM_SUBMITTED')
    )

    log.info({ tenantId, formId, count: workflows.length }, 'Dispatching FORM_SUBMITTED workflows')

    await step.run('dispatch-workflows', () =>
      Promise.all(
        workflows.map((wf) =>
          inngest.send({
            name: 'workflow/execute',
            data: {
              workflowId: wf.id,
              tenantId,
              triggerEvent: 'FORM_SUBMITTED',
              triggerData: { formId, bookingId, tenantId, customerId },
            },
          })
        )
      )
    )
  }
)

/**
 * Dispatch workflows configured to fire on REVIEW_SUBMITTED.
 */
const triggerOnReviewSubmitted = inngest.createFunction(
  { id: 'workflow-trigger-review-submitted', retries: 2 },
  { event: 'review/submitted' },
  async ({ event, step }) => {
    const { reviewId, bookingId, tenantId, customerId, rating } = event.data

    const workflows = await step.run('find-workflows', () =>
      workflowRepository.findByTrigger(tenantId, 'REVIEW_SUBMITTED')
    )

    log.info({ tenantId, reviewId, count: workflows.length }, 'Dispatching REVIEW_SUBMITTED workflows')

    await step.run('dispatch-workflows', () =>
      Promise.all(
        workflows.map((wf) =>
          inngest.send({
            name: 'workflow/execute',
            data: {
              workflowId: wf.id,
              tenantId,
              triggerEvent: 'REVIEW_SUBMITTED',
              triggerData: { reviewId, bookingId, tenantId, customerId, rating },
            },
          })
        )
      )
    )
  }
)

// ---------------------------------------------------------------------------
// Executor - runs a single workflow for a given trigger event + data
// ---------------------------------------------------------------------------

/**
 * Execute a workflow.
 * Dispatched by trigger functions above or by EXECUTE_WORKFLOW graph nodes.
 */
const executeWorkflow = inngest.createFunction(
  { id: 'workflow-execute', retries: 3 },
  { event: 'workflow/execute' },
  async ({ event, step }) => {
    await workflowService.executeWorkflow(step, event)
  }
)

/** All workflow Inngest functions - register in src/app/api/inngest/route.ts */
export const workflowFunctions = [
  triggerOnBookingCreated,
  triggerOnBookingConfirmed,
  triggerOnBookingCancelled,
  triggerOnBookingCompleted,
  triggerOnFormSubmitted,
  triggerOnReviewSubmitted,
  executeWorkflow,
]
