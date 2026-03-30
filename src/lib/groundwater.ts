import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";
import { Coordinates } from "@/types";

export interface GroundwaterWell {
  siteNumber: string;
  siteName: string;
  lat: number;
  lng: number;
  distanceKm: number;
  wellDepthFt: number | null;
  currentLevelFt: number | null;
  measurementDate: string | null;
}

export interface GroundwaterSummary {
  wells: GroundwaterWell[];
  nearestWell: GroundwaterWell | null;
  wellCount: number;
}

const LEGACY_GROUNDWATER_ENDPOINT = "https://waterservices.usgs.gov/nwis/gwlevels/";
const FIELD_MEASUREMENTS_ENDPOINT =
  "https://api.waterdata.usgs.gov/ogcapi/v0/collections/field-measurements/items";
const MONITORING_LOCATIONS_ENDPOINT =
  "https://api.waterdata.usgs.gov/ogcapi/v0/collections/monitoring-locations/items";
const BOUNDING_BOX_HALF_SPAN_DEGREES = 0.5;
const GROUNDWATER_PARAMETER_CODE = "72019";
const EMPTY_RESULT: GroundwaterSummary = {
  wells: [],
  nearestWell: null,
  wellCount: 0,
};

type LegacyValuePoint = {
  value?: string;
  dateTime?: string;
};

type LegacyTimeSeries = {
  sourceInfo?: {
    siteName?: string;
    siteCode?: Array<{ value?: string }>;
    geoLocation?: {
      geogLocation?: {
        latitude?: number;
        longitude?: number;
      };
    };
    siteProperty?: Array<{
      name?: string;
      value?: string;
    }>;
  };
  values?: Array<{
    value?: LegacyValuePoint[];
  }>;
};

type LegacyGroundwaterResponse = {
  value?: {
    timeSeries?: LegacyTimeSeries[];
  };
};

type ModernFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    monitoring_location_id?: string;
    value?: string;
    time?: string;
  };
};

type ModernFeatureCollection = {
  features?: ModernFeature[];
};

type MonitoringLocationFeature = {
  properties?: {
    id?: string;
    monitoring_location_number?: string;
    monitoring_location_name?: string;
    well_constructed_depth?: number | string | null;
  };
};

type MonitoringLocationCollection = {
  features?: MonitoringLocationFeature[];
};

function isUsCoordinate({ lat, lng }: Coordinates) {
  return lat >= 18 && lat <= 72 && lng >= -180 && lng <= -64;
}

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

function finalizeGroundwaterResult(wells: GroundwaterWell[]) {
  const sortedWells = [...wells].sort((a, b) => a.distanceKm - b.distanceKm);
  const nearestFive = sortedWells.slice(0, 5);

  return {
    wells: nearestFive,
    nearestWell: nearestFive[0] ?? null,
    wellCount: sortedWells.length,
  } satisfies GroundwaterSummary;
}

function extractLegacyWellDepth(
  siteProperty: Array<{
    name?: string;
    value?: string;
  }> | null | undefined,
) {
  const depthProperty = (siteProperty ?? []).find((property) => {
    const normalizedName = property.name?.trim().toLowerCase() ?? "";
    return normalizedName.includes("well") && normalizedName.includes("depth");
  });

  return parseNullableNumber(depthProperty?.value);
}

function buildLegacyQueryUrl(coords: Coordinates) {
  const west = coords.lng - BOUNDING_BOX_HALF_SPAN_DEGREES;
  const south = coords.lat - BOUNDING_BOX_HALF_SPAN_DEGREES;
  const east = coords.lng + BOUNDING_BOX_HALF_SPAN_DEGREES;
  const north = coords.lat + BOUNDING_BOX_HALF_SPAN_DEGREES;
  const url = new URL(LEGACY_GROUNDWATER_ENDPOINT);

  url.searchParams.set("format", "json");
  url.searchParams.set("bBox", `${west},${south},${east},${north}`);
  url.searchParams.set("siteType", "GW");
  url.searchParams.set("period", "P30D");
  url.searchParams.set("siteStatus", "active");

  return url.toString();
}

async function fetchLegacyGroundwater(coords: Coordinates) {
  const response = await fetchWithTimeout(
    buildLegacyQueryUrl(coords),
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 30 },
    },
    EXTERNAL_TIMEOUTS.standard,
  );

  if (!response.ok) {
    return EMPTY_RESULT;
  }

  const payload = (await response.json()) as LegacyGroundwaterResponse;
  const wells = (payload.value?.timeSeries ?? [])
    .map((series): GroundwaterWell | null => {
      const siteNumber = series.sourceInfo?.siteCode?.[0]?.value?.trim() ?? "";
      const siteName = series.sourceInfo?.siteName?.trim() ?? "";
      const lat = series.sourceInfo?.geoLocation?.geogLocation?.latitude;
      const lng = series.sourceInfo?.geoLocation?.geogLocation?.longitude;

      if (!siteNumber || !siteName || typeof lat !== "number" || typeof lng !== "number") {
        return null;
      }

      const latestMeasurement = [...(series.values?.[0]?.value ?? [])]
        .sort(
          (left, right) =>
            Date.parse(right.dateTime ?? "") - Date.parse(left.dateTime ?? ""),
        )[0];

      return {
        siteNumber,
        siteName,
        lat,
        lng,
        distanceKm: Number(calculateDistanceKm(coords, { lat, lng }).toFixed(1)),
        wellDepthFt: extractLegacyWellDepth(series.sourceInfo?.siteProperty),
        currentLevelFt: parseNullableNumber(latestMeasurement?.value),
        measurementDate: latestMeasurement?.dateTime ?? null,
      };
    })
    .filter((well): well is GroundwaterWell => well !== null);

  return wells.length ? finalizeGroundwaterResult(wells) : EMPTY_RESULT;
}

function buildFieldMeasurementsQueryUrl(coords: Coordinates) {
  const west = coords.lng - BOUNDING_BOX_HALF_SPAN_DEGREES;
  const south = coords.lat - BOUNDING_BOX_HALF_SPAN_DEGREES;
  const east = coords.lng + BOUNDING_BOX_HALF_SPAN_DEGREES;
  const north = coords.lat + BOUNDING_BOX_HALF_SPAN_DEGREES;
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const url = new URL(FIELD_MEASUREMENTS_ENDPOINT);

  url.searchParams.set("bbox", `${west},${south},${east},${north}`);
  url.searchParams.set("parameter_code", GROUNDWATER_PARAMETER_CODE);
  url.searchParams.set("time", `${start}/..`);
  url.searchParams.set("sortby", "-time");
  url.searchParams.set("limit", "200");

  return url.toString();
}

async function fetchMonitoringLocationMap(siteIds: string[]) {
  if (!siteIds.length) {
    return new Map<
      string,
      {
        siteNumber: string;
        siteName: string;
        wellDepthFt: number | null;
      }
    >();
  }

  const url = new URL(MONITORING_LOCATIONS_ENDPOINT);
  url.searchParams.set("id", siteIds.join(","));
  url.searchParams.set("limit", String(siteIds.length));

  const response = await fetchWithTimeout(
    url.toString(),
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 12 },
    },
    EXTERNAL_TIMEOUTS.standard,
  );

  if (!response.ok) {
    return new Map<
      string,
      {
        siteNumber: string;
        siteName: string;
        wellDepthFt: number | null;
      }
    >();
  }

  const payload = (await response.json()) as MonitoringLocationCollection;

  return new Map(
    (payload.features ?? [])
      .map((feature) => {
        const id = feature.properties?.id?.trim() ?? "";
        if (!id) {
          return null;
        }

        return [
          id,
          {
            siteNumber:
              feature.properties?.monitoring_location_number?.trim() ??
              id.replace(/^USGS-/, ""),
            siteName:
              feature.properties?.monitoring_location_name?.trim() ?? "USGS monitoring well",
            wellDepthFt: parseNullableNumber(feature.properties?.well_constructed_depth),
          },
        ] as const;
      })
      .filter(
        (
          entry,
        ): entry is readonly [
          string,
          {
            siteNumber: string;
            siteName: string;
            wellDepthFt: number | null;
          },
        ] => entry !== null,
      ),
  );
}

async function fetchModernGroundwater(coords: Coordinates) {
  const response = await fetchWithTimeout(
    buildFieldMeasurementsQueryUrl(coords),
    {
      headers: { Accept: "application/geo+json, application/json" },
      next: { revalidate: 60 * 30 },
    },
    EXTERNAL_TIMEOUTS.standard,
  );

  if (!response.ok) {
    return EMPTY_RESULT;
  }

  const payload = (await response.json()) as ModernFeatureCollection;
  const latestMeasurements = new Map<string, ModernFeature>();

  for (const feature of payload.features ?? []) {
    const siteId = feature.properties?.monitoring_location_id?.trim() ?? "";
    if (!siteId || latestMeasurements.has(siteId)) {
      continue;
    }

    latestMeasurements.set(siteId, feature);
  }

  if (!latestMeasurements.size) {
    return EMPTY_RESULT;
  }

  const monitoringLocationMap = await fetchMonitoringLocationMap(
    Array.from(latestMeasurements.keys()),
  );
  const wells = Array.from(latestMeasurements.entries())
    .map(([siteId, feature]): GroundwaterWell | null => {
      const coordinates = feature.geometry?.coordinates;
      const [lng, lat] = Array.isArray(coordinates) ? coordinates : [];

      if (typeof lat !== "number" || typeof lng !== "number") {
        return null;
      }

      const locationInfo = monitoringLocationMap.get(siteId);

      return {
        siteNumber: locationInfo?.siteNumber ?? siteId.replace(/^USGS-/, ""),
        siteName: locationInfo?.siteName ?? "USGS monitoring well",
        lat,
        lng,
        distanceKm: Number(calculateDistanceKm(coords, { lat, lng }).toFixed(1)),
        wellDepthFt: locationInfo?.wellDepthFt ?? null,
        currentLevelFt: parseNullableNumber(feature.properties?.value),
        measurementDate: feature.properties?.time ?? null,
      };
    })
    .filter((well): well is GroundwaterWell => well !== null);

  return wells.length ? finalizeGroundwaterResult(wells) : EMPTY_RESULT;
}

export async function getNearbyGroundwaterWells(
  coords: Coordinates,
): Promise<GroundwaterSummary> {
  if (!isUsCoordinate(coords)) {
    return EMPTY_RESULT;
  }

  try {
    const [legacyResult, modernResult] = await Promise.allSettled([
      fetchLegacyGroundwater(coords),
      fetchModernGroundwater(coords),
    ]);

    if (legacyResult.status === "fulfilled" && legacyResult.value.wellCount > 0) {
      return legacyResult.value;
    }

    if (modernResult.status === "fulfilled" && modernResult.value.wellCount > 0) {
      return modernResult.value;
    }

    if (legacyResult.status === "fulfilled") {
      return legacyResult.value;
    }

    if (modernResult.status === "fulfilled") {
      return modernResult.value;
    }

    return EMPTY_RESULT;
  } catch {
    return EMPTY_RESULT;
  }
}
