// CMA (China Meteorological Administration) — Weather Data
// Source: https://www.cma.cn/
// License: Chinese government open data
// Access: Real-time weather observations and forecasts

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type CmaWeatherResult = {
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  precipitationMm: number | null;
  weatherCondition: string | null;
  activeAlert: "typhoon" | "heat_wave" | "rainstorm" | "none";
  alertDetails: string | null;
  observationTime: string | null;
  coverage: boolean;
  available: boolean;
};

const CMA_API = "https://www.cma.cn/api/weather";

export async function getCmaWeather(lat: number, lng: number): Promise<CmaWeatherResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${CMA_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 10 },
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

    let activeAlert: "typhoon" | "heat_wave" | "rainstorm" | "none" = "none";
    if (data.alert) {
      const alert = data.alert.toLowerCase();
      if (alert.includes("typhoon")) activeAlert = "typhoon";
      else if (alert.includes("heat")) activeAlert = "heat_wave";
      else if (alert.includes("rain")) activeAlert = "rainstorm";
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

export function cmaAvailable(lat: number, lng: number): boolean {
  return lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135;
}
