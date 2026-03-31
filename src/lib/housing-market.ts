import { gunzipSync } from "node:zlib";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { buildRegistryAwareSourceMeta } from "@/lib/source-metadata";
import type { HousingMarketResult, HousingMarketSeriesPoint, SourceRegistryContext } from "@/types";

const REDFIN_COUNTY_MARKET_URL =
  "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/county_market_tracker.tsv000.gz";
const HOUSING_MARKET_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_SERIES_POINTS = 12;

type ParsedHousingRow = {
  region: string;
  stateCode: string;
  periodEnd: string;
  monthLabel: string;
  medianListPrice: number | null;
  medianDom: number | null;
  activeListings: number | null;
  saleToListRatio: number | null;
  inventoryYoY: number | null;
  lastUpdated: string | null;
};

type HousingMarketCache = {
  fetchedAt: number;
  counties: Map<string, ParsedHousingRow[]>;
};

let countyMarketCache: HousingMarketCache | null = null;
let countyMarketRequest: Promise<HousingMarketCache> | null = null;

function stripQuotes(value: string) {
  return value.replace(/^"+|"+$/g, "").trim();
}

function parseNumber(value: string) {
  const normalized = stripQuotes(value);
  if (!normalized || normalized === "NA") {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTsvLine(line: string) {
  return line.split("\t").map((part) => stripQuotes(part));
}

function buildCountyKey(region: string, stateCode: string) {
  return `${region.toLowerCase()}::${stateCode.toLowerCase()}`;
}

function buildMonthLabel(periodEnd: string) {
  const parsed = new Date(periodEnd);
  if (Number.isNaN(parsed.getTime())) {
    return periodEnd;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function formatListingUrl(locationLabel: string) {
  const slug = locationLabel
    .replace(/,/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return `https://www.zillow.com/homes/${encodeURIComponent(slug)}_rb/`;
}

async function loadCountyMarketCache() {
  if (
    countyMarketCache &&
    Date.now() - countyMarketCache.fetchedAt < HOUSING_MARKET_CACHE_TTL_MS
  ) {
    return countyMarketCache;
  }

  if (countyMarketRequest) {
    return countyMarketRequest;
  }

  countyMarketRequest = (async () => {
    const response = await fetchWithTimeout(REDFIN_COUNTY_MARKET_URL, {}, EXTERNAL_TIMEOUTS.standard);
    if (!response.ok) {
      throw new Error("GeoSight could not load live housing market data.");
    }

    const zipped = Buffer.from(await response.arrayBuffer());
    const tsv = gunzipSync(zipped).toString("utf8");
    const lines = tsv.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const headers = parseTsvLine(lines[0] ?? "");
    const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]));
    const counties = new Map<string, ParsedHousingRow[]>();

    for (const line of lines.slice(1)) {
      const columns = parseTsvLine(line);
      const propertyType = columns[headerIndex.PROPERTY_TYPE] ?? "";
      const regionType = columns[headerIndex.REGION_TYPE] ?? "";

      if (regionType !== "county" || propertyType !== "All Residential") {
        continue;
      }

      const region = columns[headerIndex.REGION] ?? "";
      const stateCode = columns[headerIndex.STATE_CODE] ?? "";
      if (!region || !stateCode) {
        continue;
      }

      const entry: ParsedHousingRow = {
        region,
        stateCode,
        periodEnd: columns[headerIndex.PERIOD_END] ?? "",
        monthLabel: buildMonthLabel(columns[headerIndex.PERIOD_END] ?? ""),
        medianListPrice: parseNumber(columns[headerIndex.MEDIAN_LIST_PRICE] ?? ""),
        medianDom: parseNumber(columns[headerIndex.MEDIAN_DOM] ?? ""),
        activeListings: parseNumber(columns[headerIndex.INVENTORY] ?? ""),
        saleToListRatio: parseNumber(columns[headerIndex.AVG_SALE_TO_LIST] ?? ""),
        inventoryYoY: parseNumber(columns[headerIndex.INVENTORY_YOY] ?? ""),
        lastUpdated: stripQuotes(columns[headerIndex.LAST_UPDATED] ?? "") || null,
      };

      const key = buildCountyKey(region, stateCode);
      const existing = counties.get(key) ?? [];
      existing.push(entry);
      counties.set(key, existing);
    }

    for (const rows of counties.values()) {
      rows.sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
    }

    countyMarketCache = {
      fetchedAt: Date.now(),
      counties,
    };

    return countyMarketCache;
  })();

  try {
    return await countyMarketRequest;
  } finally {
    countyMarketRequest = null;
  }
}

function buildSeries(rows: ParsedHousingRow[]): HousingMarketSeriesPoint[] {
  return rows
    .slice()
    .reverse()
    .map((row) => ({
      periodEnd: row.periodEnd,
      label: row.monthLabel,
      medianListPrice: row.medianListPrice,
      medianDom: row.medianDom,
      activeListings: row.activeListings,
    }));
}

export async function getHousingMarket(
  countyName: string | null | undefined,
  stateCode: string | null | undefined,
  locationLabel: string,
  registryContext: SourceRegistryContext,
): Promise<HousingMarketResult> {
  if (!countyName || !stateCode) {
    return {
      status: "unavailable",
      regionLabel: null,
      locationLabel,
      monthLabel: null,
      medianListPrice: null,
      medianDom: null,
      activeListings: null,
      saleToListRatio: null,
      inventoryYoY: null,
      marketUrl: formatListingUrl(locationLabel),
      notes: [
        "Housing Market Pulse currently uses US county-level Redfin market tracker data.",
        "GeoSight needs a resolved county and state before it can load a live residential market pulse.",
      ],
      source: buildRegistryAwareSourceMeta({
        id: "housing-market",
        label: "Housing market pulse",
        provider: "Redfin Data Center",
        domain: "housing",
        context: registryContext,
        status: "unavailable",
        accessType: "dataset",
        lastUpdated: null,
        freshness: "Monthly county-market tracker refresh",
        coverage: "United States county-level residential market data",
        confidence:
          "Housing market data is unavailable until GeoSight can resolve a supported US county.",
      }),
      series: [],
    };
  }

  const cache = await loadCountyMarketCache();
  const regionLabel = `${countyName}, ${stateCode}`;
  const rows =
    cache.counties.get(buildCountyKey(regionLabel, stateCode))?.slice(0, MAX_SERIES_POINTS) ?? [];
  const latest = rows[0] ?? null;

  if (!latest) {
    return {
      status: "limited",
      regionLabel,
      locationLabel,
      monthLabel: null,
      medianListPrice: null,
      medianDom: null,
      activeListings: null,
      saleToListRatio: null,
      inventoryYoY: null,
      marketUrl: formatListingUrl(locationLabel),
      notes: [
        "GeoSight could not find a current Redfin county market series for this county/state pair.",
        "This surface is US-first and reflects county-level residential market data rather than parcel-level listing feeds.",
      ],
      source: buildRegistryAwareSourceMeta({
        id: "housing-market",
        label: "Housing market pulse",
        provider: "Redfin Data Center",
        domain: "housing",
        context: registryContext,
        status: "limited",
        accessType: "dataset",
        lastUpdated: null,
        freshness: "Monthly county-market tracker refresh",
        coverage: "United States county-level residential market data",
        confidence:
          "No matching county market series was returned from the current Redfin public dataset.",
      }),
      series: [],
    };
  }

  return {
    status: "live",
    regionLabel,
    locationLabel,
    monthLabel: latest.monthLabel,
    medianListPrice: latest.medianListPrice,
    medianDom: latest.medianDom,
    activeListings: latest.activeListings,
    saleToListRatio: latest.saleToListRatio,
    inventoryYoY: latest.inventoryYoY,
    marketUrl: formatListingUrl(locationLabel),
    notes: [
      "Housing Market Pulse is based on Redfin's public county-level All Residential market tracker.",
      "Use this as a market-context layer; it does not replace parcel, MLS, or listing-level due diligence.",
    ],
    source: buildRegistryAwareSourceMeta({
      id: "housing-market",
      label: "Housing market pulse",
      provider: "Redfin Data Center",
      domain: "housing",
      context: registryContext,
      status: "live",
      accessType: "dataset",
      lastUpdated: latest.lastUpdated,
      freshness: "Monthly county-market tracker refresh",
      coverage: "United States county-level residential market data",
      confidence:
        "County-level Redfin market tracker values are live public dataset metrics, useful for market context but not parcel-specific pricing.",
      note: "GeoSight is showing the latest county-level All Residential snapshot for the resolved county.",
    }),
    series: buildSeries(rows),
  };
}
