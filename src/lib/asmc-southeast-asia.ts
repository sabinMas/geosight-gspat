// ASMC (ASEAN Specialized Meteorological Centre) — Regional Southeast Asia Weather
// Source: ASEAN Specialized Meteorological Centre
// License: ASEAN member states open data
// Access: Regional weather observations, seasonal forecasts, haze/air quality monitoring

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type AsmcSeasonalOutlook = "below_normal" | "normal" | "above_normal";

export type AsmcWeatherResult = {
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  rainfallMm: number | null;
  visibility: number | null;
  activeHazard: "haze" | "typhoon" | "heavy_rain" | "dry_spell" | "none";
  hazardSeverity: "advisory" | "watch" | "warning" | "critical" | "none";
  seasonalOutlook: AsmcSeasonalOutlook | null;
  ensoStatus: "la_nina" | "neutral" | "el_nino" | null;
  observationTime: string | null;
  coverage: boolean;
  available: boolean;
};

const ASMC_API = "https://asmc.asean.org/api/weather";

export async function getAsmcWeather(lat: number, lng: number): Promise<AsmcWeatherResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${ASMC_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 12 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        temperatureC: null,
        humidityPercent: null,
        windSpeedKph: null,
        rainfallMm: null,
        visibility: null,
        activeHazard: "none",
        hazardSeverity: "none",
        seasonalOutlook: null,
        ensoStatus: null,
        observationTime: null,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      temp_c?: number;
      humidity?: number;
      wind_speed_kph?: number;
      rainfall?: number;
      visibility?: number;
      hazard?: string;
      severity?: string;
      seasonal_outlook?: string;
      enso_status?: string;
      time?: string;
    };

    const hazardMap: { [key: string]: "haze" | "typhoon" | "heavy_rain" | "dry_spell" } = {
      haze: "haze",
      typhoon: "typhoon",
      heavy_rain: "heavy_rain",
      dry_spell: "dry_spell",
    };

    const severityMap: { [key: string]: "advisory" | "watch" | "warning" | "critical" } = {
      advisory: "advisory",
      watch: "watch",
      warning: "warning",
      critical: "critical",
    };

    const outlookMap: { [key: string]: AsmcSeasonalOutlook } = {
      below_normal: "below_normal",
      normal: "normal",
      above_normal: "above_normal",
    };

    const ensoMap: { [key: string]: "la_nina" | "neutral" | "el_nino" } = {
      la_nina: "la_nina",
      neutral: "neutral",
      el_nino: "el_nino",
    };

    const activeHazard = (hazardMap[data.hazard ?? ""] ?? "none") as
      | "haze"
      | "typhoon"
      | "heavy_rain"
      | "dry_spell"
      | "none";
    const hazardSeverity = (severityMap[data.severity ?? ""] ?? "none") as
      | "advisory"
      | "watch"
      | "warning"
      | "critical"
      | "none";

    return {
      temperatureC: data.temp_c ?? null,
      humidityPercent: data.humidity ?? null,
      windSpeedKph: data.wind_speed_kph ?? null,
      rainfallMm: data.rainfall ?? null,
      visibility: data.visibility ?? null,
      activeHazard,
      hazardSeverity,
      seasonalOutlook: outlookMap[data.seasonal_outlook ?? ""] ?? null,
      ensoStatus: ensoMap[data.enso_status ?? ""] ?? null,
      observationTime: data.time ?? null,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      temperatureC: null,
      humidityPercent: null,
      windSpeedKph: null,
      rainfallMm: null,
      visibility: null,
      activeHazard: "none",
      hazardSeverity: "none",
      seasonalOutlook: null,
      ensoStatus: null,
      observationTime: null,
      coverage: false,
      available: false,
    };
  }
}

export function asmcWeatherAvailable(lat: number, lng: number): boolean {
  return lat >= -10.5 && lat <= 21.5 && lng >= 92.0 && lng <= 141.0;
}
