// Bureau of Meteorology (BOM) — Australian Weather & Cyclone Data
// Source: https://www.bom.gov.au/
// License: Crown Copyright (open data)
// Access: Real-time weather observations, forecasts, and cyclone alerts

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type WeatherObservation = {
  stationName: string | null;
  distanceKm: number | null;
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  rainfallMm: number | null;
  observationTime: string | null;
};

export type AlertType = "cyclone" | "severe_weather" | "heat_wave" | "none";

export type BomResult = {
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  rainfallMm: number | null;
  weatherCondition: string | null;
  nearestStationDistanceKm: number | null;
  nearestStationName: string | null;
  stationCount: number;
  observations: WeatherObservation[];
  activeAlert: AlertType;
  alertDetails: string | null;
  coverage: boolean;
  available: boolean;
};

const BOM_OBSERVATIONS_API = "https://www.bom.gov.au/api/observations";
const BOM_ALERTS_API = "https://www.bom.gov.au/api/alerts";

/**
 * Query BOM real-time weather observations and alerts for Australia.
 * Returns weather data from 600+ observation stations and active cyclone/severe weather alerts.
 * Updates continuously; covers all Australian states and territories.
 */
export async function getBomWeather(lat: number, lng: number): Promise<BomResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${BOM_OBSERVATIONS_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 10 }, // Cache 10 minutes (weather updates every 30 min)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        temperatureC: null,
        humidityPercent: null,
        windSpeedKph: null,
        rainfallMm: null,
        weatherCondition: null,
        nearestStationDistanceKm: null,
        nearestStationName: null,
        stationCount: 0,
        observations: [],
        activeAlert: "none",
        alertDetails: null,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      stations?: Array<{
        name?: string;
        lat?: number;
        lng?: number;
        temp?: number;
        humidity?: number;
        wind_speed?: number;
        rainfall?: number;
        time?: string;
      }>;
      alert?: string;
      alert_details?: string;
    };

    const stations = data.stations ?? [];
    let nearestStationDistanceKm: number | null = null;
    let nearestStationName: string | null = null;
    let nearestTemp: number | null = null;
    let nearestHumidity: number | null = null;
    let nearestWind: number | null = null;
    let nearestRain: number | null = null;
    const observations: WeatherObservation[] = [];
    const MAX_DISTANCE_KM = 100;

    for (const station of stations) {
      if (station.lat === undefined || station.lng === undefined) continue;

      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: station.lat, lng: station.lng });

      if (distanceKm <= MAX_DISTANCE_KM) {
        observations.push({
          stationName: station.name ?? null,
          distanceKm: Number(distanceKm.toFixed(1)),
          temperatureC: station.temp ?? null,
          humidityPercent: station.humidity ?? null,
          windSpeedKph: station.wind_speed ?? null,
          rainfallMm: station.rainfall ?? null,
          observationTime: station.time ?? null,
        });

        if (nearestStationDistanceKm === null || distanceKm < nearestStationDistanceKm) {
          nearestStationDistanceKm = Number(distanceKm.toFixed(1));
          nearestStationName = station.name ?? null;
          nearestTemp = station.temp ?? null;
          nearestHumidity = station.humidity ?? null;
          nearestWind = station.wind_speed ?? null;
          nearestRain = station.rainfall ?? null;
        }
      }
    }

    // Sort by distance
    observations.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    // Parse alert type
    let activeAlert: AlertType = "none";
    if (data.alert) {
      const alert = data.alert.toLowerCase();
      if (alert.includes("cyclone")) activeAlert = "cyclone";
      else if (alert.includes("severe")) activeAlert = "severe_weather";
      else if (alert.includes("heat")) activeAlert = "heat_wave";
    }

    return {
      temperatureC: nearestTemp,
      humidityPercent: nearestHumidity,
      windSpeedKph: nearestWind,
      rainfallMm: nearestRain,
      weatherCondition: data.alert ?? null,
      nearestStationDistanceKm,
      nearestStationName,
      stationCount: observations.length,
      observations,
      activeAlert,
      alertDetails: data.alert_details ?? null,
      coverage: true,
      available: observations.length > 0,
    };
  } catch {
    return {
      temperatureC: null,
      humidityPercent: null,
      windSpeedKph: null,
      rainfallMm: null,
      weatherCondition: null,
      nearestStationDistanceKm: null,
      nearestStationName: null,
      stationCount: 0,
      observations: [],
      activeAlert: "none",
      alertDetails: null,
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within BOM coverage (all of Australia).
 * Coverage: Australia + external territories (lat -44 to -9°S, lng 113-154°E)
 */
export function bomAvailable(lat: number, lng: number): boolean {
  return lat >= -44 && lat <= -9 && lng >= 113 && lng <= 154;
}
