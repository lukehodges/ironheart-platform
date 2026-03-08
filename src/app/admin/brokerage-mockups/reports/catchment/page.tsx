"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  MapPin,
  Leaf,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Package,
  Eye,
} from "lucide-react"
import { sites, deals } from "../../_mock-data"
import type { Catchment } from "../../_mock-data"

// ---------------------------------------------------------------------------
// Catchment region definitions
// ---------------------------------------------------------------------------

interface CatchmentRegion {
  name: Catchment
  color: string
  bgColor: string
  textColor: string
  borderColor: string
  status: "high" | "surplus" | "balanced" | "deficit" | "inactive"
  statusLabel: string
  statusIcon: React.ElementType
}

const catchmentRegions: CatchmentRegion[] = [
  {
    name: "Solent",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-700",
    status: "high",
    statusLabel: "High Supply & Demand",
    statusIcon: TrendingUp,
  },
  {
    name: "Test Valley",
    color: "bg-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-300 dark:border-blue-700",
    status: "surplus",
    statusLabel: "Surplus Supply",
    statusIcon: Package,
  },
  {
    name: "Stour",
    color: "bg-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-300 dark:border-amber-700",
    status: "balanced",
    statusLabel: "Balanced",
    statusIcon: Minus,
  },
  {
    name: "Exe",
    color: "bg-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/40",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-300 dark:border-red-700",
    status: "deficit",
    statusLabel: "High Demand, Low Supply",
    statusIcon: TrendingDown,
  },
  {
    name: "Tees",
    color: "bg-muted-foreground/50",
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-border",
    status: "inactive",
    statusLabel: "Inactive",
    statusIcon: AlertTriangle,
  },
]

const legendItems = [
  { color: "bg-emerald-500", label: "High Supply & Demand" },
  { color: "bg-blue-500", label: "Surplus Supply" },
  { color: "bg-amber-500", label: "Balanced" },
  { color: "bg-red-500", label: "High Demand, Low Supply" },
  { color: "bg-muted-foreground/50", label: "Inactive" },
]

// Simulated data for catchments without real sites
const simulatedCatchments: Record<string, { supplySites: number; totalCredits: number; availableCredits: number; dealCount: number; unitsNeeded: number; priceMin: number; priceMax: number }> = {
  "Stour": { supplySites: 3, totalCredits: 120, availableCredits: 55, dealCount: 2, unitsNeeded: 40, priceMin: 2100, priceMax: 2800 },
  "Exe": { supplySites: 1, totalCredits: 30, availableCredits: 10, dealCount: 5, unitsNeeded: 85, priceMin: 3500, priceMax: 4200 },
  "Tees": { supplySites: 0, totalCredits: 0, availableCredits: 0, dealCount: 0, unitsNeeded: 0, priceMin: 0, priceMax: 0 },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CatchmentHeatmapPage() {
  const [selected, setSelected] = useState<Catchment | null>(null)

  // Compute stats per catchment from real data
  const catchmentStats = useMemo(() => {
    const stats: Record<string, {
      supplySites: number
      totalCredits: number
      availableCredits: number
      dealCount: number
      unitsNeeded: number
      priceMin: number
      priceMax: number
      deals: typeof deals
    }> = {}

    for (const region of catchmentRegions) {
      const name = region.name
      const catchSites = sites.filter((s) => s.catchment === name)
      const catchDeals = deals.filter((d) => d.catchment === name)
      const simulated = simulatedCatchments[name]

      if (catchSites.length > 0) {
        const prices = catchSites.map((s) => s.price).filter((p) => p > 0)
        stats[name] = {
          supplySites: catchSites.length,
          totalCredits: catchSites.reduce((s, site) => s + site.total, 0),
          availableCredits: catchSites.reduce((s, site) => s + site.available, 0),
          dealCount: catchDeals.length,
          unitsNeeded: catchDeals.reduce((s, d) => s + d.units, 0),
          priceMin: prices.length > 0 ? Math.min(...prices) : 0,
          priceMax: prices.length > 0 ? Math.max(...prices) : 0,
          deals: catchDeals,
        }
      } else if (simulated) {
        stats[name] = { ...simulated, deals: catchDeals }
      } else {
        stats[name] = { supplySites: 0, totalCredits: 0, availableCredits: 0, dealCount: 0, unitsNeeded: 0, priceMin: 0, priceMax: 0, deals: [] }
      }
    }
    return stats
  }, [])

  const selectedRegion = catchmentRegions.find((r) => r.name === selected)
  const selectedStats = selected ? catchmentStats[selected] : null

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/brokerage-mockups/reports">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Reports
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Catchment Heatmap</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Geographic supply/demand intelligence across catchment regions
        </p>
      </div>

      {/* Map section */}
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">Catchment Regions</h2>
          <p className="text-xs text-muted-foreground mb-4">Click a region to view detailed supply/demand data</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {catchmentRegions.map((region) => {
              const stats = catchmentStats[region.name]
              const StatusIcon = region.statusIcon
              const isSelected = selected === region.name
              return (
                <button
                  key={region.name}
                  onClick={() => setSelected(isSelected ? null : region.name)}
                  className={`
                    relative rounded-xl border-2 p-4 text-left transition-all duration-200
                    ${region.bgColor} ${isSelected ? `${region.borderColor} shadow-lg ring-2 ring-primary/20` : "border-border hover:shadow-md"}
                  `}
                >
                  {/* Color indicator */}
                  <div className={`h-3 w-3 rounded-full ${region.color} mb-3`} />
                  <h3 className="text-sm font-bold text-foreground mb-1">{region.name}</h3>
                  <div className="flex items-center gap-1 mb-3">
                    <StatusIcon className={`h-3 w-3 ${region.textColor}`} />
                    <span className={`text-[10px] font-medium ${region.textColor}`}>{region.statusLabel}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Sites</span>
                      <span className="font-semibold text-foreground">{stats?.supplySites ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Available</span>
                      <span className="font-semibold text-foreground">{stats?.availableCredits ?? 0} kg</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Deals</span>
                      <span className="font-semibold text-foreground">{stats?.dealCount ?? 0}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Legend</span>
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detail panel */}
      {selected && selectedRegion && selectedStats && (
        <Card className={`border-2 ${selectedRegion.borderColor} ${selectedRegion.bgColor}`}>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-4 w-4 rounded-full ${selectedRegion.color}`} />
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selected} Catchment</h2>
                  <Badge className={`text-[10px] ${selectedRegion.textColor} bg-transparent border ${selectedRegion.borderColor}`}>
                    {selectedRegion.statusLabel}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setSelected(null)}
              >
                Close
              </Button>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Leaf className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Supply Sites</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{selectedStats.supplySites}</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Total Credits</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{selectedStats.totalCredits} kg/yr</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Available Credits</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{selectedStats.availableCredits} kg/yr</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Active Deals</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{selectedStats.dealCount}</p>
                </CardContent>
              </Card>
            </div>

            {/* Demand + Balance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="p-3">
                  <span className="text-[10px] text-muted-foreground font-medium">Total Units Needed</span>
                  <p className="text-lg font-bold text-foreground">{selectedStats.unitsNeeded} kg/yr</p>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-3">
                  <span className="text-[10px] text-muted-foreground font-medium">Balance (Surplus/Deficit)</span>
                  {(() => {
                    const balance = selectedStats.availableCredits - selectedStats.unitsNeeded
                    return (
                      <p className={`text-lg font-bold ${balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {balance >= 0 ? "+" : ""}{balance} kg/yr
                      </p>
                    )
                  })()}
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-3">
                  <span className="text-[10px] text-muted-foreground font-medium">Price Range</span>
                  <p className="text-lg font-bold text-foreground">
                    {selectedStats.priceMin > 0
                      ? `£${selectedStats.priceMin.toLocaleString()} - £${selectedStats.priceMax.toLocaleString()}/kg`
                      : "N/A"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Active deals table */}
            {selectedStats.deals.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-foreground mb-2">Active Deals in {selected}</h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-[10px]">Deal</TableHead>
                        <TableHead className="text-[10px]">Stage</TableHead>
                        <TableHead className="text-[10px]">Units</TableHead>
                        <TableHead className="text-[10px] text-right">Value</TableHead>
                        <TableHead className="text-[10px]">Broker</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedStats.deals.slice(0, 8).map((deal) => (
                        <TableRow key={deal.id}>
                          <TableCell className="text-xs font-medium text-foreground">{deal.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{deal.stage}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{deal.unitsLabel}</TableCell>
                          <TableCell className="text-xs text-right text-foreground">{deal.displayValue}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{deal.broker}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* View Sites button */}
            <div className="pt-2">
              <Link href="/admin/brokerage-mockups/sites">
                <Button variant="outline" size="sm">
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  View Sites in {selected}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
