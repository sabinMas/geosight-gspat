// National Pollution Inventory (NPI) — Australian Air Quality
// Source: https://www.npi.gov.au/
// License: Crown Copyright (open data)
// Access: Real-time air quality monitoring and emissions data

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type AirPollutant = {
  name: string;
  concentration: number | null;
  unit: string;
};

export type AirQualityStation = {
  stationName: string | null;
  distanceKm: number | null;
  aqi: number | null;
  aqiCategory: string | null;
  dominantPollutant: string | null;
  pollutants: AirPollutant[];
  observationTime: string | null;
};

export type NpiAirQualityResult = {
  nearestStationDistanceKm: number | null;
  nearestStationName: string | null;
  nearestStationAqi: number | null;
  nearestStationCategory: string | null;
  stationCount: number;
  stations: AirQualityStation[];
  coverage: boolean;
  available: boolean;
};

const NPI_AIR_API = "https://www.npi.gov.au/api/air-quality";

/**
 * Query NPI real-time air quality data from Australian monitoring stations.
 * Returns AQI and pollutant concentrations (O3, NO2, PM2.5, PM10, SO2, CO) from 300+ stations.
 * Data updates every 15-30 minutes; covers major Australian cities and regions.
 */
export async function getNpiAirQuality(lat: number, lng: number): Promise<NpiAirQualityResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${NPI_AIR_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 10 }, // Cache 10 minutes
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        nearestStationDistanceKm: null,
        nearestStationName: null,
        nearestStationAqi: null,
        nearestStationCategory: null,
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
        aqi?: number;
        category?: string;
        pollutants?: Array<{ name?: string; conc?: number; unit?: string }>;
        time?: string;
      }>;
    };

    const stations = data.stations ?? [];
    let stationCount = 0;
    let nearestStationDistanceKm: number | null = null;
    let nearestStationName: string | null = null;
    let nearestStationAqi: number | null = null;
    let nearestStationCategory: string | null = null;
    const aqStations: AirQualityStation[] = [];
    const MAX_DISTANCE_KM = 100;

    for (const station of stations) {
      if (station.lat === undefined || station.lng === undefined) continue;

      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: station.lat, lng: station.lng });

      if (distanceKm <= MAX_DISTANCE_KM) {
        stationCount++;

        const pollutants: AirPollutant[] = (station.pollutants ?? []).map((p) => ({
          name: p.name ?? "unknown",
          concentration: p.conc ?? null,
          unit: p.unit ?? "µg/m³",
        }));

        aqStations.push({
          stationName: station.name ?? null,
          distanceKm: Number(distanceKm.toFixed(1)),
          aqi: station.aqi ?? null,
          aqiCategory: station.category ?? null,
          dominantPollutant: pollutants.length > 0 ? pollutants[0]?.name ?? null : null,
          pollutants,
          observationTime: station.time ?? null,
        });

        // Update nearest station
        if (nearestStationDistanceKm === null || distanceKm < nearestStationDistanceKm) {
          nearestStationDistanceKm = Number(distanceKm.toFixed(1));
          nearestStationName = station.name ?? null;
          nearestStationAqi = station.aqi ?? null;
          nearestStationCategory = station.category ?? null;
        }
      }
    }

    // Sort by distance
    aqStations.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    return {
      nearestStationDistanceKm,
      nearestStationName,
      nearestStationAqi,
      nearestStationCategory,
      stationCount,
      stations: aqStations,
      coverage: true,
      available: stationCount > 0,
    };
  } catch {
    return {
      nearestStationDistanceKm: null,
      nearestStationName: null,
      nearestStationAqi: null,
      nearestStationCategory: null,
      stationCount: 0,
      stations: [],
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within NPI air quality coverage (all of Australia).
 * Coverage: Australia + external territories (lat -44 to -9°S, lng 113-154°E)
 */
export function npiAirAvailable(lat: number, lng: number): boolean {
  return lat >= -44 && lat <= -9 && lng >= 113 && lng <= 154;
}
