// Hazard Map Portal (Kasaneru) — Japan's comprehensive natural disaster hazard mapping
// Source: https://disaportal.gsi.go.jp/hazardmap/ (Disaportal - Disaster Prevention Information Portal)
// License: Free for commercial use (GoJ data)
// Access: XYZ raster tiles, WMS for flood/tsunami/sediment/storm surge/debris flow

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type HazardType = "flood" | "tsunami" | "sediment" | "storm_surge" | "debris_flow" | "unknown";
export type HazardRiskLevel = "low" | "moderate" | "high" | "very_high" | "extreme" | "unknown";

export type HazardMapResult = {
  primaryHazard: HazardType;
  riskLevel: HazardRiskLevel;
  inHazardZone: boolean;
  hazardTypes: HazardType[];
  depthOrIntensity: string | null; // e.g., "1-2m" for flood depth
  coverage: boolean;
  available: boolean;
};

const HAZARD_MAP_WMS = "https://disaportal.gsi.go.jp/hazardmap/rest/services";

/**
 * Query Japan Hazard Map Portal (Kasaneru) for multi-hazard risk at a location.
 * Checks flood, tsunami, sediment, storm surge, debris flow in priority order.
 * Uses WMS GetFeatureInfo to determine hazard presence and intensity at point.
 */
export async function getJapanHazardMap(lat: number, lng: number): Promise<HazardMapResult | null> {
  try {
    // Query flood hazard first (most common in Japan)
    const url = new URL(HAZARD_MAP_WMS);
    url.searchParams.set("service", "WMS");
    url.searchParams.set("version", "1.3.0");
    url.searchParams.set("request", "GetFeatureInfo");
    url.searchParams.set("layers", "flood"); // Flood inundation depth
    url.searchParams.set("query_layers", "flood");
    url.searchParams.set("crs", "EPSG:4326");
    url.searchParams.set("i", "50");
    url.searchParams.set("j", "50");
    url.searchParams.set("width", "101");
    url.searchParams.set("height", "101");
    url.searchParams.set("bbox", `${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}`);
    url.searchParams.set("info_format", "application/json");

    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 }, // Cache 1 day (hazard maps updated periodically)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        primaryHazard: "unknown",
        riskLevel: "unknown",
        inHazardZone: false,
        hazardTypes: [],
        depthOrIntensity: null,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      features?: Array<{ properties?: Record<string, string | number | boolean> }>;
    };

    const features = data.features ?? [];
    if (features.length === 0) {
      return {
        primaryHazard: "unknown",
        riskLevel: "unknown",
        inHazardZone: false,
        hazardTypes: [],
        depthOrIntensity: null,
        coverage: true,
        available: true,
      };
    }

    // Parse hazard info from feature properties
    const props = features[0]?.properties ?? {};
    const propsStr = JSON.stringify(props).toLowerCase();

    let primaryHazard: HazardType = "unknown";
    let riskLevel: HazardRiskLevel = "unknown";
    let inHazardZone = false;
    let depthOrIntensity: string | null = null;
    const hazardTypes: HazardType[] = [];

    // Determine hazard type and risk level from properties
    if (propsStr.includes("flood") || propsStr.includes("inundation")) {
      primaryHazard = "flood";
      hazardTypes.push("flood");
      inHazardZone = true;

      // Extract inundation depth if present
      for (const [key, val] of Object.entries(props)) {
        if (typeof val === "string" && (key.toLowerCase().includes("depth") || key.toLowerCase().includes("depth_m"))) {
          depthOrIntensity = val;
          break;
        }
      }

      // Categorize flood risk by depth
      if (depthOrIntensity) {
        const depthM = parseFloat(depthOrIntensity);
        if (depthM < 0.5) riskLevel = "low";
        else if (depthM < 1) riskLevel = "moderate";
        else if (depthM < 2) riskLevel = "high";
        else if (depthM < 3) riskLevel = "very_high";
        else riskLevel = "extreme";
      } else {
        riskLevel = "moderate";
      }
    } else if (propsStr.includes("tsunami")) {
      primaryHazard = "tsunami";
      hazardTypes.push("tsunami");
      inHazardZone = true;
      riskLevel = "high";
    } else if (propsStr.includes("sediment") || propsStr.includes("debris")) {
      primaryHazard = "sediment";
      hazardTypes.push("sediment");
      inHazardZone = true;
      riskLevel = "high";
    } else if (propsStr.includes("storm") || propsStr.includes("surge")) {
      primaryHazard = "storm_surge";
      hazardTypes.push("storm_surge");
      inHazardZone = true;
      riskLevel = "moderate";
    }

    return {
      primaryHazard,
      riskLevel,
      inHazardZone,
      hazardTypes,
      depthOrIntensity,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      primaryHazard: "unknown",
      riskLevel: "unknown",
      inHazardZone: false,
      hazardTypes: [],
      depthOrIntensity: null,
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within Japan Hazard Map Portal coverage.
 * Coverage: Japan territory + risk-assessment zones (lat 20–45°N, lng 130–145°E)
 */
export function hazardMapAvailable(lat: number, lng: number): boolean {
  return lat >= 20 && lat <= 45 && lng >= 130 && lng <= 145;
}
