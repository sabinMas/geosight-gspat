// BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) — Indonesia Weather & Seismic
// Source: Indonesian Meteorological, Climatological and Geophysical Agency
// License: Indonesian government open data
// Access: Real-time weather, seismic data, tsunami warnings (400+ seismic sensors)

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type BmkgWeatherResult = {
  temperatureC: number | null;
  humidityPercent: number | null;
  windSpeedKph: number | null;
  precipitationMm: number | null;
  weatherCondition: string | null;
  activeAlert: "typhoon" | "flood" | "heat_wave" | "tsunami" | "none";
  alertDetails: string | null;
  observationTime: string | null;
  coverage: boolean;
  available: boolean;
};

export type BmkgSeismicResult = {
  seismicRisk: "low" | "moderate" | "high" | "very_high";
  nearestEarthquakeCount30d: number;
  strongestMagnitude30d: number | null;
  tsunamiWarning: boolean;
  tsunamiHeight: number | null;
  recentEarthquakes: Array<{
    magnitude: number;
    datetime: string;
    depth_km: number;
    location: string;
  }>;
  coverage: boolean;
  available: boolean;
};

const BMKG_WEATHER_API = "https://data.bmkg.go.id/api/weather";
const BMKG_SEISMIC_API = "https://data.bmkg.go.id/api/seismic";

export async function getBmkgWeather(lat: number, lng: number): Promise<BmkgWeatherResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${BMKG_WEATHER_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 6 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        temperatureC: null,
        humidityPercent: null,
        windSpeedKph: null,
        precipitationMm: null,
        weatherCondition: null,
        activeAlert: "none",
        alertDetails: null,
        observationTime: null,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      temp_c?: number;
      humidity?: number;
      wind_speed_kph?: number;
      precipitation?: number;
      condition?: string;
      alert?: string;
      alert_details?: string;
      time?: string;
    };

    let activeAlert: "typhoon" | "flood" | "heat_wave" | "tsunami" | "none" = "none";
    if (data.alert) {
      const alert = data.alert.toLowerCase();
      if (alert.includes("typhoon") || alert.includes("siklon")) activeAlert = "typhoon";
      else if (alert.includes("flood") || alert.includes("banjir")) activeAlert = "flood";
      else if (alert.includes("heat")) activeAlert = "heat_wave";
      else if (alert.includes("tsunami")) activeAlert = "tsunami";
    }

    return {
      temperatureC: data.temp_c ?? null,
      humidityPercent: data.humidity ?? null,
      windSpeedKph: data.wind_speed_kph ?? null,
      precipitationMm: data.precipitation ?? null,
      weatherCondition: data.condition ?? null,
      activeAlert,
      alertDetails: data.alert_details ?? null,
      observationTime: data.time ?? null,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      temperatureC: null,
      humidityPercent: null,
      windSpeedKph: null,
      precipitationMm: null,
      weatherCondition: null,
      activeAlert: "none",
      alertDetails: null,
      observationTime: null,
      coverage: false,
      available: false,
    };
  }
}

export async function getBmkgSeismic(lat: number, lng: number): Promise<BmkgSeismicResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${BMKG_SEISMIC_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 6 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        seismicRisk: "low",
        nearestEarthquakeCount30d: 0,
        strongestMagnitude30d: null,
        tsunamiWarning: false,
        tsunamiHeight: null,
        recentEarthquakes: [],
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      seismic_risk?: string;
      eq_count_30d?: number;
      strongest_magnitude_30d?: number;
      tsunami_warning?: boolean;
      tsunami_height?: number;
      recent_earthquakes?: Array<{
        magnitude?: number;
        datetime?: string;
        depth_km?: number;
        location?: string;
      }>;
    };

    const riskMap: { [key: string]: "low" | "moderate" | "high" | "very_high" } = {
      low: "low",
      moderate: "moderate",
      high: "high",
      very_high: "very_high",
    };

    const seismicRisk = (riskMap[data.seismic_risk ?? ""] ?? "moderate") as "low" | "moderate" | "high" | "very_high";
    const recentEarthquakes = (data.recent_earthquakes ?? [])
      .map((eq) => ({
        magnitude: eq.magnitude ?? 0,
        datetime: eq.datetime ?? new Date().toISOString(),
        depth_km: eq.depth_km ?? 0,
        location: eq.location ?? "unknown",
      }))
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

    return {
      seismicRisk,
      nearestEarthquakeCount30d: data.eq_count_30d ?? 0,
      strongestMagnitude30d: data.strongest_magnitude_30d ?? null,
      tsunamiWarning: data.tsunami_warning ?? false,
      tsunamiHeight: data.tsunami_height ?? null,
      recentEarthquakes,
      coverage: true,
      available: (data.eq_count_30d ?? 0) > 0 || data.tsunami_warning === true,
    };
  } catch {
    return {
      seismicRisk: "low",
      nearestEarthquakeCount30d: 0,
      strongestMagnitude30d: null,
      tsunamiWarning: false,
      tsunamiHeight: null,
      recentEarthquakes: [],
      coverage: false,
      available: false,
    };
  }
}

export function bmkgAvailable(lat: number, lng: number): boolean {
  return lat >= -10.3 && lat <= 6.5 && lng >= 95.0 && lng <= 141.0;
}
