"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  MoreHorizontal,
  MapPin,
  Navigation,
  Clock,
  LogOut,
  Plus,
  Minus,
  Trash2,
  Package,
  FileText,
  Camera,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActiveTab = "job" | "materials" | "notes" | "photos"

interface Material {
  id: number
  name: string
  unitCost: number
  qty: number
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const INITIAL_MATERIALS: Material[] = [
  { id: 1, name: "Fernox F1 Inhibitor 500ml", unitCost: 12.5, qty: 1 },
  { id: 2, name: "PTFE Tape", unitCost: 1.2, qty: 2 },
]

const CATALOGUE_SUGGESTIONS = [
  { name: "Fernox F1 Inhibitor 500ml", unitCost: 12.5 },
  { name: "Boiler Pressure Relief Valve", unitCost: 38.0 },
  { name: "Gas Pipe Fittings (x4)", unitCost: 3.75 },
  { name: "PTFE Tape", unitCost: 1.2 },
  { name: "Fernox DS40 Descaler 500ml", unitCost: 9.8 },
]

const HOURLY_RATE = 45
const CLOCK_IN_TIME = "09:47"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtGBP(val: number) {
  return `£${val.toFixed(2)}`
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

// Elapsed from 09:47 to 11:23 = 5760s, then live from there
const BASE_ELAPSED_SECONDS = 5760 // 1h 36m

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TopBar() {
  return (
    <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-4 h-14">
      <button className="p-2 rounded-xl hover:bg-zinc-800 transition-colors text-zinc-400">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold text-white leading-tight tracking-tight">Job #J-0891</span>
        <span className="text-[11px] text-zinc-500 leading-none mt-0.5">Boiler Service & Inspection</span>
      </div>
      <button className="p-2 rounded-xl hover:bg-zinc-800 transition-colors text-zinc-400">
        <MoreHorizontal className="h-5 w-5" />
      </button>
    </div>
  )
}

function CustomerCard() {
  return (
    <div className="mx-4 mt-4 rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white leading-tight">Mr Johnson</h2>
          <p className="text-sm text-zinc-400 mt-0.5 leading-snug">
            Boiler Service &amp; Safety Inspection
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[11px] font-bold uppercase tracking-wider">
          In Progress
        </span>
      </div>
      <div className="flex items-center gap-2 text-zinc-400">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        <span className="text-xs">42 Elm Close, Manchester M14 5RG</span>
      </div>
      <button className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-zinc-700 text-zinc-300 text-xs font-semibold hover:bg-zinc-800 hover:border-zinc-600 transition-colors">
        <Navigation className="h-3.5 w-3.5" />
        Navigate
      </button>
    </div>
  )
}

function TimerSection({ elapsedSeconds }: { elapsedSeconds: number }) {
  const earnedAmount = (elapsedSeconds / 3600) * HOURLY_RATE

  return (
    <div className="mx-4 mt-4 rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
      {/* Big timer */}
      <div className="text-center space-y-1">
        <div className="font-mono text-5xl font-bold text-white tracking-tight tabular-nums leading-none">
          {formatDuration(elapsedSeconds)}
        </div>
        <p className="text-sm text-zinc-500">
          Clocked in at{" "}
          <span className="text-zinc-300 font-semibold">{CLOCK_IN_TIME}</span>
        </p>
      </div>

      {/* Earnings */}
      <div className="flex items-center justify-center gap-1.5">
        <Clock className="h-4 w-4 text-emerald-400" />
        <span className="text-lg font-bold text-emerald-400 tabular-nums">
          {fmtGBP(earnedAmount)}
        </span>
        <span className="text-sm text-zinc-500">
          earned at £{HOURLY_RATE}/hr
        </span>
      </div>

      {/* Clock out CTA */}
      <button className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors flex items-center justify-center gap-3 font-bold text-white text-base">
        <LogOut className="h-5 w-5" />
        CLOCK OUT
      </button>
    </div>
  )
}

function MaterialsSection() {
  const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS)
  const [searchValue, setSearchValue] = useState("")
  const [addQty, setAddQty] = useState(1)
  const [addUnitCost, setAddUnitCost] = useState<number | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const materialsTotal = materials.reduce((s, m) => s + m.unitCost * m.qty, 0)

  const filteredSuggestions = CATALOGUE_SUGGESTIONS.filter((s) =>
    s.name.toLowerCase().includes(searchValue.toLowerCase()) && searchValue.length > 0,
  )

  function handleSelectSuggestion(item: { name: string; unitCost: number }) {
    setSearchValue(item.name)
    setAddUnitCost(item.unitCost)
    setShowSuggestions(false)
  }

  function handleAddMaterial() {
    if (!searchValue.trim()) return
    const cost = addUnitCost ?? 0
    setMaterials((prev) => [
      ...prev,
      { id: Date.now(), name: searchValue, unitCost: cost, qty: addQty },
    ])
    setSearchValue("")
    setAddUnitCost(null)
    setAddQty(1)
  }

  function handleDelete(id: number) {
    setMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className="mx-4 mt-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Materials</span>
        <span className="text-xs text-zinc-500 tabular-nums">{fmtGBP(materialsTotal)} total</span>
      </div>

      {/* Materials list */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        {materials.map((m, idx) => (
          <div
            key={m.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              idx < materials.length - 1 && "border-b border-zinc-800",
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white leading-tight truncate">{m.name}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {m.qty} × {fmtGBP(m.unitCost)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-bold text-zinc-200 tabular-nums">
                {fmtGBP(m.unitCost * m.qty)}
              </span>
              <button
                onClick={() => handleDelete(m.id)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* Subtotal row */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/60 border-t border-zinc-800">
          <span className="text-xs font-semibold text-zinc-400">Materials subtotal</span>
          <span className="text-sm font-bold text-zinc-100 tabular-nums">{fmtGBP(materialsTotal)}</span>
        </div>
      </div>

      {/* Add material form */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Material
        </p>

        {/* Search field */}
        <div className="relative">
          <div className="flex items-center gap-2 h-10 rounded-xl border border-zinc-700 bg-zinc-800 px-3 focus-within:border-zinc-500 transition-colors">
            <Search className="h-4 w-4 text-zinc-500 shrink-0" />
            <input
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value)
                setShowSuggestions(true)
                setAddUnitCost(null)
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search materials..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
            />
          </div>
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-xl border border-zinc-700 bg-zinc-800 shadow-xl overflow-hidden">
              {filteredSuggestions.map((s) => (
                <button
                  key={s.name}
                  onMouseDown={() => handleSelectSuggestion(s)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-zinc-700 transition-colors border-b border-zinc-700/50 last:border-0"
                >
                  <span className="text-zinc-200 text-xs">{s.name}</span>
                  <span className="text-zinc-400 text-xs font-semibold tabular-nums">{fmtGBP(s.unitCost)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {/* Qty stepper */}
          <div className="flex items-center gap-0 rounded-xl border border-zinc-700 bg-zinc-800 overflow-hidden">
            <button
              onClick={() => setAddQty((q) => Math.max(1, q - 1))}
              className="px-3 h-10 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-4 h-10 flex items-center text-sm font-bold text-white tabular-nums min-w-[2.5rem] justify-center">
              {addQty}
            </span>
            <button
              onClick={() => setAddQty((q) => q + 1)}
              className="px-3 h-10 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Unit cost */}
          <div className="flex items-center gap-2 flex-1 h-10 rounded-xl border border-zinc-700 bg-zinc-800 px-3 focus-within:border-zinc-500 transition-colors">
            <span className="text-zinc-500 text-sm">£</span>
            <input
              type="number"
              value={addUnitCost ?? ""}
              onChange={(e) => setAddUnitCost(parseFloat(e.target.value) || null)}
              placeholder="0.00"
              step="0.01"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none tabular-nums"
            />
          </div>

          {/* Add button */}
          <button
            onClick={handleAddMaterial}
            disabled={!searchValue.trim()}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-bold transition-colors whitespace-nowrap"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

function JobSummary({ elapsedSeconds, materialsTotal }: { elapsedSeconds: number; materialsTotal: number }) {
  const [open, setOpen] = useState(true)
  const labourAmount = (elapsedSeconds / 3600) * HOURLY_RATE
  const estimatedTotal = labourAmount + materialsTotal
  const labourHours = Math.floor(elapsedSeconds / 3600)
  const labourMins = Math.floor((elapsedSeconds % 3600) / 60)

  return (
    <div className="mx-4 mt-4 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/50 transition-colors"
      >
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Job Summary</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-zinc-200 tabular-nums">{fmtGBP(estimatedTotal)}</span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">
              Labour{" "}
              <span className="text-zinc-600 text-xs">
                ({labourHours}h {labourMins}m × £{HOURLY_RATE}/hr)
              </span>
            </span>
            <span className="text-zinc-200 font-semibold tabular-nums">{fmtGBP(labourAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Materials</span>
            <span className="text-zinc-200 font-semibold tabular-nums">{fmtGBP(materialsTotal)}</span>
          </div>
          <div className="h-px bg-zinc-800 my-1" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Estimated total</span>
            <span className="text-base font-bold text-white tabular-nums">{fmtGBP(estimatedTotal)}</span>
          </div>
          <p className="text-[11px] text-zinc-600 mt-1">
            Final total calculated on clock-out
          </p>
        </div>
      )}
    </div>
  )
}

function NotesSection() {
  const [note, setNote] = useState(
    "Customer mentioned banging noise from pipes — check expansion vessel. Boiler: Worcester Bosch Greenstar 30i.",
  )

  return (
    <div className="mx-4 mt-4 space-y-3">
      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Job Notes</span>

      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed"
        />
      </div>

      <button className="w-full h-10 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-semibold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" />
        Add Note
      </button>
    </div>
  )
}

function PhotosSection() {
  return (
    <div className="mx-4 mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Photos</span>
        <span className="text-xs text-zinc-600">0 photos</span>
      </div>

      <button className="w-full h-32 rounded-2xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-2 text-zinc-600 hover:border-zinc-600 hover:text-zinc-500 transition-colors">
        <Camera className="h-8 w-8" />
        <span className="text-sm font-medium">Take Photo / Upload</span>
        <span className="text-xs text-zinc-700">Before, during, and after photos</span>
      </button>
    </div>
  )
}

function BottomTabBar({
  active,
  onChange,
}: {
  active: ActiveTab
  onChange: (t: ActiveTab) => void
}) {
  const tabs: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
    { key: "job", label: "Active Job", icon: Briefcase },
    { key: "materials", label: "Materials", icon: Package },
    { key: "notes", label: "Notes", icon: FileText },
    { key: "photos", label: "Photos", icon: Camera },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 flex safe-area-pb">
      <div className="max-w-sm mx-auto w-full flex">
        {tabs.map((t) => {
          const Icon = t.icon
          const isActive = active === t.key
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors",
                isActive ? "text-white" : "text-zinc-600 hover:text-zinc-400",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "text-white" : "text-zinc-600",
                )}
              />
              <span className="leading-none">{t.label}</span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-white rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FieldPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("job")
  const [elapsedSeconds, setElapsedSeconds] = useState(BASE_ELAPSED_SECONDS)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const materialsTotal = INITIAL_MATERIALS.reduce((s, m) => s + m.unitCost * m.qty, 0)

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-zinc-950 flex flex-col pb-24">
      <TopBar />
      <CustomerCard />

      {activeTab === "job" && (
        <>
          <TimerSection elapsedSeconds={elapsedSeconds} />
          <JobSummary elapsedSeconds={elapsedSeconds} materialsTotal={materialsTotal} />
        </>
      )}
      {activeTab === "materials" && <MaterialsSection />}
      {activeTab === "notes" && <NotesSection />}
      {activeTab === "photos" && <PhotosSection />}

      <BottomTabBar active={activeTab} onChange={setActiveTab} />
    </div>
  )
}
