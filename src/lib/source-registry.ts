import {
  GeodataResult,
  SourceDomain,
  SourceProviderDefinition,
  SourceProviderGuidance,
  SourceRegistryContext,
  SourceRegionScope,
} from "@/types";

const US_STATE_CODES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","IA","ID","IL","IN","KS","KY","LA",
  "MA","MD","ME","MI","MN","MO","MS","MT","NC","ND","NE","NH","NJ","NM","NV","NY","OH","OK",
  "OR","PA","RI","SC","SD","TN","TX","UT","VA","VT","WA","WI","WV","WY","DC",
]);

const EUROPE_CODES = new Set([
  "AT","BE","BG","CH","CY","CZ","DE","DK","EE","ES","FI","FR","GR","HR","HU","IE","IS","IT",
  "LT","LU","LV","MT","NL","NO","PL","PT","RO","SE","SI","SK",
]);

const LATIN_AMERICA_CODES = new Set([
  "AR","BO","BR","CL","CO","CR","CU","DO","EC","GT","HN","MX","NI","PA","PE","PR","PY","SV","UY","VE",
]);

const AFRICA_CODES = new Set([
  "AO","BF","BI","BJ","BW","CD","CG","CI","CM","DZ","EG","ET","GH","GM","KE","MA","MW","MZ","NA","NG",
  "RW","SD","SN","TN","TZ","UG","ZA","ZM","ZW",
]);

const ANZ_CODES = new Set(["AU", "NZ"]);

export const SOURCE_DOMAIN_LABELS: Record<SourceDomain, string> = {
  weather: "Weather",
  nearby_places: "Nearby places",
  demographics: "Demographics",
  hazards: "Hazards",
  schools: "Schools",
  broadband: "Broadband",
  terrain: "Terrain",
  imagery: "Imagery",
};

export const SOURCE_REGION_LABELS: Record<SourceRegionScope, string> = {
  global: "Global",
  us: "United States",
  "us-wa": "Washington State",
  europe: "Europe",
  uk: "United Kingdom",
  japan: "Japan",
  india: "India",
  "australia-nz": "Australia / New Zealand",
  "latin-america": "Latin America",
  africa: "Africa",
};

export const SOURCE_PROVIDER_REGISTRY: SourceProviderDefinition[] = [
  {
    id: "open-meteo",
    name: "Open-Meteo",
    domains: ["weather"],
    accessType: "api",
    coverage: ["global"],
    priority: 10,
    freshness: "Live forecast and current snapshots",
    reliability: "High global baseline; AQI coverage varies by region",
    rateLimit: "Free public usage, cache aggressively",
    notes: "Best free default for global weather and simple air-quality context.",
    integrated: true,
  },
  {
    id: "noaa-nws",
    name: "NOAA National Weather Service",
    domains: ["weather", "hazards"],
    accessType: "api",
    coverage: ["us"],
    priority: 20,
    freshness: "Live alerts and forecast products",
    reliability: "High for US operational weather and alerts",
    rateLimit: "Public API, polite usage expected",
    notes: "Strong US fallback when alerting and official US products matter.",
    integrated: false,
  },
  {
    id: "meteostat",
    name: "Meteostat",
    domains: ["weather"],
    accessType: "api",
    coverage: ["global"],
    priority: 30,
    freshness: "Historical and station-backed weather datasets",
    reliability: "Useful for climatology and backfills",
    rateLimit: "Free public access with usage limits",
    notes: "Good future complement for historical climate views.",
    integrated: false,
  },
  {
    id: "osm-overpass",
    name: "OpenStreetMap via Overpass",
    domains: ["nearby_places", "schools"],
    accessType: "api",
    coverage: ["global"],
    priority: 10,
    freshness: "Near-real-time OSM edits, cache per query",
    reliability: "Coverage varies by local mapper density",
    rateLimit: "Public endpoint, must cache and throttle",
    notes: "Best free global POI baseline and a limited school-location fallback.",
    integrated: true,
  },
  {
    id: "wikidata-query",
    name: "Wikidata Query Service",
    domains: ["nearby_places"],
    accessType: "api",
    coverage: ["global"],
    priority: 20,
    freshness: "Live knowledge graph snapshots",
    reliability: "Stronger for notable places than dense POI coverage",
    rateLimit: "Public service, careful usage required",
    notes: "Good landmark fallback when OSM coverage is sparse.",
    integrated: false,
  },
  {
    id: "fcc-census-acs",
    name: "FCC Area API + US Census ACS",
    domains: ["demographics"],
    accessType: "api",
    coverage: ["us"],
    priority: 10,
    freshness: "ACS 5-year estimates, FCC lookups are current",
    reliability: "High for county-level US demographics",
    rateLimit: "Public APIs, cache daily",
    notes: "Current GeoSight US demographic baseline.",
    integrated: true,
  },
  {
    id: "eurostat",
    name: "Eurostat",
    domains: ["demographics", "broadband"],
    accessType: "api",
    coverage: ["europe"],
    priority: 20,
    freshness: "Periodic official releases",
    reliability: "High for Europe-wide statistical comparisons",
    rateLimit: "Public API with standard fair-use expectations",
    notes: "Best next-step demographic and connectivity source for Europe.",
    integrated: false,
  },
  {
    id: "world-bank-open-data",
    name: "World Bank Open Data",
    domains: ["demographics", "broadband"],
    accessType: "api",
    coverage: ["global"],
    priority: 30,
    freshness: "Periodic national and macro indicators",
    reliability: "High for national aggregates, not parcel-level analysis",
    rateLimit: "Public API",
    notes: "Global fallback when only national indicators are available.",
    integrated: true,
  },
  {
    id: "usgs-earthquake-catalog",
    name: "USGS Earthquake Catalog",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["global"],
    priority: 10,
    freshness: "Live event feed",
    reliability: "High for recent seismic events",
    rateLimit: "Public API, cache short windows",
    notes: "Current GeoSight hazard baseline for recent seismic activity.",
    integrated: true,
  },
  {
    id: "nasa-firms",
    name: "NASA FIRMS",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["global"],
    priority: 20,
    freshness: "Near-real-time fire detections",
    reliability: "High for wildfire hotspot monitoring",
    rateLimit: "Open access products",
    notes: "Best free next-step global wildfire layer.",
    integrated: true,
  },
  {
    id: "gdacs",
    name: "GDACS",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["global"],
    priority: 30,
    freshness: "Active disaster alerts",
    reliability: "Strong for broad disaster event awareness",
    rateLimit: "Public feeds available",
    notes: "Useful future global hazard-alert complement.",
    integrated: false,
  },
  {
    id: "nces-edge",
    name: "NCES EDGE Public Schools",
    domains: ["schools"],
    accessType: "api",
    coverage: ["us"],
    priority: 10,
    freshness: "Annual school-year releases",
    reliability: "High baseline for US public K-12 school locations",
    rateLimit: "Public ArcGIS endpoint",
    notes: "Current GeoSight baseline school dataset.",
    integrated: true,
  },
  {
    id: "wa-ospi",
    name: "Washington OSPI Open Data",
    domains: ["schools"],
    accessType: "dataset",
    coverage: ["us-wa"],
    priority: 5,
    freshness: "Annual accountability releases",
    reliability: "High for Washington official performance context",
    rateLimit: "Public Socrata datasets",
    notes: "Current state-level school accountability enhancement.",
    integrated: true,
  },
  {
    id: "fcc-broadband-map",
    name: "FCC Broadband Map",
    domains: ["broadband"],
    accessType: "api",
    coverage: ["us"],
    priority: 10,
    freshness: "Periodic provider availability updates",
    reliability: "Best official US broadband availability source",
    rateLimit: "Public endpoints with responsible-use expectations",
    notes: "Best future US broadband layer.",
    integrated: false,
  },
  {
    id: "opencellid",
    name: "OpenCelliD",
    domains: ["broadband"],
    accessType: "dataset",
    coverage: ["global"],
    priority: 30,
    freshness: "Community-updated mobile coverage observations",
    reliability: "Limited proxy for wireless access, not fixed broadband",
    rateLimit: "Free tiers and open downloads vary",
    notes: "Useful global fallback only when a connectivity proxy is acceptable.",
    integrated: false,
  },
  {
    id: "usgs-epqs",
    name: "USGS National Map EPQS",
    domains: ["terrain"],
    accessType: "api",
    coverage: ["us"],
    priority: 10,
    freshness: "On-demand elevation queries",
    reliability: "High for US terrain points",
    rateLimit: "Public API, cache per query",
    notes: "Current GeoSight terrain source for US coordinates.",
    integrated: true,
  },
  {
    id: "opentopodata",
    name: "OpenTopoData",
    domains: ["terrain"],
    accessType: "api",
    coverage: ["global"],
    priority: 20,
    freshness: "Depends on backing DEM dataset",
    reliability: "Good global fallback with dataset-specific limits",
    rateLimit: "Public instances vary",
    notes: "Best future global fallback for elevation outside the US.",
    integrated: true,
  },
  {
    id: "cesium-ion-imagery",
    name: "Cesium Ion / Bing Aerial",
    domains: ["imagery"],
    accessType: "tile_service",
    coverage: ["global"],
    priority: 10,
    freshness: "Provider-managed aerial basemaps",
    reliability: "Strong interactive globe imagery baseline",
    rateLimit: "Free-tier token limits apply",
    notes: "Current GeoSight imagery layer for the globe experience.",
    integrated: true,
  },
  {
    id: "earth-search-sentinel2",
    name: "Earth Search Sentinel-2 STAC",
    domains: ["imagery"],
    accessType: "catalog",
    coverage: ["global"],
    priority: 20,
    freshness: "Rolling satellite scenes",
    reliability: "Strong open satellite imagery source for analysis workflows",
    rateLimit: "Open catalog access",
    notes: "Best future open remote-sensing catalog for imagery cards.",
    integrated: false,
  },
  {
    id: "landsatlook",
    name: "USGS LandsatLook / Landsat STAC",
    domains: ["imagery"],
    accessType: "catalog",
    coverage: ["global"],
    priority: 30,
    freshness: "Rolling satellite scenes",
    reliability: "Strong open multispectral imagery source",
    rateLimit: "Open access",
    notes: "Good open fallback for satellite-backed analysis.",
    integrated: false,
  },
];

function uniqueScopes(scopes: SourceRegionScope[]) {
  return Array.from(new Set(scopes));
}

function normalizeCountryCode(countryCode?: string | null) {
  return countryCode?.trim().toUpperCase() || null;
}

function normalizeStateCode(stateCode?: string | null) {
  return stateCode?.trim().toUpperCase() || null;
}

export function resolveSourceRegistryContext(input: {
  countryCode?: string | null;
  stateCode?: string | null;
}): SourceRegistryContext {
  const countryCode = normalizeCountryCode(input.countryCode);
  const stateCode = normalizeStateCode(input.stateCode);
  const scopes: SourceRegionScope[] = [];

  if ((countryCode === "US" || (!countryCode && stateCode && US_STATE_CODES.has(stateCode))) && stateCode === "WA") {
    scopes.push("us-wa");
  }

  if (countryCode === "US" || (!countryCode && stateCode && US_STATE_CODES.has(stateCode))) {
    scopes.push("us");
  }

  if (countryCode === "GB" || countryCode === "UK") {
    scopes.push("uk");
    scopes.push("europe");
  }

  if (countryCode && EUROPE_CODES.has(countryCode)) {
    scopes.push("europe");
  }

  if (countryCode === "JP") {
    scopes.push("japan");
  }

  if (countryCode === "IN") {
    scopes.push("india");
  }

  if (countryCode && ANZ_CODES.has(countryCode)) {
    scopes.push("australia-nz");
  }

  if (countryCode && LATIN_AMERICA_CODES.has(countryCode)) {
    scopes.push("latin-america");
  }

  if (countryCode && AFRICA_CODES.has(countryCode)) {
    scopes.push("africa");
  }

  scopes.push("global");

  return {
    countryCode,
    stateCode,
    scopes: uniqueScopes(scopes),
  };
}

export function inferSourceRegistryContextFromGeodata(
  geodata: GeodataResult | null,
): SourceRegistryContext {
  const locationCode = geodata?.demographics.stateCode ?? null;
  const normalizedCode = normalizeCountryCode(locationCode);

  if (normalizedCode && US_STATE_CODES.has(normalizedCode)) {
    return resolveSourceRegistryContext({ stateCode: normalizedCode, countryCode: "US" });
  }

  return resolveSourceRegistryContext({ countryCode: normalizedCode, stateCode: null });
}

export function summarizeRegistryContext(context: SourceRegistryContext) {
  const labels = context.scopes
    .filter((scope) => scope !== "global")
    .map((scope) => SOURCE_REGION_LABELS[scope]);

  if (!labels.length) {
    return "Global fallback posture";
  }

  return `${labels.join(" + ")} coverage posture`;
}

function providerRank(provider: SourceProviderDefinition, context: SourceRegistryContext) {
  const scopeIndexes = provider.coverage
    .map((scope) => context.scopes.indexOf(scope))
    .filter((index) => index >= 0);

  if (!scopeIndexes.length) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(...scopeIndexes) * 100 + provider.priority;
}

export function getProvidersForDomain(
  domain: SourceDomain,
  context: SourceRegistryContext,
) {
  return SOURCE_PROVIDER_REGISTRY
    .filter(
      (provider) =>
        provider.domains.includes(domain) &&
        provider.coverage.some((scope) => context.scopes.includes(scope)),
    )
    .sort((a, b) => providerRank(a, context) - providerRank(b, context));
}

export function getSourceProviderGuidance(
  domain: SourceDomain,
  context: SourceRegistryContext,
): SourceProviderGuidance {
  const providers = getProvidersForDomain(domain, context);

  return {
    domain,
    context,
    primary: providers[0] ?? null,
    fallbacks: providers.slice(1),
  };
}

export function formatSourceRegionScopes(scopes: SourceRegionScope[]) {
  return uniqueScopes(scopes)
    .map((scope) => SOURCE_REGION_LABELS[scope])
    .join(" -> ");
}

export function buildSourceRegistryPreview(context: SourceRegistryContext) {
  const domains: SourceDomain[] = [
    "weather",
    "nearby_places",
    "demographics",
    "hazards",
    "schools",
    "broadband",
    "terrain",
    "imagery",
  ];

  return domains.map((domain) => getSourceProviderGuidance(domain, context));
}
