"use client"

import { useState } from "react"
import {
  ChevronRight,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Check,
  Eye,
  Trash2,
  RefreshCw,
  CreditCard,
  Activity,
  MapPin,
  UserCheck,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Banknote,
  History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────

type CheckInStatus = "CHECKED_IN" | "NOT_ARRIVED"
type MembershipTier = "Premium" | "Basic" | null

interface Participant {
  id: string
  num: number
  name: string
  initials: string
  avatarColor: string
  payment: string
  paymentType: "cash" | "membership"
  checkInStatus: CheckInStatus
  checkInTime: string | null
  late?: boolean
  membership: MembershipTier
}

interface WaitlistEntry {
  id: string
  name: string
  initials: string
  avatarColor: string
  waitlistedDate: string
  note: string
}

// ─── Mock Data ──────────────────────────────────────────────────────

const INITIAL_PARTICIPANTS: Participant[] = [
  { id: "p1",  num: 1,  name: "Emma Patel",    initials: "EP", avatarColor: "bg-violet-500",  payment: "£15",              paymentType: "cash",       checkInStatus: "CHECKED_IN",  checkInTime: "08:52", membership: "Premium" },
  { id: "p2",  num: 2,  name: "James Liu",     initials: "JL", avatarColor: "bg-blue-500",    payment: "£15",              paymentType: "cash",       checkInStatus: "CHECKED_IN",  checkInTime: "08:58", membership: null },
  { id: "p3",  num: 3,  name: "Sophie Wright", initials: "SW", avatarColor: "bg-rose-500",    payment: "£15",              paymentType: "cash",       checkInStatus: "CHECKED_IN",  checkInTime: "09:01", membership: null },
  { id: "p4",  num: 4,  name: "Marcus Brown",  initials: "MB", avatarColor: "bg-amber-600",   payment: "£15",              paymentType: "cash",       checkInStatus: "NOT_ARRIVED", checkInTime: null,    membership: null, late: true },
  { id: "p5",  num: 5,  name: "Aisha Johnson", initials: "AJ", avatarColor: "bg-pink-500",    payment: "£15",              paymentType: "cash",       checkInStatus: "CHECKED_IN",  checkInTime: "08:55", membership: "Premium" },
  { id: "p6",  num: 6,  name: "Tom Harvey",    initials: "TH", avatarColor: "bg-teal-600",    payment: "£15",              paymentType: "cash",       checkInStatus: "CHECKED_IN",  checkInTime: "08:50", membership: null },
  { id: "p7",  num: 7,  name: "Lily Chen",     initials: "LC", avatarColor: "bg-indigo-500",  payment: "membership credit", paymentType: "membership", checkInStatus: "CHECKED_IN",  checkInTime: "08:48", membership: "Basic" },
  { id: "p8",  num: 8,  name: "David Park",    initials: "DP", avatarColor: "bg-slate-500",   payment: "£15",              paymentType: "cash",       checkInStatus: "NOT_ARRIVED", checkInTime: null,    membership: null },
  { id: "p9",  num: 9,  name: "Rachel Green",  initials: "RG", avatarColor: "bg-emerald-600", payment: "£15",              paymentType: "cash",       checkInStatus: "CHECKED_IN",  checkInTime: "09:00", membership: null },
  { id: "p10", num: 10, name: "Olivia Stone",  initials: "OS", avatarColor: "bg-orange-500",  payment: "membership credit", paymentType: "membership", checkInStatus: "NOT_ARRIVED", checkInTime: null,    membership: "Basic" },
]

const WAITLIST: WaitlistEntry[] = [
  { id: "w1", name: "Karen Mills", initials: "KM", avatarColor: "bg-purple-500", waitlistedDate: "10 Apr", note: "Notify when space opens" },
  { id: "w2", name: "Ben Foster",  initials: "BF", avatarColor: "bg-sky-600",    waitlistedDate: "11 Apr", note: "" },
]

// ─── Sub-components ──────────────────────────────────────────────────

function CheckInBadge({ status, time }: { status: CheckInStatus; time: string | null }) {
  if (status === "CHECKED_IN") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          <Check className="h-3 w-3" />
          Checked In
        </span>
        {time && (
          <span className="text-xs text-zinc-400 tabular-nums">{time}</span>
        )}
      </div>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <Clock className="h-3 w-3" />
      Not Arrived
    </span>
  )
}

function MembershipBadge({ tier }: { tier: MembershipTier }) {
  if (tier === "Premium") {
    return (
      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
        Premium
      </span>
    )
  }
  if (tier === "Basic") {
    return (
      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
        Basic
      </span>
    )
  }
  return <span className="text-xs text-zinc-300">—</span>
}

function PaymentCell({ payment, type }: { payment: string; type: "cash" | "membership" }) {
  if (type === "membership") {
    return (
      <div className="flex items-center gap-1.5">
        <CreditCard className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
        <span className="text-xs text-zinc-500">Membership credit</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <Banknote className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
      <span className="text-sm font-medium text-zinc-900 tabular-nums">{payment}</span>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  progress,
  progressColor,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent: string
  progress?: { value: number; max: number }
  progressColor?: string
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
          {progress && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", progressColor ?? "bg-zinc-900")}
                  style={{ width: `${Math.min((progress.value / progress.max) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className={cn("p-2 rounded-lg", accent)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────

type ActiveTab = "participants" | "waitlist" | "history"

export default function ClassParticipantsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("participants")
  const [waitlistOpen, setWaitlistOpen] = useState(true)
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(
    new Set(INITIAL_PARTICIPANTS.filter((p) => p.checkInStatus === "CHECKED_IN").map((p) => p.id))
  )

  const capacity = 12
  const booked = INITIAL_PARTICIPANTS.length
  const checkedIn = checkedInIds.size
  const notArrived = booked - checkedIn
  const openSpots = capacity - booked

  function getStatus(p: Participant): CheckInStatus {
    return checkedInIds.has(p.id) ? "CHECKED_IN" : "NOT_ARRIVED"
  }

  function handleCheckIn(id: string) {
    setCheckedInIds((prev) => new Set([...prev, id]))
  }

  function handleUndoCheckIn(id: string) {
    setCheckedInIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function handleCheckInAll() {
    setCheckedInIds(new Set(INITIAL_PARTICIPANTS.map((p) => p.id)))
  }

  const cashCount = INITIAL_PARTICIPANTS.filter((p) => p.paymentType === "cash").length
  const creditCount = INITIAL_PARTICIPANTS.filter((p) => p.paymentType === "membership").length

  const tabs: { key: ActiveTab; label: string; count?: number }[] = [
    { key: "participants", label: "Participants", count: booked },
    { key: "waitlist", label: "Waitlist", count: WAITLIST.length },
    { key: "history", label: "History" },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-zinc-500">
        <span className="hover:text-zinc-900 cursor-pointer transition-colors">Admin</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="hover:text-zinc-900 cursor-pointer transition-colors">Jobs</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="hover:text-zinc-900 cursor-pointer transition-colors">Monday Morning Yoga</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-zinc-900 font-medium">Participants</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Monday Morning Yoga
            </h1>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              09:00 · Mon 14 Apr 2026
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-sm text-zinc-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="bg-teal-600 text-white text-[9px] font-bold">MT</AvatarFallback>
              </Avatar>
              Mike Torres
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Studio B
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {booked}/{capacity} booked
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleCheckInAll} className="text-xs">
            <UserCheck className="h-3.5 w-3.5 mr-1.5" />
            Check In All
          </Button>
          <Button size="sm" className="bg-zinc-900 hover:bg-zinc-700 text-white text-xs">
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Add Walk-in
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold text-emerald-800">Class in progress</span>
          <span className="text-sm text-emerald-600">·</span>
          <span className="text-sm text-emerald-700">
            <span className="font-semibold">{checkedIn}/{booked}</span> checked in
          </span>
          <span className="text-sm text-emerald-600">·</span>
          <span className="text-sm text-emerald-700">
            <span className="font-semibold">{openSpots}</span> spots open
          </span>
          <span className="text-sm text-emerald-600">·</span>
          <span className="text-sm text-emerald-700">1h 00m elapsed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-32 rounded-full bg-emerald-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.round((checkedIn / booked) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-emerald-700 font-medium tabular-nums">
            {Math.round((checkedIn / booked) * 100)}%
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Booked"
          value={`${booked}/${capacity}`}
          sub={`${capacity - booked} spots open`}
          icon={Users}
          accent="bg-zinc-100 text-zinc-600"
          progress={{ value: booked, max: capacity }}
          progressColor="bg-zinc-900"
        />
        <StatCard
          label="Checked In"
          value={String(checkedIn)}
          sub={`${Math.round((checkedIn / booked) * 100)}% of booked`}
          icon={CheckCircle2}
          accent="bg-emerald-50 text-emerald-600"
          progress={{ value: checkedIn, max: booked }}
          progressColor="bg-emerald-500"
        />
        <StatCard
          label="Not Arrived"
          value={String(notArrived)}
          sub="Still expected"
          icon={Clock}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Revenue"
          value={`£${cashCount * 15}`}
          sub={`+ ${creditCount} membership credit${creditCount !== 1 ? "s" : ""}`}
          icon={Activity}
          accent="bg-blue-50 text-blue-600"
        />
      </div>

      {/* Tab Bar */}
      <div className="border-b border-zinc-200">
        <div className="flex items-center gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                    activeTab === tab.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Participants Tab */}
      {activeTab === "participants" && (
        <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 border-b border-zinc-200">
                <TableHead className="w-10 text-xs font-semibold text-zinc-500 uppercase tracking-wide pl-5">#</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Customer</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Booking</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Payment</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Check-in</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Membership</TableHead>
                <TableHead className="w-[170px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {INITIAL_PARTICIPANTS.map((p) => {
                const currentStatus = getStatus(p)
                return (
                  <TableRow key={p.id} className="group hover:bg-zinc-50 transition-colors">
                    <TableCell className="pl-5 text-sm text-zinc-400 tabular-nums font-medium">
                      {p.num}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={cn(p.avatarColor, "text-white text-xs font-semibold")}>
                            {p.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-zinc-900">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Confirmed
                      </span>
                    </TableCell>
                    <TableCell>
                      <PaymentCell payment={p.payment} type={p.paymentType} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CheckInBadge status={currentStatus} time={p.checkInTime} />
                        {p.late && currentStatus === "NOT_ARRIVED" && (
                          <span className="text-[10px] font-medium text-rose-500 bg-rose-50 border border-rose-200 rounded-full px-1.5 py-0.5">
                            Late
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <MembershipBadge tier={p.membership} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2 pr-2">
                        {currentStatus === "NOT_ARRIVED" ? (
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4"
                            onClick={() => handleCheckIn(p.id)}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Check In
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Done
                          </span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4" />
                              View Customer
                            </DropdownMenuItem>
                            {currentStatus === "CHECKED_IN" && (
                              <DropdownMenuItem onClick={() => handleUndoCheckIn(p.id)}>
                                <RefreshCw className="h-4 w-4" />
                                Undo Check-in
                              </DropdownMenuItem>
                            )}
                            {currentStatus === "NOT_ARRIVED" && (
                              <DropdownMenuItem onClick={() => handleCheckIn(p.id)}>
                                <Check className="h-4 w-4" />
                                Check In
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <CreditCard className="h-4 w-4" />
                              Refund
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-rose-600 focus:text-rose-600">
                              <Trash2 className="h-4 w-4" />
                              Remove from Class
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Waitlist Tab */}
      {activeTab === "waitlist" && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
            onClick={() => setWaitlistOpen((v) => !v)}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-zinc-900">Waitlist</span>
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                {WAITLIST.length} waiting
              </span>
            </div>
            {waitlistOpen ? (
              <ChevronUp className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            )}
          </button>

          {waitlistOpen && (
            <>
              <Separator />
              <div className="divide-y divide-zinc-100">
                {WAITLIST.map((w, i) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-4 px-5 py-4 group hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center justify-center h-7 w-7 rounded-full border-2 border-amber-300 bg-amber-50 text-xs font-bold text-amber-700 shrink-0">
                      {i + 1}
                    </div>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={cn(w.avatarColor, "text-white text-xs font-semibold")}>
                        {w.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{w.name}</p>
                      <p className="text-xs text-zinc-500">
                        Waitlisted {w.waitlistedDate}
                        {w.note && <span className="ml-1.5 text-zinc-400">· {w.note}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="h-7 text-xs bg-zinc-900 hover:bg-zinc-700 text-white">
                        Promote to Booked
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-rose-600">
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
                <p className="text-xs text-amber-700">
                  <span className="font-medium">Note:</span> Promoting a waitlisted customer will send them
                  a booking confirmation and charge their saved payment method.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 flex flex-col items-center justify-center min-h-[200px]">
          <History className="h-8 w-8 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-500">Class history</p>
          <p className="text-xs text-zinc-400 mt-1">
            Attendance records, notes, and changes will appear here after the class ends.
          </p>
        </div>
      )}
    </div>
  )
}
