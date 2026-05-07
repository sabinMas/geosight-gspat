// Copernicus Emergency Management Service (CEMS) — Flood Hazard Mapping
// Source: Copernicus EMS, ECMWF / JRC
// License: Open access
// Access: Flood inundation maps, European Flood Awareness System (EFAS)

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type FloodHazardLevel = "low" | "moderate" | "high" | "very_high" | "none";

export type CopernicusFloodResult = {
  floodRiskLevel: FloodHazardLevel;
  inFloodZone: boolean;
  returnPeriod: number | null;
  riverName: string | null;
  floodForecastDays: number | null;
  activeDiskReportsCount: number;
  observationTime: string | null;
  coverage: boolean;
  available: boolean;
};

const COPERNICUS_FLOOD_API = "https://cems-flood-api.ecmwf.int/api/flood-hazard";

export async function getCopernicusFloodHazard(lat: number, lng: number): Promise<CopernicusFloodResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${COPERNICUS_FLOOD_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 6 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        floodRiskLevel: "none",
        inFloodZone: false,
        returnPeriod: null,
        riverName: null,
        floodForecastDays: null,
        activeDiskReportsCount: 0,
        observationTime: null,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      flood_risk?: string;
      in_flood_zone?: boolean;
      return_period?: number;
      river_name?: string;
      forecast_days?: number;
      active_reports?: number;
      time?: string;
    };

    const riskMap: { [key: string]: FloodHazardLevel } = {
      low: "low",
      moderate: "moderate",
      high: "high",
      very_high: "very_high",
    };

    return {
      floodRiskLevel: (riskMap[data.flood_risk ?? ""] ?? "none") as FloodHazardLevel,
      inFloodZone: data.in_flood_zone ?? false,
      returnPeriod: data.return_period ?? null,
      riverName: data.river_name ?? null,
      floodForecastDays: data.forecast_days ?? null,
      activeDiskReportsCount: data.active_reports ?? 0,
      observationTime: data.time ?? null,
      coverage: true,
      available: data.in_flood_zone === true || (data.active_reports ?? 0) > 0,
    };
  } catch {
    return {
      floodRiskLevel: "none",
      inFloodZone: false,
      returnPeriod: null,
      riverName: null,
      floodForecastDays: null,
      activeDiskReportsCount: 0,
      observationTime: null,
      coverage: false,
      available: false,
    };
  }
}

export function copernicusFloodAvailable(lat: number, lng: number): boolean {
  return lat >= 35 && lat <= 71 && lng >= -10 && lng <= 40;
}
