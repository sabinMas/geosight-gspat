// India-WRIS (Water Resources Information System) — Real-time Hydrology Data
// Source: https://indiawris.gov.in/
// License: Government open data (free)
// Access: Real-time discharge data from Central Water Commission (CWC) stations

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type WrisStation = {
  stationName: string | null;
  distanceKm: number | null;
  dischargeM3PerSec: number | null;
  waterLevelMeters: number | null;
  observationTime: string | null;
};

export type IndiaWrisResult = {
  nearestStationDistanceKm: number | null;
  nearestStationName: string | null;
  nearestStationDischarge: number | null;
  stationCount: number;
  stations: WrisStation[];
  coverage: boolean;
  available: boolean;
};

// India-WRIS provides real-time CWC station data
const INDIA_WRIS_URL = "https://indiawris.gov.in/main/api/stations";

/**
 * Query India-WRIS real-time hydrological data from CWC monitoring stations.
 * Returns nearest water-level and discharge data from 1,300+ stations across India's river network.
 * Data updates every 15-30 minutes for active stations.
 */
export async function getIndiaWris(lat: number, lng: number): Promise<IndiaWrisResult | null> {
  try {
    const response = await fetchWithTimeout(
      INDIA_WRIS_URL,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 5 }, // Cache 5 minutes (real-time updates)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        nearestStationDistanceKm: null,
        nearestStationName: null,
        nearestStationDischarge: null,
        stationCount: 0,
        stations: [],
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      stations?: Array<{
        name?: string;
        lat?: number;
        lon?: number;
        discharge?: number;
        water_level?: number;
        time?: string;
      }>;
    };

    const stations = data.stations ?? [];
    let stationCount = 0;
    let nearestStationDistanceKm: number | null = null;
    let nearestStationName: string | null = null;
    let nearestStationDischarge: number | null = null;
    const wrisStations: WrisStation[] = [];
    const MAX_DISTANCE_KM = 100;

    for (const station of stations) {
      if (station.lat === undefined || station.lon === undefined) continue;

      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: station.lat, lng: station.lon });

      if (distanceKm <= MAX_DISTANCE_KM) {
        stationCount++;
        wrisStations.push({
          stationName: station.name ?? null,
          distanceKm: Number(distanceKm.toFixed(1)),
          dischargeM3PerSec: station.discharge ?? null,
          waterLevelMeters: station.water_level ?? null,
          observationTime: station.time ?? null,
        });

        // Update nearest station
        if (nearestStationDistanceKm === null || distanceKm < nearestStationDistanceKm) {
          nearestStationDistanceKm = Number(distanceKm.toFixed(1));
          nearestStationName = station.name ?? null;
          nearestStationDischarge = station.discharge ?? null;
        }
      }
    }

    // Sort by distance
    wrisStations.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    return {
      nearestStationDistanceKm,
      nearestStationName,
      nearestStationDischarge,
      stationCount,
      stations: wrisStations,
      coverage: true,
      available: stationCount > 0,
    };
  } catch {
    return {
      nearestStationDistanceKm: null,
      nearestStationName: null,
      nearestStationDischarge: null,
      stationCount: 0,
      stations: [],
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within India-WRIS coverage (Indian river network).
 * Coverage: Mainland India (lat 8-35°N, lng 68-97°E)
 */
export function indiaWrisAvailable(lat: number, lng: number): boolean {
  return lat >= 8 && lat <= 35 && lng >= 68 && lng <= 97;
}
