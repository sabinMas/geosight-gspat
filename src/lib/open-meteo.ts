import { Coordinates } from "@/types";

interface OpenMeteoResponse {
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
}

interface OpenMeteoAirQualityResponse {
  current?: {
    us_aqi?: number;
  };
}

export async function fetchClimateSnapshot({ lat, lng }: Coordinates) {
  const [weatherResponse, airResponse] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=3`,
      { next: { revalidate: 60 * 60 * 6 } },
    ),
    fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi&timezone=auto`,
      { next: { revalidate: 60 * 60 * 6 } },
    ),
  ]);

  if (!weatherResponse.ok) {
    throw new Error("Open-Meteo request failed.");
  }

  const data = (await weatherResponse.json()) as OpenMeteoResponse;
  const airData = airResponse.ok
    ? ((await airResponse.json()) as OpenMeteoAirQualityResponse)
    : null;
  const averageTempC = data.daily?.temperature_2m_mean?.[0] ?? null;

  return {
    currentTempC: data.current?.temperature_2m ?? null,
    averageTempC,
    dailyHighTempC: data.daily?.temperature_2m_max?.[0] ?? null,
    dailyLowTempC: data.daily?.temperature_2m_min?.[0] ?? null,
    coolingDegreeDays:
      averageTempC === null ? null : Math.max(Math.round(averageTempC * 18), 0),
    precipitationMm: data.daily?.precipitation_sum?.[0] ?? null,
    windSpeedKph: data.current?.wind_speed_10m ?? null,
    airQualityIndex: airData?.current?.us_aqi ?? null,
  };
}
