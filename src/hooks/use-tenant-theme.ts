"use client"

import { useEffect } from "react"
import { api } from "@/lib/trpc/react"
import type { TenantThemeConfig } from "@/types/tenant-theme"

interface UseTenantThemeOptions {
  tenantSlug: string
}

interface UseTenantThemeReturn {
  theme: TenantThemeConfig | null
  isLoading: boolean
  isError: boolean
  businessName: string | null
}

/**
 * Tenant theme loader (data fetching only - no CSS injection)
 *
 * Features:
 * - Fetches tenant branding from backend via public procedure
 * - React Query caching (30s stale time)
 * - Loading and error states
 * - Returns business name for page title
 *
 * NOTE: CSS variable injection is handled by TenantThemeProvider
 * to ensure proper scoping to portal routes only.
 *
 * @example
 * ```tsx
 * function BookingPage({ params }: { params: { slug: string } }) {
 *   const { theme, isLoading, businessName } = useTenantTheme({
 *     tenantSlug: params.slug
 *   })
 *
 *   if (isLoading) return <Skeleton />
 *
 *   return (
 *     <>
 *       <title>{businessName} - Book Appointment</title>
 *       <Logo src={theme?.logoUrl} />
 *     </>
 *   )
 * }
 * ```
 */
export function useTenantTheme({
  tenantSlug,
}: UseTenantThemeOptions): UseTenantThemeReturn {
  // Fetch tenant settings from backend using public procedure
  const { data, isLoading, isError } = api.tenant.getPublicSettings.useQuery(
    { slug: tenantSlug },
    {
      staleTime: 30_000, // 30 seconds
      retry: 1,
      enabled: !!tenantSlug,
    }
  )

  const theme: TenantThemeConfig | null = data
    ? {
        brandColor: data.primaryColor ?? "#000000",
        primaryColor: data.primaryColor ?? "#000000",
        secondaryColor: data.secondaryColor ?? null,
        accentColor: data.accentColor ?? null,
        logoUrl: data.logoUrl ?? null,
        faviconUrl: data.faviconUrl ?? null,
        businessName: data.businessName ?? "Booking Portal",
        tagline: null, // Not in OrganizationSettings - can add later if needed
        customCss: data.customCss ?? null,
        fontFamily: data.fontFamily ?? null,
      }
    : null

  // NOTE: CSS injection removed - handled by TenantThemeProvider

  return {
    theme,
    isLoading,
    isError,
    businessName: theme?.businessName ?? null,
  }
}
