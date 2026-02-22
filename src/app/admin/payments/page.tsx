"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Send,
  CreditCard,
  Ban,
  Eye,
} from "lucide-react"
import { api } from "@/lib/trpc/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "PAID"
  | "VOID"
  | "REFUNDED"

type PaymentMethod = "CARD" | "BANK_TRANSFER" | "DIRECT_DEBIT" | "CASH"

type StatusFilter = "ALL" | InvoiceStatus

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

function formatCurrency(amountInPence: number | string): string {
  const numeric =
    typeof amountInPence === "string"
      ? parseFloat(amountInPence)
      : amountInPence
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(numeric / 100)
}

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
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

const STATUS_BADGE_VARIANT: Record<
  InvoiceStatus,
  "default" | "secondary" | "success" | "destructive" | "outline" | "warning"
> = {
  DRAFT: "secondary",
  SENT: "default",
  VIEWED: "default",
  PARTIALLY_PAID: "warning",
  OVERDUE: "destructive",
  PAID: "success",
  VOID: "secondary",
  REFUNDED: "outline",
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PARTIALLY_PAID: "Partial",
  OVERDUE: "Overdue",
  PAID: "Paid",
  VOID: "Void",
  REFUNDED: "Refunded",
}

const FILTER_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Paid", value: "PAID" },
  { label: "Void", value: "VOID" },
]

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  DIRECT_DEBIT: "Direct Debit",
  CASH: "Cash",
}

// ---------------------------------------------------------------------------
// Table skeleton
// ---------------------------------------------------------------------------

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-7 w-7 rounded-md" /></TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Invoice row
// ---------------------------------------------------------------------------

interface InvoiceRowProps {
  invoice: Record<string, any>
  onView: (id: string) => void
  onSend: (invoice: Record<string, any>) => void
  onRecordPayment: (invoice: Record<string, any>) => void
  onVoid: (invoice: Record<string, any>) => void
}

function InvoiceRow({
  invoice,
  onView,
  onSend,
  onRecordPayment,
  onVoid,
}: InvoiceRowProps) {
  const status = invoice.status as InvoiceStatus
  const canSend = status === "DRAFT"
  const canVoid = status !== "VOID" && status !== "PAID" && status !== "REFUNDED"
  const canRecordPayment =
    status !== "VOID" && status !== "PAID" && status !== "REFUNDED"

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onView(invoice.id)}
      aria-label={`View invoice ${invoice.invoiceNumber ?? invoice.id.slice(0, 8)}`}
    >
      {/* Invoice # */}
      <TableCell>
        <span className="font-medium text-sm text-foreground font-mono">
          {invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
        </span>
      </TableCell>

      {/* Customer */}
      <TableCell>
        <span className="text-sm text-muted-foreground truncate max-w-[160px] block">
          {invoice.customerId?.slice(0, 8) ?? "\u2014"}
        </span>
      </TableCell>

      {/* Amount */}
      <TableCell>
        <span className="text-sm tabular-nums font-medium">
          {formatCurrency(invoice.totalAmount)}
        </span>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge variant={STATUS_BADGE_VARIANT[status]} className="text-[10px]">
          {STATUS_LABELS[status] ?? status}
        </Badge>
      </TableCell>

      {/* Due Date */}
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {formatDate(invoice.dueDate)}
        </span>
      </TableCell>

      {/* Created */}
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {formatRelativeDate(invoice.createdAt)}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for invoice ${invoice.invoiceNumber ?? invoice.id.slice(0, 8)}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(invoice.id)}>
              <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
              View Details
            </DropdownMenuItem>
            {canSend && (
              <DropdownMenuItem onClick={() => onSend(invoice)}>
                <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                Send Invoice
              </DropdownMenuItem>
            )}
            {canRecordPayment && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onRecordPayment(invoice)}>
                  <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />
                  Record Payment
                </DropdownMenuItem>
              </>
            )}
            {canVoid && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onVoid(invoice)}
                  className="text-destructive focus:text-destructive"
                >
                  <Ban className="h-4 w-4 mr-2" aria-hidden="true" />
                  Void Invoice
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PaymentsPage() {
  const utils = api.useUtils()

  // Filter + pagination state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [cursorStack, setCursorStack] = useState<string[]>([])

  // Detail sheet state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  // Create invoice dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    customerId: "",
    subtotal: "",
    taxAmount: "",
    totalAmount: "",
    currency: "GBP",
    dueDate: "",
    notes: "",
  })

  // Record payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentInvoice, setPaymentInvoice] = useState<Record<string, any> | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CARD" as PaymentMethod,
    notes: "",
  })

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  const { data, isLoading, isError, refetch } = api.payment.listInvoices.useQuery({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    limit: PAGE_SIZE,
    cursor,
  })

  const rows = data?.rows ?? []
  const hasMore = data?.hasMore ?? false

  // Detail query (only when sheet is open)
  const { data: invoiceDetail, isLoading: isDetailLoading } =
    api.payment.getInvoice.useQuery(
      { invoiceId: selectedInvoiceId! },
      { enabled: !!selectedInvoiceId }
    )

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const createInvoiceMutation = api.payment.createInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice created")
      setCreateDialogOpen(false)
      setCreateForm({
        customerId: "",
        subtotal: "",
        taxAmount: "",
        totalAmount: "",
        currency: "GBP",
        dueDate: "",
        notes: "",
      })
      void utils.payment.listInvoices.invalidate()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to create invoice")
    },
  })

  const sendInvoiceMutation = api.payment.sendInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice sent")
      void utils.payment.listInvoices.invalidate()
      void utils.payment.getInvoice.invalidate()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to send invoice")
    },
  })

  const voidInvoiceMutation = api.payment.voidInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice voided")
      void utils.payment.listInvoices.invalidate()
      void utils.payment.getInvoice.invalidate()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to void invoice")
    },
  })

  const recordPaymentMutation = api.payment.recordPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded")
      setPaymentDialogOpen(false)
      setPaymentInvoice(null)
      setPaymentForm({ amount: "", method: "CARD", notes: "" })
      void utils.payment.listInvoices.invalidate()
      void utils.payment.getInvoice.invalidate()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to record payment")
    },
  })

  // -------------------------------------------------------------------------
  // Pagination helpers
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleStatusFilter(status: StatusFilter) {
    setStatusFilter(status)
    setCursor(undefined)
    setCursorStack([])
  }

  const handleView = useCallback((invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
  }, [])

  const handleSheetClose = useCallback(() => {
    setSelectedInvoiceId(null)
  }, [])

  const handleSend = useCallback((invoice: Record<string, any>) => {
    sendInvoiceMutation.mutate({
      invoiceId: invoice.id,
      version: invoice.version,
    })
  }, [sendInvoiceMutation])

  const handleVoid = useCallback((invoice: Record<string, any>) => {
    voidInvoiceMutation.mutate({
      invoiceId: invoice.id,
      version: invoice.version,
    })
  }, [voidInvoiceMutation])

  const handleRecordPaymentOpen = useCallback((invoice: Record<string, any>) => {
    setPaymentInvoice(invoice)
    setPaymentForm({ amount: "", method: "CARD", notes: "" })
    setPaymentDialogOpen(true)
  }, [])

  const handleCreateSubmit = useCallback(() => {
    const subtotal = Math.round(parseFloat(createForm.subtotal) * 100)
    const taxAmount = Math.round(parseFloat(createForm.taxAmount || "0") * 100)
    const totalAmount = Math.round(parseFloat(createForm.totalAmount) * 100)

    if (!createForm.customerId || isNaN(subtotal) || isNaN(totalAmount)) {
      toast.error("Please fill in all required fields")
      return
    }

    createInvoiceMutation.mutate({
      customerId: createForm.customerId,
      subtotal,
      taxAmount,
      totalAmount,
      currency: createForm.currency,
      dueDate: createForm.dueDate || undefined,
      notes: createForm.notes || undefined,
    })
  }, [createForm, createInvoiceMutation])

  const handleRecordPaymentSubmit = useCallback(() => {
    if (!paymentInvoice) return

    const amount = Math.round(parseFloat(paymentForm.amount) * 100)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount")
      return
    }

    recordPaymentMutation.mutate({
      invoiceId: paymentInvoice.id,
      amount,
      method: paymentForm.method,
      notes: paymentForm.notes || undefined,
    })
  }, [paymentInvoice, paymentForm, recordPaymentMutation])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <PageHeader
        title="Payments"
        description="Manage invoices and track payments."
      >
        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          aria-label="Create a new invoice"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Invoice
        </Button>
      </PageHeader>

      {/* Status filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleStatusFilter(opt.value)}
            className={[
              "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground border-transparent shadow"
                : "border-input bg-background text-foreground hover:bg-accent",
            ].join(" ")}
            aria-pressed={statusFilter === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border overflow-hidden">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-destructive font-medium">
              Failed to load invoices
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
                <TableHead className="w-[160px]">Invoice #</TableHead>
                <TableHead className="w-[140px]">Customer</TableHead>
                <TableHead className="w-[120px]">Amount</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[120px]">Due Date</TableHead>
                <TableHead className="w-[100px]">Created</TableHead>
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
                      variant="documents"
                      title="No invoices yet"
                      description="Create your first invoice to start tracking payments."
                      action={{
                        label: "New Invoice",
                        onClick: () => setCreateDialogOpen(true),
                      }}
                    />
                  </td>
                </TableRow>
              ) : (
                rows.map((invoice) => (
                  <InvoiceRow
                    key={invoice.id}
                    invoice={invoice}
                    onView={handleView}
                    onSend={handleSend}
                    onRecordPayment={handleRecordPaymentOpen}
                    onVoid={handleVoid}
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
            Showing {rows.length} invoice{rows.length !== 1 ? "s" : ""}
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

      {/* ----------------------------------------------------------------- */}
      {/* Detail sheet                                                       */}
      {/* ----------------------------------------------------------------- */}
      <Sheet
        open={!!selectedInvoiceId}
        onOpenChange={(open) => {
          if (!open) handleSheetClose()
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {invoiceDetail?.invoiceNumber ??
                selectedInvoiceId?.slice(0, 8) ??
                "Invoice"}
            </SheetTitle>
            <SheetDescription>Invoice details and payment history</SheetDescription>
          </SheetHeader>

          {isDetailLoading ? (
            <div className="mt-6 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : invoiceDetail ? (
            <div className="mt-6 space-y-6">
              {/* Status + amounts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      STATUS_BADGE_VARIANT[
                        invoiceDetail.status as InvoiceStatus
                      ]
                    }
                    className="text-[10px]"
                  >
                    {STATUS_LABELS[invoiceDetail.status as InvoiceStatus] ??
                      invoiceDetail.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Subtotal
                  </span>
                  <span className="text-sm tabular-nums font-medium">
                    {formatCurrency(invoiceDetail.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tax</span>
                  <span className="text-sm tabular-nums">
                    {formatCurrency(invoiceDetail.taxAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Discount
                  </span>
                  <span className="text-sm tabular-nums">
                    {formatCurrency(invoiceDetail.discountAmount ?? 0)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-sm tabular-nums font-semibold">
                    {formatCurrency(invoiceDetail.totalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Amount Paid
                  </span>
                  <span className="text-sm tabular-nums text-success">
                    {formatCurrency(invoiceDetail.amountPaid)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Amount Due
                  </span>
                  <span className="text-sm tabular-nums font-medium">
                    {formatCurrency(invoiceDetail.amountDue)}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Dates */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Issue Date
                  </span>
                  <span className="text-sm">
                    {formatDate(invoiceDetail.issueDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Due Date
                  </span>
                  <span className="text-sm">
                    {formatDate(invoiceDetail.dueDate)}
                  </span>
                </div>
                {invoiceDetail.paidAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Paid At
                    </span>
                    <span className="text-sm">
                      {formatDate(invoiceDetail.paidAt)}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* IDs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Customer ID
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {invoiceDetail.customerId?.slice(0, 12)}...
                  </span>
                </div>
                {invoiceDetail.bookingId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Booking ID
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {invoiceDetail.bookingId.slice(0, 12)}...
                    </span>
                  </div>
                )}
              </div>

              {/* Line items */}
              {Array.isArray(invoiceDetail.lineItems) &&
                (invoiceDetail.lineItems as Array<Record<string, unknown>>).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Line Items</h4>
                      <div className="space-y-2">
                        {(
                          invoiceDetail.lineItems as Array<Record<string, any>>
                        ).map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground">
                              {item.description ?? item.name ?? `Item ${idx + 1}`}
                              {item.quantity && item.quantity > 1
                                ? ` x${item.quantity}`
                                : ""}
                            </span>
                            <span className="tabular-nums font-medium">
                              {item.amount != null
                                ? formatCurrency(item.amount)
                                : "\u2014"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              {/* Notes */}
              {invoiceDetail.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {invoiceDetail.notes}
                    </p>
                  </div>
                </>
              )}

              {/* Sheet actions */}
              <Separator />
              <div className="flex items-center gap-2">
                {invoiceDetail.status === "DRAFT" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      sendInvoiceMutation.mutate({
                        invoiceId: invoiceDetail.id,
                        version: invoiceDetail.version,
                      })
                    }
                    disabled={sendInvoiceMutation.isPending}
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Send
                  </Button>
                )}
                {invoiceDetail.status !== "VOID" &&
                  invoiceDetail.status !== "PAID" &&
                  invoiceDetail.status !== "REFUNDED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPaymentInvoice(invoiceDetail)
                        setPaymentForm({
                          amount: "",
                          method: "CARD",
                          notes: "",
                        })
                        setPaymentDialogOpen(true)
                      }}
                    >
                      <CreditCard className="h-4 w-4" aria-hidden="true" />
                      Record Payment
                    </Button>
                  )}
                {invoiceDetail.status !== "VOID" &&
                  invoiceDetail.status !== "PAID" &&
                  invoiceDetail.status !== "REFUNDED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        voidInvoiceMutation.mutate({
                          invoiceId: invoiceDetail.id,
                          version: invoiceDetail.version,
                        })
                      }
                      disabled={voidInvoiceMutation.isPending}
                    >
                      <Ban className="h-4 w-4" aria-hidden="true" />
                      Void
                    </Button>
                  )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ----------------------------------------------------------------- */}
      {/* Create invoice dialog                                              */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
            <DialogDescription>
              Create a new invoice. Amounts are entered in pounds (GBP).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Customer ID */}
            <div className="space-y-2">
              <Label htmlFor="create-customer-id">Customer ID</Label>
              <Input
                id="create-customer-id"
                placeholder="Customer UUID"
                value={createForm.customerId}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    customerId: e.target.value,
                  }))
                }
              />
            </div>

            {/* Amounts row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="create-subtotal">Subtotal</Label>
                <Input
                  id="create-subtotal"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={createForm.subtotal}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      subtotal: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-tax">Tax</Label>
                <Input
                  id="create-tax"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={createForm.taxAmount}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      taxAmount: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-total">Total</Label>
                <Input
                  id="create-total"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={createForm.totalAmount}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      totalAmount: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="create-currency">Currency</Label>
              <Select
                value={createForm.currency}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, currency: value }))
                }
              >
                <SelectTrigger id="create-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due date */}
            <div className="space-y-2">
              <Label htmlFor="create-due-date">Due Date</Label>
              <Input
                id="create-due-date"
                type="date"
                value={createForm.dueDate}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    dueDate: e.target.value,
                  }))
                }
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="create-notes">Notes</Label>
              <Textarea
                id="create-notes"
                placeholder="Optional notes..."
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={createInvoiceMutation.isPending}
            >
              {createInvoiceMutation.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Record payment dialog                                              */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open)
          if (!open) setPaymentInvoice(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {paymentInvoice
                ? `Record a payment for invoice ${paymentInvoice.invoiceNumber ?? paymentInvoice.id?.slice(0, 8)}. Outstanding: ${formatCurrency(paymentInvoice.amountDue ?? paymentInvoice.totalAmount)}.`
                : "Record a payment against this invoice."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount (GBP)</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
              />
            </div>

            {/* Method */}
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select
                value={paymentForm.method}
                onValueChange={(value) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    method: value as PaymentMethod,
                  }))
                }
              >
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(PAYMENT_METHOD_LABELS) as [
                      PaymentMethod,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes</Label>
              <Textarea
                id="payment-notes"
                placeholder="Optional notes..."
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentDialogOpen(false)
                setPaymentInvoice(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPaymentSubmit}
              disabled={recordPaymentMutation.isPending}
            >
              {recordPaymentMutation.isPending
                ? "Recording..."
                : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
