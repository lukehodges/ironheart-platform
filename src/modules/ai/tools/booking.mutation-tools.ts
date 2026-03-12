// src/modules/ai/tools/booking.mutation-tools.ts

import type { MutatingAgentTool } from "../ai.types"
import { bookingRepository } from "@/modules/booking/booking.repository"
import type { BookingStatus } from "@/modules/booking/booking.types"

export const bookingMutationTools: MutatingAgentTool[] = [
  {
    name: "booking.updateStatus",
    description: "Update a booking's status. Can confirm, cancel, mark as completed, or mark as no-show. Requires the booking ID and new status.",
    module: "booking",
    permission: "bookings:write",
    guardrailTier: "CONFIRM",
    mutationDescription: "Changes a booking's status",
    isReversible: true,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The booking ID" },
        status: {
          type: "string",
          enum: ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"],
          description: "The new booking status",
        },
        reason: { type: "string", description: "Reason for the status change (optional)" },
      },
      required: ["id", "status"],
    },
    execute: async (input: unknown, ctx) => {
      const { id, status, reason } = input as { id: string; status: string; reason?: string }
      // Get current booking for compensation data
      const current = await bookingRepository.findById(ctx.tenantId, id)
      const meta = status === "CANCELLED" && reason ? { cancellationReason: reason } : undefined
      const result = await bookingRepository.updateStatus(ctx.tenantId, id, status as BookingStatus, meta)
      return { ...result, _compensationData: { bookingId: id, previousStatus: current?.status } }
    },
    compensate: async (compensationData: unknown, ctx) => {
      const data = compensationData as { bookingId: string; previousStatus: string }
      await bookingRepository.updateStatus(ctx.tenantId, data.bookingId, data.previousStatus as BookingStatus)
    },
  },
  {
    name: "booking.addNote",
    description: "Add a note to a booking. Use this to record observations, follow-ups, or context about a booking. Appends to the booking's admin notes.",
    module: "booking",
    permission: "bookings:write",
    guardrailTier: "AUTO",
    mutationDescription: "Adds a note to a booking",
    isReversible: false,
    inputSchema: {
      type: "object",
      properties: {
        bookingId: { type: "string", description: "The booking ID" },
        content: { type: "string", description: "The note content" },
      },
      required: ["bookingId", "content"],
    },
    execute: async (input: unknown, ctx) => {
      const { bookingId, content } = input as { bookingId: string; content: string }
      const current = await bookingRepository.findById(ctx.tenantId, bookingId)
      const existingNotes = current?.adminNotes ?? ""
      const timestamp = new Date().toISOString()
      const updatedNotes = existingNotes
        ? `${existingNotes}\n\n[${timestamp}] ${content}`
        : `[${timestamp}] ${content}`
      const result = await bookingRepository.update(ctx.tenantId, bookingId, { adminNotes: updatedNotes })
      return result
    },
  },
]
