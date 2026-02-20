"use client"

import { useTenantThemeContext } from "@/components/providers/tenant-theme-provider"
import { PortalHeader } from "./portal-header"
import { PortalFooter } from "./portal-footer"

/**
 * Portal layout content - uses theme context
 * Separated from outer layout to access TenantThemeProvider context
 */
export function PortalLayoutContent({ children }: { children: React.ReactNode }) {
  const { theme, businessName } = useTenantThemeContext()

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <PortalHeader
        logoUrl={theme?.logoUrl ?? undefined}
        businessName={businessName}
        showThemeToggle
      />

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
          {children}
        </div>
      </main>

      {/* Footer */}
      <PortalFooter
        businessName={businessName}
        // Social links would come from OrganizationSettings if we add those fields
        // For now, undefined (can be added in Phase 7D or later)
        // privacyPolicyUrl="/privacy"
        // termsOfServiceUrl="/terms"
      />
    </div>
  )
}
