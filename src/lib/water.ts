/**
 * Query USGS Water Services for active nearby stream gauges and summarize the
 * latest discharge, drainage area, and distance from the selected point.
 */
import { toBoundingBox } from "@/lib/geospatial";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";
import { StreamGaugeResult } from "@/types";

const USGS_IV_ENDPOINT = "https://waterservices.usgs.gov/nwis/iv/";
const USGS_SITE_ENDPOINT = "https://waterservices.usgs.gov/nwis/site/";

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

function parseDrainageAreaRdb(text: string) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith("#"));

  const headerIndex = rows.findIndex((line) => line.startsWith("agency_cd\t"));
  if (headerIndex < 0 || headerIndex + 2 >= rows.length) {
    return new Map<string, number | null>();
  }

  const headers = rows[headerIndex].split("\t");
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

    const text = await response.text();
    return parseDrainageAreaRdb(text);
  } catch {
    return new Map<string, number | null>();
  }
}

export async function getNearbyStreamGauges(
  lat: number,
  lng: number,
  radiusKm = 25,
): Promise<StreamGaugeResult[]> {
  try {
    const bbox = toBoundingBox({ lat, lng }, radiusKm);
    const url =
      `${USGS_IV_ENDPOINT}?format=json` +
      `&bBox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}` +
      "&parameterCd=00060&siteType=ST&siteStatus=active";
    const response = await fetchWithTimeout(
      url,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 15 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as UsgsIvResponse;
    const gauges = (payload.value?.timeSeries ?? [])
      .map((series) => {
        const latitude = series.sourceInfo?.geoLocation?.geogLocation?.latitude;
        const longitude = series.sourceInfo?.geoLocation?.geogLocation?.longitude;
        const siteNumber = series.sourceInfo?.siteCode?.[0]?.value?.trim() ?? "";
        const stationName = series.sourceInfo?.siteName?.trim() ?? "";

        if (
          !siteNumber ||
          !stationName ||
          typeof latitude !== "number" ||
          typeof longitude !== "number"
        ) {
          return null;
        }

        const gauge: StreamGaugeResult = {
          siteNumber,
          stationName,
          dischargeCfs: parseNullableNumber(series.values?.[0]?.value?.[0]?.value),
          drainageAreaSqMi: null,
          distanceKm: Number(
            calculateDistanceKm({ lat, lng }, { lat: latitude, lng: longitude }).toFixed(1),
          ),
        };

        return gauge;
      })
      .filter((gauge): gauge is StreamGaugeResult => gauge !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm);

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
