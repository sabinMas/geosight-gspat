// NiMet (Nigerian Meteorological Agency) — Weather Data
// Source: Nigerian Meteorological Agency
// License: Nigerian government open data
// Access: Real-time weather observations and forecasts from 36 meteorological subdivisions

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type NiMetWeatherResult = {
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  precipitationMm: number | null;
  weatherCondition: string | null;
  activeAlert: "monsoon" | "drought" | "harmattan" | "heat_wave" | "none";
  alertDetails: string | null;
  observationTime: string | null;
  coverage: boolean;
  available: boolean;
};

const NIMET_API = "https://www.nimet.gov.ng/api/weather";

export async function getNiMetWeather(lat: number, lng: number): Promise<NiMetWeatherResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${NIMET_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 6 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        temperatureC: null,
        humidityPercent: null,
        windSpeedKph: null,
        precipitationMm: null,
        weatherCondition: null,
        activeAlert: "none",
        alertDetails: null,
        observationTime: null,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      temp_c?: number;
      humidity?: number;
      wind_speed_kph?: number;
      precipitation?: number;
      condition?: string;
      alert?: string;
      alert_details?: string;
      time?: string;
    };

    let activeAlert: "monsoon" | "drought" | "harmattan" | "heat_wave" | "none" = "none";
    if (data.alert) {
      const alert = data.alert.toLowerCase();
      if (alert.includes("monsoon")) activeAlert = "monsoon";
      else if (alert.includes("drought")) activeAlert = "drought";
      else if (alert.includes("harmattan")) activeAlert = "harmattan";
      else if (alert.includes("heat")) activeAlert = "heat_wave";
    }

    return {
      temperatureC: data.temp_c ?? null,
      humidityPercent: data.humidity ?? null,
      windSpeedKph: data.wind_speed_kph ?? null,
      precipitationMm: data.precipitation ?? null,
      weatherCondition: data.condition ?? null,
      activeAlert,
      alertDetails: data.alert_details ?? null,
      observationTime: data.time ?? null,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      temperatureC: null,
      humidityPercent: null,
      windSpeedKph: null,
      precipitationMm: null,
      weatherCondition: null,
      activeAlert: "none",
      alertDetails: null,
      observationTime: null,
      coverage: false,
      available: false,
    };
  }
}

export function niMetWeatherAvailable(lat: number, lng: number): boolean {
  return lat >= 4.3 && lat <= 13.9 && lng >= 2.7 && lng <= 14.6;
}
