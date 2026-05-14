"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import Map, {
  Marker,
  Popup,
  Source,
  Layer,
  NavigationControl,
} from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import { MapPin, ArrowRight } from "lucide-react"
import type { Site, SiteStatus } from "../_mock-data"

// ---------------------------------------------------------------------------
// Map styles
// ---------------------------------------------------------------------------

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    "osm-tiles": {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-layer",
      type: "raster" as const,
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    "esri-satellite": {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "&copy; Esri",
    },
  },
  layers: [
    {
      id: "esri-layer",
      type: "raster" as const,
      source: "esri-satellite",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

// ---------------------------------------------------------------------------
// Status colors
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<SiteStatus, string> = {
  Active: "#22c55e",
  Registered: "#3b82f6",
  "Under Assessment": "#f59e0b",
  "Fully Allocated": "#64748b",
  Prospecting: "#a855f7",
  "Legal In Progress": "#f59e0b",
}

const STATUS_BADGE_CLASSES: Record<
  SiteStatus,
  { bg: string; text: string; border: string; dot: string }
> = {
  Active: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  Registered: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  "Under Assessment": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  "Fully Allocated": {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-500",
  },
  Prospecting: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  "Legal In Progress": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
}

// ---------------------------------------------------------------------------
// Catchment boundary GeoJSON (approximate)
// ---------------------------------------------------------------------------

const SOLENT_CATCHMENT: GeoJSON.Feature = {
  type: "Feature",
  properties: { name: "Solent", color: "#3b82f6" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-1.42, 50.82],
        [-1.35, 50.80],
        [-1.25, 50.78],
        [-1.15, 50.80],
        [-1.10, 50.84],
        [-1.08, 50.90],
        [-1.10, 50.95],
        [-1.18, 50.97],
        [-1.28, 50.96],
        [-1.35, 50.94],
        [-1.40, 50.92],
        [-1.44, 50.88],
        [-1.42, 50.82],
      ],
    ],
  },
}

const TEST_VALLEY_CATCHMENT: GeoJSON.Feature = {
  type: "Feature",
  properties: { name: "Test Valley", color: "#22c55e" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-1.58, 51.04],
        [-1.52, 51.02],
        [-1.44, 51.03],
        [-1.38, 51.06],
        [-1.36, 51.10],
        [-1.38, 51.14],
        [-1.44, 51.16],
        [-1.52, 51.15],
        [-1.58, 51.12],
        [-1.60, 51.08],
        [-1.58, 51.04],
      ],
    ],
  },
}

const CATCHMENT_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [SOLENT_CATCHMENT, TEST_VALLEY_CATCHMENT],
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InteractiveMapProps {
  sites: Site[]
  className?: string
  initialCenter?: [number, number] // [lng, lat]
  initialZoom?: number
  showCatchments?: boolean
  onSiteClick?: (siteRef: string) => void
  selectedSiteRef?: string
  mode?: "browse" | "satellite"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InteractiveMap({
  sites,
  className = "",
  initialCenter = [-1.3, 50.95],
  initialZoom = 10,
  showCatchments = true,
  onSiteClick,
  selectedSiteRef,
  mode = "browse",
}: InteractiveMapProps) {
  const [popupSite, setPopupSite] = useState<Site | null>(null)

  const mapStyle = mode === "satellite" ? SATELLITE_STYLE : OSM_STYLE

  const handleMarkerClick = useCallback(
    (site: Site) => {
      setPopupSite(site)
      onSiteClick?.(site.ref)
    },
    [onSiteClick],
  )

  const handlePopupClose = useCallback(() => {
    setPopupSite(null)
  }, [])

  // Memoize the catchment fill/line layer styles for performance
  const catchmentFillPaint = useMemo(
    () => ({
      "fill-color": ["get", "color"] as unknown as string,
      "fill-opacity": 0.08,
    }),
    [],
  )

  const catchmentLinePaint = useMemo(
    () => ({
      "line-color": ["get", "color"] as unknown as string,
      "line-width": 2,
      "line-opacity": 0.6,
      "line-dasharray": [4, 2] as unknown as number[],
    }),
    [],
  )

  return (
    <div className={`relative w-full ${className}`}>
      <Map
        initialViewState={{
          longitude: initialCenter[0],
          latitude: initialCenter[1],
          zoom: initialZoom,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        attributionControl={{ compact: true }}
      >
        <NavigationControl position="top-right" />

        {/* Catchment boundaries */}
        {showCatchments && (
          <Source id="catchments" type="geojson" data={CATCHMENT_GEOJSON}>
            <Layer
              id="catchment-fill"
              type="fill"
              paint={catchmentFillPaint}
            />
            <Layer
              id="catchment-line"
              type="line"
              paint={catchmentLinePaint}
            />
          </Source>
        )}

        {/* Site markers */}
        {sites.map((site) => {
          const isSelected = selectedSiteRef === site.ref
          const color = STATUS_COLORS[site.status] ?? "#94a3b8"
          return (
            <Marker
              key={site.ref}
              longitude={site.lng}
              latitude={site.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                handleMarkerClick(site)
              }}
            >
              <div className="relative cursor-pointer group">
                {/* Pulse ring for selected */}
                {isSelected && (
                  <span
                    className="absolute inset-0 -m-2 rounded-full animate-ping opacity-30"
                    style={{ backgroundColor: color }}
                  />
                )}
                {/* Outer ring */}
                <div
                  className={`flex items-center justify-center rounded-full border-2 border-white shadow-md transition-transform ${
                    isSelected ? "scale-125" : "group-hover:scale-110"
                  }`}
                  style={{
                    width: isSelected ? 28 : 22,
                    height: isSelected ? 28 : 22,
                    backgroundColor: color,
                  }}
                >
                  <MapPin className="text-white" style={{ width: isSelected ? 14 : 11, height: isSelected ? 14 : 11 }} />
                </div>
              </div>
            </Marker>
          )
        })}

        {/* Popup */}
        {popupSite && (
          <Popup
            longitude={popupSite.lng}
            latitude={popupSite.lat}
            anchor="bottom"
            onClose={handlePopupClose}
            closeOnClick={false}
            offset={18}
            className="interactive-map-popup"
          >
            <div className="min-w-[220px] max-w-[260px] p-3 space-y-2.5">
              {/* Header */}
              <div>
                <h3 className="font-semibold text-sm text-foreground leading-tight">
                  {popupSite.name}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {popupSite.ref}
                </p>
              </div>

              {/* Status badge */}
              <div>
                <StatusBadgeInline status={popupSite.status} />
              </div>

              {/* Capacity bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Capacity</span>
                  <span>
                    {popupSite.allocatedLabel} / {popupSite.totalLabel}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-blue-400 rounded-l-full"
                    style={{
                      width: `${popupSite.total > 0 ? Math.round((popupSite.allocated / popupSite.total) * 100) : 0}%`,
                    }}
                  />
                  <div
                    className="h-full bg-green-400 rounded-r-full"
                    style={{
                      width: `${popupSite.total > 0 ? Math.round((popupSite.available / popupSite.total) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Price + catchment */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {popupSite.catchment}
                </span>
                <span className="font-medium text-foreground tabular-nums">
                  {popupSite.priceLabel}
                </span>
              </div>

              {/* View link */}
              <Link
                href={`/admin/brokerage-mockups/sites/${popupSite.ref}`}
                className="flex items-center justify-center gap-1.5 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                View Site
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Popup>
        )}
      </Map>

      {/* Catchment legend overlay */}
      {showCatchments && (
        <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur rounded-lg border border-border px-3 py-2 text-[10px] flex flex-col gap-1.5 pointer-events-none">
          <span className="font-semibold text-foreground text-[11px]">
            Catchments
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-1.5 rounded-sm"
              style={{ backgroundColor: "#3b82f6" }}
            />
            <span className="text-muted-foreground">Solent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-1.5 rounded-sm"
              style={{ backgroundColor: "#22c55e" }}
            />
            <span className="text-muted-foreground">Test Valley</span>
          </div>
        </div>
      )}

      {/* Status legend overlay */}
      <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur rounded-lg border border-border px-3 py-2 text-[10px] flex flex-col gap-1 pointer-events-none">
        {(
          Object.entries(STATUS_COLORS) as [SiteStatus, string][]
        )
          .filter(([status]) =>
            sites.some((s) => s.status === status),
          )
          .map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground">{status}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline status badge (for popup)
// ---------------------------------------------------------------------------

function StatusBadgeInline({ status }: { status: SiteStatus }) {
  const cfg = STATUS_BADGE_CLASSES[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  )
}

export default InteractiveMap
