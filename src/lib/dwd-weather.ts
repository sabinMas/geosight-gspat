// DWD (Deutscher Wetterdienst) — German Meteorological Service Weather Data
// Source: Deutscher Wetterdienst (DWD) — German National Meteorological Service
// License: CC-BY 4.0 (DWD Open Data)
// Access: Real-time weather observations, forecasts from 400+ German weather stations

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type DwdWeatherObservation = {
  stationName: string | null;
  distanceKm: number | null;
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  windGustKph: number | null;
  precipitationMm: number | null;
  observationTime: string | null;
};

export type DwdWeatherResult = {
  nearestStationName: string | null;
  nearestStationDistanceKm: number | null;
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  windGustKph: number | null;
  precipitationMm: number | null;
  activeWeatherAlert: "storm" | "snow" | "rain" | "frost" | "none";
  alertDetails: string | null;
  stationCount: number;
  observations: DwdWeatherObservation[];
  coverage: boolean;
  available: boolean;
};

const DWD_API = "https://opendata.dwd.de/weather/weather-data";

export async function getDwdWeather(lat: number, lng: number): Promise<DwdWeatherResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${DWD_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 10 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        nearestStationName: null,
        nearestStationDistanceKm: null,
        temperatureC: null,
        humidityPercent: null,
        windSpeedKph: null,
        windGustKph: null,
        precipitationMm: null,
        activeWeatherAlert: "none",
        alertDetails: null,
        stationCount: 0,
        observations: [],
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      stations?: Array<{
        name?: string;
        lat?: number;
        lng?: number;
        temp_c?: number;
        humidity?: number;
        wind_speed_kph?: number;
        wind_gust_kph?: number;
        precipitation?: number;
        time?: string;
      }>;
      alert?: string;
      alert_details?: string;
    };

    const stations = data.stations ?? [];
    let stationCount = 0;
    let nearestStationName: string | null = null;
    let nearestStationDistanceKm: number | null = null;
    let nearestTemp: number | null = null;
    let nearestHumidity: number | null = null;
    let nearestWindSpeed: number | null = null;
    let nearestWindGust: number | null = null;
    let nearestPrecip: number | null = null;
    const dwdObservations: DwdWeatherObservation[] = [];
    const MAX_DISTANCE_KM = 80;

    for (const station of stations) {
      if (station.lat === undefined || station.lng === undefined) continue;

      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: station.lat, lng: station.lng });

      if (distanceKm <= MAX_DISTANCE_KM) {
        stationCount++;

        dwdObservations.push({
          stationName: station.name ?? null,
          distanceKm: Number(distanceKm.toFixed(1)),
          temperatureC: station.temp_c ?? null,
          humidityPercent: station.humidity ?? null,
          windSpeedKph: station.wind_speed_kph ?? null,
          windGustKph: station.wind_gust_kph ?? null,
          precipitationMm: station.precipitation ?? null,
          observationTime: station.time ?? null,
        });

        if (nearestStationDistanceKm === null || distanceKm < nearestStationDistanceKm) {
          nearestStationDistanceKm = Number(distanceKm.toFixed(1));
          nearestStationName = station.name ?? null;
          nearestTemp = station.temp_c ?? null;
          nearestHumidity = station.humidity ?? null;
          nearestWindSpeed = station.wind_speed_kph ?? null;
          nearestWindGust = station.wind_gust_kph ?? null;
          nearestPrecip = station.precipitation ?? null;
        }
      }
    }

    dwdObservations.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    let activeWeatherAlert: "storm" | "snow" | "rain" | "frost" | "none" = "none";
    if (data.alert) {
      const alert = data.alert.toLowerCase();
      if (alert.includes("storm") || alert.includes("gewitter")) activeWeatherAlert = "storm";
      else if (alert.includes("snow") || alert.includes("schnee")) activeWeatherAlert = "snow";
      else if (alert.includes("rain") || alert.includes("regen")) activeWeatherAlert = "rain";
      else if (alert.includes("frost") || alert.includes("frost")) activeWeatherAlert = "frost";
    }

    return {
      nearestStationName,
      nearestStationDistanceKm,
      temperatureC: nearestTemp,
      humidityPercent: nearestHumidity,
      windSpeedKph: nearestWindSpeed,
      windGustKph: nearestWindGust,
      precipitationMm: nearestPrecip,
      activeWeatherAlert,
      alertDetails: data.alert_details ?? null,
      stationCount,
      observations: dwdObservations,
      coverage: true,
      available: stationCount > 0,
    };
  } catch {
    return {
      nearestStationName: null,
      nearestStationDistanceKm: null,
      temperatureC: null,
      humidityPercent: null,
      windSpeedKph: null,
      windGustKph: null,
      precipitationMm: null,
      activeWeatherAlert: "none",
      alertDetails: null,
      stationCount: 0,
      observations: [],
      coverage: false,
      available: false,
    };
  }
}

export function dwdWeatherAvailable(lat: number, lng: number): boolean {
  return lat >= 35 && lat <= 71 && lng >= -10 && lng <= 40;
}
