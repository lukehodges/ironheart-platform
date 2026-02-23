"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Calendar,
  Mail,
  Phone,
  Download,
  Trash2,
  Edit,
  Plus,
  FileText,
  Clock,
} from "lucide-react"
import { api } from "@/lib/trpc/react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/ui/empty-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface CustomerDetailSheetProps {
  customerId: string | null
  onClose: () => void
  onEdit?: (customerId: string) => void
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))
  const isFuture = diffMs < 0

  if (diffDays === 0) return "Today"

  if (isFuture) {
    if (diffDays === 1) return "Tomorrow"
    if (diffDays < 7) return `in ${diffDays} days`
    if (diffDays < 30) return `in ${Math.floor(diffDays / 7)} weeks`
    if (diffDays < 365) return `in ${Math.floor(diffDays / 30)} months`
    return `in ${Math.floor(diffDays / 365)} years`
  }

  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

function formatAbsoluteDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("")
}

function getBookingStatusVariant(
  status: string
): "success" | "warning" | "destructive" | "secondary" {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return "success"
    case "CONFIRMED":
    case "PENDING":
      return "warning"
    case "CANCELLED":
    case "NO_SHOW":
      return "destructive"
    default:
      return "secondary"
  }
}

// ---------------------------------------------------------------------------
// Bookings Tab
// ---------------------------------------------------------------------------

function BookingsTab({ customerId }: { customerId: string }) {
  const { data: history, isLoading } = api.customer.getBookingHistory.useQuery({
    customerId,
  })

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-border">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <EmptyState
        variant="calendar"
        title="No bookings yet"
        description="This customer has no booking history."
        className="py-8"
      />
    )
  }

  return (
    <div className="divide-y divide-border">
      {history.map((booking) => (
        <div
          key={booking.id}
          className="flex items-center gap-3 py-3 text-sm"
          aria-label={`Booking on ${formatAbsoluteDate(booking.scheduledDate)}`}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {formatAbsoluteDate(booking.scheduledDate)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatRelativeDate(booking.scheduledDate)}
            </p>
          </div>
          <Badge
            variant={getBookingStatusVariant(booking.status)}
            className="text-[10px] shrink-0"
          >
            {booking.status}
          </Badge>
          {booking.totalAmount != null && (
            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
              {formatCurrency(booking.totalAmount)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Notes Tab
// ---------------------------------------------------------------------------

function NotesTab({ customerId }: { customerId: string }) {
  const [noteContent, setNoteContent] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const utils = api.useUtils()

  const { data: notes, isLoading } = api.customer.listNotes.useQuery({
    customerId,
  })

  const addNoteMutation = api.customer.addNote.useMutation({
    onError: () => {
      toast.error("Failed to add note")
    },
    onSuccess: () => {
      setNoteContent("")
      setIsAdding(false)
      toast.success("Note added")
      void utils.customer.listNotes.invalidate({ customerId })
    },
  })

  function handleAddNote() {
    if (!noteContent.trim()) return
    addNoteMutation.mutate({
      customerId,
      content: noteContent.trim(),
      noteType: "GENERAL",
      isPrivate: false,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Add note UI */}
      {isAdding ? (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <Textarea
            placeholder="Write a note..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            className="min-h-[80px] text-sm"
            autoFocus
          />
          <div className="flex items-center gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAdding(false)
                setNoteContent("")
              }}
              disabled={addNoteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              loading={addNoteMutation.isPending}
              disabled={!noteContent.trim()}
            >
              Save Note
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Note
        </Button>
      )}

      {/* Notes list */}
      {!notes || notes.length === 0 ? (
        <EmptyState
          variant="documents"
          title="No notes yet"
          description="Add a note to keep track of important information."
          className="py-8"
        />
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-border p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {note.noteType}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeDate(note.createdAt)}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Forms Tab (placeholder — forms router returns completed form submissions)
// ---------------------------------------------------------------------------

function FormsTab({ customerId }: { customerId: string }) {
  // Forms completed by this customer are not directly queryable in the current
  // customer router — we display a helpful placeholder.
  // When the forms router exposes a getByCustomer endpoint, wire it here.
  return (
    <EmptyState
      icon={FileText}
      title="Form submissions"
      description="Completed form submissions for this customer will appear here."
      className="py-8"
    />
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton for the sheet
// ---------------------------------------------------------------------------

function SheetLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Profile card */}
      <div className="flex gap-4">
        <Skeleton className="h-16 w-16 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      <Separator />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>

      {/* Tabs placeholder */}
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CustomerDetailSheet({
  customerId,
  onClose,
  onEdit,
}: CustomerDetailSheetProps) {
  const isOpen = !!customerId

  const { data: customer, isLoading } = api.customer.getById.useQuery(
    { id: customerId! },
    { enabled: !!customerId }
  )

  const { data: history } = api.customer.getBookingHistory.useQuery(
    { customerId: customerId! },
    { enabled: !!customerId }
  )

  const utils = api.useUtils()

  const anonymiseMutation = api.customer.anonymise.useMutation({
    onSuccess: () => {
      toast.success("Customer data anonymised (GDPR)")
      void utils.customer.list.invalidate()
      onClose()
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to anonymise customer")
    },
  })

  const totalSpend = history?.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0) ?? 0
  const bookingCount = history?.length ?? 0

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col p-0"
        aria-label={customer ? `Customer detail: ${customer.name}` : "Customer detail"}
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="sr-only">Customer Detail</SheetTitle>
          <SheetDescription className="sr-only">
            Customer profile, bookings, notes, and actions
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-5">
            {isLoading ? (
              <SheetLoadingSkeleton />
            ) : !customer ? (
              <EmptyState
                title="Customer not found"
                description="This customer record could not be loaded."
                className="py-12"
              />
            ) : (
              <>
                {/* Profile card */}
                <div className="flex gap-4">
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarImage
                      src={customer.avatarUrl ?? undefined}
                      alt={customer.name}
                    />
                    <AvatarFallback className="text-sm font-medium">
                      {getInitials(customer.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground truncate">
                        {customer.name}
                      </h2>
                      <Badge
                        variant={customer.isActive ? "success" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {customer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {customer.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>Joined {formatAbsoluteDate(customer.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Bookings</p>
                    <p className="text-lg font-semibold mt-0.5">{bookingCount}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total spend</p>
                    <p className="text-base font-semibold mt-0.5 tabular-nums">
                      {formatCurrency(totalSpend)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Last booking</p>
                    <p className="text-xs font-medium mt-0.5">
                      {history && history.length > 0
                        ? formatRelativeDate(
                            history.sort(
                              (a, b) =>
                                new Date(b.scheduledDate).getTime() -
                                new Date(a.scheduledDate).getTime()
                            )[0]!.scheduledDate
                          )
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="bookings">
                  <TabsList className="w-full">
                    <TabsTrigger value="bookings" className="flex-1">
                      Bookings
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="flex-1">
                      Notes
                    </TabsTrigger>
                    <TabsTrigger value="forms" className="flex-1">
                      Forms
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="bookings" className="mt-3">
                    <BookingsTab customerId={customer.id} />
                  </TabsContent>

                  <TabsContent value="notes" className="mt-3">
                    <NotesTab customerId={customer.id} />
                  </TabsContent>

                  <TabsContent value="forms" className="mt-3">
                    <FormsTab customerId={customer.id} />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        {customer && (
          <div className="px-6 py-4 border-t border-border flex items-center gap-2 flex-wrap shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit?.(customer.id)}
              className="gap-1.5"
            >
              <Edit className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                if (!customer) return
                const exportData = {
                  customer: {
                    id: customer.id,
                    name: customer.name,
                    email: customer.email ?? null,
                    phone: customer.phone ?? null,
                    dateOfBirth: customer.dateOfBirth ?? null,
                    gender: customer.gender ?? null,
                    address: customer.address ?? null,
                    tags: customer.tags ?? [],
                    notes: customer.notes ?? null,
                    referralSource: customer.referralSource ?? null,
                    isActive: customer.isActive,
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt,
                  },
                  bookingHistory: (history ?? []).map((b) => ({
                    id: b.id,
                    scheduledDate: b.scheduledDate,
                    status: b.status,
                    totalAmount: b.totalAmount ?? null,
                  })),
                  exportedAt: new Date().toISOString(),
                }
                const blob = new Blob(
                  [JSON.stringify(exportData, null, 2)],
                  { type: "application/json" }
                )
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `customer-${customer.id}-export.json`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                toast.success("Customer data exported successfully")
              }}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export Data
            </Button>

            <div className="ml-auto">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Request Deletion
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Anonymise customer data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently anonymise all personally identifiable information
                      for{" "}
                      <span className="font-medium text-foreground">{customer.name}</span>.
                      This action cannot be undone and is required for GDPR right-to-erasure
                      requests.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => anonymiseMutation.mutate({ id: customer.id })}
                    >
                      Anonymise Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {anonymiseMutation.isPending && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 animate-spin" aria-hidden="true" />
                Anonymising...
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
