"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  Clock,
  Target,
  PoundSterling,
  FileText,
  Users,
  Package,
  MapPin,
  BarChart3,
  Calendar,
  ShieldCheck,
  Eye,
  ArrowRight,
  ChevronRight,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Report definitions
// ---------------------------------------------------------------------------

interface ReportCard {
  title: string
  description: string
  icon: React.ElementType
  category: string
  href?: string
  lastGenerated: string
}

const pipelineReports: ReportCard[] = [
  {
    title: "Pipeline Analytics",
    description: "Deal conversion rates, velocity, and forecasting",
    icon: TrendingUp,
    category: "Pipeline",
    href: "/admin/brokerage-mockups/reports/pipeline",
    lastGenerated: "2026-03-08",
  },
  {
    title: "Stage Breakdown",
    description: "Time spent in each deal stage",
    icon: Clock,
    category: "Pipeline",
    href: "/admin/brokerage-mockups/reports/pipeline",
    lastGenerated: "2026-03-07",
  },
  {
    title: "Win/Loss Analysis",
    description: "Why deals succeed or fail",
    icon: Target,
    category: "Pipeline",
    href: "/admin/brokerage-mockups/reports/pipeline",
    lastGenerated: "2026-03-06",
  },
]

const financialReports: ReportCard[] = [
  {
    title: "Revenue Summary",
    description: "Total revenue, commission earned, and payment trends",
    icon: PoundSterling,
    category: "Financial",
    href: "/admin/brokerage-mockups/financials",
    lastGenerated: "2026-03-08",
  },
  {
    title: "Invoice Aging",
    description: "Outstanding invoices by age and status",
    icon: FileText,
    category: "Financial",
    href: "/admin/brokerage-mockups/financials/invoices",
    lastGenerated: "2026-03-07",
  },
  {
    title: "Broker Performance",
    description: "Commission earned, deals closed, and activity metrics per broker",
    icon: Users,
    category: "Financial",
    href: "/admin/brokerage-mockups/reports/broker-performance",
    lastGenerated: "2026-03-05",
  },
]

const inventoryReports: ReportCard[] = [
  {
    title: "Supply Availability",
    description: "Current credit inventory across all sites and unit types",
    icon: Package,
    category: "Inventory",
    href: "/admin/brokerage-mockups/inventory",
    lastGenerated: "2026-03-08",
  },
  {
    title: "Catchment Heatmap",
    description: "Geographic supply/demand balance across catchments",
    icon: MapPin,
    category: "Inventory",
    href: "/admin/brokerage-mockups/reports/catchment",
    lastGenerated: "2026-03-06",
  },
  {
    title: "Demand Forecast",
    description: "Projected credit demand based on pipeline and planning data",
    icon: BarChart3,
    category: "Inventory",
    lastGenerated: "2026-03-04",
  },
]

const complianceReports: ReportCard[] = [
  {
    title: "Compliance Calendar",
    description: "Upcoming monitoring, legal, and registration deadlines",
    icon: Calendar,
    category: "Compliance",
    href: "/admin/brokerage-mockups/compliance",
    lastGenerated: "2026-03-08",
  },
  {
    title: "Monitoring Schedule",
    description: "Site monitoring visits and assessment tracking",
    icon: ShieldCheck,
    category: "Compliance",
    lastGenerated: "2026-03-03",
  },
]

const categoryBadgeStyles: Record<string, string> = {
  Pipeline: "border-blue-200 bg-blue-50 text-blue-700",
  Financial: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Inventory: "border-amber-200 bg-amber-50 text-amber-700",
  Compliance: "border-violet-200 bg-violet-50 text-violet-700",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ReportCardItem({ report }: { report: ReportCard }) {
  const Icon = report.icon
  const content = (
    <Card className="group h-full border-border bg-card hover:shadow-md transition-all duration-200 hover:border-primary/30 cursor-pointer">
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <Badge className={`border text-[10px] ${categoryBadgeStyles[report.category] ?? "border-border bg-muted text-muted-foreground"}`}>
            {report.category}
          </Badge>
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">{report.title}</h3>
        <p className="text-xs text-muted-foreground mb-4 flex-1">{report.description}</p>
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-[10px] text-muted-foreground">
            Last generated: {new Date(report.lastGenerated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <span className="text-xs font-medium text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="h-3 w-3" />
            View Report
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  )

  if (report.href) {
    return <Link href={report.href} className="block h-full">{content}</Link>
  }
  return (
    <div className="relative opacity-60 cursor-not-allowed h-full">
      <Badge className="absolute top-3 right-3 z-10 bg-muted text-muted-foreground border-border text-[10px]">
        Coming soon
      </Badge>
      {content}
    </div>
  )
}

function ReportSection({ title, reports }: { title: string; reports: ReportCard[] }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <ReportCardItem key={report.title} report={report} />
        ))}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/admin/brokerage-mockups/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Reports</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prebuilt reports and analytics across your brokerage operations
        </p>
      </div>

      {/* Report Sections */}
      <ReportSection title="Pipeline Reports" reports={pipelineReports} />
      <ReportSection title="Financial Reports" reports={financialReports} />
      <ReportSection title="Inventory Reports" reports={inventoryReports} />
      <ReportSection title="Compliance Reports" reports={complianceReports} />
    </div>
  )
}
