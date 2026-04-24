"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  Navigation,
  Phone,
  Settings,
  MapPin,
  ChevronRight,
  AlertTriangle,
  Route,
  Clock,
  History,
  Truck,
} from "lucide-react"

// ─── Hardcoded state ───────────────────────────────────────────────────────────

const CURRENT_STOP = {
  num: 3,
  total: 6,
  customer: "TechCorp HQ",
  address: "88 Innovation Drive",
  city: "Manchester, M1 7BP",
  service: "2 bins",
  status: "ARRIVED" as const,
  arrivedAt: "08:51",
  timeOnSite: "00:09:14",
}

const NEXT_STOP = {
  num: 4,
  customer: "Green Valley Farm",
  eta: "09:30",
  distance: "6.4 mi",
}

const COMPLETED_STOPS = 2
const ROUTE_STOPS = 5 // excluding depot

type TabId = "route" | "active" | "history"

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DriverMobilePage() {
  const [activeTab, setActiveTab] = useState<TabId>("active")
  const [markComplete, setMarkComplete] = useState(false)

  const progressPct = (COMPLETED_STOPS / ROUTE_STOPS) * 100

  return (
    <div className="min-h-screen bg-zinc-950 flex items-start justify-center py-0 md:py-8">
      <div className="w-full max-w-sm min-h-screen md:min-h-0 md:rounded-3xl overflow-hidden flex flex-col bg-zinc-950 md:shadow-2xl md:ring-1 md:ring-zinc-700">

        {/* ── Status bar ── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
          <span className="text-xs text-zinc-500 font-medium tabular-nums">09:00</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">GPS Active</span>
          </span>
          <Settings className="h-4 w-4 text-zinc-500" />
        </div>

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
          <div>
            <p className="text-xs text-zinc-500 font-medium tracking-wide uppercase">Route Job</p>
            <p className="text-sm font-bold text-white">RJ-0042</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-700 bg-blue-950 px-3 py-1 text-xs font-semibold text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            IN PROGRESS
          </span>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

          {/* ── Current stop — large card ── */}
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 overflow-hidden">
            {/* Card header */}
            <div className="bg-zinc-800 px-4 py-3 flex items-center justify-between border-b border-zinc-700">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {CURRENT_STOP.num}
                </div>
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                  Stop {CURRENT_STOP.num} of {CURRENT_STOP.total}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-500/40 px-2.5 py-1 text-xs font-semibold text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                ARRIVED
              </span>
            </div>

            {/* Card body */}
            <div className="px-4 py-5 space-y-4">
              {/* Customer + address */}
              <div>
                <p className="text-2xl font-bold text-white leading-tight">{CURRENT_STOP.customer}</p>
                <div className="flex items-start gap-2 mt-2">
                  <MapPin className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-base text-zinc-200">{CURRENT_STOP.address}</p>
                    <p className="text-base text-zinc-400">{CURRENT_STOP.city}</p>
                  </div>
                </div>
              </div>

              {/* Service detail */}
              <div className="flex items-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5">
                <Truck className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500">Service</p>
                  <p className="text-sm font-semibold text-white">{CURRENT_STOP.service}</p>
                </div>
              </div>

              {/* Arrived + timer */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-3">
                  <p className="text-xs text-zinc-500 mb-1">Arrived</p>
                  <p className="text-lg font-bold text-white tabular-nums">{CURRENT_STOP.arrivedAt}</p>
                </div>
                <div className="rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-3">
                  <p className="text-xs text-zinc-500 mb-1">Time on site</p>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-lg font-bold text-white tabular-nums">{CURRENT_STOP.timeOnSite}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5">
                <Button
                  className={cn(
                    "w-full h-14 text-base font-bold gap-2.5 rounded-xl transition-all",
                    markComplete
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-emerald-500 hover:bg-emerald-400 text-white"
                  )}
                  onClick={() => setMarkComplete(true)}
                >
                  {markComplete ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Completed — Moving to Stop 4
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Mark Complete
                    </>
                  )}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-12 gap-2 rounded-xl border-zinc-600 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white text-sm font-semibold"
                  >
                    <Navigation className="h-4 w-4" />
                    Navigate
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 gap-2 rounded-xl border-zinc-600 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white text-sm font-semibold"
                  >
                    <Phone className="h-4 w-4" />
                    Contact
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Next stop preview ── */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center gap-3">
            <div className="h-7 w-7 rounded-full border border-zinc-600 bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {NEXT_STOP.num}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Next Stop</p>
              <p className="text-sm font-semibold text-white truncate">{NEXT_STOP.customer}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 text-zinc-400 justify-end">
                <Clock className="h-3 w-3" />
                <span className="text-xs font-medium">ETA {NEXT_STOP.eta}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{NEXT_STOP.distance}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
          </div>

          {/* ── Route progress ── */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Route Progress</p>
              <p className="text-xs font-semibold text-zinc-300">{COMPLETED_STOPS}/{ROUTE_STOPS} stops complete</p>
            </div>
            <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              {Array.from({ length: ROUTE_STOPS }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 w-2 rounded-full border transition-colors",
                    i < COMPLETED_STOPS
                      ? "bg-emerald-500 border-emerald-500"
                      : i === COMPLETED_STOPS
                      ? "bg-blue-500 border-blue-500"
                      : "bg-transparent border-zinc-600",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Bottom padding for tab bar */}
          <div className="h-4" />
        </div>

        {/* ── Bottom tab bar ── */}
        <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm safe-area-bottom">
          <div className="grid grid-cols-3">
            {(
              [
                { id: "route", label: "Today's Route", Icon: Route },
                { id: "active", label: "Active Job", Icon: MapPin },
                { id: "history", label: "History", Icon: History },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex flex-col items-center gap-1 py-3.5 text-xs font-medium transition-colors relative",
                  activeTab === id
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {activeTab === id && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-white" />
                )}
                <Icon className={cn("h-5 w-5", activeTab === id ? "text-white" : "text-zinc-500")} />
                <span className="text-[10px] leading-none">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── SOS floating button ── */}
        <button
          className="fixed bottom-20 right-4 md:absolute md:bottom-[72px] md:right-4 h-12 w-12 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg flex items-center justify-center transition-colors"
          title="Report issue / SOS"
        >
          <AlertTriangle className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
