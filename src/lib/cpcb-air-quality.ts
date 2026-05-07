// CPCB (Central Pollution Control Board) Air Quality — Real-time CAAQMS Data
// Source: https://caaqms.iem-iitd.org/ & https://app.cpcb.gov.in/caaqms/
// License: Public domain (government open data)
// Access: Real-time air quality from ~500 CAAQMS stations across India

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

export type CpcbAirQualityResult = {
  nearestStationDistanceKm: number | null;
  nearestStationName: string | null;
  nearestStationAqi: number | null;
  nearestStationCategory: string | null;
  stationCount: number;
  stations: AirQualityStation[];
  coverage: boolean;
  available: boolean;
};

// CPCB provides real-time CAAQMS data via public APIs
const CPCB_CAAQMS_URL = "https://app.cpcb.gov.in/caaqms/api/stations";

/**
 * Query CPCB CAAQMS real-time air quality data from ~500 monitoring stations.
 * Returns nearest station AQI and pollutant concentrations (PM2.5, PM10, NO2, SO2, CO, O3).
 * Data updates every 15-30 minutes; covers all major Indian cities.
 */
export async function getCpcbAirQuality(lat: number, lng: number): Promise<CpcbAirQualityResult | null> {
  try {
    const response = await fetchWithTimeout(
      CPCB_CAAQMS_URL,
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
    const MAX_DISTANCE_KM = 50;

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
 * Check if coordinates fall within CPCB CAAQMS monitoring network.
 * Coverage: All major Indian cities and metros (lat 8-35°N, lng 68-97°E)
 */
export function cpcbAvailable(lat: number, lng: number): boolean {
  return lat >= 8 && lat <= 35 && lng >= 68 && lng <= 97;
}
