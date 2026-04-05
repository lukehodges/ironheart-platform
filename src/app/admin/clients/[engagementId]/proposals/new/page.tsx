"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { parseCurrencyInput } from "@/lib/format-currency"
import { DeliverableListBuilder } from "@/components/clients/deliverable-list-builder"
import { PaymentScheduleBuilder } from "@/components/clients/payment-schedule-builder"

const DEFAULT_TERMS = `1. This proposal is valid for 30 days from the date of issue.
2. Payment terms are as outlined in the payment schedule above.
3. Late payments will incur interest at 4% above the Bank of England base rate.
4. Either party may terminate with 14 days written notice. Work completed to date will be invoiced.
5. All intellectual property created during this engagement transfers to the client upon final payment.
6. Luke Hodges trading as Ironheart Consulting. Company registration pending.`

export default function NewProposalPage() {
  const params = useParams<{ engagementId: string }>()
  const router = useRouter()

  const { data: engagement, isLoading } = api.clientPortal.admin.getEngagement.useQuery({
    id: params.engagementId,
  })

  const [scope, setScope] = useState("")
  const [deliverables, setDeliverables] = useState([{ title: "", description: "" }])
  const [priceInput, setPriceInput] = useState("")
  const [schedule, setSchedule] = useState([{ label: "", amount: "", dueType: "ON_APPROVAL" }])
  const [terms, setTerms] = useState(DEFAULT_TERMS)

  const createMutation = api.clientPortal.admin.createProposal.useMutation({
    onError: (err) => toast.error(err.message),
  })

  const sendMutation = api.clientPortal.admin.sendProposal.useMutation({
    onError: (err) => toast.error(err.message),
  })

  const validate = (): boolean => {
    if (!scope.trim()) { toast.error("Scope is required"); return false }
    if (!deliverables.some((d) => d.title.trim())) { toast.error("At least one deliverable with a title is required"); return false }
    if (parseCurrencyInput(priceInput) <= 0) { toast.error("Price must be greater than 0"); return false }
    for (const item of schedule) {
      if (!item.label.trim() || !item.amount.trim()) {
        toast.error("Each payment schedule item needs a description and amount")
        return false
      }
    }
    return true
  }

  const buildInput = () => ({
    engagementId: params.engagementId,
    scope: scope.trim(),
    deliverables: deliverables.filter((d) => d.title.trim()).map((d) => ({
      title: d.title.trim(),
      description: d.description.trim(),
    })),
    price: parseCurrencyInput(priceInput),
    paymentSchedule: schedule.filter((s) => s.label.trim()).map((s) => ({
      label: s.label.trim(),
      amount: parseCurrencyInput(s.amount),
      dueType: s.dueType as "ON_APPROVAL" | "ON_DATE" | "ON_MILESTONE" | "ON_COMPLETION",
    })),
    terms: terms.trim() || undefined,
  })

  const handleSaveDraft = () => {
    if (!validate()) return
    createMutation.mutate(buildInput(), {
      onSuccess: () => {
        toast.success("Proposal saved as draft")
        router.push(`/admin/clients/${params.engagementId}`)
      },
    })
  }

  const handleSend = () => {
    if (!validate()) return
    createMutation.mutate(buildInput(), {
      onSuccess: (proposal) => {
        sendMutation.mutate({ proposalId: proposal.id }, {
          onSuccess: () => {
            toast.success("Proposal sent to client")
            router.push(`/admin/clients/${params.engagementId}`)
          },
        })
      },
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-[800px] mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-[800px] mx-auto animate-fade-in">
      <Link href={`/admin/clients/${params.engagementId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to {engagement?.title ?? "Engagement"}
      </Link>

      <div className="flex items-center justify-between mt-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Proposal</h1>
          {engagement && <p className="text-sm text-muted-foreground mt-0.5">{engagement.title}</p>}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Scope */}
      <div>
        <Label>Scope of Work</Label>
        <Textarea value={scope} onChange={(e) => setScope(e.target.value)} className="mt-1.5 min-h-[140px]" placeholder="Describe the scope of work..." />
      </div>

      <Separator className="my-6" />

      {/* Deliverables */}
      <DeliverableListBuilder items={deliverables} onChange={setDeliverables} />

      <Separator className="my-6" />

      {/* Price */}
      <div>
        <Label>Total Price</Label>
        <div className="relative mt-1.5 w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">&pound;</span>
          <Input value={priceInput} onChange={(e) => setPriceInput(e.target.value)} className="pl-7 tabular-nums font-medium" placeholder="0" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Excluding VAT</p>
      </div>

      <Separator className="my-6" />

      {/* Payment Schedule */}
      <PaymentScheduleBuilder items={schedule} onChange={setSchedule} />

      <Separator className="my-6" />

      {/* Terms */}
      <div>
        <Label>Terms & Conditions</Label>
        <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} className="mt-1.5 min-h-[120px]" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => router.back()}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={createMutation.isPending || sendMutation.isPending}>
            Save Draft
          </Button>
          <Button onClick={handleSend} disabled={createMutation.isPending || sendMutation.isPending}>
            <Send className="h-4 w-4 mr-1.5" /> Send to Client
          </Button>
        </div>
      </div>
    </div>
  )
}
