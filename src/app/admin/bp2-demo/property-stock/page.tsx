"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Clock,
  MessageSquare,
  CalendarCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

type PropertyType = "Office" | "Retail" | "Industrial" | "Trade Counter" | "Leisure"
type StatusType = "Available" | "Under Offer" | "Let Agreed" | "Stc"
type TabType = "All" | PropertyType

interface Listing {
  id: number
  property: string
  location: string
  type: PropertyType
  size: string
  asking: string
  daysOnMarket: number
  enquiries: number
  viewings: number
  status: StatusType
}

const listings: Listing[] = [
  { id: 1,  property: "Unit 3 Axis Court",               location: "Swansea Enterprise Park",  type: "Office",        size: "1,240",  asking: "£14,500 pa",    daysOnMarket: 12, enquiries: 8,  viewings: 4, status: "Available" },
  { id: 2,  property: "Ground Floor Suite, Sophia House", location: "Cardiff",                 type: "Office",        size: "850",    asking: "£12,000 pa",    daysOnMarket: 28, enquiries: 5,  viewings: 2, status: "Available" },
  { id: 3,  property: "Bridgend Business Centre, Suite 7",location: "Bridgend",                type: "Office",        size: "620",    asking: "£8,200 pa",     daysOnMarket: 45, enquiries: 3,  viewings: 1, status: "Available" },
  { id: 4,  property: "Meridian Point",                   location: "Neath",                   type: "Office",        size: "3,400",  asking: "£34,000 pa",    daysOnMarket: 67, enquiries: 11, viewings: 6, status: "Under Offer" },
  { id: 5,  property: "First Floor, Kingsway",            location: "Swansea",                 type: "Office",        size: "1,800",  asking: "£22,500 pa",    daysOnMarket: 19, enquiries: 7,  viewings: 3, status: "Available" },
  { id: 6,  property: "Sketty Lane Commercial",           location: "Swansea",                 type: "Office",        size: "950",    asking: "£14,000 pa",    daysOnMarket: 8,  enquiries: 4,  viewings: 2, status: "Available" },
  { id: 7,  property: "45 High Street",                   location: "Llanelli",                type: "Retail",        size: "1,100",  asking: "£18,500 pa",    daysOnMarket: 34, enquiries: 6,  viewings: 3, status: "Available" },
  { id: 8,  property: "Unit 2 Parc Tawe",                 location: "Swansea",                 type: "Retail",        size: "2,800",  asking: "£42,000 pa",    daysOnMarket: 52, enquiries: 4,  viewings: 2, status: "Let Agreed" },
  { id: 9,  property: "112 Queen Street",                 location: "Cardiff",                 type: "Retail",        size: "600",    asking: "£28,000 pa",    daysOnMarket: 14, enquiries: 9,  viewings: 5, status: "Available" },
  { id: 10, property: "Bridgend Retail Park, Unit 8",     location: "Bridgend",                type: "Retail",        size: "4,500",  asking: "£56,000 pa",    daysOnMarket: 89, enquiries: 2,  viewings: 1, status: "Available" },
  { id: 11, property: "Pontardawe High Street",           location: "Pontardawe",              type: "Retail",        size: "780",    asking: "£11,000 pa",    daysOnMarket: 23, enquiries: 5,  viewings: 3, status: "Under Offer" },
  { id: 12, property: "Unit 12, Baglan Energy Park",      location: "Port Talbot",             type: "Industrial",    size: "8,500",  asking: "£42,500 pa",    daysOnMarket: 31, enquiries: 7,  viewings: 4, status: "Available" },
  { id: 13, property: "Cross Hands Industrial Estate",    location: "Cross Hands",             type: "Industrial",    size: "14,200", asking: "£71,000 pa",    daysOnMarket: 18, enquiries: 12, viewings: 6, status: "Available" },
  { id: 14, property: "Cwmdu Industrial Estate",          location: "Swansea",                 type: "Industrial",    size: "5,800",  asking: "£29,000 pa",    daysOnMarket: 44, enquiries: 4,  viewings: 2, status: "Available" },
  { id: 15, property: "Milland Road",                     location: "Neath",                   type: "Industrial",    size: "22,000", asking: "£1,200,000 fh", daysOnMarket: 61, enquiries: 3,  viewings: 2, status: "Stc" },
  { id: 16, property: "Treforest Industrial Estate",      location: "Treforest",               type: "Industrial",    size: "11,400", asking: "£57,000 pa",    daysOnMarket: 9,  enquiries: 6,  viewings: 3, status: "Available" },
  { id: 17, property: "Swansea Vale Business Park",       location: "Swansea",                 type: "Industrial",    size: "6,200",  asking: "£31,000 pa",    daysOnMarket: 76, enquiries: 2,  viewings: 1, status: "Available" },
  { id: 18, property: "Bridgend Trade Park, Unit 4",      location: "Bridgend",                type: "Trade Counter", size: "3,100",  asking: "£24,000 pa",    daysOnMarket: 27, enquiries: 8,  viewings: 4, status: "Available" },
  { id: 19, property: "Fabian Way Trade Centre",          location: "Swansea",                 type: "Trade Counter", size: "4,800",  asking: "£36,000 pa",    daysOnMarket: 15, enquiries: 10, viewings: 5, status: "Available" },
  { id: 20, property: "Newport Trade Park",               location: "Newport",                 type: "Trade Counter", size: "2,600",  asking: "£21,000 pa",    daysOnMarket: 38, enquiries: 5,  viewings: 2, status: "Let Agreed" },
  { id: 21, property: "Kingsway (Ground Floor)",          location: "Swansea",                 type: "Leisure",       size: "2,200",  asking: "£38,000 pa",    daysOnMarket: 55, enquiries: 3,  viewings: 2, status: "Available" },
  { id: 22, property: "Wind Street Units",                location: "Swansea",                 type: "Leisure",       size: "1,650",  asking: "£32,500 pa",    daysOnMarket: 42, enquiries: 6,  viewings: 3, status: "Under Offer" },
  { id: 23, property: "Cardiff Bay, Mermaid Quay",        location: "Cardiff",                 type: "Leisure",       size: "3,400",  asking: "£67,000 pa",    daysOnMarket: 17, enquiries: 9,  viewings: 5, status: "Available" },
]

const tabs: TabType[] = ["All", "Office", "Retail", "Industrial", "Trade Counter", "Leisure"]

function daysOnMarketClass(days: number): string {
  if (days < 30) return "text-emerald-700 font-semibold"
  if (days <= 60) return "text-amber-700 font-semibold"
  return "text-red-700 font-semibold"
}

function daysOnMarketBg(days: number): string {
  if (days < 30) return "bg-emerald-50"
  if (days <= 60) return "bg-amber-50"
  return "bg-red-50"
}

function StatusBadge({ status }: { status: StatusType }) {
  switch (status) {
    case "Available":
      return <span className="inline-flex items-center rounded-md border border-blue-300 px-2 py-0.5 text-xs font-medium text-blue-700 bg-white">Available</span>
    case "Under Offer":
      return <span className="inline-flex items-center rounded-md border border-amber-400 px-2 py-0.5 text-xs font-medium text-amber-800 bg-amber-100">Under Offer</span>
    case "Let Agreed":
      return <span className="inline-flex items-center rounded-md border border-emerald-500 px-2 py-0.5 text-xs font-medium text-emerald-800 bg-emerald-100">Let Agreed</span>
    case "Stc":
      return <span className="inline-flex items-center rounded-md border border-purple-400 px-2 py-0.5 text-xs font-medium text-purple-800 bg-purple-100">STC</span>
  }
}

function TypePill({ type }: { type: PropertyType }) {
  const map: Record<PropertyType, string> = {
    Office: "bg-slate-100 text-slate-600",
    Retail: "bg-sky-100 text-sky-700",
    Industrial: "bg-orange-100 text-orange-700",
    "Trade Counter": "bg-teal-100 text-teal-700",
    Leisure: "bg-pink-100 text-pink-700",
  }
  return (
    <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${map[type]}`}>
      {type}
    </span>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  trend?: "up" | "down" | "neutral"
}

function StatCard({ label, value, sub, icon, trend }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</span>
        <span className="text-gray-300">{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold tracking-tight text-gray-900 leading-none">{value}</span>
        {sub && <span className="text-sm text-gray-400 mb-0.5">{sub}</span>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          {trend === "up" && <TrendingUp size={12} className="text-emerald-500" />}
          {trend === "down" && <TrendingDown size={12} className="text-red-500" />}
          <span>vs last month</span>
        </div>
      )}
    </div>
  )
}

export default function PropertyStockPage() {
  const [activeTab, setActiveTab] = useState<TabType>("All")
  const router = useRouter()

  const filtered = activeTab === "All" ? listings : listings.filter((l) => l.type === activeTab)

  const tabCounts: Record<TabType, number> = {
    All: listings.length,
    Office: listings.filter((l) => l.type === "Office").length,
    Retail: listings.filter((l) => l.type === "Retail").length,
    Industrial: listings.filter((l) => l.type === "Industrial").length,
    "Trade Counter": listings.filter((l) => l.type === "Trade Counter").length,
    Leisure: listings.filter((l) => l.type === "Leisure").length,
  }

  return (
    <div className="bg-gray-50 rounded-xl ring-1 ring-border">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 rounded-t-xl">
        <div className="px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                BP2 Property · South Wales
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Property Stock &amp; Enquiry Tracker
              </h1>
              <p className="text-sm text-gray-500 mt-1">All active instructions - updated March 2026</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-gray-500 font-medium">Live</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Active Listings" value={23} icon={<Building2 size={18} />} trend="up" />
          <StatCard label="Avg. Days on Market" value={41} sub="days" icon={<Clock size={18} />} trend="down" />
          <StatCard label="Total Enquiries (MTD)" value={87} icon={<MessageSquare size={18} />} trend="up" />
          <StatCard label="Viewings Booked (MTD)" value={34} icon={<CalendarCheck size={18} />} trend="up" />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Tab bar */}
          <div className="border-b border-gray-200 px-4 pt-4">
            <div className="flex items-center gap-0.5 overflow-x-auto pb-px">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={[
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap",
                    activeTab === tab
                      ? "border-gray-900 text-gray-900 bg-gray-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {tab}
                  <span className={[
                    "inline-flex items-center justify-center rounded-full text-[11px] font-semibold min-w-[18px] h-[18px] px-1",
                    activeTab === tab ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500",
                  ].join(" ")}>
                    {tabCounts[tab]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap w-[320px]">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">Size (sqft)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">Asking Price / Rent</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">Days on Market</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">Enquiries</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">Viewings</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((listing) => (
                  <tr
                    key={listing.id}
                    className="group hover:bg-blue-50/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/bp2-demo/property-stock/${listing.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-900 leading-snug group-hover:underline group-hover:text-[#2A4580]">{listing.property}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{listing.location}</div>
                    </td>
                    <td className="px-4 py-3.5"><TypePill type={listing.type} /></td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-medium text-gray-700 tabular-nums">{listing.size}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-semibold text-gray-900 tabular-nums">{listing.asking}</span>
                    </td>
                    <td className={`px-4 py-3.5 text-right ${daysOnMarketBg(listing.daysOnMarket)}`}>
                      <span className={`tabular-nums ${daysOnMarketClass(listing.daysOnMarket)}`}>{listing.daysOnMarket}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-1.5 rounded-full bg-blue-200" style={{ width: `${Math.round((listing.enquiries / 12) * 40)}px` }}>
                          <div className="h-full rounded-full bg-blue-500" style={{ width: "100%" }} />
                        </div>
                        <span className="font-medium text-gray-700 tabular-nums w-4 text-right">{listing.enquiries}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-medium text-gray-700 tabular-nums">{listing.viewings}</span>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={listing.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Showing <span className="font-medium text-gray-600">{filtered.length}</span> of{" "}
              <span className="font-medium text-gray-600">{listings.length}</span> listings
            </span>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-300" />&lt; 30 days
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-300" />30–60 days
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-300" />60+ days
              </span>
            </div>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">By Status</p>
            <div className="space-y-2">
              {(["Available", "Under Offer", "Let Agreed", "Stc"] as StatusType[]).map((s) => {
                const count = listings.filter((l) => l.status === s).length
                const pct = Math.round((count / listings.length) * 100)
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2">
                      <div className="w-20 shrink-0"><StatusBadge status={s} /></div>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={["h-full rounded-full", s === "Available" ? "bg-blue-400" : s === "Under Offer" ? "bg-amber-400" : s === "Let Agreed" ? "bg-emerald-500" : "bg-purple-500"].join(" ")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-4 text-right tabular-nums">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">By Type</p>
            <div className="space-y-2">
              {(["Office", "Retail", "Industrial", "Trade Counter", "Leisure"] as PropertyType[]).map((t) => {
                const count = listings.filter((l) => l.type === t).length
                const pct = Math.round((count / listings.length) * 100)
                return (
                  <div key={t} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-24 shrink-0">{t}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-slate-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-4 text-right tabular-nums">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Days on Market</p>
            <div className="space-y-2">
              {[
                { label: "Fresh (< 30 days)", count: listings.filter((l) => l.daysOnMarket < 30).length, color: "bg-emerald-500" },
                { label: "Aging (30–60 days)", count: listings.filter((l) => l.daysOnMarket >= 30 && l.daysOnMarket <= 60).length, color: "bg-amber-400" },
                { label: "Stale (60+ days)", count: listings.filter((l) => l.daysOnMarket > 60).length, color: "bg-red-500" },
              ].map((row) => {
                const pct = Math.round((row.count / listings.length) * 100)
                return (
                  <div key={row.label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-32 shrink-0">{row.label}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-4 text-right tabular-nums">{row.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
