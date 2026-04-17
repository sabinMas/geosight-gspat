// EEA E-PRTR (European Pollutant Release and Transfer Register)
// Industrial facilities data for European locations — non-US contamination context
// Source: https://industry.eea.europa.eu (EEA IED/PRTR data via Discomap ArcGIS REST)
// Free, no API key required, global European coverage

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { EPAHazardResult } from "@/types";

const DEGREE_SPAN = 0.5;
const MAX_DISTANCE_KM = 50;

const EEA_FACILITIES_ENDPOINT =
  "https://discomap.eea.europa.eu/arcgis/rest/services/EPER_PRTR/EPR_facilities/MapServer/0/query";

type EEAAttributes = {
  FACILITY_NAME?: string | null;
  SITE_NAME?: string | null;
  Latitude?: number | null;
  Longitude?: number | null;
  LAT?: number | null;
  LONG?: number | null;
};

type EEAFeature = {
  attributes?: EEAAttributes;
};

type EEAResponse = {
  features?: EEAFeature[];
  error?: { message?: string };
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns nearby EEA industrial/polluting facilities within ~50 km.
 * Uses the EEA E-PRTR facility registry (Discomap ArcGIS REST).
 * Returns null on API failure — callers should treat null as "data unavailable".
 *
 * The result reuses EPAHazardResult so it slots into the same geodata field.
 * `superfundCount` → total EEA facility count
 * `triCount`       → 0 (no direct TRI equivalent in EU)
 * `nearestSuperfundName` → nearest EEA facility name
 * `source`         → "eea"
 */
export async function getEEAIndustrialFacilities(
  lat: number,
  lng: number,
): Promise<EPAHazardResult | null> {
  try {
    const minLat = lat - DEGREE_SPAN;
    const maxLat = lat + DEGREE_SPAN;
    const minLng = lng - DEGREE_SPAN;
    const maxLng = lng + DEGREE_SPAN;

    const url = new URL(EEA_FACILITIES_ENDPOINT);
    url.searchParams.set(
      "geometry",
      JSON.stringify({ xmin: minLng, ymin: minLat, xmax: maxLng, ymax: maxLat }),
    );
    url.searchParams.set("geometryType", "esriGeometryEnvelope");
    url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
    url.searchParams.set("inSR", "4326");
    url.searchParams.set(
      "outFields",
      "FACILITY_NAME,SITE_NAME,Latitude,Longitude,LAT,LONG",
    );
    url.searchParams.set("returnGeometry", "false");
    url.searchParams.set("f", "json");
    url.searchParams.set("resultRecordCount", "200");

    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as EEAResponse;

    if (payload.error || !Array.isArray(payload.features)) return null;

    const candidates = payload.features
      .map((feature) => {
        const a = feature.attributes;
        if (!a) return null;
        const facilityLat = a.Latitude ?? a.LAT ?? null;
        const facilityLng = a.Longitude ?? a.LONG ?? null;
        const name = (a.FACILITY_NAME ?? a.SITE_NAME ?? "").trim() || null;
        if (!name || facilityLat === null || facilityLng === null) return null;
        const distanceKm = haversineKm(lat, lng, facilityLat, facilityLng);
        if (distanceKm > MAX_DISTANCE_KM) return null;
        return { name, distanceKm };
      })
      .filter((c): c is { name: string; distanceKm: number } => c !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    // If the API returned features but none are within range, return a valid "none nearby" result
    const nearest = candidates[0] ?? null;
    return {
      superfundCount: candidates.length,
      triCount: 0,
      nearestSuperfundName: nearest?.name ?? null,
      nearestSuperfundDistanceKm: nearest ? Number(nearest.distanceKm.toFixed(1)) : null,
      source: "eea",
    };
  } catch {
    return null;
  }
}
