import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { Coordinates } from "@/types";

export interface ClimateYearSummary {
  year: number;
  avgTempC: number;
  maxTempC: number;
  minTempC: number;
  totalPrecipitationMm: number;
  precipitationDays: number;
}

export interface ClimateHistoryResult {
  location: Coordinates;
  summaries: ClimateYearSummary[];
  baselineAvgTempC: number | null;
  recentAvgTempC: number | null;
  trendDirection: "warming" | "cooling" | "stable" | null;
}

const OPEN_METEO_ARCHIVE_ENDPOINT = "https://archive-api.open-meteo.com/v1/archive";
const HISTORICAL_TIMEOUT_MS = 15_000;

type DailyClimatePayload = {
  time?: string[];
  temperature_2m_max?: Array<number | null>;
  temperature_2m_min?: Array<number | null>;
  temperature_2m_mean?: Array<number | null>;
  precipitation_sum?: Array<number | null>;
};

type ClimateArchiveResponse = {
  daily?: DailyClimatePayload;
};

function emptyClimateHistory(location: Coordinates): ClimateHistoryResult {
  return {
    location,
    summaries: [],
    baselineAvgTempC: null,
    recentAvgTempC: null,
    trendDirection: null,
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundToTenth(value: number) {
  return Number(value.toFixed(1));
}

export async function getClimateHistory(
  coords: Coordinates,
): Promise<ClimateHistoryResult> {
  try {
    const url = new URL(OPEN_METEO_ARCHIVE_ENDPOINT);
    url.searchParams.set("latitude", String(coords.lat));
    url.searchParams.set("longitude", String(coords.lng));
    url.searchParams.set("start_date", "2015-01-01");
    url.searchParams.set("end_date", "2024-12-31");
    url.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum",
    );
    url.searchParams.set("timezone", "auto");

    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 },
      },
      Math.max(EXTERNAL_TIMEOUTS.standard, HISTORICAL_TIMEOUT_MS),
    );

    if (!response.ok) {
      return emptyClimateHistory(coords);
    }

    const payload = (await response.json()) as ClimateArchiveResponse;
    const daily = payload.daily;
    if (
      !daily?.time?.length ||
      !daily.temperature_2m_max ||
      !daily.temperature_2m_min ||
      !daily.temperature_2m_mean ||
      !daily.precipitation_sum
    ) {
      return emptyClimateHistory(coords);
    }

    const yearlyBuckets = new Map<
      number,
      {
        meanTemps: number[];
        maxTemps: number[];
        minTemps: number[];
        precipitationTotals: number[];
      }
    >();

    for (let index = 0; index < daily.time.length; index += 1) {
      const year = Number(daily.time[index]?.slice(0, 4));
      if (!Number.isFinite(year)) {
        continue;
      }

      const bucket = yearlyBuckets.get(year) ?? {
        meanTemps: [],
        maxTemps: [],
        minTemps: [],
        precipitationTotals: [],
      };

      const maxTemp = daily.temperature_2m_max[index];
      const minTemp = daily.temperature_2m_min[index];
      const meanTemp = daily.temperature_2m_mean[index];
      const precipitation = daily.precipitation_sum[index];

      if (isFiniteNumber(maxTemp)) {
        bucket.maxTemps.push(maxTemp);
      }
      if (isFiniteNumber(minTemp)) {
        bucket.minTemps.push(minTemp);
      }
      if (isFiniteNumber(meanTemp)) {
        bucket.meanTemps.push(meanTemp);
      }
      if (isFiniteNumber(precipitation)) {
        bucket.precipitationTotals.push(precipitation);
      }

      yearlyBuckets.set(year, bucket);
    }

    const summaries = Array.from({ length: 10 }, (_, index) => 2015 + index)
      .map((year): ClimateYearSummary | null => {
        const bucket = yearlyBuckets.get(year);
        if (!bucket?.meanTemps.length || !bucket.maxTemps.length || !bucket.minTemps.length) {
          return null;
        }

        const totalPrecipitationMm = bucket.precipitationTotals.reduce(
          (sum, value) => sum + value,
          0,
        );

        return {
          year,
          avgTempC: roundToTenth(average(bucket.meanTemps) ?? 0),
          maxTempC: roundToTenth(Math.max(...bucket.maxTemps)),
          minTempC: roundToTenth(Math.min(...bucket.minTemps)),
          totalPrecipitationMm: roundToTenth(totalPrecipitationMm),
          precipitationDays: bucket.precipitationTotals.filter((value) => value > 0.2).length,
        };
      })
      .filter((summary): summary is ClimateYearSummary => summary !== null);

    const baselineAvgTempC = average(
      summaries.filter((summary) => summary.year >= 2015 && summary.year <= 2019).map((summary) => summary.avgTempC),
    );
    const recentAvgTempC = average(
      summaries.filter((summary) => summary.year >= 2020 && summary.year <= 2024).map((summary) => summary.avgTempC),
    );
    const trendDelta =
      baselineAvgTempC !== null && recentAvgTempC !== null
        ? recentAvgTempC - baselineAvgTempC
        : null;

    return {
      location: coords,
      summaries,
      baselineAvgTempC: baselineAvgTempC === null ? null : roundToTenth(baselineAvgTempC),
      recentAvgTempC: recentAvgTempC === null ? null : roundToTenth(recentAvgTempC),
      trendDirection:
        trendDelta === null
          ? null
          : trendDelta > 0.3
            ? "warming"
            : trendDelta < -0.3
              ? "cooling"
              : "stable",
    };
  } catch {
    return emptyClimateHistory(coords);
  }
}
