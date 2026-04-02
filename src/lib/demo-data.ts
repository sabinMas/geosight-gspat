import { DemoSiteSeed, GeodataResult, SavedSite, SiteScore } from "@/types";
import { buildSourceMeta } from "@/lib/source-metadata";

export const DEFAULT_VIEW = {
  lat: 45.7,
  lng: -121.8,
  height: 160000,
};

export const DEMO_SITE_SEEDS: DemoSiteSeed[] = [
  {
    id: "site-a",
    name: "Site A",
    coordinates: { lat: 45.5946, lng: -121.1787 },
    score: 87,
    summary: "Near The Dalles with strong water access and mature grid adjacency.",
  },
  {
    id: "site-b",
    name: "Site B",
    coordinates: { lat: 45.8399, lng: -119.7069 },
    score: 72,
    summary: "Boardman corridor with balanced logistics and moderate utility density.",
  },
  {
    id: "site-c",
    name: "Site C",
    coordinates: { lat: 47.4235, lng: -120.3103 },
    score: 65,
    summary: "Wenatchee-adjacent site with river access offset by mountainous terrain.",
  },
];

export const HIKING_DEMO_SITES: DemoSiteSeed[] = [
  {
    id: "hike-hood",
    name: "Mt. Hood Foothills",
    coordinates: { lat: 45.3735, lng: -121.6959 },
    score: 84,
    summary: "Forest trails and elevation gain near Mount Hood with strong day-hike appeal.",
  },
  {
    id: "hike-olympic",
    name: "Olympic Peninsula",
    coordinates: { lat: 47.8021, lng: -123.6044 },
    score: 88,
    summary: "Remote, water-rich terrain with strong scenic and wilderness potential.",
  },
  {
    id: "hike-gorge",
    name: "Gorge Trail Corridor",
    coordinates: { lat: 45.6628, lng: -121.9046 },
    score: 79,
    summary: "Columbia Gorge trail zone balancing access, views, and terrain variety.",
  },
];

export const RESIDENTIAL_DEMO_SITES: DemoSiteSeed[] = [
  {
    id: "res-redmond",
    name: "Redmond Growth Edge",
    coordinates: { lat: 47.6837, lng: -122.1215 },
    score: 76,
    summary: "Eastside suburban growth area with strong access to jobs and services.",
  },
  {
    id: "res-vancouver",
    name: "Vancouver Neighborhood Belt",
    coordinates: { lat: 45.6387, lng: -122.6615 },
    score: 73,
    summary: "Buildable suburban land with regional access and neighborhood expansion potential.",
  },
  {
    id: "res-salem",
    name: "Salem Periphery",
    coordinates: { lat: 44.9392, lng: -123.0331 },
    score: 70,
    summary: "Metro-adjacent development area with mixed amenities and permitting considerations.",
  },
];

export const COMMERCIAL_DEMO_SITES: DemoSiteSeed[] = [
  {
    id: "com-kent",
    name: "Kent Valley Corridor",
    coordinates: { lat: 47.3809, lng: -122.2348 },
    score: 82,
    summary: "Industrial and logistics corridor with strong highway and warehouse access.",
  },
  {
    id: "com-tukwila",
    name: "Tukwila Trade Zone",
    coordinates: { lat: 47.4749, lng: -122.272 },
    score: 78,
    summary: "Retail-commercial node with access to major highways and dense activity patterns.",
  },
  {
    id: "com-boardman",
    name: "Boardman Freight Edge",
    coordinates: { lat: 45.8399, lng: -119.7069 },
    score: 75,
    summary: "Freight-oriented corridor with utility access and regional logistics advantages.",
  },
];

export const TOKYO_DEMO_SITES: DemoSiteSeed[] = [
  {
    id: "tokyo-marunouchi",
    name: "Marunouchi Core",
    coordinates: { lat: 35.6812, lng: 139.7671 },
    score: 84,
    summary: "Dense office and rail-connected commercial core around Tokyo Station.",
  },
  {
    id: "tokyo-shinagawa",
    name: "Shinagawa Gateway",
    coordinates: { lat: 35.6285, lng: 139.7387 },
    score: 81,
    summary: "Rail and business corridor linking central Tokyo to airport-oriented access.",
  },
  {
    id: "tokyo-yokohama",
    name: "Yokohama Port District",
    coordinates: { lat: 35.454, lng: 139.638 },
    score: 79,
    summary: "Port-side logistics and commercial activity south of central Tokyo.",
  },
];

function buildDemoScore(total: number, notes: string[]): SiteScore {
  const factorBase = [
    { key: "waterProximity", label: "Cooling water access", weight: 0.26, score: total + 5 },
    { key: "terrain", label: "Elevation & flatness", weight: 0.12, score: total - 4 },
    { key: "powerInfrastructure", label: "Power infrastructure", weight: 0.18, score: total + 2 },
    { key: "climate", label: "Climate suitability", weight: 0.13, score: total - 1 },
    { key: "transportation", label: "Road transportation", weight: 0.08, score: total - 6 },
    { key: "landClassification", label: "Land classification", weight: 0.08, score: total - 8 },
    { key: "broadbandConnectivity", label: "Broadband readiness", weight: 0.1, score: total - 3 },
    { key: "floodRisk", label: "Flood risk", weight: 0.02, score: total + 1 },
    { key: "contaminationRisk", label: "Contamination risk", weight: 0.03, score: total + 2 },
  ] as const;

  return {
    total,
    recommendation: notes[0] ?? "Balanced site with manageable infrastructure trade-offs.",
    factors: factorBase.map((factor, index) => ({
      ...factor,
      score: Math.min(Math.max(Math.round(factor.score), 0), 100),
      detail: notes[index] ?? "Fallback demo note",
    })),
    broadband: {
      kind: "address_availability",
      granularity: "address",
      regionLabel: null,
      referenceYear: null,
      maxDownloadSpeed: 1_000,
      maxUploadSpeed: 100,
      providerCount: 2,
      technologies: ["fiber", "cable"],
      fixedBroadbandCoveragePercent: null,
      mobileBroadbandCoveragePercent: null,
      score: Math.min(Math.max(Math.round(total - 3), 0), 100),
    },
  };
}

function buildDemoGeodata(siteName: string): GeodataResult {
  const isMountainSite = siteName === "Site C";

  return {
    elevationMeters: isMountainSite ? 238 : siteName === "Site B" ? 102 : 78,
    nearestWaterBody: {
      name: "Columbia River",
      distanceKm: isMountainSite ? 1.9 : 0.7,
    },
    nearestRoad: {
      name: siteName === "Site A" ? "I-84" : siteName === "Site B" ? "I-82" : "US-2",
      distanceKm: isMountainSite ? 3.2 : 1.4,
    },
    nearestPower: {
      name: siteName === "Site A" ? "Google/The Dalles Utility Corridor" : "Regional transmission line",
      distanceKm: siteName === "Site B" ? 4.2 : 2.1,
    },
    climate: {
      currentTempC: 12.4,
      averageTempC: 11.8,
      dailyHighTempC: 18.2,
      dailyLowTempC: 6.1,
      coolingDegreeDays: 214,
      precipitationMm: siteName === "Site C" ? 278 : 323,
      windSpeedKph: 9.8,
      airQualityIndex: 42,
      weatherRiskSummary: null,
    },
    hazards: {
      earthquakeCount30d: 4,
      strongestEarthquakeMagnitude30d: 2.1,
      nearestEarthquakeKm: 36.4,
      activeFireCount7d: 0,
      nearestFireKm: null,
    },
    demographics: {
      countyName: "Demo County",
      stateCode: "OR",
      population: null,
      medianHouseholdIncome: null,
      medianHomeValue: null,
      geographicGranularity: "county",
      populationReferenceYear: null,
      incomeReferenceYear: null,
      incomeDefinition: null,
    },
    amenities: {
      schoolCount: 8,
      healthcareCount: 3,
      foodAndDrinkCount: 14,
      transitStopCount: 11,
      parkCount: 6,
      trailheadCount: 2,
      commercialCount: 12,
    },
    broadband: {
      kind: "address_availability" as const,
      granularity: "address" as const,
      regionLabel: null,
      referenceYear: null,
      maxDownloadSpeed: isMountainSite ? 250 : siteName === "Site B" ? 500 : 1_000,
      maxUploadSpeed: isMountainSite ? 25 : siteName === "Site B" ? 50 : 100,
      providerCount: isMountainSite ? 1 : 2,
      technologies: isMountainSite ? ["fixed_wireless"] : ["fiber", "cable"],
      hasFiber: !isMountainSite,
      fixedBroadbandCoveragePercent: null,
      mobileBroadbandCoveragePercent: null,
    },
    floodZone: {
      floodZone: isMountainSite ? "AE" : "X",
      isSpecialFloodHazard: isMountainSite,
      label: isMountainSite
        ? "Zone AE Special Flood Hazard Area"
        : "Zone X - area of minimal flood hazard",
    },
    streamGauges: [
      {
        siteNumber: isMountainSite ? "14113200" : "14105700",
        siteName: isMountainSite ? "Mosier Creek near Mosier OR" : "Columbia River at The Dalles OR",
        dischargeCfs: isMountainSite ? 182 : 162_000,
        drainageAreaSqMi: isMountainSite ? 41.5 : 237_000,
        distanceKm: isMountainSite ? 7.4 : 3.1,
      },
    ],
    groundwater: {
      wells: [],
      nearestWell: null,
      wellCount: 0,
    },
    soilProfile: null,
    seismicDesign: null,
    climateHistory: null,
    airQuality: {
      stationName: isMountainSite ? "Wenatchee Valley monitor" : "The Dalles monitor",
      distanceKm: isMountainSite ? 18.4 : 12.2,
      pm25: isMountainSite ? 11.2 : 7.4,
      pm10: isMountainSite ? 20.6 : 14.3,
      aqiCategory: "Good",
    },
    epaHazards: {
      superfundCount: isMountainSite ? 1 : 0,
      triCount: siteName === "Site B" ? 2 : 1,
      nearestSuperfundName: isMountainSite ? "Regional cleanup site" : null,
      nearestSuperfundDistanceKm: isMountainSite ? 18.6 : null,
    },
    hazardAlerts: null,
    weatherForecast: [],
    schoolContext: {
      coverageStatus: "state_accountability_supported",
      score: 79,
      band: "Promising",
      explanation: "Demo-only school context for the preloaded Pacific Northwest showcase.",
      nearbySchoolCount: 8,
      nearestSchoolDistanceKm: 1.1,
      matchedOfficialSchoolCount: 2,
    },
    landClassification: [
      { label: "Barren/Industrial", value: 36, confidence: 0.78, color: "#ffab00" },
      { label: "Vegetation", value: siteName === "Site C" ? 44 : 28, confidence: 0.71, color: "#5be49b" },
      { label: "Water", value: 10, confidence: 0.66, color: "#00e5ff" },
      { label: "Urban", value: 18, confidence: 0.64, color: "#b7c5d3" },
    ],
    sources: {
      elevation: buildSourceMeta({
        id: "demo-elevation",
        label: "Elevation",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Showcase-only demo data to illustrate the original cooling walkthrough.",
      }),
      infrastructure: buildSourceMeta({
        id: "demo-infrastructure",
        label: "Infrastructure and access",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Showcase-only demo data to illustrate starter comparison behavior.",
      }),
      climate: buildSourceMeta({
        id: "demo-climate",
        label: "Weather and air quality",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo climate context for the preloaded cooling scenario.",
      }),
      hazards: buildSourceMeta({
        id: "demo-hazards",
        label: "Hazard context",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo hazard context for the preloaded cooling scenario.",
      }),
      hazardFire: buildSourceMeta({
        id: "demo-hazard-fire",
        label: "Active fire detections",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo fire context for the preloaded cooling scenario.",
      }),
      demographics: buildSourceMeta({
        id: "demo-demographics",
        label: "Demographics",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo demographic context for the preloaded cooling scenario.",
      }),
      amenities: buildSourceMeta({
        id: "demo-amenities",
        label: "Amenities and activity",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo amenity context for the preloaded cooling scenario.",
      }),
      school: buildSourceMeta({
        id: "demo-school",
        label: "School context",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo-only school context to keep showcase objects schema-complete.",
      }),
      landClassification: buildSourceMeta({
        id: "demo-land-cover",
        label: "Land cover estimate",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo land-cover context for the preloaded cooling scenario.",
      }),
      broadband: buildSourceMeta({
        id: "demo-broadband",
        label: "Broadband availability",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo-only broadband context to keep showcase objects schema-complete.",
      }),
      floodZone: buildSourceMeta({
        id: "demo-flood-zone",
        label: "Flood zone",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo-only FEMA-style flood context for the cooling showcase.",
      }),
      water: buildSourceMeta({
        id: "demo-water",
        label: "Stream gauges",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo-only stream gauge context for the cooling showcase.",
      }),
      groundwater: buildSourceMeta({
        id: "demo-groundwater",
        label: "Groundwater levels",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo-only groundwater context to keep showcase objects schema-complete.",
      }),
      soilProfile: buildSourceMeta({
        id: "demo-soil-profile",
        label: "Soil profile",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo-only soil context to keep showcase objects schema-complete.",
      }),
      seismicDesign: buildSourceMeta({
        id: "demo-seismic-design",
        label: "Seismic design parameters",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo-only seismic context to keep showcase objects schema-complete.",
      }),
      climateHistory: buildSourceMeta({
        id: "demo-climate-history",
        label: "Historical climate trends",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo-only climate-history context to keep showcase objects schema-complete.",
      }),
      airQuality: buildSourceMeta({
        id: "demo-air-quality",
        label: "Air quality stations",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo-only air-quality context for the cooling showcase.",
      }),
      epaHazards: buildSourceMeta({
        id: "demo-epa-hazards",
        label: "Contamination screening",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo-only EPA-style contamination context for the cooling showcase.",
      }),
      hazardAlerts: buildSourceMeta({
        id: "demo-hazard-alerts",
        label: "Active hazard alerts",
        provider: "GeoSight demo overlay",
        status: "limited",
        freshness: "Static showcase seed",
        coverage: "Pacific Northwest demo only",
        confidence: "Demo-only hazard alert context to keep showcase objects schema-complete.",
      }),
    },
    sourceNotes: [
      "Preloaded showcase data for the Pacific Northwest cooling center scenario.",
      "Replace with live API calls after providing Cesium Ion and Groq credentials.",
    ],
  };
}

export const PRELOADED_SITES: SavedSite[] = DEMO_SITE_SEEDS.map((site) => {
  const score =
    site.id === "site-a"
      ? buildDemoScore(87, [
          "Excellent access to Columbia River cooling water and hyperscale-adjacent power.",
          "Low floodplain-adjacent elevation with mostly flat developable parcels.",
          "Existing data center and substation corridor shortens utility lead time.",
          "Dry, cool shoulder seasons support free-air cooling opportunities.",
          "Interstate access is strong but heavy-load ingress still needs parcel review.",
          "Existing industrial mix is favorable relative to forest and cropland constraints.",
        ])
      : site.id === "site-b"
        ? buildDemoScore(72, [
            "Reliable river access, though intake routing is less direct than The Dalles.",
            "Broad flat terrain with wind exposure but manageable grading needs.",
            "Moderate transmission proximity with fewer hyperscale precedents.",
            "Climate profile remains workable for evaporative and hybrid cooling.",
            "Good freight access via regional highways and rail adjacencies.",
            "More mixed agricultural land cover creates entitlement friction.",
          ])
        : buildDemoScore(65, [
            "Strong river adjacency but hydraulic routing is more terrain constrained.",
            "Mountain foothill topography pushes grading and stormwater complexity upward.",
            "Power availability exists, though extension and redundancy may cost more.",
            "Cooler temperatures help, but snow and slope conditions complicate operations.",
            "Regional road access is acceptable but not ideal for heavy industrial turnover.",
            "Vegetation-heavy parcels reduce near-term site readiness.",
          ]);

  return {
    id: site.id,
    name: site.name,
    regionName: site.summary,
    profileId: "data-center",
    coordinates: site.coordinates,
    geodata: buildDemoGeodata(site.name),
    score,
  };
});
