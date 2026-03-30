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

export async function getSoilProfile(coords: Coordinates): Promise<SoilProfile> {
  if (!isUsCoordinate(coords)) {
    return NULL_SOIL_PROFILE;
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
