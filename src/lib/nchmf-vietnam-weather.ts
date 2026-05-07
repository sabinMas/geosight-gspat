// NCHMF (National Center for Hydro-Meteorological Forecasting) — Vietnam Weather & Hydrology
// Source: Vietnam National Center for Hydro-Meteorological Forecasting
// License: Vietnamese government open data
// Access: Real-time weather forecasts, rainfall observations, hydrological data

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type NchmfWeatherResult = {
  temperatureC: number | null;
  temperatureMin: number | null;
  temperatureMax: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  rainfallMm: number | null;
  activeAlert: "typhoon" | "heavy_rain" | "heat_wave" | "cold_snap" | "none";
  alertDetails: string | null;
  forecastDays: number;
  observationTime: string | null;
  coverage: boolean;
  available: boolean;
};

const NCHMF_API = "https://hymetdata.gov.vn/api/weather";

export async function getNchmfWeather(lat: number, lng: number): Promise<NchmfWeatherResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${NCHMF_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 6 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        temperatureC: null,
        temperatureMin: null,
        temperatureMax: null,
        humidityPercent: null,
        windSpeedKph: null,
        rainfallMm: null,
        activeAlert: "none",
        alertDetails: null,
        forecastDays: 0,
        observationTime: null,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      temp_c?: number;
      temp_min?: number;
      temp_max?: number;
      humidity?: number;
      wind_speed_kph?: number;
      rainfall?: number;
      alert?: string;
      alert_details?: string;
      forecast_days?: number;
      time?: string;
    };

    let activeAlert: "typhoon" | "heavy_rain" | "heat_wave" | "cold_snap" | "none" = "none";
    if (data.alert) {
      const alert = data.alert.toLowerCase();
      if (alert.includes("typhoon") || alert.includes("bão")) activeAlert = "typhoon";
      else if (alert.includes("heavy") || alert.includes("rain") || alert.includes("mưa")) activeAlert = "heavy_rain";
      else if (alert.includes("heat")) activeAlert = "heat_wave";
      else if (alert.includes("cold") || alert.includes("lạnh")) activeAlert = "cold_snap";
    }

    return {
      temperatureC: data.temp_c ?? null,
      temperatureMin: data.temp_min ?? null,
      temperatureMax: data.temp_max ?? null,
      humidityPercent: data.humidity ?? null,
      windSpeedKph: data.wind_speed_kph ?? null,
      rainfallMm: data.rainfall ?? null,
      activeAlert,
      alertDetails: data.alert_details ?? null,
      forecastDays: data.forecast_days ?? 0,
      observationTime: data.time ?? null,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      temperatureC: null,
      temperatureMin: null,
      temperatureMax: null,
      humidityPercent: null,
      windSpeedKph: null,
      rainfallMm: null,
      activeAlert: "none",
      alertDetails: null,
      forecastDays: 0,
      observationTime: null,
      coverage: false,
      available: false,
    };
  }
}

export function nchmfWeatherAvailable(lat: number, lng: number): boolean {
  return lat >= 8.5 && lat <= 23.4 && lng >= 102.1 && lng <= 109.5;
}
