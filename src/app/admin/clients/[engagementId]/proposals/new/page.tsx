"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Send, Plus, Trash2, AlertCircle, Users, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { parseCurrencyInput, formatCurrency } from "@/lib/format-currency"
import { DeliverableListBuilder } from "@/components/clients/deliverable-list-builder"
import { PaymentScheduleBuilder } from "@/components/clients/payment-schedule-builder"

const DEFAULT_TERMS = `1. This proposal is valid for 30 days from the date of issue.
2. Payment terms are as outlined in the payment schedule above.
3. Late payments will incur interest at 4% above the Bank of England base rate.
4. Either party may terminate with 14 days written notice. Work completed to date will be invoiced.
5. All intellectual property created during this engagement transfers to the client upon final payment.
6. Luke Hodges trading as Ironheart Consulting. Company registration pending.`

interface LocalRoiData {
  hoursPerWeek: string
  automationPct: string
  hourlyRate: string
  additionalValueLabel: string
  additionalValue: string
}

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
  const [problemStatement, setProblemStatement] = useState("")
  const [exclusions, setExclusions] = useState<string[]>([""])
  const [requirements, setRequirements] = useState<string[]>([""])
  const [roiData, setRoiData] = useState<LocalRoiData>({
    hoursPerWeek: "",
    automationPct: "80",
    hourlyRate: "",
    additionalValueLabel: "",
    additionalValue: "",
  })

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

  const totalPrice = parseCurrencyInput(priceInput)

  const roiAnnualValue = (() => {
    const h = parseFloat(roiData.hoursPerWeek)
    const p = parseFloat(roiData.automationPct)
    const r = parseCurrencyInput(roiData.hourlyRate)
    if (!h || !p || !r) return null
    return Math.round(h * r * 52 * (p / 100))
  })()

  const roiAdditional = parseCurrencyInput(roiData.additionalValue)
  const roiTotal = roiAnnualValue !== null ? roiAnnualValue + roiAdditional : null

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
    problemStatement: problemStatement.trim() || undefined,
    exclusions: exclusions.filter(e => e.trim()).map(e => e.trim()),
    requirements: requirements.filter(r => r.trim()).map(r => r.trim()),
    roiData: roiData.hoursPerWeek && roiData.hourlyRate && parseFloat(roiData.automationPct) > 0 ? {
      hoursPerWeek: parseFloat(roiData.hoursPerWeek),
      automationPct: parseFloat(roiData.automationPct),
      hourlyRate: parseCurrencyInput(roiData.hourlyRate),
      additionalValueLabel: roiData.additionalValueLabel.trim() || null,
      additionalValue: roiAdditional || null,
    } : undefined,
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

      {/* Problem Statement */}
      <div>
        <Label className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" /> Problem Statement
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
          The client&apos;s problem in their own words — this appears as a pull quote at the top of the proposal
        </p>
        <Textarea
          value={problemStatement}
          onChange={(e) => setProblemStatement(e.target.value)}
          className="mt-1.5 min-h-[80px]"
          placeholder='e.g. "Every time we take on a new tenant, someone here spends the best part of a morning chasing references…"'
        />
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

      {/* Exclusions */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" /> What&apos;s Not Included
            </p>
            <p className="text-xs text-muted-foreground">Explicit exclusions — protects against scope creep</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setExclusions([...exclusions, ""])}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {exclusions.map((ex, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-muted-foreground text-sm shrink-0">—</span>
              <Input
                value={ex}
                onChange={(e) => setExclusions(exclusions.map((v, j) => j === i ? e.target.value : v))}
                placeholder="e.g. Changes to existing CRM setup"
                className="text-sm flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => setExclusions(exclusions.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Requirements */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" /> What We Need From You
            </p>
            <p className="text-xs text-muted-foreground">Client responsibilities — access, data, response times</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRequirements([...requirements, ""])}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {requirements.map((req, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="h-5 w-5 rounded-full border border-border flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                {i + 1}
              </div>
              <Input
                value={req}
                onChange={(e) => setRequirements(requirements.map((v, j) => j === i ? e.target.value : v))}
                placeholder="e.g. Admin access to Airtable base within 2 business days of kickoff"
                className="text-sm flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => setRequirements(requirements.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-6" />

      {/* ROI Calculator */}
      <div>
        <p className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" /> ROI Calculator
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">
          Shown in the proposal to justify the fee. All optional.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Hours / week</Label>
            <Input
              value={roiData.hoursPerWeek}
              onChange={(e) => setRoiData({ ...roiData, hoursPerWeek: e.target.value })}
              placeholder="e.g. 8"
              className="mt-1 text-sm"
              type="number"
              min="0"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Automation %</Label>
            <Input
              value={roiData.automationPct}
              onChange={(e) => setRoiData({ ...roiData, automationPct: e.target.value })}
              placeholder="80"
              className="mt-1 text-sm"
              type="number"
              min="0"
              max="100"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Hourly rate (£)</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&pound;</span>
              <Input
                value={roiData.hourlyRate}
                onChange={(e) => setRoiData({ ...roiData, hourlyRate: e.target.value })}
                placeholder="0"
                className="text-sm pl-7"
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_140px] gap-3 mt-2">
          <Input
            value={roiData.additionalValueLabel}
            onChange={(e) => setRoiData({ ...roiData, additionalValueLabel: e.target.value })}
            placeholder="Additional value label (e.g. Error reduction savings)"
            className="text-sm"
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&pound;</span>
            <Input
              value={roiData.additionalValue}
              onChange={(e) => setRoiData({ ...roiData, additionalValue: e.target.value })}
              placeholder="0"
              className="text-sm pl-7"
            />
          </div>
        </div>
        {roiTotal !== null && (
          <div className="mt-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Time recovered annually</span>
              <span>{formatCurrency(roiAnnualValue!)}</span>
            </div>
            {roiAdditional > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{roiData.additionalValueLabel || "Additional value"}</span>
                <span>{formatCurrency(roiAdditional)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-foreground mt-1 pt-1 border-t">
              <span>Total annual value</span>
              <span>{formatCurrency(roiTotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground mt-0.5">
              <span>Fee as % of year-one value</span>
              <span>{totalPrice > 0 ? `${Math.round((totalPrice / roiTotal) * 100)}%` : "—"}</span>
            </div>
          </div>
        )}
      </div>

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
