import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { BroadbandResult } from "@/types";

const FCC_BROADBAND_ENDPOINT =
  "https://broadbandmap.fcc.gov/api/public/map/listAvailability";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNestedValue(record: JsonRecord, keys: string[]) {
  return keys
    .map((key) => record[key])
    .find((value) => value !== undefined && value !== null);
}

function normalizeTechnology(value: unknown) {
  const label = asString(value)?.toLowerCase() ?? "";
  const code = asNumber(value);

  if (label.includes("fiber") || code === 50) {
    return "fiber";
  }
  if (label.includes("cable") || code === 40) {
    return "cable";
  }
  if (label.includes("dsl") || code === 10 || code === 20) {
    return "dsl";
  }
  if (
    label.includes("fixed wireless") ||
    (label.includes("wireless") && !label.includes("mobile")) ||
    code === 60 ||
    code === 61 ||
    code === 70
  ) {
    return "fixed_wireless";
  }

  return "other";
}

function getDownloadSpeed(record: JsonRecord) {
  return asNumber(
    getNestedValue(record, [
      "maxDownloadSpeed",
      "maxDownloadMbps",
      "max_download_speed",
      "max_download_mbps",
      "maxDownload",
      "max_download",
      "downloadSpeed",
      "download_speed",
      "downstreamSpeed",
      "maxAdvertisedDownloadSpeed",
      "max_advertised_download_speed",
    ]),
  );
}

function getUploadSpeed(record: JsonRecord) {
  return asNumber(
    getNestedValue(record, [
      "maxUploadSpeed",
      "maxUploadMbps",
      "max_upload_speed",
      "max_upload_mbps",
      "maxUpload",
      "max_upload",
      "uploadSpeed",
      "upload_speed",
      "upstreamSpeed",
      "maxAdvertisedUploadSpeed",
      "max_advertised_upload_speed",
    ]),
  );
}

function getTechnology(record: JsonRecord) {
  return normalizeTechnology(
    getNestedValue(record, [
      "technology",
      "technologyCode",
      "technology_code",
      "technologyType",
      "technology_type",
      "technologyName",
      "technology_name",
      "techCode",
      "techLabel",
    ]),
  );
}

function getProviderName(record: JsonRecord) {
  return (
    asString(
      getNestedValue(record, [
        "providerName",
        "provider_name",
        "provider",
        "brandName",
        "brand_name",
        "holdingCompanyName",
        "holding_company_name",
        "dbaname",
      ]),
    ) ?? "unknown-provider"
  );
}

function collectAvailabilityRows(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectAvailabilityRows(item));
  }

  if (!isRecord(value)) {
    return [];
  }

  const nestedRecords = [
    "data",
    "results",
    "availability",
    "providers",
    "rows",
    "service",
    "services",
    "result",
  ].flatMap((key) => collectAvailabilityRows(value[key]));

  const looksLikeAvailabilityRecord =
    getDownloadSpeed(value) !== null ||
    getUploadSpeed(value) !== null ||
    asString(
      getNestedValue(value, [
        "technology",
        "technologyCode",
        "technologyType",
        "technologyName",
      ]),
    ) !== null;

  return looksLikeAvailabilityRecord ? [value, ...nestedRecords] : nestedRecords;
}

async function requestAvailability(lat: number, lng: number) {
  const attempts: Array<{
    url: string;
    init: RequestInit;
  }> = [
    {
      url: FCC_BROADBAND_ENDPOINT,
      init: {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          unit: "Mbps",
        }),
        next: { revalidate: 60 * 60 * 24 },
      },
    },
    {
      url: `${FCC_BROADBAND_ENDPOINT}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
      init: {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 60 * 60 * 24 },
      },
    },
  ];

  for (const attempt of attempts) {
    try {
      const response = await fetchWithTimeout(
        attempt.url,
        attempt.init,
        EXTERNAL_TIMEOUTS.standard,
      );

      if (!response.ok) {
        continue;
      }

      return (await response.json()) as unknown;
    } catch {
      continue;
    }
  }

  return null;
}

export async function getFCCBroadband(
  lat: number,
  lng: number,
): Promise<BroadbandResult | null> {
  try {
    const payload = await requestAvailability(lat, lng);
    if (!payload) {
      return null;
    }

    const rows = collectAvailabilityRows(payload);
    const normalizedRows = rows.map((row) => ({
      providerName: getProviderName(row),
      technology: getTechnology(row),
      downloadSpeed: getDownloadSpeed(row) ?? 0,
      uploadSpeed: getUploadSpeed(row) ?? 0,
    }));
    const providerCount = new Set(
      normalizedRows.map((row) => row.providerName.toLowerCase()),
    ).size;
    const technologies = Array.from(
      new Set(
        normalizedRows
          .map((row) => row.technology)
          .filter((technology) => technology !== "other"),
      ),
    );
    const maxDownloadSpeed = normalizedRows.reduce((max, row) => {
      return Math.max(max, row.downloadSpeed);
    }, 0);
    const maxUploadSpeed = normalizedRows.reduce((max, row) => {
      return Math.max(max, row.uploadSpeed);
    }, 0);

    return {
      maxDownloadSpeed,
      maxUploadSpeed,
      providerCount,
      technologies,
      hasFiber: technologies.includes("fiber"),
    };
  } catch {
    return null;
  }
}
