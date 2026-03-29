/**
 * Query the FCC Broadband Map availability endpoint around a point and summarize
 * the highest advertised download/upload speeds, provider count, and major
 * fixed-broadband technologies.
 */
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import {
  BroadbandProviderAvailability,
  BroadbandResult,
  BroadbandTechnologyType,
  Coordinates,
} from "@/types";

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
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
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

function normalizeTechnology(value: unknown): BroadbandTechnologyType {
  const label = asString(value)?.toLowerCase() ?? "";
  const numericCode = asNumber(value);

  if (label.includes("fiber") || numericCode === 50) {
    return "fiber";
  }

  if (label.includes("cable") || numericCode === 40) {
    return "cable";
  }

  if (label.includes("dsl") || numericCode === 10 || numericCode === 20) {
    return "dsl";
  }

  if (
    label.includes("fixed wireless") ||
    (label.includes("wireless") && !label.includes("mobile")) ||
    numericCode === 60 ||
    numericCode === 61 ||
    numericCode === 70
  ) {
    return "fixed_wireless";
  }

  return "other";
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
    ) ?? "Unnamed provider"
  );
}

function getMaxDownloadMbps(record: JsonRecord) {
  return asNumber(
    getNestedValue(record, [
      "maxDownloadMbps",
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

function getMaxUploadMbps(record: JsonRecord) {
  return asNumber(
    getNestedValue(record, [
      "maxUploadMbps",
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

function collectCandidateRecords(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectCandidateRecords(item));
  }

  if (!isRecord(value)) {
    return [];
  }

  const nestedKeys = [
    "data",
    "results",
    "availability",
    "providers",
    "rows",
    "service",
    "services",
    "result",
  ];

  const nestedRecords = nestedKeys.flatMap((key) => collectCandidateRecords(value[key]));
  const looksLikeAvailabilityRecord =
    getMaxDownloadMbps(value) !== null ||
    getMaxUploadMbps(value) !== null ||
    asString(getNestedValue(value, ["technology", "technologyName", "technologyType"])) !== null ||
    asString(getNestedValue(value, ["providerName", "provider", "brandName"])) !== null;

  return looksLikeAvailabilityRecord ? [value, ...nestedRecords] : nestedRecords;
}

function dedupeProviders(providers: BroadbandProviderAvailability[]) {
  const seen = new Set<string>();

  return providers.filter((provider) => {
    const key = [
      provider.providerName.toLowerCase(),
      provider.technology,
      provider.maxDownloadMbps ?? "na",
      provider.maxUploadMbps ?? "na",
    ].join(":");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function requestAvailability(
  coords: Coordinates,
): Promise<{ payload: unknown | null; note: string | null }> {
  const attempts: Array<{
    url: string;
    init?: RequestInit;
  }> = [
    {
      url: `${FCC_BROADBAND_ENDPOINT}?lat=${coords.lat}&lon=${coords.lng}`,
      init: { next: { revalidate: 60 * 60 * 24 } },
    },
    {
      url: FCC_BROADBAND_ENDPOINT,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: coords.lat, lon: coords.lng }),
        next: { revalidate: 60 * 60 * 24 },
      },
    },
    {
      url: FCC_BROADBAND_ENDPOINT,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `lat=${encodeURIComponent(coords.lat)}&lon=${encodeURIComponent(coords.lng)}`,
        next: { revalidate: 60 * 60 * 24 },
      },
    },
  ];

  let lastNote: string | null = null;

  for (const attempt of attempts) {
    try {
      const response = await fetchWithTimeout(
        attempt.url,
        {
          ...attempt.init,
          headers: {
            Accept: "application/json",
            ...(attempt.init?.headers ?? {}),
          },
        },
        EXTERNAL_TIMEOUTS.standard,
      );

      if (!response.ok) {
        lastNote = `FCC Broadband Map returned ${response.status} ${response.statusText}.`;
        continue;
      }

      return {
        payload: (await response.json()) as unknown,
        note: lastNote,
      };
    } catch (error) {
      lastNote = error instanceof Error ? error.message : "FCC Broadband Map request failed.";
    }
  }

  return { payload: null, note: lastNote };
}

export async function getBroadbandAvailability(
  coords: Coordinates,
): Promise<BroadbandResult | null> {
  try {
    const { payload, note } = await requestAvailability(coords);
    if (!payload) {
      return {
        maxDownloadMbps: null,
        maxUploadMbps: null,
        providerCount: 0,
        technologies: [],
        providers: [],
        available: false,
        error: true,
        note: note ?? "FCC Broadband Map did not return availability records for this point.",
      };
    }

    const providers = dedupeProviders(
      collectCandidateRecords(payload).map((record) => ({
        providerName: getProviderName(record),
        technology: getTechnology(record),
        maxDownloadMbps: getMaxDownloadMbps(record),
        maxUploadMbps: getMaxUploadMbps(record),
      })),
    ).filter(
      (provider) =>
        provider.maxDownloadMbps !== null ||
        provider.maxUploadMbps !== null ||
        provider.technology !== "other",
    );

    if (!providers.length) {
      return {
        maxDownloadMbps: null,
        maxUploadMbps: null,
        providerCount: 0,
        technologies: [],
        providers: [],
        available: false,
        error: false,
        note:
          note ??
          "FCC Broadband Map returned no fixed-broadband availability records for this point.",
      };
    }

    const maxDownloadMbps = providers.reduce<number | null>((current, provider) => {
      if (provider.maxDownloadMbps === null) {
        return current;
      }

      return current === null
        ? provider.maxDownloadMbps
        : Math.max(current, provider.maxDownloadMbps);
    }, null);
    const maxUploadMbps = providers.reduce<number | null>((current, provider) => {
      if (provider.maxUploadMbps === null) {
        return current;
      }

      return current === null
        ? provider.maxUploadMbps
        : Math.max(current, provider.maxUploadMbps);
    }, null);
    const technologies = Array.from(
      new Set(
        providers
          .map((provider) => provider.technology)
          .filter((technology) => technology !== "other"),
      ),
    );

    return {
      maxDownloadMbps,
      maxUploadMbps,
      providerCount: providers.length,
      technologies,
      providers,
      available: true,
      error: false,
      note,
    };
  } catch {
    return null;
  }
}
