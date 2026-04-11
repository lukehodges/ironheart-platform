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
import {
  ProposalSectionsBuilder,
  type LocalSection,
} from "@/components/clients/proposal-sections-builder"
import {
  ProposalPaymentRulesBuilder,
  type LocalPaymentRule,
} from "@/components/clients/proposal-payment-rules-builder"

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
  const [sections, setSections] = useState<LocalSection[]>([])
  const [priceInput, setPriceInput] = useState("")
  const [paymentRules, setPaymentRules] = useState<LocalPaymentRule[]>([])
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
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createMutation = api.clientPortal.admin.createProposal.useMutation()
  const sendMutation = api.clientPortal.admin.sendProposal.useMutation()
  const createSectionMutation = api.clientPortal.admin.createProposalSection.useMutation()
  const createItemMutation = api.clientPortal.admin.createProposalItem.useMutation()
  const createRuleMutation = api.clientPortal.admin.createPaymentRule.useMutation()

  const validate = (): boolean => {
    if (!scope.trim()) { toast.error("Scope is required"); return false }
    if (parseCurrencyInput(priceInput) <= 0) { toast.error("Price must be greater than 0"); return false }
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

  const handleSubmit = async (send: boolean) => {
    if (!validate()) return
    setIsSubmitting(true)

    try {
      // 1. Create the proposal shell
      const proposal = await createMutation.mutateAsync({
        engagementId: params.engagementId,
        scope: scope.trim(),
        deliverables: [],
        price: totalPrice,
        paymentSchedule: [],
        terms: terms.trim() || undefined,
        problemStatement: problemStatement.trim() || undefined,
        exclusions: exclusions.filter((e) => e.trim()).map((e) => e.trim()),
        requirements: requirements.filter((r) => r.trim()).map((r) => r.trim()),
        roiData:
          roiData.hoursPerWeek && roiData.hourlyRate && parseFloat(roiData.automationPct) > 0
            ? {
                hoursPerWeek: parseFloat(roiData.hoursPerWeek),
                automationPct: parseFloat(roiData.automationPct),
                hourlyRate: parseCurrencyInput(roiData.hourlyRate),
                additionalValueLabel: roiData.additionalValueLabel.trim() || null,
                additionalValue: roiAdditional || null,
              }
            : undefined,
      })

      // 2. Create sections and items — track local _id → created DB id
      const sectionIdMap = new Map<string, string>()

      for (let si = 0; si < sections.length; si++) {
        const section = sections[si]!
        const created = await createSectionMutation.mutateAsync({
          proposalId: proposal.id,
          title: section.title || `Section ${si + 1}`,
          type: section.type,
          estimatedDuration: section.estimatedDuration.trim() || null,
          sortOrder: si,
        })
        sectionIdMap.set(section._id, created.id)

        for (let ii = 0; ii < section.items.length; ii++) {
          const item = section.items[ii]!
          if (!item.title.trim()) continue
          await createItemMutation.mutateAsync({
            sectionId: created.id,
            proposalId: proposal.id,
            title: item.title.trim(),
            description: item.description.trim() || null,
            acceptanceCriteria: item.acceptanceCriteria.trim() || null,
            sortOrder: ii,
          })
        }
      }

      // 3. Create payment rules
      for (let ri = 0; ri < paymentRules.length; ri++) {
        const rule = paymentRules[ri]!
        if (!rule.label.trim() || !rule.amount.trim()) continue

        const amount = parseCurrencyInput(rule.amount)
        if (amount <= 0) continue

        const resolvedSectionId =
          rule.trigger === "MILESTONE_COMPLETE" && rule.sectionId
            ? (sectionIdMap.get(rule.sectionId) ?? null)
            : null

        await createRuleMutation.mutateAsync({
          proposalId: proposal.id,
          sectionId: resolvedSectionId,
          label: rule.label.trim(),
          amount,
          trigger: rule.trigger,
          relativeDays:
            rule.trigger === "RELATIVE_DATE" || rule.trigger === "ON_APPROVAL"
              ? parseInt(rule.relativeDays) || 14
              : null,
          fixedDate:
            rule.trigger === "FIXED_DATE" && rule.fixedDate ? new Date(rule.fixedDate) : null,
          recurringInterval:
            rule.trigger === "RECURRING" && rule.recurringInterval
              ? (rule.recurringInterval as "MONTHLY" | "QUARTERLY")
              : null,
          autoSend: rule.autoSend,
          sortOrder: ri,
        })
      }

      // 4. Optionally send
      if (send) {
        await sendMutation.mutateAsync({ proposalId: proposal.id })
        toast.success("Proposal sent to client")
      } else {
        toast.success("Proposal saved as draft")
      }

      router.push(`/admin/clients/${params.engagementId}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
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
      <Link
        href={`/admin/clients/${params.engagementId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to {engagement?.title ?? "Engagement"}
      </Link>

      <div className="flex items-center justify-between mt-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Proposal</h1>
          {engagement && (
            <p className="text-sm text-muted-foreground mt-0.5">{engagement.title}</p>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Problem Statement */}
      <div>
        <Label className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" /> Problem Statement
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
          The client&apos;s problem in their own words — appears as a pull quote at the top of the
          proposal
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
        <Textarea
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="mt-1.5 min-h-[140px]"
          placeholder="Describe the scope of work..."
        />
      </div>

      <Separator className="my-6" />

      {/* Phases & Deliverables */}
      <ProposalSectionsBuilder sections={sections} onChange={setSections} />

      <Separator className="my-6" />

      {/* Price */}
      <div>
        <Label>Total Price</Label>
        <div className="relative mt-1.5 w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
            &pound;
          </span>
          <Input
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            className="pl-7 tabular-nums font-medium"
            placeholder="0"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Excluding VAT</p>
      </div>

      <Separator className="my-6" />

      {/* Payment Rules */}
      <ProposalPaymentRulesBuilder
        rules={paymentRules}
        sections={sections}
        totalPrice={totalPrice}
        onChange={setPaymentRules}
      />

      <Separator className="my-6" />

      {/* Exclusions */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" /> What&apos;s Not Included
            </p>
            <p className="text-xs text-muted-foreground">
              Explicit exclusions — protects against scope creep
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExclusions([...exclusions, ""])}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {exclusions.map((ex, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-muted-foreground text-sm shrink-0">—</span>
              <Input
                value={ex}
                onChange={(e) =>
                  setExclusions(exclusions.map((v, j) => (j === i ? e.target.value : v)))
                }
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
            <p className="text-xs text-muted-foreground">
              Client responsibilities — access, data, response times
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRequirements([...requirements, ""])}
          >
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
                onChange={(e) =>
                  setRequirements(requirements.map((v, j) => (j === i ? e.target.value : v)))
                }
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                &pound;
              </span>
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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              &pound;
            </span>
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
              <span>
                {totalPrice > 0 ? `${Math.round((totalPrice / roiTotal) * 100)}%` : "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      <Separator className="my-6" />

      {/* Terms */}
      <div>
        <Label>Terms &amp; Conditions</Label>
        <Textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          className="mt-1.5 min-h-[120px]"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => void handleSubmit(false)}
            disabled={isSubmitting}
          >
            Save Draft
          </Button>
          <Button onClick={() => void handleSubmit(true)} disabled={isSubmitting}>
            <Send className="h-4 w-4 mr-1.5" /> Send to Client
          </Button>
        </div>
      </div>
    </div>
  )
}
