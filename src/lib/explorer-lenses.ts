import type { WorkspaceCardId } from "@/types";

export interface ExplorerLens {
  id: string;
  label: string;
  icon: string;
  tagline: string;
  profileId: string;
  defaultCards: WorkspaceCardId[];
  summaryQuestion: string;
  whyItMatters: string;
  factors?: string[];
}

export const EXPLORER_LENSES: ExplorerLens[] = [
  {
    id: "hunt-planner",
    label: "Hunt Planner",
    icon: "Target",
    tagline: "Scout terrain, access, and water before you go.",
    profileId: "hiking",
    defaultCards: [
      "active-location",
      "chat",
      "results",
      "terrain-viewer",
      "hazard-context",
      "elevation-profile",
      "flood-risk",
      "outdoor-fit",
    ],
    summaryQuestion:
      "Is this area good for hunting? Summarize terrain, access, water proximity, and hazards in plain English.",
    whyItMatters:
      "Reviews terrain ruggedness, trail and road access, water feature proximity, wildfire risk, and seasonal weather patterns.",
    factors: ["Terrain", "Wildlife", "Access", "Season", "Regulations"],
  },
  {
    id: "trail-scout",
    label: "Trail Scout",
    icon: "Trees",
    tagline: "Find out if a hike is worth it before you boot up.",
    profileId: "hiking",
    defaultCards: [
      "active-location",
      "chat",
      "results",
      "route-planner",
      "terrain-viewer",
      "elevation-profile",
      "air-quality",
      "outdoor-fit",
      "trip-summary",
    ],
    summaryQuestion:
      "Is this a good hike? Tell me about the terrain, elevation, and air quality in plain English.",
    whyItMatters:
      "Checks trail access, elevation gain, air quality, wildfire exposure, and outdoor fit score for the area.",
    factors: ["Elevation", "Surface", "Water", "Shade", "Distance"],
  },
  {
    id: "road-trip",
    label: "Road Trip",
    icon: "Map",
    tagline: "Discover what's scenic, surprising, and worth stopping for.",
    profileId: "commercial",
    defaultCards: [
      "active-location",
      "chat",
      "results",
      "route-planner",
      "terrain-viewer",
      "hazard-context",
      "climate-history",
      "trip-summary",
    ],
    summaryQuestion:
      "Is this a good road trip stop? Tell me what's interesting, scenic, and worth seeing here.",
    whyItMatters:
      "Surfaces nearby points of interest, terrain character, climate comfort, hazard context, and seasonal conditions.",
    factors: ["Distance", "Fuel", "Lodging", "Weather", "Scenery"],
  },
  {
    id: "land-quick-check",
    label: "Land Quick-Check",
    icon: "Layers",
    tagline: "Flood risk, slope, soil, and access — plain English.",
    profileId: "residential",
    defaultCards: [
      "active-location",
      "chat",
      "results",
      "hazard-context",
      "flood-risk",
      "elevation-profile",
      "air-quality",
      "outdoor-fit",
    ],
    summaryQuestion:
      "Give me a plain-English summary of this land — flood risk, terrain, and access.",
    whyItMatters:
      "Evaluates flood zone exposure, terrain slope, soil bearing signals, access routes, and air quality for the parcel.",
    factors: ["Zoning", "Flood", "Soil", "Access", "Utilities"],
  },
  {
    id: "general-explore",
    label: "General Explore",
    icon: "Compass",
    tagline: "Just look around and see what stands out.",
    profileId: "residential",
    defaultCards: [
      "active-location",
      "chat",
      "results",
      "terrain-viewer",
      "hazard-context",
      "elevation-profile",
      "air-quality",
      "flood-risk",
    ],
    summaryQuestion:
      "What's interesting or notable about this place? Give me a plain-English overview.",
    whyItMatters:
      "Checks terrain character, hazard context, flood risk, air quality, and elevation to surface what stands out.",
    factors: ["Terrain", "Hazards", "Climate", "Infrastructure", "Culture"],
  },
  {
    id: "energy-solar",
    label: "Energy & Solar",
    icon: "Zap",
    tagline: "Solar resource, wind potential, and grid proximity.",
    profileId: "energy-solar",
    factors: ["Solar", "Wind", "Transmission", "Land use", "Permits"],
    defaultCards: [
      "active-location",
      "chat",
      "results",
      "terrain-viewer",
      "climate-history",
      "hazard-context",
      "air-quality",
    ],
    summaryQuestion:
      "How suitable is this location for a solar or wind energy project? Summarize solar resource, grid access, and land constraints.",
    whyItMatters:
      "Evaluates solar irradiance proxies, grid and transmission proximity, terrain flatness, land cover suitability, and construction access.",
  },
  {
    id: "agriculture",
    label: "Agriculture & Land",
    icon: "Leaf",
    tagline: "Soil quality, water access, and growing conditions.",
    profileId: "agriculture",
    factors: ["Soil", "Water", "Climate", "Topography", "Markets"],
    defaultCards: [
      "active-location",
      "chat",
      "results",
      "hazard-context",
      "flood-risk",
      "climate-history",
      "elevation-profile",
    ],
    summaryQuestion:
      "Is this land suitable for farming or agriculture? Summarize soil quality, water access, and growing conditions.",
    whyItMatters:
      "Evaluates soil drainage and buildability, water proximity, climate growing-season signals, terrain slope, and road access to markets.",
  },
  {
    id: "emergency-response",
    label: "Emergency Response",
    icon: "ShieldAlert",
    tagline: "Access routes, population exposure, and facility gaps.",
    profileId: "emergency-response",
    factors: ["Access", "Population", "Hazards", "Facilities", "Comms"],
    defaultCards: [
      "active-location",
      "chat",
      "results",
      "hazard-context",
      "flood-risk",
      "wildfire-risk",
      "disaster-alerts",
    ],
    summaryQuestion:
      "How well-prepared is this area for emergency response? Summarize access, hazard exposure, and infrastructure gaps.",
    whyItMatters:
      "Evaluates road network density, population concentration proxies, hazard exposure, communications readiness, and critical infrastructure proximity.",
  },
  {
    id: "field-research",
    label: "Field Research",
    icon: "FlaskConical",
    tagline: "Habitat quality, ecological diversity, and site access.",
    profileId: "field-research",
    factors: ["Habitat", "Species", "Protection", "Access", "Monitoring"],
    defaultCards: [
      "active-location",
      "chat",
      "results",
      "terrain-viewer",
      "elevation-profile",
      "air-quality",
      "climate-history",
    ],
    summaryQuestion:
      "Is this a good field research site? Summarize habitat quality, ecological diversity signals, and access conditions.",
    whyItMatters:
      "Evaluates natural land cover, aquatic feature proximity, topographic diversity, climate stability, and field access via road proximity.",
  },
];

export function getExplorerLensById(id: string): ExplorerLens | undefined {
  return EXPLORER_LENSES.find((lens) => lens.id === id);
}
