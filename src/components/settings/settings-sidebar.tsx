"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SettingsTab } from "@/types/settings"
import {
  Settings,
  Bell,
  Plug,
  CreditCard,
  Package,
  Lock,
  AlertTriangle,
  UserCog,
  ClipboardCheck,
} from "lucide-react"

interface SettingsSidebarProps {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}

const SETTINGS_TABS: Array<{
  id: SettingsTab
  label: string
  icon: React.ReactNode
}> = [
  {
    id: "general",
    label: "General",
    icon: <Settings className="h-4 w-4" />,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell className="h-4 w-4" />,
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: <Plug className="h-4 w-4" />,
  },
  {
    id: "billing",
    label: "Billing",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    id: "modules",
    label: "Modules",
    icon: <Package className="h-4 w-4" />,
  },
  {
    id: "security",
    label: "Security",
    icon: <Lock className="h-4 w-4" />,
  },
  {
    id: "staff-custom-fields" as SettingsTab,
    label: "Staff Custom Fields",
    icon: <UserCog className="h-4 w-4" />,
  },
  {
    id: "staff-onboarding" as SettingsTab,
    label: "Onboarding Templates",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    id: "danger",
    label: "Danger",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
]

export function SettingsSidebar({
  activeTab,
  onTabChange,
}: SettingsSidebarProps) {
  return (
    <>
      {/* Desktop: Vertical Tabs */}
      <div className="hidden md:block">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onTabChange(value as SettingsTab)}
          orientation="vertical"
          className="w-full"
        >
          <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 gap-2">
            {SETTINGS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "w-full justify-start gap-3 px-4 py-3 rounded-lg",
                  "text-sm font-medium transition-all",
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                  "data-[state=inactive]:hover:bg-muted",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Mobile: Dropdown Select */}
      <div className="md:hidden mb-6">
        <Select value={activeTab} onValueChange={(value) => onTabChange(value as SettingsTab)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a settings tab" />
          </SelectTrigger>
          <SelectContent>
            {SETTINGS_TABS.map((tab) => (
              <SelectItem key={tab.id} value={tab.id}>
                <div className="flex items-center gap-2">
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

export type { SettingsSidebarProps }
