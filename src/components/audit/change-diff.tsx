"use client"

import { useMemo } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Change {
  field: string
  before: unknown
  after: unknown
}

interface ChangeDiffProps {
  changes: Change[]
  isExpanded?: boolean
  onExpandChange?: (expanded: boolean) => void
}

/**
 * Formats a value for display in the diff viewer
 * Handles strings, numbers, booleans, objects, arrays, null, undefined
 */
const formatValue = (value: unknown): string => {
  if (value === null) {
    return "null"
  }
  if (value === undefined) {
    return "undefined"
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number") {
    return String(value)
  }
  // For objects and arrays, return JSON string
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/**
 * Determines if a value is a complex type (object or array)
 */
const isComplexValue = (value: unknown): boolean => {
  return (
    typeof value === "object" &&
    value !== null &&
    (Array.isArray(value) || typeof value === "object")
  )
}

/**
 * Renders a formatted value with syntax highlighting for JSON
 */
interface FormattedValueProps {
  value: unknown
  label: "Before" | "After"
}

function FormattedValue({ value, label }: FormattedValueProps) {
  const isComplex = isComplexValue(value)
  const formatted = formatValue(value)
  const isEmpty = formatted === "null" || formatted === "undefined"

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      {isEmpty ? (
        <div
          className={cn(
            "px-3 py-2 rounded-md text-sm font-medium",
            "bg-muted text-muted-foreground"
          )}
        >
          {formatted}
        </div>
      ) : isComplex ? (
        <pre
          className={cn(
            "overflow-auto rounded-md border border-border bg-muted p-3",
            "text-xs font-mono leading-relaxed max-h-60 whitespace-pre-wrap break-words"
          )}
        >
          <code className="text-muted-foreground">{formatted}</code>
        </pre>
      ) : (
        <div
          className={cn(
            "px-3 py-2 rounded-md bg-muted",
            "text-sm font-mono break-words"
          )}
        >
          {formatted}
        </div>
      )}
    </div>
  )
}

/**
 * Individual change row component
 * Displays a single field change with before/after comparison
 */
interface ChangeRowProps {
  change: Change
  isDesktop: boolean
}

function ChangeRow({ change, isDesktop }: ChangeRowProps) {
  const beforeIsComplex = isComplexValue(change.before)
  const afterIsComplex = isComplexValue(change.after)
  const maxHeight = beforeIsComplex || afterIsComplex ? "max-h-96" : "max-h-auto"

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Field name */}
      <div className="px-4 py-3 bg-muted/40">
        <p className="text-sm font-semibold text-foreground break-words">
          {change.field}
        </p>
      </div>

      {/* Desktop: Side-by-side layout */}
      {isDesktop ? (
        <div className="grid grid-cols-2 gap-4 p-4">
          <div className={cn("flex flex-col gap-2", maxHeight)}>
            <FormattedValue value={change.before} label="Before" />
          </div>
          <div className={cn("flex flex-col gap-2", maxHeight)}>
            <FormattedValue value={change.after} label="After" />
          </div>
        </div>
      ) : (
        /* Mobile: Stacked layout */
        <div className="space-y-4 p-4">
          <FormattedValue value={change.before} label="Before" />
          <FormattedValue value={change.after} label="After" />
        </div>
      )}

      {/* Visual indicator: removed vs added */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/20">
        <div className="flex gap-2 items-center">
          {change.before !== undefined && change.before !== null && (
            <Badge variant="destructive" className="text-xs">
              Removed
            </Badge>
          )}
          {change.after !== undefined && change.after !== null && (
            <Badge variant="success" className="text-xs">
              Added
            </Badge>
          )}
        </div>
        {/* Show data types for complex values */}
        <div className="text-xs text-muted-foreground space-x-2">
          {beforeIsComplex && (
            <span className="inline-block">
              before: <code className="font-mono">{Array.isArray(change.before) ? "array" : "object"}</code>
            </span>
          )}
          {afterIsComplex && (
            <span className="inline-block">
              after: <code className="font-mono">{Array.isArray(change.after) ? "array" : "object"}</code>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * ChangeDiff Component
 *
 * Displays before/after comparison for field changes with:
 * - Side-by-side layout on desktop, stacked on mobile
 * - Color coding: red for removed (before), green for added (after)
 * - Handles different value types: strings, numbers, booleans, objects, arrays
 * - JSON formatting with syntax highlighting for complex types
 * - Field-by-field comparison in a table/grid layout
 * - Empty state when no changes
 *
 * @param changes - Array of { field, before, after } objects
 * @param isExpanded - Whether the diff should show all changes or be collapsed
 * @param onExpandChange - Callback when expand/collapse state changes
 */
export function ChangeDiff({
  changes,
  isExpanded = true,
  onExpandChange,
}: ChangeDiffProps) {
  // Detect if we're on desktop (used for responsive layout)
  const isDesktop = useMemo(() => {
    if (typeof window === "undefined") return true
    return window.innerWidth >= 768 // md breakpoint
  }, [])

  // Handle empty state
  if (!changes || changes.length === 0) {
    return (
      <Card className="border-muted-foreground/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No changes to display</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-muted-foreground/20 overflow-hidden">
      {/* Header with expand/collapse */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => onExpandChange?.(!isExpanded)}
        role="button"
        tabIndex={0}
        aria-label={isExpanded ? "Collapse changes" : "Expand changes"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onExpandChange?.(!isExpanded)
          }
        }}
      >
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">
            Changes ({changes.length})
          </h4>
        </div>
        <span
          className="p-1 hover:bg-muted rounded-md transition-colors"
          aria-hidden="true"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
      </div>

      {/* Content - conditionally rendered based on isExpanded */}
      {isExpanded && (
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {changes.map((change, index) => (
              <ChangeRow
                key={`${change.field}-${index}`}
                change={change}
                isDesktop={isDesktop}
              />
            ))}
          </div>
        </CardContent>
      )}

      {/* Collapsed state indicator */}
      {!isExpanded && (
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            {changes.length} field{changes.length !== 1 ? "s" : ""} changed
          </p>
        </CardContent>
      )}
    </Card>
  )
}

export type { Change, ChangeDiffProps }
