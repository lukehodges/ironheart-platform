import { TenantThemeProvider } from "@/components/providers/tenant-theme-provider"
import { PortalLayoutContent } from "@/components/portal/portal-layout-content"

/**
 * Public portal layout for booking pages
 *
 * Features:
 * - Wraps TenantThemeProvider around children
 * - Different from admin layout (no sidebar/topbar)
 * - Simple header with tenant logo (if provided) or business name
 * - Footer with "Powered by Ironheart"
 * - Applies tenant theme CSS variables (scoped)
 * - Mobile responsive
 * - Clean, minimal design - focus on booking flow
 *
 * Layout Structure:
 * - TenantThemeProvider (fetches theme, injects CSS variables)
 *   - PortalLayoutContent (uses theme context)
 *     - PortalHeader
 *     - main (children)
 *     - PortalFooter
 */
export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params;
  return (
    <TenantThemeProvider tenantSlug={tenantSlug}>
      <PortalLayoutContent>{children}</PortalLayoutContent>
    </TenantThemeProvider>
  )
}
