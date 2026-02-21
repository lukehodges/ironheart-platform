"use client"

import { useState } from "react"
import { format, subDays, subMonths } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateRange {
  from: Date
  to: Date
}

interface DateRangePickerProps {
  value?: DateRange
  onChange: (range: DateRange) => void
  onReset?: () => void
}

// Pre-calculated preset date ranges
const PRESETS = [
  {
    label: "Last 7 days",
    value: "7d",
    getRange: () => {
      const to = new Date()
      const from = subDays(to, 7)
      return { from, to }
    },
  },
  {
    label: "Last 30 days",
    value: "30d",
    getRange: () => {
      const to = new Date()
      const from = subDays(to, 30)
      return { from, to }
    },
  },
  {
    label: "Last 90 days",
    value: "90d",
    getRange: () => {
      const to = new Date()
      const from = subDays(to, 90)
      return { from, to }
    },
  },
  {
    label: "Last 12 months",
    value: "12m",
    getRange: () => {
      const to = new Date()
      const from = subMonths(to, 12)
      return { from, to }
    },
  },
]

/**
 * DateRangePicker component for analytics dashboard
 * Provides preset buttons (7d, 30d, 90d, 12m) and custom range picker
 */
export function DateRangePicker({ value, onChange, onReset }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customRange, setCustomRange] = useState<DateRange | null>(null)
  const [fromDate, setFromDate] = useState<string>(value?.from ? format(value.from, "yyyy-MM-dd") : "")
  const [toDate, setToDate] = useState<string>(value?.to ? format(value.to, "yyyy-MM-dd") : "")

  const handlePresetClick = (preset: (typeof PRESETS)[number]) => {
    const range = preset.getRange()
    onChange(range)
    setIsOpen(false)
    setCustomRange(null)
  }

  const handleCustomApply = () => {
    if (fromDate && toDate) {
      const from = new Date(fromDate)
      const to = new Date(toDate)

      // Validate that from is before to
      if (from <= to) {
        onChange({ from, to })
        setCustomRange({ from, to })
        setIsOpen(false)
      }
    }
  }

  const handleReset = () => {
    setFromDate("")
    setToDate("")
    setCustomRange(null)
    onReset?.()
  }

  const displayText = value
    ? `${format(value.from, "MMM d")} - ${format(value.to, "MMM d, yyyy")}`
    : "Select date range"

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarIcon className="h-4 w-4" />
          <span className="text-sm">{displayText}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row gap-0 sm:gap-4 p-4">
          {/* Preset buttons section */}
          <div className="flex flex-col gap-2 sm:border-r sm:pr-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Quick select</p>
            <div className="flex flex-col gap-1">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={customRange ? "ghost" : "ghost"}
                  className="justify-start h-8 text-sm font-normal"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom date range section */}
          <div className="flex flex-col gap-4 min-w-max">
            <p className="text-xs font-medium text-muted-foreground">Custom range</p>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="from-date" className="text-xs text-muted-foreground">
                  From
                </label>
                <input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={cn(
                    "flex h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  )}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="to-date" className="text-xs text-muted-foreground">
                  To
                </label>
                <input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={cn(
                    "flex h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  )}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleCustomApply}
                disabled={!fromDate || !toDate}
                className="flex-1"
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                <X className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export type { DateRange }
