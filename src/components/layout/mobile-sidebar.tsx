"use client"

import * as React from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarNav } from "./sidebar-nav"

interface MobileSidebarProps {
  permissions?: string[]
  isPlatformAdmin?: boolean
}

export function MobileSidebar({
  permissions = [],
  isPlatformAdmin = false,
}: MobileSidebarProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[240px] bg-sidebar border-sidebar-border p-0 flex flex-col">
          <SheetHeader className="px-4 h-14 flex flex-row items-center border-b border-sidebar-border space-y-0">
            <SheetTitle asChild>
              <Link
                href="/admin"
                className="flex items-center gap-2 text-sidebar-foreground"
                onClick={() => setOpen(false)}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shrink-0">
                  <span className="text-xs font-bold text-primary-foreground">IH</span>
                </div>
                <span className="text-sm font-semibold tracking-tight">Ironheart</span>
              </Link>
            </SheetTitle>
          </SheetHeader>

          <TooltipProvider>
            <SidebarNav
              collapsed={false}
              permissions={permissions}
              isPlatformAdmin={isPlatformAdmin}
              onNavigate={() => setOpen(false)}
            />
          </TooltipProvider>
        </SheetContent>
      </Sheet>
    </>
  )
}
