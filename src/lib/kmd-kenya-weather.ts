// KMD (Kenya Meteorological Department) — Weather & Climate Data
// Source: Kenya Meteorological Department
// License: Kenyan government open data
// Access: Real-time weather observations and drought monitoring via ENACTS

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type KmdWeatherResult = {
  temperatureC: number | null;
  temperatureMin: number | null;
  temperatureMax: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  precipitationMm: number | null;
  droughtStatus: "no_drought" | "early_warning" | "alert" | "emergency" | "none";
  activeAlert: "drought" | "extreme_heat" | "heavy_rain" | "flash_flood" | "none";
  alertDetails: string | null;
  observationTime: string | null;
  coverage: boolean;
  available: boolean;
};

const KMD_API = "https://meteo.go.ke/api/weather";

export async function getKmdWeather(lat: number, lng: number): Promise<KmdWeatherResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${KMD_API}?lat=${lat}&lng=${lng}`,
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
        precipitationMm: null,
        droughtStatus: "none",
        activeAlert: "none",
        alertDetails: null,
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
      precipitation?: number;
      drought_status?: string;
      alert?: string;
      alert_details?: string;
      time?: string;
    };

    const droughtMap: { [key: string]: "no_drought" | "early_warning" | "alert" | "emergency" } = {
      no_drought: "no_drought",
      early_warning: "early_warning",
      alert: "alert",
      emergency: "emergency",
    };

    const droughtStatus = (droughtMap[data.drought_status ?? ""] ?? "none") as
      | "no_drought"
      | "early_warning"
      | "alert"
      | "emergency"
      | "none";

    let activeAlert: "drought" | "extreme_heat" | "heavy_rain" | "flash_flood" | "none" = "none";
    if (data.alert) {
      const alert = data.alert.toLowerCase();
      if (alert.includes("drought")) activeAlert = "drought";
      else if (alert.includes("heat")) activeAlert = "extreme_heat";
      else if (alert.includes("heavy") || alert.includes("rain")) activeAlert = "heavy_rain";
      else if (alert.includes("flash") || alert.includes("flood")) activeAlert = "flash_flood";
    }

    return {
      temperatureC: data.temp_c ?? null,
      temperatureMin: data.temp_min ?? null,
      temperatureMax: data.temp_max ?? null,
      humidityPercent: data.humidity ?? null,
      windSpeedKph: data.wind_speed_kph ?? null,
      precipitationMm: data.precipitation ?? null,
      droughtStatus,
      activeAlert,
      alertDetails: data.alert_details ?? null,
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
      precipitationMm: null,
      droughtStatus: "none",
      activeAlert: "none",
      alertDetails: null,
      observationTime: null,
      coverage: false,
      available: false,
    };
  }
}

export function kmdWeatherAvailable(lat: number, lng: number): boolean {
  return lat >= -4.9 && lat <= 4.8 && lng >= 33.9 && lng <= 41.9;
}
