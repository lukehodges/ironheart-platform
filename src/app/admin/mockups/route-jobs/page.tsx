"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  Clock,
  MapPin,
  Loader2,
  Route,
  Plus,
  ArrowUpDown,
  Send,
  Timer,
  Truck,
  Wifi,
  AlertCircle,
  SkipForward,
  FlagOff,
  ZoomIn,
  ZoomOut,
  Layers,
  Navigation,
  User,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type StopStatus = "COMPLETED" | "IN_PROGRESS" | "PENDING"

interface Stop {
  num: number
  customer: string
  address: string
  eta: string
  status: StopStatus
  arrivedAt?: string
  departedAt?: string
  bins?: string
  isDepot?: boolean
}

interface TravelLeg {
  duration: string
  distance: string
}

// ─── Hardcoded data ───────────────────────────────────────────────────────────

const STOPS: Stop[] = [
  {
    num: 1,
    customer: "Acme Industrial",
    address: "14 Birch Lane, Manchester",
    eta: "07:45",
    status: "COMPLETED",
    arrivedAt: "07:43",
    departedAt: "07:52",
    bins: "3 bins",
  },
  {
    num: 2,
    customer: "RetailCo Stockport",
    address: "2 Market St, Stockport",
    eta: "08:15",
    status: "COMPLETED",
    arrivedAt: "08:18",
    departedAt: "08:29",
    bins: "5 bins",
  },
  {
    num: 3,
    customer: "TechCorp HQ",
    address: "88 Innovation Drive, Manchester",
    eta: "08:55",
    status: "IN_PROGRESS",
    arrivedAt: "08:51",
    bins: "2 bins",
  },
  {
    num: 4,
    customer: "Green Valley Farm",
    address: "Mottram Rd, Hyde",
    eta: "09:30",
    status: "PENDING",
    bins: "4 bins",
  },
  {
    num: 5,
    customer: "City Centre Office",
    address: "1 Albert Square, Manchester",
    eta: "10:10",
    status: "PENDING",
    bins: "6 bins",
  },
  {
    num: 6,
    customer: "Northgate Depot (End)",
    address: "Depot Lane, Salford",
    eta: "11:00",
    status: "PENDING",
    bins: "drop-off",
    isDepot: true,
  },
]

const TRAVEL_LEGS: TravelLeg[] = [
  { duration: "12 min", distance: "6.4 mi" },
  { duration: "18 min", distance: "8.1 mi" },
  { duration: "14 min", distance: "7.2 mi" },
  { duration: "22 min", distance: "9.6 mi" },
  { duration: "16 min", distance: "6.9 mi" },
]

// SVG stop positions for Manchester / Stockport / Hyde / Salford geography
const STOP_POSITIONS = [
  { x: 215, y: 130 }, // Acme Industrial — Manchester N
  { x: 240, y: 210 }, // RetailCo — Stockport
  { x: 180, y: 175 }, // TechCorp HQ — Manchester (current)
  { x: 320, y: 255 }, // Green Valley Farm — Hyde
  { x: 165, y: 150 }, // City Centre Office — Manchester centre
  { x: 120, y: 165 }, // Northgate Depot — Salford
]

const DRIVER_POS = { x: 180, y: 175 } // At Stop 3

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: StopStatus }) {
  if (status === "COMPLETED")
    return <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
  if (status === "IN_PROGRESS")
    return <Loader2 className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
  return <Clock className="h-4 w-4 text-zinc-400 flex-shrink-0" />
}

function StatusBadge({ status }: { status: StopStatus }) {
  if (status === "COMPLETED")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        Completed
      </span>
    )
  if (status === "IN_PROGRESS")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        In Progress
      </span>
    )
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-50 text-zinc-500 border border-zinc-200">
      Pending
    </span>
  )
}

function MapPanel() {
  return (
    <div className="relative rounded-xl border border-zinc-200 overflow-hidden bg-[#f0efeb]" style={{ height: 520 }}>
      {/* Subtle grid / terrain pattern */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="minor" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e0d8" strokeWidth="0.4" />
          </pattern>
          <pattern id="major" width="150" height="150" patternUnits="userSpaceOnUse">
            <rect width="150" height="150" fill="url(#minor)" />
            <path d="M 150 0 L 0 0 0 150" fill="none" stroke="#d0cec5" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#major)" />

        {/* Road network */}
        <line x1="0" y1="155" x2="520" y2="165" stroke="#e8e4d8" strokeWidth="9" />
        <line x1="0" y1="230" x2="520" y2="215" stroke="#e8e4d8" strokeWidth="7" />
        <line x1="155" y1="0" x2="165" y2="520" stroke="#e8e4d8" strokeWidth="8" />
        <line x1="280" y1="0" x2="295" y2="520" stroke="#e8e4d8" strokeWidth="6" />
        <line x1="60" y1="0" x2="380" y2="520" stroke="#ede9de" strokeWidth="10" />
        <line x1="0" y1="300" x2="520" y2="280" stroke="#e0ddd3" strokeWidth="5" />
        <line x1="80" y1="0" x2="90" y2="520" stroke="#e8e4d8" strokeWidth="6" />

        {/* Road labels (subtle) */}
        <text x="30" y="148" fontSize="8" fill="#b8b4a8" fontFamily="system-ui">A57</text>
        <text x="160" y="100" fontSize="8" fill="#b8b4a8" fontFamily="system-ui">M60</text>
        <text x="290" y="110" fontSize="8" fill="#b8b4a8" fontFamily="system-ui">A6</text>

        {/* Completed route segment — solid dark */}
        <polyline
          points={[STOP_POSITIONS[0], STOP_POSITIONS[1], STOP_POSITIONS[2]].map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#18181b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Remaining route — dashed */}
        <polyline
          points={[STOP_POSITIONS[2], STOP_POSITIONS[3], STOP_POSITIONS[4], STOP_POSITIONS[5]].map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#71717a"
          strokeWidth="2.5"
          strokeDasharray="7,5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Stop markers */}
        {STOPS.map((stop, i) => {
          const pos = STOP_POSITIONS[i]
          const isCurrent = stop.status === "IN_PROGRESS"
          const isCompleted = stop.status === "COMPLETED"
          const isDepot = stop.isDepot

          return (
            <g key={stop.num}>
              {isCurrent && (
                <circle cx={pos.x} cy={pos.y} r="18" fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.35">
                  <animate attributeName="r" values="14;22;14" dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2.2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="13"
                fill={isCompleted ? "#18181b" : isCurrent ? "#3b82f6" : isDepot ? "#6b7280" : "white"}
                stroke={isCompleted ? "#18181b" : isCurrent ? "#3b82f6" : "#a1a1aa"}
                strokeWidth="2"
              />
              <text
                x={pos.x}
                y={pos.y + 4.5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill={isCompleted || isCurrent || isDepot ? "white" : "#52525b"}
                fontFamily="system-ui, sans-serif"
              >
                {stop.num}
              </text>

              {/* Stop label */}
              <text
                x={pos.x + 17}
                y={pos.y - 5}
                fontSize="9"
                fontWeight="600"
                fill="#3f3f46"
                fontFamily="system-ui, sans-serif"
              >
                {stop.customer.length > 14 ? stop.customer.slice(0, 14) + "…" : stop.customer}
              </text>
              <text
                x={pos.x + 17}
                y={pos.y + 7}
                fontSize="8"
                fill="#71717a"
                fontFamily="system-ui, sans-serif"
              >
                ETA {stop.eta}
              </text>
            </g>
          )
        })}

        {/* Driver position — blue dot */}
        <circle cx={DRIVER_POS.x} cy={DRIVER_POS.y} r="7" fill="#2563eb" stroke="white" strokeWidth="2.5" />
        <circle cx={DRIVER_POS.x} cy={DRIVER_POS.y} r="13" fill="none" stroke="#2563eb" strokeWidth="1.5" opacity="0.5" />
      </svg>

      {/* Route optimised badge — top */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Route optimised — 47 min total drive time · 38.2 miles
        </div>
      </div>

      {/* Floating vehicle card */}
      <div className="absolute bottom-14 left-3 rounded-lg bg-white border border-zinc-200 shadow-md px-3 py-2 max-w-[200px]">
        <p className="text-xs font-semibold text-zinc-900">Van 1 — Mike Torres</p>
        <p className="text-xs text-zinc-500 mt-0.5">En route to Stop 3 · ETA 08:55</p>
        <div className="flex items-center gap-1 mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs text-blue-600 font-medium">Live tracking</span>
        </div>
      </div>

      {/* Map controls — top right */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-white shadow-sm">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-white shadow-sm">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-white shadow-sm">
          <Layers className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Map controls — action buttons bottom right */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-white/95 shadow-sm text-xs">
          <Route className="h-3.5 w-3.5" />
          Optimise Route
        </Button>
        <Button size="sm" className="h-8 gap-1.5 bg-zinc-900 hover:bg-zinc-700 text-white text-xs">
          <Send className="h-3.5 w-3.5" />
          Dispatch
        </Button>
      </div>

      {/* Watermark */}
      <div className="absolute bottom-3 left-3 text-[10px] text-zinc-400 font-medium">
        Mapbox · © OpenStreetMap
      </div>
    </div>
  )
}

function TravelConnector({ leg }: { leg: TravelLeg }) {
  return (
    <div className="flex items-center gap-2 py-1 pl-4">
      <div className="w-px h-5 bg-zinc-200 ml-3" />
      <div className="flex items-center gap-1.5 rounded-full bg-zinc-50 border border-zinc-100 px-2.5 py-0.5">
        <Navigation className="h-2.5 w-2.5 text-zinc-400" />
        <span className="text-xs text-zinc-500 font-medium">{leg.duration} · {leg.distance}</span>
      </div>
    </div>
  )
}

function StopRow({ stop, travelLeg }: { stop: Stop; travelLeg?: TravelLeg }) {
  const isCompleted = stop.status === "COMPLETED"
  const isCurrent = stop.status === "IN_PROGRESS"

  return (
    <>
      <div
        className={cn(
          "rounded-lg border p-3 transition-colors",
          isCurrent
            ? "border-blue-200 bg-blue-50/50 ring-1 ring-blue-100"
            : isCompleted
            ? "border-zinc-100 bg-zinc-50/30"
            : stop.isDepot
            ? "border-dashed border-zinc-200 bg-white"
            : "border-zinc-200 bg-white",
        )}
      >
        <div className="flex items-start gap-3">
          {/* Stop number */}
          <div
            className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
              isCompleted
                ? "bg-zinc-900 text-white"
                : isCurrent
                ? "bg-blue-600 text-white"
                : stop.isDepot
                ? "bg-zinc-400 text-white"
                : "bg-white text-zinc-600 border border-zinc-300",
            )}
          >
            {stop.num}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 truncate">{stop.customer}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-zinc-400 flex-shrink-0" />
                  <span className="text-xs text-zinc-500 truncate">{stop.address}</span>
                </div>
              </div>
              <StatusIcon status={stop.status} />
            </div>

            <div className="flex items-center justify-between mt-1.5 gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-zinc-400" />
                  <span className="text-xs text-zinc-500">ETA {stop.eta}</span>
                </div>
                {stop.bins && (
                  <span className="text-xs text-zinc-400">· {stop.bins}</span>
                )}
              </div>
              <StatusBadge status={stop.status} />
            </div>

            {/* Timing detail */}
            {isCompleted && stop.arrivedAt && stop.departedAt && (
              <p className="mt-1 text-xs text-zinc-400">
                Arrived {stop.arrivedAt} · Departed {stop.departedAt}
              </p>
            )}
            {isCurrent && stop.arrivedAt && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                <Timer className="h-3 w-3" />
                <span>Arrived {stop.arrivedAt} · on site 9 min</span>
                <span className="inline-flex items-center gap-1 ml-1 rounded-full bg-blue-100 px-2 py-0.5 font-bold tabular-nums">
                  00:09:14
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {travelLeg && <TravelConnector leg={travelLeg} />}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RouteJobsPage() {
  const [_activePanel, setActivePanel] = useState<"map" | "actions">("map")

  const completedCount = STOPS.filter((s) => s.status === "COMPLETED").length

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Truck className="h-5 w-5 text-zinc-500" />
            <h1 className="text-xl font-semibold text-zinc-900">North Zone Waste Collection</h1>
            <span className="text-zinc-400 text-sm font-normal">#RJ-0042</span>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">Route job · Started 07:30 · Dispatcher view</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            IN PROGRESS
          </span>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
            <AlertCircle className="h-3.5 w-3.5" />
            Alert Driver
          </Button>
        </div>
      </div>

      {/* ── KPI summary bar ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-1">
          <p className="text-xs text-zinc-500 font-medium">Stops Complete</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-zinc-900 tabular-nums">{completedCount}/{STOPS.length}</span>
            <div className="mb-0.5 flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all"
                style={{ width: `${(completedCount / STOPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-1">
          <p className="text-xs text-zinc-500 font-medium">Drive Time</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-zinc-900">47</span>
            <span className="text-sm text-zinc-500">min est.</span>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-1">
          <p className="text-xs text-zinc-500 font-medium">Total Distance</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-zinc-900">38.2</span>
            <span className="text-sm text-zinc-500">mi</span>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-5 gap-5 items-start">
        {/* ── Left: Map (3/5 = 60%) ── */}
        <div className="col-span-3 space-y-0">
          <MapPanel />
        </div>

        {/* ── Right: Job info + stops (2/5 = 40%) ── */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Job header card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-400 font-medium mb-0.5">#RJ-0042 · Today · Dep. 07:30</p>
                <h2 className="text-base font-semibold text-zinc-900">North Zone Waste Collection</h2>
              </div>
            </div>

            <Separator className="my-3" />

            {/* Resource */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 select-none">
                MT
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">Mike Torres</span>
                  <span className="flex items-center gap-1">
                    <Wifi className="h-3 w-3 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">Online</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Truck className="h-3 w-3 text-zinc-400" />
                  <span className="text-xs text-zinc-500">Van 1 · LK21 ABC</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-zinc-500">Stop</p>
                <p className="text-sm font-bold text-zinc-900">3 / 6</p>
              </div>
            </div>
          </div>

          {/* Stop list */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50">
              <span className="text-sm font-semibold text-zinc-900">Stops</span>
              <span className="text-xs text-zinc-500">{STOPS.length - completedCount} remaining</span>
            </div>
            <div className="p-3 space-y-0 max-h-[400px] overflow-y-auto scrollbar-thin">
              {STOPS.map((stop, i) => (
                <StopRow
                  key={stop.num}
                  stop={stop}
                  travelLeg={i < STOPS.length - 1 ? TRAVEL_LEGS[i] : undefined}
                />
              ))}
            </div>
          </div>

          {/* Action bar */}
          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button className="bg-zinc-900 hover:bg-zinc-700 text-white gap-1.5 text-xs h-9">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark Stop Complete
              </Button>
              <Button variant="outline" className="gap-1.5 text-xs h-9 text-zinc-700">
                <SkipForward className="h-3.5 w-3.5" />
                Skip Stop
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-1.5 text-xs h-9 text-zinc-700">
                <Plus className="h-3.5 w-3.5" />
                Add Stop
              </Button>
              <Button variant="outline" className="gap-1.5 text-xs h-9 text-red-600 hover:bg-red-50 border-red-200">
                <FlagOff className="h-3.5 w-3.5" />
                End Route
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
