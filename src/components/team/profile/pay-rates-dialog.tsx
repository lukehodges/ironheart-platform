"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { PayRateType } from "@/modules/team/team.types"

const RATE_TYPES: { value: PayRateType; label: string }[] = [
  { value: "HOURLY", label: "Hourly" },
  { value: "DAILY", label: "Daily" },
  { value: "SALARY", label: "Salary" },
  { value: "COMMISSION", label: "Commission" },
  { value: "PIECE_RATE", label: "Piece Rate" },
]

export function PayRatesDialog({
  memberId,
  open,
  onOpenChange,
}: {
  memberId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [rateType, setRateType] = useState<PayRateType>("HOURLY")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("GBP")
  const [effectiveFrom, setEffectiveFrom] = useState("")
  const [reason, setReason] = useState("")

  const utils = api.useUtils()

  const { data: rates, isLoading } = api.team.payRates.list.useQuery(
    { userId: memberId },
    { enabled: open },
  )

  const createMutation = api.team.payRates.create.useMutation({
    onSuccess: () => {
      toast.success("Pay rate added")
      resetForm()
      setShowForm(false)
      void utils.team.payRates.list.invalidate({ userId: memberId })
      void utils.team.getById.invalidate()
    },
    onError: (err) => toast.error(err.message ?? "Failed to add pay rate"),
  })

  function resetForm() {
    setRateType("HOURLY")
    setAmount("")
    setCurrency("GBP")
    setEffectiveFrom("")
    setReason("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Amount must be a positive number")
      return
    }
    if (!effectiveFrom) {
      toast.error("Effective from date is required")
      return
    }
    createMutation.mutate({
      userId: memberId,
      rateType,
      amount: parsedAmount,
      currency: currency.trim() || "GBP",
      effectiveFrom,
      reason: reason.trim() || undefined,
    })
  }

  const rateList = rates ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) {
          resetForm()
          setShowForm(false)
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pay Rate History</DialogTitle>
          <DialogDescription>
            View and manage pay rates for this staff member.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : rateList.length === 0 && !showForm ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No pay rates recorded yet.
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {rateList.map((rate, index) => {
              const isCurrent = !rate.effectiveUntil && index === 0
              return (
                <div
                  key={rate.id}
                  className="rounded-lg border border-border px-4 py-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: rate.currency,
                        }).format(rate.amount)}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {rate.rateType}
                      </Badge>
                      {isCurrent && (
                        <Badge variant="success" className="text-[10px]">
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(rate.effectiveFrom), "d MMM yyyy")}
                    {" \u2192 "}
                    {rate.effectiveUntil
                      ? format(new Date(rate.effectiveUntil), "d MMM yyyy")
                      : "Present"}
                  </p>
                  {rate.reason && (
                    <p className="text-[11px] text-muted-foreground italic">
                      {rate.reason}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <Separator />

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Rate Type</Label>
              <Select
                value={rateType}
                onValueChange={(v) => setRateType(v as PayRateType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-currency">Currency</Label>
              <Input
                id="pay-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="GBP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-effective-from">Effective From</Label>
              <Input
                id="pay-effective-from"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-reason">Reason (optional)</Label>
              <Input
                id="pay-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Annual review"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm()
                  setShowForm(false)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Save Rate
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add new rate
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
