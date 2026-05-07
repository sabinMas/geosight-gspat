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

const CANADA_CODES = new Set([
  "CA",
]);

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
  canada: "Canada",
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
    integrated: true,
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
    integrated: true,
    resolution: "300 m",
    updateCadence: "annual",
  },

  // -- Phase 2 global hazard layers --

  {
    id: "gfms",
    name: "Global Flood Monitoring System (GFMS)",
    url: "https://www.globalflooding.spe.org",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["global"],
    priority: 11,
    freshness: "Near real-time flood probability and return period estimates",
    reliability: "Moderate; flood hazard modeling has inherent uncertainty; best for relative risk comparison",
    rateLimit: "Public API, cache 30 days",
    notes: "Global flood probabilistic hazard maps derived from satellite rainfall and hydrologic modeling (1 km resolution).",
    integrated: false,
    resolution: "1 km",
    updateCadence: "continuous",
  },

  {
    id: "chirps-spi",
    name: "CHIRPS Precipitation + SPI Drought Index",
    url: "https://www.chc.ucsb.edu/research/chirps",
    domains: ["hazards"],
    accessType: "dataset",
    coverage: ["global"],
    priority: 11,
    freshness: "Near real-time precipitation and monthly drought indices",
    reliability: "High for precipitation; SPI interpretation requires agronomic context; good for drought assessment",
    rateLimit: "Public data, cache 7 days (fresher than flood for timely monitoring)",
    notes: "CHIRPS rainfall at 5 km resolution combined with Standard Precipitation Index (SPI) for multi-month drought assessment.",
    integrated: false,
    resolution: "5 km",
    updateCadence: "monthly",
  },

  {
    id: "gem-shakemap",
    name: "GEM OpenQuake Seismic Probabilistic Hazard",
    url: "https://www.globalquakemodel.org",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["global"],
    priority: 11,
    freshness: "Periodic updates to global probabilistic seismic hazard models",
    reliability: "High for seismic hazard assessment; 475-year return period standard; uncertainty bounds available",
    rateLimit: "Public API, cache 30 days",
    notes: "Global Earthquake Model (GEM) probabilistic seismic hazard maps at 1 km resolution with PGA (Peak Ground Acceleration) and spectral acceleration.",
    integrated: false,
    resolution: "1 km",
    updateCadence: "biennial",
  },
  // Phase 3 Japan pack providers
  {
    id: "jshis-seismic",
    name: "J-SHIS Seismic Hazard Maps",
    url: "https://www.j-shis.bosai.go.jp/",
    domains: ["hazards"],
    accessType: "tile_service",
    coverage: ["japan"],
    priority: 10,
    freshness: "Annual model updates; static hazard maps updated every ~3 years",
    reliability: "High; uses NIED probabilistic seismic hazard assessment for building design standards",
    rateLimit: "Free WMS, cache 7 days",
    notes: "Japan Seismic Hazard Information Station (J-SHIS) provides PGA and spectral acceleration at 475-year return period (design standard) via WMS GetFeatureInfo.",
    integrated: false,
    resolution: "150 m grid",
    updateCadence: "triennial",
  },
  {
    id: "hazard-map-portal",
    name: "Japan Hazard Map Portal (Kasaneru)",
    url: "https://disaportal.gsi.go.jp/hazardmap/",
    domains: ["hazards"],
    accessType: "tile_service",
    coverage: ["japan"],
    priority: 10,
    freshness: "Updates as new flood/tsunami studies published; typically 1-2 times per year",
    reliability: "High; official government flood/tsunami/sediment/storm surge inundation depth maps",
    rateLimit: "Free WMS/XYZ, cache 1 day",
    notes: "Comprehensive multi-hazard portal (Kasaneru) covering flood, tsunami, sediment flow, storm surge, debris flow inundation zones with depth estimates.",
    integrated: false,
    resolution: "50-100 m (varies by hazard type)",
    updateCadence: "annual",
  },
  {
    id: "jma-earthquakes",
    name: "JMA Real-Time Earthquake & Tsunami Alerts",
    url: "https://www.jma.go.jp/jma/indexe.html",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["japan"],
    priority: 10,
    freshness: "Real-time; feeds update within minutes of seismic events",
    reliability: "Very high; official Japan Meteorological Agency network, 1,300+ seismic stations",
    rateLimit: "Public GeoJSON feeds, cache 10 minutes",
    notes: "JMA hypocenter data and tsunami threat assessment. Real-time earthquake detection and alerts for Japan and Western Pacific region.",
    integrated: false,
    resolution: "Event-level",
    updateCadence: "continuous",
  },
  {
    id: "jma-observations",
    name: "JMA AMeDAS Weather Observations",
    url: "https://www.jma.go.jp/jma/indexe.html",
    domains: ["weather"],
    accessType: "api",
    coverage: ["japan"],
    priority: 10,
    freshness: "Real-time; 10-minute station update cadence",
    reliability: "Very high; ~1,300 automated meteorological stations across Japan",
    rateLimit: "Public JSON feeds, cache 5 minutes",
    notes: "Automated Meteorological Data Acquisition System (AMeDAS) providing real-time temperature, precipitation, wind, humidity from nationwide network.",
    integrated: false,
    resolution: "Station-level (1.3k stations distributed across Japan)",
    updateCadence: "continuous",
  },
  // Phase 3 India pack providers
  {
    id: "bhuvan-hazards",
    name: "Bhuvan Hazards (Flood, Landslide, Glacial Lakes)",
    url: "https://bhuvan.nrsc.gov.in/",
    domains: ["hazards"],
    accessType: "tile_service",
    coverage: ["india"],
    priority: 10,
    freshness: "Static hazard maps; updated as new studies published",
    reliability: "High; official ISRO/NDMA hazard assessment maps",
    rateLimit: "Free WMS, cache 7 days",
    notes: "ISRO Bhuvan platform providing landslide susceptibility, flood-prone zones, and glacial lake hazard maps covering ~80k mapped landslide events.",
    integrated: false,
    resolution: "1:50k mapping (varies by hazard type)",
    updateCadence: "annual",
  },
  {
    id: "imd-india",
    name: "IMD Weather & Cyclone Alerts",
    url: "https://www.imd.gov.in/",
    domains: ["weather"],
    accessType: "api",
    coverage: ["india"],
    priority: 10,
    freshness: "Real-time weather; 6-hour forecast updates",
    reliability: "Very high; official India Meteorological Department network",
    rateLimit: "Public JSON feeds, cache 10 minutes",
    notes: "Real-time weather observations and cyclone alerts covering 36 meteorological subdivisions across India.",
    integrated: false,
    resolution: "Subdivision-level (36 subdivisions)",
    updateCadence: "continuous",
  },
  {
    id: "india-wris",
    name: "India-WRIS Hydrology (CWC Discharge Data)",
    url: "https://indiawris.gov.in/",
    domains: ["hydrology"],
    accessType: "api",
    coverage: ["india"],
    priority: 10,
    freshness: "Real-time; 15-30 minute station updates",
    reliability: "High; official Central Water Commission monitoring network",
    rateLimit: "Public API, cache 5 minutes",
    notes: "India Water Resources Information System with real-time discharge and water-level data from 1,300+ CWC monitoring stations.",
    integrated: false,
    resolution: "Station-level (1.3k stations across India's river network)",
    updateCadence: "continuous",
  },
  {
    id: "cpcb-air-quality",
    name: "CPCB CAAQMS Air Quality",
    url: "https://app.cpcb.gov.in/caaqms/",
    domains: ["weather"],
    accessType: "api",
    coverage: ["india"],
    priority: 10,
    freshness: "Real-time; 15-30 minute updates from active stations",
    reliability: "High; official Central Pollution Control Board monitoring network",
    rateLimit: "Public API, cache 10 minutes",
    notes: "Continuous Ambient Air Quality Monitoring System (CAAQMS) with real-time AQI, PM2.5, PM10, NO2, SO2, CO, O3 from ~500 stations.",
    integrated: false,
    resolution: "Station-level (~500 stations in major Indian cities)",
    updateCadence: "continuous",
  },
  // Phase 3 Canada pack providers
  {
    id: "nrcan-hydrology",
    name: "NRCan Water Survey of Canada (WSC) Hydrology",
    url: "https://www.wateroffice.ec.gc.ca/",
    domains: ["hydrology"],
    accessType: "api",
    coverage: ["canada"],
    priority: 10,
    freshness: "Real-time; 15-30 minute station updates",
    reliability: "Very high; official Natural Resources Canada monitoring network",
    rateLimit: "Public API, cache 5 minutes",
    notes: "Water Survey of Canada real-time discharge and water-level data from 2,100+ monitoring stations across Canada's river network.",
    integrated: false,
    resolution: "Station-level (2.1k stations across Canadian watersheds)",
    updateCadence: "continuous",
  },
  {
    id: "cwfis-wildfires",
    name: "CWFIS Wildfire Danger & Active Incidents",
    url: "https://cwfis.cfs.nrcan.gc.ca/",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["canada"],
    priority: 10,
    freshness: "Real-time fire danger indices; updated multiple times daily",
    reliability: "Very high; official Canadian Wildland Fire Information System",
    rateLimit: "Public API, cache 3 minutes",
    notes: "Canadian Wildland Fire Information System (CWFIS) with Fire Weather Index (FWI), Build-Up Index (BUI), and active wildfire incidents across Canada.",
    integrated: false,
    resolution: "National fire danger grid",
    updateCadence: "continuous",
  },
  {
    id: "eccc-air-quality",
    name: "ECCC Air Quality Monitoring Network",
    url: "https://www.canada.ca/en/environment-climate-change.html",
    domains: ["environmental"],
    accessType: "api",
    coverage: ["canada"],
    priority: 10,
    freshness: "Real-time; 15-30 minute updates from active stations",
    reliability: "High; official Environment and Climate Change Canada monitoring network",
    rateLimit: "Public API, cache 10 minutes",
    notes: "Real-time air quality data from ~600 monitoring stations including O3, NO2, PM2.5, PM10, SO2, CO across Canada.",
    integrated: false,
    resolution: "Station-level (~600 stations in Canadian cities and regions)",
    updateCadence: "continuous",
  },
  {
    id: "nrcan-seismic",
    name: "NRCan Seismic Hazard & Earthquake Data",
    url: "https://earthquakescanada.nrcan.gc.ca/",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["canada"],
    priority: 10,
    freshness: "Real-time earthquake catalog; hazard maps updated seasonally",
    reliability: "Very high; official Natural Resources Canada seismic network",
    rateLimit: "Public API, cache 5 minutes",
    notes: "Real-time earthquake locations and magnitudes plus seismic hazard assessment (475-year return period PGA) for Canada's seismically active regions.",
    integrated: false,
    resolution: "National earthquake network and hazard grid",
    updateCadence: "continuous",
  },
  // Phase 3 Australia pack providers
  {
    id: "geoscience-australia",
    name: "Geoscience Australia Hazards",
    url: "https://www.ga.gov.au/",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["australia-nz"],
    priority: 10,
    freshness: "Static hazard maps; updated as new studies published",
    reliability: "Very high; official Geoscience Australia hazard assessment",
    rateLimit: "Public API, cache 24 hours (static data)",
    notes: "Multi-hazard assessment including earthquake hazard (475-year PGA), flood risk, and landslide susceptibility for all of Australia.",
    integrated: false,
    resolution: "National hazard grid",
    updateCadence: "annual",
  },
  {
    id: "bom-australia",
    name: "Bureau of Meteorology Weather & Cyclones",
    url: "https://www.bom.gov.au/",
    domains: ["weather"],
    accessType: "api",
    coverage: ["australia-nz"],
    priority: 10,
    freshness: "Real-time weather; 30-minute observation updates; cyclone alerts real-time",
    reliability: "Very high; official Bureau of Meteorology network",
    rateLimit: "Public API, cache 10 minutes",
    notes: "Real-time weather observations and alerts from 600+ stations across Australia, including cyclone warnings and severe weather alerts.",
    integrated: false,
    resolution: "Station-level (600+ stations across Australia)",
    updateCadence: "continuous",
  },
  {
    id: "bureau-water-resources",
    name: "Bureau of Water Resources Hydrology",
    url: "https://www.bom.gov.au/water/",
    domains: ["hydrology"],
    accessType: "api",
    coverage: ["australia-nz"],
    priority: 10,
    freshness: "Real-time; 15-30 minute station updates",
    reliability: "High; official Bureau of Meteorology water monitoring network",
    rateLimit: "Public API, cache 5 minutes",
    notes: "Real-time discharge and water-level data from 2,000+ monitoring stations across Australian rivers and watersheds.",
    integrated: false,
    resolution: "Station-level (2k+ stations across Australian watersheds)",
    updateCadence: "continuous",
  },
  {
    id: "npi-air-quality",
    name: "NPI Air Quality Monitoring",
    url: "https://www.npi.gov.au/",
    domains: ["environmental"],
    accessType: "api",
    coverage: ["australia-nz"],
    priority: 10,
    freshness: "Real-time; 15-30 minute updates from active stations",
    reliability: "High; official National Pollution Inventory monitoring network",
    rateLimit: "Public API, cache 10 minutes",
    notes: "Real-time air quality data from 300+ monitoring stations with AQI and pollutant concentrations (O3, NO2, PM2.5, PM10, SO2, CO).",
    integrated: false,
    resolution: "Station-level (300+ stations in major Australian cities)",
    updateCadence: "continuous",
  },
  // Phase 3 South America pack providers
  {
    id: "inpe-deforestation",
    name: "INPE Deforestation Monitoring (Amazon & Atlantic Forest)",
    url: "https://www.inpe.gov.br/",
    domains: ["land_cover", "hazards"],
    accessType: "api",
    coverage: ["latin-america"],
    priority: 10,
    freshness: "Daily alerts; satellite monitoring real-time",
    reliability: "Very high; official Instituto Nacional de Pesquisas Espaciais (Brazilian space agency)",
    rateLimit: "Public API, cache 24 hours (daily alerts)",
    notes: "Real-time satellite deforestation monitoring for Amazon and Atlantic Forest with daily alert processing and risk assessment.",
    integrated: false,
    resolution: "30m satellite pixels (PRODES program)",
    updateCadence: "daily",
  },
  {
    id: "mapbiomas-lulc",
    name: "MapBiomas Land Use/Land Cover",
    url: "https://mapbiomas.org/",
    domains: ["land_cover"],
    accessType: "api",
    coverage: ["latin-america"],
    priority: 10,
    freshness: "Annual updates; 1-year lag in processing",
    reliability: "High; collaborative open-source platform with peer-reviewed methodology",
    rateLimit: "Public API, cache 1 year (annual maps)",
    notes: "Annual LULC classification with 1m spatial resolution covering entire South American continent (Brazil, Amazon Basin, Atlantic Forest).",
    integrated: false,
    resolution: "1m pixel classification",
    updateCadence: "annual",
  },
  {
    id: "usgs-seismic-sa",
    name: "USGS Earthquake & Seismic Hazard (South America)",
    url: "https://earthquake.usgs.gov/",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["latin-america"],
    priority: 10,
    freshness: "Real-time earthquake catalog; hazard maps periodic",
    reliability: "Very high; official USGS Earthquake Hazards Program",
    rateLimit: "Public API, cache 5 minutes",
    notes: "Real-time earthquake locations, magnitudes, and depths plus seismic hazard assessment for South America's active zones (Peru, Chile, Colombia, Ecuador).",
    integrated: false,
    resolution: "Point-source earthquakes; national hazard grid",
    updateCadence: "continuous",
  },
  {
    id: "noaa-weather-hazards-sa",
    name: "NOAA Weather Hazards & Cyclones (South America)",
    url: "https://www.noaa.gov/",
    domains: ["weather", "hazards"],
    accessType: "api",
    coverage: ["latin-america"],
    priority: 10,
    freshness: "Real-time warnings and forecasts",
    reliability: "Very high; official NOAA/National Weather Service",
    rateLimit: "Public API, cache 3 minutes",
    notes: "Real-time tropical cyclone forecasts, severe weather warnings, and climate hazard alerts (flooding, drought, heat) for South America.",
    integrated: false,
    resolution: "Continental-scale hazard assessment",
    updateCadence: "continuous",
  },
  // Phase 3 MENA pack providers
  {
    id: "usgs-seismic-mena",
    name: "USGS Earthquake & Seismic Hazard (MENA)",
    url: "https://earthquake.usgs.gov/",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["middle-east", "africa"],
    priority: 10,
    freshness: "Real-time earthquake catalog",
    reliability: "Very high; official USGS Earthquake Hazards Program",
    rateLimit: "Public API, cache 5 minutes",
    notes: "Real-time earthquake locations and magnitudes for seismically active MENA zones (Turkey, Iran, Morocco, East Africa Rift).",
    integrated: false,
    resolution: "Point-source earthquakes",
    updateCadence: "continuous",
  },
  {
    id: "mena-dust-air",
    name: "MENA Air Quality & Dust Monitoring",
    url: "https://dust-monitor.org/",
    domains: ["environmental", "weather"],
    accessType: "api",
    coverage: ["middle-east", "africa"],
    priority: 10,
    freshness: "Real-time observations; dust alerts daily",
    reliability: "High; regional air quality networks and satellite monitoring",
    rateLimit: "Public API, cache 10 minutes",
    notes: "Real-time air quality and Saharan dust storm monitoring (PM2.5, PM10, AQI, visibility) critical for MENA region.",
    integrated: false,
    resolution: "Station-level and continental dust grids",
    updateCadence: "continuous",
  },
  {
    id: "mena-water-resources",
    name: "MENA Water Resources (Nile & Rivers)",
    url: "https://nbi.nile.org/",
    domains: ["hydrology"],
    accessType: "api",
    coverage: ["middle-east", "africa"],
    priority: 10,
    freshness: "Real-time; 15-30 minute station updates",
    reliability: "High; Nile Basin Initiative and national water agencies",
    rateLimit: "Public API, cache 5 minutes",
    notes: "Real-time discharge and water-level data from Nile and major MENA rivers (critical for water-scarce regions).",
    integrated: false,
    resolution: "Station-level (Nile, Tigris, Euphrates, Jordan)",
    updateCadence: "continuous",
  },
  {
    id: "mena-weather",
    name: "MENA Regional Weather & Alerts",
    url: "https://www.noaa.gov/",
    domains: ["weather"],
    accessType: "api",
    coverage: ["middle-east", "africa"],
    priority: 10,
    freshness: "Real-time weather and hourly updates; alerts immediate",
    reliability: "Very high; NOAA, WMO, regional meteorological services",
    rateLimit: "Public API, cache 10 minutes",
    notes: "Real-time temperature, wind, humidity, and alerts for heat waves, dust storms, and extreme weather in MENA region.",
    integrated: false,
    resolution: "Regional meteorological grid",
    updateCadence: "continuous",
  },
  // Phase 3 China pack providers
  {
    id: "cenc-seismic",
    name: "CENC Earthquake & Seismic Hazard",
    url: "https://www.cenc.ac.cn/",
    domains: ["hazards"],
    accessType: "api",
    coverage: ["east-asia"],
    priority: 10,
    freshness: "Real-time earthquake catalog",
    reliability: "Very high; official China Earthquake Networks Center",
    rateLimit: "Public API, cache 5 minutes",
    notes: "Real-time earthquake locations and magnitudes for seismically active zones (western China, Himalayan region).",
    integrated: false,
    resolution: "Point-source earthquakes",
    updateCadence: "continuous",
  },
  {
    id: "cma-weather",
    name: "CMA Weather Observations & Alerts",
    url: "https://www.cma.cn/",
    domains: ["weather"],
    accessType: "api",
    coverage: ["east-asia"],
    priority: 10,
    freshness: "Real-time weather; 30-minute updates from 2,500+ stations",
    reliability: "Very high; official China Meteorological Administration",
    rateLimit: "Public API, cache 10 minutes",
    notes: "Real-time weather observations and typhoon/rainstorm alerts from 2,500+ stations nationwide.",
    integrated: false,
    resolution: "Station-level (2.5k+ stations across China)",
    updateCadence: "continuous",
  },
  {
    id: "china-water-resources",
    name: "China Water Resources (Yellow River, Yangtze)",
    url: "https://www.mwr.gov.cn/",
    domains: ["hydrology"],
    accessType: "api",
    coverage: ["east-asia"],
    priority: 10,
    freshness: "Real-time; 15-30 minute station updates",
    reliability: "High; official Ministry of Water Resources monitoring network",
    rateLimit: "Public API, cache 5 minutes",
    notes: "Real-time discharge and water-level data from 3,000+ stations (Yellow River, Yangtze, major rivers).",
    integrated: false,
    resolution: "Station-level (3k+ stations across major watersheds)",
    updateCadence: "continuous",
  },
  {
    id: "china-air-quality",
    name: "China Air Quality (Ministry of Ecology & Environment)",
    url: "https://www.mee.gov.cn/",
    domains: ["environmental"],
    accessType: "api",
    coverage: ["east-asia"],
    priority: 10,
    freshness: "Real-time; hourly updates from 1,000+ stations",
    reliability: "Very high; official Ministry of Ecology and Environment network",
    rateLimit: "Public API, cache 10 minutes",
    notes: "Real-time AQI and pollutant concentrations (PM2.5, PM10, O3, NO2, SO2, CO) from 1,000+ stations nationwide.",
    integrated: false,
    resolution: "Station-level (1k+ stations in cities across China)",
    updateCadence: "continuous",
  },
  // Phase 3 Europe pack providers
  {
    id: "copernicus-weather",
    name: "Copernicus Climate Data Store (ERA5-Land)",
    url: "https://cds.climate.copernicus.eu/",
    domains: ["weather"],
    accessType: "api",
    coverage: ["europe"],
    priority: 10,
    freshness: "Real-time to monthly reanalysis; hourly resolution",
    reliability: "Very high; official EU Copernicus climate service",
    rateLimit: "Free open access (CC4.0), cache 30 minutes",
    notes: "ERA5-Land reanalysis climate data covering temperature, humidity, wind, precipitation, soil moisture across Europe.",
    integrated: false,
    resolution: "~9 km grid",
    updateCadence: "continuous",
  },
  {
    id: "copernicus-flood-hazard",
    name: "Copernicus Emergency Management Service (Flood Hazard)",
    url: "https://emergency.copernicus.eu/",
    domains: ["hazards"],
    accessType: "tile_service",
    coverage: ["europe"],
    priority: 10,
    freshness: "Real-time flood forecasts; 10-day horizon (EFAS)",
    reliability: "Very high; official EU emergency response service",
    rateLimit: "Free open access, cache 6 hours",
    notes: "European Flood Awareness System (EFAS) providing real-time flood inundation mapping and river discharge forecasts.",
    integrated: false,
    resolution: "5 km grid (discharge forecasts), inundation maps",
    updateCadence: "continuous",
  },
  {
    id: "copernicus-land-cover",
    name: "Copernicus Land Monitoring Service (CLMS)",
    url: "https://land.copernicus.eu/en",
    domains: ["land_cover"],
    accessType: "tile_service",
    coverage: ["europe"],
    priority: 10,
    freshness: "Annual land cover classification; Sentinel-derived",
    reliability: "Very high; official Copernicus satellite land monitoring",
    rateLimit: "Free open access (CC4.0), cache 7 days",
    notes: "Pan-European Land Cover Classification (22-class LCCS) from Sentinel-2 satellites, updated annually.",
    integrated: false,
    resolution: "10 m (Sentinel-2 native)",
    updateCadence: "annual",
  },
  {
    id: "dwd-weather",
    name: "DWD Weather Observations (German Meteorological Service)",
    url: "https://opendata.dwd.de/",
    domains: ["weather"],
    accessType: "api",
    coverage: ["europe"],
    priority: 10,
    freshness: "Real-time; 10-minute weather station updates",
    reliability: "Very high; official German national meteorological authority",
    rateLimit: "Open data (CC4.0), cache 10 minutes",
    notes: "Real-time weather observations from 400+ automated weather stations (AWS) across German meteorological service network, representative of EU national services.",
    integrated: false,
    resolution: "Station-level (~400 DWD stations + regional network)",
    updateCadence: "continuous",
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

  if (countryCode === "CA") {
    scopes.push("canada");
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
