// MENA Air Quality & Dust Monitoring
// Sources: Regional air quality networks, Copernicus, NOAA
// License: Open data from various government agencies
// Access: Real-time air quality and dust storm monitoring

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type DustLevel = "low" | "moderate" | "high" | "severe" | "unknown";

export type MenaAirQualityResult = {
  aqi: number | null;
  aqiCategory: string | null;
  dustLevel: DustLevel;
  pm25: number | null;
  pm10: number | null;
  dominantPollutant: string | null;
  activeDustStorm: boolean;
  visibility: number | null; // kilometers
  observationTime: string | null;
  coverage: boolean;
  available: boolean;
};

const MENA_AQ_API = "https://api.dust-monitor.org/mena";

export async function getMenaAirQuality(lat: number, lng: number): Promise<MenaAirQualityResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${MENA_AQ_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 10 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        aqi: null,
        aqiCategory: null,
        dustLevel: "unknown",
        pm25: null,
        pm10: null,
        dominantPollutant: null,
        activeDustStorm: false,
        visibility: null,
        observationTime: null,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      aqi?: number;
      aqi_category?: string;
      dust_level?: string;
      pm25?: number;
      pm10?: number;
      dominant_pollutant?: string;
      active_dust_storm?: boolean;
      visibility_km?: number;
      time?: string;
    };

    let dustLevel: DustLevel = "unknown";
    if (data.dust_level) {
      const level = data.dust_level.toLowerCase();
      if (level.includes("severe")) dustLevel = "severe";
      else if (level.includes("high")) dustLevel = "high";
      else if (level.includes("moderate")) dustLevel = "moderate";
      else if (level.includes("low")) dustLevel = "low";
    }

    return {
      aqi: data.aqi ?? null,
      aqiCategory: data.aqi_category ?? null,
      dustLevel,
      pm25: data.pm25 ?? null,
      pm10: data.pm10 ?? null,
      dominantPollutant: data.dominant_pollutant ?? null,
      activeDustStorm: data.active_dust_storm ?? false,
      visibility: data.visibility_km ?? null,
      observationTime: data.time ?? null,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      aqi: null,
      aqiCategory: null,
      dustLevel: "unknown",
      pm25: null,
      pm10: null,
      dominantPollutant: null,
      activeDustStorm: false,
      visibility: null,
      observationTime: null,
      coverage: false,
      available: false,
    };
  }
}

export function menaAirQualityAvailable(lat: number, lng: number): boolean {
  return lat >= -10 && lat <= 50 && lng >= -20 && lng <= 70;
}
