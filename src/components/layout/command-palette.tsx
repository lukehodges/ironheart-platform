"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Users,
  UserCheck,
  Clock,
  Zap,
  FileText,
  Star,
  CreditCard,
  BarChart3,
  Settings,
  Code2,
  Building2,
  LayoutDashboard,
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

// Context for opening the command palette from anywhere
interface CommandPaletteContextType {
  open: () => void
  close: () => void
}

const CommandPaletteContext = React.createContext<CommandPaletteContextType>({
  open: () => {},
  close: () => {},
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

  const value = React.useMemo(
    () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    []
  )

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette isOpen={isOpen} onOpenChange={setIsOpen} />
    </CommandPaletteContext.Provider>
  )
}

interface CommandPaletteProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CommandPalette({ isOpen, onOpenChange }: CommandPaletteProps) {
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

  const pages = [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { title: "Bookings", href: "/admin/bookings", icon: Calendar },
    { title: "Customers", href: "/admin/customers", icon: Users },
    { title: "Team", href: "/admin/team", icon: UserCheck },
    { title: "Scheduling", href: "/admin/scheduling", icon: Clock },
    { title: "Workflows", href: "/admin/workflows", icon: Zap },
    { title: "Forms", href: "/admin/forms", icon: FileText },
    { title: "Reviews", href: "/admin/reviews", icon: Star },
    { title: "Payments", href: "/admin/payments", icon: CreditCard },
    { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { title: "Developer", href: "/admin/developer", icon: Code2 },
    { title: "Tenants", href: "/platform/tenants", icon: Building2 },
    { title: "Settings", href: "/admin/settings", icon: Settings },
  ]

  const actions = [
    {
      title: "New Booking",
      shortcut: "⌘N",
      onSelect: () => navigate("/admin/bookings/new"),
    },
    {
      title: "New Customer",
      onSelect: () => navigate("/admin/customers/new"),
    },
    {
      title: "New Workflow",
      onSelect: () => navigate("/admin/workflows/new"),
    },
  ]

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

        <CommandGroup heading="Quick Actions">
          {actions.map((action) => (
            <CommandItem
              key={action.title}
              onSelect={action.onSelect}
            >
              <span>{action.title}</span>
              {action.shortcut && (
                <CommandShortcut>{action.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        {searchData && searchData.results.length > 0 && (
          <>
            <CommandSeparator />

            <CommandGroup heading="Search Results">
              {searchData.results.map((result) => {
                const Icon = result.type === "customer" ? Users : Calendar
                const href =
                  result.type === "customer"
                    ? "/admin/customers"
                    : "/admin/bookings"
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => navigate(href)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{result.label}</span>
                      {result.secondary && (
                        <span className="text-xs text-muted-foreground">
                          {result.secondary}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {pages.map((page) => {
            const Icon = page.icon
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
