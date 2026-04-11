import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";
import { BoundingBox, Coordinates } from "@/types";

export interface FireHazardSummary {
  activeFireCount7d: number | null;
  nearestFireKm: number | null;
  maxBrightnessTempK: number | null;
  dataSource: "MODIS" | "VIIRS" | null;
}

export interface FireDetection {
  id: string;
  lat: number;
  lng: number;
  brightnessTempK: number | null;
  distanceKm: number | null;
  acqDate: string | null;
  acqTime: string | null;
}

export function isFireHazardConfigured() {
  return Boolean(process.env.NASA_FIRMS_MAP_KEY);
}

function buildFirmsBoundingBox(coords: Coordinates) {
  const west = Math.max(coords.lng - 5, -180);
  const south = Math.max(coords.lat - 5, -90);
  const east = Math.min(coords.lng + 5, 180);
  const north = Math.min(coords.lat + 5, 90);
  return `${west},${south},${east},${north}`;
}

function parseCsvLines(csv: string) {
  return csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function fetchFirmsCsv(bbox: string) {
  const apiKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetchWithTimeout(
    `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${bbox}/5`,
    {
      headers: {
        "User-Agent": "GeoSight/1.0",
      },
      next: { revalidate: 60 * 60 * 3 },
    },
    EXTERNAL_TIMEOUTS.standard,
  );

  if (!response.ok) {
    throw new Error("NASA FIRMS request failed.");
  }

  return parseCsvLines(await response.text());
}

function toFireDetection(
  line: string,
  center: Coordinates,
  index: number,
): FireDetection | null {
  const columns = line.split(",");
  const lat = Number(columns[0]);
  const lng = Number(columns[1]);
  const brightness = Number(columns[2]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const distanceKm = calculateDistanceKm(center, { lat, lng });

  return {
    id: `firms-${lat.toFixed(4)}-${lng.toFixed(4)}-${index}`,
    lat,
    lng,
    brightnessTempK: Number.isFinite(brightness) ? Number(brightness.toFixed(1)) : null,
    distanceKm: Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(1)) : null,
    acqDate: columns[5]?.trim() || null,
    acqTime: columns[6]?.trim() || null,
  };
}

function buildBoundingBoxFromShape(bbox: BoundingBox) {
  const west = Math.max(bbox.west, -180);
  const south = Math.max(bbox.south, -90);
  const east = Math.min(bbox.east, 180);
  const north = Math.min(bbox.north, 90);
  return `${west},${south},${east},${north}`;
}

export async function fetchFireDetections(
  center: Coordinates,
  limit = 160,
): Promise<FireDetection[]> {
  try {
    const lines = await fetchFirmsCsv(buildFirmsBoundingBox(center));
    if (!lines || lines.length <= 1) {
      return [];
    }

    return lines
      .slice(1)
      .map((line, index) => toFireDetection(line, center, index))
      .filter((detection): detection is FireDetection => detection !== null)
      .sort((a, b) => {
        const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      })
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function fetchFireDetectionsForBoundingBox(
  bbox: BoundingBox,
  center: Coordinates,
  limit = 200,
): Promise<FireDetection[]> {
  try {
    const lines = await fetchFirmsCsv(buildBoundingBoxFromShape(bbox));
    if (!lines || lines.length <= 1) {
      return [];
    }

    return lines
      .slice(1)
      .map((line, index) => toFireDetection(line, center, index))
      .filter((detection): detection is FireDetection => detection !== null)
      .sort((a, b) => {
        const aDistance = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const bDistance = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      })
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function fetchFireHazardSummary(
  coords: Coordinates,
): Promise<FireHazardSummary> {
  try {
    if (!process.env.NASA_FIRMS_MAP_KEY) {
      return {
        activeFireCount7d: null,
        nearestFireKm: null,
        maxBrightnessTempK: null,
        dataSource: null,
      };
    }

    const lines = await fetchFirmsCsv(buildFirmsBoundingBox(coords));
    if (!lines || lines.length <= 1) {
      return {
        activeFireCount7d: 0,
        nearestFireKm: null,
        maxBrightnessTempK: null,
        dataSource: "VIIRS",
      };
    }

    let nearestFireKm: number | null = null;
    let maxBrightnessTempK: number | null = null;
    let activeFireCount = 0;

    for (const [index, line] of lines.slice(1).entries()) {
      const detection = toFireDetection(line, coords, index);
      if (!detection) {
        continue;
      }

      activeFireCount += 1;
      nearestFireKm =
        nearestFireKm === null
          ? detection.distanceKm
          : Math.min(nearestFireKm, detection.distanceKm ?? nearestFireKm);

      if (typeof detection.brightnessTempK === "number") {
        maxBrightnessTempK =
          maxBrightnessTempK === null
            ? detection.brightnessTempK
            : Math.max(maxBrightnessTempK, detection.brightnessTempK);
      }
    }

    return {
      activeFireCount7d: activeFireCount,
      nearestFireKm: nearestFireKm === null ? null : Number(nearestFireKm.toFixed(1)),
      maxBrightnessTempK:
        maxBrightnessTempK === null ? null : Number(maxBrightnessTempK.toFixed(1)),
      dataSource: "VIIRS",
    };
  } catch {
    return {
      activeFireCount7d: null,
      nearestFireKm: null,
      maxBrightnessTempK: null,
      dataSource: null,
    };
  }
}
