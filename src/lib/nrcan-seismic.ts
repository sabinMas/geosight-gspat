// Natural Resources Canada (NRCan) — Seismic Hazard Data
// Source: https://www.nrcan.gc.ca/
// License: Crown Copyright (open data)
// Access: Earthquake hazard maps and recent seismic activity

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type SeismicHazardLevel = "very_low" | "low" | "moderate" | "high" | "very_high" | "unknown";

export type RecentEarthquake = {
  magnitude: number | null;
  distanceKm: number | null;
  depthKm: number | null;
  datetime: string | null;
  region: string | null;
};

export type NrcanSeismicResult = {
  hazardLevel: SeismicHazardLevel;
  peakGroundAccelerationG: number | null;
  returnPeriodYears: number;
  nearestEarthquakeCount30d: number;
  recentEarthquakes: RecentEarthquake[];
  strongestMagnitude30d: number | null;
  coverage: boolean;
  available: boolean;
};

const NRCAN_SEISMIC_API = "https://earthquakescanada.nrcan.gc.ca/api/earthquakes";

/**
 * Query NRCan seismic hazard data for Canadian regions.
 * Returns earthquake hazard level, peak ground acceleration, and recent seismic activity.
 * Updates real-time; covers seismically active regions (BC, Alberta, Quebec, Atlantic Canada).
 */
export async function getNrcanSeismic(lat: number, lng: number): Promise<NrcanSeismicResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${NRCAN_SEISMIC_API}?lat=${lat}&lng=${lng}&days=30`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 5 }, // Cache 5 minutes (real-time updates)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        hazardLevel: "unknown",
        peakGroundAccelerationG: null,
        returnPeriodYears: 475,
        nearestEarthquakeCount30d: 0,
        recentEarthquakes: [],
        strongestMagnitude30d: null,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      hazard_level?: string;
      pga_g?: number;
      return_period?: number;
      earthquakes?: Array<{
        magnitude?: number;
        lat?: number;
        lng?: number;
        depth_km?: number;
        datetime?: string;
        region?: string;
      }>;
    };

    // Parse hazard level
    let hazardLevel: SeismicHazardLevel = "unknown";
    if (data.hazard_level) {
      const level = data.hazard_level.toLowerCase();
      if (level.includes("very high")) hazardLevel = "very_high";
      else if (level.includes("high")) hazardLevel = "high";
      else if (level.includes("moderate")) hazardLevel = "moderate";
      else if (level.includes("low")) hazardLevel = "low";
      else if (level.includes("very low")) hazardLevel = "very_low";
    }

    // Process recent earthquakes
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
        depthKm: eq.depth_km ?? null,
        datetime: eq.datetime ?? null,
        region: eq.region ?? null,
      });

      if (magnitude !== null && (strongestMagnitude30d === null || magnitude > strongestMagnitude30d)) {
        strongestMagnitude30d = magnitude;
      }
    }

    // Sort by recency (most recent first)
    recentEarthquakes.sort((a, b) => {
      const dateA = new Date(a.datetime ?? 0).getTime();
      const dateB = new Date(b.datetime ?? 0).getTime();
      return dateB - dateA;
    });

    return {
      hazardLevel,
      peakGroundAccelerationG: data.pga_g ?? null,
      returnPeriodYears: data.return_period ?? 475,
      nearestEarthquakeCount30d: earthquakes.length,
      recentEarthquakes,
      strongestMagnitude30d,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      hazardLevel: "unknown",
      peakGroundAccelerationG: null,
      returnPeriodYears: 475,
      nearestEarthquakeCount30d: 0,
      recentEarthquakes: [],
      strongestMagnitude30d: null,
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within NRCan seismic monitoring coverage.
 * Coverage: Canada + border regions (lat 40-85°N, lng -141 to -50°W)
 */
export function nrcanSeismicAvailable(lat: number, lng: number): boolean {
  return lat >= 40 && lat <= 85 && lng >= -141 && lng <= -50;
}
