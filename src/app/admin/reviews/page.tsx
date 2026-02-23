"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Star,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  MoreHorizontal,
} from "lucide-react"
import { api } from "@/lib/trpc/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { ReviewRecord } from "@/modules/review/review.types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25

type VisibilityFilter = "ALL" | "PUBLIC" | "PRIVATE" | "ISSUES"

const FILTER_OPTIONS: { label: string; value: VisibilityFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Public", value: "PUBLIC" },
  { label: "Private", value: "PRIVATE" },
  { label: "Issues", value: "ISSUES" },
]

const RESOLUTION_OPTIONS: {
  label: string
  value: "CONTACTED" | "RESOLVED" | "DISMISSED"
}[] = [
  { label: "Contacted", value: "CONTACTED" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Dismissed", value: "DISMISSED" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "\u2014"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "\u2014"
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))
  const isFuture = diffMs < 0

  if (diffDays === 0) return "Today"

  if (isFuture) {
    if (diffDays === 1) return "Tomorrow"
    if (diffDays < 7) return `in ${diffDays} days`
    if (diffDays < 30) return `in ${Math.floor(diffDays / 7)}w`
    if (diffDays < 365) return `in ${Math.floor(diffDays / 30)}mo`
    return `in ${Math.floor(diffDays / 365)}y`
  }

  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return "\u2014"
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "\u2026"
}

function issueCategoryLabel(
  category: string | null | undefined,
): string {
  if (!category) return "\u2014"
  const labels: Record<string, string> = {
    LATE: "Late",
    QUALITY: "Quality",
    ATTITUDE: "Attitude",
    SAFETY: "Safety",
    OTHER: "Other",
  }
  return labels[category] ?? category
}

function issueCategoryBadgeVariant(
  category: string | null | undefined,
): "destructive" | "warning" | "secondary" {
  if (!category) return "secondary"
  if (category === "SAFETY") return "destructive"
  return "warning"
}

// ---------------------------------------------------------------------------
// Star rating component
// ---------------------------------------------------------------------------

function StarRating({ rating }: { rating: number | null | undefined }) {
  if (rating == null) {
    return <span className="text-xs text-muted-foreground italic">No rating</span>
  }

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < rating
              ? "h-4 w-4 fill-yellow-400 text-yellow-400"
              : "h-4 w-4 text-muted-foreground"
          }
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">{rating} out of 5 stars</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Table skeleton
// ---------------------------------------------------------------------------

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-7 w-7 rounded-md" /></TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Review row
// ---------------------------------------------------------------------------

interface ReviewRowProps {
  review: ReviewRecord
  onView: (review: ReviewRecord) => void
}

function ReviewRow({ review, onView }: ReviewRowProps) {
  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onView(review)}
      aria-label={`View review ${review.id}`}
    >
      {/* Customer */}
      <TableCell>
        <span className="text-sm font-medium text-foreground">
          {review.customerId ? `Customer` : "Anonymous"}
        </span>
      </TableCell>

      {/* Rating */}
      <TableCell>
        <StarRating rating={review.rating} />
      </TableCell>

      {/* Comment */}
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {truncate(review.comment, 60)}
        </span>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge
          variant={review.isPublic ? "success" : "secondary"}
          className="text-[10px]"
        >
          {review.isPublic ? "Public" : "Private"}
        </Badge>
      </TableCell>

      {/* Issue */}
      <TableCell>
        {review.issueCategory ? (
          <Badge
            variant={issueCategoryBadgeVariant(review.issueCategory)}
            className="text-[10px]"
          >
            {issueCategoryLabel(review.issueCategory)}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{"\u2014"}</span>
        )}
      </TableCell>

      {/* Date */}
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {formatRelativeDate(review.createdAt)}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onView(review)}
          aria-label="View review details"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Detail sheet
// ---------------------------------------------------------------------------

interface ReviewDetailSheetProps {
  review: ReviewRecord | null
  onClose: () => void
  onResolved: () => void
}

function ReviewDetailSheet({ review, onClose, onResolved }: ReviewDetailSheetProps) {
  const [resolutionStatus, setResolutionStatus] = useState<
    "CONTACTED" | "RESOLVED" | "DISMISSED" | ""
  >("")
  const [resolutionNotes, setResolutionNotes] = useState("")

  const resolveIssue = api.review.resolveIssue.useMutation({
    onSuccess: () => {
      toast.success("Issue resolved successfully")
      setResolutionStatus("")
      setResolutionNotes("")
      onResolved()
      onClose()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to resolve issue")
    },
  })

  const handleSubmitResolution = useCallback(() => {
    if (!review || !resolutionStatus) return
    resolveIssue.mutate({
      reviewId: review.id,
      resolutionStatus: resolutionStatus as "CONTACTED" | "RESOLVED" | "DISMISSED",
      resolutionNotes: resolutionNotes || undefined,
    })
  }, [review, resolutionStatus, resolutionNotes, resolveIssue])

  // Reset form when review changes
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setResolutionStatus("")
        setResolutionNotes("")
        onClose()
      }
    },
    [onClose],
  )

  return (
    <Sheet open={!!review} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Review Details</SheetTitle>
          <SheetDescription>
            Full review information and issue resolution.
          </SheetDescription>
        </SheetHeader>

        {review && (
          <div className="mt-6 space-y-6">
            {/* Rating */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Rating</Label>
              <StarRating rating={review.rating} />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Visibility</Label>
              <div>
                <Badge
                  variant={review.isPublic ? "success" : "secondary"}
                >
                  {review.isPublic ? "Public" : "Private"}
                </Badge>
              </div>
            </div>

            {/* Platform */}
            {review.platform && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Platform</Label>
                <p className="text-sm text-foreground">{review.platform}</p>
              </div>
            )}

            {/* Comment */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Comment</Label>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {review.comment || "No comment provided."}
              </p>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Submitted</Label>
              <p className="text-sm text-foreground">{formatDate(review.createdAt)}</p>
            </div>

            {/* Booking ID */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Booking ID</Label>
              <p className="text-sm text-foreground font-mono text-xs">
                {review.bookingId}
              </p>
            </div>

            {/* Issue section */}
            {review.issueCategory && (
              <>
                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
                    <span className="text-sm font-semibold text-foreground">
                      Flagged Issue
                    </span>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <div>
                      <Badge variant={issueCategoryBadgeVariant(review.issueCategory)}>
                        {issueCategoryLabel(review.issueCategory)}
                      </Badge>
                    </div>
                  </div>

                  {/* Existing resolution */}
                  {review.resolutionStatus && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Resolution Status
                        </Label>
                        <div>
                          <Badge variant="outline">{review.resolutionStatus}</Badge>
                        </div>
                      </div>
                      {review.resolutionNotes && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Resolution Notes
                          </Label>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {review.resolutionNotes}
                          </p>
                        </div>
                      )}
                      {review.resolvedAt && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Resolved At
                          </Label>
                          <p className="text-sm text-foreground">
                            {formatDate(review.resolvedAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resolve form (only if not yet resolved) */}
                  {!review.resolutionStatus && (
                    <div className="space-y-4 rounded-lg border border-border p-4">
                      <p className="text-sm font-medium text-foreground">
                        Resolve This Issue
                      </p>

                      <div className="space-y-2">
                        <Label htmlFor="resolution-status">Status</Label>
                        <Select
                          value={resolutionStatus}
                          onValueChange={(val) =>
                            setResolutionStatus(
                              val as "CONTACTED" | "RESOLVED" | "DISMISSED",
                            )
                          }
                        >
                          <SelectTrigger
                            id="resolution-status"
                            className="w-full"
                            aria-label="Resolution status"
                          >
                            <SelectValue placeholder="Select status..." />
                          </SelectTrigger>
                          <SelectContent>
                            {RESOLUTION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="resolution-notes">Notes (optional)</Label>
                        <Textarea
                          id="resolution-notes"
                          placeholder="Add resolution notes..."
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <Button
                        size="sm"
                        onClick={handleSubmitResolution}
                        disabled={!resolutionStatus || resolveIssue.isPending}
                      >
                        {resolveIssue.isPending ? "Saving..." : "Save Resolution"}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReviewsPage() {
  // Filter state
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("ALL")
  const [minRating, setMinRating] = useState<string>("")

  // Pagination state
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [cursorStack, setCursorStack] = useState<string[]>([])

  // Detail sheet state
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null)

  // Derive API filter params from visibility filter
  const isPublicFilter =
    visibilityFilter === "PUBLIC"
      ? true
      : visibilityFilter === "PRIVATE"
        ? false
        : undefined
  const hasIssueFilter = visibilityFilter === "ISSUES" ? true : undefined

  const { data, isLoading, isError, refetch } = api.review.list.useQuery({
    isPublic: isPublicFilter,
    hasIssue: hasIssueFilter,
    minRating: minRating ? Number(minRating) : undefined,
    limit: PAGE_SIZE,
    cursor,
  })

  const utils = api.useUtils()

  const rows = (data?.rows ?? []) as ReviewRecord[]
  const hasMore = data?.hasMore ?? false

  // Pagination helpers
  function goToNextPage() {
    if (!hasMore || rows.length === 0) return
    const nextCursor = rows[rows.length - 1]!.id
    setCursorStack((prev) => [...prev, cursor ?? ""])
    setCursor(nextCursor)
  }

  function goToPrevPage() {
    if (cursorStack.length === 0) return
    const prevCursor = cursorStack[cursorStack.length - 1]
    setCursorStack((prev) => prev.slice(0, -1))
    setCursor(prevCursor === "" ? undefined : prevCursor)
  }

  const isFirstPage = cursorStack.length === 0

  // Reset pagination when filters change
  function handleVisibilityFilter(filter: VisibilityFilter) {
    setVisibilityFilter(filter)
    setCursor(undefined)
    setCursorStack([])
  }

  function handleMinRatingChange(value: string) {
    setMinRating(value === "any" ? "" : value)
    setCursor(undefined)
    setCursorStack([])
  }

  const handleView = useCallback((review: ReviewRecord) => {
    setSelectedReview(review)
  }, [])

  const handleSheetClose = useCallback(() => {
    setSelectedReview(null)
  }, [])

  const handleResolved = useCallback(() => {
    void utils.review.list.invalidate()
  }, [utils])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <PageHeader
        title="Reviews"
        description="Monitor and moderate customer reviews."
      />

      {/* Filters */}
      <div className="space-y-3">
        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleVisibilityFilter(opt.value)}
              className={[
                "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                visibilityFilter === opt.value
                  ? "bg-primary text-primary-foreground border-transparent shadow"
                  : "border-input bg-background text-foreground hover:bg-accent",
              ].join(" ")}
              aria-pressed={visibilityFilter === opt.value}
            >
              {opt.label}
            </button>
          ))}

          {/* Rating filter */}
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-muted-foreground font-medium">
              Min rating:
            </span>
            <Select
              value={minRating || "any"}
              onValueChange={handleMinRatingChange}
            >
              <SelectTrigger
                className="h-7 w-[80px] text-xs"
                aria-label="Minimum rating filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border overflow-hidden">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-destructive font-medium">
              Failed to load reviews
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void refetch()}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Customer</TableHead>
                <TableHead className="w-[120px]">Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-[90px]">Issue</TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[48px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      variant="inbox"
                      title="No reviews found"
                      description={
                        visibilityFilter !== "ALL" || minRating
                          ? "No reviews match your current filters. Try adjusting your criteria."
                          : "Reviews will appear here once customers submit feedback."
                      }
                    />
                  </td>
                </TableRow>
              ) : (
                rows.map((review) => (
                  <ReviewRow
                    key={review.id}
                    review={review}
                    onView={handleView}
                  />
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && rows.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {rows.length} review{rows.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goToPrevPage}
              disabled={isFirstPage}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goToNextPage}
              disabled={!hasMore}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail sheet */}
      <ReviewDetailSheet
        review={selectedReview}
        onClose={handleSheetClose}
        onResolved={handleResolved}
      />
    </div>
  )
}
