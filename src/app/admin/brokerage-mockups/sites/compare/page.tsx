"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import MapGL, {
  Marker,
  Source,
  Layer,
  NavigationControl,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  MapPin,
  Check,
  CheckCircle2,
  ArrowLeft,
  Scale,
  TrendingUp,
  Leaf,
  PoundSterling,
  Shield,
  FileText,
  Send,
  Download,
  X,
  Plus,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { sites } from "../../_mock-data";
import type { Site } from "../../_mock-data";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_SELECTED = 3;

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
};

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; dot: string; border: string }
> = {
  Active: {
    bg: "bg-primary/5",
    text: "text-primary",
    dot: "bg-primary",
    border: "border-primary/20",
  },
  Registered: {
    bg: "bg-primary/5",
    text: "text-primary",
    dot: "bg-primary",
    border: "border-primary/20",
  },
  "Under Assessment": {
    bg: "bg-accent",
    text: "text-accent-foreground",
    dot: "bg-accent-foreground/50",
    border: "border-border",
  },
  "Legal In Progress": {
    bg: "bg-accent",
    text: "text-accent-foreground",
    dot: "bg-accent-foreground/50",
    border: "border-border",
  },
  Prospecting: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/50",
    border: "border-border",
  },
  "Fully Allocated": {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/70",
    border: "border-border",
  },
};

const SELECTION_COLORS = [
  {
    ring: "ring-blue-500",
    border: "border-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    marker: "#3b82f6",
    line: "blue",
  },
  {
    ring: "ring-violet-500",
    border: "border-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    marker: "#8b5cf6",
    line: "violet",
  },
  {
    ring: "ring-teal-500",
    border: "border-teal-500",
    bg: "bg-teal-50 dark:bg-teal-950/30",
    marker: "#14b8a6",
    line: "teal",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function distanceColor(km: number): string {
  if (km < 10) return "#22c55e"; // green
  if (km <= 20) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

function distanceLabel(km: number): string {
  if (km < 10) return "green";
  if (km <= 20) return "amber";
  return "red";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function bestClass(isBest: boolean): string {
  return isBest
    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
    : "";
}

function BestIcon({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <CheckCircle2 className="inline-block ml-1 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
  );
}

// ---------------------------------------------------------------------------
// Midpoint for dashed line labels (GeoJSON)
// ---------------------------------------------------------------------------

function makeLine(
  devLat: number,
  devLng: number,
  siteLat: number,
  siteLng: number
) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [devLng, devLat],
        [siteLng, siteLat],
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function SiteComparePage() {
  const [selectedRefs, setSelectedRefs] = useState<string[]>([
    "S-0001",
    "S-0005",
  ]);
  const [devPin, setDevPin] = useState<{ lat: number; lng: number } | null>(
    null
  );

  // Toggle site selection
  const toggleSite = useCallback(
    (ref: string) => {
      setSelectedRefs((prev) => {
        if (prev.includes(ref)) return prev.filter((r) => r !== ref);
        if (prev.length >= MAX_SELECTED) return prev;
        return [...prev, ref];
      });
    },
    []
  );

  // Selected sites in order
  const selectedSites = useMemo(
    () => selectedRefs.map((ref) => sites.find((s) => s.ref === ref)!).filter(Boolean),
    [selectedRefs]
  );

  const hasBNG = useMemo(
    () => selectedSites.some((s) => s.unitType === "BNG"),
    [selectedSites]
  );

  // Distance calculations
  const distances = useMemo(() => {
    if (!devPin) return new Map<string, number>();
    const map = new Map<string, number>();
    selectedSites.forEach((s) => {
      map.set(s.ref, haversineDistance(devPin.lat, devPin.lng, s.lat, s.lng));
    });
    return map;
  }, [devPin, selectedSites]);

  // Computed comparisons
  const comparisons = useMemo(() => {
    if (selectedSites.length === 0) return null;

    const nitrogenSites = selectedSites.filter(
      (s) => s.unitType === "Nitrogen"
    );

    // Best available capacity (highest)
    const maxAvailable = Math.max(...selectedSites.map((s) => s.available));
    // Best price (lowest)
    const minPrice = Math.min(...selectedSites.map((s) => s.price));
    // Best distance (lowest)
    const minDistance = distances.size > 0 ? Math.min(...Array.from(distances.values())) : null;
    // Best utilisation (lowest)
    const minUtil = Math.min(
      ...selectedSites.map((s) => (s.total > 0 ? (s.allocated / s.total) * 100 : 0))
    );
    // Best total capacity (highest)
    const maxTotal = Math.max(...selectedSites.map((s) => s.total));
    // Best revenue potential (highest)
    const maxRevenue = Math.max(
      ...selectedSites.map((s) => s.available * s.price)
    );
    // Best commission (highest)
    const maxCommission = Math.max(
      ...selectedSites.map((s) => s.available * s.price * 0.15)
    );
    // Best area (highest)
    const maxArea = Math.max(...selectedSites.map((s) => s.areaHectares));
    // Best loading factor for nitrogen (lowest)
    const minLoadingFactor =
      nitrogenSites.length > 0
        ? Math.min(
            ...nitrogenSites
              .filter((s) => s.areaHectares > 0 && s.proposedLoading !== undefined)
              .map((s) => s.proposedLoading! / s.areaHectares)
          )
        : null;
    // Best net reduction (highest) for nitrogen
    const maxNetReduction =
      nitrogenSites.length > 0
        ? Math.max(
            ...nitrogenSites
              .filter(
                (s) =>
                  s.baselineLoading !== undefined &&
                  s.proposedLoading !== undefined
              )
              .map((s) => s.baselineLoading! - s.proposedLoading!)
          )
        : null;

    return {
      maxAvailable,
      minPrice,
      minDistance,
      minUtil,
      maxTotal,
      maxRevenue,
      maxCommission,
      maxArea,
      minLoadingFactor,
      maxNetReduction,
    };
  }, [selectedSites, distances]);

  // Recommendation
  const recommendation = useMemo(() => {
    if (!comparisons || selectedSites.length === 0) return null;

    let greenCounts: Record<string, number> = {};
    selectedSites.forEach((s) => {
      let count = 0;
      if (s.available === comparisons.maxAvailable) count++;
      if (s.price === comparisons.minPrice) count++;
      if (s.total === comparisons.maxTotal) count++;
      if (s.available * s.price === comparisons.maxRevenue) count++;
      if (s.areaHectares === comparisons.maxArea) count++;
      if (comparisons.minDistance !== null && distances.get(s.ref) !== undefined) {
        if (Math.abs(distances.get(s.ref)! - comparisons.minDistance) < 0.01) count++;
      }
      greenCounts[s.ref] = count;
    });

    const bestOverallRef = Object.entries(greenCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];
    const bestOverall = selectedSites.find((s) => s.ref === bestOverallRef);

    const cheapest = selectedSites.reduce((a, b) =>
      a.price < b.price ? a : b
    );

    let closest: Site | null = null;
    let closestDist: number | null = null;
    if (distances.size > 0) {
      let minD = Infinity;
      distances.forEach((d, ref) => {
        if (d < minD) {
          minD = d;
          closest = selectedSites.find((s) => s.ref === ref) ?? null;
          closestDist = d;
        }
      });
    }

    return { bestOverall, cheapest, closest: closest as Site | null, closestDist: closestDist as number | null };
  }, [comparisons, selectedSites, distances]);

  // GeoJSON for distance lines
  const lineFeatures = useMemo(() => {
    if (!devPin || selectedSites.length === 0)
      return { type: "FeatureCollection" as const, features: [] };

    const features = selectedSites.map((s) => {
      const dist = distances.get(s.ref) ?? 0;
      return {
        ...makeLine(devPin.lat, devPin.lng, s.lat, s.lng),
        properties: {
          color: distanceColor(dist),
          label: `${dist.toFixed(1)} km`,
        },
      };
    });

    return { type: "FeatureCollection" as const, features };
  }, [devPin, selectedSites, distances]);

  // Map click handler
  const handleMapClick = useCallback(
    (e: { lngLat: { lng: number; lat: number } }) => {
      setDevPin({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    },
    []
  );

  // Map center
  const mapCenter = useMemo(() => {
    if (selectedSites.length === 0) return { lat: 50.92, lng: -1.3 };
    const avgLat =
      selectedSites.reduce((sum, s) => sum + s.lat, 0) / selectedSites.length;
    const avgLng =
      selectedSites.reduce((sum, s) => sum + s.lng, 0) / selectedSites.length;
    return { lat: avgLat, lng: avgLng };
  }, [selectedSites]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/brokerage-mockups/sites"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sites
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Site Comparison</h1>
        <p className="text-muted-foreground mt-1">
          Compare gain sites side-by-side to find the best match for your deal
        </p>
      </div>

      {/* Site Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Select Sites to Compare</span>
            </div>
            <Badge variant="secondary">
              {selectedRefs.length} of {MAX_SELECTED} selected
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {sites.map((site) => {
              const isSelected = selectedRefs.includes(site.ref);
              const selectionIdx = selectedRefs.indexOf(site.ref);
              const color = isSelected
                ? SELECTION_COLORS[selectionIdx]
                : null;
              const statusCfg = STATUS_CONFIG[site.status] ?? STATUS_CONFIG.Prospecting;
              const disabled =
                !isSelected && selectedRefs.length >= MAX_SELECTED;

              return (
                <button
                  key={site.ref}
                  onClick={() => toggleSite(site.ref)}
                  disabled={disabled}
                  className={`
                    relative rounded-lg border-2 p-3 text-left transition-all
                    ${
                      isSelected
                        ? `${color!.border} ${color!.bg} ring-2 ${color!.ring}`
                        : "border-border hover:border-muted-foreground/50"
                    }
                    ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground font-mono">
                    {site.ref}
                  </div>
                  <div className="font-medium text-sm mt-0.5 truncate pr-5">
                    {site.name}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${statusCfg.dot}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {site.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {site.unitType} &middot; {site.availableLabel} avail
                  </div>
                </button>
              );
            })}
          </div>

          {/* Development site pin */}
          <Separator className="my-4" />
          <div className="flex items-center gap-3">
            <Target className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">Development Site</span>
            <div className="flex-1 max-w-xs">
              {devPin ? (
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {devPin.lat.toFixed(4)}, {devPin.lng.toFixed(4)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDevPin(null)}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Click map to place development site pin
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Section */}
      {selectedSites.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Site Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[300px] rounded-b-lg overflow-hidden">
              <MapGL
                initialViewState={{
                  latitude: mapCenter.lat,
                  longitude: mapCenter.lng,
                  zoom: 10,
                }}
                style={{ width: "100%", height: "100%" }}
                mapStyle={MAP_STYLE}
                onClick={handleMapClick}
                cursor="crosshair"
              >
                <NavigationControl position="top-right" />

                {/* Distance lines */}
                {devPin && lineFeatures.features.length > 0 && (
                  <>
                    {lineFeatures.features.map((feat, i) => (
                      <Source
                        key={`line-${i}`}
                        id={`line-${i}`}
                        type="geojson"
                        data={feat as GeoJSON.Feature}
                      >
                        <Layer
                          id={`line-layer-${i}`}
                          type="line"
                          paint={{
                            "line-color": feat.properties.color,
                            "line-width": 2.5,
                            "line-dasharray": [4, 3],
                          }}
                        />
                      </Source>
                    ))}
                  </>
                )}

                {/* Unselected site markers (grey) */}
                {sites
                  .filter((s) => !selectedRefs.includes(s.ref))
                  .map((site) => (
                    <Marker
                      key={site.ref}
                      latitude={site.lat}
                      longitude={site.lng}
                      anchor="center"
                    >
                      <div
                        className="flex items-center gap-1 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSite(site.ref);
                        }}
                      >
                        <div className="w-3 h-3 rounded-full bg-gray-400 border border-white shadow" />
                        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-white/80 dark:bg-gray-900/80 px-1 rounded shadow-sm">
                          {site.name}
                        </span>
                      </div>
                    </Marker>
                  ))}

                {/* Selected site markers (colored) */}
                {selectedSites.map((site, idx) => {
                  const color = SELECTION_COLORS[idx];
                  return (
                    <Marker
                      key={site.ref}
                      latitude={site.lat}
                      longitude={site.lng}
                      anchor="bottom"
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-semibold bg-white dark:bg-gray-900 px-1.5 py-0.5 rounded shadow-sm border mb-0.5">
                          {site.name}
                          {devPin && distances.has(site.ref) && (
                            <span className="ml-1 text-muted-foreground">
                              ({distances.get(site.ref)!.toFixed(1)} km)
                            </span>
                          )}
                        </span>
                        <svg width="24" height="32" viewBox="0 0 24 32">
                          <path
                            d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"
                            fill={color.marker}
                          />
                          <circle cx="12" cy="11" r="4" fill="white" />
                        </svg>
                      </div>
                    </Marker>
                  );
                })}

                {/* Development site marker (orange) */}
                {devPin && (
                  <Marker
                    latitude={devPin.lat}
                    longitude={devPin.lng}
                    anchor="bottom"
                    draggable
                    onDragEnd={(e) => {
                      setDevPin({
                        lat: e.lngLat.lat,
                        lng: e.lngLat.lng,
                      });
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded shadow-sm border border-orange-300 dark:border-orange-700 mb-0.5">
                        Development Site
                      </span>
                      <svg width="24" height="32" viewBox="0 0 24 32">
                        <path
                          d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"
                          fill="#f97316"
                        />
                        <circle cx="12" cy="11" r="4" fill="white" />
                      </svg>
                    </div>
                  </Marker>
                )}
              </MapGL>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Table */}
      {selectedSites.length > 0 && comparisons && (
        <div className="space-y-6">
          {/* 1. Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Leaf className="h-4 w-4 text-green-600" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Attribute</TableHead>
                      {selectedSites.map((s, idx) => (
                        <TableHead key={s.ref}>
                          <span
                            className="font-semibold"
                            style={{ color: SELECTION_COLORS[idx].marker }}
                          >
                            {s.name}
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Status */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Status
                      </TableCell>
                      {selectedSites.map((s) => {
                        const isBest = s.status === "Active";
                        return (
                          <TableCell key={s.ref} className={bestClass(isBest)}>
                            {s.status}
                            <BestIcon show={isBest} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {/* Unit Type */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Unit Type
                      </TableCell>
                      {selectedSites.map((s) => (
                        <TableCell key={s.ref}>{s.unitType}</TableCell>
                      ))}
                    </TableRow>
                    {/* Catchment */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Catchment
                      </TableCell>
                      {selectedSites.map((s) => (
                        <TableCell key={s.ref}>{s.catchment}</TableCell>
                      ))}
                    </TableRow>
                    {/* LPA */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        LPA
                      </TableCell>
                      {selectedSites.map((s) => (
                        <TableCell key={s.ref}>{s.lpa}</TableCell>
                      ))}
                    </TableRow>
                    {/* Area */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Area
                      </TableCell>
                      {selectedSites.map((s) => {
                        const isBest = s.areaHectares === comparisons.maxArea;
                        return (
                          <TableCell key={s.ref} className={bestClass(isBest)}>
                            {s.areaHectares} ha
                            <BestIcon show={isBest} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {/* Current Use */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Current Use
                      </TableCell>
                      {selectedSites.map((s) => (
                        <TableCell key={s.ref}>{s.currentUse}</TableCell>
                      ))}
                    </TableRow>
                    {/* Soil Type */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Soil Type
                      </TableCell>
                      {selectedSites.map((s) => (
                        <TableCell key={s.ref}>{s.soilType}</TableCell>
                      ))}
                    </TableRow>
                    {/* Distance */}
                    {devPin && (
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Distance
                        </TableCell>
                        {selectedSites.map((s) => {
                          const dist = distances.get(s.ref);
                          const isBest =
                            dist !== undefined &&
                            comparisons.minDistance !== null &&
                            Math.abs(dist - comparisons.minDistance) < 0.01;
                          return (
                            <TableCell
                              key={s.ref}
                              className={bestClass(isBest)}
                            >
                              {dist !== undefined ? (
                                <span
                                  style={{ color: distanceColor(dist) }}
                                  className="font-medium"
                                >
                                  {dist.toFixed(1)} km
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  --
                                </span>
                              )}
                              <BestIcon show={isBest} />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 2. Credit Capacity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Credit Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Metric</TableHead>
                      {selectedSites.map((s, idx) => (
                        <TableHead key={s.ref}>
                          <span
                            className="font-semibold"
                            style={{ color: SELECTION_COLORS[idx].marker }}
                          >
                            {s.name}
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Total */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Total Capacity
                      </TableCell>
                      {selectedSites.map((s) => {
                        const isBest = s.total === comparisons.maxTotal;
                        return (
                          <TableCell key={s.ref} className={bestClass(isBest)}>
                            {s.totalLabel}
                            <BestIcon show={isBest} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {/* Allocated */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Allocated
                      </TableCell>
                      {selectedSites.map((s) => (
                        <TableCell key={s.ref}>{s.allocatedLabel}</TableCell>
                      ))}
                    </TableRow>
                    {/* Available */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Available
                      </TableCell>
                      {selectedSites.map((s) => {
                        const isBest = s.available === comparisons.maxAvailable;
                        return (
                          <TableCell key={s.ref} className={bestClass(isBest)}>
                            {s.availableLabel}
                            <BestIcon show={isBest} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {/* Utilisation with progress bar */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Utilisation
                      </TableCell>
                      {selectedSites.map((s) => {
                        const util =
                          s.total > 0
                            ? Math.round((s.allocated / s.total) * 100)
                            : 0;
                        const isBest = util === Math.round(comparisons.minUtil);
                        return (
                          <TableCell key={s.ref} className={bestClass(isBest)}>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <span>{util}%</span>
                                <BestIcon show={isBest} />
                              </div>
                              <Progress value={util} className="h-2" />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {/* Price */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Price/Unit
                      </TableCell>
                      {selectedSites.map((s) => {
                        const isBest = s.price === comparisons.minPrice;
                        return (
                          <TableCell key={s.ref} className={bestClass(isBest)}>
                            {s.priceLabel}
                            <BestIcon show={isBest} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 3. Nutrient Profile (nitrogen sites only) */}
          {selectedSites.some((s) => s.unitType === "Nitrogen") && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-emerald-600" />
                  Nutrient Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Metric</TableHead>
                        {selectedSites.map((s, idx) => (
                          <TableHead key={s.ref}>
                            <span
                              className="font-semibold"
                              style={{ color: SELECTION_COLORS[idx].marker }}
                            >
                              {s.name}
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Baseline Loading */}
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Baseline Loading
                        </TableCell>
                        {selectedSites.map((s) => (
                          <TableCell key={s.ref}>
                            {s.baselineLoading !== undefined
                              ? `${s.baselineLoading} kg/yr`
                              : "N/A"}
                          </TableCell>
                        ))}
                      </TableRow>
                      {/* Proposed Loading */}
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Proposed Loading
                        </TableCell>
                        {selectedSites.map((s) => (
                          <TableCell key={s.ref}>
                            {s.proposedLoading !== undefined
                              ? `${s.proposedLoading} kg/yr`
                              : "N/A"}
                          </TableCell>
                        ))}
                      </TableRow>
                      {/* Net Reduction */}
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Net Reduction
                        </TableCell>
                        {selectedSites.map((s) => {
                          const net =
                            s.baselineLoading !== undefined &&
                            s.proposedLoading !== undefined
                              ? s.baselineLoading - s.proposedLoading
                              : null;
                          const isBest =
                            net !== null &&
                            comparisons.maxNetReduction !== null &&
                            net === comparisons.maxNetReduction;
                          return (
                            <TableCell
                              key={s.ref}
                              className={bestClass(isBest)}
                            >
                              {net !== null ? `${net} kg/yr` : "N/A"}
                              <BestIcon show={isBest} />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {/* Loading Factor */}
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Loading Factor
                        </TableCell>
                        {selectedSites.map((s) => {
                          const factor =
                            s.proposedLoading !== undefined &&
                            s.areaHectares > 0
                              ? s.proposedLoading / s.areaHectares
                              : null;
                          const isBest =
                            factor !== null &&
                            comparisons.minLoadingFactor !== null &&
                            Math.abs(factor - comparisons.minLoadingFactor) <
                              0.01;
                          return (
                            <TableCell
                              key={s.ref}
                              className={bestClass(isBest)}
                            >
                              {factor !== null
                                ? `${factor.toFixed(1)} kg/ha/yr`
                                : "N/A"}
                              <BestIcon show={isBest} />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {/* Mitigation */}
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Mitigation
                        </TableCell>
                        {selectedSites.map((s) => (
                          <TableCell key={s.ref} className="max-w-[200px]">
                            <span className="text-sm">
                              {s.mitigationType ?? "N/A"}
                            </span>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4. BNG Profile */}
          {hasBNG && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-green-700" />
                  BNG Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Metric</TableHead>
                        {selectedSites.map((s, idx) => (
                          <TableHead key={s.ref}>
                            <span
                              className="font-semibold"
                              style={{ color: SELECTION_COLORS[idx].marker }}
                            >
                              {s.name}
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Baseline HUs */}
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Baseline HUs
                        </TableCell>
                        {selectedSites.map((s) => {
                          if (s.unitType !== "BNG" || !s.habitatSummary) {
                            return (
                              <TableCell key={s.ref} className="text-muted-foreground">
                                N/A
                              </TableCell>
                            );
                          }
                          const area = s.habitatSummary.find(
                            (h) => h.category === "area"
                          );
                          const hedge = s.habitatSummary.find(
                            (h) => h.category === "hedgerow"
                          );
                          return (
                            <TableCell key={s.ref}>
                              {area?.baselineUnits ?? 0} area +{" "}
                              {hedge?.baselineUnits ?? 0} hedgerow
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {/* Improvement HUs */}
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Improvement HUs
                        </TableCell>
                        {selectedSites.map((s) => {
                          if (s.unitType !== "BNG" || !s.habitatSummary) {
                            return (
                              <TableCell key={s.ref} className="text-muted-foreground">
                                N/A
                              </TableCell>
                            );
                          }
                          const area = s.habitatSummary.find(
                            (h) => h.category === "area"
                          );
                          const hedge = s.habitatSummary.find(
                            (h) => h.category === "hedgerow"
                          );
                          return (
                            <TableCell key={s.ref}>
                              {area?.improvementUnits ?? 0} area +{" "}
                              {hedge?.improvementUnits ?? 0} hedgerow
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {/* Net Gain */}
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Net Gain
                        </TableCell>
                        {selectedSites.map((s) => {
                          if (s.unitType !== "BNG" || !s.habitatSummary) {
                            return (
                              <TableCell key={s.ref} className="text-muted-foreground">
                                N/A
                              </TableCell>
                            );
                          }
                          const area = s.habitatSummary.find(
                            (h) => h.category === "area"
                          );
                          const hedge = s.habitatSummary.find(
                            (h) => h.category === "hedgerow"
                          );
                          return (
                            <TableCell
                              key={s.ref}
                              className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                            >
                              +{area?.unitGain ?? 0} area +{" "}
                              {hedge?.unitGain ?? 0} hedgerow
                              <CheckCircle2 className="inline-block ml-1 h-3.5 w-3.5" />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {/* Metric Version */}
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Metric Version
                        </TableCell>
                        {selectedSites.map((s) => (
                          <TableCell key={s.ref}>
                            {s.metricVersion ?? "N/A"}
                          </TableCell>
                        ))}
                      </TableRow>
                      {/* HMMP Status */}
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          HMMP Status
                        </TableCell>
                        {selectedSites.map((s) => (
                          <TableCell key={s.ref}>
                            {s.hmmpStatus
                              ? s.hmmpStatus.charAt(0).toUpperCase() +
                                s.hmmpStatus.slice(1)
                              : "N/A"}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 5. Financial Comparison */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PoundSterling className="h-4 w-4 text-amber-600" />
                Financial Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Metric</TableHead>
                      {selectedSites.map((s, idx) => (
                        <TableHead key={s.ref}>
                          <span
                            className="font-semibold"
                            style={{ color: SELECTION_COLORS[idx].marker }}
                          >
                            {s.name}
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Revenue Potential */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Revenue Potential
                      </TableCell>
                      {selectedSites.map((s) => {
                        const rev = s.available * s.price;
                        const isBest = rev === comparisons.maxRevenue;
                        return (
                          <TableCell key={s.ref} className={bestClass(isBest)}>
                            {formatCurrency(rev)}
                            <BestIcon show={isBest} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {/* Price Competitiveness */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Price Competitiveness
                      </TableCell>
                      {selectedSites.map((s) => {
                        const sorted = [...selectedSites].sort(
                          (a, b) => a.price - b.price
                        );
                        const rank = sorted.findIndex(
                          (x) => x.ref === s.ref
                        );
                        let label: string;
                        if (selectedSites.length === 1) {
                          label = "Market";
                        } else if (rank === 0) {
                          label = "Budget";
                        } else if (rank === selectedSites.length - 1) {
                          label = "Premium";
                        } else {
                          label = "Market";
                        }
                        const isBest = rank === 0;
                        return (
                          <TableCell key={s.ref} className={bestClass(isBest)}>
                            {label}
                            <BestIcon show={isBest} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {/* Commission */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Est. Commission (15%)
                      </TableCell>
                      {selectedSites.map((s) => {
                        const comm = s.available * s.price * 0.15;
                        const isBest = comm === comparisons.maxCommission;
                        return (
                          <TableCell key={s.ref} className={bestClass(isBest)}>
                            {formatCurrency(comm)}
                            <BestIcon show={isBest} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 6. Compliance & Risk */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                Compliance &amp; Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Metric</TableHead>
                      {selectedSites.map((s, idx) => (
                        <TableHead key={s.ref}>
                          <span
                            className="font-semibold"
                            style={{ color: SELECTION_COLORS[idx].marker }}
                          >
                            {s.name}
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Registration */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Registration
                      </TableCell>
                      {selectedSites.map((s) => (
                        <TableCell key={s.ref}>
                          <code className="text-xs">
                            {s.registrationRef ?? <span className="text-muted-foreground">&mdash;</span>}
                          </code>
                        </TableCell>
                      ))}
                    </TableRow>
                    {/* Legal Agreement */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Legal Agreement
                      </TableCell>
                      {selectedSites.map((s) => (
                        <TableCell key={s.ref}>
                          {s.legalAgreement ?? <span className="text-muted-foreground">&mdash;</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                    {/* Commitment */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Commitment
                      </TableCell>
                      {selectedSites.map((s) => (
                        <TableCell key={s.ref}>
                          {s.commitmentYears
                            ? `${s.commitmentYears} years`
                            : <span className="text-muted-foreground">&mdash;</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                    {/* Compliance Status */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        Compliance Status
                      </TableCell>
                      {selectedSites.map((s) => {
                        const hasLegal = !!s.legalAgreement;
                        const label = hasLegal ? "On Track" : "Not Started";
                        const isBest = hasLegal;
                        return (
                          <TableCell key={s.ref} className={bestClass(isBest)}>
                            {label}
                            <BestIcon show={isBest} />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {/* NCA */}
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">
                        NCA
                      </TableCell>
                      {selectedSites.map((s) => (
                        <TableCell key={s.ref}>
                          {s.nationalCharacterArea ?? <span className="text-muted-foreground">&mdash;</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 7. Recommendation Summary */}
          {recommendation && (
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Recommendation Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendation.bestOverall && (
                    <div className="flex items-start gap-3">
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 shrink-0">
                        Best Overall
                      </Badge>
                      <p className="text-sm">
                        <span className="font-semibold">
                          {recommendation.bestOverall.name}
                        </span>{" "}
                        &mdash; highest available capacity with competitive
                        pricing ({recommendation.bestOverall.availableLabel}{" "}
                        available at{" "}
                        {recommendation.bestOverall.priceLabel})
                      </p>
                    </div>
                  )}
                  {recommendation.cheapest && (
                    <div className="flex items-start gap-3">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 shrink-0">
                        Best Value
                      </Badge>
                      <p className="text-sm">
                        <span className="font-semibold">
                          {recommendation.cheapest.name}
                        </span>{" "}
                        &mdash; lowest price per unit at{" "}
                        {recommendation.cheapest.priceLabel}
                      </p>
                    </div>
                  )}
                  {recommendation.closest && recommendation.closestDist !== null && (
                    <div className="flex items-start gap-3">
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 shrink-0">
                        Closest
                      </Badge>
                      <p className="text-sm">
                        <span className="font-semibold">
                          {recommendation.closest.name}
                        </span>{" "}
                        &mdash; {recommendation.closestDist.toFixed(1)} km from
                        target development site
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                toast.success("Comparison report generated", {
                  description:
                    "PDF report with full site comparison is ready for download.",
                })
              }
            >
              <Download className="h-4 w-4 mr-2" />
              Generate Comparison Report
            </Button>
            {recommendation?.bestOverall && (
              <Button
                variant="outline"
                onClick={() =>
                  toast.success(
                    `Deal created with ${recommendation.bestOverall!.name}`,
                    {
                      description:
                        "New deal has been created and assigned to your pipeline.",
                    }
                  )
                }
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Deal with {recommendation.bestOverall.name}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                toast.success("Comparison sent to developer portal", {
                  description:
                    "The developer will receive an email with a link to view the comparison.",
                })
              }
            >
              <Send className="h-4 w-4 mr-2" />
              Send to Developer
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {selectedSites.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Scale className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              No sites selected
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Select up to {MAX_SELECTED} sites above to begin comparing them
              side-by-side.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
