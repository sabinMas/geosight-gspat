// Natural Resources Canada (NRCan) — Hydrological Data
// Source: https://www.nrcan.gc.ca/
// License: Crown Copyright (open data)
// Access: Real-time discharge/water level data from Water Survey of Canada (WSC) stations

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type NrcanHydroStation = {
  stationName: string | null;
  distanceKm: number | null;
  dischargeM3PerSec: number | null;
  waterLevelMeters: number | null;
  observationTime: string | null;
};

export type NrcanHydroResult = {
  nearestStationDistanceKm: number | null;
  nearestStationName: string | null;
  nearestStationDischarge: number | null;
  stationCount: number;
  stations: NrcanHydroStation[];
  coverage: boolean;
  available: boolean;
};

// WSC Real-time Hydrometric Data (Water Survey of Canada)
const WSC_REALTIME_URL = "https://www.wateroffice.ec.gc.ca/services/real_time_data/csv/";

/**
 * Query NRCan Water Survey of Canada real-time hydrological data from WSC monitoring stations.
 * Returns nearest discharge and water-level data from 2,100+ active stations across Canada's river network.
 * Data updates every 15-30 minutes for active stations; coverage includes all major watersheds.
 */
export async function getNrcanHydrology(lat: number, lng: number): Promise<NrcanHydroResult | null> {
  try {
    // For MVP, fetch station index list (simplified approach)
    // In production, would query specific station data or use WaterOffice API
    const response = await fetchWithTimeout(
      `${WSC_REALTIME_URL}?stations=all&format=json`,
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
    const hydroStations: NrcanHydroStation[] = [];
    const MAX_DISTANCE_KM = 150; // Canada is large, use wider search

    for (const station of stations) {
      if (station.lat === undefined || station.lon === undefined) continue;

      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: station.lat, lng: station.lon });

      if (distanceKm <= MAX_DISTANCE_KM) {
        stationCount++;
        hydroStations.push({
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
    hydroStations.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    return {
      nearestStationDistanceKm,
      nearestStationName,
      nearestStationDischarge,
      stationCount,
      stations: hydroStations,
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
 * Check if coordinates fall within NRCan WSC monitoring coverage (Canadian river network).
 * Coverage: Canada + border regions (lat 40-85°N, lng -141 to -50°W)
 */
export function nrcanHydroAvailable(lat: number, lng: number): boolean {
  return lat >= 40 && lat <= 85 && lng >= -141 && lng <= -50;
}
