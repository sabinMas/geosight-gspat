import {
  WorkspaceCardDefinition,
  WorkspaceCardId,
  WorkspaceCardPreference,
} from "@/types";

export const WORKSPACE_CARD_REGISTRY: WorkspaceCardDefinition[] = [
  {
    id: "active-location",
    title: "Active location",
    summary: "Pin the current place and scan the key trust signals.",
    icon: "MapPin",
    category: "context",
    zone: "primary",
    emphasis: "primary",
    defaultSize: "wide",
    defaultVisibility: true,
    defaultOrder: 10,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Select a place to see the current map focus and quick context.",
  },
  {
    id: "chat",
    title: "Ask GeoSight",
    summary: "Ask mission-aware questions grounded in the active place.",
    icon: "MessageSquare",
    category: "analysis",
    zone: "primary",
    emphasis: "primary",
    defaultSize: "wide",
    defaultVisibility: true,
    defaultOrder: 20,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Choose a place to start asking questions.",
  },
  {
    id: "results",
    title: "Results",
    summary: "Switch between trend summaries and nearby place discovery.",
    icon: "PanelsTopLeft",
    category: "analysis",
    zone: "primary",
    emphasis: "primary",
    defaultSize: "wide",
    defaultVisibility: true,
    defaultOrder: 30,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Switch between map analysis and nearby places for the active location.",
  },
  {
    id: "score",
    title: "Mission score",
    summary: "See the weighted suitability score for this mission.",
    icon: "Gauge",
    category: "planning",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "wide",
    defaultVisibility: true,
    defaultOrder: 40,
    requiredData: ["score"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "GeoSight will calculate a mission score when geodata is ready.",
  },
  {
    id: "factor-breakdown",
    title: "Factor breakdown",
    summary: "Inspect how each factor changed the score.",
    icon: "BarChart3",
    category: "planning",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 50,
    requiredData: ["score"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open this to see the score explained factor by factor.",
  },
  {
    id: "compare",
    title: "Comparison",
    summary: "Review saved locations side by side.",
    icon: "Columns3",
    category: "comparison",
    zone: "workspace",
    emphasis: "optional",
    defaultSize: "wide",
    defaultVisibility: false,
    defaultOrder: 60,
    requiredData: ["saved-sites"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Save at least two sites to unlock side-by-side comparison.",
  },
  {
    id: "terrain-viewer",
    title: "Terrain tools",
    summary: "Adjust terrain exaggeration and framing.",
    icon: "Mountain",
    category: "terrain",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 70,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open terrain tools for exaggeration and fly-around controls.",
  },
  {
    id: "elevation-profile",
    title: "Elevation profile",
    summary: "Inspect a sampled terrain transect through the region.",
    icon: "LineChart",
    category: "terrain",
    zone: "workspace",
    emphasis: "optional",
    defaultSize: "wide",
    defaultVisibility: false,
    defaultOrder: 80,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open this to inspect an elevation transect across the active region.",
  },
  {
    id: "image-upload",
    title: "Imagery tools",
    summary: "Upload imagery and add remote-sensing context.",
    icon: "ImagePlus",
    category: "media",
    zone: "workspace",
    emphasis: "optional",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 90,
    requiredData: [],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Upload imagery when you want image-based land-cover context.",
  },
  {
    id: "land-classifier",
    title: "Land classification",
    summary: "Review inferred land-cover buckets.",
    icon: "Leaf",
    category: "media",
    zone: "workspace",
    emphasis: "optional",
    defaultSize: "standard",
    defaultVisibility: false,
    defaultOrder: 100,
    requiredData: ["classification"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open land classification after uploading imagery or using geodata-derived cover.",
  },
  {
    id: "source-awareness",
    title: "Source awareness",
    summary: "Check provider freshness, coverage, and confidence.",
    icon: "ShieldCheck",
    category: "context",
    zone: "workspace",
    emphasis: "secondary",
    defaultSize: "wide",
    defaultVisibility: false,
    defaultOrder: 110,
    requiredData: ["source-metadata"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Review source freshness, coverage, and confidence here.",
  },
  {
    id: "school-context",
    title: "School context",
    summary: "Inspect nearby school context and official metrics.",
    icon: "GraduationCap",
    category: "planning",
    zone: "workspace",
    emphasis: "optional",
    defaultSize: "wide",
    defaultVisibility: false,
    defaultOrder: 115,
    requiredData: ["school-context"],
    supportedProfiles: ["data-center", "hiking", "residential", "commercial"],
    emptyState: "Open this to inspect nearby public-school context and Washington official metrics.",
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
  residential: ["active-location", "chat", "results", "score", "school-context", "source-awareness"],
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
