import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";
import { Coordinates } from "@/types";

export interface FireHazardSummary {
  activeFireCount7d: number | null;
  nearestFireKm: number | null;
  maxBrightnessTempK: number | null;
  dataSource: "MODIS" | "VIIRS" | null;
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

export async function fetchFireHazardSummary(
  coords: Coordinates,
): Promise<FireHazardSummary> {
  try {
    const apiKey = process.env.NASA_FIRMS_MAP_KEY;
    if (!apiKey) {
      return {
        activeFireCount7d: null,
        nearestFireKm: null,
        maxBrightnessTempK: null,
        dataSource: null,
      };
    }

    const bbox = buildFirmsBoundingBox(coords);
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

    const csv = await response.text();
    const lines = csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
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

    for (const line of lines.slice(1)) {
      const columns = line.split(",");
      const lat = Number(columns[0]);
      const lng = Number(columns[1]);
      const brightness = Number(columns[2]);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        continue;
      }

      activeFireCount += 1;
      const distanceKm = calculateDistanceKm(coords, { lat, lng });
      nearestFireKm = nearestFireKm === null ? distanceKm : Math.min(nearestFireKm, distanceKm);

      if (Number.isFinite(brightness)) {
        maxBrightnessTempK =
          maxBrightnessTempK === null ? brightness : Math.max(maxBrightnessTempK, brightness);
      }
    }

    return {
      activeFireCount7d: activeFireCount,
      nearestFireKm: nearestFireKm === null ? null : Number(nearestFireKm.toFixed(1)),
      maxBrightnessTempK: maxBrightnessTempK === null ? null : Number(maxBrightnessTempK.toFixed(1)),
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
