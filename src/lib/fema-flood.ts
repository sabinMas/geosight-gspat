import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { FloodZoneResult } from "@/types";

const FEMA_FLOOD_ENDPOINTS = [
  "https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query",
  "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query",
] as const;

type FemaAttributes = {
  FLD_ZONE?: string | null;
  FLD_ZONE_SUBTY?: string | null;
  ZONE_SUBTY?: string | null;
  SFHA_TF?: string | null;
};

type FemaFeature = {
  attributes?: FemaAttributes;
};

type FemaResponse = {
  features?: FemaFeature[];
};

function describeFloodZone(
  floodZone: string,
  subtype: string | null,
  isSpecialFloodHazard: boolean,
) {
  if (floodZone === "X") {
    return subtype
      ? `Zone X - ${subtype.toLowerCase()}`
      : "Zone X - area of minimal flood hazard";
  }

  if (isSpecialFloodHazard) {
    return subtype
      ? `Zone ${floodZone} Special Flood Hazard Area - ${subtype.toLowerCase()}`
      : `Zone ${floodZone} Special Flood Hazard Area`;
  }

  return subtype ? `Zone ${floodZone} - ${subtype.toLowerCase()}` : `Zone ${floodZone}`;
}

async function queryFloodEndpoint(url: string) {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as FemaResponse;
  } catch {
    return null;
  }
}

export async function getFloodZone(
  lat: number,
  lng: number,
): Promise<FloodZoneResult | null> {
  try {
    const queries = FEMA_FLOOD_ENDPOINTS.map((endpoint) => {
      const url = new URL(endpoint);
      url.searchParams.set("geometry", `${lng},${lat}`);
      url.searchParams.set("geometryType", "esriGeometryPoint");
      url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
      url.searchParams.set("outFields", "FLD_ZONE,FLD_ZONE_SUBTY,ZONE_SUBTY,SFHA_TF");
      url.searchParams.set("returnGeometry", "false");
      url.searchParams.set("f", "json");
      return url.toString();
    });

    for (const query of queries) {
      const payload = await queryFloodEndpoint(query);
      const attributes = payload?.features?.[0]?.attributes;

      if (!attributes?.FLD_ZONE) {
        continue;
      }

      const floodZone = attributes.FLD_ZONE.trim();
      const subtype =
        attributes.FLD_ZONE_SUBTY?.trim() ??
        attributes.ZONE_SUBTY?.trim() ??
        null;
      const isSpecialFloodHazard = attributes.SFHA_TF?.trim().toUpperCase() === "T";

      return {
        floodZone,
        isSpecialFloodHazard,
        label: describeFloodZone(floodZone, subtype, isSpecialFloodHazard),
      };
    }

    return null;
  } catch {
    return null;
  }
}
