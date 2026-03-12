"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Leaf,
  Droplets,
  Calculator,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Save,
  FileText,
  Send,
  RotateCcw,
  Sprout,
  TreeDeciduous,
  ArrowLeft,
  ChevronRight,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

// ─── Types ─────────────────────────────────────────────────────────────────────

type CurrentLandUse =
  | "Arable"
  | "Dairy Pasture"
  | "Beef/Sheep Pasture"
  | "Intensive Grassland"
  | "Mixed Farming"

type ProposedLandUse =
  | "Extensive Grassland"
  | "Permanent Grassland"
  | "Woodland"
  | "Wetland/Reedbed"
  | "Species-rich Meadow"
  | "Riparian Buffer"

type SoilType = "Clay" | "Sandy Loam" | "Chalk" | "Alluvial" | "Peat"
type Catchment = "Solent" | "Test Valley" | "Stour" | "Exe" | "Tees"

interface Scenario {
  label: string
  siteName: string
  currentLandUse: CurrentLandUse
  proposedLandUse: ProposedLandUse
  areaToConvert: number
  totalArea: number
  baselineLoading: number
  proposedLoading: number
  creditYield: number
  totalCreditYield: number
  conservativeValue: number
  marketValue: number
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const BASE_LOADING_RATES: Record<CurrentLandUse, number> = {
  Arable: 30,
  "Dairy Pasture": 25,
  "Beef/Sheep Pasture": 15,
  "Intensive Grassland": 20,
  "Mixed Farming": 22,
}

const PROPOSED_BASE_RATES: Record<ProposedLandUse, number> = {
  "Extensive Grassland": 5.5,
  "Permanent Grassland": 6,
  Woodland: 3.5,
  "Wetland/Reedbed": 2,
  "Species-rich Meadow": 4,
  "Riparian Buffer": 2.5,
}

const DEFAULT_FERTILISER_RATES: Record<CurrentLandUse, number> = {
  Arable: 200,
  "Dairy Pasture": 150,
  "Beef/Sheep Pasture": 60,
  "Intensive Grassland": 120,
  "Mixed Farming": 100,
}

const CONSERVATIVE_PRICE = 2300
const MARKET_PRICE = 3000
const COMMISSION_RATE = 0.15

const IS_PASTURE = (landUse: CurrentLandUse): boolean =>
  landUse === "Dairy Pasture" ||
  landUse === "Beef/Sheep Pasture"

const IS_PROPOSED_GRASSLAND = (landUse: ProposedLandUse): boolean =>
  landUse === "Extensive Grassland" ||
  landUse === "Permanent Grassland" ||
  landUse === "Species-rich Meadow"

// ─── Calculation ───────────────────────────────────────────────────────────────

function getLoadingRate(
  landUse: CurrentLandUse | ProposedLandUse,
  fertiliserRate: number,
  stockingDensity: number,
  isBaseline: boolean
): number {
  const baseRate = isBaseline
    ? BASE_LOADING_RATES[landUse as CurrentLandUse] ?? 10
    : PROPOSED_BASE_RATES[landUse as ProposedLandUse] ?? 4

  // If there's meaningful fertiliser or stocking input, use adjusted formula
  if (fertiliserRate > 0 || stockingDensity > 0) {
    return (fertiliserRate * 0.3) + (stockingDensity * 8) + baseRate * 0.4
  }

  return baseRate
}

function formatNumber(n: number, decimals: number = 0): string {
  return n.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) {
    return `\u00A3${(n / 1_000_000).toFixed(2)}m`
  }
  return `\u00A3${formatNumber(n)}`
}

// ─── Preset Sites ──────────────────────────────────────────────────────────────

interface PresetSite {
  name: string
  label: string
  catchment: Catchment
  totalArea: number
  currentLandUse: CurrentLandUse
  soilType: SoilType
  stockingDensity: number
  fertiliserRate: number
  proposedLandUse: ProposedLandUse
  proposedStockingDensity: number
  proposedFertiliserRate: number
  bufferStripWidth: number
}

const PRESETS: PresetSite[] = [
  {
    name: "Whiteley Farm",
    label: "Whiteley Farm (60 ha, Arable)",
    catchment: "Solent",
    totalArea: 60,
    currentLandUse: "Arable",
    soilType: "Clay",
    stockingDensity: 0,
    fertiliserRate: 200,
    proposedLandUse: "Permanent Grassland",
    proposedStockingDensity: 0,
    proposedFertiliserRate: 0,
    bufferStripWidth: 8,
  },
  {
    name: "Botley Meadows",
    label: "Botley Meadows (85 ha, Pasture)",
    catchment: "Solent",
    totalArea: 85,
    currentLandUse: "Dairy Pasture",
    soilType: "Alluvial",
    stockingDensity: 2.0,
    fertiliserRate: 150,
    proposedLandUse: "Extensive Grassland",
    proposedStockingDensity: 0.3,
    proposedFertiliserRate: 0,
    bufferStripWidth: 6,
  },
]

// ─── Component ─────────────────────────────────────────────────────────────────

export default function NutrientModellerPage() {
  // Site parameters — current state
  const [activePreset, setActivePreset] = useState("custom")
  const [siteName, setSiteName] = useState("New Site Assessment")
  const [catchment, setCatchment] = useState<Catchment>("Solent")
  const [totalArea, setTotalArea] = useState(50)
  const [currentLandUse, setCurrentLandUse] = useState<CurrentLandUse>("Arable")
  const [soilType, setSoilType] = useState<SoilType>("Clay")
  const [stockingDensity, setStockingDensity] = useState(1.5)
  const [fertiliserRate, setFertiliserRate] = useState(200)

  // Site parameters — proposed change
  const [proposedLandUse, setProposedLandUse] = useState<ProposedLandUse>("Extensive Grassland")
  const [proposedStockingDensity, setProposedStockingDensity] = useState(0.3)
  const [proposedFertiliserRate, setProposedFertiliserRate] = useState(0)
  const [areaToConvert, setAreaToConvert] = useState(50)
  const [bufferStripWidth, setBufferStripWidth] = useState(6)

  // Scenarios
  const [scenarios, setScenarios] = useState<(Scenario | null)[]>([null, null, null])

  // ─── Derived calculations ──────────────────────────────────────────────────

  const baselineRate = useMemo(
    () =>
      getLoadingRate(
        currentLandUse,
        fertiliserRate,
        IS_PASTURE(currentLandUse) ? stockingDensity : 0,
        true
      ),
    [currentLandUse, fertiliserRate, stockingDensity]
  )

  const proposedRate = useMemo(
    () =>
      getLoadingRate(
        proposedLandUse,
        proposedFertiliserRate,
        IS_PROPOSED_GRASSLAND(proposedLandUse) ? proposedStockingDensity : 0,
        false
      ),
    [proposedLandUse, proposedFertiliserRate, proposedStockingDensity]
  )

  const baselineLoading = useMemo(
    () => areaToConvert * baselineRate,
    [areaToConvert, baselineRate]
  )

  const proposedLoading = useMemo(
    () => areaToConvert * proposedRate,
    [areaToConvert, proposedRate]
  )

  const creditYield = useMemo(
    () => Math.max(0, baselineLoading - proposedLoading),
    [baselineLoading, proposedLoading]
  )

  const bufferBonus = useMemo(
    () => (bufferStripWidth > 0 ? (bufferStripWidth / 100) * areaToConvert * 2 : 0),
    [bufferStripWidth, areaToConvert]
  )

  const totalCreditYield = useMemo(
    () => creditYield + bufferBonus,
    [creditYield, bufferBonus]
  )

  const conservativeValue = useMemo(
    () => totalCreditYield * CONSERVATIVE_PRICE,
    [totalCreditYield]
  )

  const marketValue = useMemo(
    () => totalCreditYield * MARKET_PRICE,
    [totalCreditYield]
  )

  const conservativeCommission = conservativeValue * COMMISSION_RATE
  const marketCommission = marketValue * COMMISSION_RATE

  // ─── Preset loading ───────────────────────────────────────────────────────

  const loadPreset = useCallback((presetId: string) => {
    setActivePreset(presetId)
    if (presetId === "custom") {
      setSiteName("New Site Assessment")
      setCatchment("Solent")
      setTotalArea(50)
      setCurrentLandUse("Arable")
      setSoilType("Clay")
      setStockingDensity(1.5)
      setFertiliserRate(200)
      setProposedLandUse("Extensive Grassland")
      setProposedStockingDensity(0.3)
      setProposedFertiliserRate(0)
      setAreaToConvert(50)
      setBufferStripWidth(6)
      return
    }
    const idx = parseInt(presetId, 10)
    const preset = PRESETS[idx]
    if (!preset) return
    setSiteName(preset.name)
    setCatchment(preset.catchment)
    setTotalArea(preset.totalArea)
    setCurrentLandUse(preset.currentLandUse)
    setSoilType(preset.soilType)
    setStockingDensity(preset.stockingDensity)
    setFertiliserRate(preset.fertiliserRate)
    setProposedLandUse(preset.proposedLandUse)
    setProposedStockingDensity(preset.proposedStockingDensity)
    setProposedFertiliserRate(preset.proposedFertiliserRate)
    setAreaToConvert(preset.totalArea)
    setBufferStripWidth(preset.bufferStripWidth)
  }, [])

  // When current land use changes, update default fertiliser rate
  const handleCurrentLandUseChange = useCallback((value: CurrentLandUse) => {
    setCurrentLandUse(value)
    setFertiliserRate(DEFAULT_FERTILISER_RATES[value])
    if (!IS_PASTURE(value)) {
      setStockingDensity(0)
    } else {
      setStockingDensity(1.5)
    }
    setActivePreset("custom")
  }, [])

  // Keep areaToConvert bounded by totalArea
  const handleTotalAreaChange = useCallback(
    (newTotal: number) => {
      setTotalArea(newTotal)
      if (areaToConvert > newTotal) {
        setAreaToConvert(newTotal)
      }
      setActivePreset("custom")
    },
    [areaToConvert]
  )

  // Save scenario
  const saveScenario = useCallback(
    (index: number) => {
      const scenario: Scenario = {
        label: `Scenario ${String.fromCharCode(65 + index)}`,
        siteName,
        currentLandUse,
        proposedLandUse,
        areaToConvert,
        totalArea,
        baselineLoading,
        proposedLoading,
        creditYield: totalCreditYield,
        totalCreditYield,
        conservativeValue,
        marketValue,
      }
      setScenarios((prev) => {
        const updated = [...prev]
        updated[index] = scenario
        return updated
      })
      toast.success(`Scenario ${String.fromCharCode(65 + index)} saved`)
    },
    [
      siteName,
      currentLandUse,
      proposedLandUse,
      areaToConvert,
      totalArea,
      baselineLoading,
      proposedLoading,
      totalCreditYield,
      conservativeValue,
      marketValue,
    ]
  )

  // Best scenario
  const bestScenarioIdx = useMemo(() => {
    let bestIdx = -1
    let bestYield = -1
    scenarios.forEach((s, i) => {
      if (s && s.totalCreditYield > bestYield) {
        bestYield = s.totalCreditYield
        bestIdx = i
      }
    })
    return bestIdx
  }, [scenarios])

  // ─── What-if area markers ──────────────────────────────────────────────────

  const areaMarkers = useMemo(() => {
    if (totalArea <= 0) return []
    return [
      { pct: 25, value: Math.round(totalArea * 0.25), label: "25%" },
      { pct: 50, value: Math.round(totalArea * 0.5), label: "50%" },
      { pct: 75, value: Math.round(totalArea * 0.75), label: "75%" },
      { pct: 100, value: totalArea, label: "100%" },
    ]
  }, [totalArea])

  // Financial range bar width
  const rangeBarPct = useMemo(() => {
    if (marketValue <= 0) return { left: 0, width: 0 }
    const maxVal = marketValue * 1.15
    return {
      left: (conservativeValue / maxVal) * 100,
      width: ((marketValue - conservativeValue) / maxVal) * 100,
    }
  }, [conservativeValue, marketValue])

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/admin/brokerage-mockups/assessments"
          className="hover:text-foreground transition-colors"
        >
          Assessments
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Nutrient Budget Modeller</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/40">
            <Sprout className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Nutrient Budget Modeller
            </h1>
            <p className="text-sm text-muted-foreground">
              Model land use change scenarios to estimate nutrient credit yield
            </p>
          </div>
        </div>
        <Link href="/admin/brokerage-mockups/assessments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      {/* Section 6: Pre-loaded Example Sites (tabs at top) */}
      <Tabs value={activePreset} onValueChange={loadPreset}>
        <TabsList>
          {PRESETS.map((p, i) => (
            <TabsTrigger key={i} value={String(i)}>
              {p.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Section 1: Site Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            Site Parameters
          </CardTitle>
          <CardDescription>
            Configure current and proposed land use to model the nutrient credit yield
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Left column — Current State */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-500" />
                Current State
              </h3>

              <div className="space-y-2">
                <Label>Site Name</Label>
                <Input
                  value={siteName}
                  onChange={(e) => {
                    setSiteName(e.target.value)
                    setActivePreset("custom")
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catchment</Label>
                  <Select
                    value={catchment}
                    onValueChange={(v) => {
                      setCatchment(v as Catchment)
                      setActivePreset("custom")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solent">Solent</SelectItem>
                      <SelectItem value="Test Valley">Test Valley</SelectItem>
                      <SelectItem value="Stour">Stour</SelectItem>
                      <SelectItem value="Exe">Exe</SelectItem>
                      <SelectItem value="Tees">Tees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Soil Type</Label>
                  <Select
                    value={soilType}
                    onValueChange={(v) => {
                      setSoilType(v as SoilType)
                      setActivePreset("custom")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Clay">Clay</SelectItem>
                      <SelectItem value="Sandy Loam">Sandy Loam</SelectItem>
                      <SelectItem value="Chalk">Chalk</SelectItem>
                      <SelectItem value="Alluvial">Alluvial</SelectItem>
                      <SelectItem value="Peat">Peat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Total Area</Label>
                  <span className="text-sm font-medium text-foreground">
                    {totalArea} ha
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[totalArea]}
                    min={1}
                    max={200}
                    step={1}
                    onValueChange={([v]) => handleTotalAreaChange(v)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={totalArea}
                    min={1}
                    max={200}
                    onChange={(e) =>
                      handleTotalAreaChange(
                        Math.max(1, Math.min(200, Number(e.target.value) || 1))
                      )
                    }
                    className="w-20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Current Land Use</Label>
                <Select
                  value={currentLandUse}
                  onValueChange={(v) => handleCurrentLandUseChange(v as CurrentLandUse)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arable">Arable</SelectItem>
                    <SelectItem value="Dairy Pasture">Dairy Pasture</SelectItem>
                    <SelectItem value="Beef/Sheep Pasture">Beef/Sheep Pasture</SelectItem>
                    <SelectItem value="Intensive Grassland">Intensive Grassland</SelectItem>
                    <SelectItem value="Mixed Farming">Mixed Farming</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {IS_PASTURE(currentLandUse) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Current Stocking Density</Label>
                    <span className="text-sm font-medium text-foreground">
                      {stockingDensity.toFixed(1)} LU/ha
                    </span>
                  </div>
                  <Slider
                    value={[stockingDensity]}
                    min={0}
                    max={3}
                    step={0.1}
                    onValueChange={([v]) => {
                      setStockingDensity(v)
                      setActivePreset("custom")
                    }}
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Current Fertiliser Rate</Label>
                  <span className="text-sm font-medium text-foreground">
                    {fertiliserRate} kg N/ha/yr
                  </span>
                </div>
                <Slider
                  value={[fertiliserRate]}
                  min={0}
                  max={300}
                  step={10}
                  onValueChange={([v]) => {
                    setFertiliserRate(v)
                    setActivePreset("custom")
                  }}
                />
              </div>
            </div>

            {/* Vertical separator on desktop */}
            <div className="hidden lg:block lg:border-l lg:border-border lg:pl-8">
              {/* Right column — Proposed Change */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Proposed Change
                </h3>

                <div className="space-y-2">
                  <Label>Proposed Land Use</Label>
                  <Select
                    value={proposedLandUse}
                    onValueChange={(v) => {
                      setProposedLandUse(v as ProposedLandUse)
                      setActivePreset("custom")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Extensive Grassland">Extensive Grassland</SelectItem>
                      <SelectItem value="Permanent Grassland">Permanent Grassland</SelectItem>
                      <SelectItem value="Woodland">Woodland</SelectItem>
                      <SelectItem value="Wetland/Reedbed">Wetland/Reedbed</SelectItem>
                      <SelectItem value="Species-rich Meadow">Species-rich Meadow</SelectItem>
                      <SelectItem value="Riparian Buffer">Riparian Buffer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {IS_PROPOSED_GRASSLAND(proposedLandUse) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Proposed Stocking Density</Label>
                      <span className="text-sm font-medium text-foreground">
                        {proposedStockingDensity.toFixed(1)} LU/ha
                      </span>
                    </div>
                    <Slider
                      value={[proposedStockingDensity]}
                      min={0}
                      max={1}
                      step={0.1}
                      onValueChange={([v]) => {
                        setProposedStockingDensity(v)
                        setActivePreset("custom")
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Proposed Fertiliser Rate</Label>
                    <span className="text-sm font-medium text-foreground">
                      {proposedFertiliserRate} kg N/ha/yr
                    </span>
                  </div>
                  <Slider
                    value={[proposedFertiliserRate]}
                    min={0}
                    max={50}
                    step={5}
                    onValueChange={([v]) => {
                      setProposedFertiliserRate(v)
                      setActivePreset("custom")
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Area to Convert</Label>
                    <span className="text-sm font-medium text-foreground">
                      {areaToConvert} ha
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        / {totalArea} ha
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[areaToConvert]}
                      min={1}
                      max={totalArea}
                      step={1}
                      onValueChange={([v]) => {
                        setAreaToConvert(v)
                        setActivePreset("custom")
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={areaToConvert}
                      min={1}
                      max={totalArea}
                      onChange={(e) => {
                        setAreaToConvert(
                          Math.max(1, Math.min(totalArea, Number(e.target.value) || 1))
                        )
                        setActivePreset("custom")
                      }}
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Buffer Strip Width</Label>
                    <span className="text-sm font-medium text-foreground">
                      {bufferStripWidth}m
                    </span>
                  </div>
                  <Slider
                    value={[bufferStripWidth]}
                    min={0}
                    max={20}
                    step={1}
                    onValueChange={([v]) => {
                      setBufferStripWidth(v)
                      setActivePreset("custom")
                    }}
                  />
                  {bufferBonus > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Buffer strip adds +{formatNumber(bufferBonus, 1)} kg N/yr credit bonus
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile: right column without border */}
            <div className="lg:hidden">
              <Separator className="mb-5" />
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Proposed Change
                </h3>

                <div className="space-y-2">
                  <Label>Proposed Land Use</Label>
                  <Select
                    value={proposedLandUse}
                    onValueChange={(v) => {
                      setProposedLandUse(v as ProposedLandUse)
                      setActivePreset("custom")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Extensive Grassland">Extensive Grassland</SelectItem>
                      <SelectItem value="Permanent Grassland">Permanent Grassland</SelectItem>
                      <SelectItem value="Woodland">Woodland</SelectItem>
                      <SelectItem value="Wetland/Reedbed">Wetland/Reedbed</SelectItem>
                      <SelectItem value="Species-rich Meadow">Species-rich Meadow</SelectItem>
                      <SelectItem value="Riparian Buffer">Riparian Buffer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {IS_PROPOSED_GRASSLAND(proposedLandUse) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Proposed Stocking Density</Label>
                      <span className="text-sm font-medium text-foreground">
                        {proposedStockingDensity.toFixed(1)} LU/ha
                      </span>
                    </div>
                    <Slider
                      value={[proposedStockingDensity]}
                      min={0}
                      max={1}
                      step={0.1}
                      onValueChange={([v]) => {
                        setProposedStockingDensity(v)
                        setActivePreset("custom")
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Proposed Fertiliser Rate</Label>
                    <span className="text-sm font-medium text-foreground">
                      {proposedFertiliserRate} kg N/ha/yr
                    </span>
                  </div>
                  <Slider
                    value={[proposedFertiliserRate]}
                    min={0}
                    max={50}
                    step={5}
                    onValueChange={([v]) => {
                      setProposedFertiliserRate(v)
                      setActivePreset("custom")
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Area to Convert</Label>
                    <span className="text-sm font-medium text-foreground">
                      {areaToConvert} ha
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        / {totalArea} ha
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[areaToConvert]}
                      min={1}
                      max={totalArea}
                      step={1}
                      onValueChange={([v]) => {
                        setAreaToConvert(v)
                        setActivePreset("custom")
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={areaToConvert}
                      min={1}
                      max={totalArea}
                      onChange={(e) => {
                        setAreaToConvert(
                          Math.max(1, Math.min(totalArea, Number(e.target.value) || 1))
                        )
                        setActivePreset("custom")
                      }}
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Buffer Strip Width</Label>
                    <span className="text-sm font-medium text-foreground">
                      {bufferStripWidth}m
                    </span>
                  </div>
                  <Slider
                    value={[bufferStripWidth]}
                    min={0}
                    max={20}
                    step={1}
                    onValueChange={([v]) => {
                      setBufferStripWidth(v)
                      setActivePreset("custom")
                    }}
                  />
                  {bufferBonus > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Buffer strip adds +{formatNumber(bufferBonus, 1)} kg N/yr credit bonus
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Live Calculation Display */}
      <Card className="border-2 border-green-200 dark:border-green-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            Live Calculation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Three large stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Baseline Loading */}
            <div className="rounded-xl border border-border bg-muted/50 p-5 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Baseline Loading
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground transition-all duration-300">
                {formatNumber(baselineLoading, 0)}
                <span className="text-lg font-normal text-muted-foreground ml-1">
                  kg N/yr
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {areaToConvert} ha x {formatNumber(baselineRate, 1)} kg N/ha/yr
              </p>
            </div>

            {/* Proposed Loading */}
            <div className="rounded-xl border border-border bg-muted/50 p-5 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Proposed Loading
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground transition-all duration-300">
                {formatNumber(proposedLoading, 0)}
                <span className="text-lg font-normal text-muted-foreground ml-1">
                  kg N/yr
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {areaToConvert} ha x {formatNumber(proposedRate, 1)} kg N/ha/yr
              </p>
            </div>

            {/* Net Credit Yield */}
            <div className="rounded-xl border-2 border-green-300 bg-green-50 p-5 text-center dark:border-green-800 dark:bg-green-950/30">
              <p className="text-xs font-medium uppercase tracking-wide text-green-700 dark:text-green-400">
                Net Credit Yield
              </p>
              <p className="mt-2 text-3xl font-bold text-green-700 dark:text-green-400 transition-all duration-300">
                {formatNumber(totalCreditYield, 1)}
                <span className="text-lg font-normal ml-1">kg N/yr</span>
              </p>
              {bufferBonus > 0 && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-500">
                  incl. {formatNumber(bufferBonus, 1)} buffer bonus
                </p>
              )}
            </div>
          </div>

          {/* Calculation breakdown */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>
                  Baseline: {areaToConvert} ha x {formatNumber(baselineRate, 1)} kg N/ha/yr
                </span>
                <span className="font-medium text-foreground">
                  = {formatNumber(baselineLoading, 1)} kg N/yr
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>
                  Proposed: {areaToConvert} ha x {formatNumber(proposedRate, 1)} kg N/ha/yr
                </span>
                <span className="font-medium text-foreground">
                  = {formatNumber(proposedLoading, 1)} kg N/yr
                </span>
              </div>
              {bufferBonus > 0 && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>
                    Buffer: {bufferStripWidth}m strip x {areaToConvert} ha
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    + {formatNumber(bufferBonus, 1)} kg N/yr
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between font-semibold text-green-700 dark:text-green-400">
                <span>Net Credit Yield:</span>
                <span>{formatNumber(totalCreditYield, 1)} kg N/yr</span>
              </div>
            </div>
          </div>

          {/* Financial Estimate */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Financial Estimate
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">
                  Conservative ({formatCurrency(CONSERVATIVE_PRICE)}/kg)
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground transition-all duration-300">
                  {formatCurrency(conservativeValue)}
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">
                  Market Rate ({formatCurrency(MARKET_PRICE)}/kg)
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground transition-all duration-300">
                  {formatCurrency(marketValue)}
                </p>
              </div>
            </div>

            {/* Range bar */}
            <div className="space-y-2">
              <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-emerald-400 to-green-600 transition-all duration-300"
                  style={{
                    left: `${Math.max(0, rangeBarPct.left - 2)}%`,
                    width: `${Math.min(100, rangeBarPct.width + 4)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(conservativeValue)}</span>
                <span>{formatCurrency(marketValue)}</span>
              </div>
            </div>

            {/* Commission estimate */}
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-sm text-muted-foreground">
                At {(COMMISSION_RATE * 100).toFixed(0)}% commission:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(conservativeCommission)} &ndash;{" "}
                  {formatCurrency(marketCommission)}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: What-If Slider (THE demo feature) */}
      <Card className="border-2 border-blue-200 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-500" />
            What-If: Area to Convert
          </CardTitle>
          <CardDescription>
            Drag the slider to see how conversion area affects credit yield and value in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Large slider */}
          <div className="space-y-6 px-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">0 ha</span>
              <span className="text-lg font-bold text-foreground">
                {areaToConvert} ha
              </span>
              <span className="text-sm text-muted-foreground">{totalArea} ha</span>
            </div>

            <Slider
              value={[areaToConvert]}
              min={0}
              max={totalArea}
              step={1}
              onValueChange={([v]) => setAreaToConvert(Math.max(0, v))}
              className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6"
            />

            {/* Markers */}
            <div className="relative h-6">
              {areaMarkers.map((m) => (
                <button
                  key={m.pct}
                  onClick={() => setAreaToConvert(m.value)}
                  className="absolute -translate-x-1/2 text-center group"
                  style={{ left: `${m.pct}%` }}
                >
                  <div className="h-2 w-px bg-muted-foreground/40 mx-auto" />
                  <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                    {m.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Inline live readout */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Credit Yield</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-400 transition-all duration-300">
                  {formatNumber(totalCreditYield, 1)} kg
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Conservative</p>
                <p className="text-lg font-bold text-foreground transition-all duration-300">
                  {formatCurrency(conservativeValue)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Market Rate</p>
                <p className="text-lg font-bold text-foreground transition-all duration-300">
                  {formatCurrency(marketValue)}
                </p>
              </div>
            </div>

            {/* Conversion label */}
            <div className="flex justify-center">
              <Badge variant="secondary" className="text-xs">
                {areaToConvert === 0
                  ? "No conversion"
                  : areaToConvert < totalArea * 0.3
                    ? "Partial conversion"
                    : areaToConvert < totalArea * 0.7
                      ? "Moderate conversion"
                      : areaToConvert < totalArea
                        ? "Major conversion"
                        : "Full conversion"}
                {" "}
                &mdash; {totalArea > 0 ? Math.round((areaToConvert / totalArea) * 100) : 0}%
                of site
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Scenario Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TreeDeciduous className="h-5 w-5 text-muted-foreground" />
            Scenario Comparison
          </CardTitle>
          <CardDescription>
            Save up to 3 scenarios and compare side by side
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => {
              const scenario = scenarios[i]
              const isBest = i === bestScenarioIdx
              return (
                <div
                  key={i}
                  className={`rounded-xl border-2 p-4 transition-colors ${
                    isBest
                      ? "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-foreground">
                      Scenario {String.fromCharCode(65 + i)}
                    </h4>
                    <div className="flex items-center gap-1">
                      {isBest && scenario && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800 text-[10px]">
                          Best
                        </Badge>
                      )}
                      {scenario && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setScenarios((prev) => {
                              const updated = [...prev]
                              updated[i] = null
                              return updated
                            })
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {scenario ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Land use</span>
                        <span className="text-foreground font-medium text-right text-xs">
                          {scenario.currentLandUse} <ArrowRight className="inline h-3 w-3" />{" "}
                          {scenario.proposedLandUse}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Area</span>
                        <span className="text-foreground font-medium">
                          {scenario.areaToConvert} / {scenario.totalArea} ha
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Credit yield</span>
                        <span className="font-bold text-green-700 dark:text-green-400">
                          {formatNumber(scenario.totalCreditYield, 1)} kg N/yr
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Value range</span>
                        <span className="text-foreground text-xs">
                          {formatCurrency(scenario.conservativeValue)} &ndash;{" "}
                          {formatCurrency(scenario.marketValue)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-xs text-muted-foreground mb-3">
                        No scenario saved
                      </p>
                    </div>
                  )}

                  <Button
                    variant={scenario ? "outline" : "default"}
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => saveScenario(i)}
                  >
                    <Save className="mr-2 h-3.5 w-3.5" />
                    {scenario
                      ? `Update Scenario ${String.fromCharCode(65 + i)}`
                      : `Save as Scenario ${String.fromCharCode(65 + i)}`}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Output Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                toast.success(`Assessment brief generated for ${siteName}`)
              }
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Assessment Brief
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast.success(
                  `Site S-0010 created in ${catchment} catchment \u2014 ${formatNumber(totalCreditYield, 1)} kg N/yr yield`
                )
              }
            >
              <Sprout className="mr-2 h-4 w-4" />
              Create Site Record
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.success("Nutrient budget exported")}
            >
              <Save className="mr-2 h-4 w-4" />
              Export to PDF
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast.success("Summary sent to landowner portal")
              }
            >
              <Send className="mr-2 h-4 w-4" />
              Share with Landowner
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                loadPreset("custom")
                toast("Form reset to defaults")
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
