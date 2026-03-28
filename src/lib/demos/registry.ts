import {
  COMMERCIAL_DEMO_SITES,
  DEFAULT_VIEW,
  HIKING_DEMO_SITES,
  PRELOADED_SITES,
  RESIDENTIAL_DEMO_SITES,
} from "@/lib/demo-data";
import { DemoOverlay } from "@/types";

export const DEMO_REGISTRY: DemoOverlay[] = [
  {
    id: "pnw-cooling",
    name: "Pacific Northwest Infrastructure",
    tagline: "Columbia River cooling-screening benchmark",
    description:
      "GeoSight's original cooling workflow, centered on Columbia River data-center siting with preloaded comparison candidates and an optional guided overlay.",
    profileId: "data-center",
    accentColor: "#00e5ff",
    icon: "Factory",
    locationName: "Columbia River Gorge",
    coordinates: { lat: DEFAULT_VIEW.lat, lng: DEFAULT_VIEW.lng },
    entryMode: "overlay",
    preloadedSites: PRELOADED_SITES,
  },
  {
    id: "colorado-hiking",
    name: "Colorado Recreation",
    tagline: "Mountain terrain, trail access, and scenic screening",
    description:
      "A guided hiking and recreation demo focused on steep terrain, trail access, water features, and scenic outdoor potential around Colorado's Front Range.",
    profileId: "hiking",
    accentColor: "#5be49b",
    icon: "Trees",
    locationName: "Rocky Mountain National Park, Colorado",
    coordinates: { lat: 40.3428, lng: -105.6836 },
    entryMode: "workspace",
  },
  {
    id: "nyc-residential",
    name: "New York Housing",
    tagline: "Neighborhood viability and development context",
    description:
      "A residential-development demo that drops you into metro-scale neighborhood analysis for access, terrain, amenities, and early hazard proxies.",
    profileId: "residential",
    accentColor: "#ffab00",
    icon: "House",
    locationName: "Brooklyn, New York",
    coordinates: { lat: 40.6782, lng: -73.9442 },
    entryMode: "workspace",
  },
  {
    id: "tokyo-commercial",
    name: "Tokyo Commerce",
    tagline: "Retail, logistics, and corridor exploration",
    description:
      "A global commercial demo that highlights market access, utility readiness, and urban corridor analysis in one of the world's densest metros.",
    profileId: "commercial",
    accentColor: "#a78bfa",
    icon: "LineChart",
    locationName: "Tokyo, Japan",
    coordinates: { lat: 35.6762, lng: 139.6503 },
    entryMode: "workspace",
  },
];

export const DEMO_MAP = Object.fromEntries(DEMO_REGISTRY.map((demo) => [demo.id, demo])) as Record<
  string,
  DemoOverlay
>;

export function getDemoById(demoId?: string | null) {
  if (!demoId) {
    return null;
  }

  return DEMO_MAP[demoId] ?? null;
}

export const PROFILE_DEMO_SITE_MAP = {
  "data-center": PRELOADED_SITES.map((site) => ({
    id: site.id,
    name: site.name,
    coordinates: site.coordinates,
    score: site.score.total,
    summary: site.regionName,
  })),
  hiking: HIKING_DEMO_SITES,
  residential: RESIDENTIAL_DEMO_SITES,
  commercial: COMMERCIAL_DEMO_SITES,
} as const;
