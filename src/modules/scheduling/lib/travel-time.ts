import { logger } from "@/shared/logger";
import type { TravelTimeResult } from "../scheduling.types";

const log = logger.child({ module: "scheduling.travel-time" });

// In-memory cache: key = "from:to", value = { result, expiresAt }
const cache = new Map<string, { result: TravelTimeResult; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Deterministic postcode distance estimation.
 * No API cost. Used as fallback and for sync callers.
 * Returns distance in km.
 */
export function estimatePostcodeDistance(from?: string, to?: string): number {
  if (!from || !to) return 5;
  const pc1 = from.replace(/\s/g, "").toUpperCase();
  const pc2 = to.replace(/\s/g, "").toUpperCase();
  if (pc1 === pc2) return 0;

  const area1 = pc1.match(/^[A-Z]{1,2}\d{1,2}/)?.[0] ?? pc1.substring(0, 4);
  const area2 = pc2.match(/^[A-Z]{1,2}\d{1,2}/)?.[0] ?? pc2.substring(0, 4);
  if (area1 === area2) return 2;

  const dist1 = pc1.match(/^[A-Z]{1,2}/)?.[0] ?? "";
  const dist2 = pc2.match(/^[A-Z]{1,2}/)?.[0] ?? "";
  if (dist1 === dist2) return 8;

  return 20;
}

export function getTravelTimeStatus(minutes: number): "green" | "amber" | "red" {
  if (minutes <= 15) return "green";
  if (minutes <= 30) return "amber";
  return "red";
}

export function formatTravelTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

/**
 * Sync travel time estimate (no API call).
 * Use for availability calculation, slot display, assignment health.
 * Returns estimated travel time in minutes.
 */
export function estimateTravelTime(
  fromPostcode?: string,
  toPostcode?: string
): number {
  const distKm = estimatePostcodeDistance(fromPostcode, toPostcode);
  return Math.max(
    Math.ceil((distKm / 30) * 60),
    fromPostcode === toPostcode ? 0 : 5
  );
}

/**
 * Async travel time via Mapbox Directions API.
 * Use for /admin/routes page and any UI requiring accurate distance.
 * Falls back to estimation if MAPBOX_ACCESS_TOKEN not set or API fails.
 */
export async function calculateTravelTime(
  fromPostcode: string,
  toPostcode: string
): Promise<TravelTimeResult> {
  const key = `${fromPostcode.toUpperCase()}:${toPostcode.toUpperCase()}`;

  // Check cache
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const token = process.env.MAPBOX_ACCESS_TOKEN;

  if (token) {
    try {
      const [from, to] = await Promise.all([
        geocodePostcode(fromPostcode, token),
        geocodePostcode(toPostcode, token),
      ]);

      if (from && to) {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from[0]},${from[1]};${to[0]},${to[1]}?access_token=${token}&overview=false`;
        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as {
            routes?: Array<{ duration: number; distance: number }>;
          };
          const route = data?.routes?.[0];
          if (route) {
            const minutes = Math.ceil(route.duration / 60);
            const miles = Math.round((route.distance / 1609.34) * 10) / 10;
            const result: TravelTimeResult = {
              minutes,
              miles,
              status: getTravelTimeStatus(minutes),
            };
            cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
            return result;
          }
        }
      }
    } catch (err) {
      log.warn(
        { err, fromPostcode, toPostcode },
        "Mapbox travel time failed, using fallback"
      );
    }
  }

  // Fallback to estimation
  const distKm = estimatePostcodeDistance(fromPostcode, toPostcode);
  const distMiles = distKm * 0.621371;
  const minutes = Math.max(Math.ceil((distKm / 30) * 60), 5);
  return {
    minutes,
    miles: Math.round(distMiles * 10) / 10,
    status: getTravelTimeStatus(minutes),
  };
}

async function geocodePostcode(
  postcode: string,
  token: string
): Promise<[number, number] | null> {
  try {
    const encoded = encodeURIComponent(postcode);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=gb&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{ center: [number, number] }>;
    };
    const center = data?.features?.[0]?.center;
    return center ? [center[0], center[1]] : null;
  } catch {
    return null;
  }
}
