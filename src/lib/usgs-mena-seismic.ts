// USGS Earthquake Hazards — MENA Seismic Data
// Source: https://earthquake.usgs.gov/
// License: Public domain (US government)
// Access: Real-time earthquakes and seismic hazard assessment for Middle East/North Africa

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type RecentEarthquake = {
  magnitude: number | null;
  distanceKm: number | null;
  depthKm: number | null;
  datetime: string | null;
};

export type UsgsSeismicResult = {
  seismicRisk: "very_low" | "low" | "moderate" | "high" | "very_high" | "unknown";
  nearestEarthquakeCount30d: number;
  strongestMagnitude30d: number | null;
  recentEarthquakes: RecentEarthquake[];
  coverage: boolean;
  available: boolean;
};

const USGS_EARTHQUAKE_API = "https://earthquake.usgs.gov/api/earthquakes/1.0/query";

export async function getUsgsSeismicMena(lat: number, lng: number): Promise<UsgsSeismicResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${USGS_EARTHQUAKE_API}?latitude=${lat}&longitude=${lng}&maxradiuskm=300&format=geojson&orderby=magnitude`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 5 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        seismicRisk: "unknown",
        nearestEarthquakeCount30d: 0,
        strongestMagnitude30d: null,
        recentEarthquakes: [],
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      features?: Array<{
        properties?: { mag?: number; time?: number; depth?: number };
        geometry?: { coordinates?: [number, number, number] };
      }>;
    };

    const features = data.features ?? [];
    const recentEarthquakes: RecentEarthquake[] = [];
    let strongestMagnitude30d: number | null = null;
    const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const feature of features) {
      const mag = feature.properties?.mag;
      const time = feature.properties?.time;
      const depth = feature.properties?.depth;
      const coords = feature.geometry?.coordinates;

      if (!time || time < thirtyDaysAgoMs || !coords || coords.length < 2) continue;

      const eqLng = coords[0];
      const eqLat = coords[1];
      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: eqLat, lng: eqLng });

      recentEarthquakes.push({
        magnitude: mag ?? null,
        distanceKm: Number(distanceKm.toFixed(1)),
        depthKm: depth ?? null,
        datetime: new Date(time).toISOString(),
      });

      if (mag !== undefined && (strongestMagnitude30d === null || mag > strongestMagnitude30d)) {
        strongestMagnitude30d = mag;
      }
    }

    let seismicRisk: "very_low" | "low" | "moderate" | "high" | "very_high" | "unknown" = "low";
    if (strongestMagnitude30d !== null) {
      if (strongestMagnitude30d >= 7.0) seismicRisk = "very_high";
      else if (strongestMagnitude30d >= 6.0) seismicRisk = "high";
      else if (strongestMagnitude30d >= 5.0) seismicRisk = "moderate";
    }

    recentEarthquakes.sort((a, b) => {
      const dateA = new Date(a.datetime ?? 0).getTime();
      const dateB = new Date(b.datetime ?? 0).getTime();
      return dateB - dateA;
    });

    return {
      seismicRisk,
      nearestEarthquakeCount30d: recentEarthquakes.length,
      strongestMagnitude30d,
      recentEarthquakes,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      seismicRisk: "unknown",
      nearestEarthquakeCount30d: 0,
      strongestMagnitude30d: null,
      recentEarthquakes: [],
      coverage: false,
      available: false,
    };
  }
}

export function usgsSeismicMenaAvailable(lat: number, lng: number): boolean {
  return lat >= -10 && lat <= 50 && lng >= -20 && lng <= 70;
}
