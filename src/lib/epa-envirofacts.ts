/**
 * Query EPA Envirofacts screening datasets for nearby Superfund and TRI sites,
 * returning counts and the nearest mapped contamination-related facility.
 */
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";
import { Coordinates, EPAHazardResult } from "@/types";

const EPA_SEARCH_RADIUS_KM = 50;
const EPA_DEGREE_SPAN = 0.5;
const FCC_AREA_ENDPOINT = "https://geo.fcc.gov/api/census/area";

type FccAreaResponse = {
  results?: Array<{
    state_code?: string;
  }>;
};

type EpaSiteCandidate = {
  name: string;
  distanceKm: number;
};

type JsonRecord = Record<string, unknown>;

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

async function fetchStateCode(coords: Coordinates) {
  try {
    const response = await fetchWithTimeout(
      `${FCC_AREA_ENDPOINT}?lat=${coords.lat}&lon=${coords.lng}&format=json`,
      {
        next: { revalidate: 60 * 60 * 24 },
      },
      EXTERNAL_TIMEOUTS.fast,
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as FccAreaResponse;
    return payload.results?.[0]?.state_code?.trim().toUpperCase() ?? null;
  } catch {
    return null;
  }
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

function toNearbyCandidate(
  coords: Coordinates,
  name: string | null,
  latitude: number | null,
  longitude: number | null,
) {
  if (!name || latitude === null || longitude === null) {
    return null;
  }

  const distanceKm = Number(
    calculateDistanceKm(coords, { lat: latitude, lng: longitude }).toFixed(1),
  );

  if (distanceKm > EPA_SEARCH_RADIUS_KM) {
    return null;
  }

  return {
    name,
    distanceKm,
  } satisfies EpaSiteCandidate;
}

async function fetchJsonArray(url: string) {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 12 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? payload : [];
  } catch {
    return [];
  }
}

async function fetchSuperfundSites(coords: Coordinates, stateCode: string) {
  const minLat = coords.lat - EPA_DEGREE_SPAN;
  const maxLat = coords.lat + EPA_DEGREE_SPAN;
  const url =
    "https://data.epa.gov/dmapservice/sems.envirofacts_site/" +
    `fk_ref_state_code/equals/${encodeURIComponent(stateCode)}/` +
    `primary_latitude_decimal_val/greaterThan/${minLat}/` +
    `primary_latitude_decimal_val/lessThan/${maxLat}/1:200/JSON`;
  const payload = await fetchJsonArray(url);

  return payload
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      return toNearbyCandidate(
        coords,
        asString(entry.name),
        asNumber(entry.primary_latitude_decimal_val),
        asNumber(entry.primary_longitude_decimal_val),
      );
    })
    .filter((site): site is EpaSiteCandidate => site !== null);
}

async function fetchTriFacilities(coords: Coordinates) {
  const minLat = Math.round((coords.lat - EPA_DEGREE_SPAN) * 10_000);
  const maxLat = Math.round((coords.lat + EPA_DEGREE_SPAN) * 10_000);
  const absLongitude = Math.abs(coords.lng);
  const minLng = Math.round((absLongitude - EPA_DEGREE_SPAN) * 10_000);
  const maxLng = Math.round((absLongitude + EPA_DEGREE_SPAN) * 10_000);
  const url =
    "https://data.epa.gov/dmapservice/tri.tri_facility/" +
    `fac_latitude/greaterThan/${minLat}/fac_latitude/lessThan/${maxLat}/` +
    `fac_longitude/greaterThan/${minLng}/fac_longitude/lessThan/${maxLng}/1:200/JSON`;
  const payload = await fetchJsonArray(url);

  return payload
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const latitude =
        normalizeTriCoordinate(entry.pref_latitude, false) ??
        normalizeTriCoordinate(entry.fac_latitude, false);
      const longitude =
        normalizeTriCoordinate(entry.pref_longitude, true) ??
        normalizeTriCoordinate(entry.fac_longitude, true);

      return toNearbyCandidate(
        coords,
        asString(entry.facility_name),
        latitude,
        longitude,
      );
    })
    .filter((site): site is EpaSiteCandidate => site !== null);
}

export async function getEPAHazards(
  coords: Coordinates,
): Promise<EPAHazardResult> {
  try {
    const stateCode = await fetchStateCode(coords);
    if (!stateCode) {
      return {
        superfundSiteCount: 0,
        triFacilityCount: 0,
        nearestSiteName: null,
        nearestSiteDistanceKm: null,
        nearestSiteType: null,
        nearestSuperfundDistanceKm: null,
        hasSuperfundWithin10Km: false,
      };
    }

    const [superfundSites, triFacilities] = await Promise.all([
      fetchSuperfundSites(coords, stateCode),
      fetchTriFacilities(coords),
    ]);
    const nearestSuperfund = [...superfundSites].sort((a, b) => a.distanceKm - b.distanceKm)[0];
    const nearestTri = [...triFacilities].sort((a, b) => a.distanceKm - b.distanceKm)[0];
    const nearestSite =
      !nearestSuperfund
        ? nearestTri
          ? { ...nearestTri, type: "tri" as const }
          : null
        : !nearestTri || nearestSuperfund.distanceKm <= nearestTri.distanceKm
          ? { ...nearestSuperfund, type: "superfund" as const }
          : { ...nearestTri, type: "tri" as const };

    return {
      superfundSiteCount: superfundSites.length,
      triFacilityCount: triFacilities.length,
      nearestSiteName: nearestSite?.name ?? null,
      nearestSiteDistanceKm: nearestSite?.distanceKm ?? null,
      nearestSiteType: nearestSite?.type ?? null,
      nearestSuperfundDistanceKm: nearestSuperfund?.distanceKm ?? null,
      hasSuperfundWithin10Km:
        typeof nearestSuperfund?.distanceKm === "number" && nearestSuperfund.distanceKm <= 10,
    };
  } catch {
    return {
      superfundSiteCount: 0,
      triFacilityCount: 0,
      nearestSiteName: null,
      nearestSiteDistanceKm: null,
      nearestSiteType: null,
      nearestSuperfundDistanceKm: null,
      hasSuperfundWithin10Km: false,
    };
  }
}
