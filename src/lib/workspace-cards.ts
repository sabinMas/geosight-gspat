import {
  WorkspaceCardDefinition,
  WorkspaceCardId,
  WorkspaceCardPreference,
} from "@/types";

export const WORKSPACE_CARD_REGISTRY: WorkspaceCardDefinition[] = [
  {
    id: "active-location",
    title: "Active location",
    category: "context",
    zone: "primary",
    defaultVisibility: true,
    defaultOrder: 10,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Select a place to see the current map focus and quick context.",
  },
  {
    id: "chat",
    title: "Ask GeoSight",
    category: "analysis",
    zone: "primary",
    defaultVisibility: true,
    defaultOrder: 20,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Choose a place to start asking questions.",
  },
  {
    id: "results",
    title: "Results",
    category: "analysis",
    zone: "primary",
    defaultVisibility: true,
    defaultOrder: 30,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Switch between map analysis and nearby places for the active location.",
  },
  {
    id: "score",
    title: "Mission score",
    category: "planning",
    zone: "workspace",
    defaultVisibility: true,
    defaultOrder: 40,
    requiredData: ["score"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "GeoSight will calculate a mission score when geodata is ready.",
  },
  {
    id: "factor-breakdown",
    title: "Factor breakdown",
    category: "planning",
    zone: "workspace",
    defaultVisibility: false,
    defaultOrder: 50,
    requiredData: ["score"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open this to see the score explained factor by factor.",
  },
  {
    id: "compare",
    title: "Comparison",
    category: "comparison",
    zone: "workspace",
    defaultVisibility: false,
    defaultOrder: 60,
    requiredData: ["saved-sites"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Save at least two sites to unlock side-by-side comparison.",
  },
  {
    id: "terrain-viewer",
    title: "Terrain tools",
    category: "terrain",
    zone: "workspace",
    defaultVisibility: false,
    defaultOrder: 70,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open terrain tools for exaggeration and fly-around controls.",
  },
  {
    id: "elevation-profile",
    title: "Elevation profile",
    category: "terrain",
    zone: "workspace",
    defaultVisibility: false,
    defaultOrder: 80,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open this to inspect an elevation transect across the active region.",
  },
  {
    id: "image-upload",
    title: "Imagery tools",
    category: "media",
    zone: "workspace",
    defaultVisibility: false,
    defaultOrder: 90,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Upload imagery when you want image-based land-cover context.",
  },
  {
    id: "land-classifier",
    title: "Land classification",
    category: "media",
    zone: "workspace",
    defaultVisibility: false,
    defaultOrder: 100,
    requiredData: ["classification"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open land classification after uploading imagery or using geodata-derived cover.",
  },
  {
    id: "source-awareness",
    title: "Source awareness",
    category: "context",
    zone: "workspace",
    defaultVisibility: false,
    defaultOrder: 110,
    requiredData: ["source-metadata"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Review source freshness, coverage, and confidence here.",
  },
] as const;

export const WORKSPACE_CARD_GROUPS = [
  { key: "context", label: "Core context" },
  { key: "analysis", label: "Analysis" },
  { key: "planning", label: "Planning" },
  { key: "terrain", label: "Terrain tools" },
  { key: "media", label: "Imagery tools" },
  { key: "comparison", label: "Comparison" },
] as const;

export const WORKSPACE_CARD_MAP = Object.fromEntries(
  WORKSPACE_CARD_REGISTRY.map((card) => [card.id, card]),
) as Record<WorkspaceCardId, WorkspaceCardDefinition>;

const PROFILE_VISIBLE_CARD_DEFAULTS: Record<string, WorkspaceCardId[]> = {
  "data-center": ["active-location", "chat", "results", "score", "factor-breakdown"],
  hiking: ["active-location", "chat", "results", "score", "terrain-viewer"],
  residential: ["active-location", "chat", "results", "score", "source-awareness"],
  commercial: ["active-location", "chat", "results", "score"],
};

export function getWorkspaceCardDefaults(profileId: string) {
  const visibleSet = new Set(PROFILE_VISIBLE_CARD_DEFAULTS[profileId] ?? PROFILE_VISIBLE_CARD_DEFAULTS.commercial);

  return WORKSPACE_CARD_REGISTRY.reduce<Record<WorkspaceCardId, boolean>>((acc, card) => {
    acc[card.id] = visibleSet.has(card.id) || (card.defaultVisibility && !visibleSet.has(card.id) ? card.defaultVisibility : visibleSet.has(card.id));
    return acc;
  }, {} as Record<WorkspaceCardId, boolean>);
}

export function getWorkspaceCardsForProfile(profileId: string) {
  return WORKSPACE_CARD_REGISTRY.filter((card) => card.supportedProfiles.includes(profileId)).sort(
    (a, b) => a.defaultOrder - b.defaultOrder,
  );
}

export function mergeWorkspacePreferences(
  profileId: string,
  preferences: Partial<Record<WorkspaceCardId, boolean>> = {},
) {
  const defaults = getWorkspaceCardDefaults(profileId);

  return Object.keys(defaults).reduce<Record<WorkspaceCardId, boolean>>((acc, key) => {
    const cardId = key as WorkspaceCardId;
    acc[cardId] = preferences[cardId] ?? defaults[cardId];
    return acc;
  }, {} as Record<WorkspaceCardId, boolean>);
}

export function toWorkspaceCardPreferences(
  visibility: Record<WorkspaceCardId, boolean>,
) {
  return Object.entries(visibility).map(([cardId, visible]) => ({
    cardId: cardId as WorkspaceCardId,
    visible,
  })) satisfies WorkspaceCardPreference[];
}
