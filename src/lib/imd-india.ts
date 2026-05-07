// IMD (India Meteorological Department) — Real-time Weather & Cyclone Data
// Source: https://www.imd.gov.in/
// License: Free for non-commercial use
// Access: JSON/KML feeds for weather observations, forecasts, cyclones

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type ImdWeatherAlert = {
  alertType: "cyclone" | "monsoon" | "heat_wave" | "cold_wave" | "none";
  severity: "low" | "moderate" | "high" | "very_high" | "unknown";
  affectedSubdivisions: string[];
  details: string | null;
};

export type ImdResult = {
  temperatureC: number | null;
  humidityPercent: number | null;
  rainfallMm: number | null;
  windSpeedKph: number | null;
  weatherCondition: string | null;
  activeAlert: ImdWeatherAlert | null;
  subdivisionName: string | null;
  coverage: boolean;
  available: boolean;
};

// IMD provides real-time data via public endpoints
const IMD_WEATHER_URL = "https://www.imd.gov.in/mausam/mausamJsonNew.php?sub=forecast";

/**
 * Query IMD real-time weather and cyclone alerts for India.
 * Returns current weather conditions and active alerts (cyclones, heat waves, etc.).
 * Covers 36 meteorological subdivisions across India.
 */
export async function getImdWeather(lat: number, lng: number): Promise<ImdResult | null> {
  try {
    const response = await fetchWithTimeout(
      IMD_WEATHER_URL,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 10 }, // Cache 10 minutes (weather updates every 6 hours typically)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        temperatureC: null,
        humidityPercent: null,
        rainfallMm: null,
        windSpeedKph: null,
        weatherCondition: null,
        activeAlert: null,
        subdivisionName: null,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      subdivision?: Array<{
        name?: string;
        lat?: number;
        lon?: number;
        temp?: number;
        humidity?: number;
        rainfall?: number;
        wind?: number;
        condition?: string;
      }>;
      cyclone?: Array<{ name?: string; location?: string }>;
    };

    // Find nearest subdivision to query location
    const subdivisions = data.subdivision ?? [];
    let nearestSubdivision = null;
    let minDistance = Infinity;

    for (const sub of subdivisions) {
      if (sub.lat === undefined || sub.lon === undefined) continue;
      const distance = Math.sqrt((sub.lat - lat) ** 2 + (sub.lon - lng) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        nearestSubdivision = sub;
      }
    }

    if (!nearestSubdivision) {
      return {
        temperatureC: null,
        humidityPercent: null,
        rainfallMm: null,
        windSpeedKph: null,
        weatherCondition: null,
        activeAlert: null,
        subdivisionName: null,
        coverage: true,
        available: false,
      };
    }

    // Check for active cyclones
    let activeAlert: ImdWeatherAlert | null = null;
    const cyclones = data.cyclone ?? [];
    if (cyclones.length > 0) {
      activeAlert = {
        alertType: "cyclone",
        severity: "high",
        affectedSubdivisions: [nearestSubdivision.name ?? "unknown"],
        details: cyclones[0]?.name ?? null,
      };
    }

    return {
      temperatureC: nearestSubdivision.temp ?? null,
      humidityPercent: nearestSubdivision.humidity ?? null,
      rainfallMm: nearestSubdivision.rainfall ?? null,
      windSpeedKph: nearestSubdivision.wind ?? null,
      weatherCondition: nearestSubdivision.condition ?? null,
      activeAlert,
      subdivisionName: nearestSubdivision.name ?? null,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      temperatureC: null,
      humidityPercent: null,
      rainfallMm: null,
      windSpeedKph: null,
      weatherCondition: null,
      activeAlert: null,
      subdivisionName: null,
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within India meteorological coverage.
 * Coverage: Mainland India + adjacent regions (lat 8-35°N, lng 68-97°E)
 */
export function imdAvailable(lat: number, lng: number): boolean {
  return lat >= 8 && lat <= 35 && lng >= 68 && lng <= 97;
}
