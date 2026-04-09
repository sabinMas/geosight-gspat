import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { Coordinates } from "@/types";

export interface SoilProfile {
  mapUnitName: string | null;
  drainageClass: string | null;
  hydrologicGroup: string | null;
  depthToWaterTableCm: number | null;
  depthToBedrockCm: number | null;
  dominantTexture: string | null;
  kFactor: number | null;
  availableWaterStorageCm: number | null;
}

const SDA_ENDPOINT = "https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest";
const NULL_SOIL_PROFILE: SoilProfile = {
  mapUnitName: null,
  drainageClass: null,
  hydrologicGroup: null,
  depthToWaterTableCm: null,
  depthToBedrockCm: null,
  dominantTexture: null,
  kFactor: null,
  availableWaterStorageCm: null,
};

type SoilProfileResponse = {
  Table?: Array<Record<string, unknown> | unknown[]>;
};

function isUsCoordinate({ lat, lng }: Coordinates) {
  return lat >= 18 && lat <= 72 && lng >= -180 && lng <= -64;
}

function parseNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseNullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildQuery({ lat, lng }: Coordinates) {
  return `
SELECT TOP 1
  mu.muname AS mapUnitName,
  c.drclassdcd AS drainageClass,
  c.hydgrpdcd AS hydrologicGroup,
  c.wtdepannmin AS depthToWaterTableCm,
  c.brockdepmin AS depthToBedrockCm,
  hz.texturerv AS dominantTexture,
  hz.kffact AS kFactor,
  c.aws050wta AS availableWaterStorageCm
FROM sacatalog sc
INNER JOIN legend l ON sc.areasymbol = l.areasymbol
INNER JOIN mapunit mu ON l.lkey = mu.lkey
INNER JOIN muaggatt c ON mu.mukey = c.mukey
OUTER APPLY (
  SELECT TOP 1 ch.texturerv, ch.kffact
  FROM component co
  INNER JOIN chorizon ch ON co.cokey = ch.cokey
  WHERE co.mukey = mu.mukey
  ORDER BY co.comppct_r DESC, ch.hzdept_r ASC
) hz
WHERE mu.mukey IN (
  SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('POINT(${lng} ${lat})')
)`.trim();
}

function rowArrayToObject(table: unknown[][]) {
  const [headers, values] = table;
  if (!Array.isArray(headers) || !Array.isArray(values)) {
    return null;
  }

  return headers.reduce<Record<string, unknown>>((acc, header, index) => {
    if (typeof header === "string" && header.trim().length > 0) {
      acc[header] = values[index] ?? null;
    }

    return acc;
  }, {});
}

function normalizeRow(table: SoilProfileResponse["Table"]) {
  if (!Array.isArray(table) || table.length === 0) {
    return null;
  }

  const firstRow = table[0];
  if (firstRow && !Array.isArray(firstRow) && typeof firstRow === "object") {
    return firstRow as Record<string, unknown>;
  }

  if (table.length >= 2 && Array.isArray(table[0]) && Array.isArray(table[1])) {
    return rowArrayToObject(table as unknown[][]);
  }

  return null;
}

// ---------------------------------------------------------------------------
// SoilGrids (ISRIC) — global fallback for non-US coordinates
// REST API: https://rest.isric.org/soilgrids/v2.0/
// ---------------------------------------------------------------------------

const SOILGRIDS_BASE = "https://rest.isric.org/soilgrids/v2.0";

type SoilGridsLayer = {
  name: string;
  depths: Array<{ label: string; values: { mean: number | null } }>;
};

type SoilGridsResponse = {
  properties?: { layers?: SoilGridsLayer[] };
};

type SoilGridsClassResponse = {
  wrb_class_name?: string | null;
};

/** Returns mean value at 0-30 cm (average of 0-5, 5-15, 15-30 depths), divided by d_factor. */
function soilGridsMean(layers: SoilGridsLayer[], name: string, dFactor: number): number | null {
  const layer = layers.find((l) => l.name === name);
  if (!layer) return null;
  const depthLabels = ["0-5cm", "5-15cm", "15-30cm"];
  const vals = depthLabels
    .map((label) => layer.depths.find((d) => d.label === label)?.values.mean ?? null)
    .filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length / dFactor;
}

/** USDA texture triangle — approximate classification from clay/silt/sand %. */
function classifyTexture(clay: number, silt: number, sand: number): string {
  if (clay >= 40) return "Clay";
  if (clay >= 27 && silt >= 28 && silt < 40 && sand <= 45) return "Clay loam";
  if (clay >= 27 && sand > 45) return "Sandy clay";
  if (clay >= 40 && silt >= 40) return "Silty clay";
  if (clay >= 27 && silt >= 40) return "Silty clay loam";
  if (sand >= 85 && clay < 10) return "Sand";
  if (sand >= 70 && silt < 30 && clay < 15) return "Loamy sand";
  if (sand >= 43 && clay < 20 && silt < 50) return "Sandy loam";
  if (silt >= 80 && clay < 12) return "Silt";
  if (silt >= 50 && clay < 27) return "Silt loam";
  return "Loam";
}

/** Approximate drainage class from clay content (coarse proxy). */
function classifyDrainage(clay: number): string {
  if (clay < 20) return "Well drained";
  if (clay < 35) return "Moderately well drained";
  if (clay < 50) return "Somewhat poorly drained";
  return "Poorly drained";
}

/** Approximate USDA hydrologic group from clay content. */
function classifyHydrologicGroup(clay: number): string {
  if (clay < 15) return "A";
  if (clay < 35) return "B";
  if (clay < 45) return "C";
  return "D";
}

async function getSoilGridsProfile(coords: Coordinates): Promise<SoilProfile> {
  const { lat, lng } = coords;
  const propsUrl = `${SOILGRIDS_BASE}/properties/query?lon=${lng.toFixed(4)}&lat=${lat.toFixed(4)}&property=clay,silt,sand&depth=0-5cm,5-15cm,15-30cm&value=mean`;
  const classUrl = `${SOILGRIDS_BASE}/classification/query?lon=${lng.toFixed(4)}&lat=${lat.toFixed(4)}`;

  const [propsRes, classRes] = await Promise.allSettled([
    fetchWithTimeout(propsUrl, { next: { revalidate: 60 * 60 * 24 * 7 } }, EXTERNAL_TIMEOUTS.standard),
    fetchWithTimeout(classUrl, { next: { revalidate: 60 * 60 * 24 * 7 } }, EXTERNAL_TIMEOUTS.standard),
  ]);

  if (propsRes.status === "rejected" || !propsRes.value.ok) return NULL_SOIL_PROFILE;

  const propsJson = (await propsRes.value.json()) as SoilGridsResponse;
  const layers = propsJson.properties?.layers ?? [];

  // clay/silt/sand values are in g/kg (d_factor=10) → divide by 10 to get %
  const clay = soilGridsMean(layers, "clay", 10);
  const silt = soilGridsMean(layers, "silt", 10);
  const sand = soilGridsMean(layers, "sand", 10);

  if (clay === null || silt === null || sand === null) return NULL_SOIL_PROFILE;

  let wrbName: string | null = null;
  if (classRes.status === "fulfilled" && classRes.value.ok) {
    const classJson = (await classRes.value.json()) as SoilGridsClassResponse;
    wrbName = classJson.wrb_class_name ?? null;
  }

  return {
    mapUnitName: wrbName,
    drainageClass: classifyDrainage(clay),
    hydrologicGroup: classifyHydrologicGroup(clay),
    depthToWaterTableCm: null,
    depthToBedrockCm: null,
    dominantTexture: classifyTexture(clay, silt, sand),
    kFactor: null,
    availableWaterStorageCm: null,
  };
}

export async function getSoilProfile(coords: Coordinates): Promise<SoilProfile> {
  if (!isUsCoordinate(coords)) {
    return getSoilGridsProfile(coords);
  }

  try {
    const response = await fetchWithTimeout(
      SDA_ENDPOINT,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: buildQuery(coords),
          format: "JSON",
        }),
        next: { revalidate: 60 * 60 * 24 },
      },
      EXTERNAL_TIMEOUTS.standard,
    );

    if (!response.ok) {
      return NULL_SOIL_PROFILE;
    }

    const payload = (await response.json()) as SoilProfileResponse;
    const row = normalizeRow(payload.Table);

    if (!row) {
      return NULL_SOIL_PROFILE;
    }

    return {
      mapUnitName: parseNullableString(row.mapUnitName),
      drainageClass: parseNullableString(row.drainageClass),
      hydrologicGroup: parseNullableString(row.hydrologicGroup),
      depthToWaterTableCm: parseNullableNumber(row.depthToWaterTableCm),
      depthToBedrockCm: parseNullableNumber(row.depthToBedrockCm),
      dominantTexture: parseNullableString(row.dominantTexture),
      kFactor: parseNullableNumber(row.kFactor),
      availableWaterStorageCm: parseNullableNumber(row.availableWaterStorageCm),
    };
  } catch {
    return NULL_SOIL_PROFILE;
  }
}
