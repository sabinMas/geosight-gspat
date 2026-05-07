// MapBiomas — Land Use/Land Cover Monitoring for South America
// Source: https://mapbiomas.org/
// License: Creative Commons (open data)
// Access: Annual LULC classification maps for entire South America

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type LulcClass =
  | "forest"
  | "grassland"
  | "cropland"
  | "urban"
  | "water"
  | "barren"
  | "savanna"
  | "herbaceous"
  | "other"
  | "unknown";

export type MapBiomasResult = {
  dominantClass: LulcClass;
  classPercentages: Record<string, number>;
  forestCoverPercent: number | null;
  urbanCoverPercent: number | null;
  grasslandPercent: number | null;
  croplandPercent: number | null;
  waterPercent: number | null;
  mapYear: number;
  coverage: boolean;
  available: boolean;
};

const MAPBIOMAS_API = "https://mapbiomas.org/api/lulc";

/**
 * Query MapBiomas land use/land cover classification for South America.
 * Returns LULC classes with coverage percentages for 1m resolution grid.
 * Annual updates; covers entire South American continent.
 */
export async function getMapBiomasLulc(lat: number, lng: number): Promise<MapBiomasResult | null> {
  try {
    const response = await fetchWithTimeout(
      `${MAPBIOMAS_API}?lat=${lat}&lng=${lng}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 * 365 }, // Cache 1 year (annual maps)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        dominantClass: "unknown",
        classPercentages: {},
        forestCoverPercent: null,
        urbanCoverPercent: null,
        grasslandPercent: null,
        croplandPercent: null,
        waterPercent: null,
        mapYear: 0,
        coverage: false,
        available: false,
      };
    }

    const data = (await response.json()) as {
      dominant_class?: string;
      forest_percent?: number;
      urban_percent?: number;
      grassland_percent?: number;
      cropland_percent?: number;
      water_percent?: number;
      class_percentages?: Record<string, number>;
      map_year?: number;
    };

    // Parse dominant class
    let dominantClass: LulcClass = "unknown";
    if (data.dominant_class) {
      const cls = data.dominant_class.toLowerCase();
      if (cls.includes("forest")) dominantClass = "forest";
      else if (cls.includes("grassland")) dominantClass = "grassland";
      else if (cls.includes("crop")) dominantClass = "cropland";
      else if (cls.includes("urban")) dominantClass = "urban";
      else if (cls.includes("water")) dominantClass = "water";
      else if (cls.includes("barren")) dominantClass = "barren";
      else if (cls.includes("savanna")) dominantClass = "savanna";
      else if (cls.includes("herbaceous")) dominantClass = "herbaceous";
    }

    return {
      dominantClass,
      classPercentages: data.class_percentages ?? {},
      forestCoverPercent: data.forest_percent ?? null,
      urbanCoverPercent: data.urban_percent ?? null,
      grasslandPercent: data.grassland_percent ?? null,
      croplandPercent: data.cropland_percent ?? null,
      waterPercent: data.water_percent ?? null,
      mapYear: data.map_year ?? 0,
      coverage: true,
      available: true,
    };
  } catch {
    return {
      dominantClass: "unknown",
      classPercentages: {},
      forestCoverPercent: null,
      urbanCoverPercent: null,
      grasslandPercent: null,
      croplandPercent: null,
      waterPercent: null,
      mapYear: 0,
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within MapBiomas coverage (entire South America).
 * Coverage: -56 to 13°N latitude, -82 to -30°W longitude (all South American continent)
 */
export function mapBiomasAvailable(lat: number, lng: number): boolean {
  return lat >= -56 && lat <= 13 && lng >= -82 && lng <= -30;
}
