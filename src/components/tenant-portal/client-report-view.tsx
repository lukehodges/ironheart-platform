"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { Download, Calendar, ArrowRight, FileText, AlertCircle } from "lucide-react"
import type { ReportLensSection } from "@/modules/report-generator/report-generator.types"

interface Props {
  engagementId: string
  engagementTitle: string
  companyLabel: string
}

export function ClientReportView({ engagementId, engagementTitle, companyLabel }: Props) {
  const reportQuery = api.reportGenerator.clientGetPublishedReport.useQuery({ engagementId })

  if (reportQuery.isLoading) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Loading report…</p>
      </div>
    )
  }

  // Not published yet (null return) or error
  if (!reportQuery.data) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="rounded-md border border-dashed border-border p-12 text-center">
          <AlertCircle size={32} className="mx-auto text-muted-foreground/50 mb-3" />
          <h1 className="font-serif text-2xl mb-2">Report not yet available</h1>
          <p className="text-sm text-muted-foreground">
            Your audit report will appear here once your consultant publishes it. You&apos;ll get
            an email notification too.
          </p>
        </div>
      </div>
    )
  }

  const report = reportQuery.data
  const lenses: ReportLensSection[] = Array.isArray(report.contentJson?.lenses)
    ? (report.contentJson.lenses as ReportLensSection[])
    : []
  const totalWaste = report.totalEstimatedWaste ?? 0
  const publishedDate = report.publishedAt
    ? new Date(report.publishedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <div className="p-8 max-w-4xl space-y-10">
      <ReportHeader
        title={engagementTitle}
        companyLabel={companyLabel}
        publishedDate={publishedDate}
        reportId={report.id}
      />

      <ExecutiveSummary summary={report.executiveSummary} totalWaste={totalWaste} />

      <LensSummaryStrip lenses={lenses} />

      <ReportContent contentHtml={report.contentHtml ?? ""} />

      <CtaSection engagementId={engagementId} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ReportHeader({
  title,
  companyLabel,
  publishedDate,
  reportId,
}: {
  title: string
  companyLabel: string
  publishedDate: string | null
  reportId: string
}) {
  return (
    <header className="border-b border-border pb-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Audit report</p>
      <h1 className="font-serif text-4xl mt-2">{title}</h1>
      <p className="text-sm text-muted-foreground mt-2">
        {companyLabel}
        {publishedDate ? ` · Published ${publishedDate}` : ""}
      </p>
      <div className="mt-4">
        <a
          href={`/api/reports/${reportId}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background text-sm hover:bg-muted transition-colors"
        >
          <Download size={14} /> Download PDF
        </a>
      </div>
    </header>
  )
}

function ExecutiveSummary({
  summary,
  totalWaste,
}: {
  summary: string
  totalWaste: number
}) {
  if (!summary && !totalWaste) return null
  return (
    <section className="rounded-md border border-border bg-muted/30 p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
        Executive summary
      </p>
      {totalWaste > 0 && (
        <p className="font-serif text-4xl mb-4">
          £{(totalWaste / 100).toLocaleString("en-GB")}
          <span className="text-sm text-muted-foreground ml-2">
            estimated annual waste identified
          </span>
        </p>
      )}
      {summary && (
        <p className="text-base leading-relaxed whitespace-pre-line">{summary}</p>
      )}
    </section>
  )
}

function LensSummaryStrip({ lenses }: { lenses: ReportLensSection[] }) {
  if (lenses.length === 0) return null
  return (
    <section>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
        Lens summary
      </p>
      <div className="grid grid-cols-5 gap-3">
        {lenses.map((l, i) => (
          <LensCard key={i} lens={l} />
        ))}
      </div>
    </section>
  )
}

function LensCard({ lens }: { lens: ReportLensSection }) {
  const rag = (lens.ragScore ?? "").toUpperCase()
  const ragColor =
    rag === "RED"
      ? "bg-red-100 text-red-800 border-red-300"
      : rag === "AMBER"
        ? "bg-amber-100 text-amber-800 border-amber-300"
        : rag === "GREEN"
          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
          : "bg-zinc-100 text-zinc-700 border-zinc-300"
  const findingCount = Array.isArray(lens.findings) ? lens.findings.length : 0

  return (
    <div className={`rounded-md border p-3 ${ragColor}`}>
      <p className="text-[10px] font-mono uppercase tracking-wide">{lens.lens}</p>
      <p className="font-serif text-2xl mt-1">{rag || "—"}</p>
      <p className="text-[10px] mt-1">
        {findingCount} finding{findingCount === 1 ? "" : "s"}
      </p>
    </div>
  )
}

function ReportContent({ contentHtml }: { contentHtml: string }) {
  if (!contentHtml) return null
  return (
    <section>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Full report</p>
      <div
        className="prose prose-sm max-w-none border border-border rounded-md p-6 bg-background"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(contentHtml) }}
      />
    </section>
  )
}

// Minimal markdown renderer — matches pattern from src/components/report/markdown-editor.tsx
function renderMarkdown(md: string): string {
  if (!md) return "<p class='text-muted-foreground italic'>No content.</p>"

  let html = md
    // escape HTML first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // headings
    .replace(/^### (.*$)/gm, "<h3 class='font-serif text-lg mt-4 mb-2'>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2 class='font-serif text-xl mt-6 mb-3'>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1 class='font-serif text-2xl mt-6 mb-3'>$1</h1>")
    // bold / italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
    // list items
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]+?<\/li>)/g, "<ul class='ml-4 mt-2 list-disc'>$1</ul>")
    // paragraph breaks
    .replace(/\n\n/g, "</p><p class='mt-3'>")

  return `<p>${html}</p>`
}

function CtaSection({ engagementId }: { engagementId: string }) {
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)

  const proposalMutation = api.reportGenerator.clientRequestProposal.useMutation({
    onSuccess: () => {
      setRequesting(false)
      setRequested(true)
    },
    onError: (err) => {
      setRequesting(false)
      alert(`Failed to request proposal: ${err.message}`)
    },
  })

  const handleRequest = () => {
    if (!confirm("Notify your consultant you'd like an implementation proposal?")) return
    setRequesting(true)
    proposalMutation.mutate({ engagementId })
  }

  const walkthroughUrl =
    process.env.NEXT_PUBLIC_WALKTHROUGH_BOOKING_URL ??
    "https://cal.com/lukehodges/audit-walkthrough"

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
      {/* Walkthrough booking */}
      <a
        href={walkthroughUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md border border-border p-6 hover:border-foreground transition-colors block group"
      >
        <Calendar size={20} className="text-muted-foreground mb-3 group-hover:text-foreground transition-colors" />
        <p className="font-serif text-lg mb-1">Book a walkthrough call</p>
        <p className="text-sm text-muted-foreground mb-3">
          30 minutes with your consultant to walk through the findings and answer questions.
        </p>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          Book a time <ArrowRight size={14} />
        </span>
      </a>

      {/* Implementation proposal request */}
      {requested ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-6">
          <FileText size={20} className="text-emerald-700 mb-3" />
          <p className="font-serif text-lg mb-1 text-emerald-900">Proposal requested</p>
          <p className="text-sm text-emerald-800">
            Your consultant has been notified. They&apos;ll send a tailored implementation
            proposal within 2 business days.
          </p>
        </div>
      ) : (
        <button
          onClick={handleRequest}
          disabled={requesting}
          className="rounded-md border border-border p-6 hover:border-foreground transition-colors text-left disabled:opacity-50 w-full"
        >
          <FileText size={20} className="text-muted-foreground mb-3" />
          <p className="font-serif text-lg mb-1">Ready to fix what we found?</p>
          <p className="text-sm text-muted-foreground mb-3">
            Get an implementation proposal tailored to your audit. We&apos;ll prioritise the top
            opportunities.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            {requesting ? "Requesting…" : "Request proposal"} <ArrowRight size={14} />
          </span>
        </button>
      )}
    </section>
  )
}
