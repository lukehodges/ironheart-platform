"use client"

import * as React from "react"
import { useEffect, useState, lazy, Suspense } from "react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { SettingsSidebar } from "@/components/settings/settings-sidebar"
import type { SettingsTab } from "@/types/settings"
import { Loader2 } from "lucide-react"

// Lazy load all tab components for better performance
const GeneralTab = lazy(() =>
  import("@/components/settings/general-tab").then((m) => ({ default: m.GeneralTab }))
)
const NotificationsTab = lazy(() =>
  import("@/components/settings/notifications-tab").then((m) => ({ default: m.NotificationsTab }))
)
const IntegrationsTab = lazy(() => import("@/components/settings/integrations-tab"))
const BillingTab = lazy(() =>
  import("@/components/settings/billing-tab").then((m) => ({ default: m.BillingTab }))
)
const ModulesTab = lazy(() =>
  import("@/components/settings/modules-tab").then((m) => ({ default: m.ModulesTab }))
)
const SecurityTab = lazy(() =>
  import("@/components/settings/security-tab").then((m) => ({ default: m.SecurityTab }))
)
const DangerTab = lazy(() =>
  import("@/components/settings/danger-tab").then((m) => ({ default: m.DangerTab }))
)
const RolesTab = lazy(() =>
  import("@/components/settings/roles-tab").then((m) => ({ default: m.RolesTab }))
)
const StaffCustomFieldsTab = lazy(() =>
  import("@/components/settings/staff-custom-fields").then((m) => ({ default: m.StaffCustomFieldsTab }))
)
const StaffOnboardingTemplatesTab = lazy(() =>
  import("@/components/settings/staff-onboarding-templates").then((m) => ({ default: m.StaffOnboardingTemplatesTab }))
)

/**
 * Map tab IDs to display titles
 */
const TAB_TITLES: Record<SettingsTab, string> = {
  general: "General Settings",
  notifications: "Notification Settings",
  integrations: "Integrations",
  billing: "Billing & Plans",
  modules: "Modules",
  security: "Security & API Keys",
  roles: "Roles & Permissions",
  "staff-custom-fields": "Staff Custom Fields",
  "staff-onboarding": "Onboarding Templates",
  danger: "Danger Zone",
}

/**
 * Loading Skeleton Component
 */
function TabLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

/**
 * Settings Page
 *
 * Main settings configuration center with 7 tabs.
 *
 * Features:
 * - Two-column layout: SettingsSidebar (left, fixed 240px) + Tab content (right, flex-1)
 * - Tabs component wrapping all content with 7 tabs
 * - Default tab: 'general'
 * - URL hash routing (e.g., #notifications changes active tab)
 * - Listen to hash changes with useEffect
 * - All tab components rendered via TabsContent
 * - PageHeader with dynamic title based on active tab
 * - Lazy load tab components for better performance
 * - Mobile: Sidebar collapses, tabs become stacked
 *
 * Layout:
 * ```
 * ┌──────────┬──────────────────────────────────┐
 * │ General  │ General Settings                 │
 * │ Notify   │ ┌──────────────────────────────┐ │
 * │ Integr.  │ │ Business Name                │ │
 * │ Billing  │ │ [Input]                      │ │
 * │ Modules  │ ├──────────────────────────────┤ │
 * │ Security │ │ Address                      │ │
 * │ Danger   │ │ [Textarea]                   │ │
 * │          │ └──────────────────────────────┘ │
 * │          │ [Save Settings]                  │
 * └──────────┴──────────────────────────────────┘
 * ```
 *
 * @route /admin/settings
 */
export default function SettingsPage() {
  // State for active tab
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")

  /**
   * Initialize active tab from URL hash on mount
   */
  useEffect(() => {
    // Read hash from URL (e.g., #notifications)
    const hash = window.location.hash.slice(1) // Remove '#' prefix
    if (hash && isValidTab(hash)) {
      setActiveTab(hash as SettingsTab)
    }
  }, [])

  /**
   * Listen to hash changes for browser back/forward navigation
   */
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.slice(1)
      if (hash && isValidTab(hash)) {
        setActiveTab(hash as SettingsTab)
      } else {
        // Default to general if invalid hash
        setActiveTab("general")
      }
    }

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  /**
   * Handle tab change - update both state and URL hash
   */
  function handleTabChange(tab: SettingsTab) {
    setActiveTab(tab)
    window.location.hash = tab
  }

  /**
   * Validate if string is a valid SettingsTab
   */
  function isValidTab(tab: string): boolean {
    return [
      "general", "notifications", "integrations", "billing",
      "modules", "security", "roles",
      "staff-custom-fields", "staff-onboarding",
      "danger",
    ].includes(tab)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{TAB_TITLES[activeTab]}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your organization settings and preferences
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as SettingsTab)} className="h-full">
          <div className="flex h-full">
            {/* Left Sidebar - Settings Navigation */}
            <aside
              className={cn(
                "flex-shrink-0 border-r border-border bg-background",
                "w-full md:w-[240px]", // Full width on mobile, 240px on desktop
                "overflow-y-auto p-4 md:p-6"
              )}
            >
              <SettingsSidebar activeTab={activeTab} onTabChange={handleTabChange} />
            </aside>

            {/* Right Content - Tab Content */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8">
              {/* General Tab */}
              <TabsContent value="general" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <GeneralTab />
                </Suspense>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <NotificationsTab />
                </Suspense>
              </TabsContent>

              {/* Integrations Tab */}
              <TabsContent value="integrations" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <IntegrationsTab />
                </Suspense>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <BillingTab />
                </Suspense>
              </TabsContent>

              {/* Modules Tab */}
              <TabsContent value="modules" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <ModulesTab />
                </Suspense>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <SecurityTab />
                </Suspense>
              </TabsContent>

              {/* Roles Tab */}
              <TabsContent value="roles" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <RolesTab />
                </Suspense>
              </TabsContent>

              {/* Staff Custom Fields Tab */}
              <TabsContent value="staff-custom-fields" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <StaffCustomFieldsTab />
                </Suspense>
              </TabsContent>

              {/* Staff Onboarding Tab */}
              <TabsContent value="staff-onboarding" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <StaffOnboardingTemplatesTab />
                </Suspense>
              </TabsContent>

              {/* Danger Tab */}
              <TabsContent value="danger" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <DangerTab />
                </Suspense>
              </TabsContent>
            </main>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
