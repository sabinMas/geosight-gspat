// INPE Deforestation Monitoring — Amazon & Atlantic Forest Deforestation
// Source: https://www.inpe.gov.br/ (Instituto Nacional de Pesquisas Espaciais)
// License: Brazilian government open data
// Access: Deforestation alerts and forest loss monitoring

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type DeforestationLevel = "low" | "moderate" | "high" | "critical" | "unknown";

export type InpeDeforestationResult = {
  forestCoverPercent: number | null;
  deforestationRiskLevel: DeforestationLevel;
  recentDeforestationArea: number | null; // hectares in last 30 days
  alertCount30d: number;
  isAmazonRegion: boolean;
  coverage: boolean;
  available: boolean;
};

const INPE_DEFOREST_API = "https://www.inpe.gov.br/api/deforestation";

/**
 * Query INPE deforestation monitoring data for Amazon and Atlantic Forest regions.
 * Returns forest cover percentage, deforestation risk level, and recent deforestation alerts.
 * Real-time satellite monitoring; coverage includes Brazilian Amazon and Atlantic Forest.
 */
export async function getInpeDeforestation(lat: number, lng: number): Promise<InpeDeforestationResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${INPE_DEFOREST_API}?lat=${lat}&lng=${lng}&period=30d`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 24 }, // Cache 24 hours (daily alerts)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        forestCoverPercent: null,
        deforestationRiskLevel: "unknown",
        recentDeforestationArea: null,
        alertCount30d: 0,
        isAmazonRegion: false,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      forest_cover_percent?: number;
      deforestation_risk?: string;
      recent_deforestation_hectares?: number;
      alert_count_30d?: number;
      is_amazon?: boolean;
    };

    // Parse risk level
    let deforestationRiskLevel: DeforestationLevel = "unknown";
    if (data.deforestation_risk) {
      const risk = data.deforestation_risk.toLowerCase();
      if (risk.includes("critical")) deforestationRiskLevel = "critical";
      else if (risk.includes("high")) deforestationRiskLevel = "high";
      else if (risk.includes("moderate")) deforestationRiskLevel = "moderate";
      else if (risk.includes("low")) deforestationRiskLevel = "low";
    }

    return {
      forestCoverPercent: data.forest_cover_percent ?? null,
      deforestationRiskLevel,
      recentDeforestationArea: data.recent_deforestation_hectares ?? null,
      alertCount30d: data.alert_count_30d ?? 0,
      isAmazonRegion: data.is_amazon ?? false,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      forestCoverPercent: null,
      deforestationRiskLevel: "unknown",
      recentDeforestationArea: null,
      alertCount30d: 0,
      isAmazonRegion: false,
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within INPE coverage (Amazon & Atlantic Forest regions in South America).
 * Coverage: -37 to 13°N latitude, -85 to -28°W longitude (Brazil + Amazon Basin + South America)
 */
export function inpeAvailable(lat: number, lng: number): boolean {
  return lat >= -37 && lat <= 13 && lng >= -85 && lng <= -28;
}
