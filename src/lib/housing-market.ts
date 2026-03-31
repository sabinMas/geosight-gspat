import { gunzipSync } from "node:zlib";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { buildRegistryAwareSourceMeta } from "@/lib/source-metadata";
import type { HousingMarketResult, HousingMarketSeriesPoint, SourceRegistryContext } from "@/types";

const REDFIN_METRO_MARKET_URL =
  "https://redfin-public-data.s3.us-west-2.amazonaws.com/redfin_market_tracker/redfin_metro_market_tracker.tsv000.gz";
const HOUSING_MARKET_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_SERIES_POINTS = 12;

const MAJOR_METROS = [
  { key: "New York, NY", aliases: ["brooklyn", "queens", "bronx", "manhattan", "staten island", "jersey city", "newark", "long island", "westchester", "nassau", "suffolk"] },
  { key: "Los Angeles, CA", aliases: ["los angeles county", "pasadena", "glendale", "santa monica", "burbank", "long beach", "orange county", "anaheim", "irvine"] },
  { key: "Chicago, IL", aliases: ["cook county", "naperville", "evanston", "oak park", "schaumburg", "aurora", "joliet"] },
  { key: "Dallas, TX", aliases: ["fort worth", "plano", "frisco", "arlington", "mckinney", "denton", "dallas county", "tarrant county", "collin county"] },
  { key: "Houston, TX", aliases: ["harris county", "sugar land", "pearland", "katy", "the woodlands", "pasadena tx"] },
  { key: "Washington, DC", aliases: ["arlington", "alexandria", "fairfax", "montgomery county", "prince georges county", "bethesda", "silver spring"] },
  { key: "Philadelphia, PA", aliases: ["camden", "king of prussia", "main line", "chester county", "bucks county", "delaware county"] },
  { key: "Miami, FL", aliases: ["miami dade", "fort lauderdale", "hollywood fl", "west palm beach", "boca raton"] },
  { key: "Atlanta, GA", aliases: ["fulton county", "dekalb county", "alpharetta", "marietta", "sandy springs", "roswell"] },
  { key: "Boston, MA", aliases: ["cambridge", "somerville", "brookline", "quincy", "worcester", "middlesex county"] },
  { key: "Phoenix, AZ", aliases: ["scottsdale", "mesa", "tempe", "chandler", "gilbert", "glendale az", "maricopa county"] },
  { key: "San Francisco, CA", aliases: ["oakland", "berkeley", "san mateo", "palo alto", "redwood city", "fremont", "san jose", "silicon valley", "alameda county", "santa clara county"] },
  { key: "Seattle, WA", aliases: ["bellevue", "redmond", "kirkland", "renton", "sammamish", "issaquah", "everett", "tacoma", "king county", "snohomish county", "pierce county"] },
  { key: "Riverside, CA", aliases: ["san bernardino", "ontario ca", "corona", "rancho cucamonga", "inland empire"] },
  { key: "Detroit, MI", aliases: ["ann arbor", "dearborn", "troy", "oakland county", "wayne county", "macomb county"] },
  { key: "Minneapolis, MN", aliases: ["saint paul", "st paul", "eden prairie", "bloomington mn", "hennepin county", "ramsey county"] },
  { key: "San Diego, CA", aliases: ["la jolla", "chula vista", "carlsbad", "encinitas", "escondido"] },
  { key: "Tampa, FL", aliases: ["st petersburg", "clearwater", "brandon fl", "pinellas county", "hillsborough county"] },
  { key: "Denver, CO", aliases: ["aurora co", "lakewood", "boulder", "fort collins", "jefferson county", "denver county"] },
  { key: "Baltimore, MD", aliases: ["columbia md", "towson", "anne arundel county", "howard county"] },
  { key: "St. Louis, MO", aliases: ["saint louis", "chesterfield", "clayton", "st charles"] },
  { key: "Charlotte, NC", aliases: ["mecklenburg county", "gastonia", "concord nc", "huntersville"] },
  { key: "Orlando, FL", aliases: ["kissimmee", "winter park", "lake nona", "seminole county"] },
  { key: "San Antonio, TX", aliases: ["bexar county", "new braunfels", "boerne"] },
  { key: "Portland, OR", aliases: ["beaverton", "hillsboro", "gresham", "vancouver wa", "washington county or", "multnomah county"] },
  { key: "Sacramento, CA", aliases: ["roseville", "elk grove", "folsom", "placer county"] },
  { key: "Austin, TX", aliases: ["round rock", "cedar park", "georgetown tx", "travis county", "williamson county"] },
  { key: "Las Vegas, NV", aliases: ["henderson", "summerlin", "north las vegas", "clark county nv"] },
  { key: "San Jose, CA", aliases: ["santa clara", "cupertino", "mountain view", "sunnyvale", "milpitas", "santa clara county"] },
  { key: "Nashville, TN", aliases: ["franklin tn", "brentwood tn", "murfreesboro", "davidson county"] },
  { key: "Columbus, OH", aliases: ["dublin oh", "westerville", "new albany oh", "franklin county oh"] },
  { key: "Indianapolis, IN", aliases: ["carmel", "fishers", "hamilton county in", "marion county in"] },
  { key: "Cincinnati, OH", aliases: ["covington", "newport ky", "hamilton county oh", "mason oh"] },
  { key: "Cleveland, OH", aliases: ["akron", "lakewood", "cuyahoga county", "medina oh"] },
  { key: "Kansas City, MO", aliases: ["johnson county ks", "overland park", "olathe", "lees summit"] },
  { key: "Pittsburgh, PA", aliases: ["allegheny county", "bethel park", "cranberry township"] },
  { key: "Raleigh, NC", aliases: ["durham", "cary", "chapel hill", "wake county", "research triangle"] },
  { key: "Salt Lake City, UT", aliases: ["provo", "ogden", "park city", "sandy ut", "utah county"] },
  { key: "Milwaukee, WI", aliases: ["waukesha", "ozaukee county", "west allis"] },
  { key: "Virginia Beach, VA", aliases: ["norfolk", "chesapeake", "hampton roads", "newport news"] },
  { key: "Jacksonville, FL", aliases: ["duval county", "st augustine", "orange park"] },
  { key: "Providence, RI", aliases: ["warwick", "cranston", "pawtucket"] },
  { key: "New Orleans, LA", aliases: ["metairie", "kenner", "jefferson parish"] },
  { key: "Memphis, TN", aliases: ["shelby county", "germantown tn", "collierville"] },
  { key: "Louisville, KY", aliases: ["jefferson county ky", "new albany in"] },
  { key: "Oklahoma City, OK", aliases: ["norman", "edmond", "moore ok"] },
  { key: "Richmond, VA", aliases: ["henrico county", "chesterfield county", "short pump"] },
  { key: "Hartford, CT", aliases: ["west hartford", "new britain", "farmington ct"] },
  { key: "Buffalo, NY", aliases: ["erie county ny", "amherst ny", "niagara falls ny"] },
  { key: "Birmingham, AL", aliases: ["hoover", "jefferson county al"] },
] as const;

type MetroProfile = (typeof MAJOR_METROS)[number];

type ParsedHousingRow = {
  region: string;
  stateCode: string;
  metroKey: string;
  periodEnd: string;
  monthLabel: string;
  medianSalePrice: number | null;
  medianDom: number | null;
  activeListings: number | null;
  lastUpdated: string | null;
};

type HousingMarketCache = {
  fetchedAt: number;
  metros: Map<string, ParsedHousingRow[]>;
};

let metroMarketCache: HousingMarketCache | null = null;
let metroMarketRequest: Promise<HousingMarketCache> | null = null;

function stripQuotes(value: string) {
  return value.replace(/^"+|"+$/g, "").trim();
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bmetro area\b/g, "")
    .replace(/\bcounty\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

function buildUnavailableHousingMarket(
  locationLabel: string,
  registryContext: SourceRegistryContext,
): HousingMarketResult {
  return {
    status: "unavailable",
    regionLabel: null,
    locationLabel,
    monthLabel: null,
    medianSalePrice: null,
    medianDom: null,
    activeListings: null,
    saleToListRatio: null,
    inventoryYoY: null,
    marketUrl: `https://www.zillow.com/homes/${encodeURIComponent(locationLabel.replace(/,/g, "").trim().replace(/\s+/g, "-"))}_rb/`,
    notes: ["Housing market data is available for US metro areas. This location falls outside coverage."],
    source: buildRegistryAwareSourceMeta({
      id: "housing-market",
      label: "Housing market pulse",
      provider: "Redfin Data Center",
      domain: "housing",
      context: registryContext,
      status: "unavailable",
      accessType: "dataset",
      lastUpdated: null,
      freshness: "Monthly metro-market tracker refresh",
      coverage: "United States metro-level residential market data",
      confidence: "GeoSight only surfaces housing market data for supported US metro areas in this view.",
    }),
    series: [],
  };
}

function findMetroProfile(region: string) {
  const normalizedRegion = normalizeText(region);
  return MAJOR_METROS.find((metro) => normalizedRegion.includes(normalizeText(metro.key)));
}

async function loadMetroMarketCache() {
  if (metroMarketCache && Date.now() - metroMarketCache.fetchedAt < HOUSING_MARKET_CACHE_TTL_MS) {
    return metroMarketCache;
  }

  if (metroMarketRequest) {
    return metroMarketRequest;
  }

  metroMarketRequest = (async () => {
    const response = await fetchWithTimeout(REDFIN_METRO_MARKET_URL, {}, EXTERNAL_TIMEOUTS.standard);
    if (!response.ok) {
      throw new Error("GeoSight could not load live housing market data.");
    }

    const zipped = Buffer.from(await response.arrayBuffer());
    const tsv = gunzipSync(zipped).toString("utf8");
    const lines = tsv.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const headers = parseTsvLine(lines[0] ?? "");
    const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]));
    const metros = new Map<string, ParsedHousingRow[]>();

    for (const line of lines.slice(1)) {
      const columns = parseTsvLine(line);
      const propertyType = columns[headerIndex.PROPERTY_TYPE] ?? "";
      const regionType = columns[headerIndex.REGION_TYPE] ?? "";
      const region = columns[headerIndex.REGION] ?? "";
      const stateCode = columns[headerIndex.STATE_CODE] ?? "";

      if (regionType !== "metro" || propertyType !== "All Residential" || !region || !stateCode) {
        continue;
      }

      const metroProfile = findMetroProfile(region);
      if (!metroProfile) {
        continue;
      }

      const entry: ParsedHousingRow = {
        region,
        stateCode,
        metroKey: metroProfile.key,
        periodEnd: columns[headerIndex.PERIOD_END] ?? "",
        monthLabel: buildMonthLabel(columns[headerIndex.PERIOD_END] ?? ""),
        medianSalePrice: parseNumber(columns[headerIndex.MEDIAN_SALE_PRICE] ?? ""),
        medianDom: parseNumber(columns[headerIndex.MEDIAN_DOM] ?? ""),
        activeListings: parseNumber(columns[headerIndex.INVENTORY] ?? ""),
        lastUpdated: stripQuotes(columns[headerIndex.LAST_UPDATED] ?? "") || null,
      };

      const existing = metros.get(metroProfile.key) ?? [];
      existing.push(entry);
      metros.set(metroProfile.key, existing);
    }

    for (const rows of metros.values()) {
      rows.sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
    }

    metroMarketCache = {
      fetchedAt: Date.now(),
      metros,
    };

    return metroMarketCache;
  })();

  try {
    return await metroMarketRequest;
  } finally {
    metroMarketRequest = null;
  }
}

function buildSeries(rows: ParsedHousingRow[]): HousingMarketSeriesPoint[] {
  return rows
    .slice()
    .reverse()
    .map((row) => ({
      periodEnd: row.periodEnd,
      label: row.monthLabel,
      medianSalePrice: row.medianSalePrice,
      medianDom: row.medianDom,
      activeListings: row.activeListings,
    }));
}

function getSearchTerms(locationLabel: string, countyName: string | null | undefined) {
  const cityPart = locationLabel.split(",")[0] ?? locationLabel;
  const countyRoot = countyName?.replace(/\bCounty\b/i, "").trim() ?? "";

  return [locationLabel, cityPart, countyRoot]
    .map((value) => normalizeText(value))
    .filter((value) => value.length > 0);
}

function scoreMetroMatch(
  metro: MetroProfile,
  searchTerms: string[],
  stateCode: string,
) {
  if (!normalizeText(metro.key).includes(normalizeText(stateCode))) {
    return Number.NEGATIVE_INFINITY;
  }

  const metroKey = normalizeText(metro.key);
  let score = 0;

  for (const term of searchTerms) {
    if (!term) {
      continue;
    }

    if (metroKey.includes(term) || term.includes(metroKey)) {
      score += 120;
    }

    for (const alias of metro.aliases) {
      const normalizedAlias = normalizeText(alias);
      if (term.includes(normalizedAlias) || normalizedAlias.includes(term)) {
        score += normalizedAlias === term ? 80 : 42;
      }
    }
  }

  return score;
}

function findBestMetroMatch(
  locationLabel: string,
  countyName: string | null | undefined,
  stateCode: string,
) {
  const searchTerms = getSearchTerms(locationLabel, countyName);
  const ranked = MAJOR_METROS
    .map((metro) => ({
      metro,
      score: scoreMetroMatch(metro, searchTerms, stateCode),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0] && ranked[0].score > 40 ? ranked[0].metro : null;
}

export async function getHousingMarket(
  countyName: string | null | undefined,
  stateCode: string | null | undefined,
  locationLabel: string,
  registryContext: SourceRegistryContext,
): Promise<HousingMarketResult> {
  if (!stateCode || registryContext.countryCode !== "US") {
    return buildUnavailableHousingMarket(locationLabel, registryContext);
  }

  const metro = findBestMetroMatch(locationLabel, countyName, stateCode);
  if (!metro) {
    return buildUnavailableHousingMarket(locationLabel, registryContext);
  }

  const cache = await loadMetroMarketCache();
  const rows = cache.metros.get(metro.key)?.slice(0, MAX_SERIES_POINTS) ?? [];
  const latest = rows[0] ?? null;

  if (!latest) {
    return buildUnavailableHousingMarket(locationLabel, registryContext);
  }

  return {
    status: "live",
    regionLabel: latest.region.replace(/\s+metro area$/i, ""),
    locationLabel,
    monthLabel: latest.monthLabel,
    medianSalePrice: latest.medianSalePrice,
    medianDom: latest.medianDom,
    activeListings: latest.activeListings,
    saleToListRatio: null,
    inventoryYoY: null,
    marketUrl: `https://www.zillow.com/homes/${encodeURIComponent(locationLabel.replace(/,/g, "").trim().replace(/\s+/g, "-"))}_rb/`,
    notes: [
      "Housing Market Pulse is based on Redfin's public metro-level market tracker.",
      "GeoSight pre-caches major US metros and maps nearby cities and counties to the closest supported metro area.",
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
      freshness: "Monthly metro-market tracker refresh",
      coverage: "50 major United States metro areas",
      confidence: "Metro-level Redfin data is a live public market context signal, not parcel-specific pricing.",
      note: `Matched ${locationLabel} to the ${latest.region.replace(/\s+metro area$/i, "")} market.`,
    }),
    series: buildSeries(rows),
  };
}
