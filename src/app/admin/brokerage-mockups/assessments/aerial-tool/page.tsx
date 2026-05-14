"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import Map, {
  Source,
  Layer,
  NavigationControl,
  type MapLayerMouseEvent,
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
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  MapPin,
  Ruler,
  Leaf,
  TreeDeciduous,
  Droplets,
  FileText,
  Plus,
  RotateCcw,
  Check,
  AlertCircle,
  ChevronRight,
  MousePointerClick,
  Pencil,
  X,
  Crosshair,
  Globe,
} from "lucide-react"

// ─── Constants ────────────────────────────────────────────────────────────────

const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    "esri-satellite": {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [
    {
      id: "satellite",
      type: "raster" as const,
      source: "esri-satellite",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

const INITIAL_VIEW = {
  latitude: 50.9,
  longitude: -1.25,
  zoom: 12,
}

// ─── Area Calculation ─────────────────────────────────────────────────────────

function calculatePolygonArea(coords: [number, number][]): number {
  const R = 6371000 // Earth radius in meters
  let area = 0
  const n = coords.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const lat1 = (coords[i][1] * Math.PI) / 180
    const lat2 = (coords[j][1] * Math.PI) / 180
    const lng1 = (coords[i][0] * Math.PI) / 180
    const lng2 = (coords[j][0] * Math.PI) / 180
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
  }
  area = Math.abs((area * R * R) / 2)
  return area / 10000 // Convert m² to hectares
}

function getPolygonCenter(
  coords: [number, number][]
): [number, number] {
  const lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length
  const lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length
  return [lng, lat]
}

// ─── Mock Assessment Data Generator ───────────────────────────────────────────

function generateAssessmentData(area: number, center: [number, number]) {
  const baseUnitsLow = Math.round(area * 0.75)
  const baseUnitsHigh = Math.round(area * 1.05)
  const nutrientLoading = Math.round(area * 11.5)
  const creditYield = Math.round(area * 3.5)
  const valueLow = creditYield * 2500
  const valueHigh = creditYield * 3200

  return {
    overview: {
      area: area.toFixed(1),
      center: `${center[1].toFixed(4)}°N, ${Math.abs(center[0]).toFixed(4)}°W`,
      nearestTown: "Near Fareham, Hampshire",
    },
    environmental: {
      nca: "South Hampshire Coast",
      lnrs: "Hampshire and the Isle of Wight",
      soilType: "Clay with flints",
      landUse: "Arable / Improved Grassland",
      imdDecile: 6,
      floodRisk: "Zone 1 - Low Risk",
    },
    bng: {
      baselineCondition: "Poor to Moderate",
      distinctiveness: "Low to Medium",
      habitats: [
        "Modified Grassland",
        "Arable",
        "Hedgerow boundary",
      ],
      unitEstimate: `${baseUnitsLow}–${baseUnitsHigh} area HUs`,
      confidence: "Low — requires on-site survey",
    },
    nutrient: {
      catchment: "Solent",
      baselineLoading: `~${nutrientLoading} kg N/yr`,
      creditYield: `~${creditYield} kg N/yr`,
      valueLow: `£${valueLow.toLocaleString()}`,
      valueHigh: `£${valueHigh.toLocaleString()}`,
    },
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DrawingMode = "idle" | "drawing" | "complete"

// ─── Component ────────────────────────────────────────────────────────────────

export default function AerialAssessmentTool() {
  const [drawingMode, setDrawingMode] = useState<DrawingMode>("idle")
  const [vertices, setVertices] = useState<[number, number][]>([])
  const [cursorPosition, setCursorPosition] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [assessmentData, setAssessmentData] = useState<ReturnType<
    typeof generateAssessmentData
  > | null>(null)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (analysisTimerRef.current) {
        clearInterval(analysisTimerRef.current)
      }
    }
  }, [])

  // Computed values
  const currentArea =
    vertices.length >= 3 ? calculatePolygonArea(vertices) : 0

  // ─── Map Click Handler ────────────────────────────────────────────────

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (drawingMode !== "drawing") return
      const newVertex: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      setVertices((prev) => [...prev, newVertex])
    },
    [drawingMode]
  )

  const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
    setCursorPosition({ lat: e.lngLat.lat, lng: e.lngLat.lng })
  }, [])

  // ─── Drawing Controls ─────────────────────────────────────────────────

  const startDrawing = () => {
    setDrawingMode("drawing")
    setVertices([])
    setAssessmentData(null)
    setIsAnalyzing(false)
    setAnalysisProgress(0)
    setCheckedItems({})
  }

  const completePolygon = () => {
    if (vertices.length < 3) return
    setDrawingMode("complete")

    // Simulate analysis with loading state
    setIsAnalyzing(true)
    setAnalysisProgress(0)

    let progress = 0
    analysisTimerRef.current = setInterval(() => {
      progress += Math.random() * 15 + 5
      if (progress >= 100) {
        progress = 100
        if (analysisTimerRef.current) {
          clearInterval(analysisTimerRef.current)
          analysisTimerRef.current = null
        }
        const area = calculatePolygonArea(vertices)
        const center = getPolygonCenter(vertices)
        setAssessmentData(generateAssessmentData(area, center))
        setIsAnalyzing(false)
      }
      setAnalysisProgress(Math.min(progress, 100))
    }, 200)
  }

  const clearDrawing = () => {
    if (analysisTimerRef.current) {
      clearInterval(analysisTimerRef.current)
      analysisTimerRef.current = null
    }
    setDrawingMode("idle")
    setVertices([])
    setAssessmentData(null)
    setIsAnalyzing(false)
    setAnalysisProgress(0)
    setCheckedItems({})
  }

  // ─── GeoJSON Data ─────────────────────────────────────────────────────

  // Line connecting vertices (and closing to first if complete)
  const lineGeoJSON: GeoJSON.Feature<GeoJSON.Geometry> | null =
    vertices.length >= 2
      ? {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates:
              drawingMode === "complete"
                ? [...vertices, vertices[0]]
                : vertices,
          },
        }
      : null

  // Filled polygon (only when complete)
  const polygonGeoJSON: GeoJSON.Feature<GeoJSON.Geometry> | null =
    drawingMode === "complete" && vertices.length >= 3
      ? {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [[...vertices, vertices[0]]],
          },
        }
      : null

  // Vertex points
  const vertexGeoJSON: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: vertices.map((coord, i) => ({
      type: "Feature" as const,
      properties: { index: i },
      geometry: {
        type: "Point" as const,
        coordinates: coord,
      },
    })),
  }

  // ─── Action Items ─────────────────────────────────────────────────────

  const actionItems = [
    {
      id: "survey",
      label: "Commission ecological baseline survey",
    },
    {
      id: "ownership",
      label: "Verify land ownership via Land Registry",
    },
    {
      id: "planning",
      label: "Check LPA planning constraints",
    },
    {
      id: "access",
      label: "Assess access and management feasibility",
    },
    { id: "landowner", label: "Contact landowner" },
  ]

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-6 py-3 text-sm text-muted-foreground border-b border-border bg-card">
        <Link
          href="/admin/brokerage-mockups/assessments"
          className="hover:text-foreground transition-colors"
        >
          Assessments
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">
          Aerial Assessment Tool
        </span>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel — Map (60%) */}
        <div className="relative w-[60%] border-r border-border">
          <Map
            initialViewState={INITIAL_VIEW}
            mapStyle={SATELLITE_STYLE}
            onClick={handleMapClick}
            onMouseMove={handleMouseMove}
            cursor={drawingMode === "drawing" ? "crosshair" : "grab"}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />

            {/* Polygon fill */}
            {polygonGeoJSON && (
              <Source
                id="polygon-fill"
                type="geojson"
                data={polygonGeoJSON}
              >
                <Layer
                  id="polygon-fill-layer"
                  type="fill"
                  paint={{
                    "fill-color": "#22c55e",
                    "fill-opacity": 0.25,
                  }}
                />
              </Source>
            )}

            {/* Line connecting vertices */}
            {lineGeoJSON && (
              <Source
                id="polygon-line"
                type="geojson"
                data={lineGeoJSON}
              >
                <Layer
                  id="polygon-line-layer"
                  type="line"
                  paint={{
                    "line-color": "#22c55e",
                    "line-width": 2.5,
                    "line-dasharray": drawingMode === "complete" ? [1] : [2, 2],
                  }}
                />
              </Source>
            )}

            {/* Vertex points */}
            {vertices.length > 0 && (
              <Source
                id="vertices"
                type="geojson"
                data={vertexGeoJSON}
              >
                <Layer
                  id="vertices-layer"
                  type="circle"
                  paint={{
                    "circle-radius": 5,
                    "circle-color": "#ffffff",
                    "circle-stroke-color": "#22c55e",
                    "circle-stroke-width": 2.5,
                  }}
                />
              </Source>
            )}
          </Map>

          {/* Map Controls Overlay */}
          <div className="absolute left-4 top-4 flex flex-col gap-3">
            {/* Drawing Controls */}
            <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Pencil className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Drawing Tools
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {drawingMode === "idle" && (
                  <Button
                    size="sm"
                    onClick={startDrawing}
                    className="gap-1.5"
                  >
                    <MousePointerClick className="h-3.5 w-3.5" />
                    Start Drawing
                  </Button>
                )}
                {drawingMode === "drawing" && (
                  <>
                    <Button
                      size="sm"
                      onClick={completePolygon}
                      disabled={vertices.length < 3}
                      className="gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Complete Polygon
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearDrawing}
                      className="gap-1.5 bg-card/80"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </>
                )}
                {drawingMode === "complete" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearDrawing}
                    className="gap-1.5 bg-card/80"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Clear &amp; Redraw
                  </Button>
                )}
              </div>
              {drawingMode === "drawing" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {vertices.length === 0
                    ? "Click on the map to place the first vertex"
                    : `${vertices.length} vertices placed — need at least 3`}
                </p>
              )}
            </div>

            {/* Area display */}
            {vertices.length >= 3 && (
              <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-lg p-3">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-foreground">
                    Selected area:{" "}
                    <span className="text-green-600">
                      {currentArea.toFixed(1)} ha
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Cursor coordinates */}
            {cursorPosition && (
              <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-lg px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Crosshair className="h-3 w-3" />
                  {cursorPosition.lat.toFixed(5)},{" "}
                  {cursorPosition.lng.toFixed(5)}
                </div>
              </div>
            )}
          </div>

          {/* Map Attribution */}
          <div className="absolute bottom-1 left-1 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white/80">
            Esri, Maxar, Earthstar Geographics
          </div>
        </div>

        {/* Right Panel — Assessment (40%) */}
        <div className="w-[40%] overflow-y-auto bg-background">
          <div className="p-6 space-y-5">
            {/* Panel Header */}
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/40">
                <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Site Assessment
                </h2>
                <p className="text-xs text-muted-foreground">
                  Aerial analysis and preliminary evaluation
                </p>
              </div>
            </div>

            <Separator />

            {/* State: No polygon drawn yet */}
            {drawingMode === "idle" && !assessmentData && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <MousePointerClick className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Draw a Site Boundary
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Click &quot;Start Drawing&quot; then click on the map to place
                  vertices around the site boundary. Each click adds a point.
                  Click &quot;Complete Polygon&quot; when done.
                </p>
              </div>
            )}

            {/* State: Currently drawing */}
            {drawingMode === "drawing" && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-green-100 p-4 mb-4 dark:bg-green-900/40">
                  <Crosshair className="h-8 w-8 text-green-600 dark:text-green-400 animate-pulse" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Drawing in Progress
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Click on the map to add vertices.{" "}
                  {vertices.length < 3
                    ? `Place at least ${3 - vertices.length} more point${3 - vertices.length !== 1 ? "s" : ""} to form a polygon.`
                    : "You can add more points or click \"Complete Polygon\" to finish."}
                </p>
                {vertices.length >= 3 && (
                  <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 dark:border-green-800 dark:bg-green-950/40">
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Current area: {currentArea.toFixed(1)} ha
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* State: Analyzing */}
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-blue-100 p-4 mb-4 dark:bg-blue-900/40">
                  <Leaf className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Analysing Site
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-4">
                  Processing satellite imagery and cross-referencing
                  environmental datasets...
                </p>
                <div className="w-64">
                  <Progress value={analysisProgress} className="h-2" />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {analysisProgress < 30
                      ? "Loading satellite imagery..."
                      : analysisProgress < 60
                        ? "Cross-referencing DEFRA datasets..."
                        : analysisProgress < 85
                          ? "Running habitat classification..."
                          : "Generating assessment..."}
                  </p>
                </div>
              </div>
            )}

            {/* State: Assessment Complete */}
            {assessmentData && !isAnalyzing && (
              <div className="space-y-4">
                {/* 1. Site Overview */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <CardTitle className="text-sm">
                        Site Overview
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          Estimated Area
                        </dt>
                        <dd className="font-medium text-foreground">
                          {assessmentData.overview.area} ha
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          Center Coordinates
                        </dt>
                        <dd className="font-mono text-xs text-foreground">
                          {assessmentData.overview.center}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          Nearest Location
                        </dt>
                        <dd className="font-medium text-foreground">
                          {assessmentData.overview.nearestTown}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {/* 2. Environmental Context */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <TreeDeciduous className="h-4 w-4 text-green-600" />
                      <CardTitle className="text-sm">
                        Environmental Context
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="ml-auto border border-amber-200 bg-amber-50 text-amber-700 text-[10px] dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                      >
                        Mocked Data
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          National Character Area
                        </dt>
                        <dd className="font-medium text-foreground">
                          {assessmentData.environmental.nca}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">LNRS Area</dt>
                        <dd className="font-medium text-foreground text-right max-w-[55%]">
                          {assessmentData.environmental.lnrs}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Soil Type</dt>
                        <dd className="font-medium text-foreground">
                          {assessmentData.environmental.soilType}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          Current Land Use
                        </dt>
                        <dd className="font-medium text-foreground text-right max-w-[55%]">
                          {assessmentData.environmental.landUse}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">IMD Decile</dt>
                        <dd className="font-medium text-foreground">
                          {assessmentData.environmental.imdDecile}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          Flood Risk Zone
                        </dt>
                        <dd className="font-medium text-foreground text-right max-w-[55%]">
                          {assessmentData.environmental.floodRisk}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {/* 3. Preliminary BNG Assessment */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-emerald-600" />
                      <CardTitle className="text-sm">
                        Preliminary BNG Assessment
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          Baseline Condition
                        </dt>
                        <dd className="font-medium text-foreground">
                          {assessmentData.bng.baselineCondition}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          Distinctiveness
                        </dt>
                        <dd className="font-medium text-foreground">
                          {assessmentData.bng.distinctiveness}
                        </dd>
                      </div>
                      <div className="flex justify-between items-start">
                        <dt className="text-muted-foreground">
                          BNG Unit Estimate
                        </dt>
                        <dd className="font-semibold text-green-600 dark:text-green-400">
                          {assessmentData.bng.unitEstimate}
                        </dd>
                      </div>
                    </dl>

                    <Separator />

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Habitat Types Detected
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {assessmentData.bng.habitats.map((h) => (
                          <Badge
                            key={h}
                            variant="secondary"
                            className="border border-green-200 bg-green-50 text-green-700 text-xs dark:border-green-800 dark:bg-green-950/40 dark:text-green-400"
                          >
                            {h}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-950/40">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        {assessmentData.bng.confidence}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Nutrient Neutrality Potential */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-600" />
                      <CardTitle className="text-sm">
                        Nutrient Neutrality Potential
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Catchment</dt>
                        <dd className="font-medium text-foreground">
                          {assessmentData.nutrient.catchment}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          Baseline Loading
                        </dt>
                        <dd className="font-medium text-foreground">
                          {assessmentData.nutrient.baselineLoading}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          Potential Credit Yield
                        </dt>
                        <dd className="font-medium text-green-600 dark:text-green-400">
                          {assessmentData.nutrient.creditYield}
                        </dd>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-start">
                        <dt className="text-muted-foreground">
                          Estimated Value
                        </dt>
                        <dd className="text-right">
                          <span className="font-semibold text-foreground">
                            {assessmentData.nutrient.valueLow} –{" "}
                            {assessmentData.nutrient.valueHigh}
                          </span>
                          <br />
                          <span className="text-[10px] text-muted-foreground">
                            at £2,500–3,200/kg
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {/* 5. Recommended Actions */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-foreground" />
                      <CardTitle className="text-sm">
                        Recommended Actions
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {actionItems.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <Checkbox
                            checked={checkedItems[item.id] ?? false}
                            onCheckedChange={(checked) =>
                              setCheckedItems((prev) => ({
                                ...prev,
                                [item.id]: checked === true,
                              }))
                            }
                          />
                          <span
                            className={`text-sm ${
                              checkedItems[item.id]
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                            }`}
                          >
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 6. Action Buttons */}
                <div className="flex gap-3 pt-1 pb-4">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() =>
                      toast.success(
                        "Site record created: S-0009 — Fareham Assessment Site"
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Create Site Record
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() =>
                      toast.success(
                        "Assessment brief generated — ready to send to assessor"
                      )
                    }
                  >
                    <FileText className="h-4 w-4" />
                    Generate Brief
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
