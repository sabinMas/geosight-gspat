import * as turf from "@turf/turf";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { EPAHazardResult } from "@/types";

const EPA_DEGREE_SPAN = 0.5;
const EPA_SEARCH_RADIUS_KM = 50;
const MAX_EPA_PAYLOAD_BYTES = 5_000_000;

type JsonRecord = Record<string, unknown>;

type HazardCandidate = {
  name: string;
  distanceKm: number;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTriCoordinate(value: unknown, isLongitude: boolean) {
  const numeric = asNumber(value);
  if (numeric === null) {
    return null;
  }

  if (Math.abs(numeric) > 1000) {
    const scaled = numeric / 10_000;
    return isLongitude && scaled > 0 ? -scaled : scaled;
  }

  return isLongitude && numeric > 0 ? -numeric : numeric;
}

function calculateDistanceKm(lat: number, lng: number, targetLat: number, targetLng: number) {
  return turf.distance(
    turf.point([lng, lat]),
    turf.point([targetLng, targetLat]),
    { units: "kilometers" },
  );
}

function toNearbyCandidate(
  lat: number,
  lng: number,
  name: string | null,
  candidateLat: number | null,
  candidateLng: number | null,
) {
  if (!name || candidateLat === null || candidateLng === null) {
    return null;
  }

  const distanceKm = Number(calculateDistanceKm(lat, lng, candidateLat, candidateLng).toFixed(1));
  if (distanceKm > EPA_SEARCH_RADIUS_KM) {
    return null;
  }

  return {
    name,
    distanceKm,
  } satisfies HazardCandidate;
}

async function fetchJsonArray(url: string) {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
        next: { revalidate: 60 * 60 * 12 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return null;
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_EPA_PAYLOAD_BYTES) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? payload : null;
  } catch {
    return null;
  }
}

async function fetchSuperfundSites(lat: number, lng: number) {
  const minLat = lat - EPA_DEGREE_SPAN;
  const maxLat = lat + EPA_DEGREE_SPAN;
  const minLng = lng - EPA_DEGREE_SPAN;
  const maxLng = lng + EPA_DEGREE_SPAN;
  const efserviceUrl =
    "https://data.epa.gov/efservice/" +
    `CERCLIS_SITES/LATITUDE83/BEGINNING/${minLat}/ENDING/${maxLat}/` +
    `LONGITUDE83/BEGINNING/${minLng}/ENDING/${maxLng}/JSON`;
  const dmapUrl =
    "https://data.epa.gov/dmapservice/sems.envirofacts_site/" +
    `primary_latitude_decimal_val/greaterThan/${minLat}/` +
    `primary_latitude_decimal_val/lessThan/${maxLat}/` +
    `primary_longitude_decimal_val/greaterThan/${minLng}/` +
    `primary_longitude_decimal_val/lessThan/${maxLng}/1:500/JSON`;
  const payload = (await fetchJsonArray(dmapUrl)) ?? (await fetchJsonArray(efserviceUrl)) ?? [];

  return payload
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      return toNearbyCandidate(
        lat,
        lng,
        asString(entry.site_name) ??
          asString(entry.name) ??
          asString(entry.site_alias_name) ??
          asString(entry.site_id),
        asNumber(entry.latitude83) ??
          asNumber(entry.primary_latitude_decimal_val) ??
          asNumber(entry.latitude),
        asNumber(entry.longitude83) ??
          asNumber(entry.primary_longitude_decimal_val) ??
          asNumber(entry.longitude),
      );
    })
    .filter((candidate): candidate is HazardCandidate => candidate !== null);
}

async function fetchTriFacilities(lat: number, lng: number) {
  const minLat = lat - EPA_DEGREE_SPAN;
  const maxLat = lat + EPA_DEGREE_SPAN;
  const minLng = lng - EPA_DEGREE_SPAN;
  const maxLng = lng + EPA_DEGREE_SPAN;
  const efserviceUrl =
    "https://data.epa.gov/efservice/" +
    `TRI_FACILITY/LATITUDE82/BEGINNING/${minLat}/ENDING/${maxLat}/` +
    `LONGITUDE82/BEGINNING/${minLng}/ENDING/${maxLng}/JSON`;
  const absLongitude = Math.abs(lng);
  const dmapMinLng = Math.round((absLongitude - EPA_DEGREE_SPAN) * 10_000);
  const dmapMaxLng = Math.round((absLongitude + EPA_DEGREE_SPAN) * 10_000);
  const dmapMinLat = Math.round(minLat * 10_000);
  const dmapMaxLat = Math.round(maxLat * 10_000);
  const dmapUrl =
    "https://data.epa.gov/dmapservice/tri.tri_facility/" +
    `fac_latitude/greaterThan/${dmapMinLat}/` +
    `fac_latitude/lessThan/${dmapMaxLat}/` +
    `fac_longitude/greaterThan/${dmapMinLng}/` +
    `fac_longitude/lessThan/${dmapMaxLng}/1:500/JSON`;
  const payload = (await fetchJsonArray(dmapUrl)) ?? (await fetchJsonArray(efserviceUrl)) ?? [];

  return payload
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const triLat =
        asNumber(entry.latitude82) ??
        normalizeTriCoordinate(entry.pref_latitude, false) ??
        normalizeTriCoordinate(entry.fac_latitude, false);
      const triLng =
        asNumber(entry.longitude82) ??
        normalizeTriCoordinate(entry.pref_longitude, true) ??
        normalizeTriCoordinate(entry.fac_longitude, true);

      return toNearbyCandidate(
        lat,
        lng,
        asString(entry.facility_name) ??
          asString(entry.site_name) ??
          asString(entry.name),
        triLat,
        triLng,
      );
    })
    .filter((candidate): candidate is HazardCandidate => candidate !== null);
}

export async function getEPAHazards(
  lat: number,
  lng: number,
): Promise<EPAHazardResult> {
  try {
    const [superfundSites, triFacilities] = await Promise.all([
      fetchSuperfundSites(lat, lng),
      fetchTriFacilities(lat, lng),
    ]);
    const nearestSuperfund = [...superfundSites].sort((a, b) => a.distanceKm - b.distanceKm)[0];

    return {
      superfundCount: superfundSites.length,
      triCount: triFacilities.length,
      nearestSuperfundName: nearestSuperfund?.name ?? null,
      nearestSuperfundDistanceKm: nearestSuperfund?.distanceKm ?? null,
    };
  } catch {
    return {
      superfundCount: 0,
      triCount: 0,
      nearestSuperfundName: null,
      nearestSuperfundDistanceKm: null,
    };
  }
}
