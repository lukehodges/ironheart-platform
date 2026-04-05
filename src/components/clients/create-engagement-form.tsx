"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Search, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/trpc/react"
import { useDebounce } from "@/hooks/use-debounce"

interface CreateEngagementFormProps {
  customerId: string | null
  onCustomerSelect: (id: string, name: string) => void
  title: string
  onTitleChange: (value: string) => void
  type: "PROJECT" | "RETAINER"
  onTypeChange: (value: "PROJECT" | "RETAINER") => void
  description: string
  onDescriptionChange: (value: string) => void
  startDate: string
  onStartDateChange: (value: string) => void
}

export function CreateEngagementForm({
  customerId,
  onCustomerSelect,
  title,
  onTitleChange,
  type,
  onTypeChange,
  description,
  onDescriptionChange,
  startDate,
  onStartDateChange,
}: CreateEngagementFormProps) {
  const [customerSearch, setCustomerSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const debouncedSearch = useDebounce(customerSearch, 300)

  const { data: customers } = api.clientPortal.admin.searchCustomers.useQuery(
    { query: debouncedSearch, limit: 10 },
    { enabled: debouncedSearch.length >= 1 }
  )

  useEffect(() => {
    setShowDropdown(debouncedSearch.length >= 1 && !customerId)
  }, [debouncedSearch, customerId])

  return (
    <div className="space-y-5">
      {/* Customer selector */}
      <div>
        <Label>Client</Label>
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={customerSearch}
            onChange={(e) => { setCustomerSearch(e.target.value); onCustomerSelect("", "") }}
            placeholder="Search existing clients..."
            className="pl-9"
          />
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-card shadow-lg z-10 overflow-hidden">
              {customers?.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors"
                  onClick={() => {
                    const name = [c.firstName, c.lastName].filter(Boolean).join(" ")
                    onCustomerSelect(c.id, name)
                    setCustomerSearch(name)
                    setShowDropdown(false)
                  }}
                >
                  <p className="text-sm font-medium">{[c.firstName, c.lastName].filter(Boolean).join(" ")}</p>
                  {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                </button>
              ))}
              {(!customers || customers.length === 0) && debouncedSearch.length >= 1 && (
                <div className="px-3 py-2.5 text-sm text-muted-foreground">No clients found</div>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Search by name or email.</p>
      </div>

      {/* Title */}
      <div>
        <Label>Engagement Title</Label>
        <Input value={title} onChange={(e) => onTitleChange(e.target.value)} className="mt-1.5" placeholder="e.g. AI Strategy & Implementation Roadmap" />
      </div>

      {/* Type toggle */}
      <div>
        <Label>Engagement Type</Label>
        <div className="flex gap-0 border rounded-md w-fit mt-1.5 overflow-hidden">
          <button
            onClick={() => onTypeChange("PROJECT")}
            className={cn(
              "px-5 py-2 text-sm font-medium border-r transition-colors",
              type === "PROJECT" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
            )}
          >
            Project
          </button>
          <button
            onClick={() => onTypeChange("RETAINER")}
            className={cn(
              "px-5 py-2 text-sm font-medium transition-colors",
              type === "RETAINER" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
            )}
          >
            Retainer
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Project = fixed scope and price. Retainer = ongoing monthly engagement.</p>
      </div>

      {/* Description */}
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => onDescriptionChange(e.target.value)} className="mt-1.5" placeholder="Brief description of the engagement scope and goals..." rows={4} />
      </div>

      {/* Start Date */}
      <div>
        <Label>Start Date <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className="mt-1.5 w-[200px]" />
        <p className="text-xs text-muted-foreground mt-1">Leave blank if the start date depends on proposal acceptance.</p>
      </div>
    </div>
  )
}
