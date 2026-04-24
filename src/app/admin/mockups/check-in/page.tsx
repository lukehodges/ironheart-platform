"use client"

import { useState, useEffect } from "react"
import {
  Check,
  QrCode,
  ScanLine,
  ChevronRight,
  Users,
  Camera,
  CreditCard,
  AlertTriangle,
  RotateCcw,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────

type ViewState = "ready" | "found" | "success" | "already_checked_in"
type MockTab = "ready" | "found" | "success" | "already_checked_in"

// ─── Ready to Scan View ─────────────────────────────────────────────

function ReadyView({ onSimulate }: { onSimulate: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Class info header */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">
              Now Checking In
            </p>
            <h2 className="text-base font-bold text-zinc-900">Monday Morning Yoga</h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
              <span>09:00 · Studio B</span>
              <span className="text-zinc-300">·</span>
              <span className="text-emerald-600 font-semibold">7/10</span>
              <span>checked in</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6">
        {/* Viewfinder */}
        <div className="relative w-full max-w-[260px] aspect-square rounded-2xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center overflow-hidden">
          {/* Corner brackets */}
          <div className="absolute top-3 left-3 w-6 h-6" style={{ borderTop: "3px solid #18181b", borderLeft: "3px solid #18181b", borderTopLeftRadius: 4 }} />
          <div className="absolute top-3 right-3 w-6 h-6" style={{ borderTop: "3px solid #18181b", borderRight: "3px solid #18181b", borderTopRightRadius: 4 }} />
          <div className="absolute bottom-3 left-3 w-6 h-6" style={{ borderBottom: "3px solid #18181b", borderLeft: "3px solid #18181b", borderBottomLeftRadius: 4 }} />
          <div className="absolute bottom-3 right-3 w-6 h-6" style={{ borderBottom: "3px solid #18181b", borderRight: "3px solid #18181b", borderBottomRightRadius: 4 }} />

          {/* Animated scan line */}
          <div
            className="absolute left-4 right-4 h-0.5 bg-zinc-900/50 rounded-full"
            style={{ animation: "scanline 2s ease-in-out infinite" }}
          />

          <Camera className="h-10 w-10 text-zinc-300 mb-2 z-10" />
          <p className="text-xs text-zinc-400 text-center z-10 px-4">
            Point camera at customer&apos;s QR ticket
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-[260px] my-5">
          <div className="flex-1 h-px bg-zinc-200" />
          <span className="text-xs text-zinc-400">or</span>
          <div className="flex-1 h-px bg-zinc-200" />
        </div>

        {/* Manual entry */}
        <div className="w-full max-w-[260px] space-y-2">
          <p className="text-xs text-zinc-500 text-center">Enter ticket reference</p>
          <div className="flex gap-2">
            <Input
              placeholder="TKT-2847"
              className="text-sm h-10 font-mono"
            />
            <Button
              onClick={onSimulate}
              className="h-10 bg-zinc-900 hover:bg-zinc-700 text-white px-4 shrink-0"
            >
              Look up
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Ticket Found View ──────────────────────────────────────────────

function TicketFoundView({
  onCheckIn,
  onCancel,
}: {
  onCheckIn: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ticket Found</p>
        <button
          onClick={onCancel}
          className="h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-zinc-600" />
        </button>
      </div>

      {/* Customer card */}
      <div className="px-5 pb-4 flex-1">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 mb-4">
          {/* Customer */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-violet-500 text-white text-sm font-bold">EP</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Emma Patel</h2>
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                Premium Pass
              </span>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-zinc-200 p-3">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">Ticket</p>
              <p className="text-sm font-bold text-zinc-900 font-mono">#TKT-2847</p>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-3">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">Status</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <Check className="h-3 w-3" />
                Confirmed
              </span>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-3 col-span-2">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">Class</p>
              <p className="text-sm font-medium text-zinc-800">Monday Morning Yoga</p>
              <p className="text-xs text-zinc-500 mt-0.5">09:00 Mon 14 Apr · Studio B</p>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-3 col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium mb-0.5">Payment</p>
                  <p className="text-sm font-semibold text-zinc-900">Paid £15</p>
                </div>
                <CreditCard className="h-5 w-5 text-zinc-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2.5">
          <Button
            onClick={onCheckIn}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white text-base font-bold rounded-2xl"
          >
            <Check className="h-5 w-5 mr-2" />
            CHECK IN
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full h-10 text-zinc-500 hover:text-zinc-700 text-sm"
          >
            Cancel / Wrong ticket
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Success View ────────────────────────────────────────────────────

function SuccessView({ onContinue }: { onContinue: () => void }) {
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (countdown <= 0) {
      onContinue()
      return
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, onContinue])

  return (
    <div className="flex flex-col h-full items-center justify-center px-5 py-8 text-center">
      {/* Big check */}
      <div className="relative mb-6">
        <div className="h-28 w-28 rounded-full bg-emerald-50 border-4 border-emerald-500 flex items-center justify-center">
          <Check className="h-14 w-14 text-emerald-500 stroke-[2.5]" />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping" />
      </div>

      <p className="text-xs font-bold text-emerald-600 uppercase tracking-[0.2em] mb-1">
        Checked In
      </p>
      <h2 className="text-3xl font-bold text-zinc-900 mb-1">Emma Patel</h2>
      <p className="text-sm text-zinc-500 mb-5">Monday Morning Yoga · 09:00</p>

      {/* Stat row */}
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-0.5">Seat</p>
          <p className="text-base font-bold text-zinc-900">8 of 10</p>
        </div>
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-center">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-0.5">Time</p>
          <p className="text-base font-bold text-zinc-900 tabular-nums">09:14</p>
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 text-center">
          <p className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Plan</p>
          <p className="text-base font-bold text-blue-700">Premium</p>
        </div>
      </div>

      <Button
        onClick={onContinue}
        className="w-full max-w-[260px] h-12 bg-zinc-900 hover:bg-zinc-700 text-white font-semibold rounded-2xl text-sm"
      >
        Continue Scanning
      </Button>
      <p className="text-xs text-zinc-400 mt-3">
        Auto-returning in{" "}
        <span className="font-semibold text-zinc-500 tabular-nums">{countdown}s</span>
      </p>
    </div>
  )
}

// ─── Already Checked In View ─────────────────────────────────────────

function AlreadyCheckedInView({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col h-full items-center justify-center px-5 py-8 text-center">
      {/* Warning icon */}
      <div className="h-24 w-24 rounded-full bg-amber-50 border-4 border-amber-400 flex items-center justify-center mb-6">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
      </div>

      <p className="text-xs font-bold text-amber-600 uppercase tracking-[0.2em] mb-1">
        Already Checked In
      </p>
      <h2 className="text-2xl font-bold text-zinc-900 mb-3">Emma Patel</h2>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 w-full max-w-[260px] mb-6">
        <p className="text-sm text-amber-800">
          Emma Patel checked in at{" "}
          <span className="font-bold tabular-nums">08:52</span>
        </p>
        <p className="text-xs text-amber-600 mt-1">
          Ticket #TKT-2847 · Monday Morning Yoga
        </p>
      </div>

      <div className="space-y-2.5 w-full max-w-[260px]">
        <Button
          variant="outline"
          className="w-full h-11 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl text-sm font-semibold"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Undo Check-in
        </Button>
        <Button
          onClick={onContinue}
          className="w-full h-11 bg-zinc-900 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold"
        >
          Continue Scanning
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────

const MOCK_TABS: { key: MockTab; label: string }[] = [
  { key: "ready", label: "Ready to Scan" },
  { key: "found", label: "Ticket Found" },
  { key: "success", label: "Checked In" },
  { key: "already_checked_in", label: "Already Checked In" },
]

export default function CheckInPage() {
  const [mockTab, setMockTab] = useState<MockTab>("ready")
  const [viewState, setViewState] = useState<ViewState>("ready")

  function selectTab(tab: MockTab) {
    setMockTab(tab)
    setViewState(tab)
  }

  function handleSimulate() {
    setViewState("found")
    setMockTab("found")
  }

  function handleCheckIn() {
    setViewState("success")
    setMockTab("success")
  }

  function handleContinue() {
    setViewState("ready")
    setMockTab("ready")
  }

  function handleCancel() {
    setViewState("ready")
    setMockTab("ready")
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col">
      {/* Dev state switcher */}
      <div className="bg-white border-b border-zinc-200 px-4 py-2.5 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-lg mx-auto gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <ScanLine className="h-4 w-4 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-500 hidden sm:block">Check-in Preview</span>
            <ChevronRight className="h-3 w-3 text-zinc-400 hidden sm:block" />
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-zinc-100 border border-zinc-200 p-0.5 overflow-x-auto">
            {MOCK_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => selectTab(tab.key)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all",
                  mockTab === tab.key
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Phone frame */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[360px]">
          {/* Phone bezel */}
          <div
            className="rounded-[2.5rem] overflow-hidden border-[8px] border-zinc-800 shadow-2xl bg-white"
            style={{ minHeight: 640 }}
          >
            {/* Status bar */}
            <div className="h-7 bg-white flex items-center justify-between px-6">
              <span className="text-[10px] font-semibold text-zinc-900 tabular-nums">09:14</span>
              <div className="flex items-center gap-1">
                <div className="h-2 w-3 rounded-[1px] border border-zinc-400 relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-3/4 bg-zinc-500" />
                </div>
              </div>
            </div>

            {/* App content */}
            <div className="bg-white" style={{ minHeight: 580 }}>
              {/* App top bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 bg-white">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-zinc-900 flex items-center justify-center">
                    <QrCode className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-zinc-900">Check-in</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] text-zinc-500 font-medium">Live</span>
                </div>
              </div>

              {/* View content */}
              <div style={{ minHeight: 540 }} className="flex flex-col">
                {viewState === "ready" && (
                  <ReadyView onSimulate={handleSimulate} />
                )}
                {viewState === "found" && (
                  <TicketFoundView onCheckIn={handleCheckIn} onCancel={handleCancel} />
                )}
                {viewState === "success" && (
                  <SuccessView onContinue={handleContinue} />
                )}
                {viewState === "already_checked_in" && (
                  <AlreadyCheckedInView onContinue={handleContinue} />
                )}
              </div>
            </div>

            {/* Home indicator */}
            <div className="bg-white h-6 flex items-center justify-center">
              <div className="h-1 w-24 rounded-full bg-zinc-200" />
            </div>
          </div>

          {/* Caption */}
          <p className="text-center text-xs text-zinc-400 mt-4">
            Mobile-first check-in app · max-w-sm · fullscreen on device
          </p>
        </div>
      </div>

      {/* Scan line animation */}
      <style jsx>{`
        @keyframes scanline {
          0%, 100% { top: 25%; opacity: 0.3; }
          50% { top: 75%; opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
