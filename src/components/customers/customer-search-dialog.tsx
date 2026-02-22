"use client"

import { useState } from "react"
import { Search, User } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { useDebounce } from "@/hooks/use-debounce"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { CustomerRecord } from "@/modules/customer/customer.types"

interface CustomerSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Customer ID to exclude from results (e.g. the one being merged) */
  excludeId?: string
  title?: string
  description?: string
  onSelect: (customer: CustomerRecord) => void
}

export function CustomerSearchDialog({
  open,
  onOpenChange,
  excludeId,
  title = "Search Customers",
  description = "Type to search for a customer by name or email.",
  onSelect,
}: CustomerSearchDialogProps) {
  const [searchInput, setSearchInput] = useState("")
  const debouncedSearch = useDebounce(searchInput, 300)

  const { data, isLoading } = api.customer.list.useQuery(
    { search: debouncedSearch, limit: 10 },
    { enabled: debouncedSearch.length >= 2 }
  )

  const results = ((data?.rows ?? []) as CustomerRecord[]).filter(
    (c) => c.id !== excludeId
  )

  function handleSelect(customer: CustomerRecord) {
    setSearchInput("")
    onSelect(customer)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSearchInput("")
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              aria-label="Search customers"
              autoFocus
            />
          </div>

          {/* Results */}
          <ScrollArea className="max-h-[300px]">
            {debouncedSearch.length < 2 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Type at least 2 characters to search.
              </p>
            ) : isLoading ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No customers found for &ldquo;{debouncedSearch}&rdquo;.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {results.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className="flex items-center gap-3 w-full p-3 text-left hover:bg-accent rounded-md transition-colors"
                    onClick={() => handleSelect(customer)}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {customer.name}
                      </p>
                      {customer.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {customer.email}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
