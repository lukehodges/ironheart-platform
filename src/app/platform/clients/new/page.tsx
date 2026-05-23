"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"

// ── Constants ──────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Manufacturing",
  "Professional Services",
  "Tech / Software",
  "Retail / Ecommerce",
  "Hospitality",
  "Construction",
  "Healthcare",
  "Other",
] as const

const SOURCES = ["Referral", "Outreach", "Inbound", "Network", "Other"] as const

const ENGAGEMENT_TYPES = ["PROJECT", "RETAINER", "HYBRID"] as const

const COMMON_PAIN_POINTS = [
  "Manual processes",
  "Poor visibility",
  "Scaling bottlenecks",
  "Staff inefficiency",
  "Cash flow",
  "Customer retention",
  "Communication gaps",
  "Tech debt",
]

// ── Section header ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  )
}

// ── Field wrapper ──────────────────────────────────────────────────────────

function Field({
  htmlFor,
  label,
  required,
  children,
}: {
  /** Associates the label with the matching input via id/htmlFor. */
  htmlFor?: string
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function NewClientPage() {
  const router = useRouter()

  // Company
  const [companyName, setCompanyName] = useState("")

  // Primary contact
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  // Classification
  const [industry, setIndustry] = useState<string>("")
  const [source, setSource] = useState<string>("")

  // Engagement
  const [engagementType, setEngagementType] = useState<string>("")
  const [engagementTitle, setEngagementTitle] = useState("")

  // Qualification
  const [teamSizeRaw, setTeamSizeRaw] = useState("")
  const [revenue, setRevenue] = useState("")
  const [painPoints, setPainPoints] = useState<string[]>([])
  const [painPointInput, setPainPointInput] = useState("")
  const [decisionMaker, setDecisionMaker] = useState(false)

  // Form error
  const [formError, setFormError] = useState<string | null>(null)

  const createMutation = api.consulting.createClientEngagement.useMutation({
    onSuccess: (data) => {
      toast.success("Client engagement created")
      router.push(`/platform/clients/${data.id}`)
    },
    onError: (err) => {
      setFormError(err.message ?? "Something went wrong. Please try again.")
    },
  })

  // Pain points helpers
  function addPainPoint(value: string) {
    const trimmed = value.trim()
    if (trimmed && !painPoints.includes(trimmed)) {
      setPainPoints((prev) => [...prev, trimmed])
    }
  }

  function removePainPoint(tag: string) {
    setPainPoints((prev) => prev.filter((p) => p !== tag))
  }

  function handlePainPointKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addPainPoint(painPointInput)
      setPainPointInput("")
    }
  }

  // Submit
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const teamSize = parseInt(teamSizeRaw, 10)

    if (!companyName.trim()) { setFormError("Company name is required."); return }
    if (!contactName.trim()) { setFormError("Contact name is required."); return }
    if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      setFormError("A valid email address is required."); return
    }
    if (!industry) { setFormError("Industry is required."); return }
    if (!source) { setFormError("Source is required."); return }
    if (!engagementType) { setFormError("Engagement type is required."); return }
    if (!engagementTitle.trim()) { setFormError("Engagement title is required."); return }
    if (isNaN(teamSize) || teamSize < 1) { setFormError("Team size must be a positive number."); return }
    if (painPoints.length === 0) { setFormError("At least one pain point is required."); return }

    createMutation.mutate({
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim() || undefined,
      industry: industry as (typeof INDUSTRIES)[number],
      source: source as (typeof SOURCES)[number],
      engagementType: engagementType as (typeof ENGAGEMENT_TYPES)[number],
      engagementTitle: engagementTitle.trim(),
      teamSize,
      revenue: revenue.trim() || undefined,
      painPoints,
      decisionMaker,
    })
  }

  return (
    <div className="p-8 max-w-4xl space-y-2">
      <h1 className="text-2xl font-serif font-semibold">New Client</h1>
      <p className="text-sm text-muted-foreground pb-4">
        Create a new engagement at discovery stage.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Company */}
        <Card className="p-5 space-y-4">
          <SectionLabel>Company</SectionLabel>
          <div className="grid grid-cols-2 gap-4">
            <Field htmlFor="companyName" label="Company name" required>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Manufacturing Ltd"
                className="mt-1"
              />
            </Field>
            <Field htmlFor="industry" label="Industry" required>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger id="industry" className="mt-1">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Card>

        {/* Primary contact */}
        <Card className="p-5 space-y-4">
          <SectionLabel>Primary Contact</SectionLabel>
          <div className="grid grid-cols-2 gap-4">
            <Field htmlFor="contactName" label="Full name" required>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jane Smith"
                className="mt-1"
              />
            </Field>
            <Field htmlFor="contactEmail" label="Email address" required>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="jane@acme.com"
                className="mt-1"
              />
            </Field>
            <Field htmlFor="contactPhone" label="Phone">
              <Input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+44 7700 000000"
                className="mt-1"
              />
            </Field>
            <Field htmlFor="source" label="Source" required>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="source" className="mt-1">
                  <SelectValue placeholder="How did they find us?" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Card>

        {/* Engagement */}
        <Card className="p-5 space-y-4">
          <SectionLabel>Engagement</SectionLabel>
          <div className="grid grid-cols-2 gap-4">
            <Field htmlFor="engagementTitle" label="Engagement title" required>
              <Input
                id="engagementTitle"
                value={engagementTitle}
                onChange={(e) => setEngagementTitle(e.target.value)}
                placeholder="Q2 Operations Audit"
                className="mt-1"
              />
            </Field>
            <Field htmlFor="engagementType" label="Engagement type" required>
              <Select value={engagementType} onValueChange={setEngagementType}>
                <SelectTrigger id="engagementType" className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Card>

        {/* Qualification */}
        <Card className="p-5 space-y-4">
          <SectionLabel>Qualification</SectionLabel>
          <div className="grid grid-cols-2 gap-4">
            <Field htmlFor="teamSize" label="Team size" required>
              <Input
                id="teamSize"
                type="number"
                min={1}
                value={teamSizeRaw}
                onChange={(e) => setTeamSizeRaw(e.target.value)}
                placeholder="12"
                className="mt-1"
              />
            </Field>
            <Field htmlFor="revenue" label="Revenue (approximate)">
              <Input
                id="revenue"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="£500k–1m"
                className="mt-1"
              />
            </Field>
          </div>

          {/* Pain points */}
          <Field label="Pain points" required>
            <div className="mt-1 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PAIN_POINTS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      painPoints.includes(tag) ? removePainPoint(tag) : addPainPoint(tag)
                    }
                    className={[
                      "px-2 py-0.5 rounded-full text-xs border transition-colors",
                      painPoints.includes(tag)
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-muted-foreground border-border hover:border-foreground",
                    ].join(" ")}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {painPoints.filter((p) => !COMMON_PAIN_POINTS.includes(p as (typeof COMMON_PAIN_POINTS)[number])).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {painPoints
                    .filter((p) => !COMMON_PAIN_POINTS.includes(p as (typeof COMMON_PAIN_POINTS)[number]))
                    .map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-foreground text-background"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removePainPoint(tag)}
                          className="hover:opacity-70"
                          aria-label={`Remove ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                </div>
              )}

              <Input
                value={painPointInput}
                onChange={(e) => setPainPointInput(e.target.value)}
                onKeyDown={handlePainPointKeyDown}
                onBlur={() => {
                  if (painPointInput.trim()) {
                    addPainPoint(painPointInput)
                    setPainPointInput("")
                  }
                }}
                placeholder="Type a custom pain point and press Enter…"
                className="text-sm"
              />
            </div>
          </Field>

          {/* Decision maker */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="decision-maker"
              checked={decisionMaker}
              onCheckedChange={(v) => setDecisionMaker(Boolean(v))}
            />
            <Label htmlFor="decision-maker" className="text-sm cursor-pointer">
              Primary contact is the decision-maker
            </Label>
          </div>
        </Card>

        {/* Form-level error */}
        {formError && (
          <p
            role="alert"
            className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded-md px-4 py-2"
          >
            {formError}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/platform/clients"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Creating…
              </>
            ) : (
              "Create client"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
