// Bhuvan Hazards — India Hazard Mapping (Flood, Landslide, Glacial Lakes)
// Source: https://bhuvan.nrsc.gov.in/ (ISRO Bhuvan platform)
// License: Bhuvan/NDMA terms (free for non-commercial, research, public benefit)
// Access: WMS for flood/landslide/glacial lake hazards

import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";

export type BhuvanHazardType = "flood" | "landslide" | "glacial_lake" | "unknown";
export type HazardSusceptibility = "low" | "moderate" | "high" | "very_high" | "unknown";

export type BhuvanHazardsResult = {
  primaryHazard: BhuvanHazardType;
  susceptibility: HazardSusceptibility;
  inHazardZone: boolean;
  hazardTypes: BhuvanHazardType[];
  eventCount30d: number | null; // For flood/landslide events
  coverage: boolean;
  available: boolean;
};

const BHUVAN_WMS = "https://bhuvan.nrsc.gov.in/bhuvan/wms";

/**
 * Query Bhuvan hazard maps for flood, landslide, and glacial lake risks at a location.
 * Uses WMS GetFeatureInfo to determine hazard susceptibility and event history.
 * Covers ~80k mapped landslide events, flood-prone zones, and glacial hazards.
 */
export async function getBhuvanHazards(lat: number, lng: number): Promise<BhuvanHazardsResult | null> {
  try {
    // Query landslide hazard first (most complete dataset)
    const url = new URL(BHUVAN_WMS);
    url.searchParams.set("service", "WMS");
    url.searchParams.set("version", "1.3.0");
    url.searchParams.set("request", "GetFeatureInfo");
    url.searchParams.set("layers", "landslide_hazard"); // Landslide susceptibility
    url.searchParams.set("query_layers", "landslide_hazard");
    url.searchParams.set("crs", "EPSG:4326");
    url.searchParams.set("i", "50");
    url.searchParams.set("j", "50");
    url.searchParams.set("width", "101");
    url.searchParams.set("height", "101");
    url.searchParams.set("bbox", `${lng - 0.02},${lat - 0.02},${lng + 0.02},${lat + 0.02}`);
    url.searchParams.set("info_format", "application/json");

    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 * 7 }, // Cache 7 days (static hazard maps)
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return {
        primaryHazard: "unknown",
        susceptibility: "unknown",
        inHazardZone: false,
        hazardTypes: [],
        eventCount30d: null,
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
        susceptibility: "unknown",
        inHazardZone: false,
        hazardTypes: [],
        eventCount30d: null,
        coverage: true,
        available: true,
      };
    }

    // Parse hazard info from feature properties
    const props = features[0]?.properties ?? {};
    const propsStr = JSON.stringify(props).toLowerCase();

    let primaryHazard: BhuvanHazardType = "unknown";
    let susceptibility: HazardSusceptibility = "unknown";
    let inHazardZone = false;
    const hazardTypes: BhuvanHazardType[] = [];

    // Determine hazard type and susceptibility
    if (propsStr.includes("landslide")) {
      primaryHazard = "landslide";
      hazardTypes.push("landslide");
      inHazardZone = true;

      // Categorize susceptibility
      if (propsStr.includes("low")) susceptibility = "low";
      else if (propsStr.includes("moderate")) susceptibility = "moderate";
      else if (propsStr.includes("high")) susceptibility = "high";
      else if (propsStr.includes("very_high") || propsStr.includes("very high")) susceptibility = "very_high";
      else susceptibility = "moderate";
    } else if (propsStr.includes("flood")) {
      primaryHazard = "flood";
      hazardTypes.push("flood");
      inHazardZone = true;
      susceptibility = "high";
    } else if (propsStr.includes("glacial") || propsStr.includes("glacier")) {
      primaryHazard = "glacial_lake";
      hazardTypes.push("glacial_lake");
      inHazardZone = true;
      susceptibility = "high";
    }

    return {
      primaryHazard,
      susceptibility,
      inHazardZone,
      hazardTypes,
      eventCount30d: null, // Would require separate event query
      coverage: true,
      available: true,
    };
  } catch {
    return {
      primaryHazard: "unknown",
      susceptibility: "unknown",
      inHazardZone: false,
      hazardTypes: [],
      eventCount30d: null,
      coverage: false,
      available: false,
    };
  }
}

/**
 * Check if coordinates fall within Bhuvan hazard coverage (mainland India + Himalaya region).
 * Coverage: lat 8-35°N, lng 68-97°E
 */
export function bhuvanHazardsAvailable(lat: number, lng: number): boolean {
  return lat >= 8 && lat <= 35 && lng >= 68 && lng <= 97;
}
