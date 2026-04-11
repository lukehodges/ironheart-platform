import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  date,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { tenants } from "./tenant.schema"
import { users } from "./auth.schema"
import { customers } from "./customer.schema"
import { services, venues, locationType } from "./services.schema"
import { availableSlots } from "./scheduling.schema"
import { addresses, resources } from "./resources.schema"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const bookingSource = pgEnum("BookingSource", ['ADMIN', 'PORTAL', 'PHONE', 'WALK_IN', 'API'])
export const bookingStatus = pgEnum("BookingStatus", ['PENDING', 'APPROVED', 'REJECTED', 'RESERVED', 'RELEASED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
export const noteType = pgEnum("NoteType", ['GENERAL', 'CLINICAL', 'ADMIN', 'FOLLOW_UP'])
export const jobType = pgEnum("JobType", ['APPOINTMENT', 'CLASS', 'TEAM_JOB', 'ROUTE_JOB', 'RECURRING_INSTANCE', 'PROJECT_TASK'])
export const pricingStrategy = pgEnum("PricingStrategy", ['FIXED', 'TIERED', 'QUOTED', 'FORMULA', 'TIME_AND_MATERIALS', 'RETAINER'])
export const assignmentRole = pgEnum("AssignmentRole", ['LEAD', 'SUPPORT', 'DRIVER', 'OBSERVER'])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const jobs = pgTable("jobs", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  bookingNumber: text().notNull(),
  customerId: uuid().notNull(),
  serviceId: uuid().notNull(),
  staffId: uuid(),
  venueId: uuid(),
  scheduledDate: date({ mode: 'date' }).notNull(),
  scheduledTime: text().notNull(),
  durationMinutes: integer().notNull(),
  endTime: text(),
  locationType: locationType().default('VENUE').notNull(),
  locationAddress: jsonb(),
  travelMinutes: integer(),
  travelMiles: numeric({ precision: 6, scale: 2 }),
  status: bookingStatus().default('PENDING').notNull(),
  statusChangedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  approvalRequestedAt: timestamp({ precision: 3, mode: 'date' }),
  approvalDeadlineAt: timestamp({ precision: 3, mode: 'date' }),
  approvedAt: timestamp({ precision: 3, mode: 'date' }),
  approvedById: uuid(),
  rejectionReason: text(),
  reservedAt: timestamp({ precision: 3, mode: 'date' }),
  reservationExpiresAt: timestamp({ precision: 3, mode: 'date' }),
  price: numeric({ precision: 10, scale: 2 }),
  taxAmount: numeric({ precision: 10, scale: 2 }),
  totalAmount: numeric({ precision: 10, scale: 2 }),
  depositRequired: numeric({ precision: 10, scale: 2 }),
  depositPaid: numeric({ precision: 10, scale: 2 }).default('0').notNull(),
  depositPaidAt: timestamp({ precision: 3, mode: 'date' }),
  customerNotes: text(),
  adminNotes: text(),
  source: bookingSource().default('ADMIN').notNull(),
  cancelledAt: timestamp({ precision: 3, mode: 'date' }),
  cancelledBy: uuid(),
  cancellationReason: text(),
  completedAt: timestamp({ precision: 3, mode: 'date' }),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdById: uuid(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
  projectId: uuid(),
  requiresApproval: boolean().default(false).notNull(),
  slotId: uuid(),
  customServiceName: text(),
  mileageCost: numeric({ precision: 10, scale: 2 }),
  confirmationTokenHash: text(),
  version: integer().notNull().default(1),
  // New Phase 1 columns
  type: jobType().default('APPOINTMENT').notNull(),
  pricingStrategy: pricingStrategy().default('FIXED').notNull(),
  quotedAmount: numeric({ precision: 10, scale: 2 }),
  quoteApprovedAt: timestamp({ precision: 3, mode: 'date' }),
  quoteApprovedById: uuid(),
  contractId: uuid(),
  primaryAddressId: uuid(),
}, (table) => [
  index("bookings_customerId_idx").on(table.customerId),
  index("bookings_staffId_idx").on(table.staffId),
  index("bookings_staffId_scheduledDate_idx").on(table.staffId, table.scheduledDate),
  index("bookings_tenantId_scheduledDate_idx").on(table.tenantId, table.scheduledDate),
  index("bookings_tenantId_status_idx").on(table.tenantId, table.status),
  index("bookings_tenantId_createdAt_idx").on(table.tenantId, table.createdAt),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "bookings_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.customerId],
    foreignColumns: [customers.id],
    name: "bookings_customerId_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.venueId],
    foreignColumns: [venues.id],
    name: "bookings_venueId_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.approvedById],
    foreignColumns: [users.id],
    name: "bookings_approvedById_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.createdById],
    foreignColumns: [users.id],
    name: "bookings_createdById_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.serviceId],
    foreignColumns: [services.id],
    name: "bookings_serviceId_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.slotId],
    foreignColumns: [availableSlots.id],
    name: "bookings_slotId_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.staffId],
    foreignColumns: [users.id],
    name: "bookings_staffId_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.quoteApprovedById],
    foreignColumns: [users.id],
    name: "jobs_quoteApprovedById_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.primaryAddressId],
    foreignColumns: [addresses.id],
    name: "jobs_primaryAddressId_fkey"
  }).onUpdate("cascade").onDelete("set null"),
])

export const jobStatusHistory = pgTable("job_status_history", {
  id: uuid().primaryKey().notNull(),
  jobId: uuid().notNull(),
  fromStatus: bookingStatus(),
  toStatus: bookingStatus().notNull(),
  reason: text(),
  changedById: uuid(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("booking_status_history_bookingId_idx").on(table.jobId),
  foreignKey({
    columns: [table.jobId],
    foreignColumns: [jobs.id],
    name: "job_status_history_jobId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.changedById],
    foreignColumns: [users.id],
    name: "booking_status_history_changedById_fkey"
  }).onUpdate("cascade").onDelete("set null"),
])

export const jobAssignments = pgTable("job_assignments", {
  id: uuid().primaryKey().notNull(),
  jobId: uuid().notNull(),
  userId: uuid().notNull(),
  resourceId: uuid(),
  role: assignmentRole().default('LEAD').notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("booking_assignments_bookingId_idx").on(table.jobId),
  uniqueIndex("booking_assignments_bookingId_userId_key").on(table.jobId, table.userId),
  index("booking_assignments_userId_idx").on(table.userId),
  foreignKey({
    columns: [table.jobId],
    foreignColumns: [jobs.id],
    name: "job_assignments_jobId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "booking_assignments_userId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.resourceId],
    foreignColumns: [resources.id],
    name: "job_assignments_resourceId_fkey"
  }).onUpdate("cascade").onDelete("set null"),
])

export const appointmentCompletions = pgTable("appointment_completions", {
  id: uuid().primaryKey().notNull(),
  tenantId: uuid().notNull(),
  jobId: uuid().notNull(),
  customerId: uuid().notNull(),
  completedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedBy: uuid().notNull(),
  durationMinutes: integer(),
  actualStartTime: timestamp({ precision: 3, mode: 'date' }),
  actualEndTime: timestamp({ precision: 3, mode: 'date' }),
  sessionNotes: text(),
  nextAppointment: timestamp({ precision: 3, mode: 'date' }),
  followUpRequired: boolean().default(false).notNull(),
  paymentCollected: numeric({ precision: 10, scale: 2 }),
  paymentMethod: text(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  index("appointment_completions_bookingId_idx").on(table.jobId),
  uniqueIndex("appointment_completions_bookingId_key").on(table.jobId),
  index("appointment_completions_completedAt_idx").on(table.completedAt),
  index("appointment_completions_customerId_idx").on(table.customerId),
  index("appointment_completions_tenantId_idx").on(table.tenantId),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "appointment_completions_tenantId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.jobId],
    foreignColumns: [jobs.id],
    name: "appointment_completions_jobId_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.customerId],
    foreignColumns: [customers.id],
    name: "appointment_completions_customerId_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.completedBy],
    foreignColumns: [users.id],
    name: "appointment_completions_completedBy_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
])

export const travelLogs = pgTable("travel_logs", {
  id: uuid().primaryKey().notNull(),
  jobId: uuid(),
  date: date({ mode: 'date' }).notNull(),
  fromPostcode: text(),
  toPostcode: text(),
  distanceMiles: numeric({ precision: 6, scale: 2 }).notNull(),
  durationMins: integer().notNull(),
  mileageRate: numeric({ precision: 10, scale: 4 }),
  mileageCost: numeric({ precision: 10, scale: 2 }),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  userId: uuid().notNull(),
}, (table) => [
  index("travel_logs_userId_date_idx").on(table.userId, table.date),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "travel_logs_userId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.jobId],
    foreignColumns: [jobs.id],
    name: "travel_logs_jobId_fkey"
  }).onUpdate("cascade").onDelete("set null"),
])

export const customerNotes = pgTable("customer_notes", {
  id: uuid().primaryKey().notNull(),
  customerId: uuid().notNull(),
  jobId: uuid(),
  content: text().notNull(),
  type: noteType().default('GENERAL').notNull(),
  isPinned: boolean().default(false).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdBy: uuid(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
  index("customer_notes_customerId_idx").on(table.customerId),
  foreignKey({
    columns: [table.customerId],
    foreignColumns: [customers.id],
    name: "customer_notes_customerId_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.jobId],
    foreignColumns: [jobs.id],
    name: "customer_notes_jobId_fkey"
  }).onUpdate("cascade").onDelete("set null"),
])

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

export type Job = typeof jobs.$inferSelect;
export type JobStatusHistory = typeof jobStatusHistory.$inferSelect;
export type JobAssignment = typeof jobAssignments.$inferSelect;
export type AppointmentCompletion = typeof appointmentCompletions.$inferSelect;

// Backward-compat aliases to avoid breaking module imports not yet updated
export type Booking = Job;
export type BookingStatusHistory = JobStatusHistory;
export type BookingAssignment = JobAssignment;

// Keep the old name as an alias for the table variable to ease transition
export const bookings = jobs;
export const bookingStatusHistory = jobStatusHistory;
export const bookingAssignments = jobAssignments;
