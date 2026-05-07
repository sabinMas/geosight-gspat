// TMD (Thai Meteorological Department) — Weather & Alert Data
// Source: Thailand Meteorological Department
// License: Thai government open data
// Access: Real-time weather observations, forecasts from AWS network, extreme weather alerts

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { calculateDistanceKm } from "@/lib/nearby-places";

export type TmdWeatherObservation = {
  stationName: string | null;
  distanceKm: number | null;
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  precipitationMm: number | null;
  observationTime: string | null;
};

export type TmdWeatherResult = {
  nearestStationName: string | null;
  nearestStationDistanceKm: number | null;
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  precipitationMm: number | null;
  activeAlert: "monsoon" | "heat_wave" | "flash_flood" | "none";
  alertDetails: string | null;
  stationCount: number;
  observations: TmdWeatherObservation[];
  coverage: boolean;
  available: boolean;
};

const TMD_API = "https://tmd.go.th/api/weather";

export async function getTmdWeather(lat: number, lng: number): Promise<TmdWeatherResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${TMD_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 6 },
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
        precipitationMm: null,
        activeAlert: "none",
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
    let nearestPrecip: number | null = null;
    const tmdObservations: TmdWeatherObservation[] = [];
    const MAX_DISTANCE_KM = 100;

    for (const station of stations) {
      if (station.lat === undefined || station.lng === undefined) continue;

      const distanceKm = calculateDistanceKm({ lat, lng }, { lat: station.lat, lng: station.lng });

      if (distanceKm <= MAX_DISTANCE_KM) {
        stationCount++;

        tmdObservations.push({
          stationName: station.name ?? null,
          distanceKm: Number(distanceKm.toFixed(1)),
          temperatureC: station.temp_c ?? null,
          humidityPercent: station.humidity ?? null,
          windSpeedKph: station.wind_speed_kph ?? null,
          precipitationMm: station.precipitation ?? null,
          observationTime: station.time ?? null,
        });

        if (nearestStationDistanceKm === null || distanceKm < nearestStationDistanceKm) {
          nearestStationDistanceKm = Number(distanceKm.toFixed(1));
          nearestStationName = station.name ?? null;
          nearestTemp = station.temp_c ?? null;
          nearestHumidity = station.humidity ?? null;
          nearestWindSpeed = station.wind_speed_kph ?? null;
          nearestPrecip = station.precipitation ?? null;
        }
      }
    }

    tmdObservations.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    let activeAlert: "monsoon" | "heat_wave" | "flash_flood" | "none" = "none";
    if (data.alert) {
      const alert = data.alert.toLowerCase();
      if (alert.includes("monsoon")) activeAlert = "monsoon";
      else if (alert.includes("heat")) activeAlert = "heat_wave";
      else if (alert.includes("flood") || alert.includes("rain")) activeAlert = "flash_flood";
    }

    return {
      nearestStationName,
      nearestStationDistanceKm,
      temperatureC: nearestTemp,
      humidityPercent: nearestHumidity,
      windSpeedKph: nearestWindSpeed,
      precipitationMm: nearestPrecip,
      activeAlert,
      alertDetails: data.alert_details ?? null,
      stationCount,
      observations: tmdObservations,
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
      precipitationMm: null,
      activeAlert: "none",
      alertDetails: null,
      stationCount: 0,
      observations: [],
      coverage: false,
      available: false,
    };
  }
}

export function tmdWeatherAvailable(lat: number, lng: number): boolean {
  return lat >= 5.6 && lat <= 20.4 && lng >= 97.3 && lng <= 105.6;
}
