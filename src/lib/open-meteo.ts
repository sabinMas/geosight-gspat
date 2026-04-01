import { Coordinates, GeodataResult, WeatherForecastDay } from "@/types";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

type ForecastResponse = {
  current?: {
    temperature_2m?: number;
    wind_speed_10m?: number;
    weathercode?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_mean?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    weathercode?: number[];
    wind_speed_10m_max?: number[];
    uv_index_max?: number[];
  };
};

type AirQualityResponse = {
  current?: {
    us_aqi?: number;
  };
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function parseNullableNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function wmoCodeToConditionLabel(code: number | null | undefined): string | null {
  if (code === null || code === undefined || !Number.isFinite(code)) {
    return null;
  }

  if (code === 0) return "Clear sky";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code <= 99) return "Thunderstorm with hail";

  return null;
}

function wmoCodeToRiskLabel(code: number | undefined): string | null {
  if (typeof code !== "number" || !Number.isFinite(code)) {
    return null;
  }

  if (code >= 95) return "Thunderstorm";
  if (code >= 80) return "Heavy showers";
  if (code >= 71) return "Snowfall";
  if (code >= 61) return "Rain";
  if (code >= 51) return "Drizzle";
  if (code >= 45) return "Fog";
  if (code <= 3) return null;

  return null;
}

function buildForecastDay(
  index: number,
  daily: NonNullable<ForecastResponse["daily"]>,
): WeatherForecastDay | null {
  const dateString = daily.time?.[index];
  if (!dateString) {
    return null;
  }

  // Parse day-of-week from the ISO date string (YYYY-MM-DD) without timezone shifts
  const [year, month, day] = dateString.split("-").map(Number);
  const localDate = new Date(year, month - 1, day);
  const dayLabel = DAY_LABELS[localDate.getDay()] ?? dateString;
  const weatherCode = parseNullableNumber(daily.weathercode?.[index]);

  return {
    date: dateString,
    dayLabel,
    conditionLabel: wmoCodeToConditionLabel(weatherCode),
    weatherCode,
    highTempC: parseNullableNumber(daily.temperature_2m_max?.[index]),
    lowTempC: parseNullableNumber(daily.temperature_2m_min?.[index]),
    precipitationMm: parseNullableNumber(daily.precipitation_sum?.[index]),
    precipitationProbability: parseNullableNumber(daily.precipitation_probability_max?.[index]),
    windSpeedKph: parseNullableNumber(daily.wind_speed_10m_max?.[index]),
    uvIndex: parseNullableNumber(daily.uv_index_max?.[index]),
  };
}

export async function fetchClimateSnapshot(coords: Coordinates): Promise<{
  climate: GeodataResult["climate"];
  forecast: WeatherForecastDay[];
}> {
  const [forecastResult, airQualityResult] = await Promise.allSettled([
    fetchWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,wind_speed_10m,weathercode&daily=time,temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode,wind_speed_10m_max,uv_index_max&timezone=auto&forecast_days=7`,
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

  const forecastData = forecastResult.status === "fulfilled" ? forecastResult.value : undefined;
  const airQuality =
    airQualityResult.status === "fulfilled" ? airQualityResult.value : undefined;
  const averageTemp = parseNullableNumber(forecastData?.daily?.temperature_2m_mean?.[0]);
  const weatherRiskLabels = Array.from(
    new Set(
      [
        wmoCodeToRiskLabel(forecastData?.current?.weathercode),
        wmoCodeToRiskLabel(forecastData?.daily?.weathercode?.[0]),
        wmoCodeToRiskLabel(forecastData?.daily?.weathercode?.[1]),
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  const daily = forecastData?.daily;
  const forecastDays: WeatherForecastDay[] = daily
    ? Array.from({ length: Math.min(7, daily.time?.length ?? 0) }, (_, i) =>
        buildForecastDay(i, daily),
      ).filter((day): day is WeatherForecastDay => day !== null)
    : [];

  return {
    climate: {
      currentTempC: parseNullableNumber(forecastData?.current?.temperature_2m),
      averageTempC: averageTemp,
      dailyHighTempC: parseNullableNumber(forecastData?.daily?.temperature_2m_max?.[0]),
      dailyLowTempC: parseNullableNumber(forecastData?.daily?.temperature_2m_min?.[0]),
      coolingDegreeDays: averageTemp === null ? null : Math.max(Math.round(averageTemp * 18), 0),
      precipitationMm: parseNullableNumber(forecastData?.daily?.precipitation_sum?.[0]),
      windSpeedKph: parseNullableNumber(forecastData?.current?.wind_speed_10m),
      airQualityIndex: parseNullableNumber(airQuality?.current?.us_aqi),
      weatherRiskSummary: weatherRiskLabels.length
        ? `${weatherRiskLabels.join(", ")} conditions expected`
        : null,
    },
    forecast: forecastDays,
  };
}
