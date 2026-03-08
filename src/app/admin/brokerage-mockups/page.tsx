import Link from "next/link"
import {
  LayoutDashboard,
  Handshake,
  MapPin,
  Package,
  GitCompareArrows,
  ShieldCheck,
  Users,
  PoundSterling,
} from "lucide-react"

const sections = [
  {
    href: "/admin/brokerage-mockups/dashboard",
    title: "Dashboard",
    description: "Overview of pipeline value, credit availability, commission earned, and compliance status. Activity feed and upcoming assessments.",
    stat: "£2.3M pipeline",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/brokerage-mockups/deals",
    title: "Deals Pipeline",
    description: "Kanban board tracking deals from lead through to completion. View by stage, filter by catchment, broker, and unit type.",
    stat: "18 active deals",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    icon: Handshake,
  },
  {
    href: "/admin/brokerage-mockups/sites",
    title: "Sites",
    description: "Gain sites generating nutrient and BNG credits. Table and map views with capacity tracking and allocation status.",
    stat: "8 sites",
    color: "bg-amber-50 border-amber-200 text-amber-700",
    icon: MapPin,
  },
  {
    href: "/admin/brokerage-mockups/inventory",
    title: "Inventory",
    description: "Credit availability by unit type and catchment area. Supply vs demand tracking with low-stock alerts.",
    stat: "1,247 kg N/yr available",
    color: "bg-purple-50 border-purple-200 text-purple-700",
    icon: Package,
  },
  {
    href: "/admin/brokerage-mockups/matching",
    title: "Matching",
    description: "Match developer demand to available supply sites. Ranked results by price, availability, and geographic constraint.",
    stat: "3 open demands",
    color: "bg-indigo-50 border-indigo-200 text-indigo-700",
    icon: GitCompareArrows,
  },
  {
    href: "/admin/brokerage-mockups/compliance",
    title: "Compliance",
    description: "Calendar and list views of monitoring deadlines, legal obligations, and registration renewals. Urgency-coded alerts.",
    stat: "3 overdue items",
    color: "bg-red-50 border-red-200 text-red-700",
    icon: ShieldCheck,
  },
  {
    href: "/admin/brokerage-mockups/contacts",
    title: "Contacts",
    description: "Landowners, farmers, developers, and housebuilders. Segmented by supply and demand side with deal tracking.",
    stat: "15 contacts",
    color: "bg-teal-50 border-teal-200 text-teal-700",
    icon: Users,
  },
  {
    href: "/admin/brokerage-mockups/financials",
    title: "Financials",
    description: "Commission tracking, invoice management, and payment ledger. Split breakdowns and broker performance.",
    stat: "£187K earned YTD",
    color: "bg-green-50 border-green-200 text-green-700",
    icon: PoundSterling,
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
              className="group border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-sm transition-all bg-card"
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
              <p className="text-sm text-muted-foreground leading-relaxed">
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
