import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import type { Coordinates } from "@/types";

export interface SeismicDesignParams {
  ss: number | null;
  s1: number | null;
  siteClass: string | null;
  riskCategory: string | null;
  pga: number | null;
  dataSource: string;
  /** Non-US only: qualitative seismic exposure tier derived from USGS Catalog */
  exposureTier?: string | null;
  /** Non-US only: M3+ event count in 400 km radius over 5 years */
  catalogEventCount5yr?: number | null;
  /** Non-US only: maximum magnitude in 400 km radius over 5 years */
  catalogMaxMagnitude5yr?: number | null;
}

const USGS_DESIGN_MAPS_ENDPOINT =
  "https://earthquake.usgs.gov/ws/designmaps/asce7-22.json";
const DATA_SOURCE = "ASCE 7-22 via USGS";
const NULL_SEISMIC_PARAMS: SeismicDesignParams = {
  ss: null,
  s1: null,
  siteClass: null,
  riskCategory: null,
  pga: null,
  dataSource: DATA_SOURCE,
};

type SeismicDesignResponse = {
  request?: {
    status?: string;
    parameters?: {
      siteClass?: string;
      riskCategory?: string;
    };
  };
  response?: {
    data?: {
      ss?: number | null;
      s1?: number | null;
      pga?: number | null;
      pgam?: number | null;
      siteClass?: string | null;
      sdc?: string | null;
    };
  } | string;
};

function parseNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getSeismicDesignParams(
  coords: Coordinates,
): Promise<SeismicDesignParams> {
  try {
    const url = new URL(USGS_DESIGN_MAPS_ENDPOINT);
    url.searchParams.set("latitude", String(coords.lat));
    url.searchParams.set("longitude", String(coords.lng));
    url.searchParams.set("riskCategory", "II");
    url.searchParams.set("siteClass", "D");
    url.searchParams.set("title", "GeoSight");

    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return NULL_SEISMIC_PARAMS;
    }

    const payload = (await response.json()) as SeismicDesignResponse;
    const data =
      payload.response && typeof payload.response === "object"
        ? payload.response.data
        : undefined;

    if (payload.request?.status !== "success" || !data) {
      return NULL_SEISMIC_PARAMS;
    }

    return {
      ss: parseNullableNumber(data.ss),
      s1: parseNullableNumber(data.s1),
      siteClass:
        (typeof data.siteClass === "string" && data.siteClass.trim()) ||
        (typeof payload.request?.parameters?.siteClass === "string" &&
          payload.request.parameters.siteClass.trim()) ||
        null,
      riskCategory:
        (typeof payload.request?.parameters?.riskCategory === "string" &&
          payload.request.parameters.riskCategory.trim()) ||
        null,
      pga: parseNullableNumber(data.pga) ?? parseNullableNumber(data.pgam),
      dataSource: DATA_SOURCE,
    };
  } catch {
    return NULL_SEISMIC_PARAMS;
  }
}

// ---------------------------------------------------------------------------
// Global seismic exposure — derived from USGS Earthquake Catalog (M3+, 5 yr)
// Used for non-US coordinates where ASCE design maps don't apply
// ---------------------------------------------------------------------------

type UsgsFeatureCollection = {
  features?: Array<{
    properties?: { mag?: number | null };
    geometry?: { coordinates?: [number, number, number?] };
  }>;
};

function classifyExposureTier(eventCount: number, maxMag: number): string {
  if (maxMag >= 7.0) return "Very High";
  if (maxMag >= 6.0 || eventCount >= 40) return "High";
  if (maxMag >= 5.0 || eventCount >= 15) return "Moderate";
  if (maxMag >= 4.0 || eventCount >= 5) return "Low";
  return "Very Low";
}

export async function getGlobalSeismicHazard(coords: Coordinates): Promise<SeismicDesignParams> {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 5 * 365.25 * 24 * 60 * 60 * 1000);
    const url = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query.geojson");
    url.searchParams.set("format", "geojson");
    url.searchParams.set("latitude", String(coords.lat));
    url.searchParams.set("longitude", String(coords.lng));
    url.searchParams.set("maxradiuskm", "400");
    url.searchParams.set("minmagnitude", "3.0");
    url.searchParams.set("starttime", start.toISOString());
    url.searchParams.set("endtime", end.toISOString());
    url.searchParams.set("orderby", "magnitude");
    url.searchParams.set("limit", "100");

    const res = await fetchWithTimeout(
      url.toString(),
      { next: { revalidate: 60 * 60 * 24 } },
      EXTERNAL_TIMEOUTS.standard,
    );
    if (!res.ok) return NULL_SEISMIC_PARAMS;

    const json = (await res.json()) as UsgsFeatureCollection;
    const events = json.features ?? [];
    const mags = events
      .map((f) => f.properties?.mag)
      .filter((m): m is number => typeof m === "number" && Number.isFinite(m));

    const eventCount = events.length;
    const maxMag = mags.length > 0 ? Math.max(...mags) : 0;

    return {
      ss: null,
      s1: null,
      siteClass: null,
      riskCategory: null,
      pga: null,
      dataSource: "USGS Earthquake Catalog — global seismic exposure estimate",
      exposureTier: classifyExposureTier(eventCount, maxMag),
      catalogEventCount5yr: eventCount,
      catalogMaxMagnitude5yr: mags.length > 0 ? Number(maxMag.toFixed(1)) : null,
    };
  } catch {
    return NULL_SEISMIC_PARAMS;
  }
}
