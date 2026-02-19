import { z } from "zod";

export const slotCreateSchema = z.object({
  date: z.date(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  staffIds: z.array(z.uuid()),
  serviceIds: z.array(z.uuid()),
  venueId: z.uuid().optional(),
  capacity: z.number().min(1).default(1),
  requiresApproval: z.boolean().default(false),
  estimatedLocation: z.string().optional(),
  previousSlotId: z.uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sortOrder: z.number().default(0),
});

export const slotUpdateSchema = slotCreateSchema.partial().extend({
  id: z.uuid(),
  available: z.boolean().optional(),
});

export const slotBulkCreateSchema = z.object({
  slots: z.array(slotCreateSchema).min(1).max(100),
});

export const recurringSlotSchema = z.object({
  baseSlot: slotCreateSchema,
  recurrenceRule: z.object({
    frequency: z.enum(["daily", "weekly", "monthly"]),
    interval: z.number().min(1).default(1),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    count: z.number().min(1).max(365).optional(),
    until: z.date().optional(),
  }),
});

export const slotListSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  staffId: z.uuid().optional(),
  serviceId: z.uuid().optional(),
  venueId: z.uuid().optional(),
  includeUnavailable: z.boolean().default(false),
});

export const availabilityCheckSchema = z.object({
  userId: z.uuid(),
  date: z.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().min(5),
  excludeBookingId: z.uuid().optional(),
});

export const travelTimeSchema = z.object({
  fromPostcode: z.string().min(3),
  toPostcode: z.string().min(3),
});

export type SlotCreateInput = z.infer<typeof slotCreateSchema>;
export type SlotUpdateInput = z.infer<typeof slotUpdateSchema>;
export type SlotBulkCreateInput = z.infer<typeof slotBulkCreateSchema>;
export type RecurringSlotInput = z.infer<typeof recurringSlotSchema>;
export type SlotListInput = z.infer<typeof slotListSchema>;
export type AvailabilityCheckInput = z.infer<typeof availabilityCheckSchema>;
export type TravelTimeInput = z.infer<typeof travelTimeSchema>;
