"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Check,
  Loader2,
  Building2,
  Briefcase,
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { api } from "@/lib/trpc/react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { StageBadge, TypeBadge } from "@/components/consulting/stage-badge"

// ── Stage transition rules ─────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  DISCOVERY: ["PROPOSAL", "CLOSED_LOST"],
  PROPOSAL: ["CONTRACTED", "CLOSED_LOST"],
  CONTRACTED: ["ONBOARDING", "CLOSED_LOST"],
  ONBOARDING: ["AUDITING", "CLOSED_LOST"],
  AUDITING: ["REPORTING", "CLOSED_LOST"],
  REPORTING: ["IMPLEMENTING", "CLOSED_WON", "CLOSED_LOST"],
  IMPLEMENTING: ["RETAINER", "CLOSED_WON", "CLOSED_LOST"],
  RETAINER: ["CLOSED_WON", "CLOSED_LOST"],
}

const STAGE_BUTTON_STYLES: Record<string, string> = {
  PROPOSAL: "bg-[var(--ih-warn)] hover:bg-[#9A7209] text-white",
  CONTRACTED: "bg-[var(--ih-ok)] hover:bg-[#245A4A] text-white",
  ONBOARDING: "bg-[var(--ih-ok)] hover:bg-[#245A4A] text-white",
  AUDITING: "bg-[var(--ih-ok)] hover:bg-[#245A4A] text-white",
  REPORTING: "bg-[var(--ih-ok)] hover:bg-[#245A4A] text-white",
  IMPLEMENTING: "bg-[var(--ih-ok)] hover:bg-[#245A4A] text-white",
  RETAINER: "bg-[var(--ih-ink)] hover:bg-[#1c1f24] text-white",
  CLOSED_WON: "bg-[var(--ih-ok)] hover:bg-[#245A4A] text-white",
  CLOSED_LOST: "bg-[var(--ih-ink-30)] hover:bg-[var(--ih-ink-40)] text-white",
}

const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  PROPOSAL: "Proposal",
  CONTRACTED: "Contracted",
  ONBOARDING: "Onboarding",
  AUDITING: "Auditing",
  REPORTING: "Reporting",
  IMPLEMENTING: "Implementing",
  RETAINER: "Retainer",
  CLOSED_WON: "Close Won",
  CLOSED_LOST: "Close Lost",
}

const REVENUE_OPTIONS = [
  "Under 250k",
  "250k - 500k",
  "500k - 1M",
  "1M - 5M",
  "5M - 10M",
  "10M+",
]

function formatDate(d: Date | string | null): string {
  if (!d) return "--"
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

// ── Main component ──────────────────────────────────────────────────

export default function EngagementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const engagementId = params.id as string

  // Fetch engagement detail
  const detail = api.clientPortal.admin.getEngagement.useQuery(
    { id: engagementId },
    { enabled: !!engagementId }
  )

  // Integration status
  const integrations = api.consulting.integrationStatus.useQuery(
    { engagementId },
    { enabled: !!engagementId }
  )

  const utils = api.useUtils()

  // Stage transition
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null)
  const [closedReason, setClosedReason] = useState("")

  const transitionMutation = api.consulting.transitionStage.useMutation({
    onSuccess: () => {
      toast.success(`Stage updated to ${STAGE_LABELS[transitionTarget!] ?? transitionTarget}`)
      setTransitionTarget(null)
      setClosedReason("")
      utils.clientPortal.admin.getEngagement.invalidate({ id: engagementId })
      utils.consulting.list.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  // Audit window
  const [auditStart, setAuditStart] = useState("")
  const [auditEnd, setAuditEnd] = useState("")
  const [showAuditForm, setShowAuditForm] = useState(false)

  const auditMutation = api.consulting.setAuditWindow.useMutation({
    onSuccess: () => {
      toast.success("Audit window set")
      setShowAuditForm(false)
      utils.clientPortal.admin.getEngagement.invalidate({ id: engagementId })
    },
    onError: (err) => toast.error(err.message),
  })

  // Discovery notes with auto-save
  const [notes, setNotes] = useState("")
  const [notesLoaded, setNotesLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Qualification data
  const [revenue, setRevenue] = useState("")
  const [teamSize, setTeamSize] = useState("")
  const [industry, setIndustry] = useState("")
  const [painPoints, setPainPoints] = useState("")
  const [decisionMaker, setDecisionMaker] = useState(false)

  const notesMutation = api.consulting.updateDiscoveryNotes.useMutation({
    onSuccess: () => setSaveStatus("saved"),
    onError: (err) => {
      setSaveStatus("idle")
      toast.error(err.message)
    },
  })

  // Load initial data into form
  useEffect(() => {
    if (detail.data && !notesLoaded) {
      setNotes(detail.data.discoveryNotes ?? "")
      const q = detail.data.qualificationData as {
        revenue?: string | null
        teamSize?: number | null
        industry?: string | null
        painPoints?: string[]
        decisionMaker?: boolean
      } | null
      if (q) {
        setRevenue(q.revenue ?? "")
        setTeamSize(q.teamSize != null ? String(q.teamSize) : "")
        setIndustry(q.industry ?? "")
        setPainPoints(q.painPoints?.join(", ") ?? "")
        setDecisionMaker(q.decisionMaker ?? false)
      }
      setNotesLoaded(true)
    }
  }, [detail.data, notesLoaded])

  const saveNotes = useCallback(
    (text: string) => {
      setSaveStatus("saving")
      notesMutation.mutate({
        engagementId,
        notes: text,
        qualificationData: {
          revenue: revenue || null,
          teamSize: teamSize ? parseInt(teamSize, 10) : null,
          industry: industry || null,
          painPoints: painPoints
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
          decisionMaker,
        },
      })
    },
    [engagementId, revenue, teamSize, industry, painPoints, decisionMaker, notesMutation]
  )

  function handleNotesChange(value: string) {
    setNotes(value)
    setSaveStatus("idle")
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveNotes(value), 500)
  }

  function handleQualificationSave() {
    saveNotes(notes)
  }

  const engagement = detail.data
  const currentStage = (engagement?.stage ?? "DISCOVERY") as string
  const nextStages = VALID_TRANSITIONS[currentStage] ?? []

  // ── Loading state ─────────────────────────────────────────────────

  if (detail.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--ih-bg)]">
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
          <Skeleton className="h-4 w-40 bg-[var(--ih-line)]" />
          <div className="bg-[var(--ih-surface)] border border-[var(--ih-line)] rounded-xl p-6 space-y-4">
            <Skeleton className="h-7 w-64 bg-[var(--ih-line)]" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full bg-[var(--ih-line)]" />
              <Skeleton className="h-6 w-24 rounded-full bg-[var(--ih-line)]" />
            </div>
            <Skeleton className="h-4 w-48 bg-[var(--ih-line)]" />
          </div>
          <Skeleton className="h-10 w-full bg-[var(--ih-line)]" />
          <Skeleton className="h-64 w-full bg-[var(--ih-line)] rounded-xl" />
        </div>
      </div>
    )
  }

  if (!engagement) {
    return (
      <div className="min-h-screen bg-[var(--ih-bg)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="ih-serif text-xl text-[var(--ih-ink)]">Engagement not found</h2>
          <Link
            href="/admin/engagements"
            className="text-sm text-[var(--ih-accent)] hover:underline mt-2 inline-block"
          >
            Back to engagements
          </Link>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--ih-bg)]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Back link */}
        <Link
          href="/admin/engagements"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--ih-ink-50)] hover:text-[var(--ih-ink)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Engagements
        </Link>

        {/* Header card */}
        <div className="mt-4 bg-[var(--ih-surface)] border border-[var(--ih-line)] rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="ih-serif text-2xl text-[var(--ih-ink)]">{engagement.title}</h1>
              {engagement.description && (
                <p className="text-sm text-[var(--ih-ink-50)] mt-1">{engagement.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <TypeBadge type={engagement.type} />
              <StageBadge stage={engagement.stage} />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 text-sm text-[var(--ih-ink-50)]">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Created {formatDate(engagement.createdAt)}
            </div>
            {engagement.startDate && (
              <>
                <span>·</span>
                <span>Starts {formatDate(engagement.startDate)}</span>
              </>
            )}
          </div>

          {/* Stage transition buttons */}
          {nextStages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-[var(--ih-line)]">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--ih-ink-40)] self-center mr-1">
                Advance to
              </span>
              {nextStages.map((stage) => (
                <Button
                  key={stage}
                  size="sm"
                  onClick={() => setTransitionTarget(stage)}
                  className={cn("text-xs h-8", STAGE_BUTTON_STYLES[stage])}
                >
                  {STAGE_LABELS[stage] ?? stage}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="bg-[var(--ih-surface-2)] border border-[var(--ih-line)]">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[var(--ih-surface)]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="discovery" className="data-[state=active]:bg-[var(--ih-surface)]">
              Discovery
            </TabsTrigger>
            <TabsTrigger value="integrations" className="data-[state=active]:bg-[var(--ih-surface)]">
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ──────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Qualification summary */}
            {engagement.qualificationData && (
              <div className="bg-[var(--ih-surface)] border border-[var(--ih-line)] rounded-xl p-5 shadow-sm">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ih-ink-40)] mb-3">
                  Qualification Summary
                </h3>
                <QualificationSummary data={engagement.qualificationData as QualData} />
              </div>
            )}

            {/* Audit window */}
            <div className="bg-[var(--ih-surface)] border border-[var(--ih-line)] rounded-xl p-5 shadow-sm">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ih-ink-40)] mb-3">
                Audit Window
              </h3>
              {engagement.auditWindowStart && engagement.auditWindowEnd ? (
                <div className="flex items-center gap-2 text-sm text-[var(--ih-ink)]">
                  <Calendar className="h-4 w-4 text-[var(--ih-ok)]" />
                  {formatDate(engagement.auditWindowStart)} — {formatDate(engagement.auditWindowEnd)}
                </div>
              ) : showAuditForm ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-[var(--ih-ink-50)]">Start Date</Label>
                      <Input
                        type="date"
                        value={auditStart}
                        onChange={(e) => setAuditStart(e.target.value)}
                        className="bg-[var(--ih-surface-2)] border-[var(--ih-line)] mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[var(--ih-ink-50)]">End Date</Label>
                      <Input
                        type="date"
                        value={auditEnd}
                        onChange={(e) => setAuditEnd(e.target.value)}
                        className="bg-[var(--ih-surface-2)] border-[var(--ih-line)] mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        auditMutation.mutate({ engagementId, startDate: auditStart, endDate: auditEnd })
                      }
                      disabled={!auditStart || !auditEnd || auditMutation.isPending}
                      className="bg-[var(--ih-ok)] hover:bg-[#245A4A] text-white text-xs"
                    >
                      {auditMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Check className="h-3 w-3 mr-1" />
                      )}
                      Set Window
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAuditForm(false)}
                      className="text-xs text-[var(--ih-ink-50)]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAuditForm(true)}
                  className="text-xs border-[var(--ih-line)] text-[var(--ih-ink-65)] hover:bg-[var(--ih-surface-2)]"
                >
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  Set Audit Window
                </Button>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-[var(--ih-surface)] border border-[var(--ih-line)] rounded-xl p-5 shadow-sm">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ih-ink-40)] mb-3">
                Timeline
              </h3>
              <div className="space-y-3">
                <TimelineItem label="Created" date={engagement.createdAt} />
                {engagement.startDate && <TimelineItem label="Start Date" date={engagement.startDate} />}
                {engagement.auditWindowStart && (
                  <TimelineItem label="Audit Begins" date={engagement.auditWindowStart} />
                )}
                {engagement.auditWindowEnd && (
                  <TimelineItem label="Audit Ends" date={engagement.auditWindowEnd} />
                )}
                {engagement.endDate && <TimelineItem label="End Date" date={engagement.endDate} />}
              </div>
            </div>
          </TabsContent>

          {/* ── Discovery Tab ─────────────────────────────────────────── */}
          <TabsContent value="discovery" className="mt-4 space-y-4">
            {/* Notes */}
            <div className="bg-[var(--ih-surface)] border border-[var(--ih-line)] rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ih-ink-40)]">
                  Discovery Notes
                </h3>
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase tracking-wider transition-opacity duration-300",
                    saveStatus === "saved"
                      ? "text-[var(--ih-ok)] opacity-100"
                      : saveStatus === "saving"
                      ? "text-[var(--ih-warn)] opacity-100"
                      : "opacity-0"
                  )}
                >
                  {saveStatus === "saving" ? "Saving..." : "Saved"}
                </span>
              </div>
              <Textarea
                placeholder="Capture discovery insights, pain points, context..."
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                rows={8}
                className="bg-[var(--ih-surface-2)] border-[var(--ih-line)] resize-none text-sm"
              />
            </div>

            {/* Qualification form */}
            <div className="bg-[var(--ih-surface)] border border-[var(--ih-line)] rounded-xl p-5 shadow-sm">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ih-ink-40)] mb-4">
                Qualification Data
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[var(--ih-ink-65)]">Revenue Range</Label>
                  <select
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--ih-line)] bg-[var(--ih-surface-2)] px-3 py-2 text-sm text-[var(--ih-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--ih-accent-soft)]"
                  >
                    <option value="">Select...</option>
                    {REVENUE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-[var(--ih-ink-65)]">Team Size</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 25"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="mt-1 bg-[var(--ih-surface-2)] border-[var(--ih-line)]"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[var(--ih-ink-65)]">Industry</Label>
                  <Input
                    placeholder="e.g. Professional Services"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="mt-1 bg-[var(--ih-surface-2)] border-[var(--ih-line)]"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={decisionMaker}
                      onChange={(e) => setDecisionMaker(e.target.checked)}
                      className="rounded border-[var(--ih-line-2)] text-[var(--ih-accent)] focus:ring-[var(--ih-accent-soft)]"
                    />
                    <span className="text-sm text-[var(--ih-ink-65)]">Decision maker identified</span>
                  </label>
                </div>
              </div>
              <div className="mt-4">
                <Label className="text-xs text-[var(--ih-ink-65)]">Pain Points</Label>
                <Textarea
                  placeholder="Comma or newline separated..."
                  value={painPoints}
                  onChange={(e) => setPainPoints(e.target.value)}
                  rows={3}
                  className="mt-1 bg-[var(--ih-surface-2)] border-[var(--ih-line)] resize-none text-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={handleQualificationSave}
                disabled={notesMutation.isPending}
                className="mt-4 bg-[var(--ih-accent)] hover:bg-[#B73117] text-white text-xs"
              >
                {notesMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Save Qualification Data
              </Button>
            </div>
          </TabsContent>

          {/* ── Integrations Tab ──────────────────────────────────────── */}
          <TabsContent value="integrations" className="mt-4 space-y-4">
            <IntegrationCard
              title="Plane.so"
              icon={<Briefcase className="h-5 w-5" />}
              connected={integrations.data?.plane?.connected ?? false}
              loading={integrations.isLoading}
              url={integrations.data?.plane?.projectUrl}
              label={integrations.data?.plane?.projectId ? "Project linked" : undefined}
            />
            <IntegrationCard
              title="Google Drive"
              icon={<Building2 className="h-5 w-5" />}
              connected={integrations.data?.drive?.connected ?? false}
              loading={integrations.isLoading}
              url={integrations.data?.drive?.folderUrl}
              label={integrations.data?.drive?.folderId ? "Folder linked" : undefined}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Stage transition confirmation dialog */}
      <Dialog open={!!transitionTarget} onOpenChange={(v) => { if (!v) setTransitionTarget(null) }}>
        <DialogContent className="bg-[var(--ih-surface)] border-[var(--ih-line)] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="ih-serif text-lg text-[var(--ih-ink)]">
              {transitionTarget === "CLOSED_LOST"
                ? "Close as Lost"
                : `Advance to ${STAGE_LABELS[transitionTarget ?? ""] ?? transitionTarget}`}
            </DialogTitle>
          </DialogHeader>

          {transitionTarget === "CLOSED_LOST" ? (
            <div className="space-y-3 mt-2">
              <div className="flex items-start gap-2 text-sm text-[var(--ih-ink-65)]">
                <AlertTriangle className="h-4 w-4 text-[var(--ih-warn)] shrink-0 mt-0.5" />
                This will mark the engagement as lost. Please provide a reason.
              </div>
              <Textarea
                placeholder="Why was this engagement lost?"
                value={closedReason}
                onChange={(e) => setClosedReason(e.target.value)}
                rows={3}
                className="bg-[var(--ih-surface-2)] border-[var(--ih-line)] resize-none text-sm"
              />
            </div>
          ) : (
            <p className="text-sm text-[var(--ih-ink-65)] mt-2">
              Move this engagement from{" "}
              <span className="font-medium text-[var(--ih-ink)]">{STAGE_LABELS[currentStage]}</span> to{" "}
              <span className="font-medium text-[var(--ih-ink)]">{STAGE_LABELS[transitionTarget ?? ""]}</span>?
            </p>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setTransitionTarget(null)}
              className="text-[var(--ih-ink-50)]"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                transitionMutation.mutate({
                  engagementId,
                  targetStage: transitionTarget as "DISCOVERY",
                  notes: transitionTarget === "CLOSED_LOST" ? closedReason : undefined,
                })
              }
              disabled={
                transitionMutation.isPending ||
                (transitionTarget === "CLOSED_LOST" && !closedReason.trim())
              }
              className={cn("text-sm", STAGE_BUTTON_STYLES[transitionTarget ?? ""])}
            >
              {transitionMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────

interface QualData {
  revenue?: string | null
  teamSize?: number | null
  industry?: string | null
  painPoints?: string[]
  decisionMaker?: boolean
}

function QualificationSummary({ data }: { data: QualData }) {
  const items = [
    { label: "Revenue", value: data.revenue },
    { label: "Team Size", value: data.teamSize != null ? String(data.teamSize) : null },
    { label: "Industry", value: data.industry },
    {
      label: "Decision Maker",
      value: data.decisionMaker != null ? (data.decisionMaker ? "Yes" : "No") : null,
    },
  ].filter((i) => i.value)

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label}>
          <span className="text-[11px] text-[var(--ih-ink-40)] block">{item.label}</span>
          <span className="text-sm text-[var(--ih-ink)] font-medium">{item.value}</span>
        </div>
      ))}
      {data.painPoints && data.painPoints.length > 0 && (
        <div className="col-span-2">
          <span className="text-[11px] text-[var(--ih-ink-40)] block mb-1">Pain Points</span>
          <div className="flex flex-wrap gap-1.5">
            {data.painPoints.map((p, i) => (
              <span
                key={i}
                className="text-xs bg-[var(--ih-accent-soft)] text-[var(--ih-accent)] px-2 py-0.5 rounded-full"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TimelineItem({ label, date }: { label: string; date: Date | string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-[var(--ih-line-2)] shrink-0" />
      <span className="text-xs text-[var(--ih-ink-40)] w-28">{label}</span>
      <span className="text-sm text-[var(--ih-ink)]">{formatDate(date)}</span>
    </div>
  )
}

function IntegrationCard({
  title,
  icon,
  connected,
  loading,
  url,
  label,
}: {
  title: string
  icon: React.ReactNode
  connected: boolean
  loading: boolean
  url?: string | null
  label?: string
}) {
  return (
    <div className="bg-[var(--ih-surface)] border border-[var(--ih-line)] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--ih-surface-2)] flex items-center justify-center text-[var(--ih-ink-40)]">
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-medium text-[var(--ih-ink)]">{title}</h4>
            {loading ? (
              <Skeleton className="h-3 w-20 mt-1 bg-[var(--ih-line)]" />
            ) : connected ? (
              <div className="flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3 w-3 text-[var(--ih-ok)]" />
                <span className="text-xs text-[var(--ih-ok)]">{label ?? "Connected"}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5">
                <XCircle className="h-3 w-3 text-[var(--ih-ink-30)]" />
                <span className="text-xs text-[var(--ih-ink-40)]">Not connected</span>
              </div>
            )}
          </div>
        </div>
        {connected && url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--ih-accent)] hover:underline flex items-center gap-1"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}
