"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { type NavSection, navSections } from "./nav-config"

interface SidebarNavProps {
  collapsed?: boolean
  permissions?: string[]
  isPlatformAdmin?: boolean
  onNavigate?: () => void
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin"
  return pathname.startsWith(href)
}

function hasPermission(
  permission: string | undefined,
  permissions: string[]
): boolean {
  if (!permission) return true
  if (permissions.includes("*:*")) return true
  if (permissions.includes(permission)) return true
  const [resource, action] = permission.split(":")
  if (permissions.includes(`${resource}:*`)) return true
  if (permissions.includes(`*:${action}`)) return true
  return false
}

function filterSection(
  section: NavSection,
  permissions: string[],
  isPlatformAdmin: boolean
): NavSection {
  const items = section.items.filter((item) => {
    if (item.isPlatformAdmin && !isPlatformAdmin) return false
    if (item.permission && !hasPermission(item.permission, permissions)) return false
    return true
  })
  return { ...section, items }
}

export function SidebarNav({
  collapsed = false,
  permissions = [],
  isPlatformAdmin = false,
  onNavigate,
}: SidebarNavProps) {
  const pathname = usePathname()

  const visibleSections = navSections
    .map((s) => filterSection(s, permissions, isPlatformAdmin))
    .filter((s) => s.items.length > 0)

  return (
    <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin" aria-label="Main navigation">
      {visibleSections.map((section, idx) => (
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
              const Icon = item.icon

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
