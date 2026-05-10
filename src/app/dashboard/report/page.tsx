"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Download,
  CalendarCheck,
  Wrench,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Placeholder report data — matches ReportContentJson structure
// ---------------------------------------------------------------------------

type RAGScore = "RED" | "AMBER" | "GREEN"

interface LensSummary {
  lens: string
  label: string
  score: RAGScore
  summary: string
  findings: string[]
}

interface TopFinding {
  title: string
  lens: string
  wasteEstimate: string
  description: string
}

const MOCK_REPORT = {
  executiveSummary:
    "Our comprehensive audit of Northvale Engineering has identified significant operational inefficiencies across five core business lenses. The total estimated annual waste is approximately 340,000 GBP, with the largest opportunities in Revenue Leakage and Operational Efficiency. The findings below represent actionable opportunities that, when addressed, will materially improve profitability and team performance.",
  totalEstimatedWaste: "340,000",
  lenses: [
    {
      lens: "revenue",
      label: "Revenue",
      score: "RED" as RAGScore,
      summary:
        "Significant revenue leakage identified in pricing strategy and client retention processes. Inconsistent quoting and no systematic upsell framework.",
      findings: [
        "No standardised pricing model — quotes vary 15-40% for equivalent work",
        "Client churn rate 3x industry average due to reactive account management",
        "Missed recurring revenue opportunities worth approx. 120,000 GBP/year",
      ],
    },
    {
      lens: "operations",
      label: "Ops",
      score: "AMBER" as RAGScore,
      summary:
        "Project delivery is generally on time but processes are heavily dependent on tribal knowledge. SOPs are outdated or missing.",
      findings: [
        "No centralised project management — work tracked across 4 different tools",
        "30% of project time spent on rework due to unclear briefs",
        "Onboarding a new hire takes 6+ weeks due to undocumented processes",
      ],
    },
    {
      lens: "finance",
      label: "Finance",
      score: "GREEN" as RAGScore,
      summary:
        "Financial controls are broadly sound. Cash flow management could be improved with tighter invoicing cadence.",
      findings: [
        "Average days-to-payment is 52 days — industry benchmark is 30",
        "No automated chasing process for overdue invoices",
      ],
    },
    {
      lens: "tech",
      label: "Tech",
      score: "AMBER" as RAGScore,
      summary:
        "Tech stack is functional but fragmented. Key integrations are missing, creating manual data entry bottlenecks.",
      findings: [
        "CRM and project management tools do not sync — manual data entry required",
        "No single source of truth for client data",
        "Legacy systems handling 40% of workflows with no upgrade path",
      ],
    },
    {
      lens: "team",
      label: "Team",
      score: "RED" as RAGScore,
      summary:
        "Team engagement is low. Role clarity and performance management are significant gaps.",
      findings: [
        "No formal performance review process — last reviews were 18 months ago",
        "3 of 8 team members have unclear role boundaries",
        "Team NPS score of 12 (industry average is 35+)",
      ],
    },
  ] satisfies LensSummary[],
  topFindings: [
    {
      title: "Revenue leakage from inconsistent pricing",
      lens: "Revenue",
      wasteEstimate: "120,000",
      description:
        "Without a standardised pricing model, equivalent projects are quoted with 15-40% variance. This creates margin erosion and client trust issues.",
    },
    {
      title: "Rework caused by unclear project briefs",
      lens: "Ops",
      wasteEstimate: "95,000",
      description:
        "Approximately 30% of project hours are spent on rework. Implementing a structured brief and sign-off process would recover the majority of this waste.",
    },
    {
      title: "Team disengagement driving turnover costs",
      lens: "Team",
      wasteEstimate: "75,000",
      description:
        "Low engagement scores correlate with higher turnover. Replacement costs, lost productivity, and training overhead are estimated at 75,000 GBP annually.",
    },
  ] satisfies TopFinding[],
}

const RAG_COLORS: Record<RAGScore, { bg: string; text: string; border: string; dot: string }> = {
  RED: {
    bg: "bg-red-50",
    text: "text-[#D13A1F]",
    border: "border-red-200",
    dot: "bg-[#D13A1F]",
  },
  AMBER: {
    bg: "bg-amber-50",
    text: "text-[#B8860B]",
    border: "border-amber-200",
    dot: "bg-[#B8860B]",
  },
  GREEN: {
    bg: "bg-emerald-50",
    text: "text-[#2F6F5C]",
    border: "border-emerald-200",
    dot: "bg-[#2F6F5C]",
  },
}

export default function ReportPage() {
  const report = MOCK_REPORT
  const [expandedLens, setExpandedLens] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-stone-900">Audit Report</h1>
          <p className="mt-1 text-stone-500">
            Northvale Engineering &middot; Full Business Audit
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Executive summary */}
      <Card className="border-stone-200 bg-white">
        <CardHeader>
          <CardTitle className="font-serif text-xl text-stone-900">
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-stone-600">
            {report.executiveSummary}
          </p>
          <div className="mt-6 inline-flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-3">
            <TrendingDown className="h-5 w-5 text-[#D13A1F]" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                Total Estimated Annual Waste
              </p>
              <p className="text-2xl font-bold text-[#D13A1F]">
                {"\u00A3"}{report.totalEstimatedWaste}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5-lens RAG scores */}
      <div>
        <h2 className="mb-4 font-serif text-lg text-stone-900">
          Five-Lens Assessment
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {report.lenses.map((lens) => {
            const colors = RAG_COLORS[lens.score]
            return (
              <Card
                key={lens.lens}
                className={cn(
                  "border text-center",
                  colors.bg,
                  colors.border
                )}
              >
                <CardContent className="p-4">
                  <div
                    className={cn(
                      "mx-auto mb-2 h-3 w-3 rounded-full",
                      colors.dot
                    )}
                  />
                  <p className="text-sm font-semibold text-stone-900">
                    {lens.label}
                  </p>
                  <p className={cn("text-xs font-bold", colors.text)}>
                    {lens.score}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Top 3 findings */}
      <div>
        <h2 className="mb-4 font-serif text-lg text-stone-900">
          Top Findings
        </h2>
        <div className="space-y-3">
          {report.topFindings.map((finding, idx) => (
            <Card
              key={idx}
              className="border-stone-200 bg-white"
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-[#D13A1F]">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-semibold text-stone-900">
                      {finding.title}
                    </p>
                    <Badge className="bg-stone-100 text-stone-600 border-stone-200">
                      {finding.lens}
                    </Badge>
                  </div>
                  <p className="mb-2 text-sm text-stone-500">
                    {finding.description}
                  </p>
                  <div className="flex items-center gap-1 text-sm font-semibold text-[#D13A1F]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {"\u00A3"}{finding.wasteEstimate}/year
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Full report expandable sections */}
      <div>
        <h2 className="mb-4 font-serif text-lg text-stone-900">
          Detailed Findings by Lens
        </h2>
        <div className="space-y-2">
          {report.lenses.map((lens) => {
            const isExpanded = expandedLens === lens.lens
            const colors = RAG_COLORS[lens.score]
            return (
              <Card key={lens.lens} className="border-stone-200 bg-white">
                <button
                  onClick={() =>
                    setExpandedLens(isExpanded ? null : lens.lens)
                  }
                  className="flex w-full items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full",
                        colors.dot
                      )}
                    />
                    <span className="text-sm font-semibold text-stone-900">
                      {lens.label}
                    </span>
                    <Badge className={cn(colors.bg, colors.text, colors.border)}>
                      {lens.score}
                    </Badge>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-stone-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-stone-400" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5">
                    <Separator className="mb-4" />
                    <p className="mb-3 text-sm text-stone-600">
                      {lens.summary}
                    </p>
                    <ul className="space-y-2">
                      {lens.findings.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-stone-500"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          size="lg"
          className="gap-2 bg-[#2F6F5C] hover:bg-[#265c4c]"
        >
          <CalendarCheck className="h-4 w-4" />
          Book Walkthrough Call
        </Button>
        <Button
          size="lg"
          className="gap-2 bg-[#D13A1F] hover:bg-[#b5301a]"
        >
          <Wrench className="h-4 w-4" />
          Ready to fix what we found?
        </Button>
      </div>
    </div>
  )
}
