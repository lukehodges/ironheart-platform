import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Building2,
  Ruler,
  Clock,
  MessageSquare,
  CalendarCheck,
  Car,
  Banknote,
  Home,
  Zap,
  User,
  ChevronRight,
  Layers,
  FileText,
} from "lucide-react"
import { LISTINGS } from "../../_data/listings"
import type { ActivityType, PropertyType, StatusType } from "../../_data/listings"

// ─── Agent names ────────────────────────────────────────────────────────────
const AGENT_NAMES: Record<string, string> = {
  DB: "Daniel Brooks",
  RJ: "Rachel Jones",
  MW: "Mark Williams",
}

// ─── Status helpers ──────────────────────────────────────────────────────────
function statusHeaderClasses(status: StatusType): string {
  switch (status) {
    case "Available":
      return "bg-[#EDF2EA] border border-[#D0DECB]"
    case "Under Offer":
      return "bg-[#F2EDE8] border border-[#DED0C8]"
    case "Let Agreed":
      return "bg-[#E8F0EC] border border-[#C8D8CE]"
    case "Stc":
      return "bg-[#EDE8F2] border border-[#CEC8D8]"
  }
}

function StatusBadge({ status }: { status: StatusType }) {
  switch (status) {
    case "Available":
      return (
        <span className="inline-flex items-center rounded-lg border border-[#8CB87A] bg-[#D8EDD2] px-2.5 py-1 text-xs font-semibold text-[#2A5C1A]">
          Available
        </span>
      )
    case "Under Offer":
      return (
        <span className="inline-flex items-center rounded-lg border border-[#C8A070] bg-[#F0DEC8] px-2.5 py-1 text-xs font-semibold text-[#6A3A0A]">
          Under Offer
        </span>
      )
    case "Let Agreed":
      return (
        <span className="inline-flex items-center rounded-lg border border-[#70A888] bg-[#C8E0D2] px-2.5 py-1 text-xs font-semibold text-[#1A5C3A]">
          Let Agreed
        </span>
      )
    case "Stc":
      return (
        <span className="inline-flex items-center rounded-lg border border-[#9880B8] bg-[#E0D4F0] px-2.5 py-1 text-xs font-semibold text-[#3A1A6A]">
          STC
        </span>
      )
  }
}

// ─── Type badge ──────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: PropertyType }) {
  const map: Record<PropertyType, string> = {
    Office: "bg-[#E5EAF5] text-[#2A4580]",
    Retail: "bg-[#F5E5E8] text-[#802A38]",
    Industrial: "bg-[#F5EDE0] text-[#804020]",
    "Trade Counter": "bg-[#E5F2EE] text-[#1A5545]",
    Leisure: "bg-[#F0E5F5] text-[#6A2A80]",
  }
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${map[type]}`}>
      {type}
    </span>
  )
}

// ─── EPC badge ───────────────────────────────────────────────────────────────
function EpcBadge({ rating }: { rating: string }) {
  const map: Record<string, string> = {
    A: "bg-emerald-50 text-emerald-700 border-emerald-300",
    B: "bg-green-50 text-green-700 border-green-300",
    C: "bg-lime-50 text-lime-700 border-lime-300",
    D: "bg-amber-50 text-amber-700 border-amber-300",
    E: "bg-orange-50 text-orange-700 border-orange-300",
    F: "bg-red-50 text-red-600 border-red-300",
    G: "bg-red-100 text-red-900 border-red-400",
  }
  const cls = map[rating] ?? "bg-gray-50 text-gray-600 border-gray-300"
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-bold ${cls}`}>
      <Zap size={10} /> {rating}
    </span>
  )
}

// ─── Days on market colour ───────────────────────────────────────────────────
function daysClass(days: number): string {
  if (days < 30) return "text-emerald-700 font-bold"
  if (days <= 60) return "text-amber-700 font-bold"
  return "text-red-700 font-bold"
}

// ─── Activity timeline ────────────────────────────────────────────────────────
const activityDot: Record<ActivityType, string> = {
  enquiry: "bg-[#90B5D0]",
  viewing: "bg-[#85B898]",
  offer: "bg-[#D4A860]",
  status_change: "bg-[#B8A0CC]",
  marketing: "bg-[#A8BCCC]",
  note: "bg-[#BEB5A5]",
}

const activityLabel: Record<ActivityType, string> = {
  enquiry: "Enquiry",
  viewing: "Viewing",
  offer: "Offer",
  status_change: "Status Change",
  marketing: "Marketing",
  note: "Note",
}

const activityLabelClass: Record<ActivityType, string> = {
  enquiry: "bg-[#E0EEF8] text-[#2A5A78]",
  viewing: "bg-[#D8EEE2] text-[#1A5832]",
  offer: "bg-[#F5E8CE] text-[#6A3A00]",
  status_change: "bg-[#EDE0F8] text-[#4A1A7A]",
  marketing: "bg-[#DDE8F0] text-[#1A3A5A]",
  note: "bg-[#EEE8DC] text-[#4A3A2A]",
}

// ─── Agent avatar ─────────────────────────────────────────────────────────────
function AgentAvatar({ initials, size = "sm" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const sizeMap = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[#2A4580] text-white font-semibold shrink-0 ${sizeMap[size]}`}
    >
      {initials}
    </span>
  )
}

// ─── Detail row ────────────────────────────────────────────────────────────────
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F0EBE3] last:border-0">
      <span className="text-[#9A9088] mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9A9088] mb-0.5">{label}</p>
        <div className="text-sm font-medium text-[#2C2724]">{value}</div>
      </div>
    </div>
  )
}

// ─── Stat strip card ──────────────────────────────────────────────────────────
function StatCard({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-white border border-[#E8E3DC] rounded-xl p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center gap-2 text-[#9A9088]">
        {icon}
        <span className="text-[9px] font-semibold uppercase tracking-widest text-[#9A9088]">{label}</span>
      </div>
      <p className={`text-xl font-bold leading-none text-[#2C2724] ${valueClass ?? ""}`}>{value}</p>
    </div>
  )
}

// ─── Deal label from ID ────────────────────────────────────────────────────────
function dealLabel(dealId: string): string {
  const labels: Record<string, string> = {
    u1: "Wind Street - Under Offer",
    u2: "Baglan Energy Park - Active Instruction",
    u4: "Meridian Point - Under Offer",
    c2: "Parc Tawe - Let Agreed",
    e2: "Milland Road - STC (Freehold Sale)",
  }
  return labels[dealId] ?? `Deal ${dealId}`
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = LISTINGS.find((l) => l.id === parseInt(id, 10)) ?? null

  if (!listing) {
    return (
      <div className="bg-[#F8F6F2] min-h-screen px-6 py-12">
        <div className="max-w-2xl mx-auto bg-white border border-[#E8E3DC] rounded-xl shadow-sm p-10 text-center">
          <Building2 size={40} className="mx-auto text-[#C8C0B8] mb-4" />
          <h1 className="text-xl font-semibold text-[#2C2724] mb-2">Property not found</h1>
          <p className="text-[#8A8078] mb-6">No listing exists with that ID.</p>
          <Link
            href="/admin/bp2-demo/property-stock"
            className="inline-flex items-center gap-2 rounded-lg bg-[#2C2724] text-white px-4 py-2 text-sm font-medium hover:bg-[#1A1614] transition-colors"
          >
            <ArrowLeft size={14} /> Back to Property Stock
          </Link>
        </div>
      </div>
    )
  }

  const sortedActivity = [...listing.activity].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="bg-[#F8F6F2] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Back nav + breadcrumb ── */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/bp2-demo/property-stock"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8A8078] hover:text-[#2C2724] transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Property Stock
          </Link>
          <nav className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#9A9088]">
            <span>Admin</span>
            <ChevronRight size={10} />
            <span>BP2 Demo</span>
            <ChevronRight size={10} />
            <Link href="/admin/bp2-demo/property-stock" className="hover:text-[#2C2724] transition-colors">
              Property Stock
            </Link>
            <ChevronRight size={10} />
            <span className="text-[#2C2724]">{listing.property}</span>
          </nav>
        </div>

        {/* ── Header card ── */}
        <div className={`rounded-xl p-6 shadow-sm ${statusHeaderClasses(listing.status)}`}>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9A9088] mb-3">
            BP2 Property · Property Stock
          </p>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-[#2C2724] leading-tight">{listing.property}</h1>
              <div className="flex items-center gap-1.5 text-sm text-[#8A8078]">
                <MapPin size={13} />
                <span>{listing.fullAddress}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={listing.status} />
              <TypeBadge type={listing.type} />
              <div className="flex items-center gap-1.5 rounded-lg bg-white/70 border border-white/80 px-2.5 py-1">
                <AgentAvatar initials={listing.agentInitials} size="sm" />
                <span className="text-xs font-medium text-[#2C2724]">{AGENT_NAMES[listing.agentInitials]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stat strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            icon={<Ruler size={14} />}
            label="Floor Area"
            value={`${listing.size} sqft`}
          />
          <StatCard
            icon={<Banknote size={14} />}
            label="Asking Rent"
            value={listing.asking}
          />
          <StatCard
            icon={<Clock size={14} />}
            label="Days on Market"
            value={String(listing.daysOnMarket)}
            valueClass={daysClass(listing.daysOnMarket)}
          />
          <StatCard
            icon={<MessageSquare size={14} />}
            label="Enquiries"
            value={String(listing.enquiries)}
          />
          <StatCard
            icon={<CalendarCheck size={14} />}
            label="Viewings"
            value={String(listing.viewings)}
          />
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* ─── LEFT COLUMN ─── */}
          <div className="lg:col-span-2 space-y-4">

            {/* About */}
            <div className="bg-white border border-[#E8E3DC] rounded-xl shadow-sm p-6">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9A9088] mb-3">
                About This Property
              </p>
              <p className="text-sm text-[#4A4440] leading-relaxed">{listing.description}</p>
            </div>

            {/* Property details */}
            <div className="bg-white border border-[#E8E3DC] rounded-xl shadow-sm p-6">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9A9088] mb-1">
                Property Details
              </p>
              <div className="divide-y divide-[#F0EBE3]">
                <DetailRow
                  icon={<Home size={14} />}
                  label="Full Address"
                  value={listing.fullAddress}
                />
                <DetailRow
                  icon={<FileText size={14} />}
                  label="Tenure"
                  value={listing.tenure}
                />
                <DetailRow
                  icon={<Zap size={14} />}
                  label="EPC Rating"
                  value={<EpcBadge rating={listing.epc} />}
                />
                <DetailRow
                  icon={<CalendarCheck size={14} />}
                  label="Available From"
                  value={listing.availableFrom}
                />
                {listing.floorLevel && (
                  <DetailRow
                    icon={<Layers size={14} />}
                    label="Floor Level"
                    value={listing.floorLevel}
                  />
                )}
                <DetailRow
                  icon={<Car size={14} />}
                  label="Parking Spaces"
                  value={
                    listing.parkingSpaces === 0
                      ? "None (on-street)"
                      : `${listing.parkingSpaces} spaces`
                  }
                />
                {listing.rateable && (
                  <DetailRow
                    icon={<Banknote size={14} />}
                    label="Rateable Value"
                    value={listing.rateable}
                  />
                )}
              </div>
            </div>

            {/* Key contacts */}
            <div className="bg-white border border-[#E8E3DC] rounded-xl shadow-sm p-6">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9A9088] mb-4">
                Key Contacts
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#F0EBE3] border border-[#E0D8CE] flex items-center justify-center shrink-0">
                    <Building2 size={14} className="text-[#8A8078]" />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9A9088] mb-0.5">
                      Landlord / Vendor
                    </p>
                    <p className="text-sm font-semibold text-[#2C2724]">{listing.landlordName}</p>
                    <p className="text-xs text-[#8A8078] mt-0.5">{listing.landlordContact}</p>
                  </div>
                </div>
                <div className="h-px bg-[#F0EBE3]" />
                <div className="flex items-start gap-3">
                  <AgentAvatar initials={listing.agentInitials} size="md" />
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9A9088] mb-0.5">
                      Instruction Agent
                    </p>
                    <p className="text-sm font-semibold text-[#2C2724]">{AGENT_NAMES[listing.agentInitials]}</p>
                    <p className="text-xs text-[#8A8078] mt-0.5">BP2 Property · {listing.location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Linked deals */}
            {listing.dealIds && listing.dealIds.length > 0 && (
              <div className="bg-white border border-[#E8E3DC] rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9A9088]">
                    Linked Deals
                  </p>
                  <span className="text-[9px] font-medium text-[#9A9088] bg-[#F0EBE3] border border-[#E0D8CE] rounded px-1.5 py-0.5">
                    Currently tracked in the system
                  </span>
                </div>
                <p className="text-xs text-[#8A8078] mb-4">
                  This property is linked to an active deal in the pipeline.
                </p>
                <div className="space-y-2">
                  {listing.dealIds.map((dealId) => (
                    <Link
                      key={dealId}
                      href={`/admin/bp2-demo/deals-pipeline/${dealId}`}
                      className="flex items-center justify-between rounded-lg border border-[#E8E3DC] bg-[#FAF8F5] hover:bg-[#F0EBE3] px-4 py-3 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-md bg-[#2A4580] flex items-center justify-center shrink-0">
                          <FileText size={10} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#2C2724]">{dealLabel(dealId)}</p>
                          <p className="text-[10px] text-[#9A9088]">Deal ref: {dealId.toUpperCase()}</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-[#9A9088] group-hover:text-[#2C2724] transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Insight strip */}
            <div className="bg-[#EEE8DC] border border-[#DDD5C5] rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-[#2A4580] flex items-center justify-center shrink-0 mt-0.5">
                  <Layers size={13} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#4A3A2A] mb-1">Full property history, centralised</p>
                  <p className="text-xs italic text-[#6A5A4A] leading-relaxed">
                    Every enquiry, viewing, offer, status change, and linked deal for this property - in one place.
                    No more chasing email threads or reconciling spreadsheets. The complete story of this instruction,
                    from launch to conclusion.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* ─── RIGHT COLUMN - Activity timeline ─── */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-[#E8E3DC] rounded-xl shadow-sm p-5 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9A9088]">
                  Activity Log
                </p>
                <span className="inline-flex items-center justify-center rounded-full bg-[#2C2724] text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5">
                  {listing.activity.length}
                </span>
              </div>

              <div className="relative space-y-0">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#E8E3DC]" />

                {sortedActivity.map((entry, i) => (
                  <div key={i} className="relative flex gap-4 pb-5 last:pb-0">
                    {/* Dot */}
                    <div className={`relative z-10 mt-1.5 h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-white ${activityDot[entry.type]}`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] text-[#9A9088] font-medium tabular-nums">
                          {new Date(entry.date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${activityLabelClass[entry.type]}`}
                        >
                          {activityLabel[entry.type]}
                        </span>
                      </div>

                      <p className="text-xs text-[#2C2724] leading-snug">{entry.text}</p>

                      {entry.detail && (
                        <div className="mt-1.5 pl-2 border-l-2 border-[#E0D8CE]">
                          <p className="text-[10px] text-[#8A8078] italic leading-snug">{entry.detail}</p>
                        </div>
                      )}

                      {entry.agent && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <AgentAvatar initials={entry.agent} size="sm" />
                          <span className="text-[10px] text-[#9A9088]">{AGENT_NAMES[entry.agent] ?? entry.agent}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
