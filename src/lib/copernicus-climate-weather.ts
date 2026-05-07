// Copernicus Climate Data Store — EU Climate Reanalysis & Weather Forecasts
// Source: Copernicus Climate Change Service (C3S), ECMWF
// License: Open access under CC4.0
// Access: ERA5/ERA5-Land climate reanalysis, seasonal forecasts

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type CopernicusWeatherResult = {
  temperatureC: number | null;
  temperatureMin: number | null;
  temperatureMax: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  precipitationMm: number | null;
  soilMoistureFraction: number | null;
  cloudCoverPercent: number | null;
  observationTime: string | null;
  coverage: boolean;
  available: boolean;
};

const COPERNICUS_API = "https://cds-api.climate.copernicus.eu/v1/data";

export async function getCopernicusWeather(lat: number, lng: number): Promise<CopernicusWeatherResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${COPERNICUS_API}?lat=${lat}&lng=${lng}&dataset=era5-land&variables=temperature,relative_humidity,10m_wind_speed,precipitation,soil_moisture`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 3 },
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
        soilMoistureFraction: null,
        cloudCoverPercent: null,
        observationTime: null,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      temperature?: number;
      temperature_min?: number;
      temperature_max?: number;
      relative_humidity?: number;
      wind_speed_10m?: number;
      precipitation?: number;
      soil_moisture?: number;
      cloud_cover?: number;
      time?: string;
    };

    return {
      temperatureC: data.temperature ?? null,
      temperatureMin: data.temperature_min ?? null,
      temperatureMax: data.temperature_max ?? null,
      humidityPercent: data.relative_humidity ?? null,
      windSpeedKph: data.wind_speed_10m ?? null,
      precipitationMm: data.precipitation ?? null,
      soilMoistureFraction: data.soil_moisture ?? null,
      cloudCoverPercent: data.cloud_cover ?? null,
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
      soilMoistureFraction: null,
      cloudCoverPercent: null,
      observationTime: null,
      coverage: false,
      available: false,
    };
  }
}

export function copernicusWeatherAvailable(lat: number, lng: number): boolean {
  return lat >= 35 && lat <= 71 && lng >= -10 && lng <= 40;
}
