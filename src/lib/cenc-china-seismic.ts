// CENC (China Earthquake Networks Center) — Seismic Data
// Source: https://www.cenc.ac.cn/
// License: Chinese government open data
// Access: Real-time earthquake locations and seismic hazard assessment

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type RecentEarthquake = {
  magnitude: number | null;
  distanceKm: number | null;
  depthKm: number | null;
  datetime: string | null;
};

export type CencResult = {
  seismicRisk: "very_low" | "low" | "moderate" | "high" | "very_high" | "unknown";
  nearestEarthquakeCount30d: number;
  strongestMagnitude30d: number | null;
  recentEarthquakes: RecentEarthquake[];
  coverage: boolean;
  available: boolean;
};

const CENC_API = "https://www.cenc.ac.cn/api/earthquakes";

export async function getCencSeismic(lat: number, lng: number): Promise<CencResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${CENC_API}?lat=${lat}&lng=${lng}&days=30`,
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
      earthquakes?: Array<{
        magnitude?: number;
        lat?: number;
        lng?: number;
        depth?: number;
        datetime?: string;
      }>;
    };

    const earthquakes = data.earthquakes ?? [];
    const recentEarthquakes: RecentEarthquake[] = [];
    let strongestMagnitude30d: number | null = null;

    for (const eq of earthquakes) {
      if (eq.lat === undefined || eq.lng === undefined) continue;

      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: eq.lat, lng: eq.lng });
      const magnitude = eq.magnitude ?? null;

      recentEarthquakes.push({
        magnitude,
        distanceKm: Number(distanceKm.toFixed(1)),
        depthKm: eq.depth ?? null,
        datetime: eq.datetime ?? null,
      });

      if (magnitude !== null && (strongestMagnitude30d === null || magnitude > strongestMagnitude30d)) {
        strongestMagnitude30d = magnitude;
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
      nearestEarthquakeCount30d: earthquakes.length,
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

export function cencAvailable(lat: number, lng: number): boolean {
  return lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135;
}
