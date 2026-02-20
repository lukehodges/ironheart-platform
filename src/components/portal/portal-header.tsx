"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface PortalHeaderProps {
  logoUrl?: string
  businessName: string
  showThemeToggle?: boolean
}

/**
 * Public portal header component
 *
 * Features:
 * - Tenant logo (left aligned) OR business name in heading font
 * - Optional theme toggle (sun/moon icon, right aligned)
 * - Simple, clean design
 * - Dark mode support
 * - Mobile responsive (collapses to logo only or stacked layout)
 *
 * @example
 * ```tsx
 * <PortalHeader
 *   logoUrl={theme?.logoUrl}
 *   businessName="Acme Bookings"
 *   showThemeToggle
 * />
 * ```
 */
export function PortalHeader({
  logoUrl,
  businessName,
  showThemeToggle = true,
}: PortalHeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Business Name */}
          <div className="flex items-center">
            {logoUrl ? (
              <div className="relative h-10 w-auto">
                <Image
                  src={logoUrl}
                  alt={businessName}
                  width={120}
                  height={40}
                  className="h-10 w-auto object-contain"
                  priority
                />
              </div>
            ) : (
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                {businessName}
              </h1>
            )}
          </div>

          {/* Theme Toggle */}
          {showThemeToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9"
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

/**
 * Mobile-optimized portal header variant
 * Stacks logo and business name vertically on small screens
 */
export function PortalHeaderMobile({
  logoUrl,
  businessName,
  showThemeToggle = true,
}: PortalHeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex min-h-16 items-center justify-between py-3">
          {/* Logo / Business Name - Stacked */}
          <div className="flex flex-col items-start space-y-1">
            {logoUrl && (
              <div className="relative h-8 w-auto">
                <Image
                  src={logoUrl}
                  alt={businessName}
                  width={100}
                  height={32}
                  className="h-8 w-auto object-contain"
                  priority
                />
              </div>
            )}
            <h1 className="text-sm font-medium text-muted-foreground">
              {businessName}
            </h1>
          </div>

          {/* Theme Toggle */}
          {showThemeToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8"
              aria-label="Toggle theme"
            >
              <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
