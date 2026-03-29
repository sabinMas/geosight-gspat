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
    competition: {
      openingScript:
        "GeoSight starts with the original Columbia River infrastructure story: shortlist cooling candidates, surface the tradeoffs, and make the trust model obvious in seconds.",
      missionRunPresetId: "competition-columbia",
      targetCardIds: ["mission-run", "score", "compare", "source-awareness"],
      successScreenshotTargets: [
        "Mission run verdict with evidence mix",
        "Comparison card with Columbia candidates",
        "Source awareness card with live and derived signals",
      ],
      fallbackNarrative:
        "If the AI layer slows down, fall back to the score, comparison, and source cards to show the same Columbia River trust story with deterministic evidence.",
    },
    preloadedSites: PRELOADED_SITES,
    mapOverlays: [
      {
        id: "gorge-water",
        layer: "water",
        positions: [
          { lat: 45.68, lng: -121.85 },
          { lat: 45.58, lng: -121.3 },
          { lat: 45.63, lng: -120.7 },
          { lat: 45.9, lng: -119.85 },
        ],
        color: "#00e5ff",
        width: 4,
      },
      {
        id: "gorge-power",
        layer: "power",
        positions: [
          { lat: 45.58, lng: -121.55 },
          { lat: 45.65, lng: -120.9 },
          { lat: 45.82, lng: -120.15 },
        ],
        color: "#ffab00",
        width: 3,
      },
      {
        id: "gorge-roads",
        layer: "roads",
        positions: [
          { lat: 45.69, lng: -121.78 },
          { lat: 45.62, lng: -121.2 },
          { lat: 45.68, lng: -120.35 },
        ],
        color: "#cbd5e1",
        width: 3,
      },
    ],
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
      "A global commercial demo that highlights market access, utility readiness, and urban corridor analysis in one of the world's densest metros. Elevation via SRTM global DEM, demographics via World Bank national indicators.",
    profileId: "commercial",
    accentColor: "#a78bfa",
    icon: "LineChart",
    locationName: "Tokyo, Japan",
    coordinates: { lat: 35.6762, lng: 139.6503 },
    entryMode: "workspace",
    competition: {
      openingScript:
        "Use Tokyo to prove GeoSight works globally: explain corridor fit, separate direct data from inference, and name the current coverage gaps honestly.",
      missionRunPresetId: "competition-tokyo",
      targetCardIds: ["mission-run", "score", "source-awareness", "results"],
      successScreenshotTargets: [
        "Tokyo mission run verdict",
        "Source strip showing global and limited coverage",
        "Result card highlighting mapped activity and access",
      ],
      fallbackNarrative:
        "If a model call fails, the Tokyo story still holds because mapped activity, access, utilities, and land-cover evidence remain visible and honestly bounded.",
    },
  },
  {
    id: "wa-residential",
    name: "Washington Residential",
    tagline: "Neighborhood due diligence with school context",
    description:
      "A Washington residential story built to show everyday usefulness: neighborhood fit, school context, access, and early risk signals in a trust-aware briefing.",
    profileId: "residential",
    accentColor: "#ffab00",
    icon: "House",
    locationName: "Bellevue, Washington",
    coordinates: { lat: 47.6101, lng: -122.2015 },
    entryMode: "workspace",
    competition: {
      openingScript:
        "Use the Washington residential story to show GeoSight helping a real person or planner, with school context handled carefully and transparently.",
      missionRunPresetId: "competition-residential",
      targetCardIds: ["mission-run", "score", "school-context", "source-awareness"],
      successScreenshotTargets: [
        "Residential mission run verdict",
        "School context card with WA official metrics",
        "Source awareness showing school coverage and confidence",
      ],
      fallbackNarrative:
        "Even in fallback mode, this residential story remains useful because GeoSight can still surface school context, access, hazards, and source provenance without bluffing.",
    },
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
