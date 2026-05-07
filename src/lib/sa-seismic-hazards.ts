// South Africa Seismic Hazards — GEM & Council for Geoscience Data
// Source: GEM Foundation & Council for Geoscience
// License: Open access (GEM CC-BY 3.0)
// Access: Probabilistic seismic hazard, earthquake catalogs, fault models

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type SeismicRiskLevel = "very_low" | "low" | "moderate" | "high" | "very_high";

export type SaSeismicHazardsResult = {
  seismicRisk: SeismicRiskLevel;
  peakGroundAccelerationG: number | null;
  nearestEarthquakeCount30d: number;
  strongestMagnitude30d: number | null;
  returnPeriod: number;
  inHazardZone: boolean;
  nearestFault: string | null;
  recentEarthquakes: Array<{
    magnitude: number;
    datetime: string;
    depth_km: number;
    location: string;
  }>;
  coverage: boolean;
  available: boolean;
};

const SA_SEISMIC_API = "https://gem-api.globalquakemodel.org/sa-hazard";

export async function getSaSeismicHazards(lat: number, lng: number): Promise<SaSeismicHazardsResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${SA_SEISMIC_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 12 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        seismicRisk: "very_low",
        peakGroundAccelerationG: null,
        nearestEarthquakeCount30d: 0,
        strongestMagnitude30d: null,
        returnPeriod: 475,
        inHazardZone: false,
        nearestFault: null,
        recentEarthquakes: [],
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      seismic_risk?: string;
      pga_g?: number;
      eq_count_30d?: number;
      strongest_magnitude_30d?: number;
      return_period?: number;
      in_hazard_zone?: boolean;
      nearest_fault?: string;
      recent_earthquakes?: Array<{
        magnitude?: number;
        datetime?: string;
        depth_km?: number;
        location?: string;
      }>;
    };

    const riskMap: { [key: string]: SeismicRiskLevel } = {
      very_low: "very_low",
      low: "low",
      moderate: "moderate",
      high: "high",
      very_high: "very_high",
    };

    const seismicRisk = (riskMap[data.seismic_risk ?? ""] ?? "very_low") as SeismicRiskLevel;
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
      peakGroundAccelerationG: data.pga_g ?? null,
      nearestEarthquakeCount30d: data.eq_count_30d ?? 0,
      strongestMagnitude30d: data.strongest_magnitude_30d ?? null,
      returnPeriod: data.return_period ?? 475,
      inHazardZone: data.in_hazard_zone ?? false,
      nearestFault: data.nearest_fault ?? null,
      recentEarthquakes,
      coverage: true,
      available: (data.eq_count_30d ?? 0) > 0 || data.pga_g !== undefined,
    };
  } catch {
    return {
      seismicRisk: "very_low",
      peakGroundAccelerationG: null,
      nearestEarthquakeCount30d: 0,
      strongestMagnitude30d: null,
      returnPeriod: 475,
      inHazardZone: false,
      nearestFault: null,
      recentEarthquakes: [],
      coverage: false,
      available: false,
    };
  }
}

export function saSeismicAvailable(lat: number, lng: number): boolean {
  return lat >= -34.9 && lat <= -22.1 && lng >= 16.5 && lng <= 32.9;
}
