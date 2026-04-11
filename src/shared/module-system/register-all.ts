import { ModuleRegistry } from './registry'
import { notificationTriggerRegistry } from './notification-trigger-registry'

// Core platform modules (always on, isCore: true)
import { authManifest } from '@/modules/auth/auth.manifest'
import { tenantManifest } from '@/modules/tenant/tenant.manifest'
import { platformManifest } from '@/modules/platform/platform.manifest'
import { analyticsManifest } from '@/modules/analytics/analytics.manifest'
import { searchManifest } from '@/modules/search/search.manifest'
import { auditManifest } from '@/modules/audit/audit.manifest'
import { notificationManifest } from '@/modules/notification/notification.manifest'
import { settingsManifest } from '@/modules/settings/settings.manifest'

// Vertical / feature modules
import { customerManifest } from '@/modules/customer/customer.manifest'
import { bookingManifest } from '@/modules/booking/booking.manifest'
import { jobsManifest } from '@/modules/jobs/jobs.manifest'
import { teamManifest } from '@/modules/team/team.manifest'
import { schedulingManifest } from '@/modules/scheduling/scheduling.manifest'
import { portalManifest } from '@/modules/portal/portal.manifest'
import { staffManifest } from '@/modules/staff/staff.manifest'
import { workflowManifest } from '@/modules/workflow/workflow.manifest'
import { formsManifest } from '@/modules/forms/forms.manifest'
import { reviewManifest } from '@/modules/review/review.manifest'
import { calendarSyncManifest } from '@/modules/calendar-sync/calendar-sync.manifest'
import { paymentManifest } from '@/modules/payment/payment.manifest'
import { developerManifest } from '@/modules/developer/developer.manifest'
import { aiManifest } from '@/modules/ai/ai.manifest'
import { pipelineManifest } from '@/modules/pipeline/pipeline.manifest'
import { outreachManifest } from '@/modules/outreach/outreach.manifest'

export const moduleRegistry = new ModuleRegistry()

// --- Core platform modules (isCore: true, cannot be disabled) ---
moduleRegistry.register(authManifest)
moduleRegistry.register(tenantManifest)
moduleRegistry.register(platformManifest)
moduleRegistry.register(analyticsManifest)
moduleRegistry.register(searchManifest)
moduleRegistry.register(auditManifest)
moduleRegistry.register(notificationManifest)
moduleRegistry.register(settingsManifest)

// --- Vertical / feature modules ---
moduleRegistry.register(customerManifest)
moduleRegistry.register(bookingManifest)
moduleRegistry.register(jobsManifest)
moduleRegistry.register(teamManifest)
moduleRegistry.register(schedulingManifest)
moduleRegistry.register(portalManifest)
moduleRegistry.register(staffManifest)
moduleRegistry.register(workflowManifest)
moduleRegistry.register(formsManifest)
moduleRegistry.register(reviewManifest)
moduleRegistry.register(calendarSyncManifest)
moduleRegistry.register(paymentManifest)
moduleRegistry.register(developerManifest)
moduleRegistry.register(aiManifest)
moduleRegistry.register(pipelineManifest)
moduleRegistry.register(outreachManifest)

// Validate dependency graph at startup
moduleRegistry.validate()

// --- Startup hooks ---
// Register notification triggers from manifests (synchronous, no DB needed)
for (const manifest of moduleRegistry.getAllManifests()) {
  if (manifest.notificationTriggers?.length) {
    notificationTriggerRegistry.register(manifest.slug, manifest.notificationTriggers)
  }
}
