"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { buildNavSections, type NavSection } from "./nav-builder"
import { moduleRegistry } from "@/shared/module-system/register-all"
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  UserCheck,
  UserCog,
  Clock,
  Zap,
  FileText,
  Star,
  CreditCard,
  Receipt,
  BarChart3,
  Search,
  Code,
  Code2,
  Building2,
  Settings,
  ScrollText,
  Shield,
  Bell,
  Globe,
  Layers,
  Handshake,
  MapPin,
  ClipboardCheck,
  Package,
  GitCompareArrows,
  ShieldCheck,
  PoundSterling,
  LockKeyhole,
  Send,
  type LucideIcon,
} from "lucide-react"

/**
 * Map of icon string names (from module manifests) to Lucide icon components.
 * Used to resolve the string-based icon references returned by buildNavSections.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  UserCheck,
  UserCog,
  Clock,
  Zap,
  FileText,
  Star,
  CreditCard,
  Receipt,
  BarChart3,
  Search,
  Code,
  Code2,
  Building2,
  Settings,
  ScrollText,
  Shield,
  Bell,
  Globe,
  Layers,
  Handshake,
  MapPin,
  ClipboardCheck,
  Package,
  GitCompareArrows,
  ShieldCheck,
  PoundSterling,
  LockKeyhole,
  Send,
}

function resolveIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? LayoutDashboard
}

interface SidebarNavProps {
  collapsed?: boolean
  permissions?: string[]
  isPlatformAdmin?: boolean
  enabledModuleSlugs?: string[]
  onNavigate?: () => void
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin"
  return pathname.startsWith(href)
}

/**
 * Static nav items that are not part of the module registry:
 * - Dashboard: always shown (top-level, no module)
 * - Audit Log: shown if user has audit:read permission (matches audit.router)
 */
function buildStaticDashboardSection(): NavSection {
  return {
    items: [
      { title: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
    ],
  }
}

function buildStaticBrokerageSection(): NavSection {
  return {
    title: "Brokerage",
    items: [
      { title: "Dashboard",    href: "/admin/brokerage-mockups/dashboard",    icon: "LayoutDashboard" },
      { title: "Deals",        href: "/admin/brokerage-mockups/deals",        icon: "Handshake" },
      { title: "Sites",        href: "/admin/brokerage-mockups/sites",        icon: "MapPin" },
      { title: "Contacts",     href: "/admin/brokerage-mockups/contacts",     icon: "Users" },
      { title: "Assessments",  href: "/admin/brokerage-mockups/assessments",  icon: "ClipboardCheck" },
      { title: "Inventory",    href: "/admin/brokerage-mockups/inventory",    icon: "Package" },
      { title: "Matching",     href: "/admin/brokerage-mockups/matching",     icon: "GitCompareArrows" },
      { title: "Documents",    href: "/admin/brokerage-mockups/documents",    icon: "FileText" },
      { title: "Compliance",   href: "/admin/brokerage-mockups/compliance",   icon: "ShieldCheck" },
      { title: "Financials",   href: "/admin/brokerage-mockups/financials",   icon: "PoundSterling" },
      { title: "Reports",      href: "/admin/brokerage-mockups/reports",      icon: "BarChart3" },
      { title: "Settings",     href: "/admin/brokerage-mockups/settings",     icon: "Settings" },
    ],
  }
}

function buildStaticPortalsSection(): NavSection {
  return {
    title: "Portals (Preview)",
    items: [
      { title: "Landowner Portal",     href: "/admin/brokerage-mockups/portals/landowner",  icon: "LockKeyhole" },
      { title: "Developer Evidence",   href: "/admin/brokerage-mockups/portals/developer",  icon: "LockKeyhole" },
    ],
  }
}

function buildStaticAccountSection(permissions: string[]): NavSection | null {
  const items: NavSection["items"] = []

  // Audit Log - requires audit:read permission (aligned with audit.router.ts)
  const hasAuditPermission =
    !permissions.length || // if no permissions passed, don't filter
    permissions.includes("*:*") ||
    permissions.includes("audit:read") ||
    permissions.includes("audit:*") ||
    permissions.includes("*:read")

  if (hasAuditPermission) {
    items.push({
      title: "Audit Log",
      href: "/admin/audit",
      icon: "ScrollText",
      permission: "audit:read",
    })
  }

  return items.length > 0 ? { title: "Account", items } : null
}

export function SidebarNav({
  collapsed = false,
  permissions = [],
  isPlatformAdmin = false,
  enabledModuleSlugs = [],
  onNavigate,
}: SidebarNavProps) {
  const pathname = usePathname()

  // Build module-driven nav sections via nav-builder
  const moduleSections = buildNavSections(moduleRegistry, enabledModuleSlugs, permissions, isPlatformAdmin)

  // Assemble final sections: Dashboard + module sections + static account items
  const dashboardSection = buildStaticDashboardSection()
  const accountSection = buildStaticAccountSection(permissions)

  // Merge: if nav-builder already produced an "Account" section (e.g. Settings from tenant manifest),
  // append our static account items into it rather than duplicating
  const brokerageSection = buildStaticBrokerageSection()
  const portalsSection = buildStaticPortalsSection()

  const sections: NavSection[] = [dashboardSection]

  // Collect non-Account module sections first
  let mergedAccountSection: NavSection | null = null
  for (const section of moduleSections) {
    if (section.title === "Account") {
      // Defer Account section so Brokerage comes before it
      mergedAccountSection = accountSection
        ? { ...section, items: [...section.items, ...accountSection.items] }
        : section
    } else {
      sections.push(section)
    }
  }

  // Brokerage section - after module sections, before Portals and Account
  sections.push(brokerageSection)

  // Portals (Preview) section - after Brokerage, before Account
  sections.push(portalsSection)

  // Account section - always last
  if (mergedAccountSection) {
    sections.push(mergedAccountSection)
  } else if (accountSection) {
    sections.push(accountSection)
  }

  return (
    <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin" aria-label="Main navigation">
      {sections.map((section, idx) => (
        <div key={idx} className="mb-1">
          {section.title && !collapsed && (
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted-foreground">
              {section.title}
            </p>
          )}
          {section.title && collapsed && idx > 0 && (
            <div className="mx-3 mb-1 h-px bg-sidebar-border" />
          )}
          <ul role="list" className="space-y-0.5 px-2">
            {section.items.map((item) => {
              const active = isActive(item.href, pathname)
              const Icon = resolveIcon(item.icon)

              if (collapsed) {
                return (
                  <li key={item.href}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors mx-auto",
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                          aria-label={item.title}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.title}
                        {item.badge && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {item.badge}
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                )
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-primary-foreground" : "text-sidebar-muted-foreground group-hover:text-sidebar-accent-foreground"
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.title}</span>
                    {item.badge && (
                      <span className={cn(
                        "ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
