import * as turf from "@turf/turf";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { StreamGaugeResult } from "@/types";

const USGS_IV_ENDPOINT = "https://waterservices.usgs.gov/nwis/iv/";
const USGS_SITE_ENDPOINT = "https://waterservices.usgs.gov/nwis/site/";
const BOUNDING_BOX_HALF_SPAN_DEGREES = 0.5;
const DEFAULT_RADIUS_KM = 50;

type UsgsTimeSeries = {
  sourceInfo?: {
    siteName?: string;
    siteCode?: Array<{ value?: string }>;
    geoLocation?: {
      geogLocation?: {
        latitude?: number;
        longitude?: number;
      };
    };
  };
  values?: Array<{
    value?: Array<{
      value?: string;
    }>;
  }>;
};

type UsgsIvResponse = {
  value?: {
    timeSeries?: UsgsTimeSeries[];
  };
};

function parseNullableNumber(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function calculateDistanceKm(lat: number, lng: number, targetLat: number, targetLng: number) {
  return turf.distance(
    turf.point([lng, lat]),
    turf.point([targetLng, targetLat]),
    { units: "kilometers" },
  );
}

function parseDrainageAreaRdb(text: string) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith("#"));

  const headerIndex = rows.findIndex((line) => line.startsWith("agency_cd\t"));
  if (headerIndex < 0 || headerIndex + 2 >= rows.length) {
    return new Map<string, number | null>();
  }

  const headers = rows[headerIndex]?.split("\t") ?? [];
  const siteNumberIndex = headers.indexOf("site_no");
  const drainageAreaIndex = headers.indexOf("drain_area_va");
  const result = new Map<string, number | null>();

  if (siteNumberIndex < 0 || drainageAreaIndex < 0) {
    return result;
  }

  for (const line of rows.slice(headerIndex + 2)) {
    const cells = line.split("\t");
    const siteNumber = cells[siteNumberIndex];
    if (!siteNumber) {
      continue;
    }

    result.set(siteNumber, parseNullableNumber(cells[drainageAreaIndex]));
  }

  return result;
}

async function fetchDrainageAreaMap(siteNumbers: string[]) {
  if (!siteNumbers.length) {
    return new Map<string, number | null>();
  }

  try {
    const url = `${USGS_SITE_ENDPOINT}?format=rdb&sites=${siteNumbers.join(",")}&siteOutput=expanded`;
    const response = await fetchWithTimeout(
      url,
      {
        headers: { Accept: "text/plain" },
        next: { revalidate: 60 * 30 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return new Map<string, number | null>();
    }

    return parseDrainageAreaRdb(await response.text());
  } catch {
    return new Map<string, number | null>();
  }
}

async function fetchInstantaneousValues(lat: number, lng: number) {
  const west = lng - BOUNDING_BOX_HALF_SPAN_DEGREES;
  const south = lat - BOUNDING_BOX_HALF_SPAN_DEGREES;
  const east = lng + BOUNDING_BOX_HALF_SPAN_DEGREES;
  const north = lat + BOUNDING_BOX_HALF_SPAN_DEGREES;
  const url =
    `${USGS_IV_ENDPOINT}?format=json` +
    `&bBox=${west},${south},${east},${north}` +
    "&parameterCd=00060&siteType=ST&siteStatus=active";

  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 15 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as UsgsIvResponse;
  } catch {
    return null;
  }
}

export async function getNearbyStreamGauges(
  lat: number,
  lng: number,
  radiusKm: number = DEFAULT_RADIUS_KM,
): Promise<StreamGaugeResult[]> {
  try {
    const payload = await fetchInstantaneousValues(lat, lng);
    const timeSeries = payload?.value?.timeSeries ?? [];
    if (!timeSeries.length) {
      return [];
    }

    const gauges = timeSeries
      .map((series): StreamGaugeResult | null => {
        const siteName = series.sourceInfo?.siteName?.trim() ?? "";
        const siteNumber = series.sourceInfo?.siteCode?.[0]?.value?.trim() ?? "";
        const gaugeLat = series.sourceInfo?.geoLocation?.geogLocation?.latitude;
        const gaugeLng = series.sourceInfo?.geoLocation?.geogLocation?.longitude;

        if (
          !siteName ||
          !siteNumber ||
          typeof gaugeLat !== "number" ||
          typeof gaugeLng !== "number"
        ) {
          return null;
        }

        const distanceKm = Number(calculateDistanceKm(lat, lng, gaugeLat, gaugeLng).toFixed(1));
        if (distanceKm > radiusKm) {
          return null;
        }

        return {
          siteName,
          siteNumber,
          distanceKm,
          dischargeCfs: parseNullableNumber(series.values?.[0]?.value?.[0]?.value),
          drainageAreaSqMi: null,
        };
      })
      .filter((gauge): gauge is StreamGaugeResult => gauge !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (!gauges.length) {
      return [];
    }

    const drainageAreaBySite = await fetchDrainageAreaMap(
      Array.from(new Set(gauges.map((gauge) => gauge.siteNumber))),
    );

    return gauges.map((gauge) => ({
      ...gauge,
      drainageAreaSqMi: drainageAreaBySite.get(gauge.siteNumber) ?? null,
    }));
  } catch {
    return [];
  }
}
