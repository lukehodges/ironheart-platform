import { ModuleRegistry } from './registry'

// Core modules
import { authManifest } from '@/modules/auth/auth.manifest'
import { tenantManifest } from '@/modules/tenant/tenant.manifest'
import { analyticsManifest } from '@/modules/analytics/analytics.manifest'
import { searchManifest } from '@/modules/search/search.manifest'
import { platformManifest } from '@/modules/platform/platform.manifest'

// Standard modules — operations
import { customerManifest } from '@/modules/customer/customer.manifest'
import { bookingManifest } from '@/modules/booking/booking.manifest'
import { teamManifest } from '@/modules/team/team.manifest'
import { schedulingManifest } from '@/modules/scheduling/scheduling.manifest'
import { portalManifest } from '@/modules/portal/portal.manifest'
import { staffManifest } from '@/modules/staff/staff.manifest'

// Standard modules — automation
import { workflowManifest } from '@/modules/workflow/workflow.manifest'
import { formsManifest } from '@/modules/forms/forms.manifest'
import { reviewManifest } from '@/modules/review/review.manifest'
import { notificationManifest } from '@/modules/notification/notification.manifest'
import { calendarSyncManifest } from '@/modules/calendar-sync/calendar-sync.manifest'

// Standard modules — finance
import { paymentManifest } from '@/modules/payment/payment.manifest'

// Addon modules
import { developerManifest } from '@/modules/developer/developer.manifest'

export const moduleRegistry = new ModuleRegistry()

// --- Core modules (isCore: true, cannot be disabled) ---
moduleRegistry.register(authManifest)
moduleRegistry.register(tenantManifest)
moduleRegistry.register(analyticsManifest)
moduleRegistry.register(searchManifest)
moduleRegistry.register(platformManifest)

// --- Standard modules ---
moduleRegistry.register(customerManifest)
moduleRegistry.register(bookingManifest)
moduleRegistry.register(teamManifest)
moduleRegistry.register(schedulingManifest)
moduleRegistry.register(portalManifest)
moduleRegistry.register(staffManifest)
moduleRegistry.register(workflowManifest)
moduleRegistry.register(formsManifest)
moduleRegistry.register(reviewManifest)
moduleRegistry.register(notificationManifest)
moduleRegistry.register(calendarSyncManifest)
moduleRegistry.register(paymentManifest)

// --- Addon modules ---
moduleRegistry.register(developerManifest)

// Validate dependency graph at startup
moduleRegistry.validate()
