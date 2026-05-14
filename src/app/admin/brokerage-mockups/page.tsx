import Link from "next/link"
import { totalCommissionYTD } from "./_mock-data"
import {
  LayoutDashboard,
  Handshake,
  MapPin,
  Package,
  GitCompareArrows,
  ShieldCheck,
  Users,
  PoundSterling,
  ClipboardCheck,
  FileText,
  BarChart3,
  Settings,
  Play,
  Brain,
  Globe,
  Receipt,
  Calculator,
  Target,
  Scale,
  CalendarClock,
} from "lucide-react"

const sections = [
  {
    href: "/admin/brokerage-mockups/dashboard",
    title: "Dashboard",
    description: "Overview of pipeline value, credit availability, commission earned, and compliance status. Activity feed and upcoming assessments.",
    stat: "£2.3M pipeline",
    color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/brokerage-mockups/deals",
    title: "Deals Pipeline",
    description: "Kanban board tracking deals from lead through to completion. View by stage, filter by catchment, broker, and unit type.",
    stat: "18 active deals",
    color: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
    icon: Handshake,
  },
  {
    href: "/admin/brokerage-mockups/sites",
    title: "Sites",
    description: "Gain sites generating nutrient and BNG credits. Table and map views with capacity tracking and allocation status.",
    stat: "6 sites",
    color: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
    icon: MapPin,
  },
  {
    href: "/admin/brokerage-mockups/contacts",
    title: "Contacts",
    description: "Landowners, farmers, developers, and housebuilders. Segmented by supply and demand side with deal tracking.",
    stat: "15 contacts",
    color: "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300",
    icon: Users,
  },
  {
    href: "/admin/brokerage-mockups/assessments",
    title: "Assessments",
    description: "Schedule assessors, track surveys, calculate nutrient budgets and biodiversity metrics.",
    stat: "5 this month",
    color: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300",
    icon: ClipboardCheck,
  },
  {
    href: "/admin/brokerage-mockups/assessments/aerial-tool",
    title: "Aerial Assessment Tool",
    description: "Draw boundaries on satellite imagery, auto-calculate area, generate preliminary BNG and nutrient assessments.",
    stat: "Satellite + GIS",
    color: "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300",
    icon: Globe,
  },
  {
    href: "/admin/brokerage-mockups/assessments/nutrient-modeller",
    title: "Nutrient Budget Modeller",
    description: "Interactive calculator for modelling land use change scenarios and nutrient credit yields.",
    stat: "Scenario planner",
    color: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300",
    icon: Calculator,
  },
  {
    href: "/admin/brokerage-mockups/inventory",
    title: "Inventory",
    description: "Credit availability by unit type and catchment area. Supply vs demand tracking with low-stock alerts.",
    stat: "340 kg N/yr available",
    color: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300",
    icon: Package,
  },
  {
    href: "/admin/brokerage-mockups/matching",
    title: "Matching",
    description: "Match developer demand to available supply sites. Ranked results by price, availability, and geographic constraint.",
    stat: "3 open demands",
    color: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300",
    icon: GitCompareArrows,
  },
  {
    href: "/admin/brokerage-mockups/matching/demand-scanner",
    title: "Catchment Demand Scanner",
    description: "Drop a pin on the map, scan for planning applications and credit demand within radius. Identify supply gaps and create prospect deals.",
    stat: "Market intel",
    color: "bg-fuchsia-50 dark:bg-fuchsia-950/30 border-fuchsia-200 dark:border-fuchsia-800 text-fuchsia-700 dark:text-fuchsia-300",
    icon: Target,
  },
  {
    href: "/admin/brokerage-mockups/documents",
    title: "Documents",
    description: "Templates, agreements, e-signatures, and version tracking. Full document lifecycle management.",
    stat: "12 active",
    color: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300",
    icon: FileText,
  },
  {
    href: "/admin/brokerage-mockups/documents/s106-generator",
    title: "Legal Document Generator",
    description: "Generate S106 agreements, conservation covenants, and heads of terms from deal data. Auto-populated with correct legal language.",
    stat: "3 templates",
    color: "bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300",
    icon: Scale,
  },
  {
    href: "/admin/brokerage-mockups/compliance",
    title: "Compliance",
    description: "Calendar and list views of monitoring deadlines, legal obligations, and registration renewals. Urgency-coded alerts.",
    stat: "3 overdue items",
    color: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
    icon: ShieldCheck,
  },
  {
    href: "/admin/brokerage-mockups/compliance/auto-scheduler",
    title: "Compliance Auto-Scheduler",
    description: "Auto-schedule 30-year monitoring visits. Checks assessor availability, survey seasons, and site access. AI-optimised multi-site routing.",
    stat: "AI scheduling",
    color: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300",
    icon: CalendarClock,
  },
  {
    href: "/admin/brokerage-mockups/financials",
    title: "Financials",
    description: "Commission tracking, invoice management, and payment ledger. Split breakdowns and broker performance.",
    stat: `£${Math.round(totalCommissionYTD / 1000)}K earned YTD`,
    color: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300",
    icon: PoundSterling,
  },
  {
    href: "/admin/brokerage-mockups/financials/invoice-generator",
    title: "Invoice Generator",
    description: "Auto-generate professional invoices and quotes from deal data with live PDF preview.",
    stat: "PDF export",
    color: "bg-lime-50 dark:bg-lime-950/30 border-lime-200 dark:border-lime-800 text-lime-700 dark:text-lime-300",
    icon: Receipt,
  },
  {
    href: "/admin/brokerage-mockups/reports",
    title: "Reports",
    description: "Pipeline analytics, catchment heatmaps, broker KPIs, and forecasting. Data-driven decision making.",
    stat: "8 reports",
    color: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300",
    icon: BarChart3,
  },
  {
    href: "/admin/brokerage-mockups/settings",
    title: "Settings",
    description: "Verticals, commission rates, team management, integrations, and notification preferences.",
    stat: "3 verticals",
    color: "bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300",
    icon: Settings,
  },
  {
    href: "/admin/brokerage-mockups/demo",
    title: "Demo Walkthrough",
    description: "Guided tour through a complete deal lifecycle - from new landowner contact to credit allocation and compliance.",
    stat: "14 steps",
    color: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
    icon: Play,
  },
  {
    href: "/admin/brokerage-mockups/ai-assistant",
    title: "AI Platform Vision",
    description: "Pitch-deck style walkthrough of the 5-phase AI roadmap. Read-only intelligence → autonomous overnight operations. Includes infrastructure architecture diagram.",
    stat: "5 phases",
    color: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300",
    icon: Brain,
  },
]

export default function BrokerageMockupsPage() {
  return (
    <div className="max-w-screen-lg mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Ironheart · BNG / Nutrient Credit Brokerage
        </p>
        <h1 className="text-4xl font-semibold tracking-tight mb-4">
          Brokerage Operations Platform
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl">
          Mock dashboards for a multi-vertical brokerage platform. First vertical: BNG and nutrient credit brokerage in the Solent catchment area.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-sm transition-all bg-card h-full flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-muted">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h2 className="text-base font-semibold group-hover:text-primary transition-colors">
                    {s.title}
                  </h2>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${s.color}`}>
                  {s.stat}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                {s.description}
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                View mockup →
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
