import Link from "next/link"

const mockups = [
  {
    href: "/mockups/deals-pipeline",
    title: "Deals Pipeline",
    description: "Kanban board tracking all active instructions from listing through to completion. Visualise where every deal sits in the pipeline at a glance.",
    stat: "14 active deals",
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    href: "/mockups/property-stock",
    title: "Property Stock",
    description: "Live table of every active listing — size, rent, days on market, enquiries, and viewings — filterable by property type.",
    stat: "27 live listings",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  {
    href: "/mockups/lease-calendar",
    title: "Lease Advisory Calendar",
    description: "Critical date tracker for rent reviews, break clauses, and lease expiries. Colour-coded by urgency so nothing is ever missed.",
    stat: "4 critical dates",
    color: "bg-red-50 border-red-200 text-red-700",
  },
  {
    href: "/mockups/requirements-matcher",
    title: "Requirements Matcher",
    description: "Match active buyer and tenant requirements against current stock. See match scores, gaps, and the strongest candidates instantly.",
    stat: "9 active requirements",
    color: "bg-amber-50 border-amber-200 text-amber-700",
  },
]

export default function MockupsPage() {
  return (
    <div className="max-w-screen-lg mx-auto px-6 py-16">
      <div className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          BP2 Commercial Property · Software Demo
        </p>
        <h1 className="text-4xl font-semibold tracking-tight mb-4">
          Four views into your business
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl">
          These mockups show how internal processes — currently managed across email, spreadsheets, and memory — could be centralised into a single system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockups.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-sm transition-all bg-card"
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-base font-semibold group-hover:text-primary transition-colors">
                {m.title}
              </h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded border ${m.color}`}>
                {m.stat}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {m.description}
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              View mockup →
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
