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

async function getFemaFloodZone(lat: number, lng: number): Promise<FloodZoneResult | null> {
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

    const attributes = await Promise.any(
      queries.map(async (query) => {
        const payload = await queryFloodEndpoint(query);
        const featureAttributes = payload?.features?.[0]?.attributes;
        if (!featureAttributes?.FLD_ZONE) throw new Error("No flood zone found.");
        return featureAttributes;
      }),
    ).catch(() => null);

    if (attributes?.FLD_ZONE) {
      const floodZone = attributes.FLD_ZONE.trim();
      const subtype =
        attributes.FLD_ZONE_SUBTY?.trim() ?? attributes.ZONE_SUBTY?.trim() ?? null;
      const isSpecialFloodHazard = attributes.SFHA_TF?.trim().toUpperCase() === "T";
      return {
        floodZone,
        isSpecialFloodHazard,
        label: describeFloodZone(floodZone, subtype, isSpecialFloodHazard),
        source: "fema",
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GloFAS (Global Flood Awareness System) via Open-Meteo — global fallback
// Free, no API key, ~10 km resolution, 7-day ensemble forecast
// ---------------------------------------------------------------------------

type GloFASResponse = {
  daily?: { river_discharge?: (number | null)[] };
};

function classifyDischarge(cms: number): string {
  if (cms > 2000) return "Major";
  if (cms > 500) return "Significant";
  if (cms > 50) return "Moderate";
  return "Low";
}

async function getGloFASContext(lat: number, lng: number): Promise<FloodZoneResult | null> {
  try {
    const url = new URL("https://flood-api.open-meteo.com/v1/flood");
    url.searchParams.set("latitude", lat.toFixed(4));
    url.searchParams.set("longitude", lng.toFixed(4));
    url.searchParams.set("daily", "river_discharge");
    url.searchParams.set("forecast_days", "7");

    const response = await fetchWithTimeout(
      url.toString(),
      { next: { revalidate: 60 * 60 * 6 } },
      EXTERNAL_TIMEOUTS.standard,
    );
    if (!response.ok) return null;

    const data = (await response.json()) as GloFASResponse;
    const values = data.daily?.river_discharge?.filter((v): v is number => v !== null) ?? [];
    if (values.length === 0) return null;

    const peak = Math.max(...values);
    const riskLabel = classifyDischarge(peak);

    return {
      floodZone: "GloFAS",
      isSpecialFloodHazard: false,
      label: `${riskLabel} river discharge — ${peak.toFixed(0)} m³/s peak (7-day forecast)`,
      source: "glofas",
      peakDischargeCms: peak,
      dischargeRiskLabel: riskLabel,
    };
  } catch {
    return null;
  }
}

export async function getFloodZone(
  lat: number,
  lng: number,
): Promise<FloodZoneResult | null> {
  // FEMA silently returns null outside US coverage — GloFAS provides global fallback
  const fema = await getFemaFloodZone(lat, lng);
  if (fema) return fema;
  return getGloFASContext(lat, lng);
}
