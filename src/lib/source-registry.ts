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

const MIDDLE_EAST_CODES = new Set([
  "SA","AE","QA","KW","BH","OM","IQ","IR","JO","LB","SY","YE","PS","IL",
]);

const SOUTH_ASIA_CODES = new Set([
  "PK","BD","LK","NP","BT","MV","AF",
]);

const SOUTHEAST_ASIA_CODES = new Set([
  "TH","VN","PH","MM","KH","LA","MY","SG","ID","BN","TL",
]);

const EAST_ASIA_CODES = new Set([
  "CN","KR","TW","MN",
]);

const CENTRAL_ASIA_CODES = new Set([
  "KZ","UZ","TM","KG","TJ",
]);

const CARIBBEAN_CODES = new Set([
  "JM","TT","BB","BS","HT","GD","AG","DM","KN","LC","VC","CW","AW","SX",
]);

const OCEANIA_CODES = new Set([
  "FJ","PG","WS","TO","VU","SB","FM","PW","MH","KI","TV","NR",
]);

export const SOURCE_DOMAIN_LABELS: Record<SourceDomain, string> = {
  weather: "Weather",
  nearby_places: "Nearby places",
  demographics: "Demographics",
  housing: "Housing market",
  hazards: "Hazards",
  hydrology: "Hydrology",
  environmental: "Environmental quality",
  schools: "Schools",
  broadband: "Broadband",
  terrain: "Terrain",
  imagery: "Imagery",
  population: "Population density",
  land_cover: "Land cover",
  soil: "Soil properties",
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
  "middle-east": "Middle East",
  "south-asia": "South Asia",
  "southeast-asia": "Southeast Asia",
  "east-asia": "East Asia",
  "central-asia": "Central Asia",
  caribbean: "Caribbean",
  oceania: "Oceania",
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
    resolution: "~11 km",
    updateCadence: "hourly",
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
    integrated: true,
    resolution: "county / zone",
    updateCadence: "minutes",
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
    resolution: "station-level",
    updateCadence: "daily",
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
    notes: "Global POI baseline; school-location fallback for non-US coordinates via amenity=school/kindergarten query.",
    integrated: true,
    resolution: "feature-level",
    updateCadence: "minutes",
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
    resolution: "entity-level",
    updateCadence: "daily",
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
    resolution: "county",
    updateCadence: "annual",
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
    notes: "Current Europe demographic and household-connectivity baseline for GeoSight.",
    integrated: true,
    resolution: "country / NUTS2",
    updateCadence: "annual",
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
    resolution: "country",
    updateCadence: "annual",
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
    resolution: "event-level",
    updateCadence: "minutes",
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
    resolution: "375 m (VIIRS)",
    updateCadence: "3 hours",
    requiresApiKey: true,
    apiKeyEnvVar: "NASA_FIRMS_MAP_KEY",
  },
  {
    id: "gdacs",
    name: "GDACS",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["global"],
    priority: 30,
    freshness: "Live disaster notifications and active event feed",
    reliability: "Strong for broad disaster alert awareness and global situation scanning",
    rateLimit: "Public feeds available",
    notes: "Current global disaster-alert feed for major sudden-onset and ongoing disaster notifications.",
    integrated: true,
    resolution: "event-level",
    updateCadence: "hourly",
  },
  {
    id: "fema-nfhl",
    name: "FEMA NFHL",
    url: "https://hazards.fema.gov",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["us"],
    priority: 15,
    freshness: "Operational FEMA flood hazard map updates",
    reliability: "High for US flood-zone designation and SFHA context",
    rateLimit: "Public ArcGIS service, cache per point query",
    notes: "Current GeoSight flood-zone source for US parcel and infrastructure risk context.",
    integrated: true,
    resolution: "parcel",
    updateCadence: "irregular",
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
    resolution: "school-level",
    updateCadence: "annual",
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
    resolution: "school-level",
    updateCadence: "annual",
  },
  {
    id: "fcc-broadband",
    name: "FCC Broadband Map",
    url: "https://broadbandmap.fcc.gov",
    domains: ["broadband"],
    accessType: "api",
    coverage: ["us"],
    priority: 10,
    freshness: "Periodic provider availability updates",
    reliability: "Best official US broadband availability source",
    rateLimit: "Public endpoints with responsible-use expectations",
    notes: "Current GeoSight broadband availability source for US connectivity context.",
    integrated: true,
    resolution: "address",
    updateCadence: "semi-annual",
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
    resolution: "cell tower",
    updateCadence: "daily",
  },
  {
    id: "usgs-streamgauges",
    name: "USGS Water Services",
    url: "https://waterservices.usgs.gov",
    domains: ["hydrology"],
    accessType: "api",
    coverage: ["us"],
    priority: 10,
    freshness: "Live stream gauge readings and site metadata",
    reliability: "High for active USGS gauge networks where stations exist",
    rateLimit: "Public API, cache per query window",
    notes: "Current GeoSight hydrology source for nearby stream gauges and discharge context.",
    integrated: true,
    resolution: "gauge-level",
    updateCadence: "15 minutes",
  },
  {
    id: "usgs-groundwater",
    name: "USGS Groundwater Levels",
    domains: ["hydrology"],
    accessType: "api",
    coverage: ["us"],
    priority: 15,
    freshness: "Live groundwater level readings from active monitoring wells",
    reliability: "High for active USGS groundwater monitoring network",
    rateLimit: "Public API, cache per query",
    notes: "Groundwater level and well depth context for subsurface hydrology.",
    integrated: true,
    resolution: "well-level",
    updateCadence: "hourly",
  },
  {
    id: "openaq",
    name: "OpenAQ",
    url: "https://openaq.org",
    domains: ["environmental"],
    accessType: "api",
    coverage: ["global"],
    priority: 10,
    freshness: "Near-real-time air-quality station observations",
    reliability: "Coverage depends on station density and current public API availability",
    rateLimit: "Public API with fair-use expectations",
    notes: "Current GeoSight fine-particle air-quality source when a nearby monitoring station is available.",
    integrated: true,
    resolution: "station-level",
    updateCadence: "hourly",
  },
  {
    id: "epa-envirofacts",
    name: "EPA Envirofacts",
    url: "https://data.epa.gov",
    domains: ["environmental", "hazards"],
    accessType: "api",
    coverage: ["us"],
    priority: 20,
    freshness: "Periodic EPA facility and site updates",
    reliability: "High baseline for US contamination screening and facility proximity",
    rateLimit: "Public API, cache per query window",
    notes: "Current GeoSight contamination-screening source for Superfund and TRI proximity.",
    integrated: true,
    resolution: "facility-level",
    updateCadence: "quarterly",
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
    resolution: "~10 m",
    updateCadence: "static",
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
    resolution: "~90 m (SRTM)",
    updateCadence: "static",
  },
  {
    id: "nrcs-ssurgo",
    name: "NRCS Soil Data Access (SSURGO)",
    domains: ["terrain", "soil"],
    accessType: "api",
    coverage: ["us"],
    priority: 12,
    freshness: "Periodic soil survey updates",
    reliability: "High for mapped US soil survey areas",
    rateLimit: "Public API, cache per query",
    notes: "Soil type, drainage class, depth to water table, and depth to bedrock.",
    integrated: true,
    resolution: "map unit (~1:24,000)",
    updateCadence: "annual",
  },
  {
    id: "isric-soilgrids",
    name: "ISRIC SoilGrids",
    domains: ["terrain", "soil"],
    accessType: "api",
    coverage: ["global"],
    priority: 15,
    freshness: "Machine-learning derived from global soil observations (2.0)",
    reliability: "Good global soil texture baseline; accuracy varies by data-sparse regions",
    rateLimit: "Public REST API, cache aggressively (7-day revalidation)",
    notes: "Global fallback for non-US soil profiles — provides clay/silt/sand texture, WRB soil class, drainage class, and hydrologic group derived from composition.",
    integrated: true,
    resolution: "250 m",
    updateCadence: "static",
  },
  {
    id: "glofas-openmeteo",
    name: "GloFAS via Open-Meteo Flood API",
    domains: ["hazards", "hydrology"],
    accessType: "api",
    coverage: ["global"],
    priority: 20,
    freshness: "7-day river discharge ensemble forecast (~10 km resolution)",
    reliability: "Good for river-discharge context; accuracy lower in ungauged basins",
    rateLimit: "Free public API, cache 6 hours",
    notes: "Global flood context for non-US coordinates — peak discharge tier (Low / Moderate / Significant / Major) as FEMA fallback.",
    integrated: true,
    resolution: "~10 km",
    updateCadence: "daily",
  },
  {
    id: "usgs-seismic-design",
    name: "USGS Seismic Design Maps",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["us"],
    priority: 12,
    freshness: "Based on ASCE 7-22 reference document",
    reliability: "High for code-based seismic hazard parameters",
    rateLimit: "Public API, cache per coordinate",
    notes: "Site-specific seismic acceleration and design parameters (SS, S1, PGA) for US infrastructure risk.",
    integrated: true,
    resolution: "site-specific",
    updateCadence: "static (code cycle)",
  },
  {
    id: "usgs-catalog-global",
    name: "USGS Earthquake Catalog (Global Hazard)",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["global"],
    priority: 14,
    freshness: "Live event feed, 5-year lookback for exposure tier",
    reliability: "High — USGS ingests global seismic networks (ISC, EMSC, regional agencies)",
    rateLimit: "Public API, cache 24 hours",
    notes: "For non-US coordinates: M3+ event count and maximum magnitude in 400 km / 5 yr window → qualitative seismic exposure tier (Very Low → Very High).",
    integrated: true,
    resolution: "event-level",
    updateCadence: "minutes",
  },
  {
    id: "open-meteo-historical",
    name: "Open-Meteo Historical Archive",
    domains: ["weather"],
    accessType: "api",
    coverage: ["global"],
    priority: 15,
    freshness: "Archived daily records through previous calendar year",
    reliability: "High for global reanalysis-based historical weather",
    rateLimit: "Free public usage, cache aggressively",
    notes: "10-year historical climate trends for temperature and precipitation.",
    integrated: true,
    resolution: "~11 km",
    updateCadence: "daily (archive)",
  },
  {
    id: "nasa-power",
    name: "NASA POWER Climatology",
    domains: ["weather", "terrain"],
    accessType: "api",
    coverage: ["global"],
    priority: 25,
    freshness: "Monthly climatological averages",
    reliability: "High for solar irradiance and climate normals",
    rateLimit: "Public API",
    notes: "Global solar resource and climate normals.",
    integrated: true,
    resolution: "~50 km",
    updateCadence: "monthly",
  },
  {
    id: "eea-eprtr",
    name: "EEA E-PRTR Industrial Facilities",
    domains: ["environmental"],
    accessType: "api",
    coverage: ["europe"],
    priority: 20,
    freshness: "Annual industrial facility reporting",
    reliability: "High for European industrial emissions and facility proximity",
    rateLimit: "Public API",
    notes: "European contamination screening complement to US EPA Envirofacts.",
    integrated: true,
    resolution: "facility-level",
    updateCadence: "annual",
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
    resolution: "varies (sub-meter urban)",
    updateCadence: "provider-managed",
    requiresApiKey: true,
    apiKeyEnvVar: "NEXT_PUBLIC_CESIUM_ION_TOKEN",
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
    resolution: "10 m",
    updateCadence: "5 days",
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
    resolution: "30 m",
    updateCadence: "16 days",
  },

  // -- Phase 1 global baseline datasets --

  {
    id: "worldpop",
    name: "WorldPop Global Population",
    url: "https://www.worldpop.org",
    domains: ["population"],
    accessType: "api",
    coverage: ["global"],
    priority: 10,
    freshness: "Annual population distribution grids",
    reliability: "High for global population density estimation; accuracy varies in remote areas",
    rateLimit: "Public API, cache 7 days",
    notes: "Global population density at 100 m–1 km resolution derived from census data and geospatial covariates.",
    integrated: false,
    resolution: "100 m – 1 km",
    updateCadence: "annual",
  },
  {
    id: "esa-cci-landcover",
    name: "ESA CCI Global Land Cover",
    url: "https://land.copernicus.eu",
    domains: ["land_cover"],
    accessType: "tile_service",
    coverage: ["global"],
    priority: 10,
    freshness: "Annual satellite-derived land cover classification",
    reliability: "High for categorical land cover; 300 m pixels may miss fine boundaries",
    rateLimit: "Open data, cache 30 days",
    notes: "Authoritative satellite-derived global land cover using UN-LCCS class scheme. Complements OSM-derived land use proxy.",
    integrated: false,
    resolution: "300 m",
    updateCadence: "annual",
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

  if (countryCode && MIDDLE_EAST_CODES.has(countryCode)) {
    scopes.push("middle-east");
  }

  if (countryCode === "IN") {
    scopes.push("south-asia");
  }
  if (countryCode && SOUTH_ASIA_CODES.has(countryCode)) {
    scopes.push("south-asia");
  }

  if (countryCode && SOUTHEAST_ASIA_CODES.has(countryCode)) {
    scopes.push("southeast-asia");
  }

  if (countryCode === "JP") {
    scopes.push("east-asia");
  }
  if (countryCode && EAST_ASIA_CODES.has(countryCode)) {
    scopes.push("east-asia");
  }

  if (countryCode && CENTRAL_ASIA_CODES.has(countryCode)) {
    scopes.push("central-asia");
  }

  if (countryCode && CARIBBEAN_CODES.has(countryCode)) {
    scopes.push("caribbean");
  }

  if (countryCode && OCEANIA_CODES.has(countryCode)) {
    scopes.push("oceania");
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
    "housing",
    "hazards",
    "hydrology",
    "environmental",
    "schools",
    "broadband",
    "terrain",
    "imagery",
    "population",
    "land_cover",
    "soil",
  ];

  return domains.map((domain) => getSourceProviderGuidance(domain, context));
}
