"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { SidebarNav } from "./sidebar-nav"

interface AdminSidebarUser {
  name?: string | null
  email?: string | null
  imageUrl?: string | null
}

interface AdminSidebarProps {
  user?: AdminSidebarUser
  permissions?: string[]
  isPlatformAdmin?: boolean
  className?: string
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

export function AdminSidebar({
  user,
  permissions = [],
  isPlatformAdmin = false,
  className,
}: AdminSidebarProps) {
  const [storedCollapsed, setCollapsed] = useLocalStorage("sidebar-collapsed", false)
  const [hasMounted, setHasMounted] = React.useState(false)

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  // Always render expanded on server to avoid hydration mismatch,
  // then switch to stored value after mount
  const collapsed = hasMounted ? storedCollapsed : false

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out shrink-0",
          collapsed ? "w-[60px]" : "w-[240px]",
          className
        )}
        aria-label="Admin sidebar"
      >
        {/* Logo */}
        <div className={cn(
          "flex h-14 items-center border-b border-sidebar-border shrink-0",
          collapsed ? "justify-center px-0" : "px-4 gap-2"
        )}>
          {!collapsed && (
            <Link
              href="/admin"
              className="flex items-center gap-2 font-semibold text-sidebar-foreground hover:opacity-80 transition-opacity"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shrink-0">
                <span className="text-xs font-bold text-primary-foreground">IH</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">Ironheart</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/admin" aria-label="Ironheart home">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-bold text-primary-foreground">IH</span>
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <SidebarNav
          collapsed={collapsed}
          permissions={permissions}
          isPlatformAdmin={isPlatformAdmin}
        />

        {/* Footer */}
        <div className="shrink-0 border-t border-sidebar-border">
          {!collapsed && user && (
            <div className="px-3 py-3">
              <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={user.imageUrl ?? undefined} alt={user.name ?? "User"} />
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">
                    {user.name ?? "User"}
                  </p>
                  <p className="text-[10px] text-sidebar-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}
          {collapsed && user && (
            <div className="flex justify-center py-3">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.imageUrl ?? undefined} alt={user.name ?? "User"} />
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          <Separator className="bg-sidebar-border" />

          {/* Collapse toggle */}
          <div className={cn("px-2 py-2", collapsed && "flex justify-center")}>
            <Button
              variant="ghost"
              size={collapsed ? "icon-sm" : "sm"}
              className={cn(
                "text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
                !collapsed && "w-full justify-start gap-2"
              )}
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
