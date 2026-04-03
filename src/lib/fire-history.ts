import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { Coordinates, FireHistorySummary, FireSeasonYear } from "@/types";

function buildBbox(coords: Coordinates, radiusDeg = 1) {
  const west = Math.max(coords.lng - radiusDeg, -180).toFixed(4);
  const south = Math.max(coords.lat - radiusDeg, -90).toFixed(4);
  const east = Math.min(coords.lng + radiusDeg, 180).toFixed(4);
  const north = Math.min(coords.lat + radiusDeg, 90).toFixed(4);
  return `${west},${south},${east},${north}`;
}

function parseFireCsv(csv: string): { count: number; maxBrightness: number | null } {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return { count: 0, maxBrightness: null };
  }

  let count = 0;
  let maxBrightness: number | null = null;

  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const brightness = Number(cols[2]);
    count++;
    if (Number.isFinite(brightness) && brightness > 0) {
      maxBrightness =
        maxBrightness === null ? brightness : Math.max(maxBrightness, brightness);
    }
  }

  return { count, maxBrightness };
}

export async function fetchFireHistory(
  coords: Coordinates,
  yearsBack = 5,
): Promise<FireHistorySummary> {
  const apiKey = process.env.NASA_FIRMS_MAP_KEY;
  const bbox = buildBbox(coords);
  const currentYear = new Date().getFullYear();
  const byYear: FireSeasonYear[] = [];
  let totalDetections = 0;

  for (let i = yearsBack; i >= 1; i--) {
    const year = currentYear - i;
    const startDate = `${year}-01-01`;

    if (apiKey) {
      try {
        const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_SP/${bbox}/365/${startDate}`;
        const response = await fetchWithTimeout(
          url,
          { headers: { "User-Agent": "GeoSight/1.0" }, cache: "no-store" },
          EXTERNAL_TIMEOUTS.standard,
        );

        if (response.ok) {
          const csv = await response.text();
          const { count, maxBrightness } = parseFireCsv(csv);
          byYear.push({
            year,
            detectionCount: count,
            maxBrightnessK: maxBrightness !== null ? Number(maxBrightness.toFixed(1)) : null,
            gdacsAlerts: 0,
          });
          totalDetections += count;
          continue;
        }
      } catch {
        // fall through to zero entry
      }
    }

    byYear.push({ year, detectionCount: 0, maxBrightnessK: null, gdacsAlerts: 0 });
  }

  const avgDetections = totalDetections / Math.max(byYear.length, 1);
  const hotYears = byYear
    .filter((y) => y.detectionCount > 0 && y.detectionCount > avgDetections * 1.5)
    .map((y) => y.year);

  return { byYear, hotYears, totalDetections, yearsSearched: yearsBack };
}
