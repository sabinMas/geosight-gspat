// Copernicus Land Monitoring Service (CLMS) — Land Cover Classification
// Source: Copernicus Land, Sentinel-based LULC
// License: Open access under CC4.0
// Access: Annual land cover maps (22-class LCCS), Sentinel satellite derived

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type LandCoverClass =
  | "tree_cover"
  | "herbaceous_cover"
  | "shrub_cover"
  | "cultivated_crops"
  | "urban_built_up"
  | "bare_soil"
  | "water"
  | "clouds"
  | "unknown";

export type CopernicusLandCoverResult = {
  dominantClass: LandCoverClass;
  classPercentages: Record<string, number>;
  forestCoverPercent: number | null;
  urbanCoverPercent: number | null;
  agriculturalCoverPercent: number | null;
  waterCoverPercent: number | null;
  mapYear: number;
  observationTime: string | null;
  coverage: boolean;
  available: boolean;
};

const COPERNICUS_LC_API = "https://clms-api.copernicus.eu/v1/land-cover";

export async function getCopernicusLandCover(lat: number, lng: number): Promise<CopernicusLandCoverResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${COPERNICUS_LC_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 24 * 365 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        dominantClass: "unknown",
        classPercentages: {},
        forestCoverPercent: null,
        urbanCoverPercent: null,
        agriculturalCoverPercent: null,
        waterCoverPercent: null,
        mapYear: new Date().getFullYear(),
        observationTime: null,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      dominant_class?: string;
      class_percentages?: Record<string, number>;
      forest_cover?: number;
      urban_cover?: number;
      agricultural_cover?: number;
      water_cover?: number;
      map_year?: number;
      time?: string;
    };

    const classMap: { [key: string]: LandCoverClass } = {
      tree_cover: "tree_cover",
      herbaceous_cover: "herbaceous_cover",
      shrub_cover: "shrub_cover",
      cultivated_crops: "cultivated_crops",
      urban_built_up: "urban_built_up",
      bare_soil: "bare_soil",
      water: "water",
      clouds: "clouds",
    };

    const dominantClass = classMap[data.dominant_class ?? "unknown"] ?? "unknown";

    return {
      dominantClass,
      classPercentages: data.class_percentages ?? {},
      forestCoverPercent: data.forest_cover ?? null,
      urbanCoverPercent: data.urban_cover ?? null,
      agriculturalCoverPercent: data.agricultural_cover ?? null,
      waterCoverPercent: data.water_cover ?? null,
      mapYear: data.map_year ?? new Date().getFullYear(),
      observationTime: data.time ?? null,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      dominantClass: "unknown",
      classPercentages: {},
      forestCoverPercent: null,
      urbanCoverPercent: null,
      agriculturalCoverPercent: null,
      waterCoverPercent: null,
      mapYear: new Date().getFullYear(),
      observationTime: null,
      coverage: false,
      available: false,
    };
  }
}

export function copernicusLandCoverAvailable(lat: number, lng: number): boolean {
  return lat >= 35 && lat <= 71 && lng >= -10 && lng <= 40;
}
