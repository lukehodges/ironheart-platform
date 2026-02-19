export { schedulingRouter } from "./scheduling.router";
export { schedulingFunctions } from "./scheduling.events";
export * from "./scheduling.types";
export { selectStaff } from "./lib/smart-assignment";
export { addToWaitlist, checkAndNotifyWaitlist } from "./lib/waitlist";
export { assignStaff } from "./scheduling.service";
export {
  slotCreateSchema,
  slotUpdateSchema,
  slotBulkCreateSchema,
  recurringSlotSchema,
  slotListSchema,
  availabilityCheckSchema,
  travelTimeSchema,
  type SlotBulkCreateInput,
  type SlotListInput,
  type AvailabilityCheckInput,
  type TravelTimeInput,
} from "./scheduling.schemas";
export {
  calculateTravelTime,
  estimateTravelTime,
  formatTravelTime,
  estimatePostcodeDistance,
  getTravelTimeStatus,
} from "./lib/travel-time";
export {
  isStaffAvailable,
  getAvailableStaff,
  getStaffTimeSlots,
} from "./lib/availability";
export type { ExternalEventBlock } from "./lib/availability";
export { getStaffRecommendations, getBestStaffRecommendation } from "./lib/recommendations";
export { generateSchedulingAlerts, getAlertSummary } from "./lib/alerts";
export {
  calculateAssignmentHealth,
  calculateMultipleAssignmentHealth,
  getAssignmentHealthStats,
} from "./lib/assignment-health";
