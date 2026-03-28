import {
  COMMERCIAL_DEMO_SITES,
  DEMO_SITE_SEEDS,
  HIKING_DEMO_SITES,
  RESIDENTIAL_DEMO_SITES,
} from "@/lib/demo-data";
import { MissionProfile } from "@/types";

export const PROFILES: MissionProfile[] = [
  {
    id: "data-center",
    name: "Data Center Cooling",
    icon: "Server",
    tagline: "Water, power, and thermal efficiency",
    description:
      "Evaluate sites for data center cooling with an emphasis on water access, power infrastructure, terrain, and climate. This profile preserves the original Pacific Northwest demo logic and scoring.",
    accentColor: "#00e5ff",
    factors: [
      {
        key: "waterProximity",
        label: "Water source proximity",
        weight: 0.3,
        scoreFn: "distance",
        params: { source: "water", idealKm: 1, cutoffKm: 15, direction: "near" },
        description: "Shorter distances to reliable water sources score higher.",
      },
      {
        key: "terrain",
        label: "Elevation & flatness",
        weight: 0.15,
        scoreFn: "elevation",
        params: { mode: "cooling" },
        description: "Flatter, lower-elevation sites are easier to develop and cool.",
      },
      {
        key: "powerInfrastructure",
        label: "Power infrastructure",
        weight: 0.2,
        scoreFn: "distance",
        params: { source: "power", idealKm: 2, cutoffKm: 20, direction: "near" },
        description: "Close proximity to substations or transmission corridors reduces utility friction.",
      },
      {
        key: "climate",
        label: "Climate suitability",
        weight: 0.15,
        scoreFn: "climate",
        params: { mode: "cooling" },
        description: "Cooler average temperatures and lower cooling demand improve suitability.",
      },
      {
        key: "transportation",
        label: "Road transportation",
        weight: 0.1,
        scoreFn: "distance",
        params: { source: "road", idealKm: 2, cutoffKm: 18, direction: "near" },
        description: "Closer road access helps with construction and operations logistics.",
      },
      {
        key: "landClassification",
        label: "Land classification",
        weight: 0.1,
        scoreFn: "landcover",
        params: { mode: "developed" },
        description: "Previously developed, industrial, or barren land is favored.",
      },
    ],
    systemPrompt:
      "You are a geospatial intelligence expert focused on data center cooling and digital infrastructure siting. Prioritize water access, power grid adjacency, terrain buildability, climate suitability, and environmental constraints. Be explicit about what is supported by geodata versus what still needs permitting, engineering, or utility diligence.",
    defaultLayers: { water: true, power: true, roads: true, heatmap: false },
    exampleQuestions: [
      "Can this site support evaporative cooling?",
      "How far is the nearest substation or transmission corridor?",
      "What cooling risks stand out here?",
      "Would this work for a hyperscale campus?",
    ],
    demoSites: DEMO_SITE_SEEDS,
    recommendationBands: [
      { min: 85, text: "Excellent data-center cooling candidate with strong infrastructure alignment." },
      { min: 70, text: "Promising cooling site with a few constraints to validate in due diligence." },
      { min: 55, text: "Potentially viable only if permitting, grading, or utility issues are solved." },
      { min: 0, text: "Weak cooling-site fit compared with stronger regional benchmarks." },
    ],
  },
  {
    id: "hiking",
    name: "Hiking / Recreation",
    icon: "Trees",
    tagline: "Trails, views, water, and remoteness",
    description:
      "Use this lens to evaluate day-hike or outdoor recreation potential based on terrain variety, vegetation, water features, access, and climate comfort.",
    accentColor: "#5be49b",
    factors: [
      {
        key: "terrainVariety",
        label: "Terrain variety",
        weight: 0.25,
        scoreFn: "custom",
        params: { metric: "terrainVariety" },
        description: "Moderate elevation gain and terrain variety improve hiking appeal.",
      },
      {
        key: "vegetationDensity",
        label: "Vegetation density",
        weight: 0.2,
        scoreFn: "landcover",
        params: { mode: "vegetation" },
        description: "Forested and vegetated landscapes generally increase recreation value.",
      },
      {
        key: "waterFeatures",
        label: "Water features nearby",
        weight: 0.2,
        scoreFn: "distance",
        params: { source: "water", idealKm: 0.5, cutoffKm: 12, direction: "near" },
        description: "Waterfalls, rivers, lakes, and streams increase trail destination value.",
      },
      {
        key: "remoteness",
        label: "Distance from urban areas",
        weight: 0.15,
        scoreFn: "custom",
        params: { metric: "remoteness" },
        description: "A modest buffer from major roads can improve the feeling of remoteness.",
      },
      {
        key: "trailAccess",
        label: "Trail access / road proximity",
        weight: 0.1,
        scoreFn: "distance",
        params: { source: "road", idealKm: 1.5, cutoffKm: 14, direction: "near" },
        description: "Access is still important for trailheads and day-use logistics.",
      },
      {
        key: "weather",
        label: "Climate / weather",
        weight: 0.1,
        scoreFn: "climate",
        params: { mode: "outdoor" },
        description: "Moderate temperatures and manageable precipitation support broader usability.",
      },
    ],
    systemPrompt:
      "You are a geospatial intelligence expert focused on hiking, trail planning, and outdoor recreation suitability. Emphasize terrain character, water features, vegetation, access, remoteness, and weather comfort. When uncertainty exists, make it clear whether you are using direct geodata, placeholder nearby-place results, or inference about scenic and recreation value.",
    defaultLayers: { water: true, power: false, roads: true, heatmap: true },
    exampleQuestions: [
      "What's the terrain difficulty here?",
      "Are there water features for a day hike?",
      "How remote does this area feel?",
      "Would this support a scenic trail network?",
    ],
    demoSites: HIKING_DEMO_SITES,
    recommendationBands: [
      { min: 85, text: "Outstanding outdoor recreation candidate with strong terrain and scenic signals." },
      { min: 70, text: "Promising hiking area with a few access or climate tradeoffs." },
      { min: 55, text: "Usable for recreation, but not a standout trail destination without more validation." },
      { min: 0, text: "Limited recreation appeal compared with stronger hiking candidates." },
    ],
  },
  {
    id: "residential",
    name: "Residential Development",
    icon: "House",
    tagline: "Neighborhood viability and buildability",
    description:
      "Evaluate land for neighborhood-scale residential growth using access, buildability, hazard proxies, amenity signals, and general development readiness.",
    accentColor: "#ffab00",
    factors: [
      {
        key: "schoolAccess",
        label: "School district proximity",
        weight: 0.2,
        scoreFn: "custom",
        params: { metric: "schoolAccess" },
        description: "This uses nearby road and settlement proxies until live school data is added.",
      },
      {
        key: "roadTransit",
        label: "Road / transit access",
        weight: 0.2,
        scoreFn: "distance",
        params: { source: "road", idealKm: 1.5, cutoffKm: 14, direction: "near" },
        description: "Closer access supports commuting and neighborhood connectivity.",
      },
      {
        key: "buildability",
        label: "Terrain buildability",
        weight: 0.15,
        scoreFn: "elevation",
        params: { mode: "buildability" },
        description: "Moderate, more buildable terrain scores higher.",
      },
      {
        key: "hazard",
        label: "Flood / hazard proxy",
        weight: 0.15,
        scoreFn: "custom",
        params: { metric: "hazardRisk" },
        description: "Uses water adjacency and elevation as early hazard proxies.",
      },
      {
        key: "amenities",
        label: "Commercial amenities nearby",
        weight: 0.15,
        scoreFn: "custom",
        params: { metric: "amenities" },
        description: "Uses road, power, and urban land-cover signals until live amenities are connected.",
      },
      {
        key: "landClassification",
        label: "Land classification",
        weight: 0.15,
        scoreFn: "landcover",
        params: { mode: "residential" },
        description: "Avoids water-heavy land and favors mixed open or already-developed parcels.",
      },
    ],
    systemPrompt:
      "You are a geospatial intelligence expert focused on residential development and neighborhood planning. Emphasize buildability, access, hazards, amenity context, and community readiness. Be transparent that zoning, school districts, and flood designations require dedicated live layers or jurisdictional review unless they are explicitly provided.",
    defaultLayers: { water: true, power: true, roads: true, heatmap: false },
    exampleQuestions: [
      "Is this land suitable for a new neighborhood?",
      "What risks or constraints would slow housing here?",
      "How accessible is this to nearby services?",
      "Does this feel more suburban or rural?",
    ],
    demoSites: RESIDENTIAL_DEMO_SITES,
    recommendationBands: [
      { min: 85, text: "Strong residential candidate with good access and few obvious buildability issues." },
      { min: 70, text: "Promising housing site with some hazard or amenity tradeoffs to review." },
      { min: 55, text: "Possible residential site, but key infrastructure or risk constraints remain unresolved." },
      { min: 0, text: "Weak neighborhood-development fit without major infrastructure or entitlement changes." },
    ],
  },
  {
    id: "commercial",
    name: "Commercial / Warehouse",
    icon: "Warehouse",
    tagline: "Access, demand, and utility readiness",
    description:
      "Use this profile for retail, commercial, and warehouse siting questions tied to highway access, inferred commercial activity, utility proximity, and development practicality.",
    accentColor: "#a78bfa",
    factors: [
      {
        key: "trafficPopulation",
        label: "Traffic / population density",
        weight: 0.25,
        scoreFn: "custom",
        params: { metric: "commercialDemand" },
        description: "Uses road access and urbanized land-cover as an early demand proxy.",
      },
      {
        key: "freightAccess",
        label: "Highway / freight access",
        weight: 0.2,
        scoreFn: "distance",
        params: { source: "road", idealKm: 1.2, cutoffKm: 12, direction: "near" },
        description: "Closer highway corridors improve logistics and commercial throughput.",
      },
      {
        key: "commercialDensity",
        label: "Existing commercial density",
        weight: 0.15,
        scoreFn: "custom",
        params: { metric: "commercialDensity" },
        description: "Uses developed land-cover, roads, and utilities as a proxy for existing activity.",
      },
      {
        key: "landCostIndicators",
        label: "Land cost indicators",
        weight: 0.15,
        scoreFn: "custom",
        params: { metric: "landCost" },
        description: "Uses distance from core infrastructure and land-cover mix as an early cost heuristic.",
      },
      {
        key: "utilities",
        label: "Utility infrastructure",
        weight: 0.15,
        scoreFn: "distance",
        params: { source: "power", idealKm: 2, cutoffKm: 18, direction: "near" },
        description: "Commercial and warehouse operations benefit from nearby utility corridors.",
      },
      {
        key: "terrain",
        label: "Terrain flatness",
        weight: 0.1,
        scoreFn: "elevation",
        params: { mode: "buildability" },
        description: "Flatter sites reduce grading complexity for commercial build-out.",
      },
    ],
    systemPrompt:
      "You are a geospatial intelligence expert focused on retail, commercial real estate, and warehouse siting. Prioritize freight and road access, inferred demand, utility readiness, and land practicality. Be explicit when demand, traffic, or land-cost commentary is based on proxy signals rather than live demographic or parcel data.",
    defaultLayers: { water: false, power: true, roads: true, heatmap: false },
    exampleQuestions: [
      "How strong is the highway access here?",
      "Would this work for a distribution warehouse?",
      "Does this area look commercially active already?",
      "What operational constraints stand out for retail or logistics?",
    ],
    demoSites: COMMERCIAL_DEMO_SITES,
    recommendationBands: [
      { min: 85, text: "Excellent commercial or logistics candidate with strong access and utility support." },
      { min: 70, text: "Promising commercial site with manageable market or site-readiness tradeoffs." },
      { min: 55, text: "Potential fit for commercial use, but important demand or build-out questions remain." },
      { min: 0, text: "Weak commercial / warehouse fit relative to stronger corridor candidates." },
    ],
  },
];

export const DEFAULT_PROFILE = PROFILES[0];

export const PROFILE_MAP = Object.fromEntries(PROFILES.map((profile) => [profile.id, profile])) as Record<
  string,
  MissionProfile
>;

export function getProfileById(profileId: string) {
  return PROFILE_MAP[profileId] ?? DEFAULT_PROFILE;
}
