import { router } from "@/shared/trpc";
import { bookingRouter } from "@/modules/booking/booking.router";
import { approvalRouter } from "@/modules/jobs/sub-routers/approval.router";
import { completionRouter } from "@/modules/jobs/sub-routers/completion.router";
import { portalRouter } from "@/modules/jobs/sub-routers/portal.router";
import { slotAvailabilityRouter } from "@/modules/jobs/sub-routers/slot.router";
import { jobsRouter } from "@/modules/jobs/jobs.router";
import { resourcesRouter } from "@/modules/resources/resources.router";
import { schedulingRouter } from "@/modules/scheduling";
import { authRouter } from "@/modules/auth";
import { notificationRouter } from "@/modules/notification";
import { calendarSyncRouter } from "@/modules/calendar-sync";
import { teamRouter } from "@/modules/team";
import { customerRouter } from "@/modules/customer";
import { formsRouter } from "@/modules/forms";
import { reviewRouter } from "@/modules/review";
import { workflowRouter } from "@/modules/workflow";
import { tenantRouter } from "@/modules/tenant";
import { platformRouter } from "@/modules/platform";
import { paymentRouter } from "@/modules/payment";
import { analyticsRouter } from "@/modules/analytics";
import { developerRouter } from "@/modules/developer";
import { searchRouter } from "@/modules/search";
import { settingsRouter } from "@/modules/settings";
import { auditRouter } from "@/modules/audit";
import { rbacRouter } from "@/modules/rbac";
import { resourcePoolRouter } from "@/shared/resource-pool/resource-pool.router";
import { aiRouter } from "@/modules/ai";
import { pipelineRouter } from "@/modules/pipeline";
import { outreachRouter } from "@/modules/outreach";
import { productRouter } from "@/modules/product";
import { subscriptionRouter } from "@/modules/subscription";
import { clientPortalRouter } from "@/modules/client-portal";
import { integrationsRouter } from "@/modules/integrations";

/**
 * Root tRPC router.
 *
 * Modules merge their routers here as phases are completed:
 *   Phase 1: booking, approval, completion, portal, slotAvailability ✓
 *   Phase 2: scheduling
 *   Phase 3: auth
 *   Phase 4: notification, calendarSync
 *   Phase 5: team, customer, forms, review, workflow, tenant, platform
 *   Phase 6: payment, analytics, developer, search, settings
 *   Phase 7: audit
 */
export const appRouter = router({
  auth: authRouter,
  booking: bookingRouter,
  jobs: jobsRouter,
  resources: resourcesRouter,
  approval: approvalRouter,
  completion: completionRouter,
  portal: portalRouter,
  slotAvailability: slotAvailabilityRouter,
  scheduling: schedulingRouter,
  notification: notificationRouter,
  calendarSync: calendarSyncRouter,
  team: teamRouter,
  customer: customerRouter,
  forms: formsRouter,
  review: reviewRouter,
  workflow: workflowRouter,
  tenant: tenantRouter,
  platform: platformRouter,
  payment: paymentRouter,
  analytics: analyticsRouter,
  developer: developerRouter,
  search: searchRouter,
  settings: settingsRouter,
  audit: auditRouter,
  rbac: rbacRouter,
  resourcePool: resourcePoolRouter,
  ai: aiRouter,
  pipeline: pipelineRouter,
  outreach: outreachRouter,
  product: productRouter,
  subscription: subscriptionRouter,
  clientPortal: clientPortalRouter,
  integrations: integrationsRouter,
});

export type AppRouter = typeof appRouter;
