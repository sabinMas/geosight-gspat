// China Water Resources — Hydrology Data (Yellow River, Yangtze)
// Source: Ministry of Water Resources
// License: Chinese government open data
// Access: Real-time discharge and water-level data

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type WaterStation = {
  stationName: string | null;
  distanceKm: number | null;
  dischargeM3PerSec: number | null;
  waterLevelMeters: number | null;
  observationTime: string | null;
};

export type ChinaWaterResult = {
  nearestStationDistanceKm: number | null;
  nearestStationName: string | null;
  nearestStationDischarge: number | null;
  stationCount: number;
  stations: WaterStation[];
  coverage: boolean;
  available: boolean;
};

const CHINA_WATER_API = "https://www.mwr.gov.cn/api/stations";

export async function getChinaWater(lat: number, lng: number): Promise<ChinaWaterResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${CHINA_WATER_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 5 },
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
    const MAX_DISTANCE_KM = 150;

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

        if (nearestStationDistanceKm === null || distanceKm < nearestStationDistanceKm) {
          nearestStationDistanceKm = Number(distanceKm.toFixed(1));
          nearestStationName = station.name ?? null;
          nearestStationDischarge = station.discharge ?? null;
        }
      }
    }

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

export function chinaWaterAvailable(lat: number, lng: number): boolean {
  return lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135;
}
