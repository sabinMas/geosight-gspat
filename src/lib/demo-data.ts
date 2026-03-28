import { DemoSiteSeed, GeodataResult, SavedSite, SiteScore } from "@/types";

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

function buildDemoScore(total: number, notes: string[]): SiteScore {
  const factorBase = [
    { key: "waterProximity", label: "Water source proximity", weight: 0.3, score: total + 5 },
    { key: "terrain", label: "Elevation & flatness", weight: 0.15, score: total - 4 },
    { key: "powerInfrastructure", label: "Power infrastructure", weight: 0.2, score: total + 2 },
    { key: "climate", label: "Climate suitability", weight: 0.15, score: total - 1 },
    { key: "transportation", label: "Road transportation", weight: 0.1, score: total - 6 },
    { key: "landClassification", label: "Land classification", weight: 0.1, score: total - 8 },
  ] as const;

  return {
    total,
    recommendation: notes[0] ?? "Balanced site with manageable infrastructure trade-offs.",
    factors: factorBase.map((factor, index) => ({
      ...factor,
      score: Math.min(Math.max(Math.round(factor.score), 0), 100),
      detail: notes[index] ?? "Fallback demo note",
    })),
  };
}

function buildDemoGeodata(siteName: string): GeodataResult {
  return {
    elevationMeters: siteName === "Site C" ? 238 : siteName === "Site B" ? 102 : 78,
    nearestWaterBody: {
      name: "Columbia River",
      distanceKm: siteName === "Site C" ? 1.9 : 0.7,
    },
    nearestRoad: {
      name: siteName === "Site A" ? "I-84" : siteName === "Site B" ? "I-82" : "US-2",
      distanceKm: siteName === "Site C" ? 3.2 : 1.4,
    },
    nearestPower: {
      name: siteName === "Site A" ? "Google/The Dalles Utility Corridor" : "Regional transmission line",
      distanceKm: siteName === "Site B" ? 4.2 : 2.1,
    },
    climate: {
      averageTempC: 11.8,
      coolingDegreeDays: 214,
      precipitationMm: siteName === "Site C" ? 278 : 323,
    },
    landClassification: [
      { label: "Barren/Industrial", value: 36, confidence: 0.78, color: "#ffab00" },
      { label: "Vegetation", value: siteName === "Site C" ? 44 : 28, confidence: 0.71, color: "#5be49b" },
      { label: "Water", value: 10, confidence: 0.66, color: "#00e5ff" },
      { label: "Urban", value: 18, confidence: 0.64, color: "#b7c5d3" },
    ],
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
