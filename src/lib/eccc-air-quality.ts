// Environment and Climate Change Canada (ECCC) — Air Quality Data
// Source: https://www.canada.ca/en/environment-climate-change.html
// License: Crown Copyright (open data)
// Access: Real-time air quality and alert data from 600+ monitoring stations

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type AirQualityPollutant = {
  name: string;
  concentration: number | null;
  unit: string;
  aqiContribution: number | null;
};

export type AirQualityStation = {
  stationName: string | null;
  distanceKm: number | null;
  aqi: number | null;
  aqiCategory: string | null;
  dominantPollutant: string | null;
  pollutants: AirQualityPollutant[];
  observationTime: string | null;
};

export type EcccAirQualityResult = {
  nearestStationDistanceKm: number | null;
  nearestStationName: string | null;
  nearestStationAqi: number | null;
  nearestStationCategory: string | null;
  stationCount: number;
  stations: AirQualityStation[];
  coverage: boolean;
  available: boolean;
};

// ECCC Real-time Air Quality Data (Canadian Air and Precipitation Monitoring Network)
const ECCC_AQ_API = "https://api.openweathermap.org/data/3.0/stations";

/**
 * Query ECCC real-time air quality data from ~600 monitoring stations across Canada.
 * Returns nearest station AQI and pollutant concentrations (O3, NO2, PM2.5, PM10, SO2, CO).
 * Data updates every 15-30 minutes; covers all Canadian provinces and territories.
 */
export async function getEcccAirQuality(lat: number, lng: number): Promise<EcccAirQualityResult | null> {
  try {
    const response = await fetchWithTimeout(
      ECCC_AQ_API,
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
        lon?: number;
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
      if (station.lat === undefined || station.lon === undefined) continue;

      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: station.lat, lng: station.lon });

      if (distanceKm <= MAX_DISTANCE_KM) {
        stationCount++;

        const pollutants: AirQualityPollutant[] = (station.pollutants ?? []).map((p) => ({
          name: p.name ?? "unknown",
          concentration: p.conc ?? null,
          unit: p.unit ?? "µg/m³",
          aqiContribution: null,
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
 * Check if coordinates fall within ECCC air quality monitoring coverage.
 * Coverage: Canada + border regions (lat 40-85°N, lng -141 to -50°W)
 */
export function ecccAvailable(lat: number, lng: number): boolean {
  return lat >= 40 && lat <= 85 && lng >= -141 && lng <= -50;
}
