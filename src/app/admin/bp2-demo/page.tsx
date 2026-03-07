import Link from "next/link"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, LayoutGrid, Building2, CalendarDays, Search } from "lucide-react"

const demos = [
  {
    href: "/admin/bp2-demo/deals-pipeline",
    icon: LayoutGrid,
    title: "Deals Pipeline",
    description:
      "Kanban board tracking all active instructions from listing through to completion. Visualise where every deal sits in the pipeline at a glance.",
    stat: "14 active deals",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    statColor: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    href: "/admin/bp2-demo/property-stock",
    icon: Building2,
    title: "Property Stock",
    description:
      "Live table of every active listing — size, rent, days on market, enquiries, and viewings — filterable by property type.",
    stat: "27 live listings",
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
    statColor: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  {
    href: "/admin/bp2-demo/lease-calendar",
    icon: CalendarDays,
    title: "Lease Advisory Calendar",
    description:
      "Critical date tracker for rent reviews, break clauses, and lease expiries. Colour-coded by urgency so nothing is ever missed.",
    stat: "4 critical dates",
    iconColor: "text-red-500",
    iconBg: "bg-red-500/10",
    statColor: "bg-red-50 border-red-200 text-red-700",
  },
  {
    href: "/admin/bp2-demo/requirements-matcher",
    icon: Search,
    title: "Requirements Matcher",
    description:
      "Match active buyer and tenant requirements against current stock. See match scores, gaps, and the strongest candidates instantly.",
    stat: "9 active requirements",
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    statColor: "bg-amber-50 border-amber-200 text-amber-700",
  },
]

export default function BP2DemoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="BP2 Property · Demo"
        description="Four views into how internal processes — currently managed across email, spreadsheets, and memory — could be centralised into a single system."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {demos.map((demo) => {
          const Icon = demo.icon
          return (
            <Link key={demo.href} href={demo.href}>
              <Card className="group h-full hover:shadow-md transition-all duration-150 hover:border-primary/30 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${demo.iconBg}`}>
                      <Icon className={`h-5 w-5 ${demo.iconColor}`} />
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded border ${demo.statColor}`}
                    >
                      {demo.stat}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold mb-2 group-hover:text-primary transition-colors">
                    {demo.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {demo.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View demo <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
