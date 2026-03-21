"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  OutreachContactWithDetails,
  OutreachSentiment,
} from "@/modules/outreach/outreach.types"

type SentimentFilter = "ALL" | "UNCATEGORIZED" | OutreachSentiment

interface ReplyListProps {
  contacts: OutreachContactWithDetails[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (contact: OutreachContactWithDetails) => void
  hasMore: boolean
  onLoadMore: () => void
}

const SENTIMENT_FILTERS: { label: string; value: SentimentFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Uncategorized", value: "UNCATEGORIZED" },
  { label: "Positive", value: "POSITIVE" },
  { label: "Not Now", value: "NOT_NOW" },
  { label: "Negative", value: "NEGATIVE" },
]

const SENTIMENT_BADGE_VARIANT: Record<
  OutreachSentiment,
  "success" | "warning" | "destructive" | "info"
> = {
  POSITIVE: "success",
  NEUTRAL: "info",
  NOT_NOW: "warning",
  NEGATIVE: "destructive",
}

const SENTIMENT_LABEL: Record<OutreachSentiment, string> = {
  POSITIVE: "Positive",
  NEUTRAL: "Neutral",
  NOT_NOW: "Not Now",
  NEGATIVE: "Negative",
}

export function ReplyList({
  contacts,
  isLoading,
  selectedId,
  onSelect,
  hasMore,
  onLoadMore,
}: ReplyListProps) {
  const [search, setSearch] = useState("")
  const [sentimentFilter, setSentimentFilter] =
    useState<SentimentFilter>("ALL")

  const filtered = useMemo(() => {
    let result = contacts

    // Sentiment filter
    if (sentimentFilter === "UNCATEGORIZED") {
      result = result.filter((c) => !c.replyCategory)
    } else if (sentimentFilter !== "ALL") {
      result = result.filter((c) => c.sentiment === sentimentFilter)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          `${c.customerFirstName} ${c.customerLastName}`
            .toLowerCase()
            .includes(q) ||
          c.customerEmail?.toLowerCase().includes(q) ||
          c.sequenceName.toLowerCase().includes(q)
      )
    }

    return result
  }, [contacts, sentimentFilter, search])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-9 w-full" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="p-4 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or sequence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Sentiment filters */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        {SENTIMENT_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={sentimentFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSentimentFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No replies match your filters.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((contact) => {
              const isUncategorized = !contact.replyCategory
              const name = `${contact.customerFirstName} ${contact.customerLastName}`

              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => onSelect(contact)}
                  className={cn(
                    "w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent",
                    selectedId === contact.id && "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {/* Blue dot for uncategorized */}
                    {isUncategorized && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            isUncategorized
                              ? "font-bold text-foreground"
                              : "font-medium text-foreground"
                          )}
                        >
                          {name}
                        </span>
                        {contact.sentiment && (
                          <Badge
                            variant={SENTIMENT_BADGE_VARIANT[contact.sentiment]}
                            className="shrink-0"
                          >
                            {SENTIMENT_LABEL[contact.sentiment]}
                          </Badge>
                        )}
                      </div>
                      {contact.customerEmail && (
                        <p className="truncate text-xs text-muted-foreground">
                          {contact.customerEmail}
                        </p>
                      )}
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {contact.sequenceName} &middot; {contact.sector}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}

            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onLoadMore}
              >
                Load more
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
