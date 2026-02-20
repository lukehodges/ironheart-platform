"use client"

import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useTenantTheme } from "@/hooks/use-tenant-theme"
import type { TenantThemeConfig } from "@/types/tenant-theme"

/**
 * Tenant theme context for sharing theme data
 */
interface TenantThemeContext {
  theme: TenantThemeConfig | null
  businessName: string
}

const ThemeContext = createContext<TenantThemeContext | null>(null)

/**
 * Hook to access tenant theme context
 */
export function useTenantThemeContext(): TenantThemeContext {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTenantThemeContext must be used within TenantThemeProvider")
  }
  return context
}

interface TenantThemeProviderProps {
  tenantSlug: string
  children: ReactNode
}

/**
 * Tenant theme provider - injects white-label branding into portal
 *
 * Features:
 * - Fetches tenant branding via useTenantTheme hook
 * - Injects scoped CSS variables (not global - portal only)
 * - Sets document title with business name
 * - Shows loading skeleton while theme loads
 * - Error fallback if tenant not found
 * - Provides theme context to children
 *
 * CSS Injection Strategy:
 * - Creates scoped style element within portal wrapper
 * - Overrides CSS variables only within .portal-theme-scope class
 * - Does NOT affect admin area or global styles
 *
 * @example
 * ```tsx
 * // In app/book/[tenantSlug]/layout.tsx
 * <TenantThemeProvider tenantSlug={params.tenantSlug}>
 *   <PortalHeader />
 *   {children}
 *   <PortalFooter />
 * </TenantThemeProvider>
 * ```
 */
export function TenantThemeProvider({
  tenantSlug,
  children,
}: TenantThemeProviderProps) {
  const { theme, isLoading, isError, businessName } = useTenantTheme({
    tenantSlug,
  })

  // Set document title with business name
  useEffect(() => {
    if (businessName) {
      document.title = `${businessName} - Book Appointment`
    }
  }, [businessName])

  // Inject scoped CSS variables and custom styles
  useEffect(() => {
    if (!theme || typeof window === "undefined") return

    // Create or update scoped style element
    const styleId = "tenant-theme-scoped"
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null

    if (!styleEl) {
      styleEl = document.createElement("style")
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }

    // Generate scoped CSS variables
    // Uses .portal-theme-scope class to limit scope to portal only
    let scopedCss = `
.portal-theme-scope {
  --color-primary: ${theme.primaryColor};
  --color-primary-hover: ${adjustColorBrightness(theme.primaryColor, -10)};
  --color-brand: ${theme.brandColor};
`

    if (theme.secondaryColor) {
      scopedCss += `  --color-secondary: ${theme.secondaryColor};\n`
    }

    if (theme.accentColor) {
      scopedCss += `  --color-accent: ${theme.accentColor};\n`
    }

    if (theme.fontFamily) {
      scopedCss += `  --font-family-base: ${theme.fontFamily};\n`
    }

    scopedCss += "}\n"

    // Append custom CSS if provided (tenant-specific overrides)
    if (theme.customCss) {
      scopedCss += `\n/* Tenant custom CSS */\n${theme.customCss}\n`
    }

    styleEl.textContent = scopedCss

    // Set favicon if provided
    if (theme.faviconUrl) {
      let faviconLink = document.querySelector(
        "link[rel='icon']"
      ) as HTMLLinkElement | null

      if (!faviconLink) {
        faviconLink = document.createElement("link")
        faviconLink.rel = "icon"
        document.head.appendChild(faviconLink)
      }

      faviconLink.href = theme.faviconUrl
    }

    // Cleanup on unmount
    return () => {
      const el = document.getElementById(styleId)
      if (el) {
        el.remove()
      }
    }
  }, [theme])

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />
  }

  // Error state
  if (isError || !theme) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="text-6xl">😕</div>
          <h1 className="text-2xl font-semibold">Booking page not found</h1>
          <p className="text-muted-foreground">
            We couldn&apos;t find a booking page for &quot;{tenantSlug}&quot;.
            Please check the URL and try again.
          </p>
        </div>
      </div>
    )
  }

  // Provide theme context to children
  return (
    <ThemeContext.Provider
      value={{
        theme,
        businessName: businessName ?? "Booking Portal",
      }}
    >
      {/* Apply portal-theme-scope class to enable scoped CSS variables */}
      <div className="portal-theme-scope min-h-screen">
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

/**
 * Loading skeleton for theme provider
 */
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </div>
  )
}

/**
 * Adjust hex color brightness by a percentage
 * @param hex - Hex color string (e.g. "#FF0000")
 * @param percent - Brightness adjustment (-100 to 100)
 * @returns Adjusted hex color
 */
function adjustColorBrightness(hex: string, percent: number): string {
  // Remove # if present
  const cleanHex = hex.replace("#", "")

  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)

  // Adjust brightness
  const adjust = (val: number) => {
    const adjusted = val + (val * percent) / 100
    return Math.max(0, Math.min(255, Math.round(adjusted)))
  }

  const newR = adjust(r)
  const newG = adjust(g)
  const newB = adjust(b)

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`
}
