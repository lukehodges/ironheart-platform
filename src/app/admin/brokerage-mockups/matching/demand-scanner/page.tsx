"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import Map, {
  Marker,
  Source,
  Layer,
  NavigationControl,
} from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  MapPin,
  Search,
  Target,
  Building2,
  TreeDeciduous,
  Droplets,
  ArrowRight,
  Plus,
  Download,
  FileText,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import { sites } from "../../_mock-data"

// ---------------------------------------------------------------------------
// Map style (OSM tiles)
// ---------------------------------------------------------------------------

const MAP_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster" as const,
      source: "osm",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

// ---------------------------------------------------------------------------
// Mock planning applications
// ---------------------------------------------------------------------------

interface PlanningApplication {
  id: string
  ref: string
  name: string
  developer: string
  lpa: string
  type: string
  units: number
  status: string
  lat: number
  lng: number
  estimatedBNGUnits: number
  estimatedNitrogenKg: number
  expectedStart: string
}

const PLANNING_APPLICATIONS: PlanningApplication[] = [
  {
    id: "PA-001",
    ref: "F/24/93847",
    name: "Solent Gateway Phase 2",
    developer: "Barratt Homes",
    lpa: "Fareham",
    type: "Major Residential",
    units: 245,
    status: "Outline Approved",
    lat: 50.865,
    lng: -1.21,
    estimatedBNGUnits: 32,
    estimatedNitrogenKg: 65,
    expectedStart: "Q3 2026",
  },
  {
    id: "PA-002",
    ref: "E/25/00142",
    name: "Botley Village Extension",
    developer: "Taylor Wimpey",
    lpa: "Eastleigh",
    type: "Full Application",
    units: 180,
    status: "Under Consideration",
    lat: 50.92,
    lng: -1.27,
    estimatedBNGUnits: 24,
    estimatedNitrogenKg: 48,
    expectedStart: "Q1 2027",
  },
  {
    id: "PA-003",
    ref: "W/24/02891",
    name: "Winchester Meadows",
    developer: "Persimmon Homes",
    lpa: "Winchester",
    type: "Major Residential",
    units: 420,
    status: "Pre-Application",
    lat: 51.065,
    lng: -1.32,
    estimatedBNGUnits: 55,
    estimatedNitrogenKg: 112,
    expectedStart: "Q4 2026",
  },
  {
    id: "PA-004",
    ref: "F/25/00089",
    name: "Portchester Heights",
    developer: "Bellway",
    lpa: "Fareham",
    type: "Reserved Matters",
    units: 95,
    status: "Approved",
    lat: 50.85,
    lng: -1.12,
    estimatedBNGUnits: 12,
    estimatedNitrogenKg: 25,
    expectedStart: "Q2 2026",
  },
  {
    id: "PA-005",
    ref: "E/25/00256",
    name: "Hedge End Gateway",
    developer: "Cala Homes",
    lpa: "Eastleigh",
    type: "Major Residential",
    units: 310,
    status: "Under Consideration",
    lat: 50.91,
    lng: -1.29,
    estimatedBNGUnits: 41,
    estimatedNitrogenKg: 83,
    expectedStart: "Q2 2027",
  },
  {
    id: "PA-006",
    ref: "TV/25/00034",
    name: "Andover Business Park",
    developer: "St. Modwen",
    lpa: "Test Valley",
    type: "Commercial",
    units: 0,
    status: "Outline Approved",
    lat: 51.21,
    lng: -1.48,
    estimatedBNGUnits: 18,
    estimatedNitrogenKg: 0,
    expectedStart: "Q3 2026",
  },
  {
    id: "PA-007",
    ref: "NF/24/01567",
    name: "Totton Riverside",
    developer: "Redrow",
    lpa: "New Forest",
    type: "Major Residential",
    units: 150,
    status: "Under Consideration",
    lat: 50.92,
    lng: -1.48,
    estimatedBNGUnits: 20,
    estimatedNitrogenKg: 40,
    expectedStart: "Q1 2027",
  },
  {
    id: "PA-008",
    ref: "F/25/00198",
    name: "Whiteley Green",
    developer: "Taylor Wimpey",
    lpa: "Fareham",
    type: "Full Application",
    units: 200,
    status: "Approved",
    lat: 50.88,
    lng: -1.25,
    estimatedBNGUnits: 26,
    estimatedNitrogenKg: 53,
    expectedStart: "Q3 2026",
  },
]

// ---------------------------------------------------------------------------
// Utility: haversine distance
// ---------------------------------------------------------------------------

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---------------------------------------------------------------------------
// Utility: create circle GeoJSON
// ---------------------------------------------------------------------------

function createCircleGeoJSON(
  center: [number, number],
  radiusKm: number,
): GeoJSON.Feature {
  const points = 64
  const coords: [number, number][] = []
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const dx =
      radiusKm / (111.32 * Math.cos((center[1] * Math.PI) / 180))
    const dy = radiusKm / 110.574
    coords.push([
      center[0] + dx * Math.cos(angle),
      center[1] + dy * Math.sin(angle),
    ])
  }
  coords.push(coords[0]) // close the ring
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  }
}

// ---------------------------------------------------------------------------
// Radius options
// ---------------------------------------------------------------------------

const RADIUS_OPTIONS = [5, 10, 15, 25] as const

// ---------------------------------------------------------------------------
// Aggregate totals for the database
// ---------------------------------------------------------------------------

const TOTAL_BNG_DEMAND = PLANNING_APPLICATIONS.reduce(
  (s, pa) => s + pa.estimatedBNGUnits,
  0,
)
const TOTAL_NITROGEN_DEMAND = PLANNING_APPLICATIONS.reduce(
  (s, pa) => s + pa.estimatedNitrogenKg,
  0,
)

// ---------------------------------------------------------------------------
// Status color mapping for planning applications
// ---------------------------------------------------------------------------

const PA_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  Approved: "default",
  "Outline Approved": "default",
  "Under Consideration": "secondary",
  "Pre-Application": "outline",
  "Reserved Matters": "default",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DemandScannerPage() {
  const [scanCenter, setScanCenter] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [radiusKm, setRadiusKm] = useState<number>(10)
  const [expandedPA, setExpandedPA] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  // Handle map click -- place scan center
  const handleMapClick = useCallback(
    (e: { lngLat: { lat: number; lng: number } }) => {
      setIsScanning(true)
      setScanCenter({ lat: e.lngLat.lat, lng: e.lngLat.lng })
      // Brief fake scan delay
      setTimeout(() => setIsScanning(false), 600)
    },
    [],
  )

  // Circle GeoJSON
  const circleGeoJSON = useMemo(() => {
    if (!scanCenter) return null
    return createCircleGeoJSON(
      [scanCenter.lng, scanCenter.lat],
      radiusKm,
    )
  }, [scanCenter, radiusKm])

  // Filter planning applications within radius
  const nearbyPAs = useMemo(() => {
    if (!scanCenter) return []
    return PLANNING_APPLICATIONS.map((pa) => ({
      ...pa,
      distance: haversineDistance(
        scanCenter.lat,
        scanCenter.lng,
        pa.lat,
        pa.lng,
      ),
    }))
      .filter((pa) => pa.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
  }, [scanCenter, radiusKm])

  // Filter supply sites within radius
  const nearbySites = useMemo(() => {
    if (!scanCenter) return []
    return sites
      .map((s) => ({
        ...s,
        distance: haversineDistance(
          scanCenter.lat,
          scanCenter.lng,
          s.lat,
          s.lng,
        ),
      }))
      .filter((s) => s.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
  }, [scanCenter, radiusKm])

  // Demand totals in radius
  const demandBNG = useMemo(
    () => nearbyPAs.reduce((s, pa) => s + pa.estimatedBNGUnits, 0),
    [nearbyPAs],
  )
  const demandNitrogen = useMemo(
    () => nearbyPAs.reduce((s, pa) => s + pa.estimatedNitrogenKg, 0),
    [nearbyPAs],
  )

  // Supply totals in radius
  const supplyBNG = useMemo(
    () =>
      nearbySites
        .filter((s) => s.unitType === "BNG")
        .reduce((sum, s) => sum + s.available, 0),
    [nearbySites],
  )
  const supplyNitrogen = useMemo(
    () =>
      nearbySites
        .filter((s) => s.unitType === "Nitrogen")
        .reduce((sum, s) => sum + s.available, 0),
    [nearbySites],
  )

  const bngGap = supplyBNG - demandBNG
  const nitrogenGap = supplyNitrogen - demandNitrogen

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Left panel: Map (55%) ── */}
      <div className="relative w-[55%] h-full">
        <Map
          initialViewState={{
            longitude: -1.3,
            latitude: 50.92,
            zoom: 11,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE}
          attributionControl={{ compact: true }}
          onClick={handleMapClick}
          cursor="crosshair"
        >
          <NavigationControl position="top-right" />

          {/* Radius circle */}
          {circleGeoJSON && (
            <Source
              id="scan-radius"
              type="geojson"
              data={circleGeoJSON}
            >
              <Layer
                id="scan-radius-fill"
                type="fill"
                paint={{
                  "fill-color": "#3b82f6",
                  "fill-opacity": 0.1,
                }}
              />
              <Layer
                id="scan-radius-line"
                type="line"
                paint={{
                  "line-color": "#3b82f6",
                  "line-width": 2,
                  "line-opacity": 0.7,
                  "line-dasharray": [4, 3] as unknown as number[],
                }}
              />
            </Source>
          )}

          {/* Supply site markers (green) */}
          {sites.map((site) => (
            <Marker
              key={site.ref}
              longitude={site.lng}
              latitude={site.lat}
              anchor="center"
            >
              <div
                className="flex items-center justify-center rounded-full border-2 border-white shadow-md"
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: "#22c55e",
                }}
              >
                <TreeDeciduous
                  className="text-white"
                  style={{ width: 10, height: 10 }}
                />
              </div>
            </Marker>
          ))}

          {/* Planning application markers (blue) */}
          {PLANNING_APPLICATIONS.map((pa) => (
            <Marker
              key={pa.id}
              longitude={pa.lng}
              latitude={pa.lat}
              anchor="center"
            >
              <div
                className="flex items-center justify-center rounded-full border-2 border-white shadow-md"
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: "#3b82f6",
                }}
              >
                <Building2
                  className="text-white"
                  style={{ width: 10, height: 10 }}
                />
              </div>
            </Marker>
          ))}

          {/* Scan center marker (orange) */}
          {scanCenter && (
            <Marker
              longitude={scanCenter.lng}
              latitude={scanCenter.lat}
              anchor="center"
            >
              <div className="relative">
                <span className="absolute inset-0 -m-3 rounded-full animate-ping opacity-20 bg-orange-500" />
                <div
                  className="flex items-center justify-center rounded-full border-2 border-white shadow-lg"
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: "#f97316",
                  }}
                >
                  <Target
                    className="text-white"
                    style={{ width: 14, height: 14 }}
                  />
                </div>
              </div>
            </Marker>
          )}
        </Map>

        {/* Map legend */}
        <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur rounded-lg border border-border px-3 py-2 text-[10px] flex flex-col gap-1.5 pointer-events-none">
          <span className="font-semibold text-foreground text-[11px]">
            Legend
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-muted-foreground">Scan Centre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">
              Planning Application
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Supply Site</span>
          </div>
        </div>

        {/* Radius controls */}
        <div className="absolute top-3 left-3 bg-card/90 backdrop-blur rounded-lg border border-border px-3 py-2.5 flex items-center gap-2">
          <span className="text-xs font-medium text-foreground mr-1">
            Radius:
          </span>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRadiusKm(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                radiusKm === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {r}km
            </button>
          ))}
        </div>

        {/* Scanning indicator */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm pointer-events-none">
            <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-4 py-3 shadow-lg">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">
                Scanning catchment area...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel: Results (45%) ── */}
      <div className="w-[45%] h-full border-l border-border overflow-y-auto bg-muted/30">
        <div className="p-5 space-y-5">
          {/* Back link */}
          <Link
            href="/admin/brokerage-mockups/matching"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Matching
          </Link>

          {/* Header */}
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <Search className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                Demand Scanner
              </h1>
            </div>
            <p className="text-sm text-muted-foreground ml-[42px]">
              Click the map to place a development site and scan for
              nearby credit demand and supply.
            </p>
          </div>

          <Separator />

          {/* ── Before click: instructions + aggregate stats ── */}
          {!scanCenter && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-5">
                  <div className="flex flex-col items-center text-center py-6 space-y-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                      <MapPin className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Click anywhere on the map
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Place a scan centre to identify planning
                        applications and available credit supply within
                        your chosen radius.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Database Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/60 p-3 text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {PLANNING_APPLICATIONS.length}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        Planning Applications
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-3 text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {TOTAL_BNG_DEMAND}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        BNG Demand (HUs)
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-3 text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {TOTAL_NITROGEN_DEMAND}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        Nitrogen Demand (kg/yr)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── After click: scan results ── */}
          {scanCenter && !isScanning && (
            <div className="space-y-4">
              {/* Section 1: Scan Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4 text-orange-500" />
                    Scan Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="text-muted-foreground">Centre</div>
                    <div className="text-foreground font-medium tabular-nums text-right">
                      {scanCenter.lat.toFixed(4)},{" "}
                      {scanCenter.lng.toFixed(4)}
                    </div>
                    <div className="text-muted-foreground">Radius</div>
                    <div className="text-foreground font-medium text-right">
                      {radiusKm} km
                    </div>
                    <div className="text-muted-foreground">
                      Planning Applications
                    </div>
                    <div className="text-foreground font-medium text-right">
                      <Badge variant="secondary" className="tabular-nums">
                        {nearbyPAs.length}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">
                      Supply Sites
                    </div>
                    <div className="text-foreground font-medium text-right">
                      <Badge variant="secondary" className="tabular-nums">
                        {nearbySites.length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 2: Demand Pipeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    Demand Pipeline
                    <Badge variant="outline" className="ml-auto tabular-nums">
                      {nearbyPAs.length} found
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nearbyPAs.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No planning applications found within {radiusKm}
                        km. Try increasing the radius.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[11px]">
                                Application
                              </TableHead>
                              <TableHead className="text-[11px] text-right">
                                Units
                              </TableHead>
                              <TableHead className="text-[11px] text-right">
                                BNG
                              </TableHead>
                              <TableHead className="text-[11px] text-right">
                                N (kg)
                              </TableHead>
                              <TableHead className="text-[11px] text-right">
                                Dist.
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {nearbyPAs.map((pa) => (
                              <>
                                <TableRow
                                  key={pa.id}
                                  className="cursor-pointer hover:bg-muted/50"
                                  onClick={() =>
                                    setExpandedPA(
                                      expandedPA === pa.id
                                        ? null
                                        : pa.id,
                                    )
                                  }
                                >
                                  <TableCell className="py-2">
                                    <div>
                                      <p className="text-xs font-medium text-foreground leading-tight">
                                        {pa.name}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {pa.ref} &middot; {pa.developer}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-xs py-2">
                                    {pa.units > 0 ? pa.units : "\u2014"}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-xs py-2">
                                    {pa.estimatedBNGUnits}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-xs py-2">
                                    {pa.estimatedNitrogenKg > 0
                                      ? pa.estimatedNitrogenKg
                                      : "\u2014"}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-xs py-2 text-muted-foreground">
                                    {pa.distance.toFixed(1)}km
                                  </TableCell>
                                </TableRow>
                                {expandedPA === pa.id && (
                                  <TableRow key={`${pa.id}-detail`}>
                                    <TableCell
                                      colSpan={5}
                                      className="bg-muted/30 py-3"
                                    >
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs px-1">
                                        <div className="text-muted-foreground">
                                          LPA
                                        </div>
                                        <div className="text-foreground">
                                          {pa.lpa}
                                        </div>
                                        <div className="text-muted-foreground">
                                          Type
                                        </div>
                                        <div className="text-foreground">
                                          {pa.type}
                                        </div>
                                        <div className="text-muted-foreground">
                                          Status
                                        </div>
                                        <div>
                                          <Badge
                                            variant={
                                              PA_STATUS_VARIANT[
                                                pa.status
                                              ] ?? "outline"
                                            }
                                            className="text-[10px]"
                                          >
                                            {pa.status}
                                          </Badge>
                                        </div>
                                        <div className="text-muted-foreground">
                                          Dwelling Units
                                        </div>
                                        <div className="text-foreground tabular-nums">
                                          {pa.units > 0
                                            ? pa.units
                                            : "N/A (Commercial)"}
                                        </div>
                                        <div className="text-muted-foreground">
                                          Expected Start
                                        </div>
                                        <div className="text-foreground">
                                          {pa.expectedStart}
                                        </div>
                                        <div className="text-muted-foreground">
                                          Est. BNG Demand
                                        </div>
                                        <div className="text-foreground tabular-nums">
                                          {pa.estimatedBNGUnits} area HUs
                                        </div>
                                        <div className="text-muted-foreground">
                                          Est. Nitrogen Demand
                                        </div>
                                        <div className="text-foreground tabular-nums">
                                          {pa.estimatedNitrogenKg > 0
                                            ? `${pa.estimatedNitrogenKg} kg/yr`
                                            : "N/A"}
                                        </div>
                                      </div>
                                      <div className="mt-3 px-1">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toast.success(
                                              `Deal D-00${49 + nearbyPAs.indexOf(pa)} created for ${pa.developer}`,
                                            )
                                          }}
                                        >
                                          <Plus className="w-3 h-3 mr-1" />
                                          Create Prospect Deal
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Demand totals */}
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                        <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
                          Total Demand in Radius
                        </p>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                            <TreeDeciduous className="w-3.5 h-3.5" />
                            <span className="font-medium tabular-nums">
                              {demandBNG} area HUs
                            </span>
                            <span className="text-blue-500 dark:text-blue-500">
                              BNG
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                            <Droplets className="w-3.5 h-3.5" />
                            <span className="font-medium tabular-nums">
                              {demandNitrogen} kg/yr
                            </span>
                            <span className="text-blue-500 dark:text-blue-500">
                              Nitrogen
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 3: Available Supply */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TreeDeciduous className="w-4 h-4 text-green-500" />
                    Available Supply
                    <Badge variant="outline" className="ml-auto tabular-nums">
                      {nearbySites.length} found
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nearbySites.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No supply sites found within {radiusKm}km.
                        Try increasing the radius.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {nearbySites.map((site) => {
                        const availPct =
                          site.total > 0
                            ? Math.round(
                                (site.available / site.total) * 100,
                              )
                            : 0
                        const colorClass =
                          availPct >= 50
                            ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
                            : availPct >= 10
                              ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
                              : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                        const dotColor =
                          availPct >= 50
                            ? "bg-green-500"
                            : availPct >= 10
                              ? "bg-amber-500"
                              : "bg-red-500"

                        return (
                          <div
                            key={site.ref}
                            className={`rounded-lg border p-3 ${colorClass}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`w-2 h-2 rounded-full ${dotColor}`}
                                  />
                                  <p className="text-xs font-semibold text-foreground">
                                    {site.name}
                                  </p>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5 ml-3.5">
                                  {site.ref} &middot; {site.unitType}{" "}
                                  &middot; {site.catchment}
                                </p>
                              </div>
                              <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                                {site.distance.toFixed(1)}km away
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px] ml-3.5">
                              <div>
                                <span className="text-muted-foreground">
                                  Available
                                </span>
                                <p className="font-medium text-foreground tabular-nums">
                                  {site.availableLabel}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Total
                                </span>
                                <p className="font-medium text-foreground tabular-nums">
                                  {site.totalLabel}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Price
                                </span>
                                <p className="font-medium text-foreground tabular-nums">
                                  {site.priceLabel}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 ml-3.5">
                              <Progress
                                value={availPct}
                                className="h-1.5"
                              />
                              <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                                {availPct}% available
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section 4: Supply-Demand Gap Analysis */}
              {(nearbyPAs.length > 0 || nearbySites.length > 0) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Supply-Demand Gap Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* BNG gap */}
                    <div
                      className={`rounded-lg border p-3 ${
                        bngGap >= 0
                          ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
                          : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <TreeDeciduous className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-semibold text-foreground">
                          BNG (Area HUs)
                        </span>
                        {bngGap >= 0 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 ml-auto" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16">
                              Demand
                            </span>
                            <span className="font-medium text-foreground tabular-nums">
                              {demandBNG} HUs
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16">
                              Supply
                            </span>
                            <span className="font-medium text-foreground tabular-nums">
                              {supplyBNG} HUs
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold tabular-nums ${
                              bngGap >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {bngGap >= 0 ? "+" : ""}
                            {bngGap}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {bngGap >= 0 ? "Surplus" : "Deficit"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Nitrogen gap */}
                    <div
                      className={`rounded-lg border p-3 ${
                        nitrogenGap >= 0
                          ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
                          : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-semibold text-foreground">
                          Nitrogen (kg/yr)
                        </span>
                        {nitrogenGap >= 0 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 ml-auto" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16">
                              Demand
                            </span>
                            <span className="font-medium text-foreground tabular-nums">
                              {demandNitrogen} kg/yr
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-16">
                              Supply
                            </span>
                            <span className="font-medium text-foreground tabular-nums">
                              {supplyNitrogen} kg/yr
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-lg font-bold tabular-nums ${
                              nitrogenGap >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {nitrogenGap >= 0 ? "+" : ""}
                            {nitrogenGap}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {nitrogenGap >= 0 ? "Surplus" : "Deficit"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section 5: Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {nearbyPAs.map((pa) => (
                    <Button
                      key={pa.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-between h-auto py-2"
                      onClick={() =>
                        toast.success(
                          `Deal D-00${49 + nearbyPAs.indexOf(pa)} created for ${pa.developer}`,
                        )
                      }
                    >
                      <span className="flex items-center gap-2 text-xs text-left">
                        <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">
                          Create Prospect Deal &mdash; {pa.name}
                        </span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
                    </Button>
                  ))}

                  <Separator className="my-2" />

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() =>
                        toast.success(
                          "Catchment demand report generated",
                        )
                      }
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      Generate Market Report
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() =>
                        toast.success(
                          "Demand pipeline exported to CSV",
                        )
                      }
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Export Pipeline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
