// src/modules/ai/tools/describe-module.tool.ts

import type Anthropic from "@anthropic-ai/sdk"
import { getModuleMetadata } from "../ai.introspection"

export const describeModuleTool: Anthropic.Tool = {
  name: "describe_module",
  description:
    "Returns full input schemas and usage examples for a module's procedures. " +
    "Call this BEFORE attempting any mutation to get exact required fields, types, and enum values. " +
    "Do NOT call this for the same module twice.",
  input_schema: {
    type: "object" as const,
    properties: {
      module: {
        type: "string",
        description: "The module name from the module index (e.g., 'booking', 'customer', 'analytics').",
      },
    },
    required: ["module"],
  },
}

/**
 * Usage examples for key mutation procedures.
 * Shown alongside schema data so the model gets concrete code patterns.
 */
const PROCEDURE_EXAMPLES: Record<string, Record<string, string>> = {
  booking: {
    create: `await trpc.booking.create({
  customerId: "uuid-from-customer-list",  // UUID — query customer.list first
  serviceId: "uuid-from-service-list",    // UUID — query service.list first
  scheduledDate: new Date("2026-03-25"),  // Date object, NOT a string
  scheduledTime: "09:00",                 // "HH:MM" string
  durationMinutes: 60,                    // number, minimum 5
  locationType: "VENUE",                  // "VENUE" | "CUSTOMER_HOME" | "CUSTOMER_WORK" | "OTHER"
  locationAddress: { line1: "123 Main St", city: "Oxford", postcode: "OX1 1AB" },  // object, not string
})`,
    cancel: `await trpc.booking.cancel({ id: "booking-uuid", reason: "Client requested reschedule" })`,
  },
  customer: {
    create: `await trpc.customer.create({
  name: "Jane Smith",           // required
  email: "jane@example.com",    // required
  phone: "07700 900001",        // optional
  address: { city: "Oxford", county: "Oxfordshire", postcode: "OX1 1AB", country: "GB" },  // optional object
})`,
    update: `await trpc.customer.update({
  id: "customer-uuid",
  name: "Jane Smith-Jones",     // only include fields you want to change
})`,
    merge: `await trpc.customer.merge({
  sourceCustomerId: "uuid-to-merge-from",
  targetCustomerId: "uuid-to-keep",
})`,
  },
  scheduling: {
    createSlot: `await trpc.scheduling.createSlot({
  staffId: "staff-uuid",
  date: new Date("2026-03-25"),    // Date object
  startTime: "09:00",              // "HH:MM"
  endTime: "17:00",                // "HH:MM"
})`,
  },
}

export async function handleDescribeModule(input: { module: string }): Promise<{
  result: unknown
  durationMs: number
}> {
  const start = Date.now()
  const metadata = await getModuleMetadata(input.module)

  if (!metadata) {
    return {
      result: { error: `Module "${input.module}" not found. Check the module index in the system prompt.` },
      durationMs: Date.now() - start,
    }
  }

  // Enrich with usage examples where available
  const examples = PROCEDURE_EXAMPLES[input.module]
  const enrichedResult: Record<string, unknown> = {
    ...metadata,
  }

  if (examples) {
    enrichedResult.usageExamples = examples
    enrichedResult._hint = "Use the examples above as templates. Pay attention to Date objects vs strings, UUID fields, and enum values."
  }

  return {
    result: enrichedResult,
    durationMs: Date.now() - start,
  }
}
