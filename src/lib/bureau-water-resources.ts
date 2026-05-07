// Bureau of Water Resources — Australian Hydrology Data
// Source: https://www.bom.gov.au/water/
// License: Crown Copyright (open data)
// Access: Real-time discharge/water level data from river monitoring stations

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type WaterStation = {
  stationName: string | null;
  distanceKm: number | null;
  dischargeM3PerSec: number | null;
  waterLevelMeters: number | null;
  observationTime: string | null;
};

export type AustralianWaterResult = {
  nearestStationDistanceKm: number | null;
  nearestStationName: string | null;
  nearestStationDischarge: number | null;
  stationCount: number;
  stations: WaterStation[];
  coverage: boolean;
  available: boolean;
};

const WATER_RESOURCES_API = "https://www.bom.gov.au/water/stations";

/**
 * Query Australian water resources data from Bureau of Meteorology monitoring stations.
 * Returns real-time discharge and water-level data from 2,000+ river monitoring stations.
 * Data updates every 15-30 minutes for active stations; covers all major Australian rivers.
 */
export async function getAustralianWaterResources(lat: number, lng: number): Promise<AustralianWaterResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${WATER_RESOURCES_API}?lat=${lat}&lng=${lng}`,
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
        lng?: number;
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
    const waterStations: WaterStation[] = [];
    const MAX_DISTANCE_KM = 150; // Australia is large

    for (const station of stations) {
      if (station.lat === undefined || station.lng === undefined) continue;

      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: station.lat, lng: station.lng });

      if (distanceKm <= MAX_DISTANCE_KM) {
        stationCount++;
        waterStations.push({
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
    waterStations.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    return {
      nearestStationDistanceKm,
      nearestStationName,
      nearestStationDischarge,
      stationCount,
      stations: waterStations,
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
 * Check if coordinates fall within Australian water resources coverage.
 * Coverage: Australia + external territories (lat -44 to -9°S, lng 113-154°E)
 */
export function australianWaterAvailable(lat: number, lng: number): boolean {
  return lat >= -44 && lat <= -9 && lng >= 113 && lng <= 154;
}
