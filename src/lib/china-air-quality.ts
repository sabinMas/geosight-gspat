// China Air Quality — Real-time AQI Data
// Source: Ministry of Ecology and Environment
// License: Chinese government open data
// Access: Real-time air quality from 1,000+ monitoring stations

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type Pollutant = {
  name: string;
  concentration: number | null;
  unit: string;
};

export type AirStation = {
  stationName: string | null;
  distanceKm: number | null;
  aqi: number | null;
  aqiCategory: string | null;
  dominantPollutant: string | null;
  pollutants: Pollutant[];
  observationTime: string | null;
};

export type ChinaAirQualityResult = {
  nearestStationDistanceKm: number | null;
  nearestStationName: string | null;
  nearestStationAqi: number | null;
  nearestStationCategory: string | null;
  stationCount: number;
  stations: AirStation[];
  coverage: boolean;
  available: boolean;
};

const CHINA_AQ_API = "https://www.mee.gov.cn/api/air-quality";

export async function getChinaAirQuality(lat: number, lng: number): Promise<ChinaAirQualityResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${CHINA_AQ_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 10 },
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
    const aqStations: AirStation[] = [];
    const MAX_DISTANCE_KM = 100;

    for (const station of stations) {
      if (station.lat === undefined || station.lng === undefined) continue;

      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: station.lat, lng: station.lng });

      if (distanceKm <= MAX_DISTANCE_KM) {
        stationCount++;

        const pollutants: Pollutant[] = (station.pollutants ?? []).map((p) => ({
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

        if (nearestStationDistanceKm === null || distanceKm < nearestStationDistanceKm) {
          nearestStationDistanceKm = Number(distanceKm.toFixed(1));
          nearestStationName = station.name ?? null;
          nearestStationAqi = station.aqi ?? null;
          nearestStationCategory = station.category ?? null;
        }
      }
    }

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

export function chinaAirQualityAvailable(lat: number, lng: number): boolean {
  return lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135;
}
