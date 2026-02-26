"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
} from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MobileSidebar } from "./mobile-sidebar"
import { useCommandPalette } from "./command-palette"

interface AdminTopbarUser {
  name?: string | null
  email?: string | null
  imageUrl?: string | null
}

interface AdminTopbarProps {
  user?: AdminTopbarUser
  permissions?: string[]
  isPlatformAdmin?: boolean
  enabledModuleSlugs?: string[]
}

// Build breadcrumbs from pathname
function useBreadcrumbs() {
  const pathname = usePathname()

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment, index, arr) => {
      const href = "/" + arr.slice(0, index + 1).join("/")
      const label =
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
      return { label, href }
    })

  return segments
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  if (email) return email[0].toUpperCase()
  return "U"
}

function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="gap-2">
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span>Theme</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
          <Sun className="h-4 w-4" />
          Light
          {theme === "light" && <ChevronRight className="ml-auto h-3 w-3" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
          <Moon className="h-4 w-4" />
          Dark
          {theme === "dark" && <ChevronRight className="ml-auto h-3 w-3" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
          <Monitor className="h-4 w-4" />
          System
          {theme === "system" && <ChevronRight className="ml-auto h-3 w-3" />}
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

export function AdminTopbar({
  user,
  permissions = [],
  isPlatformAdmin = false,
  enabledModuleSlugs = [],
}: AdminTopbarProps) {
  const router = useRouter()
  const breadcrumbs = useBreadcrumbs()
  const { open: openCommand, configure: configureCommand } = useCommandPalette()

  // Push tenant context into the command palette so it can derive items dynamically
  React.useEffect(() => {
    configureCommand({ enabledModuleSlugs, permissions, isPlatformAdmin })
  }, [configureCommand, enabledModuleSlugs, permissions, isPlatformAdmin])

  // ⌘K / Ctrl+K shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        openCommand()
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [openCommand])

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">

        {/* Mobile sidebar trigger */}
        <MobileSidebar permissions={permissions} isPlatformAdmin={isPlatformAdmin} enabledModuleSlugs={enabledModuleSlugs} />

        {/* Breadcrumbs — desktop only */}
        <nav
          className="hidden lg:flex items-center gap-1 text-sm min-w-0 flex-1"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center gap-1 text-muted-foreground">
            {breadcrumbs.map((crumb, idx) => (
              <li key={crumb.href} className="flex items-center gap-1">
                {idx > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden="true" />
                )}
                {idx === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-foreground truncate max-w-[200px]">
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    onClick={() => router.push(crumb.href)}
                    className="hover:text-foreground transition-colors truncate max-w-[120px]"
                  >
                    {crumb.label}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Mobile: spacer */}
        <div className="flex-1 lg:hidden" />

        {/* Right actions */}
        <div className="flex items-center gap-1">

          {/* Search / Command palette */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="hidden sm:flex h-8 w-8 sm:w-auto sm:px-3 gap-2 text-muted-foreground text-sm font-normal"
                onClick={openCommand}
                aria-label="Open command palette"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Search...</span>
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Search or run a command
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-5" />

          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="relative text-muted-foreground hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {/* Notification dot — shown when there are unread notifications */}
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full"
                aria-label="User menu"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage
                    src={user?.imageUrl ?? undefined}
                    alt={user?.name ?? "User"}
                  />
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {getInitials(user?.name, user?.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name ?? "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                onClick={() => router.push("/admin/profile")}
              >
                <User className="h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onClick={() => router.push("/admin/settings")}
              >
                <Settings className="h-4 w-4" />
                Settings
                <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
              </DropdownMenuItem>
              <ThemeToggle />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                destructive
                onClick={() => router.push("/sign-out")}
              >
                <LogOut className="h-4 w-4" />
                Sign out
                <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  )
}
