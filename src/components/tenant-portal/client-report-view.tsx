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
      <div style={{ padding: 32, fontSize: 13, color: "var(--ih-ink-50)" }}>
        Loading report…
      </div>
    )
  }

  // Not published yet (null return) or error
  if (!reportQuery.data) {
    return (
      <div style={{ padding: 32, maxWidth: 560 }}>
        <div
          style={{
            borderRadius: 8,
            border: "1px dashed var(--ih-line)",
            background: "var(--ih-surface-2)",
            padding: 48,
            textAlign: "center",
          }}
        >
          <AlertCircle size={32} style={{ margin: "0 auto 12px", color: "var(--ih-ink-30)" }} />
          <h1 className="ih-serif" style={{ fontSize: 24, margin: "0 0 8px", color: "var(--ih-ink)" }}>
            Report not yet available
          </h1>
          <p style={{ fontSize: 13, color: "var(--ih-ink-50)", margin: 0 }}>
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
    <div style={{ padding: 32, maxWidth: 800, display: "flex", flexDirection: "column", gap: 40, background: "var(--ih-bg)" }}>
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
    <header style={{ borderBottom: "1px solid var(--ih-line)", paddingBottom: 24 }}>
      <p className="ih-eyebrow" style={{ marginBottom: 8 }}>Audit report</p>
      <h1 className="ih-serif" style={{ fontSize: 40, margin: "0 0 10px", color: "var(--ih-ink)", lineHeight: 1 }}>
        {title}
      </h1>
      <p style={{ fontSize: 13, color: "var(--ih-ink-50)", margin: "0 0 16px" }}>
        {companyLabel}
        {publishedDate ? ` · Published ${publishedDate}` : ""}
      </p>
      <a
        href={`/api/reports/${reportId}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          borderRadius: 6,
          border: "1px solid var(--ih-line)",
          background: "var(--ih-surface)",
          fontSize: 13,
          color: "var(--ih-ink)",
          textDecoration: "none",
          transition: "border-color 0.15s ease",
        }}
      >
        <Download size={14} /> Download PDF
      </a>
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
    <section
      className="ih-card"
      style={{
        padding: 24,
        borderLeft: "3px solid var(--ih-accent)",
      }}
    >
      <p className="ih-eyebrow" style={{ marginBottom: 12 }}>Executive summary</p>
      {totalWaste > 0 && (
        <p className="ih-serif" style={{ fontSize: 40, margin: "0 0 16px", color: "var(--ih-ink)", lineHeight: 1 }}>
          £{(totalWaste / 100).toLocaleString("en-GB")}
          <span style={{ fontSize: 13, color: "var(--ih-ink-50)", marginLeft: 10, fontFamily: "var(--ih-font-sans)" }}>
            estimated annual waste identified
          </span>
        </p>
      )}
      {summary && (
        <p style={{ fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-line", color: "var(--ih-ink-65)", margin: 0 }}>
          {summary}
        </p>
      )}
    </section>
  )
}

function LensSummaryStrip({ lenses }: { lenses: ReportLensSection[] }) {
  if (lenses.length === 0) return null
  return (
    <section>
      <p className="ih-eyebrow" style={{ marginBottom: 12 }}>Lens summary</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {lenses.map((l, i) => (
          <LensCard key={i} lens={l} />
        ))}
      </div>
    </section>
  )
}

function LensCard({ lens }: { lens: ReportLensSection }) {
  const rag = (lens.ragScore ?? "").toUpperCase()
  const { bg, border, color } =
    rag === "RED"
      ? { bg: "rgba(209,58,31,0.08)", border: "rgba(209,58,31,0.3)", color: "var(--ih-danger)" }
      : rag === "AMBER"
        ? { bg: "rgba(184,134,11,0.08)", border: "rgba(184,134,11,0.3)", color: "var(--ih-warn)" }
        : rag === "GREEN"
          ? { bg: "rgba(47,111,92,0.08)", border: "rgba(47,111,92,0.3)", color: "var(--ih-ok)" }
          : { bg: "var(--ih-surface-2)", border: "var(--ih-line)", color: "var(--ih-ink-50)" }
  const findingCount = Array.isArray(lens.findings) ? lens.findings.length : 0

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${border}`,
        background: bg,
        padding: 12,
      }}
    >
      <p className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-50)", marginBottom: 4 }}>
        {lens.lens}
      </p>
      <p className="ih-serif" style={{ fontSize: 26, margin: "0 0 4px", color }}>
        {rag || "—"}
      </p>
      <p style={{ fontSize: 10, color: "var(--ih-ink-50)", margin: 0 }}>
        {findingCount} finding{findingCount === 1 ? "" : "s"}
      </p>
    </div>
  )
}

function ReportContent({ contentHtml }: { contentHtml: string }) {
  if (!contentHtml) return null
  return (
    <section>
      <p className="ih-eyebrow" style={{ marginBottom: 12 }}>Full report</p>
      <div
        className="prose prose-sm max-w-none"
        style={{
          border: "1px solid var(--ih-line)",
          borderRadius: 8,
          padding: 24,
          background: "var(--ih-surface)",
          color: "var(--ih-ink)",
          lineHeight: 1.65,
        }}
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

  const ctaCardBase: React.CSSProperties = {
    borderRadius: 8,
    border: "1px solid var(--ih-line)",
    padding: 24,
    display: "block",
    textDecoration: "none",
    transition: "border-color 0.15s ease",
    background: "var(--ih-surface)",
  }

  return (
    <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {/* Walkthrough booking */}
      <a
        href={walkthroughUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={ctaCardBase}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ih-accent)" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ih-line)" }}
      >
        <Calendar size={20} style={{ color: "var(--ih-ink-40)", marginBottom: 12 }} />
        <p className="ih-serif" style={{ fontSize: 18, margin: "0 0 6px", color: "var(--ih-ink)" }}>
          Book a walkthrough call
        </p>
        <p style={{ fontSize: 13, color: "var(--ih-ink-50)", margin: "0 0 12px", lineHeight: 1.5 }}>
          30 minutes with your consultant to walk through the findings and answer questions.
        </p>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500, color: "var(--ih-accent)" }}>
          Book a time <ArrowRight size={14} />
        </span>
      </a>

      {/* Implementation proposal request */}
      {requested ? (
        <div
          style={{
            borderRadius: 8,
            border: "1px solid rgba(47,111,92,0.4)",
            background: "rgba(47,111,92,0.06)",
            padding: 24,
          }}
        >
          <FileText size={20} style={{ color: "var(--ih-ok)", marginBottom: 12 }} />
          <p className="ih-serif" style={{ fontSize: 18, margin: "0 0 6px", color: "var(--ih-ok)" }}>
            Proposal requested
          </p>
          <p style={{ fontSize: 13, color: "var(--ih-ink-65)", margin: 0, lineHeight: 1.5 }}>
            Your consultant has been notified. They&apos;ll send a tailored implementation
            proposal within 2 business days.
          </p>
        </div>
      ) : (
        <button
          onClick={handleRequest}
          disabled={requesting}
          style={{
            ...ctaCardBase,
            textAlign: "left",
            cursor: requesting ? "not-allowed" : "pointer",
            opacity: requesting ? 0.6 : 1,
            width: "100%",
            border: "1px solid var(--ih-line)",
          }}
          onMouseEnter={(e) => {
            if (!requesting) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ih-accent)"
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ih-line)"
          }}
        >
          <FileText size={20} style={{ color: "var(--ih-ink-40)", marginBottom: 12 }} />
          <p className="ih-serif" style={{ fontSize: 18, margin: "0 0 6px", color: "var(--ih-ink)" }}>
            Ready to fix what we found?
          </p>
          <p style={{ fontSize: 13, color: "var(--ih-ink-50)", margin: "0 0 12px", lineHeight: 1.5 }}>
            Get an implementation proposal tailored to your audit. We&apos;ll prioritise the top
            opportunities.
          </p>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500, color: "var(--ih-accent)" }}>
            {requesting ? "Requesting…" : "Request proposal"} <ArrowRight size={14} />
          </span>
        </button>
      )}
    </section>
  )
}
