"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import {
  FileText,
  Download,
  Send,
  Clock,
  Plus,
  Trash2,
  ArrowLeft,
  Receipt,
  Printer,
} from "lucide-react"
import { toast } from "sonner"
import { deals, contacts } from "../../_mock-data"
import type { Deal, Contact } from "../../_mock-data"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GBP = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

const GBP_INT = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

const formatDateLong = (iso: string) => {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const formatDateISO = (d: Date) => d.toISOString().split("T")[0]

const addDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + days)
  return formatDateISO(d)
}

const PAYMENT_TERMS: { label: string; days: number }[] = [
  { label: "On Receipt", days: 0 },
  { label: "Net 14", days: 14 },
  { label: "Net 30", days: 30 },
  { label: "Net 60", days: 60 },
]

const VAT_RATES = [
  { label: "20%", value: 0.2 },
  { label: "5%", value: 0.05 },
  { label: "0%", value: 0 },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  amount: number
}

interface InvoiceFormState {
  dealId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  paymentTerms: string
  billToName: string
  billToCompany: string
  billToAddress: string
  billToEmail: string
  lineItems: LineItem[]
  notes: string
  reference: string
}

// ---------------------------------------------------------------------------
// Build contact lookup
// ---------------------------------------------------------------------------

const contactById: Record<string, Contact> = Object.fromEntries(
  contacts.map((c) => [c.id, c]),
)

// Only show deals that are not "Completed" stage
const activeDeals = deals.filter((d) => d.stage !== "Completed")

// Mock addresses for contacts (keyed by contact id)
const MOCK_ADDRESSES: Record<string, string> = {
  "C-101": "Taylor Wimpey House, Fareham, PO16 7BJ",
  "C-102": "Barratt House, Southampton, SO15 1QJ",
  "C-103": "Bellway House, Fareham, PO15 5SH",
  "C-104": "Persimmon House, Winchester, SO23 8TQ",
  "C-105": "Linden House, Romsey, SO51 8GL",
  "C-106": "Miller House, Chandler's Ford, SO53 3LG",
  "C-107": "David Wilson House, Hedge End, SO30 4RT",
}

// ---------------------------------------------------------------------------
// Initial state builder
// ---------------------------------------------------------------------------

function buildStateFromDeal(deal: Deal, invoiceSeq: number): InvoiceFormState {
  const demandContact = contactById[deal.demandContact]
  const today = formatDateISO(new Date())
  const unitPrice = deal.units > 0 ? deal.value / deal.units : 0

  // Build line items — for BNG deals, use per-habitat-category breakdown
  let lineItems: LineItem[]
  if (deal.bngAllocation && deal.bngAllocation.length > 0) {
    lineItems = deal.bngAllocation.map((alloc, i) => ({
      id: `li-${i + 1}`,
      description: `${alloc.categoryLabel} (${alloc.habitatType}) - ${deal.siteName}`,
      quantity: alloc.units,
      unitPrice: alloc.pricePerUnit,
      vatRate: 0.2,
      amount: alloc.value,
    }))
  } else {
    lineItems = [
      {
        id: "li-1",
        description: `${deal.unitType} Credits - ${deal.siteName}`,
        quantity: deal.units,
        unitPrice,
        vatRate: 0.2,
        amount: deal.value,
      },
    ]
  }

  return {
    dealId: deal.id,
    invoiceNumber: `INV-2026-${String(invoiceSeq).padStart(3, "0")}`,
    invoiceDate: today,
    dueDate: addDays(today, 30),
    paymentTerms: "Net 30",
    billToName: demandContact?.name ?? deal.demandContactName ?? "",
    billToCompany: demandContact?.company ?? "",
    billToAddress: MOCK_ADDRESSES[deal.demandContact] ?? "Hampshire, UK",
    billToEmail: demandContact?.email ?? "",
    lineItems,
    notes:
      "Credits are subject to Natural England registration confirmation. Payment terms as per the credit purchase agreement.",
    reference: deal.id,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InvoiceGeneratorPage() {
  // Default to D-0038
  const defaultDeal = deals.find((d) => d.id === "D-0038")!
  const [isQuoteMode, setIsQuoteMode] = useState(false)
  const [form, setForm] = useState<InvoiceFormState>(() =>
    buildStateFromDeal(defaultDeal, 8),
  )

  // Invoice sequence counter (mock)
  const [invoiceSeq, setInvoiceSeq] = useState(8)

  // Computed values
  const subtotal = useMemo(
    () => form.lineItems.reduce((sum, li) => sum + li.amount, 0),
    [form.lineItems],
  )
  const vatTotal = useMemo(
    () =>
      form.lineItems.reduce((sum, li) => sum + li.amount * li.vatRate, 0),
    [form.lineItems],
  )
  const total = subtotal + vatTotal

  const selectedDeal = deals.find((d) => d.id === form.dealId)
  const commissionAmount = selectedDeal
    ? subtotal * selectedDeal.commissionRate
    : 0
  const commissionRate = selectedDeal
    ? (selectedDeal.commissionRate * 100).toFixed(0)
    : "20"

  // Handlers
  const handleDealChange = useCallback(
    (dealId: string) => {
      const deal = deals.find((d) => d.id === dealId)
      if (!deal) return
      const seq = invoiceSeq + 1
      setInvoiceSeq(seq)
      setForm(buildStateFromDeal(deal, seq))
    },
    [invoiceSeq],
  )

  const handlePaymentTermsChange = useCallback(
    (label: string) => {
      const term = PAYMENT_TERMS.find((t) => t.label === label)
      if (!term) return
      setForm((prev) => ({
        ...prev,
        paymentTerms: label,
        dueDate: addDays(prev.invoiceDate, term.days),
      }))
    },
    [],
  )

  const updateLineItem = useCallback(
    (id: string, field: keyof LineItem, value: string | number) => {
      setForm((prev) => ({
        ...prev,
        lineItems: prev.lineItems.map((li) => {
          if (li.id !== id) return li
          const updated = { ...li, [field]: value }
          // Recalculate amount when qty or unitPrice changes
          if (field === "quantity" || field === "unitPrice") {
            updated.amount = updated.quantity * updated.unitPrice
          }
          return updated
        }),
      }))
    },
    [],
  )

  const addLineItem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          id: `li-${Date.now()}`,
          description: "",
          quantity: 1,
          unitPrice: 0,
          vatRate: 0.2,
          amount: 0,
        },
      ],
    }))
  }, [])

  const removeLineItem = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((li) => li.id !== id),
    }))
  }, [])

  const documentTitle = isQuoteMode ? "QUOTATION" : "INVOICE"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/brokerage-mockups/financials"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Financials
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Label
            htmlFor="quote-mode"
            className="text-sm text-muted-foreground"
          >
            Invoice
          </Label>
          <Switch
            id="quote-mode"
            checked={isQuoteMode}
            onCheckedChange={setIsQuoteMode}
          />
          <Label
            htmlFor="quote-mode"
            className="text-sm text-muted-foreground"
          >
            Quote
          </Label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isQuoteMode ? (
          <Receipt className="h-7 w-7 text-primary" />
        ) : (
          <FileText className="h-7 w-7 text-primary" />
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isQuoteMode ? "Quote Generator" : "Invoice Generator"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isQuoteMode
              ? "Generate professional quotations from deal data"
              : "Generate professional invoices from deal data"}
          </p>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[45fr_55fr] gap-6">
        {/* ──────────── LEFT PANEL: Form ──────────── */}
        <div className="space-y-5">
          {/* Deal Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Deal</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={form.dealId} onValueChange={handleDealChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a deal..." />
                </SelectTrigger>
                <SelectContent>
                  {activeDeals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="font-medium">{d.id}</span>
                      <span className="ml-2 text-muted-foreground">
                        {d.title}
                      </span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {d.stage}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDeal && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{selectedDeal.unitType}</Badge>
                  <Badge variant="secondary">{selectedDeal.catchment}</Badge>
                  <Badge variant="secondary">{selectedDeal.stage}</Badge>
                  <span className="ml-auto font-medium text-foreground">
                    {selectedDeal.displayValue}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {isQuoteMode ? "Quote Details" : "Invoice Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inv-number">
                    {isQuoteMode ? "Quote Number" : "Invoice Number"}
                  </Label>
                  <Input
                    id="inv-number"
                    value={
                      isQuoteMode
                        ? form.invoiceNumber.replace("INV", "QUO")
                        : form.invoiceNumber
                    }
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        invoiceNumber: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inv-date">
                    {isQuoteMode ? "Quote Date" : "Invoice Date"}
                  </Label>
                  <Input
                    id="inv-date"
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) => {
                      const newDate = e.target.value
                      const term = PAYMENT_TERMS.find(
                        (t) => t.label === form.paymentTerms,
                      )
                      setForm((prev) => ({
                        ...prev,
                        invoiceDate: newDate,
                        dueDate: addDays(newDate, term?.days ?? 30),
                      }))
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="terms">Payment Terms</Label>
                  <Select
                    value={form.paymentTerms}
                    onValueChange={handlePaymentTermsChange}
                  >
                    <SelectTrigger id="terms">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((t) => (
                        <SelectItem key={t.label} value={t.label}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due-date">
                    {isQuoteMode ? "Valid Until" : "Due Date"}
                  </Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bill To */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bill To</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bill-name">Contact Name</Label>
                  <Input
                    id="bill-name"
                    value={form.billToName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        billToName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-company">Company</Label>
                  <Input
                    id="bill-company"
                    value={form.billToCompany}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        billToCompany: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-address">Address</Label>
                <Input
                  id="bill-address"
                  value={form.billToAddress}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      billToAddress: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-email">Email</Label>
                <Input
                  id="bill-email"
                  type="email"
                  value={form.billToEmail}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      billToEmail: e.target.value,
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Line Items</CardTitle>
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Line Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">
                        Description
                      </TableHead>
                      <TableHead className="w-[80px] text-right">Qty</TableHead>
                      <TableHead className="w-[110px] text-right">
                        Unit Price
                      </TableHead>
                      <TableHead className="w-[80px] text-right">VAT</TableHead>
                      <TableHead className="w-[110px] text-right">
                        Amount
                      </TableHead>
                      <TableHead className="w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.lineItems.map((li) => (
                      <TableRow key={li.id}>
                        <TableCell>
                          <Input
                            className="text-sm"
                            value={li.description}
                            onChange={(e) =>
                              updateLineItem(
                                li.id,
                                "description",
                                e.target.value,
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="text-right text-sm"
                            type="number"
                            min={0}
                            value={li.quantity}
                            onChange={(e) =>
                              updateLineItem(
                                li.id,
                                "quantity",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="text-right text-sm"
                            type="number"
                            min={0}
                            value={li.unitPrice}
                            onChange={(e) =>
                              updateLineItem(
                                li.id,
                                "unitPrice",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={String(li.vatRate)}
                            onValueChange={(v) =>
                              updateLineItem(li.id, "vatRate", parseFloat(v))
                            }
                          >
                            <SelectTrigger className="text-sm h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VAT_RATES.map((r) => (
                                <SelectItem
                                  key={r.value}
                                  value={String(r.value)}
                                >
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {GBP(li.amount)}
                        </TableCell>
                        <TableCell>
                          {form.lineItems.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLineItem(li.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator className="my-4" />

              {/* Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{GBP(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT</span>
                  <span className="font-medium">{GBP(vatTotal)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>Total (GBP)</span>
                  <span>{GBP(total)}</span>
                </div>
                {selectedDeal && (
                  <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    <Receipt className="h-3.5 w-3.5" />
                    Broker commission: {commissionRate}% ={" "}
                    {GBP(commissionAmount)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </CardContent>
          </Card>

          {/* Action Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    const num = isQuoteMode
                      ? form.invoiceNumber.replace("INV", "QUO")
                      : form.invoiceNumber
                    toast.success(
                      `${isQuoteMode ? "Quote" : "Invoice"} saved as draft`,
                      {
                        description: num,
                      },
                    )
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const num = isQuoteMode
                      ? form.invoiceNumber.replace("INV", "QUO")
                      : form.invoiceNumber
                    toast.success(`PDF downloaded: ${num}.pdf`, {
                      description: `Total: ${GBP(total)}`,
                    })
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button
                  onClick={() => {
                    const num = isQuoteMode
                      ? form.invoiceNumber.replace("INV", "QUO")
                      : form.invoiceNumber
                    toast.success(
                      `${isQuoteMode ? "Quote" : "Invoice"} sent to ${form.billToEmail}`,
                      {
                        description: `${num} - ${GBP(total)}`,
                      },
                    )
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send {isQuoteMode ? "Quote" : "Invoice"}
                </Button>
                {!isQuoteMode && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const reminderDate = addDays(form.dueDate, -7)
                      toast.success(
                        `Payment reminder scheduled for ${formatDateLong(reminderDate)}`,
                        {
                          description: `For ${form.billToName} at ${form.billToEmail}`,
                        },
                      )
                    }}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Schedule Reminder
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => window.print()}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ──────────── RIGHT PANEL: PDF Preview ──────────── */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            Live Preview
            <Badge variant="outline" className="ml-auto text-xs">
              {isQuoteMode ? "Quote" : "Invoice"} Preview
            </Badge>
          </div>

          {/* The "PDF" */}
          <div className="rounded-lg border shadow-lg overflow-hidden">
            <div className="bg-white text-gray-900 p-8 sm:p-10 min-h-[800px] text-[13px] leading-relaxed">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 rounded bg-emerald-700 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">IE</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900 tracking-tight">
                      Ironheart Environmental
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs mt-2 space-y-0.5">
                    <p>Unit 4, The Enterprise Centre</p>
                    <p>Bath, BA1 1XX</p>
                    <p>info@ironheart.co.uk</p>
                    <p>VAT Reg: GB 123 456 789</p>
                  </div>
                </div>
                <div className="text-right">
                  <h2
                    className={`text-2xl font-bold tracking-wider ${
                      isQuoteMode ? "text-blue-700" : "text-emerald-700"
                    }`}
                  >
                    {documentTitle}
                  </h2>
                </div>
              </div>

              {/* Invoice meta + Bill To */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {isQuoteMode ? "Quote To" : "Bill To"}
                  </h3>
                  <p className="font-semibold text-gray-900">
                    {form.billToName}
                  </p>
                  <p className="text-gray-600">{form.billToCompany}</p>
                  <p className="text-gray-600">{form.billToAddress}</p>
                  <p className="text-gray-600">{form.billToEmail}</p>
                </div>
                <div className="text-right">
                  <div className="inline-block text-left">
                    <table className="text-xs">
                      <tbody>
                        <tr>
                          <td className="pr-4 py-0.5 text-gray-400 font-medium">
                            {isQuoteMode ? "Quote No." : "Invoice No."}
                          </td>
                          <td className="py-0.5 font-semibold text-gray-900">
                            {isQuoteMode
                              ? form.invoiceNumber.replace("INV", "QUO")
                              : form.invoiceNumber}
                          </td>
                        </tr>
                        <tr>
                          <td className="pr-4 py-0.5 text-gray-400 font-medium">
                            Date
                          </td>
                          <td className="py-0.5 text-gray-700">
                            {formatDateLong(form.invoiceDate)}
                          </td>
                        </tr>
                        <tr>
                          <td className="pr-4 py-0.5 text-gray-400 font-medium">
                            {isQuoteMode ? "Valid Until" : "Due Date"}
                          </td>
                          <td className="py-0.5 text-gray-700">
                            {formatDateLong(form.dueDate)}
                          </td>
                        </tr>
                        <tr>
                          <td className="pr-4 py-0.5 text-gray-400 font-medium">
                            Reference
                          </td>
                          <td className="py-0.5 text-gray-700">
                            {form.reference}
                          </td>
                        </tr>
                        <tr>
                          <td className="pr-4 py-0.5 text-gray-400 font-medium">
                            Terms
                          </td>
                          <td className="py-0.5 text-gray-700">
                            {form.paymentTerms}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="mb-6">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-gray-900">
                      <th className="text-left py-2 font-semibold text-gray-900">
                        Description
                      </th>
                      <th className="text-right py-2 font-semibold text-gray-900 w-[60px]">
                        Qty
                      </th>
                      <th className="text-right py-2 font-semibold text-gray-900 w-[90px]">
                        Unit Price
                      </th>
                      <th className="text-right py-2 font-semibold text-gray-900 w-[50px]">
                        VAT
                      </th>
                      <th className="text-right py-2 font-semibold text-gray-900 w-[90px]">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lineItems.map((li, idx) => (
                      <tr
                        key={li.id}
                        className={`border-b border-gray-200 ${
                          idx % 2 === 0 ? "bg-gray-50/50" : ""
                        }`}
                      >
                        <td className="py-2.5 pr-4 text-gray-800">
                          {li.description || (
                            <span className="italic text-gray-400">
                              No description
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right text-gray-700">
                          {li.quantity % 1 === 0
                            ? li.quantity.toLocaleString()
                            : li.quantity.toFixed(1)}
                        </td>
                        <td className="py-2.5 text-right text-gray-700">
                          {GBP(li.unitPrice)}
                        </td>
                        <td className="py-2.5 text-right text-gray-700">
                          {(li.vatRate * 100).toFixed(0)}%
                        </td>
                        <td className="py-2.5 text-right font-medium text-gray-900">
                          {GBP(li.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-[260px]">
                  <div className="flex justify-between py-1.5 text-xs">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-900 font-medium">
                      {GBP(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 text-xs">
                    <span className="text-gray-500">VAT (20%)</span>
                    <span className="text-gray-900 font-medium">
                      {GBP(vatTotal)}
                    </span>
                  </div>
                  <div className="border-t-2 border-gray-900 mt-1 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-gray-900">
                        TOTAL (GBP)
                      </span>
                      <span className="font-bold text-gray-900 text-base">
                        {GBP(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                {isQuoteMode ? (
                  /* Quote acceptance section */
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Acceptance
                      </h3>
                      <p className="text-gray-600 text-xs mb-6">
                        To accept this quotation, please sign and return to
                        Ironheart Environmental. This quote is valid until{" "}
                        <span className="font-semibold text-gray-900">
                          {formatDateLong(form.dueDate)}
                        </span>
                        .
                      </p>
                      <div className="grid grid-cols-2 gap-8 mt-4">
                        <div>
                          <div className="border-b border-gray-400 pb-1 mb-1 h-10" />
                          <p className="text-[10px] text-gray-400">
                            Signature
                          </p>
                        </div>
                        <div>
                          <div className="border-b border-gray-400 pb-1 mb-1 h-10" />
                          <p className="text-[10px] text-gray-400">Date</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="border-b border-gray-400 pb-1 mb-1 h-10 w-1/2" />
                        <p className="text-[10px] text-gray-400">
                          Print Name
                        </p>
                      </div>
                    </div>
                    {form.notes && (
                      <div>
                        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Notes
                        </h3>
                        <p className="text-gray-500 text-xs whitespace-pre-wrap">
                          {form.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Invoice payment section */
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Payment Details
                      </h3>
                      <table className="text-xs">
                        <tbody>
                          <tr>
                            <td className="pr-4 py-0.5 text-gray-400">Bank</td>
                            <td className="py-0.5 text-gray-700">
                              Ironheart Environmental Ltd
                            </td>
                          </tr>
                          <tr>
                            <td className="pr-4 py-0.5 text-gray-400">
                              Sort Code
                            </td>
                            <td className="py-0.5 text-gray-700">12-34-56</td>
                          </tr>
                          <tr>
                            <td className="pr-4 py-0.5 text-gray-400">
                              Account
                            </td>
                            <td className="py-0.5 text-gray-700">12345678</td>
                          </tr>
                          <tr>
                            <td className="pr-4 py-0.5 text-gray-400">
                              Reference
                            </td>
                            <td className="py-0.5 font-medium text-gray-900">
                              {form.invoiceNumber}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {form.notes && (
                      <div>
                        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Notes
                        </h3>
                        <p className="text-gray-500 text-xs whitespace-pre-wrap">
                          {form.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-10 pt-4 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400">
                  Thank you for your business.
                </p>
                <p className="text-[10px] text-gray-300 mt-1">
                  Ironheart Environmental Ltd &middot; Registered in England
                  &amp; Wales &middot; Company No. 12345678
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
