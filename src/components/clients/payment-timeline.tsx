"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Check, Clock } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"
import type { PortalInvoiceRecord, PaymentScheduleItem } from "@/modules/client-portal/client-portal.types"

function formatDate(date: Date | null): string {
  if (!date) return ""
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

interface PaymentTimelineProps {
  schedule: PaymentScheduleItem[]
  invoices: PortalInvoiceRecord[]
}

export function PaymentTimeline({ schedule, invoices }: PaymentTimelineProps) {
  if (schedule.length === 0) return null

  const paidCount = invoices.filter((i) => i.status === "PAID").length
  const progressPercent = schedule.length > 0 ? Math.round((paidCount / schedule.length) * 100) : 0

  return (
    <Card className="mt-6">
      <CardContent className="pt-5">
        <p className="text-sm font-semibold mb-4">Payment Timeline</p>
        <div className="relative flex">
          {/* Track */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
          <div className="absolute top-4 left-4 h-0.5 bg-green-500" style={{ width: `${progressPercent}%` }} />

          {schedule.map((item, i) => {
            const matchedInvoice = invoices.find((inv) => inv.proposalPaymentIndex === i)
            const isPaid = matchedInvoice?.status === "PAID"

            return (
              <div key={i} className="flex-1 flex flex-col items-center relative z-10">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    isPaid
                      ? "bg-green-500 text-white"
                      : "bg-background border-2 border-border text-muted-foreground"
                  }`}
                >
                  {isPaid ? <Check className="h-4 w-4" /> : <Clock className="h-3.5 w-3.5" />}
                </div>
                <div className="text-center mt-2">
                  <p className="text-xs font-semibold">{formatCurrency(item.amount)}</p>
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  {isPaid && matchedInvoice?.paidAt && (
                    <p className="text-[10px] text-green-500 mt-0.5">Paid {formatDate(matchedInvoice.paidAt)}</p>
                  )}
                  {!isPaid && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.dueType === "ON_COMPLETION" ? "On completion" : item.dueType === "ON_APPROVAL" ? "On approval" : "Pending"}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
