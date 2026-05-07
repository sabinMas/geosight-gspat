// JMA (Japan Meteorological Agency) AMeDAS — Automated Meteorological Data Acquisition System
// Source: https://www.jma.go.jp/jma/indexe.html
// License: JMA terms (free for public use)
// Access: Real-time observation data from ~1,300 stations across Japan

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type JmaObservation = {
  stationName: string | null;
  distanceKm: number | null;
  temperatureC: number | null;
  precipitationMm: number | null; // 10-minute accumulation
  windSpeedKph: number | null;
  windDirectionDegrees: number | null;
  humidity: number | null; // 0-100
  observationTime: string | null; // ISO timestamp
};

export type JmaObservationsResult = {
  nearestStationDistanceKm: number | null;
  nearestStationName: string | null;
  nearestStationTemp: number | null;
  nearestStationPrecipitation: number | null;
  nearestStationWind: number | null;
  stationCount: number;
  observations: JmaObservation[];
  coverage: boolean;
  available: boolean;
};

// JMA provides real-time AMeDAS data via public JSON endpoint (no auth required)
const JMA_AMEDAS_URL = "https://www.jma.go.jp/bosai/amedas/data/lst.json";

/**
 * Query JMA AMeDAS real-time meteorological observations.
 * Returns nearest station data and all stations within 50km buffer.
 * Data updates every 10 minutes; freely accessible without authentication.
 */
export async function getJmaObservations(lat: number, lng: number): Promise<JmaObservationsResult | null> {
  try {
    const response = await fetchWithTimeout(
      JMA_AMEDAS_URL,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 5 }, // Cache 5 minutes (10-min station updates)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        nearestStationDistanceKm: null,
        nearestStationName: null,
        nearestStationTemp: null,
        nearestStationPrecipitation: null,
        nearestStationWind: null,
        stationCount: 0,
        observations: [],
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as Record<
      string,
      {
        lat?: number;
        lon?: number;
        name?: string;
        temp?: number;
        prec10m?: number;
        wind?: [number, number]; // [speed, direction]
        hum?: number;
        time?: string;
      }
    >;

    let stationCount = 0;
    let nearestStationDistanceKm: number | null = null;
    let nearestStationName: string | null = null;
    let nearestStationTemp: number | null = null;
    let nearestStationPrecipitation: number | null = null;
    let nearestStationWind: number | null = null;
    const observations: JmaObservation[] = [];
    const MAX_DISTANCE_KM = 50;

    for (const [stationId, stationData] of Object.entries(data)) {
      const stationLat = stationData.lat ?? lat + 1; // Default if missing
      const stationLng = stationData.lon ?? lng + 1;
      const stationName = stationData.name ?? stationId;
      const temp = stationData.temp ?? null;
      const precip = stationData.prec10m ?? null;
      const windData = stationData.wind ?? null;
      const windSpeed = windData ? windData[0] : null;
      const windDir = windData ? windData[1] : null;
      const humidity = stationData.hum ?? null;
      const time = stationData.time ?? null;

      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: stationLat, lng: stationLng });

      if (distanceKm <= MAX_DISTANCE_KM) {
        stationCount++;
        observations.push({
          stationName,
          distanceKm: Number(distanceKm.toFixed(1)),
          temperatureC: temp,
          precipitationMm: precip,
          windSpeedKph: windSpeed,
          windDirectionDegrees: windDir,
          humidity,
          observationTime: time,
        });

        // Update nearest station
        if (nearestStationDistanceKm === null || distanceKm < nearestStationDistanceKm) {
          nearestStationDistanceKm = Number(distanceKm.toFixed(1));
          nearestStationName = stationName;
          nearestStationTemp = temp;
          nearestStationPrecipitation = precip;
          nearestStationWind = windSpeed;
        }
      }
    }

    // Sort observations by distance
    observations.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    return {
      nearestStationDistanceKm,
      nearestStationName,
      nearestStationTemp,
      nearestStationPrecipitation,
      nearestStationWind,
      stationCount,
      observations,
      coverage: true,
      available: stationCount > 0,
    };
  } catch {
    return {
      nearestStationDistanceKm: null,
      nearestStationName: null,
      nearestStationTemp: null,
      nearestStationPrecipitation: null,
      nearestStationWind: null,
      stationCount: 0,
      observations: [],
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within JMA AMeDAS observation network coverage.
 * Coverage: Japan territory including islands (lat 20–45°N, lng 130–145°E)
 */
export function jmaObservationsAvailable(lat: number, lng: number): boolean {
  return lat >= 20 && lat <= 45 && lng >= 130 && lng <= 145;
}
