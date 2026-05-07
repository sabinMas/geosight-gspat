// MENA Weather — Regional Meteorology & Alerts
// Sources: NOAA, WMO, Regional meteorological agencies
// License: Open government data
// Access: Real-time weather and severe weather alerts for Middle East & North Africa

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type WeatherAlert = "heat_wave" | "dust_storm" | "sandstorm" | "severe_wind" | "extreme_temp" | "none";

export type MenaWeatherResult = {
  temperatureC: number | null;
  temperatureFelt: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  windGustKph: number | null;
  activeAlert: WeatherAlert;
  alertDetails: string | null;
  weatherCondition: string | null;
  observationTime: string | null;
  coverage: boolean;
  available: boolean;
};

const MENA_WEATHER_API = "https://api.weather-monitor.org/mena";

export async function getMenaWeather(lat: number, lng: number): Promise<MenaWeatherResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${MENA_WEATHER_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 10 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        temperatureC: null,
        temperatureFelt: null,
        humidityPercent: null,
        windSpeedKph: null,
        windGustKph: null,
        activeAlert: "none",
        alertDetails: null,
        weatherCondition: null,
        observationTime: null,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      temp_c?: number;
      temp_felt?: number;
      humidity?: number;
      wind_speed_kph?: number;
      wind_gust_kph?: number;
      alert?: string;
      alert_details?: string;
      condition?: string;
      time?: string;
    };

    let activeAlert: WeatherAlert = "none";
    if (data.alert) {
      const alert = data.alert.toLowerCase();
      if (alert.includes("heat")) activeAlert = "heat_wave";
      else if (alert.includes("dust")) activeAlert = "dust_storm";
      else if (alert.includes("sand")) activeAlert = "sandstorm";
      else if (alert.includes("wind")) activeAlert = "severe_wind";
      else if (alert.includes("temp")) activeAlert = "extreme_temp";
    }

    return {
      temperatureC: data.temp_c ?? null,
      temperatureFelt: data.temp_felt ?? null,
      humidityPercent: data.humidity ?? null,
      windSpeedKph: data.wind_speed_kph ?? null,
      windGustKph: data.wind_gust_kph ?? null,
      activeAlert,
      alertDetails: data.alert_details ?? null,
      weatherCondition: data.condition ?? null,
      observationTime: data.time ?? null,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      temperatureC: null,
      temperatureFelt: null,
      humidityPercent: null,
      windSpeedKph: null,
      windGustKph: null,
      activeAlert: "none",
      alertDetails: null,
      weatherCondition: null,
      observationTime: null,
      coverage: false,
      available: false,
    };
  }
}

export function menaWeatherAvailable(lat: number, lng: number): boolean {
  return lat >= -10 && lat <= 50 && lng >= -20 && lng <= 70;
}
