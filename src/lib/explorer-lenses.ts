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
      "terrain-viewer",
      "hazard-context",
      "climate-history",
      "trip-summary",
    ],
    summaryQuestion:
      "Is this a good road trip stop? Tell me what's interesting, scenic, and worth seeing here.",
    whyItMatters:
      "Surfaces nearby points of interest, terrain character, climate comfort, hazard context, and seasonal conditions.",
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
  },
];

export function getExplorerLensById(id: string): ExplorerLens | undefined {
  return EXPLORER_LENSES.find((lens) => lens.id === id);
}
