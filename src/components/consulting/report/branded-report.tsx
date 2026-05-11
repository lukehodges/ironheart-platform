"use client"

import type {
  ReportContentJson,
  ReportLensSection,
  ReportFinding,
  ReportRecommendation,
  ReportRoadmapPhase,
} from "@/modules/report-generator/report-generator.types"
import { cn } from "@/lib/utils"

/* ─── Brand tokens ─────────────────────────────────────────────────── */

const brand = {
  bg: "#EFEAE0",
  surface: "#F5F1E8",
  surface2: "#FBF7EE",
  ink: "#0E1013",
  inkDim: "rgba(14,16,19,0.66)",
  inkFaint: "rgba(14,16,19,0.38)",
  accent: "#D13A1F",
  accentDeep: "#9B2A12",
  moss: "#2F6F5C",
  gold: "#B8860B",
  line: "rgba(11,13,14,0.10)",
  line2: "rgba(11,13,14,0.18)",
} as const

const RAG_COLORS: Record<string, { bg: string; text: string }> = {
  RED: { bg: brand.accent, text: "#FFFFFF" },
  AMBER: { bg: brand.gold, text: "#FFFFFF" },
  GREEN: { bg: brand.moss, text: "#FFFFFF" },
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "--"
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value)
}

function RagBadge({ score, size = "sm" }: { score: string; size?: "sm" | "lg" }) {
  const colors = RAG_COLORS[score.toUpperCase()] ?? RAG_COLORS.RED
  const sizeClass = size === "lg" ? "px-4 py-2 text-base" : "px-2.5 py-1 text-xs"
  return (
    <span
      className={cn("inline-block rounded font-bold uppercase tracking-wide", sizeClass)}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {score}
    </span>
  )
}

const LENS_ORDER = ["REVENUE", "OPERATIONS", "FINANCE", "TECHNOLOGY", "TEAM"]

function lensIndex(lens: string): number {
  const idx = LENS_ORDER.indexOf(lens.toUpperCase())
  return idx >= 0 ? idx + 1 : 0
}

/* ─── Page wrapper ─────────────────────────────────────────────────── */

function ReportPage({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative w-full max-w-[210mm] mx-auto min-h-[297mm] p-[40px] break-after-page",
        className,
      )}
      style={{
        backgroundColor: brand.bg,
        color: brand.ink,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  )
}

/* ─── Main component ───────────────────────────────────────────────── */

interface BrandedReportProps {
  content: ReportContentJson
  className?: string
}

export function BrandedReport({ content, className }: BrandedReportProps) {
  const sortedLenses = [...content.lenses].sort(
    (a, b) => lensIndex(a.lens) - lensIndex(b.lens),
  )

  return (
    <div className={cn("branded-report", className)}>
      {/* Print styles */}
      <style>{`
        @media print {
          .branded-report { background: ${brand.bg} !important; }
          .branded-report .break-after-page { page-break-after: always; }
          .branded-report .break-after-page:last-child { page-break-after: avoid; }
          body { margin: 0; padding: 0; }
          @page { margin: 0; size: A4; }
        }
      `}</style>

      <CoverPage content={content} />
      <ExecutiveSummaryPage content={content} lenses={sortedLenses} />
      {sortedLenses.map((lens, i) => (
        <LensPage key={lens.lens} lens={lens} index={i + 1} />
      ))}
      {content.implementationRoadmap.length > 0 && (
        <RoadmapPage phases={content.implementationRoadmap} />
      )}
      <FooterPage />
    </div>
  )
}

/* ─── Page 1: Cover ────────────────────────────────────────────────── */

function CoverPage({ content }: { content: ReportContentJson }) {
  return (
    <ReportPage className="flex flex-col justify-between">
      <div>
        {/* Logo mark */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-lg"
            style={{ backgroundColor: brand.accent }}
          >
            IH
          </div>
          <span
            className="text-xl tracking-wide"
            style={{ fontFamily: "'Georgia', serif", color: brand.inkDim }}
          >
            The Ironheart
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <h1
          className="text-5xl leading-tight mb-6"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          Business Audit
          <br />
          Report
        </h1>

        <div
          className="w-16 h-1 mb-8"
          style={{ backgroundColor: brand.accent }}
        />

        <div className="space-y-3" style={{ color: brand.inkDim }}>
          <p className="text-lg">
            Prepared for{" "}
            <span className="font-semibold" style={{ color: brand.ink }}>
              {content.clientName}
            </span>
          </p>
          <p className="text-sm">Date: {content.auditDate}</p>
          <p className="text-sm">Auditor: Luke Hodges</p>
          <p className="text-sm">
            Reference: IH-{content.auditDate?.replace(/-/g, "").slice(2, 8)}
          </p>
        </div>
      </div>

      <div
        className="text-xs uppercase tracking-widest pt-6"
        style={{ color: brand.inkFaint, borderTop: `1px solid ${brand.line2}` }}
      >
        Confidential
      </div>
    </ReportPage>
  )
}

/* ─── Page 2: Executive Summary ────────────────────────────────────── */

function ExecutiveSummaryPage({
  content,
  lenses,
}: {
  content: ReportContentJson
  lenses: ReportLensSection[]
}) {
  return (
    <ReportPage>
      <h2
        className="text-3xl mb-8"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        Executive Summary
      </h2>

      {/* Overall health */}
      <p className="text-sm mb-8 leading-relaxed" style={{ color: brand.inkDim }}>
        {content.executiveSummary}
      </p>

      {/* RAG Dashboard */}
      <div className="mb-8">
        <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: brand.inkFaint }}>
          RAG Dashboard
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {lenses.map((lens) => {
            const colors = RAG_COLORS[lens.ragScore?.toUpperCase()] ?? RAG_COLORS.RED
            return (
              <div
                key={lens.lens}
                className="rounded-lg p-4 text-center"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                <p className="text-xs uppercase tracking-wide opacity-80 mb-1">
                  {lens.lens}
                </p>
                <p className="text-lg font-bold">{lens.ragScore}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top 3 Critical Findings */}
      <div className="mb-8">
        <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: brand.inkFaint }}>
          Top Critical Findings
        </h3>
        <div className="space-y-3">
          {content.topFindings.slice(0, 3).map((finding, i) => (
            <div
              key={i}
              className="rounded-lg p-4 flex gap-4"
              style={{ backgroundColor: brand.surface2, border: `1px solid ${brand.line}` }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: brand.accent, color: "#fff" }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-1">{finding.finding}</p>
                <p className="text-xs" style={{ color: brand.inkDim }}>
                  {finding.impact}
                </p>
              </div>
              {finding.estimatedAnnualWaste != null && (
                <div className="text-right flex-shrink-0">
                  <p className="text-xs" style={{ color: brand.inkFaint }}>
                    Est. waste
                  </p>
                  <p className="font-bold text-sm" style={{ color: brand.accent }}>
                    {formatCurrency(finding.estimatedAnnualWaste)}/yr
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Total estimated waste */}
      {content.totalEstimatedWaste > 0 && (
        <div
          className="rounded-lg p-6 text-center"
          style={{
            backgroundColor: brand.surface,
            border: `1px solid ${brand.line2}`,
          }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-2"
            style={{ color: brand.inkFaint }}
          >
            Estimated Annual Cost of Identified Inefficiencies
          </p>
          <p
            className="text-4xl font-bold"
            style={{ fontFamily: "'Georgia', serif", color: brand.accent }}
          >
            {formatCurrency(content.totalEstimatedWaste)}
          </p>
        </div>
      )}
    </ReportPage>
  )
}

/* ─── Pages 3-7: Per-Lens Analysis ─────────────────────────────────── */

function LensPage({ lens, index }: { lens: ReportLensSection; index: number }) {
  return (
    <ReportPage>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white text-lg"
          style={{ backgroundColor: brand.accent }}
        >
          {index}
        </div>
        <div className="flex-1">
          <h2
            className="text-2xl"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            {lens.lens}
          </h2>
        </div>
        <RagBadge score={lens.ragScore} size="lg" />
      </div>

      {/* Current State */}
      <div className="mb-8">
        <h3
          className="text-sm font-semibold uppercase tracking-wide mb-3"
          style={{ color: brand.inkFaint }}
        >
          Current State
        </h3>
        <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: brand.inkDim }}>
          {lens.currentState}
        </div>
      </div>

      {/* RAG Justification */}
      {lens.ragJustification && (
        <div
          className="mb-8 rounded-lg p-4"
          style={{ backgroundColor: brand.surface2, border: `1px solid ${brand.line}` }}
        >
          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: brand.inkFaint }}>
            RAG Justification
          </p>
          <p className="text-sm" style={{ color: brand.inkDim }}>
            {lens.ragJustification}
          </p>
        </div>
      )}

      {/* Key Findings table */}
      {lens.findings.length > 0 && (
        <div className="mb-8">
          <h3
            className="text-sm font-semibold uppercase tracking-wide mb-3"
            style={{ color: brand.inkFaint }}
          >
            Key Findings
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${brand.line2}` }}>
                  <th className="text-left py-2 pr-3 font-semibold" style={{ color: brand.inkDim }}>
                    Finding
                  </th>
                  <th className="text-left py-2 pr-3 font-semibold" style={{ color: brand.inkDim }}>
                    Impact
                  </th>
                  <th className="text-left py-2 pr-3 font-semibold" style={{ color: brand.inkDim }}>
                    Evidence
                  </th>
                  <th className="text-left py-2 font-semibold" style={{ color: brand.inkDim }}>
                    Priority
                  </th>
                </tr>
              </thead>
              <tbody>
                {lens.findings.map((f, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${brand.line}` }}>
                    <td className="py-2.5 pr-3 font-medium">{f.finding}</td>
                    <td className="py-2.5 pr-3" style={{ color: brand.inkDim }}>
                      {f.impact}
                    </td>
                    <td className="py-2.5 pr-3" style={{ color: brand.inkDim }}>
                      {f.evidence}
                    </td>
                    <td className="py-2.5">
                      <PriorityBadge priority={f.priority} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      {lens.recommendations.length > 0 && (
        <div>
          <h3
            className="text-sm font-semibold uppercase tracking-wide mb-3"
            style={{ color: brand.inkFaint }}
          >
            Recommended Actions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${brand.line2}` }}>
                  <th className="text-left py-2 pr-3 font-semibold" style={{ color: brand.inkDim }}>
                    Action
                  </th>
                  <th className="text-left py-2 pr-3 font-semibold" style={{ color: brand.inkDim }}>
                    Effort
                  </th>
                  <th className="text-left py-2 font-semibold" style={{ color: brand.inkDim }}>
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {lens.recommendations.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${brand.line}` }}>
                    <td className="py-2.5 pr-3 font-medium">{r.action}</td>
                    <td className="py-2.5 pr-3" style={{ color: brand.inkDim }}>
                      {r.estimatedEffort}
                    </td>
                    <td className="py-2.5" style={{ color: brand.inkDim }}>
                      {formatCurrency(r.estimatedCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReportPage>
  )
}

function PriorityBadge({ priority }: { priority: number }) {
  const config =
    priority <= 1
      ? { label: "Critical", bg: brand.accent, text: "#fff" }
      : priority <= 2
        ? { label: "High", bg: brand.gold, text: "#fff" }
        : { label: "Medium", bg: brand.surface, text: brand.ink }
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  )
}

/* ─── Page 8: Implementation Roadmap ───────────────────────────────── */

function RoadmapPage({ phases }: { phases: ReportRoadmapPhase[] }) {
  const phaseLabels = ["Quick Wins", "Core Fixes", "Strategic Changes"]

  return (
    <ReportPage>
      <h2
        className="text-3xl mb-8"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        Implementation Roadmap
      </h2>

      <div className="space-y-8">
        {phases.map((phase, i) => (
          <div key={phase.phase}>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                style={{ backgroundColor: brand.accent }}
              >
                {phase.phase}
              </div>
              <h3
                className="text-xl"
                style={{ fontFamily: "'Georgia', serif" }}
              >
                {phase.name || phaseLabels[i] || `Phase ${phase.phase}`}
              </h3>
              {phase.estimatedDuration && (
                <span
                  className="text-xs rounded-full px-3 py-1 ml-auto"
                  style={{
                    backgroundColor: brand.surface,
                    color: brand.inkDim,
                    border: `1px solid ${brand.line2}`,
                  }}
                >
                  {phase.estimatedDuration}
                </span>
              )}
            </div>

            {phase.description && (
              <p className="text-sm mb-4" style={{ color: brand.inkDim }}>
                {phase.description}
              </p>
            )}

            {phase.recommendations.length > 0 && (
              <div className="space-y-2">
                {phase.recommendations.map((rec, j) => (
                  <div
                    key={j}
                    className="flex items-center gap-3 rounded-lg p-3"
                    style={{
                      backgroundColor: brand.surface2,
                      border: `1px solid ${brand.line}`,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{rec.action}</p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: brand.inkDim }}>
                      {rec.estimatedEffort}
                    </span>
                    {rec.estimatedCost != null && (
                      <span className="text-xs font-semibold flex-shrink-0" style={{ color: brand.accent }}>
                        {formatCurrency(rec.estimatedCost)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ReportPage>
  )
}

/* ─── Page 9: Footer ───────────────────────────────────────────────── */

function FooterPage() {
  return (
    <ReportPage className="flex flex-col justify-center items-center text-center">
      <div className="space-y-8">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center font-bold text-white text-2xl mx-auto"
          style={{ backgroundColor: brand.accent }}
        >
          IH
        </div>

        <p
          className="text-2xl max-w-md mx-auto leading-relaxed"
          style={{ fontFamily: "'Georgia', serif", color: brand.inkDim }}
        >
          We rebuild the busy work &mdash; so you can think.
        </p>

        <div
          className="w-12 h-0.5 mx-auto"
          style={{ backgroundColor: brand.line2 }}
        />

        <div className="text-sm space-y-1" style={{ color: brand.inkFaint }}>
          <p>The Ironheart</p>
          <p>www.theironheart.co.uk</p>
        </div>
      </div>
    </ReportPage>
  )
}
