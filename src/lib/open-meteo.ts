import { Coordinates, GeodataResult } from "@/types";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

type ForecastResponse = {
  current?: {
    temperature_2m?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    temperature_2m_mean?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
  };
};

type AirQualityResponse = {
  current?: {
    us_aqi?: number;
  };
};

function parseNullableNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function fetchClimateSnapshot(
  coords: Coordinates,
): Promise<GeodataResult["climate"]> {
  const [forecastResult, airQualityResult] = await Promise.allSettled([
    fetchWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,wind_speed_10m&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=3`,
      {
        next: { revalidate: 60 * 60 * 6 },
      },
      EXTERNAL_TIMEOUTS.fast,
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error("Forecast request failed.");
      }

      return (await response.json()) as ForecastResponse;
    }),
    fetchWithTimeout(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${coords.lat}&longitude=${coords.lng}&current=us_aqi&timezone=auto`,
      {
        next: { revalidate: 60 * 60 * 6 },
      },
      EXTERNAL_TIMEOUTS.fast,
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error("Air-quality request failed.");
      }

      return (await response.json()) as AirQualityResponse;
    }),
  ]);

  const forecast = forecastResult.status === "fulfilled" ? forecastResult.value : undefined;
  const airQuality =
    airQualityResult.status === "fulfilled" ? airQualityResult.value : undefined;
  const averageTemp = parseNullableNumber(forecast?.daily?.temperature_2m_mean?.[0]);

  return {
    currentTempC: parseNullableNumber(forecast?.current?.temperature_2m),
    averageTempC: averageTemp,
    dailyHighTempC: parseNullableNumber(forecast?.daily?.temperature_2m_max?.[0]),
    dailyLowTempC: parseNullableNumber(forecast?.daily?.temperature_2m_min?.[0]),
    coolingDegreeDays: averageTemp === null ? null : Math.max(Math.round(averageTemp * 18), 0),
    precipitationMm: parseNullableNumber(forecast?.daily?.precipitation_sum?.[0]),
    windSpeedKph: parseNullableNumber(forecast?.current?.wind_speed_10m),
    airQualityIndex: parseNullableNumber(airQuality?.current?.us_aqi),
  };
}
