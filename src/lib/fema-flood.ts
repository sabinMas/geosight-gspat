/**
 * Query FEMA's National Flood Hazard Layer for the flood-zone designation at or
 * immediately around a point, returning the mapped zone code, SFHA flag, and a
 * human-readable label.
 */
import { toBoundingBox } from "@/lib/geospatial";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { FloodZoneResult } from "@/types";

const FEMA_NFHL_ENDPOINT =
  "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query";

type FemaFeature = {
  attributes?: {
    FLD_ZONE?: string | null;
    ZONE_SUBTY?: string | null;
    SFHA_TF?: string | null;
  };
};

type FemaResponse = {
  features?: FemaFeature[];
};

function describeFloodZone(
  zoneCode: string | null,
  zoneSubtype: string | null,
  isSpecialFloodHazardArea: boolean | null,
) {
  if (!zoneCode) {
    return "Flood zone unavailable";
  }

  if (zoneCode === "X") {
    return zoneSubtype
      ? `Zone X - ${zoneSubtype.toLowerCase()}`
      : "Zone X - minimal flood hazard";
  }

  if (isSpecialFloodHazardArea) {
    return zoneSubtype
      ? `Zone ${zoneCode} SFHA - ${zoneSubtype.toLowerCase()}`
      : `Zone ${zoneCode} Special Flood Hazard Area`;
  }

  return zoneSubtype ? `Zone ${zoneCode} - ${zoneSubtype.toLowerCase()}` : `Zone ${zoneCode}`;
}

async function runFemaQuery(url: string) {
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
}

export async function getFloodZone(
  lat: number,
  lng: number,
  radiusKm = 1,
): Promise<FloodZoneResult | null> {
  try {
    const pointQuery = new URL(FEMA_NFHL_ENDPOINT);
    pointQuery.searchParams.set("geometry", `${lng},${lat}`);
    pointQuery.searchParams.set("geometryType", "esriGeometryPoint");
    pointQuery.searchParams.set("inSR", "4326");
    pointQuery.searchParams.set("spatialRel", "esriSpatialRelIntersects");
    pointQuery.searchParams.set("outFields", "FLD_ZONE,ZONE_SUBTY,SFHA_TF");
    pointQuery.searchParams.set("returnGeometry", "false");
    pointQuery.searchParams.set("f", "json");

    let payload = await runFemaQuery(pointQuery.toString());

    if (!payload?.features?.length && radiusKm > 0) {
      const bbox = toBoundingBox({ lat, lng }, radiusKm);
      const envelopeQuery = new URL(FEMA_NFHL_ENDPOINT);
      envelopeQuery.searchParams.set(
        "geometry",
        `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
      );
      envelopeQuery.searchParams.set("geometryType", "esriGeometryEnvelope");
      envelopeQuery.searchParams.set("inSR", "4326");
      envelopeQuery.searchParams.set("spatialRel", "esriSpatialRelIntersects");
      envelopeQuery.searchParams.set("outFields", "FLD_ZONE,ZONE_SUBTY,SFHA_TF");
      envelopeQuery.searchParams.set("returnGeometry", "false");
      envelopeQuery.searchParams.set("resultRecordCount", "1");
      envelopeQuery.searchParams.set("f", "json");
      payload = await runFemaQuery(envelopeQuery.toString());
    }

    const attributes = payload?.features?.[0]?.attributes;
    if (!attributes) {
      return null;
    }

    const zoneCode = attributes.FLD_ZONE?.trim() || null;
    const zoneSubtype = attributes.ZONE_SUBTY?.trim() || null;
    const isSpecialFloodHazardArea =
      typeof attributes.SFHA_TF === "string"
        ? attributes.SFHA_TF.toUpperCase() === "T"
        : null;

    return {
      zoneCode,
      zoneSubtype,
      isSpecialFloodHazardArea,
      label: describeFloodZone(zoneCode, zoneSubtype, isSpecialFloodHazardArea),
    };
  } catch {
    return null;
  }
}
