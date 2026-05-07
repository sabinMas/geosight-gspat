// J-SHIS (Japan Seismic Hazard Information Station) — Seismic hazard maps
// Source: https://www.j-shis.bosai.go.jp/
// License: NIED terms (free for research/education/public benefit)
// Access: WMS, REST API for fault data

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type JShisSeismicResult = {
  pgaG: number | null; // Peak ground acceleration (in units of G)
  saAtPeriodsG: { period: number; acceleration: number }[] | null; // Spectral acceleration at various periods
  hazardLevel: "very_low" | "low" | "moderate" | "high" | "very_high" | "unknown";
  returnPeriodYears: number | null; // Probability-based return period
  coverage: boolean;
  available: boolean;
};

const JSHIS_WMS = "https://www.j-shis.bosai.go.jp/map/wms";
const JSHIS_REST = "https://www.j-shis.bosai.go.jp/api";

/**
 * Query J-SHIS WMS for seismic hazard at a given location.
 * Returns ground-motion parameters (PGA, spectral acceleration) for specified return period.
 * Uses 475-year return period (equivalent to ~10% probability of exceedance in 50 years, typical for design).
 */
export async function getJShisSeismic(lat: number, lng: number): Promise<JShisSeismicResult | null> {
  try {
    // J-SHIS WMS endpoint for seismic hazard
    // Layer: PGA (Peak Ground Acceleration) for 475-year return period (design-level)
    const url = new URL(JSHIS_WMS);
    url.searchParams.set("service", "WMS");
    url.searchParams.set("version", "1.3.0");
    url.searchParams.set("request", "GetFeatureInfo");
    url.searchParams.set("layers", "PGA_475YR"); // 475-year return period (design standard)
    url.searchParams.set("query_layers", "PGA_475YR");
    url.searchParams.set("crs", "EPSG:4326");
    url.searchParams.set("i", "50");
    url.searchParams.set("j", "50");
    url.searchParams.set("width", "101");
    url.searchParams.set("height", "101");
    url.searchParams.set("bbox", `${lng - 0.015},${lat - 0.015},${lng + 0.015},${lat + 0.015}`);
    url.searchParams.set("info_format", "application/json");

    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 * 7 }, // Cache 7 days (model stable)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return { pgaG: null, saAtPeriodsG: null, hazardLevel: "unknown", returnPeriodYears: null, coverage: false, available: false };
    }

    const data = (await response.json()) as {
      features?: Array<{ properties?: Record<string, string | number | boolean> }>;
    };

    const features = data.features ?? [];
    if (features.length === 0) {
      return { pgaG: null, saAtPeriodsG: null, hazardLevel: "unknown", returnPeriodYears: null, coverage: true, available: true };
    }

    // Extract PGA value from feature properties
    const props = features[0]?.properties ?? {};
    const propsStr = JSON.stringify(props).toLowerCase();

    // Parse PGA value (typically in cm/s² or %G)
    let pgaG: number | null = null;
    let hazardLevel: "very_low" | "low" | "moderate" | "high" | "very_high" | "unknown" = "unknown";

    // Look for common PGA property names
    for (const [key, val] of Object.entries(props)) {
      if (typeof val === "number" && key.toLowerCase().includes("pga")) {
        // Assume value is in cm/s²; convert to G (1G ≈ 980 cm/s²)
        pgaG = val / 980;
        break;
      }
    }

    // Categorize hazard level based on PGA
    if (pgaG !== null) {
      if (pgaG < 0.05) hazardLevel = "very_low";
      else if (pgaG < 0.1) hazardLevel = "low";
      else if (pgaG < 0.2) hazardLevel = "moderate";
      else if (pgaG < 0.4) hazardLevel = "high";
      else hazardLevel = "very_high";
    }

    return {
      pgaG,
      saAtPeriodsG: null, // Would require spectral acceleration layer queries
      hazardLevel,
      returnPeriodYears: 475,
      coverage: true,
      available: true,
    };
  } catch {
    return { pgaG: null, saAtPeriodsG: null, hazardLevel: "unknown", returnPeriodYears: null, coverage: false, available: false };
  }
}

/**
 * Check if coordinates fall within J-SHIS coverage (Japan territory + EEZ).
 * Simplified bounds: lat 20–45°N, lng 130–145°E (main islands + southern islands)
 */
export function jshisSeismicAvailable(lat: number, lng: number): boolean {
  return lat >= 20 && lat <= 45 && lng >= 130 && lng <= 145;
}
