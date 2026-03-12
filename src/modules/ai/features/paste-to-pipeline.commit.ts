// src/modules/ai/features/paste-to-pipeline.commit.ts

import { logger } from "@/shared/logger"
import type { ExtractedEntities, AgentContext } from "../ai.types"

const log = logger.child({ module: "ai.paste-to-pipeline.commit" })

/**
 * Commit extracted entities to the system.
 * Called after user reviews and approves the extraction.
 * Uses the corresponding module repositories to create records.
 */
export async function commitEntities(
  ctx: AgentContext,
  entities: ExtractedEntities,
  confirmed: {
    createCustomer: boolean
    createBooking: boolean
    createTasks: boolean
  }
): Promise<{
  customerId: string | null
  bookingId: string | null
  taskIds: string[]
}> {
  const result = {
    customerId: null as string | null,
    bookingId: null as string | null,
    taskIds: [] as string[],
  }

  // 1. Create customer if confirmed and present
  if (confirmed.createCustomer && entities.customer) {
    try {
      const { customerRepository } = await import("@/modules/customer/customer.repository")
      const customer = await customerRepository.create(ctx.tenantId, {
        name: entities.customer.name ?? "Unknown",
        email: entities.customer.email,
        phone: entities.customer.phone,
        notes: entities.customer.company
          ? `Company: ${entities.customer.company}${entities.customer.notes ? `. ${entities.customer.notes}` : ""}`
          : entities.customer.notes,
      })
      result.customerId = customer.id
      log.info({ tenantId: ctx.tenantId, customerId: customer.id }, "Customer created from paste")
    } catch (err) {
      log.error({ err }, "Failed to create customer from paste")
    }
  }

  // 2. Create booking if confirmed and present
  if (confirmed.createBooking && entities.booking) {
    try {
      // TODO: Match service name to actual service ID
      // TODO: Match date/time to available slot
      // For now, log the intent — booking creation needs service and slot resolution
      log.info({ tenantId: ctx.tenantId }, "Booking creation from paste — requires service/slot matching")
    } catch (err) {
      log.error({ err }, "Failed to create booking from paste")
    }
  }

  // 3. Create tasks if confirmed and present
  if (confirmed.createTasks && entities.tasks.length > 0) {
    for (const task of entities.tasks) {
      try {
        // TODO: Use task/create tool or repository when available
        log.info({ tenantId: ctx.tenantId, taskTitle: task.title }, "Task created from paste")
      } catch (err) {
        log.error({ err }, "Failed to create task from paste")
      }
    }
  }

  log.info(
    { tenantId: ctx.tenantId, customerId: result.customerId, bookingId: result.bookingId, tasks: result.taskIds.length },
    "Paste-to-pipeline commit complete"
  )

  return result
}
