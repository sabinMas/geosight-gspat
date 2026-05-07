// Geoscience Australia — Hazards & Geological Data
// Source: https://www.ga.gov.au/
// License: Crown Copyright (open data)
// Access: Earthquake hazards, landslide, flood risk mapping

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type HazardLevel = "very_low" | "low" | "moderate" | "high" | "very_high" | "unknown";

export type GeoscienceResult = {
  primaryHazard: "earthquake" | "landslide" | "flood" | "tsunami" | "none" | "unknown";
  hazardLevel: HazardLevel;
  peakGroundAccelerationG: number | null;
  returnPeriodYears: number;
  inHazardZone: boolean;
  coverage: boolean;
  available: boolean;
};

const GEOSCIENCE_API = "https://www.ga.gov.au/api/hazards";

/**
 * Query Geoscience Australia hazard assessments for earthquake, flood, and landslide risk.
 * Returns seismic hazard level (475-year return period PGA) and multi-hazard assessment.
 * Coverage includes all of Australia with varying resolution by hazard type.
 */
export async function getGeoscienceHazards(lat: number, lng: number): Promise<GeoscienceResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${GEOSCIENCE_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 }, // Cache 24 hours (static hazard maps)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        primaryHazard: "unknown",
        hazardLevel: "unknown",
        peakGroundAccelerationG: null,
        returnPeriodYears: 475,
        inHazardZone: false,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      primary_hazard?: string;
      hazard_level?: string;
      pga_g?: number;
      return_period?: number;
      in_hazard_zone?: boolean;
    };

    // Parse hazard type
    let primaryHazard: GeoscienceResult["primaryHazard"] = "unknown";
    if (data.primary_hazard) {
      const hazard = data.primary_hazard.toLowerCase();
      if (hazard.includes("earthquake")) primaryHazard = "earthquake";
      else if (hazard.includes("landslide")) primaryHazard = "landslide";
      else if (hazard.includes("flood")) primaryHazard = "flood";
      else if (hazard.includes("tsunami")) primaryHazard = "tsunami";
      else if (hazard.includes("none")) primaryHazard = "none";
    }

    // Parse hazard level
    let hazardLevel: HazardLevel = "unknown";
    if (data.hazard_level) {
      const level = data.hazard_level.toLowerCase();
      if (level.includes("very high")) hazardLevel = "very_high";
      else if (level.includes("high")) hazardLevel = "high";
      else if (level.includes("moderate")) hazardLevel = "moderate";
      else if (level.includes("low")) hazardLevel = "low";
      else if (level.includes("very low")) hazardLevel = "very_low";
    }

    return {
      primaryHazard,
      hazardLevel,
      peakGroundAccelerationG: data.pga_g ?? null,
      returnPeriodYears: data.return_period ?? 475,
      inHazardZone: data.in_hazard_zone ?? false,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      primaryHazard: "unknown",
      hazardLevel: "unknown",
      peakGroundAccelerationG: null,
      returnPeriodYears: 475,
      inHazardZone: false,
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within Geoscience Australia coverage (all of Australia).
 * Coverage: Australia + external territories (lat -44 to -9°S, lng 113-154°E)
 */
export function geoscienceAvailable(lat: number, lng: number): boolean {
  return lat >= -44 && lat <= -9 && lng >= 113 && lng <= 154;
}
