import { z } from 'zod';

/**
 * Booking wizard step enum
 */
export enum WizardStep {
  SELECT_SERVICE = 'SELECT_SERVICE',
  PICK_SLOT = 'PICK_SLOT',
  CUSTOMER_DETAILS = 'CUSTOMER_DETAILS',
  SUCCESS = 'SUCCESS',
}

/**
 * Service card for display in service selection step
 */
export interface ServiceCard {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  basePrice: number;
  currency: string;
  imageUrl: string | null;
  isAvailable: boolean;
}

export const ServiceCardSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number().int().positive(),
  basePrice: z.number().nonnegative(),
  currency: z.string().length(3),
  imageUrl: z.string().url().nullable(),
  isAvailable: z.boolean(),
});

/**
 * Available time slot for booking
 */
export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  userId: string | null;
  userDisplayName: string | null;
}

export const AvailableSlotSchema = z.object({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  userId: z.uuid().nullable(),
  userDisplayName: z.string().nullable(),
});

/**
 * Customer details form data
 */
export interface CustomerDetailsForm {
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  dynamicFields: Record<string, unknown>;
}

export const CustomerDetailsFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone is required'),
  notes: z.string().nullable().optional(),
  dynamicFields: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Complete booking flow state
 */
export interface BookingFlowState {
  currentStep: WizardStep;
  tenantId: string;
  selectedService: ServiceCard | null;
  selectedSlot: AvailableSlot | null;
  customerInfo: CustomerDetailsForm | null;
  bookingId: string | null;
}

export const BookingFlowStateSchema = z.object({
  currentStep: z.nativeEnum(WizardStep),
  tenantId: z.uuid(),
  selectedService: ServiceCardSchema.nullable(),
  selectedSlot: AvailableSlotSchema.nullable(),
  customerInfo: CustomerDetailsFormSchema.nullable(),
  bookingId: z.uuid().nullable(),
});
