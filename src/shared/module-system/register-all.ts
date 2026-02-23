import { ModuleRegistry } from './registry'
import { searchProviderRegistry } from './search-registry'
import { customerSearchProvider } from '@/modules/customer/customer.search-provider'
import { bookingSearchProvider } from '@/modules/booking/booking.search-provider'

// Core platform modules (always on, isCore: true)
import { authManifest } from '@/modules/auth/auth.manifest'
import { tenantManifest } from '@/modules/tenant/tenant.manifest'
import { platformManifest } from '@/modules/platform/platform.manifest'
import { analyticsManifest } from '@/modules/analytics/analytics.manifest'
import { searchManifest } from '@/modules/search/search.manifest'
import { auditManifest } from '@/modules/audit/audit.manifest'
import { notificationManifest } from '@/modules/notification/notification.manifest'
import { settingsManifest } from '@/modules/settings/settings.manifest'

// ---------------------------------------------------------------------------
// Vertical / feature modules — DISABLED while platform layer is hardened.
// Code remains in src/modules/ and tests still pass individually.
// Re-enable here once platform layer is solid.
// ---------------------------------------------------------------------------
// import { customerManifest } from '@/modules/customer/customer.manifest'
// import { bookingManifest } from '@/modules/booking/booking.manifest'
// import { teamManifest } from '@/modules/team/team.manifest'
// import { schedulingManifest } from '@/modules/scheduling/scheduling.manifest'
// import { portalManifest } from '@/modules/portal/portal.manifest'
// import { staffManifest } from '@/modules/staff/staff.manifest'
// import { workflowManifest } from '@/modules/workflow/workflow.manifest'
// import { formsManifest } from '@/modules/forms/forms.manifest'
// import { reviewManifest } from '@/modules/review/review.manifest'
// import { calendarSyncManifest } from '@/modules/calendar-sync/calendar-sync.manifest'
// import { paymentManifest } from '@/modules/payment/payment.manifest'
// import { developerManifest } from '@/modules/developer/developer.manifest'

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

// --- Vertical / feature modules (DISABLED) ---
// moduleRegistry.register(customerManifest)
// moduleRegistry.register(bookingManifest)
// moduleRegistry.register(teamManifest)
// moduleRegistry.register(schedulingManifest)
// moduleRegistry.register(portalManifest)
// moduleRegistry.register(staffManifest)
// moduleRegistry.register(workflowManifest)
// moduleRegistry.register(formsManifest)
// moduleRegistry.register(reviewManifest)
// moduleRegistry.register(notificationManifest)  // moved to core
// moduleRegistry.register(calendarSyncManifest)
// moduleRegistry.register(paymentManifest)
// moduleRegistry.register(developerManifest)

// Validate dependency graph at startup
moduleRegistry.validate()

// --- Search providers (only for modules registered on this server instance) ---
searchProviderRegistry.register(customerSearchProvider)
searchProviderRegistry.register(bookingSearchProvider)
