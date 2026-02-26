"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
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
  Settings,
  Code,
  Code2,
  Building2,
  LayoutDashboard,
  Search,
  ScrollText,
  Shield,
  Bell,
  Globe,
  type LucideIcon,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { api } from "@/lib/trpc/react"
import { moduleRegistry } from "@/shared/module-system/register-all"
import { buildNavSections } from "./nav-builder"

/**
 * Map of icon string names (from module manifests) to Lucide icon components.
 * Shared with sidebar-nav.tsx — kept in sync.
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
}

function resolveIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? LayoutDashboard
}

// Context for opening the command palette from anywhere + carrying tenant config
interface CommandPaletteConfig {
  enabledModuleSlugs: string[]
  permissions: string[]
  isPlatformAdmin: boolean
}

interface CommandPaletteContextType {
  open: () => void
  close: () => void
  configure: (config: CommandPaletteConfig) => void
}

const CommandPaletteContext = React.createContext<CommandPaletteContextType>({
  open: () => {},
  close: () => {},
  configure: () => {},
})

export function useCommandPalette() {
  return React.useContext(CommandPaletteContext)
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [config, setConfig] = React.useState<CommandPaletteConfig>({
    enabledModuleSlugs: [],
    permissions: [],
    isPlatformAdmin: false,
  })

  const value = React.useMemo(
    () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      configure: (c: CommandPaletteConfig) => setConfig(c),
    }),
    []
  )

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette isOpen={isOpen} onOpenChange={setIsOpen} config={config} />
    </CommandPaletteContext.Provider>
  )
}

interface CommandPaletteProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  config: CommandPaletteConfig
}

/**
 * Build a lookup from module slug → icon string + primary route href.
 * Used to resolve search result type → icon/href dynamically.
 */
function buildResultTypeMeta(enabledSlugs: string[]) {
  const meta = new Map<string, { icon: string; href: string }>()
  const manifests = moduleRegistry.getEnabledManifests(enabledSlugs)
  for (const m of manifests) {
    const primaryRoute = m.routes[0]
    if (primaryRoute) {
      meta.set(m.slug, { icon: m.icon, href: primaryRoute.path })
    }
  }
  return meta
}

export function CommandPalette({ isOpen, onOpenChange, config }: CommandPaletteProps) {
  const router = useRouter()

  const [searchValue, setSearchValue] = React.useState("")

  const navigate = React.useCallback(
    (href: string) => {
      onOpenChange?.(false)
      router.push(href)
    },
    [router, onOpenChange]
  )

  // Reset search value when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setSearchValue("")
    }
  }, [isOpen])

  const { data: searchData } = api.search.globalSearch.useQuery(
    { query: searchValue, limit: 10 },
    { enabled: searchValue.length >= 2 }
  )

  // Build navigate items from module manifests (same source as sidebar)
  const { enabledModuleSlugs, permissions, isPlatformAdmin } = config

  const navSections = React.useMemo(
    () => buildNavSections(moduleRegistry, enabledModuleSlugs, permissions, isPlatformAdmin),
    [enabledModuleSlugs, permissions, isPlatformAdmin]
  )

  // Flatten all nav items for the Navigate group, prepending Dashboard
  const pages = React.useMemo(() => {
    const items: { title: string; href: string; icon: string }[] = [
      { title: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
    ]
    for (const section of navSections) {
      for (const item of section.items) {
        items.push({ title: item.title, href: item.href, icon: item.icon })
      }
    }
    return items
  }, [navSections])

  // Build quick actions from module manifests
  const actions = React.useMemo(
    () => moduleRegistry.getQuickActions(enabledModuleSlugs),
    [enabledModuleSlugs]
  )

  // Lookup for search result type → icon + href
  const resultTypeMeta = React.useMemo(
    () => buildResultTypeMeta(enabledModuleSlugs),
    [enabledModuleSlugs]
  )

  return (
    <CommandDialog open={isOpen} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search pages, customers, bookings..."
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>
          {searchValue.length < 2 ? "Type to search..." : "No results found."}
        </CommandEmpty>

        {actions.length > 0 && (
          <CommandGroup heading="Quick Actions">
            {actions.map((action) => (
              <CommandItem
                key={action.href}
                onSelect={() => navigate(action.href)}
              >
                <span>{action.title}</span>
                {action.shortcut && (
                  <CommandShortcut>{action.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {searchData && searchData.groups.length > 0 && (
          <>
            <CommandSeparator />

            {searchData.groups.map((group) => {
              const meta = resultTypeMeta.get(group.type)
              const GroupIcon = resolveIcon(meta?.icon ?? "LayoutDashboard")
              const baseHref = meta?.href ?? "/admin"

              return (
                <CommandGroup key={group.type} heading={group.label}>
                  {group.results.map((result) => (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      onSelect={() => navigate(`${baseHref}/${result.id}`)}
                      className="gap-2"
                    >
                      <GroupIcon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>{result.label}</span>
                        {result.secondary && (
                          <span className="text-xs text-muted-foreground">
                            {result.secondary}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {pages.map((page) => {
            const Icon = resolveIcon(page.icon)
            return (
              <CommandItem
                key={page.href}
                onSelect={() => navigate(page.href)}
                className="gap-2"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{page.title}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
