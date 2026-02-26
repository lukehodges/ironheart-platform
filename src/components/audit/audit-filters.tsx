"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { DateRangePicker } from "@/components/analytics/date-range-picker"
import type { AuditLogFilters } from "@/modules/audit/audit.types"
import type { DateRange } from "@/components/analytics/date-range-picker"
import { cn } from "@/lib/utils"

interface AuditFiltersProps {
  /** Current filters applied */
  filters: AuditLogFilters
  /** Callback when filters change */
  onFiltersChange: (filters: AuditLogFilters) => void
  /** Callback when filters are reset */
  onReset: () => void
  /** List of users to populate actor dropdown */
  users?: Array<{
    id: string
    name: string
    email: string
  }>
  /** Whether filter panel is open by default */
  defaultOpen?: boolean
  /** Whether currently loading actors data */
  loadingUsers?: boolean
}

const RESOURCE_TYPES = [
  { value: "booking", label: "Booking" },
  { value: "customer", label: "Customer" },
  { value: "staff", label: "Staff" },
  { value: "service", label: "Service" },
  { value: "workflow", label: "Workflow" },
  { value: "settings", label: "Settings" },
] as const

const ACTION_OPTIONS = [
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
] as const

/**
 * AuditFilters component for filtering audit log entries
 * Provides resource type multi-select, actor select, action select,
 * and date range picker with apply and reset buttons
 */
export function AuditFilters({
  filters,
  onFiltersChange,
  onReset,
  users = [],
  defaultOpen = true,
  loadingUsers = false,
}: AuditFiltersProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>(
    filters.resourceType ? [filters.resourceType] : []
  )
  const [selectedActor, setSelectedActor] = useState<string | undefined>(filters.actorId)
  const [selectedAction, setSelectedAction] = useState<string | undefined>(filters.action)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    filters.from && filters.to ? { from: filters.from, to: filters.to } : undefined
  )

  /**
   * Toggle resource type selection (single or multiple)
   */
  const toggleResourceType = (resourceType: string) => {
    setSelectedResourceTypes((prev) =>
      prev.includes(resourceType)
        ? prev.filter((rt) => rt !== resourceType)
        : [...prev, resourceType]
    )
  }

  /**
   * Apply filters - convert local state to filter object
   */
  const handleApplyFilters = () => {
    const newFilters: AuditLogFilters = {}

    // For now, take the first selected resource type (can be extended for multiple)
    if (selectedResourceTypes.length > 0) {
      newFilters.resourceType = selectedResourceTypes[0]
    }

    if (selectedActor) {
      newFilters.actorId = selectedActor as `${string}-${string}-${string}-${string}-${string}`
    }

    if (selectedAction) {
      newFilters.action = selectedAction
    }

    if (dateRange) {
      newFilters.from = dateRange.from
      newFilters.to = dateRange.to
    }

    onFiltersChange(newFilters)
  }

  /**
   * Reset all filters
   */
  const handleResetFilters = () => {
    setSelectedResourceTypes([])
    setSelectedActor(undefined)
    setSelectedAction(undefined)
    setDateRange(undefined)
    onReset()
  }

  /**
   * Check if any filters are active
   */
  const hasActiveFilters =
    selectedResourceTypes.length > 0 ||
    selectedActor ||
    selectedAction ||
    dateRange

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card className="border-border">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Filters</CardTitle>
                {hasActiveFilters && (
                  <div className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {(selectedResourceTypes.length > 0 ? 1 : 0) +
                      (selectedActor ? 1 : 0) +
                      (selectedAction ? 1 : 0) +
                      (dateRange ? 1 : 0)}
                  </div>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-5 pt-0">
            {/* Resource Type Multi-Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Resource Type</label>
              <div className="space-y-2">
                {RESOURCE_TYPES.map((resourceType) => (
                  <div key={resourceType.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`resource-${resourceType.value}`}
                      checked={selectedResourceTypes.includes(resourceType.value)}
                      onCheckedChange={() => toggleResourceType(resourceType.value)}
                    />
                    <label
                      htmlFor={`resource-${resourceType.value}`}
                      className="text-sm cursor-pointer font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {resourceType.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Actor Select */}
            <div className="space-y-2">
              <label htmlFor="actor-select" className="text-sm font-medium">
                Actor
              </label>
              <Select value={selectedActor || ""} onValueChange={setSelectedActor}>
                <SelectTrigger id="actor-select" disabled={loadingUsers}>
                  <SelectValue placeholder="Select an actor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actors</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {users.length === 0 && !loadingUsers && (
                <p className="text-xs text-muted-foreground">No users available</p>
              )}
            </div>

            {/* Action Select */}
            <div className="space-y-2">
              <label htmlFor="action-select" className="text-sm font-medium">
                Action
              </label>
              <Select value={selectedAction || ""} onValueChange={setSelectedAction}>
                <SelectTrigger id="action-select">
                  <SelectValue placeholder="Select an action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  {ACTION_OPTIONS.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                onReset={() => setDateRange(undefined)}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleApplyFilters}
                className="flex-1"
                disabled={!hasActiveFilters}
              >
                Apply Filters
              </Button>
              <Button
                onClick={handleResetFilters}
                variant="outline"
                className="flex-1"
                disabled={!hasActiveFilters}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
