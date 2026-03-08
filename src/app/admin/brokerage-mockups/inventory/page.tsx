"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Droplets,
  Filter,
  Leaf,
  Package,
  TreePine,
  TrendingDown,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from "recharts"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Variation = "v1" | "v2" | "v3"

interface CatchmentRow {
  catchment: string
  unitType: "Nitrogen (kg/yr)" | "BNG (units)"
  sites: number
  total: number
  allocated: number
  available: number
  avgPrice: number
  demand: number
  demandLabel: string
  hasGap: boolean
  gapAmount: number
}

interface SiteStockAlert {
  severity: "red" | "amber"
  title: string
  message: string
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CATCHMENT_DATA: CatchmentRow[] = [
  {
    catchment: "Solent",
    unitType: "Nitrogen (kg/yr)",
    sites: 4,
    total: 405,
    allocated: 260,
    available: 145,
    avgPrice: 2925,
    demand: 160,
    demandLabel: "160 kg needed",
    hasGap: true,
    gapAmount: 15,
  },
  {
    catchment: "Solent",
    unitType: "BNG (units)",
    sites: 1,
    total: 22.5,
    allocated: 0,
    available: 22.5,
    avgPrice: 14000,
    demand: 6.5,
    demandLabel: "6.5 units needed",
    hasGap: false,
    gapAmount: 0,
  },
  {
    catchment: "Test Valley",
    unitType: "Nitrogen (kg/yr)",
    sites: 1,
    total: 150,
    allocated: 0,
    available: 150,
    avgPrice: 2800,
    demand: 0,
    demandLabel: "0",
    hasGap: false,
    gapAmount: 0,
  },
]

const NITROGEN_GAUGE_DATA = [
  { name: "Allocated", value: 260, color: "#3b82f6" },
  { name: "Available", value: 295, color: "#22c55e" },
  { name: "Reserved", value: 45, color: "#f59e0b" },
]

const BNG_GAUGE_DATA = [
  { name: "Allocated", value: 0, color: "#3b82f6" },
  { name: "Available", value: 22.5, color: "#22c55e" },
  { name: "Reserved", value: 0, color: "#f59e0b" },
]

const ALERTS: SiteStockAlert[] = [
  {
    severity: "red",
    title: "Solent Nitrogen Credits: SUPPLY GAP",
    message:
      "Only 145 kg/yr available against 160 kg/yr demand pipeline. Shortfall of 15 kg/yr. Consider sourcing new sites urgently.",
  },
  {
    severity: "amber",
    title: "Whiteley Farm (S-0001): Low Stock",
    message:
      "Only 15 kg/yr remaining — 92% allocated. Nearing full depletion.",
  },
]

// Supply vs demand comparison for V3
const SUPPLY_DEMAND_COMPARISON = [
  {
    label: "Solent / Nitrogen",
    supply: 145,
    demand: 160,
    total: 405,
    allocated: 260,
  },
  {
    label: "Solent / BNG",
    supply: 22.5,
    demand: 6.5,
    total: 22.5,
    allocated: 0,
  },
  {
    label: "Test Valley / Nitrogen",
    supply: 150,
    demand: 0,
    total: 150,
    allocated: 0,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return `\u00a3${value.toLocaleString("en-GB")}`
}

function pct(part: number, whole: number): string {
  if (whole === 0) return "0%"
  return `${((part / whole) * 100).toFixed(1)}%`
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function VariationToggle({
  current,
  onChange,
}: {
  current: Variation
  onChange: (v: Variation) => void
}) {
  const options: { value: Variation; label: string }[] = [
    { value: "v1", label: "V1 Classic" },
    { value: "v2", label: "V2 Visual" },
    { value: "v3", label: "V3 Analytical" },
  ]
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            current === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function FilterBar() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        <span className="font-medium">Filters:</span>
      </div>
      <Select defaultValue="all">
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Unit Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Unit Types</SelectItem>
          <SelectItem value="nitrogen">Nitrogen</SelectItem>
          <SelectItem value="bng">BNG</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="all">
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Catchment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Catchments</SelectItem>
          <SelectItem value="solent">Solent</SelectItem>
          <SelectItem value="test-valley">Test Valley</SelectItem>
          <SelectItem value="new-forest">New Forest</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="all">
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="LPA" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All LPAs</SelectItem>
          <SelectItem value="winchester">Winchester</SelectItem>
          <SelectItem value="eastleigh">Eastleigh</SelectItem>
          <SelectItem value="fareham">Fareham</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2 ml-2">
        <Switch id="show-depleted" />
        <label htmlFor="show-depleted" className="text-xs text-muted-foreground cursor-pointer">
          Show depleted
        </label>
      </div>
    </div>
  )
}

function AlertBanner({ alert }: { alert: SiteStockAlert }) {
  const isRed = alert.severity === "red"
  return (
    <div
      className={[
        "flex items-start gap-3 rounded-lg border-l-4 px-4 py-3",
        isRed
          ? "border-l-red-600 bg-red-50 dark:bg-red-950/30"
          : "border-l-amber-500 bg-amber-50 dark:bg-amber-950/30",
      ].join(" ")}
    >
      <AlertTriangle
        className={[
          "h-5 w-5 mt-0.5 shrink-0",
          isRed ? "text-red-600" : "text-amber-600",
        ].join(" ")}
      />
      <div>
        <p
          className={[
            "text-sm font-semibold",
            isRed ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300",
          ].join(" ")}
        >
          {alert.title}
        </p>
        <p
          className={[
            "text-xs mt-0.5",
            isRed ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400",
          ].join(" ")}
        >
          {alert.message}
        </p>
      </div>
    </div>
  )
}

// Custom tooltip for Recharts
function GaugeTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-background border border-border rounded-md shadow-md px-3 py-2">
      <p className="text-xs font-medium">{item.name}</p>
      <p className="text-sm font-bold tabular-nums">{item.value}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VARIATION 1: Classic Dashboard
// ---------------------------------------------------------------------------

function StatCardV1({
  label,
  value,
  detail,
  icon: Icon,
  accent,
  ratio,
  ratioColor,
}: {
  label: string
  value: string
  detail: string
  icon: React.ElementType
  accent: string
  ratio: number // 0-100
  ratioColor: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className={`p-2 rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <span className="text-2xl font-bold tracking-tight text-foreground leading-none">
          {value}
        </span>
        <p className="text-xs text-muted-foreground mt-1">{detail}</p>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${ratioColor}`}
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  )
}

function CatchmentTableV1() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Availability by Catchment
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Grouped by catchment area and credit type
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Catchment
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Unit Type
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sites
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Allocated
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Available
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Avg Price
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Demand
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {CATCHMENT_DATA.map((row, i) => (
              <tr
                key={i}
                className={[
                  "transition-colors",
                  row.hasGap
                    ? "bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30"
                    : "hover:bg-accent/40",
                ].join(" ")}
              >
                <td className="px-5 py-3.5">
                  <span className="font-semibold text-foreground">
                    {row.catchment}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={[
                      "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
                      row.unitType === "Nitrogen (kg/yr)"
                        ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400",
                    ].join(" ")}
                  >
                    {row.unitType === "Nitrogen (kg/yr)" ? (
                      <Droplets className="h-3 w-3" />
                    ) : (
                      <TreePine className="h-3 w-3" />
                    )}
                    {row.unitType}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums font-medium text-foreground">
                  {row.sites}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums font-medium text-foreground">
                  {row.total}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                  {row.allocated}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                    {row.available}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums font-medium text-foreground">
                  {formatCurrency(row.avgPrice)}
                </td>
                <td
                  className={[
                    "px-4 py-3.5 text-right tabular-nums font-medium",
                    row.hasGap
                      ? "text-red-700 dark:text-red-400"
                      : "text-muted-foreground",
                  ].join(" ")}
                >
                  {row.demandLabel}
                </td>
                <td className="px-4 py-3.5">
                  {row.hasGap ? (
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1 rounded-md bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 px-2 py-0.5 text-xs font-bold text-red-800 dark:text-red-300">
                        <AlertTriangle className="h-3 w-3" />
                        SUPPLY GAP
                      </span>
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                        -{row.gapAmount}
                      </span>
                    </div>
                  ) : row.demand > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Sufficient
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No demand
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DonutGaugeV1({
  title,
  data,
  centerValue,
  centerLabel,
  priceRange,
}: {
  title: string
  data: Array<{ name: string; value: number; color: string }>
  centerValue: string
  centerLabel: string
  priceRange?: { min: number; avg: number; max: number }
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h4 className="text-sm font-semibold text-foreground mb-4">{title}</h4>
      <div className="relative h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.filter((d) => d.value > 0)}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data
                .filter((d) => d.value > 0)
                .map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
            </Pie>
            <RechartsTooltip content={<GaugeTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {centerValue}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            {centerLabel}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 mt-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-xs text-muted-foreground">
              {d.name}: <span className="font-semibold text-foreground tabular-nums">{d.value}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-1">
        Total capacity: <span className="font-semibold">{total}</span>
      </p>
      {priceRange && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground font-medium mb-2">
            Price Range (per unit)
          </p>
          <div className="relative h-2 bg-muted rounded-full">
            <div
              className="absolute inset-y-0 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400"
              style={{
                left: `${((priceRange.min - 2400) / (3400 - 2400)) * 100}%`,
                right: `${100 - ((priceRange.max - 2400) / (3400 - 2400)) * 100}%`,
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-foreground border-2 border-background shadow"
              style={{
                left: `${((priceRange.avg - 2400) / (3400 - 2400)) * 100}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[10px] tabular-nums text-muted-foreground">
            <span>{formatCurrency(priceRange.min)}</span>
            <span className="font-semibold text-foreground">
              avg {formatCurrency(priceRange.avg)}
            </span>
            <span>{formatCurrency(priceRange.max)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function VariationOne() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardV1
          label="Total Nitrogen Credits"
          value="555 kg/yr"
          detail="across 5 sites"
          icon={Droplets}
          accent="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          ratio={53.2}
          ratioColor="bg-blue-500"
        />
        <StatCardV1
          label="Available Nitrogen"
          value="295 kg/yr"
          detail="53.2% of total"
          icon={Leaf}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          ratio={53.2}
          ratioColor="bg-emerald-500"
        />
        <StatCardV1
          label="Total BNG Units"
          value="22.5 units"
          detail="across 1 site"
          icon={TreePine}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          ratio={100}
          ratioColor="bg-emerald-500"
        />
        <StatCardV1
          label="Available BNG"
          value="22.5 units"
          detail="100% (none allocated)"
          icon={Package}
          accent="bg-green-500/10 text-green-600 dark:text-green-400"
          ratio={100}
          ratioColor="bg-green-500"
        />
      </div>

      {/* Two-column: table + gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CatchmentTableV1 />
        </div>
        <div className="space-y-6">
          <DonutGaugeV1
            title="Nitrogen Credits"
            data={NITROGEN_GAUGE_DATA}
            centerValue="600"
            centerLabel="Total kg/yr"
            priceRange={{ min: 2500, avg: 2925, max: 3200 }}
          />
          <DonutGaugeV1
            title="BNG Units"
            data={BNG_GAUGE_DATA}
            centerValue="22.5"
            centerLabel="Total units"
          />
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Low Stock Alerts
        </h3>
        {ALERTS.map((alert, i) => (
          <AlertBanner key={i} alert={alert} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VARIATION 2: Visual-First
// ---------------------------------------------------------------------------

function GaugeCardLarge({
  title,
  data,
  centerValue,
  centerLabel,
  icon: Icon,
  subtitle,
}: {
  title: string
  data: Array<{ name: string; value: number; color: string }>
  centerValue: string
  centerLabel: string
  icon: React.ElementType
  subtitle: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.filter((d) => d.value > 0)}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data
                .filter((d) => d.value > 0)
                .map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
            </Pie>
            <RechartsTooltip content={<GaugeTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold tabular-nums text-foreground">
            {centerValue}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {centerLabel}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {data.map((d) => (
          <div key={d.name} className="text-center">
            <div
              className="h-1.5 rounded-full mx-auto mb-1.5 w-12"
              style={{ backgroundColor: d.color }}
            />
            <p className="text-sm font-bold tabular-nums text-foreground">
              {d.value}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {d.name}
            </p>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
        Total capacity: <span className="font-bold text-foreground">{total}</span>
      </p>
    </div>
  )
}

function CatchmentGridCard({ row }: { row: CatchmentRow }) {
  const allocationPct = row.total > 0 ? (row.allocated / row.total) * 100 : 0
  const availablePct = row.total > 0 ? (row.available / row.total) * 100 : 0

  return (
    <div
      className={[
        "border rounded-xl p-4 transition-all",
        row.hasGap
          ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 ring-1 ring-red-200 dark:ring-red-900"
          : "border-border bg-card",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">
            {row.catchment}
          </span>
          <span
            className={[
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              row.unitType === "Nitrogen (kg/yr)"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
            ].join(" ")}
          >
            {row.unitType === "Nitrogen (kg/yr)" ? (
              <Droplets className="h-2.5 w-2.5" />
            ) : (
              <TreePine className="h-2.5 w-2.5" />
            )}
            {row.unitType === "Nitrogen (kg/yr)" ? "N" : "BNG"}
          </span>
        </div>
        {row.hasGap && (
          <span className="flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-400 animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5" />
            GAP
          </span>
        )}
      </div>

      {/* Heat-map style capacity bar */}
      <div className="relative h-5 rounded-md overflow-hidden bg-muted mb-2">
        <div
          className="absolute inset-y-0 left-0 bg-blue-500/80"
          style={{ width: `${allocationPct}%` }}
        />
        <div
          className="absolute inset-y-0 bg-emerald-500/60"
          style={{
            left: `${allocationPct}%`,
            width: `${availablePct}%`,
          }}
        />
        {row.demand > 0 && (
          <div
            className={[
              "absolute inset-y-0 border-r-2 border-dashed",
              row.hasGap ? "border-red-600" : "border-amber-600",
            ].join(" ")}
            style={{
              left: `${Math.min(((row.allocated + row.demand) / row.total) * 100, 100)}%`,
            }}
          />
        )}
      </div>

      {/* Numbers grid */}
      <div className="grid grid-cols-4 gap-1 text-center">
        <div>
          <p className="text-xs font-bold tabular-nums text-foreground">
            {row.total}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase">Total</p>
        </div>
        <div>
          <p className="text-xs font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {row.allocated}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase">Alloc</p>
        </div>
        <div>
          <p className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {row.available}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase">Avail</p>
        </div>
        <div>
          <p
            className={[
              "text-xs font-bold tabular-nums",
              row.hasGap
                ? "text-red-700 dark:text-red-400"
                : row.demand > 0
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted-foreground",
            ].join(" ")}
          >
            {row.demand}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase">Demand</p>
        </div>
      </div>

      {/* Price */}
      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {row.sites} site{row.sites !== 1 ? "s" : ""}
        </span>
        <span className="text-xs font-semibold tabular-nums text-foreground">
          {formatCurrency(row.avgPrice)}/unit
        </span>
      </div>

      {/* Supply gap banner */}
      {row.hasGap && (
        <div className="mt-2 rounded-md bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 px-3 py-1.5 flex items-center gap-2">
          <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-[11px] font-semibold text-red-800 dark:text-red-300">
            Supply gap: {row.gapAmount} units short
          </p>
        </div>
      )}
    </div>
  )
}

function VariationTwo() {
  return (
    <div className="space-y-6">
      {/* Top banner for supply gap */}
      <div className="rounded-xl border-2 border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-4 flex items-center gap-4">
        <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/50">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-red-800 dark:text-red-300">
            Active Supply Gap: Solent Nitrogen
          </p>
          <p className="text-xs text-red-700 dark:text-red-400">
            145 kg/yr available vs 160 kg/yr demand pipeline. Shortfall of 15 kg/yr requires urgent sourcing.
          </p>
        </div>
        <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/50">
          <span className="text-2xl font-bold text-red-700 dark:text-red-300 tabular-nums">-15</span>
          <span className="text-[10px] text-red-600 dark:text-red-400 font-medium uppercase tracking-wider">kg/yr short</span>
        </div>
      </div>

      {/* Large gauge charts - center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GaugeCardLarge
          title="Nitrogen Credits"
          data={NITROGEN_GAUGE_DATA}
          centerValue="295"
          centerLabel="kg/yr available"
          icon={Droplets}
          subtitle="53.2% available across 5 sites"
        />
        <GaugeCardLarge
          title="BNG Units"
          data={BNG_GAUGE_DATA}
          centerValue="22.5"
          centerLabel="units available"
          icon={TreePine}
          subtitle="100% available across 1 site"
        />
      </div>

      {/* Price range card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Price Ranges
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              Nitrogen Credits (per kg/yr)
            </p>
            <div className="relative h-3 bg-muted rounded-full">
              <div
                className="absolute inset-y-0 rounded-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"
                style={{ left: "12.5%", right: "12.5%" }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-background shadow-lg"
                style={{ left: "53.1%" }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs tabular-nums">
              <span className="text-muted-foreground">
                {formatCurrency(2500)}
              </span>
              <span className="font-bold text-foreground bg-muted rounded px-2 py-0.5">
                avg {formatCurrency(2925)}
              </span>
              <span className="text-muted-foreground">
                {formatCurrency(3200)}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              BNG Units (per unit)
            </p>
            <div className="relative h-3 bg-muted rounded-full">
              <div
                className="absolute inset-y-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                style={{ left: "40%", right: "40%" }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-background shadow-lg"
                style={{ left: "50%" }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs tabular-nums">
              <span className="text-muted-foreground">
                {formatCurrency(12000)}
              </span>
              <span className="font-bold text-foreground bg-muted rounded px-2 py-0.5">
                {formatCurrency(14000)}
              </span>
              <span className="text-muted-foreground">
                {formatCurrency(16000)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Catchment grid */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Catchment Availability
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CATCHMENT_DATA.map((row, i) => (
            <CatchmentGridCard key={i} row={row} />
          ))}
        </div>
      </div>

      {/* Compact alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ALERTS.map((alert, i) => (
          <AlertBanner key={i} alert={alert} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VARIATION 3: Analytical
// ---------------------------------------------------------------------------

function VariationThree() {
  return (
    <div className="space-y-5">
      {/* Compact stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Nitrogen",
            value: "555 kg/yr",
            sub: "5 sites",
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950/30",
          },
          {
            label: "Available Nitrogen",
            value: "295 kg/yr",
            sub: "53.2%",
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950/30",
          },
          {
            label: "Total BNG",
            value: "22.5 units",
            sub: "1 site",
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950/30",
          },
          {
            label: "Available BNG",
            value: "22.5 units",
            sub: "100%",
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-950/30",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-lg border border-border px-4 py-3 ${stat.bg}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </p>
            <p className={`text-lg font-bold tabular-nums ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Compact alerts inline */}
      <div className="flex flex-col gap-2">
        {ALERTS.map((alert, i) => (
          <div
            key={i}
            className={[
              "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
              alert.severity === "red"
                ? "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                : "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
            ].join(" ")}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="font-bold">{alert.title}:</span>
            <span className="truncate">{alert.message}</span>
          </div>
        ))}
      </div>

      {/* Dense analytical table with inline supply/demand bars */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Supply vs Demand Analysis
          </h3>
          <span className="text-[10px] text-muted-foreground">
            Inline comparison bars
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Catchment / Type
                </th>
                <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Total
                </th>
                <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Alloc
                </th>
                <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Avail
                </th>
                <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Demand
                </th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-muted-foreground text-[10px] w-[280px]">
                  Supply vs Demand
                </th>
                <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Surplus
                </th>
                <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Price
                </th>
                <th className="text-left px-3 py-2.5 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CATCHMENT_DATA.map((row, i) => {
                const surplus = row.available - row.demand
                const maxVal = Math.max(row.available, row.demand, 1)
                const supplyWidth = (row.available / maxVal) * 100
                const demandWidth = (row.demand / maxVal) * 100

                return (
                  <tr
                    key={i}
                    className={[
                      "transition-colors",
                      row.hasGap
                        ? "bg-red-50/60 dark:bg-red-950/20"
                        : "hover:bg-accent/40",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">
                          {row.catchment}
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span
                          className={[
                            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                            row.unitType === "Nitrogen (kg/yr)"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                          ].join(" ")}
                        >
                          {row.unitType === "Nitrogen (kg/yr)" ? (
                            <Droplets className="h-2.5 w-2.5" />
                          ) : (
                            <TreePine className="h-2.5 w-2.5" />
                          )}
                          {row.unitType === "Nitrogen (kg/yr)" ? "N" : "BNG"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {row.sites} site{row.sites !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-foreground">
                      {row.total}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-blue-600 dark:text-blue-400 font-medium">
                      {row.allocated}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                      {row.available}
                    </td>
                    <td
                      className={[
                        "px-3 py-3 text-right tabular-nums font-bold",
                        row.hasGap
                          ? "text-red-700 dark:text-red-400"
                          : row.demand > 0
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {row.demand}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {/* Supply bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground w-10 shrink-0 text-right">
                            Supply
                          </span>
                          <div className="flex-1 h-3 bg-muted rounded overflow-hidden relative">
                            <div
                              className="h-full rounded bg-emerald-500/80 transition-all"
                              style={{ width: `${supplyWidth}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold tabular-nums text-emerald-700 dark:text-emerald-400 w-8 text-right">
                            {row.available}
                          </span>
                        </div>
                        {/* Demand bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground w-10 shrink-0 text-right">
                            Demand
                          </span>
                          <div className="flex-1 h-3 bg-muted rounded overflow-hidden relative">
                            <div
                              className={[
                                "h-full rounded transition-all",
                                row.hasGap
                                  ? "bg-red-500/80"
                                  : "bg-amber-400/80",
                              ].join(" ")}
                              style={{ width: `${demandWidth}%` }}
                            />
                            {/* Overlay the supply limit line if gap */}
                            {row.hasGap && (
                              <div
                                className="absolute inset-y-0 border-r-2 border-dashed border-emerald-600"
                                style={{ left: `${supplyWidth}%` }}
                              />
                            )}
                          </div>
                          <span
                            className={[
                              "text-[10px] font-bold tabular-nums w-8 text-right",
                              row.hasGap
                                ? "text-red-700 dark:text-red-400"
                                : row.demand > 0
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-muted-foreground",
                            ].join(" ")}
                          >
                            {row.demand}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={[
                          "inline-flex items-center gap-0.5 text-xs font-bold tabular-nums",
                          surplus < 0
                            ? "text-red-700 dark:text-red-400"
                            : surplus > 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {surplus < 0 ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : surplus > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : null}
                        {surplus > 0 ? `+${surplus}` : surplus === 0 ? "0" : surplus}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium text-foreground">
                      {formatCurrency(row.avgPrice)}
                    </td>
                    <td className="px-3 py-3">
                      {row.hasGap ? (
                        <span className="inline-flex items-center gap-1 rounded bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 px-2 py-0.5 text-[10px] font-bold text-red-800 dark:text-red-300 whitespace-nowrap">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          SUPPLY GAP
                        </span>
                      ) : row.demand > 0 ? (
                        <span className="inline-flex items-center rounded bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          OK
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          No demand
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Table summary footer */}
        <div className="border-t border-border bg-muted/30 px-5 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              3 catchment-type combinations across{" "}
              <span className="font-semibold text-foreground">6 sites</span>
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-6 rounded-sm bg-emerald-500/80" />
                Supply
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-6 rounded-sm bg-amber-400/80" />
                Demand
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-6 rounded-sm bg-red-500/80" />
                Demand (gap)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart: Supply vs Demand side-by-side */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Supply vs Demand Comparison
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={SUPPLY_DEMAND_COMPARISON}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px" }}
              />
              <Bar
                dataKey="supply"
                name="Available Supply"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="demand"
                name="Pipeline Demand"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Allocation breakdown mini table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/50">
          <h3 className="text-sm font-semibold text-foreground">
            Allocation Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Metric
                </th>
                <th className="text-right px-4 py-2 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Nitrogen
                </th>
                <th className="text-right px-4 py-2 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  BNG
                </th>
                <th className="text-right px-4 py-2 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Combined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-accent/40">
                <td className="px-4 py-2.5 font-medium text-foreground">
                  Total Capacity
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                  555 kg/yr
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                  22.5 units
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">
                  --
                </td>
              </tr>
              <tr className="hover:bg-accent/40">
                <td className="px-4 py-2.5 font-medium text-foreground">
                  Allocated
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-blue-600 dark:text-blue-400 font-medium">
                  260 kg/yr (46.8%)
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-blue-600 dark:text-blue-400 font-medium">
                  0 units (0%)
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">
                  --
                </td>
              </tr>
              <tr className="hover:bg-accent/40">
                <td className="px-4 py-2.5 font-medium text-foreground">
                  Reserved
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-amber-600 dark:text-amber-400 font-medium">
                  45 kg/yr (8.1%)
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-amber-600 dark:text-amber-400 font-medium">
                  0 units (0%)
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">
                  --
                </td>
              </tr>
              <tr className="bg-emerald-50/50 dark:bg-emerald-950/20">
                <td className="px-4 py-2.5 font-bold text-foreground">
                  Available
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                  295 kg/yr (53.2%)
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                  22.5 units (100%)
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">
                  --
                </td>
              </tr>
              <tr className="bg-red-50/50 dark:bg-red-950/15">
                <td className="px-4 py-2.5 font-bold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  Pipeline Demand
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-red-700 dark:text-red-400">
                  160 kg/yr
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium text-amber-700 dark:text-amber-400">
                  6.5 units
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">
                  --
                </td>
              </tr>
              <tr
                className={[
                  "border-t-2 border-border font-bold",
                  "bg-red-50/30 dark:bg-red-950/10",
                ].join(" ")}
              >
                <td className="px-4 py-2.5 font-bold text-foreground">
                  Net Surplus / (Gap)
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400 font-bold">
                    <ArrowDownRight className="h-3 w-3" />
                    -15 kg/yr *
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="inline-flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +16.0 units
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">
                  --
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2 border-t border-border bg-muted/30">
          <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">
            * Solent nitrogen demand (160 kg/yr) exceeds available supply (145 kg/yr). Surplus includes Test Valley (150 kg/yr) which is in a different catchment and cannot offset Solent.
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InventoryAvailabilityPage() {
  const [variation, setVariation] = useState<Variation>("v1")

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="border-b border-border bg-background">
        <div className="max-w-screen-2xl mx-auto px-6 py-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Ironheart Brokerage -- Inventory
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Inventory Availability
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Credit stock levels, supply vs demand, and low-stock alerts -- March 2026
              </p>
            </div>
            <div className="flex items-center gap-3">
              <VariationToggle current={variation} onChange={setVariation} />
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground font-medium">
                  Live
                </span>
              </div>
            </div>
          </div>
          <FilterBar />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        {variation === "v1" && <VariationOne />}
        {variation === "v2" && <VariationTwo />}
        {variation === "v3" && <VariationThree />}
      </div>

      {/* Footer */}
      <div className="max-w-screen-2xl mx-auto px-6 pb-6">
        <div className="border-t border-border pt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            Ironheart Brokerage -- BNG / Nutrient Credit Platform -- Mockup
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-200 border border-red-400" />
              Supply Gap
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-200 border border-amber-400" />
              Low Stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-200 border border-emerald-400" />
              Sufficient
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
