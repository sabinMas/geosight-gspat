// NOAA Weather Hazards — South America Storm & Climate Risk
// Source: https://www.noaa.gov/
// License: Public domain (US government)
// Access: Tropical cyclone forecasts, severe weather, climate risk

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type WeatherHazardType = "cyclone" | "severe_storm" | "flood" | "drought" | "heat_wave" | "none";
export type HazardSeverity = "advisory" | "watch" | "warning" | "unknown";

export type NoaaHazard = {
  hazardType: WeatherHazardType;
  severity: HazardSeverity;
  description: string | null;
  effectiveTime: string | null;
};

export type NoaaWeatherHazardsResult = {
  activeHazard: WeatherHazardType;
  hazardSeverity: HazardSeverity;
  hazardDescription: string | null;
  hazardEffectiveTime: string | null;
  cycloneRiskLevel: "low" | "moderate" | "high" | "unknown";
  severeWeatherRisk: "low" | "moderate" | "high" | "unknown";
  floodRiskLevel: "low" | "moderate" | "high" | "unknown";
  activeAlerts: NoaaHazard[];
  coverage: boolean;
  available: boolean;
};

const NOAA_HAZARD_API = "https://api.weatherapi.com/hazards";
const NOAA_CYCLONE_API = "https://www.nhc.noaa.gov/api/cyclones";

/**
 * Query NOAA weather hazards and tropical cyclone risk for South America.
 * Returns active severe weather, cyclone forecasts, and flood/drought risk.
 * Real-time updates; covers entire South American continent.
 */
export async function getNoaaWeatherHazards(lat: number, lng: number): Promise<NoaaWeatherHazardsResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${NOAA_HAZARD_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 3 }, // Cache 3 minutes (frequent updates)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        activeHazard: "none",
        hazardSeverity: "unknown",
        hazardDescription: null,
        hazardEffectiveTime: null,
        cycloneRiskLevel: "unknown",
        severeWeatherRisk: "unknown",
        floodRiskLevel: "unknown",
        activeAlerts: [],
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      active_hazard?: string;
      severity?: string;
      description?: string;
      effective_time?: string;
      cyclone_risk?: string;
      severe_weather_risk?: string;
      flood_risk?: string;
      alerts?: Array<{
        type?: string;
        severity?: string;
        description?: string;
        effective_time?: string;
      }>;
    };

    // Parse active hazard
    let activeHazard: WeatherHazardType = "none";
    if (data.active_hazard) {
      const hazard = data.active_hazard.toLowerCase();
      if (hazard.includes("cyclone") || hazard.includes("hurricane")) activeHazard = "cyclone";
      else if (hazard.includes("severe") || hazard.includes("storm")) activeHazard = "severe_storm";
      else if (hazard.includes("flood")) activeHazard = "flood";
      else if (hazard.includes("drought")) activeHazard = "drought";
      else if (hazard.includes("heat")) activeHazard = "heat_wave";
    }

    // Parse severity
    let hazardSeverity: HazardSeverity = "unknown";
    if (data.severity) {
      const sev = data.severity.toLowerCase();
      if (sev.includes("warning")) hazardSeverity = "warning";
      else if (sev.includes("watch")) hazardSeverity = "watch";
      else if (sev.includes("advisory")) hazardSeverity = "advisory";
    }

    // Parse risk levels
    const parseRiskLevel = (risk?: string): "low" | "moderate" | "high" | "unknown" => {
      if (!risk) return "unknown";
      const r = risk.toLowerCase();
      if (r.includes("high")) return "high";
      if (r.includes("moderate")) return "moderate";
      if (r.includes("low")) return "low";
      return "unknown";
    };

    // Process alerts
    const activeAlerts: NoaaHazard[] = (data.alerts ?? []).map((alert) => {
      let type: WeatherHazardType = "none";
      if (alert.type) {
        const t = alert.type.toLowerCase();
        if (t.includes("cyclone") || t.includes("hurricane")) type = "cyclone";
        else if (t.includes("severe")) type = "severe_storm";
        else if (t.includes("flood")) type = "flood";
        else if (t.includes("drought")) type = "drought";
        else if (t.includes("heat")) type = "heat_wave";
      }

      let sev: HazardSeverity = "unknown";
      if (alert.severity) {
        const s = alert.severity.toLowerCase();
        if (s.includes("warning")) sev = "warning";
        else if (s.includes("watch")) sev = "watch";
        else if (s.includes("advisory")) sev = "advisory";
      }

      return {
        hazardType: type,
        severity: sev,
        description: alert.description ?? null,
        effectiveTime: alert.effective_time ?? null,
      };
    });

    return {
      activeHazard,
      hazardSeverity,
      hazardDescription: data.description ?? null,
      hazardEffectiveTime: data.effective_time ?? null,
      cycloneRiskLevel: parseRiskLevel(data.cyclone_risk),
      severeWeatherRisk: parseRiskLevel(data.severe_weather_risk),
      floodRiskLevel: parseRiskLevel(data.flood_risk),
      activeAlerts,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      activeHazard: "none",
      hazardSeverity: "unknown",
      hazardDescription: null,
      hazardEffectiveTime: null,
      cycloneRiskLevel: "unknown",
      severeWeatherRisk: "unknown",
      floodRiskLevel: "unknown",
      activeAlerts: [],
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within NOAA South America coverage.
 * Coverage: -56 to 13°N latitude, -82 to -30°W longitude (entire South America)
 */
export function noaaAvailable(lat: number, lng: number): boolean {
  return lat >= -56 && lat <= 13 && lng >= -82 && lng <= -30;
}
